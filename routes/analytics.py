"""
PROJECTCRM - routes/analytics.py
Yatırım Geri Dönüş (ROI) ve Gelişmiş Finansal Grafik Analitiği Motoru.
"""

from flask import Blueprint, jsonify, session
from db import db_connection
from auth_middleware import login_required

analytics_bp = Blueprint('analytics', __name__)


@analytics_bp.route('/api/portfolio/<id>/roi-analysis', methods=['GET'])
@login_required
def get_roi_analysis(id):
    try:
        with db_connection() as conn:
            cursor = conn.cursor()
            
            # Fetch portfolio details
            cursor.execute(
                'SELECT price, current_rent, annual_growth_estimate, inflation_estimate FROM portfolios WHERE id = ?',
                (id,)
            )
            p = cursor.fetchone()
            
            if not p:
                return {"error": "Portföy bulunamadı."}, 404
                
            price = float(p['price'] or 0)
            current_rent = float(p['current_rent'] or 0)
            annual_growth_estimate = float(p['annual_growth_estimate'] or 15.0)
            
            # Calculate standard metrics
            # Net Amortization Period (Net Amortisman Süresi) = price / (rent * 12)
            amortization_years = price / (current_rent * 12.0) if current_rent > 0 else 0.0
            
            # Cap Rate (Yıllık Kira Getiri Oranı) = (rent * 12 / price) * 100
            cap_rate = (current_rent * 12.0 / price) * 100.0 if price > 0 else 0.0
            
            # 5-Year Projection Arrays
            labels = ["Başlangıç", "1. Yıl", "2. Yıl", "3. Yıl", "4. Yıl", "5. Yıl"]
            
            # Growth rates
            growth_rate = annual_growth_estimate / 100.0
            
            # 1. Real Estate Projection
            prop_val_proj = [price]
            cum_rent_proj = [0.0]
            total_prop_proj = [price]
            
            current_val = price
            current_annual_rent = current_rent * 12.0
            cumulative_rent = 0.0
            
            for yr in range(1, 6):
                # Property appreciates
                current_val = current_val * (1.0 + growth_rate)
                # Rent appreciates
                current_annual_rent = current_annual_rent * (1.0 + growth_rate)
                # Add rent collected this year
                cumulative_rent += current_annual_rent
                
                prop_val_proj.append(round(current_val))
                cum_rent_proj.append(round(cumulative_rent))
                total_prop_proj.append(round(current_val + cumulative_rent))
                
            # 2. Fixed Interest Return (45% annual compound)
            interest_proj = [price]
            curr_interest = price
            for yr in range(1, 6):
                curr_interest = curr_interest * 1.45
                interest_proj.append(round(curr_interest))
                
            # 3. Gold/Currency Basket (30% annual compound)
            gold_proj = [price]
            curr_gold = price
            for yr in range(1, 6):
                curr_gold = curr_gold * 1.30
                gold_proj.append(round(curr_gold))
                
            return jsonify({
                "price": price,
                "currentRent": current_rent,
                "growthRate": annual_growth_estimate,
                "amortizationYears": amortization_years,
                "capRate": cap_rate,
                "labels": labels,
                "propertyValueProjection": prop_val_proj,
                "cumulativeRentProjection": cum_rent_proj,
                "datasets": [
                    {
                        "label": "Mülk Yatırımı (Toplam)",
                        "data": total_prop_proj
                    },
                    {
                        "label": "Mevduat Faizi (%45)",
                        "data": interest_proj
                    },
                    {
                        "label": "Altın/Döviz (%30)",
                        "data": gold_proj
                    }
                ]
            })
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}, 500
