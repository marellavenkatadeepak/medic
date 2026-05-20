import os
import httpx
import json
import sqlite3
import uuid
import logging
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

INSFORGE_BASE_URL = os.getenv("INSFORGE_BASE_URL", "")
INSFORGE_SERVICE_KEY = os.getenv("INSFORGE_SERVICE_KEY", "")

_USE_LOCAL_DB = False
_SQLITE_PATH = os.path.join(os.path.dirname(__file__), "..", "local_db.sqlite")


def _init_sqlite_db():
    """Initialize the local SQLite database if it doesn't exist."""
    conn = sqlite3.connect(_SQLITE_PATH)
    c = conn.cursor()
    # Analyses
    c.execute('''CREATE TABLE IF NOT EXISTS analyses (
        id TEXT PRIMARY KEY,
        patient_wallet TEXT,
        file_name TEXT,
        file_url TEXT,
        ocr_text TEXT,
        summary TEXT,
        risk_score INTEGER,
        conditions TEXT,
        biomarkers TEXT,
        specialist TEXT,
        urgency TEXT,
        improvement_plan TEXT,
        record_hash TEXT,
        tx_hash TEXT,
        record_id INTEGER,
        encryption_key TEXT,
        encryption_key_hash TEXT,
        ipfs_cid TEXT,
        encryption_iv TEXT,
        organ_data TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )''')
    # Chat history
    c.execute('''CREATE TABLE IF NOT EXISTS chat_history (
        id TEXT PRIMARY KEY,
        patient_wallet TEXT,
        role TEXT,
        message TEXT,
        warning TEXT,
        confidence REAL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )''')
    # Appointments
    c.execute('''CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY,
        patient_wallet TEXT,
        doctor_wallet TEXT,
        date TEXT,
        time TEXT,
        reason TEXT,
        status TEXT,
        google_event_id TEXT,
        meeting_link TEXT,
        updated_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )''')
    # Doctor profiles
    c.execute('''CREATE TABLE IF NOT EXISTS doctor_profiles (
        id TEXT PRIMARY KEY,
        wallet_address TEXT UNIQUE,
        name TEXT,
        specialty TEXT,
        bio TEXT,
        google_refresh_token TEXT,
        google_calendar_connected INTEGER DEFAULT 0,
        updated_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )''')
    # Access grants
    c.execute('''CREATE TABLE IF NOT EXISTS access_grants (
        id TEXT PRIMARY KEY,
        patient_wallet TEXT,
        doctor_wallet TEXT,
        analysis_id TEXT,
        is_active INTEGER,
        revoked_at TEXT,
        granted_at TEXT DEFAULT CURRENT_TIMESTAMP,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )''')
    # Consultation notes
    c.execute('''CREATE TABLE IF NOT EXISTS consultation_notes (
        id TEXT PRIMARY KEY,
        doctor_wallet TEXT,
        patient_wallet TEXT,
        analysis_id TEXT,
        note TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )''')
    
    # Pre-populate Mock Doctors if empty
    c.execute("SELECT COUNT(*) FROM doctor_profiles")
    if c.fetchone()[0] == 0:
        mocks = [
            (str(uuid.uuid4()), '0x70997970C51812dc3A010C7d01b50e0d17dc79C8', 'Dr. Sarah Chen', 'Cardiology', 'Board-certified cardiologist with 12 years experience.', '', 0, ''),
            (str(uuid.uuid4()), '0x3C44Cd3B6aE100670155A7001F828a2c1C60f388', 'Dr. James Patel', 'Neurology', 'Dedicated neurologist specializing in stroke recovery.', '', 0, ''),
            (str(uuid.uuid4()), '0x90F79bf6EB2c4f870365E785982E1f101E93b906', 'Dr. Aisha Mahmoud', 'Endocrinology', 'Focuses on diabetes management and thyroid disorders.', '', 0, ''),
        ]
        c.executemany("INSERT INTO doctor_profiles (id, wallet_address, name, specialty, bio, google_refresh_token, google_calendar_connected, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", mocks)
        
    conn.commit()
    conn.close()


def _headers():
    return {
        "apikey": INSFORGE_SERVICE_KEY,
        "Authorization": f"Bearer {INSFORGE_SERVICE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def _sqlite_dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        val = row[idx]
        if isinstance(val, str) and (val.startswith('[') or val.startswith('{')):
            try:
                val = json.loads(val)
            except Exception:
                pass
        d[col[0]] = val
    return d


class MockSupabaseClient:
    """Mock client for get_supabase_client().table().update()... chains"""
    def __init__(self):
        self._table = None
        self._payload = {}
        self._filters = {}

    def table(self, table_name: str):
        self._table = table_name
        return self

    def update(self, payload: dict):
        self._payload = payload
        return self

    def eq(self, column: str, value: str):
        self._filters[column] = value
        return self

    def execute(self):
        if not self._table:
            return None
        conn = sqlite3.connect(_SQLITE_PATH)
        c = conn.cursor()
        
        sets = []
        vals = []
        for k, v in self._payload.items():
            sets.append(f"{k} = ?")
            vals.append(v)
            
        wheres = []
        for k, v in self._filters.items():
            wheres.append(f"{k} = ?")
            vals.append(v)
            
        query = f"UPDATE {self._table} SET {', '.join(sets)}"
        if wheres:
            query += f" WHERE {' AND '.join(wheres)}"
            
        c.execute(query, tuple(vals))
        conn.commit()
        conn.close()
        return type('MockResponse', (), {'data': []})()


def get_supabase_client():
    global _USE_LOCAL_DB
    if _USE_LOCAL_DB:
        return MockSupabaseClient()
    return MockSupabaseClient()


async def db_insert(table: str, payload: dict) -> dict:
    global _USE_LOCAL_DB
    if not _USE_LOCAL_DB:
        try:
            url = f"{INSFORGE_BASE_URL}/api/database/records/{table}"
            headers = _headers()
            headers["Prefer"] = "return=representation"
            async with httpx.AsyncClient() as client:
                resp = await client.post(url, json=[payload], headers=headers, timeout=5.0)
                resp.raise_for_status()
                data = resp.json()
                return data[0] if getattr(data, '__iter__', False) and len(data) > 0 else data
        except Exception as e:
            logger.warning(f"Remote db_insert failed ({e}). Falling back to SQLite local_db.")
            _USE_LOCAL_DB = True
            _init_sqlite_db()
            
    # SQLite fallback
    conn = sqlite3.connect(_SQLITE_PATH)
    conn.row_factory = _sqlite_dict_factory
    c = conn.cursor()
    
    if "id" not in payload:
        payload["id"] = str(uuid.uuid4())
        
    cols = []
    vals = []
    placeholders = []
    for k, v in payload.items():
        cols.append(k)
        placeholders.append("?")
        vals.append(json.dumps(v) if isinstance(v, (dict, list)) else v)
        
    query = f"INSERT INTO {table} ({', '.join(cols)}) VALUES ({', '.join(placeholders)})"
    c.execute(query, tuple(vals))
    conn.commit()
    
    c.execute(f"SELECT * FROM {table} WHERE id = ?", (payload["id"],))
    row = c.fetchone()
    conn.close()
    return row


async def db_select(table: str, filters: dict = None, order: str = None, limit: int = None, select: str = "*") -> list:
    global _USE_LOCAL_DB
    if not _USE_LOCAL_DB:
        try:
            url = f"{INSFORGE_BASE_URL}/api/database/records/{table}"
            params = {"select": select}
            if filters:
                params.update({f"{k}": f"eq.{v}" for k, v in filters.items()})
            if order:
                params["order"] = order
            if limit:
                params["limit"] = str(limit)

            async with httpx.AsyncClient() as client:
                resp = await client.get(url, params=params, headers=_headers(), timeout=5.0)
                resp.raise_for_status()
                return resp.json()
        except Exception as e:
            logger.warning(f"Remote db_select failed ({e}). Falling back to SQLite local_db.")
            _USE_LOCAL_DB = True
            _init_sqlite_db()

    # SQLite fallback
    conn = sqlite3.connect(_SQLITE_PATH)
    conn.row_factory = _sqlite_dict_factory
    c = conn.cursor()
    
    query = f"SELECT * FROM {table}"
    vals = []
    
    if filters:
        wheres = []
        for k, v in filters.items():
            if v == "true": v = 1
            elif v == "false": v = 0
            wheres.append(f"{k} = ?")
            vals.append(v)
        query += f" WHERE {' AND '.join(wheres)}"
        
    if order:
        parts = order.split('.')
        col = parts[0]
        direction = "DESC" if len(parts) > 1 and parts[1].lower() == "desc" else "ASC"
        query += f" ORDER BY {col} {direction}"
        
    if limit:
        query += f" LIMIT {limit}"
        
    c.execute(query, tuple(vals))
    rows = c.fetchall()
    conn.close()
    
    # Filter columns manually since select='summary,risk_score' might be passed
    if select and select != "*":
        cols = [col.strip() for col in select.split(',')]
        filtered_rows = []
        for r in rows:
            filtered_rows.append({k: v for k, v in r.items() if k in cols})
        return filtered_rows
        
    return rows


async def db_select_single(table: str, filters: dict = None, select: str = "*", order: str = None) -> dict | None:
    rows = await db_select(table, filters=filters, order=order, limit=1, select=select)
    return rows[0] if rows else None


async def db_update(table: str, row_id: str, payload: dict) -> dict:
    global _USE_LOCAL_DB
    if not _USE_LOCAL_DB:
        try:
            url = f"{INSFORGE_BASE_URL}/api/database/records/{table}"
            params = {"id": f"eq.{row_id}"}
            headers = _headers()
            headers["Prefer"] = "return=representation"

            async with httpx.AsyncClient() as client:
                resp = await client.patch(url, json=payload, params=params, headers=headers, timeout=5.0)
                resp.raise_for_status()
                data = resp.json()
                if isinstance(data, list) and len(data) > 0:
                    return data[0]
                return data
        except Exception as e:
            logger.warning(f"Remote db_update failed ({e}). Falling back to SQLite local_db.")
            _USE_LOCAL_DB = True
            _init_sqlite_db()

    # SQLite fallback
    conn = sqlite3.connect(_SQLITE_PATH)
    conn.row_factory = _sqlite_dict_factory
    c = conn.cursor()
    
    sets = []
    vals = []
    for k, v in payload.items():
        sets.append(f"{k} = ?")
        vals.append(json.dumps(v) if isinstance(v, (dict, list)) else v)
        
    vals.append(row_id)
    query = f"UPDATE {table} SET {', '.join(sets)} WHERE id = ?"
    c.execute(query, tuple(vals))
    conn.commit()
    
    c.execute(f"SELECT * FROM {table} WHERE id = ?", (row_id,))
    row = c.fetchone()
    conn.close()
    return row


async def db_delete(table: str, row_id: str) -> None:
    global _USE_LOCAL_DB
    if not _USE_LOCAL_DB:
        try:
            url = f"{INSFORGE_BASE_URL}/api/database/records/{table}"
            params = {"id": f"eq.{row_id}"}
            async with httpx.AsyncClient() as client:
                resp = await client.delete(url, params=params, headers=_headers(), timeout=5.0)
                resp.raise_for_status()
                return
        except Exception as e:
            logger.warning(f"Remote db_delete failed ({e}). Falling back to SQLite local_db.")
            _USE_LOCAL_DB = True
            _init_sqlite_db()

    # SQLite fallback
    conn = sqlite3.connect(_SQLITE_PATH)
    c = conn.cursor()
    c.execute(f"DELETE FROM {table} WHERE id = ?", (row_id,))
    conn.commit()
    conn.close()
