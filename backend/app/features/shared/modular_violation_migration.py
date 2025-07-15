"""
Modular Violation Migration Script

This script ensures that all features have their own independent violation tables
and are completely modular without depending on the global violation system.

Usage:
    python -m app.features.shared.modular_violation_migration
"""

import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class ModularViolationMigration:
    """Migration class to ensure modular violation tables exist"""
    
    # List of all feature violation tables that should exist
    FEATURE_VIOLATION_TABLES = [
        "lighting_violations",
        "gaze_violations", 
        "audio_violations",
        "keyboard_shortcut_violations",
        "tab_switching_violations",
        "window_blur_violations",
        "fullscreen_exit_violations",
        "multiple_faces_violations",
        "camera_permission_violations",
        "microphone_permission_violations",
        "browser_compatibility_logs",
        "proctor_permission_logs"
    ]
    
    @staticmethod
    def create_feature_violation_tables(engine):
        """Create violation tables for all features if they don't exist"""
        try:
            with engine.connect() as connection:
                for table_name in ModularViolationMigration.FEATURE_VIOLATION_TABLES:
                    # Check if table exists
                    check_table_sql = text(f"""
                        SELECT name FROM sqlite_master 
                        WHERE type='table' AND name='{table_name}'
                    """)
                    
                    result = connection.execute(check_table_sql)
                    table_exists = result.fetchone() is not None
                    
                    if not table_exists:
                        logger.info(f"Creating modular violation table: {table_name}")
                        
                        # Create the table with standard violation fields
                        create_table_sql = text(f"""
                            CREATE TABLE {table_name} (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                session_id INTEGER NOT NULL,
                                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                                violation_type VARCHAR(50) NOT NULL,
                                details TEXT,
                                filepath VARCHAR(500),
                                additional_info TEXT
                            )
                        """)
                        
                        connection.execute(create_table_sql)
                        connection.commit()
                        logger.info(f"Successfully created table: {table_name}")
                    else:
                        logger.info(f"Table already exists: {table_name}")
                        
        except Exception as e:
            logger.error(f"Error creating feature violation tables: {str(e)}")
            raise
    
    @staticmethod
    def verify_modular_violation_system(engine):
        """Verify that all features have their own violation tables"""
        try:
            with engine.connect() as connection:
                missing_tables = []
                
                for table_name in ModularViolationMigration.FEATURE_VIOLATION_TABLES:
                    check_table_sql = text(f"""
                        SELECT name FROM sqlite_master 
                        WHERE type='table' AND name='{table_name}'
                    """)
                    
                    result = connection.execute(check_table_sql)
                    table_exists = result.fetchone() is not None
                    
                    if not table_exists:
                        missing_tables.append(table_name)
                
                if missing_tables:
                    logger.warning(f"Missing modular violation tables: {missing_tables}")
                    return False
                else:
                    logger.info("All modular violation tables exist")
                    return True
                    
        except Exception as e:
            logger.error(f"Error verifying modular violation system: {str(e)}")
            return False
    
    @staticmethod
    def migrate_global_violations_to_modular(engine):
        """Migrate any existing global violations to modular feature-specific tables"""
        try:
            with engine.connect() as connection:
                # Check if global violations table exists
                check_global_sql = text("""
                    SELECT name FROM sqlite_master 
                    WHERE type='table' AND name='violations'
                """)
                
                result = connection.execute(check_global_sql)
                global_table_exists = result.fetchone() is not None
                
                if global_table_exists:
                    logger.info("Global violations table found, checking for migration...")
                    
                    # Get all violations from global table
                    get_violations_sql = text("""
                        SELECT session_id, violation_type, details, filepath, timestamp
                        FROM violations
                    """)
                    
                    violations = connection.execute(get_violations_sql).fetchall()
                    
                    for violation in violations:
                        session_id, violation_type, details, filepath, timestamp = violation
                        
                        # Map global violation types to modular tables
                        table_mapping = {
                            'lighting_issue': 'lighting_violations',
                            'gaze_away': 'gaze_violations',
                            'audio_suspicious': 'audio_violations',
                            'keyboard_shortcut': 'keyboard_shortcut_violations',
                            'tab_switch': 'tab_switching_violations',
                            'window_blur': 'window_blur_violations',
                            'fullscreen_exit': 'fullscreen_exit_violations',
                            'multiple_faces': 'multiple_faces_violations',
                            'camera_permission_denied': 'camera_permission_violations',
                            'microphone_permission_denied': 'microphone_permission_violations',
                            'browser_compatibility_issue': 'browser_compatibility_logs'
                        }
                        
                        if violation_type in table_mapping:
                            target_table = table_mapping[violation_type]
                            
                            # Insert into modular table
                            insert_sql = text(f"""
                                INSERT INTO {target_table} 
                                (session_id, violation_type, details, filepath, timestamp)
                                VALUES (?, ?, ?, ?, ?)
                            """)
                            
                            connection.execute(insert_sql, 
                                (session_id, violation_type, details, filepath, timestamp))
                    
                    connection.commit()
                    logger.info(f"Migrated {len(violations)} violations to modular tables")
                    
        except Exception as e:
            logger.error(f"Error migrating global violations: {str(e)}")
            raise

def run_modular_violation_migration():
    """Run the complete modular violation migration"""
    try:
        # Import database engine
        from app.database import engine
        
        logger.info("Starting modular violation migration...")
        
        # Create feature violation tables
        ModularViolationMigration.create_feature_violation_tables(engine)
        
        # Verify modular system
        ModularViolationMigration.verify_modular_violation_system(engine)
        
        # Migrate any existing global violations
        ModularViolationMigration.migrate_global_violations_to_modular(engine)
        
        logger.info("Modular violation migration completed successfully!")
        
    except Exception as e:
        logger.error(f"Error in modular violation migration: {str(e)}")
        raise

if __name__ == "__main__":
    run_modular_violation_migration() 