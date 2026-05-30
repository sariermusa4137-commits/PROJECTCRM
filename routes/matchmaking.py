"""
PROJECTCRM - routes/matchmaking.py
Akıllı Eşleştirme Motoru (AI Matchmaking) API rotası.
"""

import re
from flask import Blueprint, request, session, jsonify
from auth_middleware import login_required, get_user_role_and_permissions

matchmaking_bp = Blueprint('matchmaking', __name__)


def normalize_text(text):
    """Metni küçük harfe çevirir, boşlukları temizler ve Türkçe karakterleri normalleştirir."""
    if not text:
        return ""
    text = str(text).lower().strip()
    # Türkçe karakter dönüştürme haritası
    chars = {
        'ı': 'i', 'ğ': 'g', 'ü': 'u', 'ş': 's', 'ö': 'o', 'ç': 'c',
        'â': 'a', 'î': 'i', 'û': 'u'
    }
    for k, v in chars.items():
        text = text.replace(k, v)
    return text


@matchmaking_bp.route('/api/matchmaking/opportunities', methods=['GET'])
@login_required
def get_matchmaking_opportunities():
    try:
        with db_connection() as conn:
            cursor = conn.cursor()
            current_user_id = session.get('user_id')

            role, permissions = get_user_role_and_permissions(cursor, current_user_id)
            cursor.execute('SELECT agency_id FROM users WHERE uid = ?', (current_user_id,))
            user_row = cursor.fetchone()
            user_agency_id = user_row['agency_id'] if user_row else None
            can_view_all = permissions.get('can_view_all_agency', 1)

            # Resolve filtering agency_id
            filter_agency_id = None
            if role == 'admin':
                req_agency = request.args.get('agencyId')
                if req_agency:
                    cursor.execute('SELECT id FROM agencies WHERE id = ? OR agency_code = ?', (req_agency, req_agency))
                    ag_row = cursor.fetchone()
                    if ag_row:
                        filter_agency_id = ag_row['id']
                else:
                    filter_agency_id = user_agency_id
            else:
                filter_agency_id = user_agency_id

            # Portföyleri al (Aktif durumdakiler)
            if role == 'admin' and filter_agency_id is None:
                cursor.execute("SELECT * FROM portfolios WHERE LOWER(status) = 'aktif'")
            else:
                if filter_agency_id is None:
                    cursor.execute("SELECT * FROM portfolios WHERE agency_id IS NULL AND LOWER(status) = 'aktif'")
                else:
                    cursor.execute("SELECT * FROM portfolios WHERE agency_id = ? AND LOWER(status) = 'aktif'", (filter_agency_id,))
            portfolios = [dict(r) for r in cursor.fetchall()]

            # Müşterileri al (Alıcı tipindekiler ve durumu aktif olanlar)
            # Admin tüm acentenin müşterilerini, Agent/diğer roller sadece kendi müşterilerini görür
            if role == 'admin' and filter_agency_id is None:
                cursor.execute("SELECT * FROM customers WHERE type = 'Alıcı' AND LOWER(status) = 'aktif'")
            else:
                if role != 'admin' and not can_view_all:
                    if filter_agency_id is None:
                        cursor.execute("SELECT * FROM customers WHERE agency_id IS NULL AND type = 'Alıcı' AND LOWER(status) = 'aktif' AND createdById = ?", (current_user_id,))
                    else:
                        cursor.execute("SELECT * FROM customers WHERE agency_id = ? AND type = 'Alıcı' AND LOWER(status) = 'aktif' AND createdById = ?", (filter_agency_id, current_user_id))
                else:
                    if filter_agency_id is None:
                        cursor.execute("SELECT * FROM customers WHERE agency_id IS NULL AND type = 'Alıcı' AND LOWER(status) = 'aktif'")
                    else:
                        cursor.execute("SELECT * FROM customers WHERE agency_id = ? AND type = 'Alıcı' AND LOWER(status) = 'aktif'", (filter_agency_id,))
            
            customers = [dict(r) for r in cursor.fetchall()]

            opportunities = []

            for customer in customers:
                c_budget = float(customer.get('budget') or customer.get('maksimum_butce') or 0)
                c_loc = normalize_text(customer.get('searchLocation') or customer.get('hedef_bolge') or "")
                c_rooms = normalize_text(customer.get('searchRooms') or customer.get('aralanan_oda_sayisi') or "")
                c_pref = customer.get('status_preference') or 'Satılık'

                for portfolio in portfolios:
                    p_type = portfolio.get('type') # 'Satılık' / 'Kiralık'
                    # status_preference match check:
                    # If preference is 'Hem Satılık Hem Kiralık', it matches any portfolio type.
                    # Otherwise, the portfolio type must match the preference exactly.
                    if c_pref != "Hem Satılık Hem Kiralık" and p_type != c_pref:
                        continue

                    p_price = float(portfolio.get('price') or portfolio.get('fiyat') or 0)
                    p_rooms = normalize_text(portfolio.get('rooms') or portfolio.get('oda_sayisi') or "")
                    p_dist = normalize_text(portfolio.get('district') or portfolio.get('bolge') or "")
                    p_neigh = normalize_text(portfolio.get('neighborhood') or "")

                    # 1. Bütçe Uyum Skoru (%15 Esneklik Payı ile)
                    # p_price <= c_budget ise %100 uyum
                    # c_budget < p_price <= c_budget * 1.15 ise doğrusal azalarak en fazla %70'e düşer
                    # p_price > c_budget * 1.15 ise bütçe aşılmıştır (%0 uyum)
                    if not c_budget:
                        budget_score = 100
                    else:
                        if p_price <= c_budget:
                            budget_score = 100
                        elif p_price <= c_budget * 1.15:
                            excess = p_price - c_budget
                            max_excess = c_budget * 0.15
                            budget_score = 100 - (excess / max_excess) * 30
                        else:
                            budget_score = 0

                    if budget_score == 0:
                        continue

                    # 2. Bölge/Mahalle Uyum Skoru
                    if not c_loc:
                        location_score = 100
                    else:
                        # c_loc kelimelerini parçala
                        c_tokens = [t for t in re.split(r'[\s,\-\;]+', c_loc) if t]
                        matched = False
                        
                        # Mahalle veya ilçe doğrudan aranan konumda geçiyorsa
                        if p_neigh and (p_neigh in c_loc or c_loc in p_neigh):
                            location_score = 100
                            matched = True
                        elif p_dist and (p_dist in c_loc or c_loc in p_dist):
                            location_score = 100
                            matched = True
                        else:
                            # Token'lar bazında kontrol et
                            for token in c_tokens:
                                if (p_dist and (token in p_dist or p_dist in token)) or \
                                   (p_neigh and (token in p_neigh or p_neigh in token)):
                                    matched = True
                                    break
                            location_score = 100 if matched else 0

                    if location_score == 0:
                        continue

                    # 3. Oda Sayısı Uyum Skoru
                    if not c_rooms:
                        rooms_score = 100
                    else:
                        c_rooms_list = [t for t in re.split(r'[\s,\-\;]+', c_rooms) if t]
                        if p_rooms in c_rooms_list or any(p_rooms == r for r in c_rooms_list):
                            rooms_score = 100
                        elif any(r in p_rooms or p_rooms in r for r in c_rooms_list):
                            rooms_score = 80
                        else:
                            rooms_score = 0

                    if rooms_score == 0:
                        continue

                    # Toplam skor (Ağırlıklı ortalama)
                    total_score = (budget_score + location_score + rooms_score) / 3

                    # Fırsatı ekle
                    opportunities.append({
                        "id": f"match-{portfolio['id']}-{customer['id']}",
                        "portfolio": {
                            "id": portfolio['id'],
                            "title": portfolio['title'],
                            "price": p_price,
                            "rooms": portfolio.get('rooms') or portfolio.get('oda_sayisi') or "",
                            "district": portfolio.get('district') or portfolio.get('bolge') or "",
                            "neighborhood": portfolio.get('neighborhood') or "",
                            "imageUrl": portfolio.get('imageUrl') or "",
                            "createdByName": portfolio.get('createdByName') or ""
                        },
                        "customer": {
                            "id": customer['id'],
                            "name": customer['name'],
                            "budget": c_budget,
                            "searchRooms": customer.get('searchRooms') or customer.get('aralanan_oda_sayisi') or "",
                            "searchLocation": customer.get('searchLocation') or customer.get('hedef_bolge') or "",
                            "createdByName": customer.get('createdByName') or ""
                        },
                        "score": round(total_score),
                        "scoreBreakdown": {
                            "location": round(location_score),
                            "rooms": round(rooms_score),
                            "budget": round(budget_score)
                        }
                    })

            # Skorlara göre azalan sırada sırala
            opportunities.sort(key=lambda x: x['score'], reverse=True)

            return jsonify(opportunities)

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}, 500
