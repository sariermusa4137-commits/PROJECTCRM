"""
PROJECTCRM - Veritabanı Yardımcı Modülü
Tüm DB bağlantı yönetimi ve şema başlatma işlemleri buradadır.
"""

import os
import json
import datetime
import sqlite3
from contextlib import contextmanager
from werkzeug.security import generate_password_hash


DATABASE_PATH = os.environ.get(
    'DATABASE_PATH',
    os.path.join(os.path.dirname(__file__), 'projectcrm.db')
)

# Veritabanı dizininin var olduğundan emin ol
_db_dir = os.path.dirname(DATABASE_PATH)
if _db_dir and not os.path.exists(_db_dir):
    os.makedirs(_db_dir, exist_ok=True)


def get_db() -> sqlite3.Connection:
    """Ham SQLite bağlantısı döndürür. Kapatmak çağıranın sorumluluğundadır."""
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


@contextmanager
def db_connection():
    """
    Context manager — bağlantıyı otomatik kapatır ve
    exception durumunda bile kilitleri önler.

    Kullanım:
        with db_connection() as conn:
            cursor = conn.cursor()
            ...
    """
    conn = get_db()
    try:
        yield conn
    finally:
        conn.close()


def init_db():
    """Tüm tabloları oluşturur ve güvenli migration adımlarını çalıştırır."""
    with db_connection() as conn:
        cursor = conn.cursor()

        # ------------------------------------------------------------------ #
        # Tablo Oluşturma                                                      #
        # ------------------------------------------------------------------ #

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                uid TEXT PRIMARY KEY,
                displayName TEXT,
                email TEXT UNIQUE,
                photoURL TEXT,
                agencyId TEXT,
                createdAt TEXT,
                firstName TEXT,
                lastName TEXT,
                phone TEXT,
                password TEXT,
                profile_image TEXT,
                role TEXT DEFAULT 'agent'
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS agencies (
                id TEXT PRIMARY KEY,
                name TEXT,
                createdById TEXT,
                createdAt TEXT
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS portfolios (
                id TEXT PRIMARY KEY,
                agencyId TEXT,
                createdById TEXT,
                createdByName TEXT,
                createdByPhoto TEXT,
                createdAt TEXT,
                title TEXT,
                price REAL,
                type TEXT,
                propertyType TEXT,
                rooms TEXT,
                area REAL,
                city TEXT,
                district TEXT,
                neighborhood TEXT,
                latitude REAL,
                longitude REAL,
                status TEXT DEFAULT 'aktif',
                heating TEXT,
                age INTEGER,
                floors INTEGER,
                titleStatus TEXT,
                commission REAL,
                notes TEXT,
                imageUrl TEXT,
                sozlesme_tipi TEXT,
                sozlesme_bitis_tarihi TEXT,
                mulk_durumu TEXT,
                tapu_durumu_notlari TEXT
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS customers (
                id TEXT PRIMARY KEY,
                agencyId TEXT,
                createdById TEXT,
                createdByName TEXT,
                createdAt TEXT,
                name TEXT,
                phone TEXT,
                email TEXT,
                birthDate TEXT,
                birth_date TEXT,
                type TEXT,
                budget REAL,
                searchLocation TEXT,
                searchRooms TEXT,
                searchPropertyType TEXT,
                notes TEXT,
                finansman_tipi TEXT,
                satin_alma_amaci TEXT,
                yabanci_satis TEXT,
                aciliyet_durumu TEXT,
                sozlesme_tipi TEXT,
                sozlesme_bitis_tarihi TEXT,
                contract_end_date TEXT,
                property_sold_date TEXT,
                mulk_durumu TEXT,
                tapu_durumu_notlari TEXT,
                status TEXT DEFAULT 'aktif'
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS meetings (
                id TEXT PRIMARY KEY,
                agencyId TEXT,
                createdById TEXT,
                createdByName TEXT,
                createdAt TEXT,
                customerId TEXT,
                customerName TEXT,
                title TEXT,
                type TEXT,
                date TEXT,
                time TEXT,
                notes TEXT,
                kanbanStage TEXT
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS locations (
                id TEXT PRIMARY KEY,
                name TEXT,
                notes TEXT,
                sqmPriceSale REAL,
                sqmPriceRent REAL,
                competitorNotes TEXT,
                demographics TEXT,
                trends TEXT,
                subNeighborhoods TEXT,
                createdAt TEXT
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS todos (
                id TEXT PRIMARY KEY,
                agencyId TEXT,
                task TEXT,
                completed INTEGER DEFAULT 0,
                dueDate TEXT,
                assignedToId TEXT,
                assignedToName TEXT
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS activities (
                id TEXT PRIMARY KEY,
                agencyId TEXT,
                userName TEXT,
                userPhoto TEXT,
                action TEXT,
                time TEXT
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS deals (
                id TEXT PRIMARY KEY,
                agencyId TEXT,
                createdById TEXT,
                createdByName TEXT,
                createdAt TEXT,
                portfolioId TEXT,
                portfolioTitle TEXT,
                buyerId TEXT,
                buyerName TEXT,
                sellerId TEXT,
                sellerName TEXT,
                agreedPrice REAL,
                buyerInvoiceStatus TEXT,
                sellerInvoiceStatus TEXT,
                checklist TEXT
            )
        ''')

        # ------------------------------------------------------------------ #
        # Güvenli Kolon Migration (ALTER TABLE IF NOT EXISTS pattern)          #
        # ------------------------------------------------------------------ #
        alter_queries = [
            ("users", "firstName", "TEXT"),
            ("users", "lastName", "TEXT"),
            ("users", "phone", "TEXT"),
            ("users", "password", "TEXT"),
            ("users", "profile_image", "TEXT"),
            ("users", "role", "TEXT DEFAULT 'agent'"),
            ("customers", "birth_date", "TEXT"),
            ("customers", "contract_end_date", "TEXT"),
            ("customers", "property_sold_date", "TEXT"),
            ("customers", "status", "TEXT DEFAULT 'aktif'"),
            ("portfolios", "status", "TEXT DEFAULT 'aktif'"),
        ]
        for table, col, col_type in alter_queries:
            try:
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}")
            except sqlite3.OperationalError:
                pass  # Kolon zaten var

        # Set default values for empty statuses
        try:
            cursor.execute("UPDATE portfolios SET status = 'aktif' WHERE status IS NULL OR status = ''")
            cursor.execute("UPDATE customers SET status = 'aktif' WHERE status IS NULL OR status = ''")
        except sqlite3.OperationalError:
            pass

        # ------------------------------------------------------------------ #
        # Mevcut kullanıcılar için firstName/lastName migration               #
        # ------------------------------------------------------------------ #
        try:
            cursor.execute("SELECT uid, displayName, firstName, lastName FROM users")
            for u in cursor.fetchall():
                uid, disp, fname, lname = u["uid"], u["displayName"] or "", u["firstName"], u["lastName"]
                if (fname is None or fname == "") and disp:
                    parts = disp.split(" ", 1)
                    cursor.execute(
                        "UPDATE users SET firstName = ?, lastName = ? WHERE uid = ?",
                        (parts[0], parts[1] if len(parts) > 1 else "", uid)
                    )
        except Exception as ex:
            print("Error migrating display names:", ex)

        conn.commit()

        # ------------------------------------------------------------------ #
        # Varsayılan Lokasyon Verileri                                        #
        # ------------------------------------------------------------------ #
        cursor.execute('SELECT COUNT(*) FROM locations')
        if cursor.fetchone()[0] == 0:
            _seed_default_locations(cursor)

        # ------------------------------------------------------------------ #
        # Admin Tanımla                                                       #
        # ------------------------------------------------------------------ #
        try:
            cursor.execute(
                "UPDATE users SET role = 'admin' WHERE email = 'sariermusa4137@gmail.com'"
            )
            conn.commit()
        except Exception as e:
            print(f"Error promoting admin: {e}", flush=True)

        # ------------------------------------------------------------------ #
        # Rol Yetkileri Tablosu                                               #
        # ------------------------------------------------------------------ #
        _init_rol_yetkileri(cursor, conn)

        conn.commit()


def _init_rol_yetkileri(cursor, conn):
    """rol_yetkileri tablosunu oluşturur ve varsayılan değerleri ekler."""
    try:
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS rol_yetkileri (
                role TEXT PRIMARY KEY,
                can_delete_portfolio INTEGER DEFAULT 1,
                can_edit_customer INTEGER DEFAULT 1,
                can_view_all_agency INTEGER DEFAULT 1,
                can_view_reports INTEGER DEFAULT 1
            )
        ''')
        # Yeni kolonlar için güvenli migration
        for t, col, c_type in [("rol_yetkileri", "can_view_reports", "INTEGER DEFAULT 1")]:
            try:
                cursor.execute(f"ALTER TABLE {t} ADD COLUMN {col} {c_type}")
            except sqlite3.OperationalError:
                pass

        defaults = {
            'admin':     (1, 1, 1, 1),
            'agent':     (1, 1, 1, 0),
            'assistant': (0, 1, 1, 0),
        }
        for role, vals in defaults.items():
            cursor.execute("SELECT COUNT(*) FROM rol_yetkileri WHERE role = ?", (role,))
            if cursor.fetchone()[0] == 0:
                cursor.execute(
                    "INSERT INTO rol_yetkileri (role, can_delete_portfolio, can_edit_customer, can_view_all_agency, can_view_reports) VALUES (?, ?, ?, ?, ?)",
                    (role, *vals)
                )
        conn.commit()
    except Exception as e:
        print(f"Error initializing rol_yetkileri table: {e}", flush=True)


def _seed_default_locations(cursor):
    """Varsayılan bölge lokasyonlarını ekler."""
    default_locations = [
        {
            "id": "l1", "name": "Kadıköy Göztepe",
            "notes": "Ulaşım kolay (Marmaray ve metroya yakın), kentsel dönüşüm sebebiyle yeni binalar yoğunlukta. Prestijli bir bölge.",
            "sqmPriceSale": 95000, "sqmPriceRent": 350,
            "competitorNotes": "Bölgede Remax ve Coldwell Banker aktif. Fiyatlar son 6 ayda %15 arttı.",
            "demographics": "A+ Sosyo-ekonomik düzey, emekli ve beyaz yakalı aileler yoğunlukta.",
            "trends": json.dumps([{"year": "2024", "salePrice": 70000, "rentPrice": 240}, {"year": "2025", "salePrice": 85000, "rentPrice": 300}, {"year": "2026", "salePrice": 95000, "rentPrice": 350}]),
            "subNeighborhoods": json.dumps([]), "createdAt": "2026-05-22T00:00:00Z"
        },
        {
            "id": "l2", "name": "Suadiye Sahil",
            "notes": "Sahil şeridi çok talep görüyor. Fiyat marjları oldukça yüksek. Yatırım ve oturum için ideal.",
            "sqmPriceSale": 150000, "sqmPriceRent": 500,
            "competitorNotes": "Yerel lüks butik emlakçılar çok güçlü. İlan paylaşımları (portföy havuzu) yaygın.",
            "demographics": "Yüksek gelir grubu, nezih profil.",
            "trends": json.dumps([{"year": "2024", "salePrice": 110000, "rentPrice": 380}, {"year": "2025", "salePrice": 135000, "rentPrice": 450}, {"year": "2026", "salePrice": 150000, "rentPrice": 500}]),
            "subNeighborhoods": json.dumps([]), "createdAt": "2026-05-22T00:00:00Z"
        },
        {
            "id": "l3", "name": "Kartal",
            "notes": "Kentsel dönüşümün en yoğun olduğu bölgelerden biri.",
            "sqmPriceSale": 42000, "sqmPriceRent": 190,
            "competitorNotes": "Bölgede yerel emlak ofisleri ve büyük franchise markalar oldukça agresif pazarlama yapıyor.",
            "demographics": "Orta-üst gelir grubu, yeni evli çiftler ve beyaz yakalı çalışanlar.",
            "trends": json.dumps([{"year": "2024", "salePrice": 32000, "rentPrice": 140}, {"year": "2025", "salePrice": 38000, "rentPrice": 170}, {"year": "2026", "salePrice": 42000, "rentPrice": 190}]),
            "subNeighborhoods": json.dumps([{"name": "Kordonboyu", "sale": 55000, "rent": 250}, {"name": "Petrol İş", "sale": 40000, "rent": 180}]),
            "createdAt": "2026-05-22T00:00:00Z"
        },
        {
            "id": "l4", "name": "Maltepe",
            "notes": "Sahil yolu, minibüs caddesi ve metro hattı olmak üzere üç ana ulaşım aksına sahip.",
            "sqmPriceSale": 48000, "sqmPriceRent": 220,
            "competitorNotes": "Maltepe merkezli butik danışmanlık firmaları lüks segmentte pazar payına sahip.",
            "demographics": "Üst-orta gelir grubu, üniversite öğrencileri ve köklü Maltepe sakinleri.",
            "trends": json.dumps([{"year": "2024", "salePrice": 36000, "rentPrice": 160}, {"year": "2025", "salePrice": 43000, "rentPrice": 195}, {"year": "2026", "salePrice": 48000, "rentPrice": 220}]),
            "subNeighborhoods": json.dumps([{"name": "Küçükyalı", "sale": 62000, "rent": 280}, {"name": "İdealtepe", "sale": 58000, "rent": 260}]),
            "createdAt": "2026-05-22T00:00:00Z"
        },
        {
            "id": "l5", "name": "Pendik",
            "notes": "Sabiha Gökçen Havalimanı ve teknopark yatırımları ile sanayi/teknoloji çalışanlarının uğrak noktası.",
            "sqmPriceSale": 35000, "sqmPriceRent": 155,
            "competitorNotes": "Pendik ve Kurtköy bölgelerinde yeni projelerin satış ofisleri doğrudan satış yapıyor.",
            "demographics": "Orta gelir grubu, sanayi ve havacılık sektörü çalışanları, kalabalık aileler.",
            "trends": json.dumps([{"year": "2024", "salePrice": 27000, "rentPrice": 110}, {"year": "2025", "salePrice": 31000, "rentPrice": 135}, {"year": "2026", "salePrice": 35000, "rentPrice": 155}]),
            "subNeighborhoods": json.dumps([{"name": "Batı", "sale": 45000, "rent": 200}, {"name": "Bahçelievler", "sale": 37000, "rent": 165}]),
            "createdAt": "2026-05-22T00:00:00Z"
        },
    ]
    for loc in default_locations:
        cursor.execute('''
            INSERT INTO locations (id, name, notes, sqmPriceSale, sqmPriceRent, competitorNotes, demographics, trends, subNeighborhoods, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (loc["id"], loc["name"], loc["notes"], loc["sqmPriceSale"], loc["sqmPriceRent"],
              loc["competitorNotes"], loc["demographics"], loc["trends"], loc["subNeighborhoods"], loc["createdAt"]))
