import pyodbc
import os
from dotenv import load_dotenv
import sys
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Get database configuration
DB_SERVER = os.getenv("DB_SERVER", ".\SQLEXPRESS")
DB_NAME = os.getenv("DB_NAME", "test")
DB_USER = os.getenv("DB_USER", "preet")
DB_PASSWORD = os.getenv("DB_PASSWORD", "preet")
DB_DRIVER = os.getenv("DB_DRIVER", "ODBC Driver 17 for SQL Server")

def fix_permissions_with_windows_auth():
    """
    Run SQL commands to fix permissions using Windows Authentication
    """
    try:
        # Connect to SQL Server using Windows Authentication
        conn_str = f"DRIVER={{{DB_DRIVER}}};SERVER={DB_SERVER};DATABASE=master;Trusted_Connection=yes"
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        logger.info(f"Connected to SQL Server {DB_SERVER} using Windows Authentication")
        logger.info(f"Fixing permissions for user {DB_USER} on database {DB_NAME}")
        
        # 1. Ensure the login exists
        check_login_sql = f"SELECT name FROM sys.server_principals WHERE name = '{DB_USER}'"
        cursor.execute(check_login_sql)
        if not cursor.fetchone():
            logger.info(f"Creating login {DB_USER}")
            create_login_sql = f"CREATE LOGIN [{DB_USER}] WITH PASSWORD = '{DB_PASSWORD}'"
            cursor.execute(create_login_sql)
        else:
            logger.info(f"Login {DB_USER} already exists")
        
        # 2. Switch to the target database
        cursor.execute(f"USE [{DB_NAME}]")
        
        # 3. Ensure the database user exists
        check_user_sql = f"SELECT name FROM sys.database_principals WHERE name = '{DB_USER}'"
        cursor.execute(check_user_sql)
        if not cursor.fetchone():
            logger.info(f"Creating database user {DB_USER}")
            create_user_sql = f"CREATE USER [{DB_USER}] FOR LOGIN [{DB_USER}]"
            cursor.execute(create_user_sql)
        else:
            logger.info(f"Database user {DB_USER} already exists")
        
        # 4. Add user to database roles
        role_sql = f"""
        IF IS_ROLEMEMBER('db_owner', '{DB_USER}') = 0
        BEGIN
            EXEC sp_addrolemember 'db_owner', '{DB_USER}'
            PRINT 'Added {DB_USER} to db_owner role'
        END
        """
        cursor.execute(role_sql)
        
        # 5. Grant explicit permissions on the schema
        schema_sql = f"GRANT CONTROL ON SCHEMA::dbo TO [{DB_USER}]"
        cursor.execute(schema_sql)
        
        # 6. Grant explicit permissions on all tables
        tables_sql = """
        SELECT name FROM sys.tables WHERE schema_id = SCHEMA_ID('dbo')
        """
        cursor.execute(tables_sql)
        tables = [row[0] for row in cursor.fetchall()]
        
        for table in tables:
            logger.info(f"Granting permissions on table {table}")
            perm_sql = f"""
            GRANT SELECT, INSERT, UPDATE, DELETE ON [dbo].[{table}] TO [{DB_USER}]
            """
            cursor.execute(perm_sql)
        
        # 7. Verify permissions
        logger.info("Verifying permissions...")
        verify_sql = f"""
        SELECT 
            p.name AS [User],
            o.name AS [Table],
            p.type_desc AS [PrincipalType],
            perm.permission_name AS [Permission],
            perm.state_desc AS [State]
        FROM sys.database_permissions perm
        JOIN sys.objects o ON perm.major_id = o.object_id AND o.type_desc = 'USER_TABLE'
        JOIN sys.database_principals p ON perm.grantee_principal_id = p.principal_id
        WHERE p.name = '{DB_USER}'
        ORDER BY o.name, perm.permission_name
        """
        cursor.execute(verify_sql)
        rows = cursor.fetchall()
        
        if rows:
            logger.info("Current permissions:")
            for row in rows:
                logger.info(f"User: {row[0]}, Table: {row[1]}, Type: {row[2]}, Permission: {row[3]}, State: {row[4]}")
        else:
            logger.warning(f"No explicit permissions found for user {DB_USER}")
        
        # 8. Commit changes and close connection
        conn.commit()
        cursor.close()
        conn.close()
        
        logger.info("SQL permissions fix completed successfully!")
        
    except Exception as e:
        logger.error(f"Error fixing permissions: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    fix_permissions_with_windows_auth()
    logger.info("\nNext steps:")
    logger.info("1. Restart your backend server")
    logger.info("2. Try the application again with SQL Authentication")
    logger.info("3. If issues persist, check the SQL Server error logs") 