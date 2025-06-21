from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import DB_SERVER, DB_NAME, DB_USER, DB_PASSWORD, DB_DRIVER, DB_TRUSTED_CONNECTION
import urllib.parse
import logging
from fastapi import HTTPException

# Set up logging
logger = logging.getLogger(__name__)

# Create the connection string
# For SQL Server Authentication
params = urllib.parse.quote_plus(f"DRIVER={{{DB_DRIVER}}};SERVER={DB_SERVER};DATABASE={DB_NAME};UID={DB_USER};PWD={DB_PASSWORD};Trusted_Connection=no")
SQLALCHEMY_DATABASE_URL = f"mssql+pyodbc:///?odbc_connect={params}"
logger.warning(f"Using SQL Authentication with user '{DB_USER}' to connect to {DB_SERVER}, database: {DB_NAME}")

# Create a Base class
Base = declarative_base()

# Initialize these variables
engine = None
SessionLocal = None

try:
    # Create the SQLAlchemy engine
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, 
        echo=False,  # Set to False to reduce output
        pool_pre_ping=True,
        connect_args={"connect_timeout": 5}  # Add timeout
    )
    
    # Create a SessionLocal class
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    # Print success message
    logger.warning(f"Database connection established successfully to {DB_SERVER}")
    
except Exception as e:
    logger.error(f"Error connecting to database: {e}")
    # Create a dummy engine and session for testing
    from sqlalchemy import create_engine
    engine = create_engine("sqlite:///:memory:")
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    logger.warning("Using in-memory SQLite database as fallback")

# Dependency to get the database session
def get_db():
    if SessionLocal is None:
        # If no session is available, raise a clear error
        logger.error("No database session available")
        raise HTTPException(status_code=503, detail="Database service unavailable")
        
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        # Log the error
        logger.error(f"Database session error: {e}")
        # Re-raise the exception to prevent FastAPI from swallowing it
        raise
    finally:
        # Always close the session
        db.close()

# Function to recreate all tables
def recreate_all_tables():
    if engine is None:
        logger.error("Cannot recreate tables: No database engine available")
        return
        
    try:
        logger.warning("Dropping all tables...")
        Base.metadata.drop_all(bind=engine)
        logger.warning("Creating all tables...")
        Base.metadata.create_all(bind=engine)
        logger.warning("Tables recreated successfully!")
    except Exception as e:
        logger.error(f"Error recreating tables: {e}")

# Function to migrate from old schema to new schema
def migrate_to_test_id_primary_key():
    """
    Migrates the database from the old schema (with separate id and test_id) to the new schema
    where test_id is the primary key. This function should be run once during the migration.
    """
    if engine is None:
        logger.error("Cannot migrate: No database engine available")
        return
        
    try:
        logger.warning("Starting migration to test_id as primary key...")
        
        # Create a connection and transaction
        conn = engine.connect()
        trans = conn.begin()
        
        try:
            # Step 1: Get all tests and their associated data
            result = conn.execute("SELECT id, test_id, skill, num_questions, duration, created_by, created_at FROM tests")
            tests = [dict(row) for row in result]
            logger.info(f"Found {len(tests)} tests to migrate")
            
            # Step 2: Update foreign keys in other tables to reference test_id instead of id
            if len(tests) > 0:
                for test in tests:
                    old_id = test['id']
                    new_id = test['test_id']
                    
                    # Update foreign keys in questions table
                    conn.execute(f"UPDATE questions SET test_id = {new_id} WHERE test_id = {old_id}")
                    
                    # Update foreign keys in test_sessions table
                    conn.execute(f"UPDATE test_sessions SET test_id = {new_id} WHERE test_id = {old_id}")
                    
                    logger.info(f"Migrated references for test id={old_id} to test_id={new_id}")
            
            # Step 3: Recreate the tests table with test_id as primary key
            logger.warning("Recreating tests table with test_id as primary key...")
            
            # Create a backup of the tests table
            conn.execute("SELECT * INTO tests_backup FROM tests")
            
            # Drop constraints referencing the tests table
            conn.execute("ALTER TABLE questions DROP CONSTRAINT IF EXISTS FK__questions__test___4CA06362")
            conn.execute("ALTER TABLE test_sessions DROP CONSTRAINT IF EXISTS FK__test_sess__test___5DCAEF64")
            
            # Drop the old tests table
            conn.execute("DROP TABLE tests")
            
            # Create the new tests table with test_id as primary key
            conn.execute("""
                CREATE TABLE tests (
                    test_id INT PRIMARY KEY,
                    skill NVARCHAR(100) NOT NULL,
                    num_questions INT NOT NULL,
                    duration INT NOT NULL,
                    created_by INT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Restore data from backup
            conn.execute("""
                INSERT INTO tests (test_id, skill, num_questions, duration, created_by, created_at)
                SELECT test_id, skill, num_questions, duration, created_by, created_at 
                FROM tests_backup
            """)
            
            # Recreate foreign key constraints to reference test_id
            conn.execute("""
                ALTER TABLE questions 
                ADD CONSTRAINT FK__questions__test_id 
                FOREIGN KEY (test_id) REFERENCES tests(test_id)
            """)
            
            conn.execute("""
                ALTER TABLE test_sessions 
                ADD CONSTRAINT FK__test_sessions__test_id 
                FOREIGN KEY (test_id) REFERENCES tests(test_id)
            """)
            
            # Drop the backup table
            conn.execute("DROP TABLE tests_backup")
            
            # Commit the transaction
            trans.commit()
            logger.warning("Migration completed successfully!")
            
        except Exception as e:
            # Roll back the transaction if any step fails
            trans.rollback()
            logger.error(f"Migration failed: {e}")
            raise
        finally:
            # Close the connection
            conn.close()
            
    except Exception as e:
        logger.error(f"Migration error: {e}")

def create_default_admin():
    """Create a default admin user if no users exist in the database"""
    logger.info("Checking for default admin user")
    
    try:
        # Import User model here to avoid circular imports
        from app.models.user import User
        
        db = SessionLocal()
        # Check if any users exist
        user_count = db.query(User).count()
        
        if user_count == 0:
            logger.info("No users found, creating default admin user")
            admin_user = User(
                name="Admin",
                email="admin@example.com",
                role="admin"
            )
            db.add(admin_user)
            db.commit()
            logger.info(f"Created default admin user with ID: {admin_user.id}")
        else:
            logger.info(f"Found {user_count} existing users, no need to create default admin")
    except Exception as e:
        logger.error(f"Error creating default admin user: {str(e)}")
    finally:
        db.close() 