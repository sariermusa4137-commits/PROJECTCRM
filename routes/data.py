"""
PROJECTCRM - routes/data.py
Genel CRUD rotaları: portfolios, customers, meetings, todos, activities, deals.
"""

import os
import uuid
import json
import datetime
from flask import Blueprint, request, session, jsonify, current_app
from werkzeug.utils import secure_filename
from db import db_connection
from auth_middleware import login_required, get_user_role_and_permissions, check_delete_permission, check_update_permission
import google.generativeai as genai

data_bp = Blueprint('data', __name__)

ALLOWED_COLLECTIONS = ['portfolios', 'customers', 'meetings', 'todos', 'activities', 'deals']
JSON_COLUMNS = {'trends', 'subNeighborhoods', 'checklist'}


def _sync_customer_date_fields(data: dict) -> dict:
    """
    customers koleksiyonu için tarih alanlarını senkronize eder.
    birthDate ↔ birth_date ve sozlesme_bitis_tarihi ↔ contract_end_date.
    """
    if 'birthDate' in data and 'birth_date' not in data:
        data['birth_date'] = data['birthDate']
    elif 'birth_date' in data and 'birthDate' not in data:
        data['birthDate'] = data['birth_date']

    if 'sozlesme_bitis_tarihi' in data and 'contract_end_date' not in data:
        data['contract_end_date'] = data['sozlesme_bitis_tarihi']
    elif 'contract_end_date' in data and 'sozlesme_bitis_tarihi' not in data:
        data['sozlesme_bitis_tarihi'] = data['contract_end_date']

    return data


def _serialize_record(collection: str, item: dict) -> dict:
    """Koleksiyona özel alanları Python tipine dönüştürür."""
    if collection == 'todos':
        item['completed'] = bool(item.get('completed'))
    elif collection == 'deals':
        try:
            item['checklist'] = json.loads(item['checklist']) if item.get('checklist') else []
        except (json.JSONDecodeError, TypeError):
            item['checklist'] = []
    return item


@data_bp.route('/api/data', methods=['GET'])
@login_required
def get_all_data():
    try:
        req_agency = request.args.get('agencyId')

        with db_connection() as conn:
            cursor = conn.cursor()
            current_user_id = session.get('user_id')

            # Kullanıcı rolü ve izinlerini al
            role, permissions = get_user_role_and_permissions(cursor, current_user_id)
            can_view_all = permissions.get('can_view_all_agency', 1)

            # Get user's agency_id (INTEGER) and agencyId (TEXT code)
            cursor.execute('SELECT agency_id, agencyId FROM users WHERE uid = ?', (current_user_id,))
            user_row = cursor.fetchone()
            user_agency_id = user_row['agency_id'] if user_row else None

            # Resolve the filtering agency_id
            filter_agency_id = None
            if role == 'admin':
                if req_agency:
                    # Resolve req_agency (could be integer ID or text code)
                    cursor.execute('SELECT id FROM agencies WHERE id = ? OR agency_code = ?', (req_agency, req_agency))
                    ag_row = cursor.fetchone()
                    if ag_row:
                        filter_agency_id = ag_row['id']
                # If admin has no specific agency filtered, they see all agencies' data, so filter_agency_id is None
            else:
                filter_agency_id = user_agency_id

            response_data = {}
            for table in ALLOWED_COLLECTIONS:
                if role == 'admin' and filter_agency_id is None:
                    query = f'SELECT * FROM {table}'
                    params = []
                else:
                    query = f'SELECT * FROM {table} WHERE agency_id = ?'
                    params = [filter_agency_id]

                if not can_view_all and role != 'admin':
                    if table in ['portfolios', 'customers', 'meetings', 'deals']:
                        query += ' AND createdById = ?'
                        params.append(current_user_id)
                    elif table == 'todos':
                        query += ' AND assignedToId = ?'
                        params.append(current_user_id)

                query += ' ORDER BY rowid DESC'
                cursor.execute(query, params)
                list_data = [_serialize_record(table, dict(r)) for r in cursor.fetchall()]

                # Doğum günü etkinliklerini meetings'e ekle
                if table == 'meetings':
                    list_data = _inject_birthday_events(cursor, filter_agency_id, current_user_id, can_view_all, list_data, role == 'admin')

                # --- RBAC: Danışman (agent) maskeleme ---
                if table == 'portfolios' and role == 'agent' and permissions.get('can_update_own_only', 0):
                    for item in list_data:
                        if item.get('createdById') != current_user_id:
                            item['owner_id'] = None
                            item['notes'] = '*** YETKİNİZ YOK ***'

                response_data[table] = list_data

            # Lokasyonları al (tüm kullanıcılar görebilir)
            cursor.execute('SELECT * FROM locations')
            loc_data = []
            for r in cursor.fetchall():
                item = dict(r)
                try:
                    item['trends'] = json.loads(item['trends']) if item.get('trends') else []
                except (json.JSONDecodeError, TypeError):
                    item['trends'] = []
                try:
                    item['subNeighborhoods'] = json.loads(item['subNeighborhoods']) if item.get('subNeighborhoods') else []
                except (json.JSONDecodeError, TypeError):
                    item['subNeighborhoods'] = []
                loc_data.append(item)
            response_data['locations'] = loc_data

        return response_data
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}, 500


def _inject_birthday_events(cursor, agency_id, current_user_id, can_view_all, list_data, is_admin):
    """Müşterilerin doğum günlerini takvim etkinliği olarak meetings listesine ekler."""
    try:
        if is_admin and agency_id is None:
            cust_query = 'SELECT id, name, birthDate, birth_date, agencyId FROM customers'
            cust_params = []
        else:
            cust_query = 'SELECT id, name, birthDate, birth_date, agencyId FROM customers WHERE agency_id = ?'
            cust_params = [agency_id]
            if not can_view_all and not is_admin:
                cust_query += ' AND createdById = ?'
                cust_params.append(current_user_id)
        cursor.execute(cust_query, cust_params)

        today_year = datetime.date.today().year
        for c_row in cursor.fetchall():
            c_id = c_row['id']
            c_name = c_row['name']
            c_agency_code = c_row['agencyId'] or ""
            b_str = c_row['birth_date'] or c_row['birthDate']
            if not b_str:
                continue
            parts = b_str.split('-')
            if len(parts) < 2:
                continue
            try:
                if len(parts) == 3:
                    m_val, d_val = int(parts[1]), int(parts[2])
                else:
                    m_val, d_val = int(parts[0]), int(parts[1])

                for yr in [today_year - 1, today_year, today_year + 1]:
                    list_data.append({
                        "id": f"birthday-{c_id}-{yr}",
                        "agencyId": c_agency_code,
                        "createdById": "system",
                        "createdByName": "Sistem",
                        "createdAt": "",
                        "customerId": c_id,
                        "customerName": c_name,
                        "title": f"🎂 Doğum Günü: {c_name}",
                        "type": "Doğum Günü",
                        "date": f"{yr}-{m_val:02d}-{d_val:02d}",
                        "time": "09:00",
                        "notes": f"{c_name} Doğum Günü",
                        "kanbanStage": ""
                    })
            except (ValueError, IndexError):
                pass
    except Exception as ex:
        print("Error injecting birthdays:", ex)
    return list_data


@data_bp.route('/api/data/<collection>', methods=['POST'])
@login_required
def create_data_record(collection):
    try:
        if collection not in ALLOWED_COLLECTIONS:
            return {"error": "Geçersiz koleksiyon adı."}, 400

        data = request.get_json() or {}
        if collection == 'customers':
            data = _sync_customer_date_fields(data)

        with db_connection() as conn:
            cursor = conn.cursor()
            current_user_id = session.get('user_id')

            # Get user's role and agency details
            cursor.execute('SELECT role, agency_id, agencyId FROM users WHERE uid = ?', (current_user_id,))
            user_row = cursor.fetchone()
            if not user_row:
                return {"error": "Kullanıcı bulunamadı."}, 404
            
            user_role = user_row['role']
            user_agency_id = user_row['agency_id']
            user_agency_code = user_row['agencyId']

            if user_role != 'admin':
                # Force non-admin to their own agency
                data['agency_id'] = user_agency_id
                data['agencyId'] = user_agency_code
            else:
                # Admin can specify. Sync agency_id <-> agencyId
                req_agency_id = data.get('agency_id')
                req_agency_code = data.get('agencyId')
                
                if req_agency_id and not req_agency_code:
                    cursor.execute('SELECT agency_code FROM agencies WHERE id = ?', (req_agency_id,))
                    ag_row = cursor.fetchone()
                    if ag_row:
                        data['agencyId'] = ag_row['agency_code']
                elif req_agency_code and not req_agency_id:
                    cursor.execute('SELECT id FROM agencies WHERE agency_code = ?', (req_agency_code,))
                    ag_row = cursor.fetchone()
                    if ag_row:
                        data['agency_id'] = ag_row['id']

            record_id = data.get('id') or str(uuid.uuid4())
            data['id'] = record_id

            cursor.execute(f'PRAGMA table_info({collection})')
            columns = [col[1] for col in cursor.fetchall()]

            cols_to_insert, vals_to_insert = [], []
            for col in columns:
                if col in data:
                    val = data[col]
                    if col in JSON_COLUMNS and not isinstance(val, str):
                        val = json.dumps(val)
                    elif col == 'completed':
                        val = 1 if val else 0
                    cols_to_insert.append(col)
                    vals_to_insert.append(val)

            if 'id' not in cols_to_insert:
                cols_to_insert.append('id')
                vals_to_insert.append(record_id)

            placeholders = ', '.join(['?' for _ in vals_to_insert])
            cursor.execute(
                f"INSERT INTO {collection} ({', '.join(cols_to_insert)}) VALUES ({placeholders})",
                vals_to_insert
            )
            conn.commit()

            cursor.execute(f"SELECT * FROM {collection} WHERE id = ?", (record_id,))
            inserted_data = _serialize_record(collection, dict(cursor.fetchone()))

        return inserted_data
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}, 500


@data_bp.route('/api/data/<collection>/<id>', methods=['PUT'])
@login_required
def update_data_record(collection, id):
    try:
        if collection not in ALLOWED_COLLECTIONS:
            return {"error": "Geçersiz koleksiyon adı."}, 400

        data = request.get_json() or {}
        if collection == 'customers':
            data = _sync_customer_date_fields(data)

        with db_connection() as conn:
            cursor = conn.cursor()
            current_user_id = session.get('user_id')

            # Get user's role and agency details
            cursor.execute('SELECT role, agency_id, agencyId FROM users WHERE uid = ?', (current_user_id,))
            user_row = cursor.fetchone()
            if not user_row:
                return {"error": "Kullanıcı bulunamadı."}, 404
            
            user_role = user_row['role']
            user_agency_id = user_row['agency_id']
            user_agency_code = user_row['agencyId']

            # Check if record exists and check agency isolation
            cursor.execute(f"SELECT agency_id FROM {collection} WHERE id = ?", (id,))
            rec = cursor.fetchone()
            if not rec:
                return {"error": "Kayıt bulunamadı."}, 404
            
            if user_role != 'admin':
                if rec['agency_id'] != user_agency_id:
                    return {"error": "Bu kaydı düzenleme yetkiniz bulunmamaktadır (Farklı acente verisi)."}, 403
                # Prevent changing the agency
                data['agency_id'] = user_agency_id
                data['agencyId'] = user_agency_code
            else:
                # Admin can modify agency. Sync them if changed.
                req_agency_id = data.get('agency_id')
                req_agency_code = data.get('agencyId')
                if req_agency_id and not req_agency_code:
                    cursor.execute('SELECT agency_code FROM agencies WHERE id = ?', (req_agency_id,))
                    ag_row = cursor.fetchone()
                    if ag_row:
                        data['agencyId'] = ag_row['agency_code']
                elif req_agency_code and not req_agency_id:
                    cursor.execute('SELECT id FROM agencies WHERE agency_code = ?', (req_agency_code,))
                    ag_row = cursor.fetchone()
                    if ag_row:
                        data['agency_id'] = ag_row['id']

            # RBAC: Güncelleme izni kontrolü
            allowed, error_msg = check_update_permission(cursor, current_user_id, collection, id)
            if not allowed:
                return {"error": error_msg}, 403

            cursor.execute(f'PRAGMA table_info({collection})')
            columns = [col[1] for col in cursor.fetchall()]

            updates, vals = [], []
            for col in columns:
                if col in data and col != 'id':
                    val = data[col]
                    if col in JSON_COLUMNS and not isinstance(val, str):
                        val = json.dumps(val)
                    elif col == 'completed':
                        val = 1 if val else 0
                    updates.append(f"{col} = ?")
                    vals.append(val)

            if not updates:
                return {"error": "Güncellenecek alan gönderilmedi."}, 400

            vals.append(id)
            cursor.execute(f"UPDATE {collection} SET {', '.join(updates)} WHERE id = ?", vals)
            conn.commit()

            cursor.execute(f"SELECT * FROM {collection} WHERE id = ?", (id,))
            updated_data = _serialize_record(collection, dict(cursor.fetchone()))

        return updated_data
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}, 500


@data_bp.route('/api/data/<collection>/<id>', methods=['DELETE'])
@login_required
def delete_data_record(collection, id):
    try:
        if collection not in ALLOWED_COLLECTIONS:
            return {"error": "Geçersiz koleksiyon adı."}, 400

        with db_connection() as conn:
            cursor = conn.cursor()
            current_user_id = session.get('user_id')

            # Get user's role and agency_id
            cursor.execute('SELECT role, agency_id FROM users WHERE uid = ?', (current_user_id,))
            user_row = cursor.fetchone()
            user_role = user_row['role'] if user_row else 'agent'
            user_agency_id = user_row['agency_id'] if user_row else None

            # Enforce agency isolation for non-admins
            if user_role != 'admin':
                # Check if the record belongs to the user's agency
                cursor.execute(f"SELECT agency_id FROM {collection} WHERE id = ?", (id,))
                rec = cursor.fetchone()
                if rec and rec['agency_id'] != user_agency_id:
                    return {"error": "Bu kaydı silme yetkiniz bulunmamaktadır (Farklı acente verisi)."}, 403

            # RBAC: Silme izni kontrolü (tüm koleksiyonlar)
            allowed, error_msg = check_delete_permission(cursor, current_user_id, collection)
            if not allowed:
                return {"error": error_msg}, 403

            cursor.execute(f"DELETE FROM {collection} WHERE id = ?", (id,))
            conn.commit()

        return {"success": True}
    except Exception as e:
        return {"error": str(e)}, 500


# Alias rotaları — store.js uyumluluğu için
@data_bp.route('/api/customers', methods=['POST'])
@login_required
def create_customer_alias():
    return create_data_record('customers')


@data_bp.route('/api/customers/<id>', methods=['PUT'])
@login_required
def update_customer_alias(id):
    return update_data_record('customers', id)


@data_bp.route('/api/portfolios/upload', methods=['POST'])
@login_required
def upload_portfolio_image():
    try:
        if 'file' not in request.files:
            return jsonify({"error": "Yüklenecek dosya bulunamadı."}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "Dosya seçilmedi."}), 400

        # Extension check
        ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        allowed_extensions = {'png', 'jpg', 'jpeg', 'webp', 'gif'}
        if ext not in allowed_extensions:
            return jsonify({"error": "Sadece resim dosyaları (.png, .jpg, .jpeg, .webp, .gif) yüklenebilir."}), 400

        # Limit size to 10MB
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        file.seek(0)
        if file_size > 10 * 1024 * 1024:
            return jsonify({"error": "Maksimum dosya boyutu 10MB olmalıdır."}), 400

        # Try saving to the configured upload folder
        upload_folder = current_app.config.get('UPLOAD_FOLDER', '/data/uploads')
        
        try:
            target_dir = os.path.join(upload_folder, 'portfolios')
            os.makedirs(target_dir, exist_ok=True)
            # Test write
            test_file = os.path.join(target_dir, '.write_test')
            with open(test_file, 'w') as f:
                f.write('test')
            os.remove(test_file)
        except Exception:
            # Fallback to local static/uploads/portfolios
            upload_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static', 'uploads')
            current_app.config['UPLOAD_FOLDER'] = upload_folder
            target_dir = os.path.join(upload_folder, 'portfolios')
            os.makedirs(target_dir, exist_ok=True)

        unique_filename = f"{uuid.uuid4().hex[:12]}_{secure_filename(file.filename)}"
        # Sanity: ensure filename is safe and has the original or generic extension
        if not unique_filename.endswith(f".{ext}"):
            unique_filename = f"{unique_filename}.{ext}"

        file_path = os.path.join(target_dir, unique_filename)
        
        try:
            file.save(file_path)
        except Exception as e:
            # Absolute fallback to local static folder if anything failed
            upload_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static', 'uploads')
            current_app.config['UPLOAD_FOLDER'] = upload_folder
            target_dir = os.path.join(upload_folder, 'portfolios')
            os.makedirs(target_dir, exist_ok=True)
            file_path = os.path.join(target_dir, unique_filename)
            file.save(file_path)

        # The relative URL path that static_routes.py serves:
        # /uploads/portfolios/<filename>
        relative_url = f"/uploads/portfolios/{unique_filename}"
        
        return jsonify({"success": True, "url": relative_url})

    except Exception as e:
        return jsonify({"error": f"Yükleme hatası: {str(e)}"}), 500


@data_bp.route('/api/settings/gemini', methods=['GET'])
@login_required
def get_gemini_setting():
    try:
        with db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM system_settings WHERE key = 'gemini_api_key'")
            row = cursor.fetchone()
            api_key = row['value'] if row else ""
            return jsonify({
                "apiKey": api_key,
                "has_key": bool(api_key)
            })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@data_bp.route('/api/settings/gemini', methods=['POST'])
@login_required
def save_gemini_setting():
    try:
        req_data = request.get_json() or {}
        api_key = req_data.get('apiKey', '').strip()
        with db_connection() as conn:
            cursor = conn.cursor()
            if api_key:
                cursor.execute(
                    "INSERT OR REPLACE INTO system_settings (key, value) VALUES ('gemini_api_key', ?)",
                    (api_key,)
                )
            else:
                cursor.execute("DELETE FROM system_settings WHERE key = 'gemini_api_key'")
            conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@data_bp.route('/api/locations/<location_id>/ai-summary', methods=['POST'])
@login_required
def generate_location_ai_summary(location_id):
    try:
        with db_connection() as conn:
            cursor = conn.cursor()
            
            # 1. Fetch Gemini API Key
            cursor.execute("SELECT value FROM system_settings WHERE key = 'gemini_api_key'")
            row = cursor.fetchone()
            api_key = row['value'] if row else ""
            if not api_key:
                return jsonify({"error": "Gemini API anahtarı bulunamadı. Lütfen AI Yapay Zeka Ayarları'ndan kaydedin."}), 400

            # 2. Fetch Location details
            cursor.execute("SELECT * FROM locations WHERE id = ?", (location_id,))
            loc_row = cursor.fetchone()
            if not loc_row:
                return jsonify({"error": "Bölge bulunamadı."}), 404

            loc = dict(loc_row)

            # 3. Calculate amortization
            sqmPriceSale = float(loc.get('sqmPriceSale') or 0)
            sqmPriceRent = float(loc.get('sqmPriceRent') or 0)
            amortization = sqmPriceSale / (sqmPriceRent * 12.0) if sqmPriceRent > 0 else 0.0

            # 4. Formulate prompt
            trends_str = ""
            if loc.get('trends'):
                try:
                    trends_list = json.loads(loc['trends'])
                    trends_str = ", ".join([f"{t.get('year')}: {t.get('salePrice')} TL/m²" for t in trends_list])
                except Exception:
                    trends_str = str(loc['trends'])

            prompt = f"""
            Aşağıda gayrimenkul analiz verileri ve uzman danışman notları sunulan bölgeyi analiz et.
            Bölge emlak piyasasının gidişatı hakkında 3-4 cümlelik, son derece profesyonel, çarpıcı, akıcı ve canlı bir piyasa radar özeti üret.
            Metin doğrudan özetin kendisiyle başlamalı; "Bu veriler doğrultusunda...", "Bölge analizine göre..." gibi girişlerden kaçın ve pazarlamaya uygun, profesyonel bir dil kullan.

            Bölge Adı: {loc.get('name')}
            Ortalama Satılık m² Fiyatı: {sqmPriceSale:,.0f} TL
            Ortalama Kiralık m² Fiyatı: {sqmPriceRent:,.0f} TL
            Hesaplanan Amortisman Süresi: {amortization:.1f} Yıl
            Demografik Yapı & Müşteri Profili: {loc.get('demographics') or 'Veri yok'}
            Bölgedeki Rekabet ve Piyasa Dinamikleri: {loc.get('competitorNotes') or 'Veri yok'}
            Uzmanın Genel Değerlendirme Notları: {loc.get('notes') or 'Veri yok'}
            Yıllara Göre Satış Trendi: {trends_str or 'Veri yok'}
            """

            # 5. Connect to Google Gemini API
            genai.configure(api_key=api_key)
            try:
                model = genai.GenerativeModel('gemini-2.5-flash')
                response = model.generate_content(prompt)
                ai_summary = response.text.strip()
            except Exception as e_flash:
                print(f"Failed to use gemini-2.5-flash, trying gemini-1.5-flash. Error: {e_flash}")
                model = genai.GenerativeModel('gemini-1.5-flash')
                response = model.generate_content(prompt)
                ai_summary = response.text.strip()

            # 6. Save the AI summary in the database
            cursor.execute("UPDATE locations SET ai_summary = ? WHERE id = ?", (ai_summary, location_id))
            conn.commit()

            return jsonify({
                "success": True,
                "summary": ai_summary
            })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"AI Analiz üretilirken hata oluştu: {str(e)}"}), 500
