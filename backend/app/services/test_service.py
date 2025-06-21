from sqlalchemy.orm import Session
from ..models.test import Test
from ..models.question import Question
from ..models.option import Option
from ..schemas.test import TestCreate, TestUpdate
from datetime import datetime
from typing import List, Optional
import logging

# Set up logging
logger = logging.getLogger(__name__)

class TestService:
    @staticmethod
    def create_test(db: Session, test: TestCreate):
        if db is None:
            logger.error("Database session is None in create_test")
            raise ValueError("Database session is not available")
            
        try:
            # Check if test with given test_id already exists
            existing_test = db.query(Test).filter(Test.test_id == test.test_id).first()
            if existing_test:
                logger.warning(f"Test with test_id {test.test_id} already exists")
                return existing_test
            
            logger.info(f"Creating new test with test_id: {test.test_id}, skill: {test.skill}")
            db_test = Test(
                test_id=test.test_id,
                skill=test.skill,
                num_questions=test.num_questions,
                duration=test.duration,
                created_by=test.created_by
            )
            db.add(db_test)
            db.commit()
            db.refresh(db_test)
            logger.info(f"Successfully created test with test_id: {db_test.test_id}")
            return db_test
        except Exception as e:
            logger.error(f"Error creating test: {str(e)}")
            db.rollback()
            raise
    
    @staticmethod
    def get_tests(db: Session, skip: int = 0, limit: int = 100):
        if db is None:
            logger.error("Database session is None in get_tests")
            raise ValueError("Database session is not available")
            
        try:
            # Order by test_id for consistency
            return db.query(Test).order_by(Test.test_id).offset(skip).limit(limit).all()
        except Exception as e:
            logger.error(f"Error in get_tests: {str(e)}")
            raise
    
    @staticmethod
    def get_test_by_test_id(db: Session, test_id: int):
        if db is None:
            logger.error("Database session is None in get_test_by_test_id")
            raise ValueError("Database session is not available")
            
        try:
            return db.query(Test).filter(Test.test_id == test_id).first()
        except Exception as e:
            logger.error(f"Error in get_test_by_test_id: {str(e)}")
            raise
    
    @staticmethod
    def get_test_by_uuid(db: Session, test_uuid: str):
        """Get a test by its test_id field when it's a string/UUID or integer"""
        if db is None:
            logger.error("Database session is None in get_test_by_uuid")
            raise ValueError("Database session is not available")
            
        try:
            logger.info(f"Looking for test with ID: {test_uuid}")
            
            # Convert to integer if possible (since we're using integers not UUIDs)
            test_id = test_uuid
            try:
                if isinstance(test_uuid, str) and test_uuid.isdigit():
                    test_id = int(test_uuid)
                    logger.info(f"Converted string test_id '{test_uuid}' to integer: {test_id}")
            except (ValueError, TypeError) as e:
                logger.warning(f"Could not convert test_id to integer: {str(e)}")
                
            # Query for the test
            result = db.query(Test).filter(Test.test_id == test_id).first()
            
            if result:
                logger.info(f"Found test with test_id {test_id}")
            else:
                logger.warning(f"No test found with test_id {test_id}")
            return result
        except Exception as e:
            logger.error(f"Error in get_test_by_uuid: {str(e)}")
            raise
    
    @staticmethod
    def update_test(db: Session, test_id: int, test_update: TestUpdate):
        if db is None:
            logger.error("Database session is None in update_test")
            raise ValueError("Database session is not available")
            
        try:
            db_test = TestService.get_test_by_test_id(db, test_id)
            if db_test:
                update_data = test_update.dict(exclude_unset=True)
                for key, value in update_data.items():
                    setattr(db_test, key, value)
                db.commit()
                db.refresh(db_test)
            return db_test
        except Exception as e:
            logger.error(f"Error in update_test: {str(e)}")
            db.rollback()
            raise
    
    @staticmethod
    def delete_test(db: Session, test_id: int):
        if db is None:
            logger.error("Database session is None in delete_test")
            raise ValueError("Database session is not available")
            
        try:
            db_test = TestService.get_test_by_test_id(db, test_id)
            if db_test:
                # First delete all associated sessions for this test
                from .test_session_service import TestSessionService
                try:
                    deleted_sessions = TestSessionService.delete_sessions_by_test(db, test_id)
                    logger.info(f"Deleted {deleted_sessions} sessions for test {test_id}")
                except Exception as e:
                    logger.warning(f"Failed to delete sessions for test {test_id}: {str(e)}")
                
                # Then delete the test itself
                db.delete(db_test)
                db.commit()
                logger.info(f"Successfully deleted test {test_id} and all associated data")
                return True
            return False
        except Exception as e:
            logger.error(f"Error in delete_test: {str(e)}")
            db.rollback()
            raise 