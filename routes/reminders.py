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
            cursor.execute('SELECT role, agency_id, agencyId FROM users WHERE uid = ?', (current_user_id,))
            user_row = cursor.fetchone()
            if not user_row:
                return {"error": "Kullanıcı bulunamadı."}, 404
                
            role = user_row['role'] or 'agent'
            user_agency_id = user_row['agency_id']
            
            # Resolve filtering agency_id
            filter_agency_id = None
            if role == 'admin':
                req_agency = request.args.get('agencyId')
                if req_agency:
                    cursor.execute('SELECT id FROM agencies WHERE id = ? OR agency_code = ?', (req_agency, req_agency))
                    ag_row = cursor.fetchone()
                    if ag_row:
                        filter_agency_id = ag_row['id']
                else:
                    filter_agency_id = user_agency_id
            else:
                filter_agency_id = user_agency_id
            
            # Sorguyu çalıştır
            if role == 'admin':
                if filter_agency_id is None:
                    cursor.execute('SELECT * FROM reminders ORDER BY created_at DESC')
                else:
                    cursor.execute('SELECT * FROM reminders WHERE agency_id = ? ORDER BY created_at DESC', (filter_agency_id,))
            else:
                if filter_agency_id is None:
                    cursor.execute('SELECT * FROM reminders WHERE agency_id IS NULL AND createdById = ? ORDER BY created_at DESC', (current_user_id,))
                else:
                    cursor.execute('SELECT * FROM reminders WHERE agency_id = ? AND createdById = ? ORDER BY created_at DESC', (filter_agency_id, current_user_id))
                
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
            
            cursor.execute('SELECT agency_id, agencyId FROM users WHERE uid = ?', (current_user_id,))
            user_row = cursor.fetchone()
            agency_id = user_row['agency_id'] if user_row else None
            agency_code = user_row['agencyId'] if user_row else None
            
            reminder_id = data.get('id') or str(uuid.uuid4())
            description = data.get('description', '')
            due_date = data.get('due_date')
            is_completed = 1 if data.get('is_completed') else 0
            category = data.get('category', 'Tümü')
            created_at = datetime.datetime.now().isoformat()
            
            cursor.execute(
                "INSERT INTO reminders (id, agencyId, agency_id, createdById, title, description, due_date, is_completed, category, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (reminder_id, agency_code, agency_id, current_user_id, title, description, due_date, is_completed, category, created_at)
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
            
            cursor.execute('SELECT role, agency_id FROM users WHERE uid = ?', (current_user_id,))
            user_row = cursor.fetchone()
            if not user_row:
                return {"error": "Kullanıcı bulunamadı."}, 404
                
            role = user_row['role'] or 'agent'
            user_agency_id = user_row['agency_id']
            
            cursor.execute('SELECT * FROM reminders WHERE id = ?', (id,))
            reminder = cursor.fetchone()
            if not reminder:
                return {"error": "Anımsatıcı bulunamadı."}, 404
                
            if role != 'admin' and reminder['agency_id'] != user_agency_id:
                return {"error": "Bu işlem için yetkiniz bulunmamaktadır."}, 403
                
            if role != 'admin' and reminder['createdById'] != current_user_id:
                return {"error": "Bu işlem için yetkiniz bulunmamaktadır."}, 403
                
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
            
            cursor.execute('SELECT role, agency_id FROM users WHERE uid = ?', (current_user_id,))
            user_row = cursor.fetchone()
            if not user_row:
                return {"error": "Kullanıcı bulunamadı."}, 404
                
            role = user_row['role'] or 'agent'
            user_agency_id = user_row['agency_id']

            # RBAC: Sadece admin silebilir
            if role != 'admin':
                return {"error": "Anımsatıcı silme yetkiniz bulunmamaktadır."}, 403

            cursor.execute('SELECT * FROM reminders WHERE id = ?', (id,))
            reminder = cursor.fetchone()
            if not reminder:
                return {"error": "Anımsatıcı bulunamadı."}, 404
                
            cursor.execute("DELETE FROM reminders WHERE id = ?", (id,))
            conn.commit()
            return jsonify({"status": "success"})
    except Exception as e:
        return {"error": str(e)}, 500
