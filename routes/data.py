"""
PROJECTCRM - routes/data.py
Genel CRUD rotaları: portfolios, customers, meetings, todos, activities, deals.
"""

import uuid
import json
import datetime
from flask import Blueprint, request, session, jsonify
from db import db_connection
from auth_middleware import login_required

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
        agency_id = request.args.get('agencyId')
        if not agency_id:
            return {"error": "agencyId parametresi gereklidir."}, 400

        with db_connection() as conn:
            cursor = conn.cursor()
            current_user_id = session.get('user_id')

            # Kullanıcı rolü ve izinlerini al
            cursor.execute('SELECT role FROM users WHERE uid = ?', (current_user_id,))
            user_row = cursor.fetchone()
            role = (user_row['role'] if user_row else None) or 'agent'

            cursor.execute('SELECT can_view_all_agency FROM rol_yetkileri WHERE role = ?', (role,))
            perm_row = cursor.fetchone()
            can_view_all = perm_row['can_view_all_agency'] if perm_row else 1

            response_data = {}
            for table in ALLOWED_COLLECTIONS:
                query = f'SELECT * FROM {table} WHERE agencyId = ?'
                params = [agency_id]

                if not can_view_all:
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
                    list_data = _inject_birthday_events(cursor, agency_id, current_user_id, can_view_all, list_data)

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
        return {"error": str(e)}, 500


def _inject_birthday_events(cursor, agency_id, current_user_id, can_view_all, list_data):
    """Müşterilerin doğum günlerini takvim etkinliği olarak meetings listesine ekler."""
    try:
        cust_query = 'SELECT id, name, birthDate, birth_date FROM customers WHERE agencyId = ?'
        cust_params = [agency_id]
        if not can_view_all:
            cust_query += ' AND createdById = ?'
            cust_params.append(current_user_id)
        cursor.execute(cust_query, cust_params)

        today_year = datetime.date.today().year
        for c_row in cursor.fetchall():
            c_id = c_row['id']
            c_name = c_row['name']
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
                        "agencyId": agency_id,
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

            # Müşteri düzenleme izni kontrolü
            if collection == 'customers':
                cursor.execute('SELECT role FROM users WHERE uid = ?', (current_user_id,))
                user_row = cursor.fetchone()
                role = (user_row['role'] if user_row else None) or 'agent'
                cursor.execute('SELECT can_edit_customer FROM rol_yetkileri WHERE role = ?', (role,))
                perm_row = cursor.fetchone()
                if perm_row and not perm_row['can_edit_customer']:
                    return {"error": "Müşteri düzenleme yetkiniz bulunmamaktadır."}, 403

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

            # Portföy silme izni kontrolü
            if collection == 'portfolios':
                cursor.execute('SELECT role FROM users WHERE uid = ?', (current_user_id,))
                user_row = cursor.fetchone()
                role = (user_row['role'] if user_row else None) or 'agent'
                cursor.execute('SELECT can_delete_portfolio FROM rol_yetkileri WHERE role = ?', (role,))
                perm_row = cursor.fetchone()
                if perm_row and not perm_row['can_delete_portfolio']:
                    return {"error": "Portföy silme yetkiniz bulunmamaktadır."}, 403

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
