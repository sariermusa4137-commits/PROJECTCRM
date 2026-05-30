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
            current_user_id = session.get('user_id')

            # Fetch user's role and agency_id
            cursor.execute('SELECT role, agency_id FROM users WHERE uid = ?', (current_user_id,))
            user_row = cursor.fetchone()
            if not user_row:
                return {"error": "Kullanıcı bulunamadı."}, 404
            role = user_row['role'] or 'agent'
            user_agency_id = user_row['agency_id']
            
            # Fetch portfolio details
            cursor.execute(
                'SELECT price, current_rent, annual_growth_estimate, inflation_estimate, agency_id FROM portfolios WHERE id = ?',
                (id,)
            )
            p = cursor.fetchone()
            
            if not p:
                return {"error": "Portföy bulunamadı."}, 404

            # Enforce agency isolation for non-admins
            if role != 'admin' and p['agency_id'] != user_agency_id:
                return {"error": "Bu portföyün ROI analizini görme yetkiniz bulunmamaktadır."}, 403
                
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
                
            # Fetch dynamic rates from database
            cursor.execute("SELECT rate_key, rate_value FROM financial_rates")
            rates = {row['rate_key']: float(row['rate_value']) for row in cursor.fetchall()}
            
            mevduat_rate = rates.get('mevduat_faizi', 50.0) # default fallback if not found
            altin_rate = rates.get('altin_getiri', 45.0) # default fallback if not found

            # 2. Fixed Interest Return (Mevduat)
            interest_proj = [price]
            curr_interest = price
            mevduat_factor = 1.0 + (mevduat_rate / 100.0)
            for yr in range(1, 6):
                curr_interest = curr_interest * mevduat_factor
                interest_proj.append(round(curr_interest))
                
            # 3. Gold/Currency Basket (Altın)
            gold_proj = [price]
            curr_gold = price
            altin_factor = 1.0 + (altin_rate / 100.0)
            for yr in range(1, 6):
                curr_gold = curr_gold * altin_factor
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
                        "label": f"Mevduat Faizi (%{int(round(mevduat_rate))})",
                        "data": interest_proj
                    },
                    {
                        "label": f"Altın/Döviz (%{int(round(altin_rate))})",
                        "data": gold_proj
                    }
                ]
            })
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}, 500


# ------------------------------------------------------------------ #
# Background Task: Fetch and Update Financial Rates                   #
# ------------------------------------------------------------------ #
import threading
import time
import requests
import re
from datetime import datetime, timedelta

def fetch_and_update_rates():
    print("[Fetcher] Starting background financial rates fetch...", flush=True)
    # Default fallbacks
    mevduat_val = 50.0
    altin_val = 45.0
    
    # 1. Fetch bank deposit rates from Enuygun
    try:
        headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}
        r = requests.get("https://www.enuygun.com/mevduat/", headers=headers, timeout=15)
        if r.status_code == 200:
            matches = re.findall(r'%\s*(\d+[\.,]\d+|\d+)', r.text)
            rates = []
            for m in matches:
                val_str = m.replace(',', '.')
                try:
                    val = float(val_str)
                    if 35 <= val <= 65: # Narrow range to get actual deposit rates
                        rates.append(val)
                except ValueError:
                    continue
            if rates:
                mevduat_val = sum(rates) / len(rates)
                print(f"[Fetcher] Scraped Mevduat average interest rate: {mevduat_val:.2f}%", flush=True)
            else:
                print("[Fetcher] No valid mevduat rates found on Enuygun, using fallback.", flush=True)
        else:
            print(f"[Fetcher] Enuygun HTTP error {r.status_code}, using fallback.", flush=True)
    except Exception as e:
        print(f"[Fetcher] Error scraping Mevduat interest rates: {e}, using fallback.", flush=True)

    # 2. Fetch gold annual return from Fawaz Ahmed API
    try:
        # Today's rate
        url_today = "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/xau.json"
        r_today = requests.get(url_today, timeout=15)
        if r_today.status_code == 200:
            data_today = r_today.json()
            xau_try_today = data_today['xau']['try']
            gram_gold_today = xau_try_today / 31.1034768
            
            # 1 year ago rate
            one_year_ago = datetime.utcnow() - timedelta(days=365)
            one_year_ago_str = one_year_ago.strftime('%Y-%m-%d')
            
            url_hist = f"https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@{one_year_ago_str}/v1/currencies/xau.json"
            r_hist = requests.get(url_hist, timeout=15)
            
            # If historical date fails (e.g. weekend or lag), try a few days offset
            attempts = 0
            while r_hist.status_code != 200 and attempts < 5:
                attempts += 1
                one_year_ago = one_year_ago - timedelta(days=1)
                one_year_ago_str = one_year_ago.strftime('%Y-%m-%d')
                url_hist = f"https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@{one_year_ago_str}/v1/currencies/xau.json"
                r_hist = requests.get(url_hist, timeout=15)
                
            if r_hist.status_code == 200:
                data_hist = r_hist.json()
                xau_try_hist = data_hist['xau']['try']
                gram_gold_hist = xau_try_hist / 31.1034768
                
                altin_val = ((gram_gold_today - gram_gold_hist) / gram_gold_hist) * 100
                print(f"[Fetcher] Calculated Altın annual return: {altin_val:.2f}%", flush=True)
            else:
                print("[Fetcher] Could not fetch historical gold rates, using fallback.", flush=True)
        else:
            print(f"[Fetcher] Fawaz API HTTP error {r_today.status_code}, using fallback.", flush=True)
    except Exception as e:
        print(f"[Fetcher] Error calculating Altın annual return: {e}, using fallback.", flush=True)

    # 3. Update database
    try:
        now_str = datetime.now().isoformat()
        with db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT OR REPLACE INTO financial_rates (rate_key, rate_value, last_updated) VALUES ('mevduat_faizi', ?, ?)",
                (mevduat_val, now_str)
            )
            cursor.execute(
                "INSERT OR REPLACE INTO financial_rates (rate_key, rate_value, last_updated) VALUES ('altin_getiri', ?, ?)",
                (altin_val, now_str)
            )
            conn.commit()
            print("[Fetcher] Successfully updated database with fetched financial rates.", flush=True)
    except Exception as e:
        print(f"[Fetcher] Database error writing financial rates: {e}", flush=True)

def rates_fetcher_loop():
    # Loop to run once a day
    while True:
        try:
            fetch_and_update_rates()
        except Exception as e:
            print("[Fetcher] Background fetcher loop error:", e, flush=True)
        time.sleep(24 * 60 * 60)

def start_rates_fetcher():
    t = threading.Thread(target=rates_fetcher_loop, daemon=True)
    t.start()
    print("[Fetcher] Background rates fetcher thread started.", flush=True)
