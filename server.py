"""
PROJECTCRM - server.py (Ana Uygulama Giriş Noktası)
Bu dosya sadece Flask uygulamasını başlatır, Blueprint'leri kaydeder ve
veritabanını initialize eder. İş mantığı routes/ altındaki modüllerdedir.
"""

import os
import mimetypes
from datetime import timedelta

from flask import Flask
from flask_principal import Principal, Identity, identity_loaded, identity_changed, RoleNeed
from werkzeug.security import generate_password_hash

# Yerel modüller
from db import db_connection, init_db, get_db
from auth_middleware import login_required, roles_accepted, roles_required
from routes import ALL_BLUEPRINTS

# ------------------------------------------------------------------ #
# MIME Tip Düzeltmeleri (ES modülleri için)                           #
# ------------------------------------------------------------------ #
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('text/css', '.css')

# ------------------------------------------------------------------ #
# Flask Uygulama Yapılandırması                                        #
# ------------------------------------------------------------------ #
app = Flask(__name__, static_folder='.', static_url_path='')

app.secret_key = os.environ.get('SECRET_KEY', 'PROJECTCRM_SECURE_SECRET_2026_KEY')
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=30)
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

# ------------------------------------------------------------------ #
# Yükleme Klasörü Yapılandırması                                      #
# ------------------------------------------------------------------ #
try:
    os.makedirs('/data/uploads/profiles', exist_ok=True)
    UPLOAD_BASE_DIR = '/data/uploads'
except (PermissionError, OSError):
    UPLOAD_BASE_DIR = os.path.join(os.path.dirname(__file__), 'static', 'uploads')
    os.makedirs(os.path.join(UPLOAD_BASE_DIR, 'profiles'), exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_BASE_DIR

# ------------------------------------------------------------------ #
# Flask-Principal Yapılandırması                                       #
# ------------------------------------------------------------------ #
principal = Principal(app)


@principal.identity_loader
def read_identity_from_session():
    from flask import session
    if 'user_id' in session:
        return Identity(session['user_id'])
    return None


def on_identity_loaded(sender, identity):
    """Kullanıcı kimliğine rol ve izinleri yükler."""
    identity.user = identity.id
    try:
        with db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT role FROM users WHERE uid = ?', (identity.id,))
            user_row = cursor.fetchone()
            if user_row:
                role = user_row['role'] or 'agent'
                identity.provides.add(RoleNeed(role))
                cursor.execute('SELECT * FROM rol_yetkileri WHERE role = ?', (role,))
                perm_row = cursor.fetchone()
                if perm_row:
                    perm_dict = dict(perm_row)
                    for perm_name, has_val in perm_dict.items():
                        if perm_name != 'role' and has_val:
                            identity.provides.add(RoleNeed(f"perm:{perm_name}"))
    except Exception as e:
        print(f"Error loading identity permissions: {e}", flush=True)


identity_loaded.connect(on_identity_loaded, app)

# ------------------------------------------------------------------ #
# Cache Engelleme Header'ı                                            #
# ------------------------------------------------------------------ #
@app.after_request
def add_header(response):
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    return response

# ------------------------------------------------------------------ #
# Blueprint Kayıtları                                                  #
# ------------------------------------------------------------------ #
for blueprint in ALL_BLUEPRINTS:
    app.register_blueprint(blueprint)

# ------------------------------------------------------------------ #
# Uygulama Başlangıcında DB Başlatma                                   #
# ------------------------------------------------------------------ #
with app.app_context():
    init_db()
    # Şifre sıfırlama migration (kalıcı disk bağlantısı için)
    try:
        with db_connection() as conn:
            cursor = conn.cursor()
            email_to_reset = 'sariermusa4137@gmail.com'
            cursor.execute('SELECT * FROM users WHERE email = ?', (email_to_reset,))
            user = cursor.fetchone()
            if user:
                new_hash = generate_password_hash('41374137', method='pbkdf2:sha256')
                cursor.execute(
                    'UPDATE users SET password = ? WHERE email = ?',
                    (new_hash, email_to_reset)
                )
                conn.commit()
                print(f"Password reset migration executed for {email_to_reset}", flush=True)
    except Exception as e:
        print(f"Error in password reset migration: {e}", flush=True)

# ------------------------------------------------------------------ #
# Geliştirme Sunucusu                                                 #
# ------------------------------------------------------------------ #
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    print(f"Starting PROJECTCRM server on port {port}...", flush=True)
    app.run(host='0.0.0.0', port=port, debug=True)
