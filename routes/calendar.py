"""
PROJECTCRM - routes/calendar.py
Takvim etkinlikleri: görüşmeler + doğum günü + sözleşme bitiş + mülk yıldönümü.
current_year artık dinamik — datetime.date.today().year kullanılıyor.
"""

import datetime
from flask import Blueprint, request, session, jsonify
from db import db_connection
from auth_middleware import login_required, get_user_role_and_permissions

calendar_bp = Blueprint('calendar', __name__)


@calendar_bp.route('/api/calendar-events', methods=['GET'])
@login_required
def get_calendar_events():
    try:
        current_user_id = session.get('user_id')

        with db_connection() as conn:
            cursor = conn.cursor()

            role, permissions = get_user_role_and_permissions(cursor, current_user_id)
            cursor.execute('SELECT agency_id FROM users WHERE uid = ?', (current_user_id,))
            user_row = cursor.fetchone()
            user_agency_id = user_row['agency_id'] if user_row else None

            # Resolve the filtering agency_id
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

            # Müşterileri çek
            if role == 'admin' and filter_agency_id is None:
                cursor.execute('SELECT * FROM customers')
            else:
                if role != 'admin' and not permissions.get('can_view_all_agency', 1):
                    if filter_agency_id is None:
                        cursor.execute('SELECT * FROM customers WHERE agency_id IS NULL AND createdById = ?', (current_user_id,))
                    else:
                        cursor.execute('SELECT * FROM customers WHERE agency_id = ? AND createdById = ?', (filter_agency_id, current_user_id))
                else:
                    if filter_agency_id is None:
                        cursor.execute('SELECT * FROM customers WHERE agency_id IS NULL')
                    else:
                        cursor.execute('SELECT * FROM customers WHERE agency_id = ?', (filter_agency_id,))
            customers = cursor.fetchall()

            # Görüşmeleri çek
            if role == 'admin' and filter_agency_id is None:
                cursor.execute('SELECT * FROM meetings')
            else:
                if role != 'admin' and not permissions.get('can_view_all_agency', 1):
                    if filter_agency_id is None:
                        cursor.execute('SELECT * FROM meetings WHERE agency_id IS NULL AND createdById = ?', (current_user_id,))
                    else:
                        cursor.execute('SELECT * FROM meetings WHERE agency_id = ? AND createdById = ?', (filter_agency_id, current_user_id))
                else:
                    if filter_agency_id is None:
                        cursor.execute('SELECT * FROM meetings WHERE agency_id IS NULL')
                    else:
                        cursor.execute('SELECT * FROM meetings WHERE agency_id = ?', (filter_agency_id,))
            meetings = cursor.fetchall()

            # Anımsatıcıları (reminders) çek
            if role == 'admin' and filter_agency_id is None:
                cursor.execute('SELECT * FROM reminders WHERE is_completed = 0 AND due_date IS NOT NULL AND due_date != ""')
            else:
                if role != 'admin' and not permissions.get('can_view_all_agency', 1):
                    if filter_agency_id is None:
                        cursor.execute(
                            'SELECT * FROM reminders WHERE agency_id IS NULL AND createdById = ? AND is_completed = 0 AND due_date IS NOT NULL AND due_date != ""',
                            (current_user_id,)
                        )
                    else:
                        cursor.execute(
                            'SELECT * FROM reminders WHERE agency_id = ? AND createdById = ? AND is_completed = 0 AND due_date IS NOT NULL AND due_date != ""',
                            (filter_agency_id, current_user_id)
                        )
                else:
                    if filter_agency_id is None:
                        cursor.execute('SELECT * FROM reminders WHERE agency_id IS NULL AND is_completed = 0 AND due_date IS NOT NULL AND due_date != ""')
                    else:
                        cursor.execute('SELECT * FROM reminders WHERE agency_id = ? AND is_completed = 0 AND due_date IS NOT NULL AND due_date != ""', (filter_agency_id,))
            reminders = cursor.fetchall()

        events = []

        # Olağan görüşmeler
        for m in meetings:
            events.append({
                "id": str(m['id']),
                "title": m['title'],
                "start": m['date'],
                "time": m['time'] or "00:00",
                "type": m['type'] or "Görüşme",
                "customerName": m['customerName'] or "",
                "notes": m['notes'] or "",
                "kanbanStage": m['kanbanStage'] or "İlk Temas"
            })

        # Anımsatıcıları takvime ekle
        for r in reminders:
            events.append({
                "id": f"reminder_{r['id']}",
                "title": f"🔔 {r['title']}",
                "start": r['due_date'],
                "backgroundColor": "#e0f2fe", # light sky blue
                "textColor": "#0369a1", # dark blue
                "allDay": True,
                "type": "Anımsatıcı",
                "notes": r['description'] or ""
            })

        # Dinamik yıl — hardcode'dan kurtulma
        current_year = datetime.date.today().year

        # Müşteri kritik tarihleri
        for c in customers:
            c_dict = dict(c)
            c_id = c_dict['id']
            c_name = c_dict['name']
            c_phone = c_dict.get('phone') or ""

            # 1. Doğum Günü
            b_date = c_dict.get('birth_date') or c_dict.get('birthDate')
            if b_date:
                try:
                    parts = b_date.split('-')
                    if len(parts) == 3:
                        month, day = parts[1], parts[2]
                        events.append({
                            "id": f"bday_{c_id}",
                            "title": f"🎂 Doğum Günü: {c_name}",
                            "start": f"{current_year}-{month}-{day}",
                            "backgroundColor": "#ffccd5",
                            "textColor": "#c9184a",
                            "allDay": True,
                            "type": "Doğum Günü",
                            "customerName": c_name,
                            "phone": c_phone
                        })
                except Exception as e:
                    print(f"Error parsing birth date for customer {c_id}: {e}", flush=True)

            # 2. Sözleşme Bitiş Tarihi
            c_end = c_dict.get('contract_end_date') or c_dict.get('sozlesme_bitis_tarihi')
            if c_end:
                events.append({
                    "id": f"contract_{c_id}",
                    "title": f"📜 Sözleşme Bitişi: {c_name}",
                    "start": c_end,
                    "backgroundColor": "#fff3cd",
                    "textColor": "#856404",
                    "allDay": True,
                    "type": "Sözleşme Bitişi",
                    "customerName": c_name,
                    "phone": c_phone
                })

            # 3. Mülk Yıldönümü
            sold_date = c_dict.get('property_sold_date')
            if sold_date:
                try:
                    parts = sold_date.split('-')
                    if len(parts) == 3:
                        sold_year = int(parts[0])
                        month, day = parts[1], parts[2]
                        years_diff = current_year - sold_year
                        if years_diff > 0:
                            events.append({
                                "id": f"anniv_{c_id}",
                                "title": f"🏠 {years_diff}. Mülk Yıldönümü: {c_name}",
                                "start": f"{current_year}-{month}-{day}",
                                "backgroundColor": "#e2ece9",
                                "textColor": "#0f5132",
                                "allDay": True,
                                "type": "Mülk Yıldönümü",
                                "customerName": c_name,
                                "phone": c_phone
                            })
                except Exception as e:
                    print(f"Error parsing property sold date for customer {c_id}: {e}", flush=True)

        return jsonify(events)
    except Exception as e:
        return {"error": str(e)}, 500
