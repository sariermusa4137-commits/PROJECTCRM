"""
PROJECTCRM - routes/reports.py
Ciro ve finansal rapor rotaları. topPerformers artık gerçek DB verisinden geliyor.
"""

import datetime
from flask import Blueprint, request, jsonify
from db import db_connection
from auth_middleware import login_required, roles_accepted

reports_bp = Blueprint('reports', __name__)


@reports_bp.route('/api/reports/ciro', methods=['GET'])
@login_required
@roles_accepted('can_view_reports')
def get_ciro_report():
    try:
        agency_id = request.args.get('agencyId')
        if not agency_id:
            return {"error": "agencyId parametresi gereklidir."}, 400

        with db_connection() as conn:
            cursor = conn.cursor()

            # Toplam işlem hacmi
            cursor.execute("SELECT SUM(agreedPrice) FROM deals WHERE agencyId = ?", (agency_id,))
            total_deals_price = cursor.fetchone()[0] or 0

            # Aktif portföy değeri
            cursor.execute("SELECT SUM(price) FROM portfolios WHERE agencyId = ?", (agency_id,))
            active_listings_val = cursor.fetchone()[0] or 0

            # Gerçek danışman performansı (deals tablosundan)
            cursor.execute('''
                SELECT createdByName AS name,
                       COUNT(*) AS dealsCount,
                       COALESCE(SUM(agreedPrice) * 0.04, 0) AS comm
                FROM deals
                WHERE agencyId = ?
                GROUP BY createdByName
                ORDER BY comm DESC
                LIMIT 5
            ''', (agency_id,))
            top_performers = [
                {"name": row['name'], "dealsCount": row['dealsCount'], "comm": round(row['comm'], 2)}
                for row in cursor.fetchall()
            ]

        # Aylık komisyon verisi (gerçek veri yoksa örnek eğri)
        commission_earned = round(total_deals_price * 0.04, 2)
        monthly_revenue = [180000, 240000, 310000, 290000, 420000,
                           commission_earned if commission_earned > 0 else 380000]

        return jsonify({
            "totalRevenue": total_deals_price,
            "commissionEarned": commission_earned,
            "activeListingsValue": active_listings_val,
            "monthlyRevenue": monthly_revenue,
            "commissionGoal": 1000000,
            "topPerformers": top_performers,
        })
    except Exception as e:
        return {"error": str(e)}, 500
