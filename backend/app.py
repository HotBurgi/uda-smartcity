import os
from datetime import datetime, timedelta
from flask import Flask, jsonify, request, session
from flask_cors import CORS
import mysql.connector
from mysql.connector import pooling
import hashlib

app = Flask(__name__)
app.secret_key = 'super_secret_smartcity_key'  # Used for session cookies
CORS(app, supports_credentials=True, origins=["http://localhost:3000", "http://127.0.0.1:3000"])

DB_HOST = os.environ.get('DB_HOST', 'localhost')
DB_USER = os.environ.get('DB_USER', 'root')
DB_PASS = os.environ.get('DB_PASS', 'root')
DB_NAME = os.environ.get('DB_NAME', 'smartcity')

# Keep pool None init delay since Docker dependencies might start simultaneously
pool = None

def get_db():
    global pool
    if pool is None:
        try:
            pool = mysql.connector.pooling.MySQLConnectionPool(
                pool_name="mypool",
                pool_size=5,
                host=DB_HOST,
                user=DB_USER,
                password=DB_PASS,
                database=DB_NAME,
                # Try creating database if it doesn't exist
            )
        except Exception as e:
            # Fallback to single connection if pool fails or DB not created yet
            return mysql.connector.connect(
                host=DB_HOST,
                user=DB_USER,
                password=DB_PASS,
                database=DB_NAME
            )
    return pool.get_connection()

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

@app.route('/api/init_db', methods=['POST'])
def init_db():
    try:
        # First ensure DB exists
        conn_setup = mysql.connector.connect(
            host=DB_HOST, user=DB_USER, password=DB_PASS
        )
        csetup = conn_setup.cursor()
        csetup.execute(f"CREATE DATABASE IF NOT EXISTS {DB_NAME}")
        csetup.close()
        conn_setup.close()

        conn = get_db()
        cursor = conn.cursor()
        
        with open('schema.sql', 'r') as f:
            schema_sql = f.read()
        
        for statement in schema_sql.split(';'):
            if statement.strip():
                cursor.execute(statement)

        cursor.execute("SELECT COUNT(*) FROM users")
        if cursor.fetchone()[0] == 0:
            admin_pw = hash_password('admin')
            user_pw = hash_password('user1')
            cursor.execute("INSERT INTO users (username, password, role) VALUES (%s, %s, %s)", ('admin', admin_pw, 'admin'))
            cursor.execute("INSERT INTO users (username, password, role) VALUES (%s, %s, %s)", ('user1', user_pw, 'user'))
            conn.commit()

        return jsonify({"message": "Database initialized successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals() and conn.is_connected():
            conn.close()

# =========== AUTHENTICATION ===========

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
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
    session.clear()
    return jsonify({"message": "Logged out successfully"})

@app.route('/api/me', methods=['GET'])
def get_me():
    if 'user_id' in session:
        return jsonify({
            "id": session['user_id'],
            "username": session['username'],
            "role": session['role']
        })
    return jsonify({"error": "Not authenticated"}), 401

# =========== USER ENDPOINTS ===========

@app.route('/api/areas', methods=['GET'])
def get_areas():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    
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
        # Avoid negative numbers nicely
        area['available_capacity'] = max(0, int(area['available_capacity']))
        
    return jsonify(areas)

@app.route('/api/bookings', methods=['POST'])
def create_booking():
    if 'user_id' not in session:
        return jsonify({"error": "Unauthorized"}), 401
        
    data = request.json
    area_id = data.get('area_id')
    
    if not area_id:
        return jsonify({"error": "area_id is required"}), 400

    conn = get_db()
    cursor = conn.cursor(dictionary=True)
    
    cursor.execute("""
        SELECT a.max_capacity,
        (SELECT COUNT(*) FROM bookings b WHERE b.area_id = a.id AND NOW() BETWEEN b.start_time AND b.end_time) as active_bookings
        FROM parking_areas a WHERE a.id = %s
    """, (area_id,))
    
    area_status = cursor.fetchone()
    
    if not area_status:
        cursor.close()
        conn.close()
        return jsonify({"error": "Area not found"}), 404
        
    if area_status['active_bookings'] >= area_status['max_capacity']:
        cursor.close()
        conn.close()
        return jsonify({"error": "Area is full"}), 400

    start_time = datetime.now()
    end_time = start_time + timedelta(hours=1)
    
    cursor.execute("""
        INSERT INTO bookings (user_id, area_id, start_time, end_time) 
        VALUES (%s, %s, %s, %s)
    """, (session['user_id'], area_id, start_time, end_time))
    
    conn.commit()
    booking_id = cursor.lastrowid
    
    cursor.close()
    conn.close()
    
    return jsonify({
        "message": "Booking successful",
        "booking": {
            "id": booking_id,
            "area_id": area_id,
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
    
    cursor.execute("""
        SELECT b.id, b.area_id, a.name as area_name, b.start_time, b.end_time,
        IF(NOW() BETWEEN b.start_time AND b.end_time, 'Active', 'Expired') as status
        FROM bookings b
        JOIN parking_areas a ON b.area_id = a.id
        WHERE b.user_id = %s
        ORDER BY b.start_time DESC
    """, (session['user_id'],))
    history = cursor.fetchall()
    
    cursor.close()
    conn.close()
    
    return jsonify(history)

# =========== ADMIN ENDPOINTS ===========

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
