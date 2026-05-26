"""
PROJECTCRM - routes/users.py
Kullanıcı listeleme, rol güncelleme, silme ve yetki yönetimi rotaları.
"""

from flask import Blueprint, request, session, jsonify
from db import db_connection
from auth_middleware import login_required

users_bp = Blueprint('users', __name__)


@users_bp.route('/api/users', methods=['GET'])
@login_required
def get_users():
    try:
        with db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT u.uid, u.displayName, u.email, u.photoURL, u.agencyId, u.createdAt,
                       u.firstName, u.lastName, u.phone, u.profile_image, u.role,
                       a.createdById AS agencyOwnerId, a.name AS agencyName
                FROM users u
                LEFT JOIN agencies a ON u.agencyId = a.id
                ORDER BY u.createdAt DESC
            ''')
            users_list = []
            for r in cursor.fetchall():
                item = dict(r)
                if not item.get('role'):
                    item['role'] = 'agent'
                item['isAgencyOwner'] = (item.get('uid') == item.get('agencyOwnerId'))
                item.pop('agencyOwnerId', None)
                users_list.append(item)

        return jsonify(users_list)
    except Exception as e:
        return {"error": str(e)}, 500


@users_bp.route('/api/users/update-role', methods=['POST'])
@login_required
def update_user_role():
    try:
        current_user_id = session.get('user_id')
        data = request.get_json() or {}
        target_user_id = data.get('userId')
        new_role = data.get('newRole')

        if not target_user_id or not new_role:
            return {"error": "userId ve newRole alanları zorunludur."}, 400
        if new_role not in ['admin', 'agent', 'assistant']:
            return {"error": "Geçersiz rol belirtildi."}, 400

        with db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT role FROM users WHERE uid = ?', (current_user_id,))
            current_user = cursor.fetchone()
            if not current_user or current_user['role'] != 'admin':
                return {"error": "Yetkisiz işlem. Yalnızca yöneticiler rol değiştirebilir."}, 403

            cursor.execute('UPDATE users SET role = ? WHERE uid = ?', (new_role, target_user_id))
            conn.commit()

        return {"success": True}
    except Exception as e:
        return {"error": str(e)}, 500


@users_bp.route('/api/users/delete', methods=['POST'])
@login_required
def delete_user():
    try:
        current_user_id = session.get('user_id')
        data = request.get_json() or {}
        target_user_id = data.get('userId')

        if not target_user_id:
            return {"error": "userId alanı zorunludur."}, 400
        if current_user_id == target_user_id:
            return {"error": "Yöneticinin kendi kendini silmesi engellenmiştir."}, 400

        with db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT role FROM users WHERE uid = ?', (current_user_id,))
            current_user = cursor.fetchone()
            if not current_user or current_user['role'] != 'admin':
                return {"error": "Yetkisiz işlem. Yalnızca yöneticiler kullanıcı silebilir."}, 403

            cursor.execute('DELETE FROM users WHERE uid = ?', (target_user_id,))
            conn.commit()

        return {"success": True}
    except Exception as e:
        return {"error": str(e)}, 500


@users_bp.route('/api/users/permissions', methods=['GET'])
@login_required
def get_role_permissions():
    try:
        current_user_id = session.get('user_id')
        with db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT role FROM users WHERE uid = ?', (current_user_id,))
            current_user = cursor.fetchone()
            if not current_user or current_user['role'] != 'admin':
                return {"error": "Yetkisiz işlem. Yalnızca yöneticiler yetki ayarlarına erişebilir."}, 403

            cursor.execute('SELECT * FROM rol_yetkileri')
            permissions_dict = {}
            for row in cursor.fetchall():
                permissions_dict[row['role']] = {
                    "can_delete_portfolio": bool(row['can_delete_portfolio']),
                    "can_edit_customer": bool(row['can_edit_customer']),
                    "can_view_all_agency": bool(row['can_view_all_agency']),
                    "can_view_reports": bool(row['can_view_reports']),
                }

        return jsonify(permissions_dict)
    except Exception as e:
        return {"error": str(e)}, 500


@users_bp.route('/api/users/update-permissions', methods=['POST'])
@login_required
def update_role_permissions():
    try:
        current_user_id = session.get('user_id')
        data = request.get_json() or {}

        with db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT role FROM users WHERE uid = ?', (current_user_id,))
            current_user = cursor.fetchone()
            if not current_user or current_user['role'] != 'admin':
                return {"error": "Yetkisiz işlem. Yalnızca yöneticiler yetki değiştirebilir."}, 403

            for role in ['admin', 'agent', 'assistant']:
                role_data = data.get(role, {})
                cursor.execute('''
                    UPDATE rol_yetkileri SET
                        can_delete_portfolio = ?,
                        can_edit_customer = ?,
                        can_view_all_agency = ?,
                        can_view_reports = ?
                    WHERE role = ?
                ''', (
                    1 if role_data.get('can_delete_portfolio') else 0,
                    1 if role_data.get('can_edit_customer') else 0,
                    1 if role_data.get('can_view_all_agency') else 0,
                    1 if role_data.get('can_view_reports') else 0,
                    role
                ))
            conn.commit()

        return {"success": True}
    except Exception as e:
        return {"error": str(e)}, 500
