"""
PROJECTCRM - routes/profile.py
Kullanıcı profili güncelleme ve resim yükleme rotaları.
GÜVENLİK DÜZELTMESİ: profile_update artık şifreyi hash'leyerek kaydediyor.
"""

import os
import uuid
from flask import Blueprint, request, session, current_app
from werkzeug.security import generate_password_hash
from db import db_connection
from auth_middleware import login_required

profile_bp = Blueprint('profile', __name__)

ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}


@profile_bp.route('/api/profile/update', methods=['POST'])
@login_required
def profile_update():
    try:
        data = request.get_json() or {}
        uid = data.get('uid')
        first_name = data.get('firstName', '').strip()
        last_name = data.get('lastName', '').strip()
        phone = data.get('phone', '').strip()
        email = data.get('email', '').strip().lower()
        # DÜZELTME: Şifre hash'lenmeden kaydediliyordu — artık güvenli
        new_password = data.get('password', '')

        if not uid or not first_name or not email:
            return {"error": "Kullanıcı ID, Ad ve E-posta alanları zorunludur."}, 400

        with db_connection() as conn:
            cursor = conn.cursor()

            # E-posta benzersizlik kontrolü
            cursor.execute('SELECT uid FROM users WHERE email = ? AND uid != ?', (email, uid))
            if cursor.fetchone():
                return {"error": "Bu e-posta adresi başka bir kullanıcı tarafından kullanılmaktadır."}, 400

            display_name = f"{first_name} {last_name}".strip()
            query = '''
                UPDATE users
                SET firstName = ?, lastName = ?, displayName = ?, phone = ?, email = ?
            '''
            params = [first_name, last_name, display_name, phone, email]

            if new_password:
                # GÜVENLİ: Şifreyi hash'leyerek kaydet
                hashed = generate_password_hash(new_password, method='pbkdf2:sha256')
                query += ", password = ?"
                params.append(hashed)

            query += " WHERE uid = ?"
            params.append(uid)

            cursor.execute(query, params)
            conn.commit()

            cursor.execute('SELECT * FROM users WHERE uid = ?', (uid,))
            user_data = dict(cursor.fetchone())

        return {"success": True, "user": user_data}
    except Exception as e:
        return {"error": str(e)}, 500


@profile_bp.route('/api/profile/upload', methods=['POST'])
@login_required
def profile_upload():
    try:
        if 'file' not in request.files:
            return {"error": "Yüklenecek dosya bulunamadı."}, 400

        file = request.files['file']
        uid = request.form.get('uid')

        if not uid:
            return {"error": "Kullanıcı ID gereklidir."}, 400
        if file.filename == '':
            return {"error": "Dosya seçilmedi."}, 400

        ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
        if ext not in ALLOWED_IMAGE_EXTENSIONS:
            return {"error": "Sadece resim dosyaları (.png, .jpg, .jpeg, .gif, .webp) yüklenebilir."}, 400

        upload_folder = os.path.join(current_app.config['UPLOAD_FOLDER'], 'profiles')
        os.makedirs(upload_folder, exist_ok=True)

        unique_filename = f"{uid}_{uuid.uuid4().hex[:8]}.{ext}"
        file_path = os.path.join(upload_folder, unique_filename)
        file.save(file_path)

        relative_url = f"/uploads/profiles/{unique_filename}"

        with db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                'UPDATE users SET profile_image = ?, photoURL = ? WHERE uid = ?',
                (relative_url, relative_url, uid)
            )
            conn.commit()

        return {"success": True, "profile_image": relative_url}
    except Exception as e:
        return {"error": str(e)}, 500
