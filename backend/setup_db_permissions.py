import pyodbc
import os
from dotenv import load_dotenv
import sys

# Load environment variables
load_dotenv()

DB_SERVER = os.getenv("DB_SERVER", ".\SQLEXPRESS")
DB_NAME = os.getenv("DB_NAME", "test")
DB_USER = os.getenv("DB_USER", "preet")
DB_PASSWORD = os.getenv("DB_PASSWORD", "preet")

# SQL script to run
SQL_SCRIPT = f"""
USE {DB_NAME};

-- First, let's create or check if the login exists
IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = '{DB_USER}')
BEGIN
    CREATE LOGIN {DB_USER} WITH PASSWORD = '{DB_PASSWORD}';
    PRINT 'Created login {DB_USER}';
END
ELSE
BEGIN
    PRINT 'Login {DB_USER} already exists';
END

-- Now create or check if the user exists in the database
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = '{DB_USER}')
BEGIN
    CREATE USER {DB_USER} FOR LOGIN {DB_USER};
    PRINT 'Created database user {DB_USER}';
END
ELSE
BEGIN
    PRINT 'Database user {DB_USER} already exists';
END

-- Grant the user db_owner role (this gives full permissions on the database)
EXEC sp_addrolemember 'db_owner', '{DB_USER}';
PRINT 'Added {DB_USER} to db_owner role';

-- Additionally, explicitly grant specific permissions to ensure everything works
GRANT CONTROL ON SCHEMA::dbo TO {DB_USER};
PRINT 'Granted CONTROL permission on schema dbo to {DB_USER}';

-- Grant permissions for each table
DECLARE @sql NVARCHAR(MAX) = '';
SELECT @sql = @sql + 'GRANT SELECT, INSERT, UPDATE, DELETE ON ' + QUOTENAME(s.name) + '.' + QUOTENAME(t.name) + ' TO {DB_USER};' + CHAR(13)
FROM sys.tables t
JOIN sys.schemas s ON t.schema_id = s.schema_id
WHERE s.name = 'dbo';

EXEC sp_executesql @sql;
PRINT 'Granted permissions on all tables to {DB_USER}';
"""

def run_sql_script_with_windows_auth():
    """Run the SQL script using Windows Authentication"""
    try:
        # Connect to SQL Server using Windows Authentication
        conn_str = f"DRIVER={{ODBC Driver 17 for SQL Server}};SERVER={DB_SERVER};DATABASE=master;Trusted_Connection=yes"
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        print(f"Connected to SQL Server {DB_SERVER} using Windows Authentication")
        print(f"Running script to set up permissions for {DB_USER} on database {DB_NAME}")
        
        # Execute the SQL script
        for statement in SQL_SCRIPT.split("GO"):
            if statement.strip():
                cursor.execute(statement)
        
        # Commit changes and close connection
        conn.commit()
        cursor.close()
        conn.close()
        
        print("SQL script executed successfully!")
        print(f"User {DB_USER} should now have all necessary permissions on {DB_NAME}")
        
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    run_sql_script_with_windows_auth()
    print("\nNext steps:")
    print("1. Restart your backend server")
    print("2. Try the application again with SQL Authentication")
    print("3. If issues persist, check the logs for detailed error messages") 