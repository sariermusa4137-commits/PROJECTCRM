"""
PROJECTCRM - routes/static_routes.py
Statik dosya servisi, ana sayfa ve cache kontrol rotaları.
"""

import os
from flask import Blueprint, send_from_directory, current_app

static_bp = Blueprint('static_routes', __name__)


@static_bp.route('/')
def index():
    return send_from_directory('.', 'index.html')


@static_bp.route('/uploads/<path:filename>')
def serve_uploads(filename):
    return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)


@static_bp.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)
