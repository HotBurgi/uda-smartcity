import os
from datetime import datetime, timedelta
from flask import Flask, jsonify, request, session
from flask_cors import CORS
import mysql.connector
import hashlib

# Backend SmartCity: API Flask per autenticazione, aree parcheggio e prenotazioni.
app = Flask(__name__)
app.secret_key = 'super_secret_smartcity_key'  # Used for session cookies
CORS(app, supports_credentials=True, origins=["http://localhost:3000", "http://127.0.0.1:3000"])

DB_HOST = os.environ.get('DB_HOST', 'localhost')
DB_USER = os.environ.get('DB_USER', 'root')
DB_PASS = os.environ.get('DB_PASS', 'root')
DB_NAME = os.environ.get('DB_NAME', 'smartcity')

pool = None # Pool di connessioni

# Restituisce una connessione al database, inizializzando una pool.
def get_db():
    global pool
    if pool is None:
        try:
            # Creazione pool.
            pool = mysql.connector.pooling.MySQLConnectionPool(
                pool_name="mypool",
                pool_size=5,
                host=DB_HOST,
                user=DB_USER,
                password=DB_PASS,
                database=DB_NAME,
            )
        except Exception:
            # In caso di errore, ritorna una singola connessione.
            return mysql.connector.connect(
                host=DB_HOST,
                user=DB_USER,
                password=DB_PASS,
                database=DB_NAME
            )
    return pool.get_connection()

def hash_password(password):
    # Usa SHA-256 per allinearsi al formato hash salvato nel database.
    return hashlib.sha256(password.encode()).hexdigest()


def parse_start_time_value(start_time_raw):
    # Supporta i formati inviati dal frontend per data/ora locale.
    if not start_time_raw:
        return None
    for fmt in ["%Y-%m-%dT%H:%M", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S"]:
        try:
            return datetime.strptime(start_time_raw, fmt)
        except ValueError:
            continue
    return None


def parse_duration_value(duration_minutes_raw):
    # Le durate valide sono predefinite per semplificare la gestione slot.
    try:
        duration_minutes = int(duration_minutes_raw)
    except (TypeError, ValueError):
        return None
    if duration_minutes not in [30, 60, 90]:
        return None
    return duration_minutes


def get_overlapping_bookings_count(cursor, area_id, start_time, end_time):
    cursor.execute(
        """
        SELECT COUNT(*) as overlap_count
        FROM bookings b
        WHERE b.area_id = %s
        AND b.start_time < %s
        AND b.end_time > %s
    """,
        (area_id, end_time, start_time),
    )
    row = cursor.fetchone()
    return int(row['overlap_count']) if row else 0

# =========== AUTENTICAZIONE ===========

@app.route('/api/login', methods=['POST'])
def login():
    # Estrae credenziali dal body JSON della richiesta.
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    # Verifica presenza dei campi obbligatori.
    if not username or not password:
        return jsonify({"error": "Missing credentials"}), 400

    hashed_pw = hash_password(password)
    
    try:
        conn = get_db()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, username, role FROM users WHERE username = %s AND password = %s", (username, hashed_pw))
        user = cursor.fetchone()
        cursor.close()
        conn.close()

        if user:
            # Salva i dati minimi dell'utente nella sessione server-side.
            session['user_id'] = user['id']
            session['username'] = user['username']
            session['role'] = user['role']
            return jsonify({"message": "Logged in successfully", "user": {"username": user['username'], "role": user['role']}})
        else:
            return jsonify({"error": "Invalid credentials"}), 401
    except Exception as e:
        return jsonify({"error": "Database error: " + str(e)}), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    # Invalida la sessione corrente.
    session.clear()
    return jsonify({"message": "Logged out successfully"})

@app.route('/api/me', methods=['GET'])
def get_me():
    # Restituisce le informazioni utente presenti in sessione.
    if 'user_id' in session:
        return jsonify({
            "id": session['user_id'],
            "username": session['username'],
            "role": session['role']
        })
    return jsonify({"error": "Not authenticated"}), 401

# =========== ENDPOINT UTENTE ===========

@app.route('/api/areas', methods=['GET'])
def get_areas():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    requested_start_raw = request.args.get('start_time')
    duration_minutes_raw = request.args.get('duration_minutes', 60)

    requested_start = None
    requested_end = None
    if requested_start_raw:
        requested_start = parse_start_time_value(requested_start_raw)
        if requested_start is None:
            return jsonify({"error": "Invalid start_time format. Use YYYY-MM-DDTHH:MM"}), 400

        duration_minutes = parse_duration_value(duration_minutes_raw)
        if duration_minutes is None:
            return jsonify({"error": "duration_minutes must be one of: 30, 60, 90"}), 400
        requested_end = requested_start + timedelta(minutes=duration_minutes)

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    
    # Calcola la disponibilita sottraendo le prenotazioni attive alla capienza massima.
    if requested_start and requested_end:
        query = """
            SELECT a.id, a.name, a.max_capacity,
            (a.max_capacity - (
                SELECT COUNT(*) FROM bookings b
                WHERE b.area_id = a.id
                AND b.start_time < %s
                AND b.end_time > %s
            )) AS available_capacity
            FROM parking_areas a
        """
        cursor.execute(query, (requested_end, requested_start))
    else:
        query = """
            SELECT a.id, a.name, a.max_capacity,
            (a.max_capacity - (
                SELECT COUNT(*) FROM bookings b
                WHERE b.area_id = a.id AND NOW() BETWEEN b.start_time AND b.end_time
            )) AS available_capacity
            FROM parking_areas a
        """
        cursor.execute(query)
    areas = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    for area in areas:
        # Evita valori negativi in caso di sovrapposizioni.
        area['available_capacity'] = max(0, int(area['available_capacity']))
        
    return jsonify(areas)


@app.route('/api/areas/<area_id>/availability', methods=['GET'])
def get_area_availability(area_id):
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    start_time_raw = request.args.get('start_time')
    duration_minutes_raw = request.args.get('duration_minutes', 60)

    start_time = parse_start_time_value(start_time_raw)
    if start_time is None:
        return jsonify({"error": "Invalid start_time format. Use YYYY-MM-DDTHH:MM"}), 400

    duration_minutes = parse_duration_value(duration_minutes_raw)
    if duration_minutes is None:
        return jsonify({"error": "duration_minutes must be one of: 30, 60, 90"}), 400

    end_time = start_time + timedelta(minutes=duration_minutes)

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, max_capacity FROM parking_areas WHERE id = %s", (area_id,))
    area = cursor.fetchone()

    if not area:
        cursor.close()
        conn.close()
        return jsonify({"error": "Area not found"}), 404

    overlapping = get_overlapping_bookings_count(cursor, area_id, start_time, end_time)
    available_capacity = max(0, int(area['max_capacity']) - overlapping)

    cursor.close()
    conn.close()

    return jsonify({
        "area_id": area_id,
        "max_capacity": int(area['max_capacity']),
        "available_capacity": available_capacity,
        "start_time": start_time.strftime("%Y-%m-%dT%H:%M:%S"),
        "end_time": end_time.strftime("%Y-%m-%dT%H:%M:%S"),
        "duration_minutes": duration_minutes,
    })

@app.route('/api/bookings', methods=['POST'])
def create_booking():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.json or {}
    area_id = data.get('area_id')
    start_time_raw = data.get('start_time')
    duration_minutes_raw = data.get('duration_minutes', 60)
    
    if not area_id:
        return jsonify({"error": "area_id is required"}), 400

    # Valida e normalizza la durata richiesta.
    duration_minutes = parse_duration_value(duration_minutes_raw)
    if duration_minutes is None:
        return jsonify({"error": "duration_minutes must be one of: 30, 60, 90"}), 400

    # Accetta sia formato datetime-local che timestamp completo.
    if start_time_raw:
        start_time = parse_start_time_value(start_time_raw)
        if start_time is None:
            return jsonify({"error": "Invalid start_time format. Use YYYY-MM-DDTHH:MM"}), 400

        # Blocca prenotazioni nel passato (con tolleranza minima).
        if start_time < datetime.now() - timedelta(minutes=1):
            return jsonify({"error": "start_time cannot be in the past"}), 400
    else:
        start_time = datetime.now()

    end_time = start_time + timedelta(minutes=duration_minutes)

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    
    # Verifica capienza considerando solo prenotazioni che si sovrappongono all'intervallo richiesto.
    cursor.execute("""
        SELECT a.max_capacity,
        (
            SELECT COUNT(*)
            FROM bookings b
            WHERE b.area_id = a.id
            AND b.start_time < %s
            AND b.end_time > %s
        ) as active_bookings
        FROM parking_areas a WHERE a.id = %s
    """, (end_time, start_time, area_id))
    
    area_status = cursor.fetchone()
    
    if not area_status:
        cursor.close()
        conn.close()
        return jsonify({"error": "Area not found"}), 404
        
    if area_status['active_bookings'] >= area_status['max_capacity']:
        cursor.close()
        conn.close()
        return jsonify({"error": "Area is full"}), 400
    
    cursor.execute("""
        INSERT INTO bookings (user_id, area_id, start_time, end_time) 
        VALUES (%s, %s, %s, %s)
    """, (session['user_id'], area_id, start_time, end_time))
    
    conn.commit()
    booking_id = cursor.lastrowid
    
    cursor.close()
    conn.close()
    
    # Risposta con riepilogo della prenotazione appena creata.
    return jsonify({
        "message": "Booking successful",
        "booking": {
            "id": booking_id,
            "area_id": area_id,
            "duration_minutes": duration_minutes,
            "start_time": start_time.strftime("%Y-%m-%d %H:%M:%S"),
            "end_time": end_time.strftime("%Y-%m-%d %H:%M:%S")
        }
    }), 201

@app.route('/api/bookings/my_history', methods=['GET'])
def my_history():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    
    # Calcola lo stato direttamente in query in base all'ora corrente.
    cursor.execute("""
        SELECT b.id, b.area_id, a.name as area_name, b.start_time, b.end_time,
        CASE
            WHEN NOW() < b.start_time THEN 'Upcoming'
            WHEN NOW() BETWEEN b.start_time AND b.end_time THEN 'Active'
            ELSE 'Expired'
        END as status
        FROM bookings b
        JOIN parking_areas a ON b.area_id = a.id
        WHERE b.user_id = %s
        ORDER BY b.start_time DESC
    """, (session['user_id'],))
    history = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    # Serializza date/ore in formato locale senza timezone per evitare shift lato browser.
    serialized_history = []
    for booking in history:
        serialized_history.append({
            "id": booking['id'],
            "area_id": booking['area_id'],
            "area_name": booking['area_name'],
            "status": booking['status'],
            "start_time": booking['start_time'].strftime("%Y-%m-%dT%H:%M:%S"),
            "end_time": booking['end_time'].strftime("%Y-%m-%dT%H:%M:%S"),
        })

    return jsonify(serialized_history)

# =========== ENDPOINT AMMINISTRATORE ===========

# Controllo ruolo amministratore dalla sessione.
def is_admin():
    return session.get('role') == 'admin'

@app.route('/api/admin/areas', methods=['POST'])
def add_area():
    if not is_admin():
        return jsonify({"error": "Forbidden"}), 403
        
    data = request.json
    area_id = data.get('id')
    name = data.get('name', '')
    max_capacity = data.get('max_capacity')
    
    if not area_id or max_capacity is None:
        return jsonify({"error": "id and max_capacity are required"}), 400

    # Converte la capienza in intero prima dell'inserimento.
    try:
        max_capacity = int(max_capacity)
    except ValueError:
        return jsonify({"error": "max_capacity must be an integer"}), 400

    conn = get_db()
    cursor = conn.cursor()
    
    try:
        cursor.execute("INSERT INTO parking_areas (id, name, max_capacity) VALUES (%s, %s, %s)", (area_id, name, max_capacity))
        conn.commit()
        return jsonify({"message": "Area added successfully"}), 201
    except mysql.connector.IntegrityError:
        return jsonify({"error": "Area ID already exists"}), 400
    finally:
        cursor.close()
        conn.close()

@app.route('/api/admin/bookings', methods=['GET'])
def global_history():
    if not is_admin():
        return jsonify({"error": "Forbidden"}), 403

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    
    # Recupera tutte le prenotazioni con utente e area collegati.
    cursor.execute("""
        SELECT b.id, u.username, b.area_id, a.name as area_name, b.start_time, b.end_time 
        FROM bookings b
        JOIN users u ON b.user_id = u.id
        JOIN parking_areas a ON b.area_id = a.id
        ORDER BY b.start_time DESC
    """)
    history = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    return jsonify(history)

@app.route('/api/admin/areas/<area_id>/trends', methods=['GET'])
def area_trends(area_id):
    if not is_admin():
        return jsonify({"error": "Forbidden"}), 403

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    
    # Aggrega conteggi giornalieri degli ultimi 30 giorni per l'area selezionata.
    cursor.execute("""
        SELECT DATE(start_time) as booking_date, COUNT(*) as booking_count
        FROM bookings
        WHERE area_id = %s AND start_time >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
        GROUP BY DATE(start_time)
        ORDER BY booking_date ASC
    """, (area_id,))
    
    trends_raw = cursor.fetchall()
    cursor.close()
    conn.close()

    trend_dict = {row['booking_date'].strftime('%Y-%m-%d'): row['booking_count'] for row in trends_raw}
    
    # Completa i giorni senza prenotazioni con conteggio pari a 0.
    trends = []
    for i in range(29, -1, -1):
        d = datetime.now() - timedelta(days=i)
        d_str = d.strftime('%Y-%m-%d')
        trends.append({
            "date": d_str,
            "count": trend_dict.get(d_str, 0)
        })
        
    return jsonify(trends)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
