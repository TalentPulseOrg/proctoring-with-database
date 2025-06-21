@echo off
echo Starting the project...

:: Start Backend server
start cmd /k "cd backend && python -m venv venv && venv\Scripts\activate && pip install -r requirements.txt && python main.py"

:: Start Frontend development server
start cmd /k "cd frontend && npm install && npm run dev"

echo Both servers are starting...
echo Backend: http://localhost:8000
echo Frontend: http://localhost:5173/db-test 