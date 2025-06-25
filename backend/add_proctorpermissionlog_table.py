import pyodbc
import os
from app.config import DB_SERVER, DB_NAME, DB_USER, DB_PASSWORD, DB_DRIVER
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def add_proctorpermissionlog_table():
    """Add the proctorpermissionlog table to the database"""
    
    # Read the SQL file
    sql_file_path = os.path.join(os.path.dirname(__file__), 'add_proctorpermissionlog_table.sql')
    
    try:
        with open(sql_file_path, 'r') as file:
            sql_script = file.read()
    except FileNotFoundError:
        logger.error(f"SQL file not found: {sql_file_path}")
        return False
    
    # Create connection string
    conn_str = f"DRIVER={{{DB_DRIVER}}};SERVER={DB_SERVER};DATABASE={DB_NAME};UID={DB_USER};PWD={DB_PASSWORD};Trusted_Connection=no"
    
    try:
        # Connect to database
        conn = pyodbc.connect(conn_str)
        cursor = conn.cursor()
        
        logger.info("Connected to database successfully")
        
        # Check if table already exists
        cursor.execute("""
            SELECT COUNT(*) 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME = 'proctorpermissionlog'
        """)
        
        table_exists = cursor.fetchone()[0] > 0
        
        if table_exists:
            logger.warning("Table 'proctorpermissionlog' already exists. Skipping creation.")
            return True
        
        # Execute the SQL script
        logger.info("Creating proctorpermissionlog table...")
        
        # Split the script into individual statements
        statements = [stmt.strip() for stmt in sql_script.split(';') if stmt.strip()]
        
        for statement in statements:
            if statement:
                logger.info(f"Executing: {statement[:50]}...")
                cursor.execute(statement)
        
        # Commit the changes
        conn.commit()
        
        logger.info("proctorpermissionlog table created successfully!")
        
        # Verify the table was created
        cursor.execute("""
            SELECT COUNT(*) 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_NAME = 'proctorpermissionlog'
        """)
        
        table_created = cursor.fetchone()[0] > 0
        
        if table_created:
            logger.info("Table verification successful!")
        else:
            logger.error("Table verification failed!")
            return False
        
        return True
        
    except Exception as e:
        logger.error(f"Error creating table: {e}")
        return False
    finally:
        if 'conn' in locals():
            conn.close()
            logger.info("Database connection closed")

if __name__ == "__main__":
    success = add_proctorpermissionlog_table()
    if success:
        print("✅ proctorpermissionlog table created successfully!")
    else:
        print("❌ Failed to create proctorpermissionlog table!") 