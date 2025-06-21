@echo off
echo Running SQL Server Permission Fix Script...
python fix_sql_permissions.py
echo.
echo If the script ran successfully, try starting the backend server:
echo uvicorn main:app --reload
echo.
pause 