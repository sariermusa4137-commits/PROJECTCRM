"""
PROJECTCRM - routes/__init__.py
Tüm Blueprint'leri kaydeden merkezi modül.
"""

from .auth import auth_bp
from .agency import agency_bp
from .data import data_bp
from .users import users_bp
from .reports import reports_bp
from .calendar import calendar_bp
from .profile import profile_bp
from .export import export_bp
from .static_routes import static_bp
from .matchmaking import matchmaking_bp
from .analytics import analytics_bp

ALL_BLUEPRINTS = [
    auth_bp,
    agency_bp,
    data_bp,
    users_bp,
    reports_bp,
    calendar_bp,
    profile_bp,
    export_bp,
    static_bp,
    matchmaking_bp,
    analytics_bp,
]
