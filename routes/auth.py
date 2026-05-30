"""
PROJECTCRM - routes/auth.py
Kullanıcı kimlik doğrulama rotaları: kayıt, giriş, çıkış, durum kontrolü.
"""

import uuid
import datetime
from flask import Blueprint, request, session, redirect, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from db import db_connection
from auth_middleware import login_required

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/api/auth/register', methods=['POST'])
def auth_register():
    try:
        data = request.get_json() or {}
        first_name = data.get('firstName', '').strip()
        last_name = data.get('lastName', '').strip()
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')

        if not first_name or not email or not password:
            return {"error": "Ad, E-posta ve Şifre alanları zorunludur."}, 400

        with db_connection() as conn:
            cursor = conn.cursor()

            cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
            if cursor.fetchone():
                return {"error": "Bu e-posta adresi zaten kayıtlıdır."}, 400

            hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
            uid = str(uuid.uuid5(uuid.NAMESPACE_DNS, email))
            created_at = datetime.datetime.now().isoformat()
            display_name = f"{first_name} {last_name}".strip()
            import random, string
            agency_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            agency_name = f"{display_name} (Bireysel)"

            cursor.execute(
                'INSERT INTO agencies (name, agency_code, created_at, created_by) VALUES (?, ?, ?, ?)',
                (agency_name, agency_code, created_at, uid)
            )
            agency_id = cursor.lastrowid
            
            cursor.execute('''
                INSERT INTO users (uid, displayName, email, photoURL, agencyId, agency_id, createdAt,
                                   firstName, lastName, phone, password, profile_image)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (uid, display_name, email, "", agency_code, agency_id, created_at,
                  first_name, last_name, "", hashed_password, ""))
            conn.commit()

            cursor.execute('SELECT * FROM users WHERE uid = ?', (uid,))
            user_data = dict(cursor.fetchone())
            cursor.execute('SELECT * FROM agencies WHERE id = ?', (agency_id,))
            agency_data = dict(cursor.fetchone())

        session['user_id'] = uid
        session.permanent = True
        return {"success": True, "user": user_data, "agency": agency_data}
    except Exception as e:
        return {"error": str(e)}, 500


@auth_bp.route('/api/auth/login', methods=['POST'])
def auth_login():
    try:
        data = request.get_json() or {}
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')

        if not email or not password:
            return {"error": "E-posta ve Şifre alanları zorunludur."}, 400

        with db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM users WHERE email = ?', (email,))
            user = cursor.fetchone()

            if not user:
                return {"error": "E-posta adresi veya şifre hatalı."}, 401

            user_data = dict(user)
            hashed_pwd = user_data.get('password')
            if not hashed_pwd or not check_password_hash(hashed_pwd, password):
                return {"error": "E-posta adresi veya şifre hatalı."}, 401

            agency_data = None
            agency_row = None
            if user_data.get('agency_id'):
                cursor.execute('SELECT * FROM agencies WHERE id = ?', (user_data['agency_id'],))
                agency_row = cursor.fetchone()
            if not agency_row and user_data.get('agencyId'):
                cursor.execute('SELECT * FROM agencies WHERE agency_code = ?', (user_data['agencyId'],))
                agency_row = cursor.fetchone()
                if agency_row:
                    cursor.execute('UPDATE users SET agency_id = ? WHERE uid = ?', (agency_row['id'], user_data['uid']))
                    conn.commit()
                    user_data['agency_id'] = agency_row['id']
            if agency_row:
                agency_data = dict(agency_row)

        session['user_id'] = user_data['uid']
        session.permanent = True
        return {"user": user_data, "agency": agency_data}
    except Exception as e:
        return {"error": str(e)}, 500


@auth_bp.route('/api/auth/status', methods=['GET'])
def auth_status():
    try:
        user_id = session.get('user_id')
        if not user_id:
            user_id = request.args.get('userId')
            if not user_id:
                return {"error": "Oturum bulunamadı. Lütfen giriş yapın."}, 401
            session['user_id'] = user_id
            session.permanent = True

        with db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM users WHERE uid = ?', (user_id,))
            user = cursor.fetchone()

            if not user:
                session.clear()
                return {"error": "Kullanıcı bulunamadı."}, 404

            user_data = dict(user)

            user_agency_id = user_data.get('agency_id')
            user_agency_code = user_data.get('agencyId')

            # Self-healing agency association
            if not user_agency_code:
                import random, string
                user_agency_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
                agency_name = f"{user_data.get('displayName', 'Kullanıcı')} (Bireysel)"
                cursor.execute('''
                    INSERT INTO agencies (name, agency_code, created_at, created_by) VALUES (?, ?, ?, ?)
                ''', (agency_name, user_agency_code, datetime.datetime.now().isoformat(), user_id))
                user_agency_id = cursor.lastrowid
                cursor.execute('UPDATE users SET agencyId = ?, agency_id = ? WHERE uid = ?', (user_agency_code, user_agency_id, user_id))
                conn.commit()
                user_data['agencyId'] = user_agency_code
                user_data['agency_id'] = user_agency_id
            elif not user_agency_id:
                cursor.execute('SELECT * FROM agencies WHERE agency_code = ?', (user_agency_code,))
                agency = cursor.fetchone()
                if not agency:
                    agency_name = f"{user_data.get('displayName', 'Kullanıcı')} (Bireysel)"
                    cursor.execute('''
                        INSERT INTO agencies (name, agency_code, created_at, created_by) VALUES (?, ?, ?, ?)
                    ''', (agency_name, user_agency_code, datetime.datetime.now().isoformat(), user_id))
                    user_agency_id = cursor.lastrowid
                else:
                    user_agency_id = agency['id']
                cursor.execute('UPDATE users SET agency_id = ? WHERE uid = ?', (user_agency_id, user_id))
                conn.commit()
                user_data['agency_id'] = user_agency_id

            cursor.execute('SELECT * FROM agencies WHERE id = ?', (user_agency_id,))
            agency = cursor.fetchone()
            if not agency:
                agency_name = f"{user_data.get('displayName', 'Kullanıcı')} (Bireysel)"
                cursor.execute('''
                    INSERT INTO agencies (name, agency_code, created_at, created_by) VALUES (?, ?, ?, ?)
                ''', (agency_name, user_agency_code, datetime.datetime.now().isoformat(), user_id))
                conn.commit()
                user_agency_id = cursor.lastrowid
                cursor.execute('UPDATE users SET agency_id = ? WHERE uid = ?', (user_agency_id, user_id))
                conn.commit()
                cursor.execute('SELECT * FROM agencies WHERE id = ?', (user_agency_id,))
                agency = cursor.fetchone()
                user_data['agency_id'] = user_agency_id

            agency_data = dict(agency) if agency else None

        return {"user": user_data, "agency": agency_data}
    except Exception as e:
        return {"error": str(e)}, 500


@auth_bp.route('/api/auth/logout', methods=['POST', 'GET'])
def api_auth_logout():
    from flask import current_app
    session.clear()
    response = jsonify({"success": True})
    response.set_cookie(
        current_app.config.get('SESSION_COOKIE_NAME', 'session'), '', expires=0
    )
    return response


@auth_bp.route('/login')
def login_route():
    if session.get('user_id'):
        return redirect('/')
    return redirect('/#auth')


@auth_bp.route('/logout')
def logout_route():
    from flask import current_app
    session.clear()
    response = redirect('/login')
    response.set_cookie(
        current_app.config.get('SESSION_COOKIE_NAME', 'session'), '', expires=0
    )
    return response
