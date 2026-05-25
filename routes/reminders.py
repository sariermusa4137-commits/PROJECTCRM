"""
PROJECTCRM - routes/reminders.py
Anımsatıcılar (Reminders) modülü CRUD rotaları.
"""

import uuid
import datetime
from flask import Blueprint, request, jsonify, session
from db import db_connection
from auth_middleware import login_required

reminders_bp = Blueprint('reminders', __name__)

@reminders_bp.route('/api/reminders', methods=['GET'])
@login_required
def get_reminders():
    try:
        current_user_id = session.get('user_id')
        with db_connection() as conn:
            cursor = conn.cursor()
            
            # Kullanıcı bilgilerini al
            cursor.execute('SELECT role, agencyId FROM users WHERE uid = ?', (current_user_id,))
            user_row = cursor.fetchone()
            if not user_row:
                return {"error": "Kullanıcı bulunamadı."}, 404
                
            role = user_row['role'] or 'agent'
            agency_id = user_row['agencyId']
            
            # Sorguyu çalıştır
            if role == 'admin':
                cursor.execute('SELECT * FROM reminders WHERE agencyId = ? ORDER BY created_at DESC', (agency_id,))
            else:
                cursor.execute('SELECT * FROM reminders WHERE agencyId = ? AND createdById = ? ORDER BY created_at DESC', (agency_id, current_user_id))
                
            rows = cursor.fetchall()
            list_data = []
            for r in rows:
                item = dict(r)
                item['is_completed'] = bool(item['is_completed'])
                list_data.append(item)
                
            return jsonify(list_data)
    except Exception as e:
        return {"error": str(e)}, 500

@reminders_bp.route('/api/reminders', methods=['POST'])
@login_required
def create_reminder():
    try:
        current_user_id = session.get('user_id')
        data = request.get_json() or {}
        title = data.get('title')
        if not title:
            return {"error": "Başlık gereklidir."}, 400
            
        with db_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute('SELECT agencyId FROM users WHERE uid = ?', (current_user_id,))
            user_row = cursor.fetchone()
            agency_id = user_row['agencyId'] if user_row else None
            
            reminder_id = data.get('id') or str(uuid.uuid4())
            description = data.get('description', '')
            due_date = data.get('due_date')
            is_completed = 1 if data.get('is_completed') else 0
            category = data.get('category', 'Tümü')
            created_at = datetime.datetime.now().isoformat()
            
            cursor.execute(
                "INSERT INTO reminders (id, agencyId, createdById, title, description, due_date, is_completed, category, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (reminder_id, agency_id, current_user_id, title, description, due_date, is_completed, category, created_at)
            )
            conn.commit()
            
            cursor.execute("SELECT * FROM reminders WHERE id = ?", (reminder_id,))
            inserted = dict(cursor.fetchone())
            inserted['is_completed'] = bool(inserted['is_completed'])
            return jsonify(inserted), 201
    except Exception as e:
        return {"error": str(e)}, 500

@reminders_bp.route('/api/reminders/<id>', methods=['PUT'])
@login_required
def update_reminder(id):
    try:
        current_user_id = session.get('user_id')
        data = request.get_json() or {}
        
        with db_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute('SELECT role, agencyId FROM users WHERE uid = ?', (current_user_id,))
            user_row = cursor.fetchone()
            if not user_row:
                return {"error": "Kullanıcı bulunamadı."}, 404
                
            role = user_row['role'] or 'agent'
            agency_id = user_row['agencyId']
            
            if role == 'admin':
                cursor.execute('SELECT * FROM reminders WHERE id = ? AND agencyId = ?', (id, agency_id))
            else:
                cursor.execute('SELECT * FROM reminders WHERE id = ? AND agencyId = ? AND createdById = ?', (id, agency_id, current_user_id))
                
            reminder = cursor.fetchone()
            if not reminder:
                return {"error": "Anımsatıcı bulunamadı veya yetkiniz yok."}, 404
                
            title = data.get('title', reminder['title'])
            description = data.get('description', reminder['description'])
            due_date = data.get('due_date', reminder['due_date'])
            is_completed = 1 if data.get('is_completed', reminder['is_completed']) else 0
            category = data.get('category', reminder['category'])
            
            cursor.execute(
                "UPDATE reminders SET title = ?, description = ?, due_date = ?, is_completed = ?, category = ? WHERE id = ?",
                (title, description, due_date, is_completed, category, id)
            )
            conn.commit()
            
            cursor.execute("SELECT * FROM reminders WHERE id = ?", (id,))
            updated = dict(cursor.fetchone())
            updated['is_completed'] = bool(updated['is_completed'])
            return jsonify(updated)
    except Exception as e:
        return {"error": str(e)}, 500

@reminders_bp.route('/api/reminders/<id>', methods=['DELETE'])
@login_required
def delete_reminder(id):
    try:
        current_user_id = session.get('user_id')
        with db_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute('SELECT role, agencyId FROM users WHERE uid = ?', (current_user_id,))
            user_row = cursor.fetchone()
            if not user_row:
                return {"error": "Kullanıcı bulunamadı."}, 404
                
            role = user_row['role'] or 'agent'
            agency_id = user_row['agencyId']
            
            if role == 'admin':
                cursor.execute('SELECT * FROM reminders WHERE id = ? AND agencyId = ?', (id, agency_id))
            else:
                cursor.execute('SELECT * FROM reminders WHERE id = ? AND agencyId = ? AND createdById = ?', (id, agency_id, current_user_id))
                
            reminder = cursor.fetchone()
            if not reminder:
                return {"error": "Anımsatıcı bulunamadı veya yetkiniz yok."}, 404
                
            cursor.execute("DELETE FROM reminders WHERE id = ?", (id,))
            conn.commit()
            return jsonify({"status": "success"})
    except Exception as e:
        return {"error": str(e)}, 500
