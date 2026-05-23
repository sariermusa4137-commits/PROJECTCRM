"""
PROJECTCRM - routes/agency.py
Acente oluşturma, katılma ve güncelleme rotaları.
"""

import random
import string
import datetime
from flask import Blueprint, request, session
from db import db_connection
from auth_middleware import login_required

agency_bp = Blueprint('agency', __name__)


@agency_bp.route('/api/agency/create', methods=['POST'])
@login_required
def agency_create():
    try:
        data = request.get_json() or {}
        user_id = data.get('userId')
        agency_name = data.get('name', '').strip()

        if not user_id or not agency_name:
            return {"error": "Kullanıcı ID ve Acente adı gereklidir."}, 400

        with db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM users WHERE uid = ?', (user_id,))
            if not cursor.fetchone():
                return {"error": "Kullanıcı bulunamadı."}, 404

            agency_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            created_at = datetime.datetime.now().isoformat()

            cursor.execute(
                'INSERT INTO agencies (id, name, createdById, createdAt) VALUES (?, ?, ?, ?)',
                (agency_code, agency_name, user_id, created_at)
            )
            cursor.execute('UPDATE users SET agencyId = ? WHERE uid = ?', (agency_code, user_id))
            conn.commit()

            cursor.execute('SELECT * FROM agencies WHERE id = ?', (agency_code,))
            agency_data = dict(cursor.fetchone())

        return {"agency": agency_data}
    except Exception as e:
        return {"error": str(e)}, 500


@agency_bp.route('/api/agency/join', methods=['POST'])
@login_required
def agency_join():
    try:
        data = request.get_json() or {}
        user_id = data.get('userId')
        agency_code = data.get('agencyCode', '').strip().upper()

        if not user_id or not agency_code:
            return {"error": "Kullanıcı ID ve Acente kodu gereklidir."}, 400

        with db_connection() as conn:
            cursor = conn.cursor()

            cursor.execute('SELECT * FROM users WHERE uid = ?', (user_id,))
            if not cursor.fetchone():
                return {"error": "Kullanıcı bulunamadı."}, 404

            cursor.execute('SELECT * FROM agencies WHERE id = ?', (agency_code,))
            agency = cursor.fetchone()
            if not agency:
                return {"error": "Acente bulunamadı. Lütfen kodu kontrol edin."}, 404

            agency_data = dict(agency)
            cursor.execute('UPDATE users SET agencyId = ? WHERE uid = ?', (agency_code, user_id))
            conn.commit()

        return {"agency": agency_data}
    except Exception as e:
        return {"error": str(e)}, 500


@agency_bp.route('/api/agency/update', methods=['POST'])
@login_required
def agency_update():
    try:
        data = request.get_json() or {}
        agency_id = data.get('agencyId')
        name = data.get('name', '').strip()

        if not agency_id or not name:
            return {"error": "Acente ID ve yeni isim gereklidir."}, 400

        with db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT agencyId FROM users WHERE uid = ?', (session.get('user_id'),))
            user_row = cursor.fetchone()
            if not user_row or user_row['agencyId'] != agency_id:
                return {"error": "Bu acenteyi güncelleme yetkiniz yok."}, 403

            cursor.execute('UPDATE agencies SET name = ? WHERE id = ?', (name, agency_id))
            conn.commit()

            cursor.execute('SELECT * FROM agencies WHERE id = ?', (agency_id,))
            agency_data = dict(cursor.fetchone())

        return {"success": True, "agency": agency_data}
    except Exception as e:
        return {"error": str(e)}, 500
