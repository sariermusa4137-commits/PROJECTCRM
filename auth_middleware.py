"""
PROJECTCRM - Auth & RBAC Middleware Modülü
login_required, roles_accepted, roles_required dekoratörleri ve 403 sayfası.
"""

from functools import wraps
from flask import request, session
from db import db_connection


def render_forbidden_html():
    """403 Yasak Erişim sayfası HTML'i döndürür."""
    return """
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Erişim Engellendi (403) - PROJECTCRM</title>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
            :root {
                --bg-color: #0b0f19;
                --card-bg: rgba(30, 41, 59, 0.4);
                --border-color: rgba(255, 255, 255, 0.08);
                --primary-color: #6366f1;
                --text-primary: #f8fafc;
                --text-secondary: #94a3b8;
            }
            body {
                background-color: var(--bg-color);
                color: var(--text-primary);
                font-family: 'Outfit', sans-serif;
                display: flex;
                align-items: center;
                justify-content: center;
                height: 100vh;
                margin: 0;
                overflow: hidden;
            }
            .container {
                text-align: center;
                background: var(--card-bg);
                border: 1px solid var(--border-color);
                padding: 40px;
                border-radius: 16px;
                backdrop-filter: blur(12px);
                max-width: 450px;
                width: 90%;
                box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
            }
            .icon { font-size: 64px; margin-bottom: 24px; animation: pulse 2s infinite ease-in-out; }
            h1 { font-size: 24px; font-weight: 700; margin: 0 0 12px 0; }
            p { font-size: 14px; color: var(--text-secondary); margin: 0 0 24px 0; line-height: 1.6; }
            .btn {
                background: var(--primary-color);
                color: white;
                border: none;
                padding: 12px 24px;
                font-size: 14px;
                font-weight: 600;
                border-radius: 8px;
                cursor: pointer;
                text-decoration: none;
                transition: all 0.2s ease;
                display: inline-block;
            }
            .btn:hover { opacity: 0.9; transform: translateY(-1px); }
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="icon">🔒</div>
            <h1>Erişim Yetkiniz Bulunmamaktadır</h1>
            <p>Bu sayfaya veya işleme erişmek için gerekli yetki izinlerine sahip değilsiniz. Lütfen acente yöneticiniz ile iletişime geçin.</p>
            <a href="/" class="btn">Ana Sayfaya Dön</a>
        </div>
    </body>
    </html>
    """, 403


def _is_json_request():
    """İsteğin JSON/API isteği mi yoksa HTML sayfası isteği mi olduğunu belirler."""
    return (
        request.headers.get('X-Requested-With') == 'XMLHttpRequest'
        or not request.accept_mimetypes.accept_html
        or request.path.startswith('/api/')
    )


def login_required(f):
    """Kullanıcının oturum açmış olmasını zorunlu kılan dekoratör."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('user_id'):
            return {"error": "Yetkisiz erişim. Lütfen giriş yapın."}, 401
        return f(*args, **kwargs)
    return decorated_function


def roles_accepted(*requirements):
    """
    Belirtilen rollerden birine veya gerekli izne sahip olunmasını zorunlu kılar.
    Admin kullanıcılar her zaman erişime sahiptir.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not session.get('user_id'):
                return {"error": "Yetkisiz erişim. Lütfen giriş yapın."}, 401

            has_access = False
            try:
                with db_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute('SELECT role FROM users WHERE uid = ?', (session.get('user_id'),))
                    user_row = cursor.fetchone()
                    if user_row:
                        role = user_row['role'] or 'agent'
                        # Admin her zaman tam erişime sahip
                        if role == 'admin' or role in requirements:
                            has_access = True
                        else:
                            cursor.execute('SELECT * FROM rol_yetkileri WHERE role = ?', (role,))
                            perm_row = cursor.fetchone()
                            if perm_row:
                                perm_dict = dict(perm_row)
                                for req in requirements:
                                    if req in perm_dict and perm_dict[req]:
                                        has_access = True
                                        break
            except Exception as e:
                print(f"Error checking roles_accepted: {e}", flush=True)

            if not has_access:
                if _is_json_request():
                    return {"error": "Bu işlem için yetkiniz bulunmamaktadır."}, 403
                return render_forbidden_html()
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def roles_required(*requirements):
    """
    Belirtilen TÜM rollere/izinlere sahip olunmasını zorunlu kılar.
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not session.get('user_id'):
                return {"error": "Yetkisiz erişim. Lütfen giriş yapın."}, 401

            has_access = True
            try:
                with db_connection() as conn:
                    cursor = conn.cursor()
                    cursor.execute('SELECT role FROM users WHERE uid = ?', (session.get('user_id'),))
                    user_row = cursor.fetchone()
                    if user_row:
                        role = user_row['role'] or 'agent'
                        cursor.execute('SELECT * FROM rol_yetkileri WHERE role = ?', (role,))
                        perm_row = cursor.fetchone()
                        perm_dict = dict(perm_row) if perm_row else {}

                        for req in requirements:
                            if req in ['admin', 'agent', 'assistant']:
                                if role != req:
                                    has_access = False
                                    break
                            else:
                                if not perm_dict.get(req):
                                    has_access = False
                                    break
                    else:
                        has_access = False
            except Exception as e:
                print(f"Error checking roles_required: {e}", flush=True)
                has_access = False

            if not has_access:
                if _is_json_request():
                    return {"error": "Bu işlem için yetkiniz bulunmamaktadır."}, 403
                return render_forbidden_html()
            return f(*args, **kwargs)
        return decorated_function
    return decorator
