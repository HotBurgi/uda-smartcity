# UDA STEM - Smart City Parking

This is a prototype web application for the smart management of city parking, developed for the Municipality of Brescia.

## Application Architecture
- **Database**: MySQL 8
- **Backend API**: Python 3 / Flask
- **Frontend App**: React / Vite (ES Modules)

## Features
- **User Role**: View available parking areas in real-time, book a spot for 1 hour, view personal history.
- **Admin Role**: Create new parking areas, view total booking history, analyze 30-day booking trends using interactive charts.
- **Premium UI**: The application features a custom, pure CSS dark-themed glassmorphism interface.

## Prerequisites
- Docker
- Docker Compose

## How to Launch the Application

1. Make sure you are in the root directory where `docker-compose.yml` is located.
2. Build and start the containers in detached mode:
   ```bash
   docker compose up --build -d
   ```
3. Initialize the database schema and seed the initial users by running the init HTTP request or simply triggering via curl (Windows CMD/Powershell or macOS/Linux Terminal):
   ```bash
   curl -X POST http://localhost:5001/api/init_db
   ```
   > You should receive a `"Database initialized successfully"` JSON response.

### Accessing the application
- **Frontend App**: [http://localhost:3000](http://localhost:3000)
- **Backend API Server**: [http://localhost:5001](http://localhost:5001)
- **phpMyAdmin (DB access)**: [http://localhost:8080](http://localhost:8080)

### Initial Credentials
The database initialization script seeds two default accounts you can use to test the application immediately:
- **Admin user**: `admin` / Password: `admin_password`
- **Standard user**: `user1` / Password: `user1_password`

## How to Test the API Backend
A standard `.http` file is provided in the `backend/tests.http` file. You can test the application using tools like:
- **VSCode REST Client**: Install the extension and click the `Send Request` buttons above the definitions inside `backend/tests.http`.
- **IntelliJ Idea / PyCharm**: Native HTTP client support.
- **Postman or curl**: You can manually port the routes detailed in the tests files.

---

### Terminating the application
To securely stop the application, from the root folder run:
```bash
docker compose down
```
