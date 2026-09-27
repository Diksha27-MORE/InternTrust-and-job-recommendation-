import hashlib
import json
import secrets
import sqlite3
from pathlib import Path

from werkzeug.security import check_password_hash, generate_password_hash


AUTH_DB_PATH = Path(__file__).parent / 'data' / 'interntrust_auth.sqlite3'


def _connect():
    AUTH_DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(AUTH_DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute('PRAGMA foreign_keys = ON')
    return connection


def initialize_auth_db():
    with _connect() as connection:
        connection.executescript(
            '''
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE COLLATE NOCASE,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'Student',
                skills TEXT NOT NULL DEFAULT '[]'
            );

            CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS analysis_history (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                title TEXT NOT NULL,
                website TEXT NOT NULL,
                company TEXT NOT NULL,
                risk_level TEXT NOT NULL,
                final_risk_score REAL NOT NULL,
                created_at TEXT NOT NULL,
                raw TEXT NOT NULL DEFAULT '{}',
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_analysis_history_user_id_created_at
            ON analysis_history(user_id, created_at DESC);
            '''
        )


def _public_user(row):
    return {
        'id': row['id'],
        'name': row['name'],
        'email': row['email'],
        'role': row['role'],
        'skills': [],
        'history': [],
    }


def register_user(name, email, password, role='Student'):
    clean_name = str(name or '').strip()
    clean_email = str(email or '').strip().lower()
    clean_password = str(password or '')

    if not clean_name or not clean_email or not clean_password:
        return None, 'Name, email, and password are required.'

    if not ('@' in clean_email and '.' in clean_email.rsplit('@', 1)[-1]):
        return None, 'Please enter a valid email address.'

    if len(clean_password) < 6:
        return None, 'Password must be at least 6 characters long.'

    user = {
        'id': f"user_{secrets.token_hex(12)}",
        'name': clean_name,
        'email': clean_email,
        'password_hash': generate_password_hash(clean_password),
        'role': str(role or 'Student').strip() or 'Student',
    }

    try:
        with _connect() as connection:
            connection.execute(
                '''
                INSERT INTO users (id, name, email, password_hash, role)
                VALUES (?, ?, ?, ?, ?)
                ''',
                (
                    user['id'],
                    user['name'],
                    user['email'],
                    user['password_hash'],
                    user['role'],
                ),
            )
    except sqlite3.IntegrityError:
        return None, 'An account with this email already exists.'

    return {
        key: user[key] for key in ('id', 'name', 'email', 'role')
    } | {
        'skills': [],
        'history': [],
    }, None


def login_user(email, password):
    clean_email = str(email or '').strip().lower()
    clean_password = str(password or '')

    if not clean_email or not clean_password:
        return None, None, 'Email and password are required.'

    with _connect() as connection:
        row = connection.execute(
            'SELECT * FROM users WHERE email = ?',
            (clean_email,),
        ).fetchone()

        if row is None:
            return None, None, 'Invalid email or password.'

        if not check_password_hash(row['password_hash'], clean_password):
            return None, None, 'Invalid email or password.'

        token = secrets.token_urlsafe(32)

        connection.execute(
            'INSERT INTO sessions (token_hash, user_id) VALUES (?, ?)',
            (_hash_token(token), row['id']),
        )

    return _public_user(row), token, None


def get_user_from_token(token):
    if not token:
        return None

    with _connect() as connection:
        row = connection.execute(
            '''
            SELECT users.*
            FROM sessions
            JOIN users ON users.id = sessions.user_id
            WHERE sessions.token_hash = ?
            ''',
            (_hash_token(token),),
        ).fetchone()

    return _public_user(row) if row else None


def revoke_token(token):
    if not token:
        return

    with _connect() as connection:
        connection.execute(
            'DELETE FROM sessions WHERE token_hash = ?',
            (_hash_token(token),),
        )


def save_analysis_history(user_id, record):
    if not user_id or not record:
        return None

    with _connect() as connection:
        connection.execute(
            '''
            INSERT OR REPLACE INTO analysis_history
            (
                id,
                user_id,
                title,
                website,
                company,
                risk_level,
                final_risk_score,
                created_at,
                raw
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''',
            (
                record.get('id'),
                user_id,
                record.get('title', 'Job Opportunity'),
                record.get('website', ''),
                record.get('company', 'Company'),
                record.get('riskLevel', 'Unknown'),
                float(record.get('finalRiskScore', 0)),
                record.get('createdAt', ''),
                json.dumps(record.get('raw', {})),
            ),
        )

    return record


def get_analysis_history(user_id):
    if not user_id:
        return []

    with _connect() as connection:
        rows = connection.execute(
            '''
            SELECT
                id,
                user_id,
                title,
                website,
                company,
                risk_level,
                final_risk_score,
                created_at,
                raw
            FROM analysis_history
            WHERE user_id = ?
            ORDER BY created_at DESC
            ''',
            (user_id,),
        ).fetchall()

    history = []

    for row in rows:
        try:
            raw = json.loads(row['raw']) if row['raw'] else {}
        except (json.JSONDecodeError, TypeError):
            raw = {}

        history.append(
            {
                'id': row['id'],
                'userId': row['user_id'],
                'title': row['title'],
                'website': row['website'],
                'company': row['company'],
                'riskLevel': row['risk_level'],
                'finalRiskScore': row['final_risk_score'],
                'createdAt': row['created_at'],
                'raw': raw,
            }
        )

    return history


def _hash_token(token):
    return hashlib.sha256(token.encode('utf-8')).hexdigest()