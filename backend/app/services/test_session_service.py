from sqlalchemy.orm import Session
from sqlalchemy import text
from ..models.test_session import TestSession
from ..models.test import Test
from ..models.question import Question
from ..models.option import Option
from ..models.user import User
from ..models.user_response import UserResponse
from ..schemas.test_session import TestSessionCreate, TestSessionUpdate, TestSessionSubmit
from datetime import datetime, timedelta
import pytz
from typing import List, Dict, Any
import logging
import time
from ..services.screenshot import screenshot_service
from ..utils.file_cleanup import cleanup_session_files, cleanup_all_session_files

# Set up logging
logger = logging.getLogger(__name__)

# Define IST timezone
IST = pytz.timezone('Asia/Kolkata')

class TestSessionService:
    @staticmethod
    def create_session(db: Session, session: TestSessionCreate):
        if db is None:
            logger.error("Database session is None in create_session")
            raise ValueError("Database session is not available")
            
        try:
            # Log the incoming session data
            logger.info(f"Creating new test session with data: test_id={session.test_id}, user_id={session.user_id}, user_name={session.user_name}, user_email={session.user_email}")
            
            # Verify that the test exists
            test = db.query(Test).filter(Test.test_id == session.test_id).first()
            if not test:
                logger.error(f"No test found for test_id {session.test_id}")
                raise ValueError(f"Test with ID {session.test_id} not found in database")
            
            logger.info(f"Found test: Test ID={test.test_id}, Skill={test.skill}")
            
            # User email is required
            user_email = session.user_email
            if not user_email:
                logger.error("No user_email provided in session creation request")
                raise ValueError("user_email is required to create a session")
                
            # ALWAYS lookup user by email first - this is the primary identifier
            user = db.query(User).filter(User.email == user_email).first()
            
            if user:
                # Found existing user - use their information from the database
                user_id = user.id
                user_name = user.name
                logger.info(f"FOUND EXISTING USER: ID={user_id}, Name={user_name}, Email={user_email}")
            else:
                # User doesn't exist - create a new one
                user_name = session.user_name
                if not user_name:
                    logger.error(f"User not found and no user_name provided")
                    raise ValueError(f"User not found. Please provide user_name to create a new user.")
                
                logger.info(f"Creating new user: Name={user_name}, Email={user_email}")
                user = User(
                    name=user_name,
                    email=user_email,
                    role="candidate"
                )
                db.add(user)
                db.flush()  # Get the ID without committing
                user_id = user.id
                logger.info(f"Created new user with ID: {user_id}")
            
            # Create the test session with correct user data from database
            # Use IST timezone for start_time
            current_time = datetime.now(IST)
            db_session = TestSession(
                test_id=session.test_id,      # Foreign key to tests table (test_id)
                user_id=user_id,              # Foreign key to users table - ALWAYS use ID from database  
                user_name=user_name,          # Store user name from database
                user_email=user_email,        # Store user email
                start_time=current_time,      # Current timestamp in IST
                status="in_progress",         # Initial status
                end_time=None,               # Will be set on completion
                score=None,                  # Will be set on completion
                total_questions=None,        # Will be set on completion
                percentage=None              # Will be set on completion
            )
            
            logger.info(f"Creating session: test_id={session.test_id}, user_id={user_id}, user_name={user_name}")
            db.add(db_session)
            db.commit()
            db.refresh(db_session)
            
            logger.info(f"Successfully created test session with ID: {db_session.id}")
            logger.info(f"Session details: test_id={db_session.test_id}, user_id={db_session.user_id}, status={db_session.status}")
            
            # The screenshot service will be started separately when the user clicks "Start Test"
            
            return db_session
            
        except ValueError as ve:
            logger.error(f"Validation error in create_session: {str(ve)}")
            db.rollback()
            raise
        except Exception as e:
            logger.error(f"Error in create_session: {str(e)}")
            logger.exception("Full traceback:")
            db.rollback()
            raise
    
    @staticmethod
    def get_session_by_id(db: Session, session_id: int):
        if db is None:
            logger.error("Database session is None in get_session_by_id")
            raise ValueError("Database session is not available")
            
        try:
            return db.query(TestSession).filter(TestSession.id == session_id).first()
        except Exception as e:
            logger.error(f"Error in get_session_by_id: {str(e)}")
            raise
    
    @staticmethod
    def get_sessions_by_user(db: Session, user_id: int):
        if db is None:
            logger.error("Database session is None in get_sessions_by_user")
            raise ValueError("Database session is not available")
            
        try:
            # Add ORDER BY id for SQL Server compatibility
            return db.query(TestSession).filter(
                TestSession.user_id == user_id
            ).order_by(TestSession.id).all()
        except Exception as e:
            logger.error(f"Error in get_sessions_by_user: {str(e)}")
            raise
    
    @staticmethod
    def get_sessions_by_test(db: Session, test_id):
        if db is None:
            logger.error("Database session is None in get_sessions_by_test")
            raise ValueError("Database session is not available")
            
        try:
            return db.query(TestSession).filter(
                TestSession.test_id == test_id
            ).order_by(TestSession.id).all()
        except Exception as e:
            logger.error(f"Error in get_sessions_by_test: {str(e)}")
            raise
    
    @staticmethod
    def get_all_sessions(db: Session):
        if db is None:
            logger.error("Database session is None in get_all_sessions")
            raise ValueError("Database session is not available")
            
        try:
            return db.query(TestSession).order_by(TestSession.id).all()
        except Exception as e:
            logger.error(f"Error in get_all_sessions: {str(e)}")
            raise
    
    @staticmethod
    def get_completed_sessions(db: Session):
        if db is None:
            logger.error("Database session is None in get_completed_sessions")
            raise ValueError("Database session is not available")
            
        try:
            return db.query(TestSession).filter(
                TestSession.status == "completed"
            ).order_by(TestSession.id).all()
        except Exception as e:
            logger.error(f"Error in get_completed_sessions: {str(e)}")
            raise
    
    @staticmethod
    def submit_test(db: Session, submit_data: TestSessionSubmit):
        try:
            # Get the test session
            session = db.query(TestSession).filter(TestSession.id == submit_data.session_id).first()
            if not session:
                raise ValueError(f"Test session {submit_data.session_id} not found")

            # Get all questions for this test
            questions = db.query(Question).filter(Question.test_id == session.test_id).all()
            question_map = {q.id: q for q in questions}
            
            # Get all options for these questions
            options = db.query(Option).filter(Option.question_id.in_([q.id for q in questions])).all()
            option_map = {o.id: o for o in options}

            # Calculate score
            correct_answers = 0
            total_questions = len(questions)
            
            # Process each answer
            for answer in submit_data.answers:
                question_id = answer.get("question_id")
                selected_option_id = answer.get("selected_option_id")
                
                # Handle backward compatibility with old answer format
                if selected_option_id is None and "answer" in answer:
                    selected_option_id = answer.get("answer")
                    logger.info(f"Using backward compatibility for answer format")
                
                logger.info(f"Processing answer: question_id={question_id}, selected_option_id={selected_option_id}")
                
                if question_id is not None and selected_option_id is not None:
                    # Get the question and selected option
                    question = question_map.get(question_id)
                    selected_option = option_map.get(selected_option_id)
                    
                    logger.info(f"Found question: {question is not None}, Found option: {selected_option is not None}")
                    
                    if question and selected_option:
                        # Check if the selected option is correct
                        is_correct = selected_option.is_correct
                        
                        logger.info(f"Option is_correct: {is_correct}")
                        
                        # Create user response record
                        user_response = UserResponse(
                            session_id=session.id,
                            question_id=question_id,
                            selected_option_id=selected_option_id,
                            is_correct=is_correct
                        )
                        db.add(user_response)
                        
                        if is_correct:
                            correct_answers += 1
                    else:
                        logger.warning(f"Question or option not found for question_id={question_id}, selected_option_id={selected_option_id}")
                        logger.warning(f"Available questions: {list(question_map.keys())}")
                        logger.warning(f"Available options: {list(option_map.keys())}")
                else:
                    logger.warning(f"Invalid answer format: {answer}")

            # Calculate percentage
            percentage = (correct_answers / total_questions * 100) if total_questions > 0 else 0

            logger.info(f"Final score calculation: correct_answers={correct_answers}, total_questions={total_questions}, percentage={percentage}")

            # Update session with results
            # Convert end_time to IST
            end_time = submit_data.end_time
            if end_time:
                if isinstance(end_time, str):
                    try:
                        end_time = datetime.fromisoformat(end_time)
                    except Exception:
                        logger.warning(f"Could not parse end_time string: {end_time}")
                        end_time = datetime.now(IST)
                if end_time.tzinfo is None:
                    # Naive datetime, localize to IST
                    end_time = IST.localize(end_time)
                else:
                    # Convert to IST
                    end_time = end_time.astimezone(IST)
            else:
                end_time = datetime.now(IST)
            session.end_time = end_time
            session.score = correct_answers
            session.total_questions = total_questions
            session.percentage = percentage
            session.status = "completed"

            # Save changes
            db.commit()
            db.refresh(session)

            return session

        except Exception as e:
            db.rollback()
            logger.error(f"Error in submit_test: {str(e)}")
            raise
    
    @staticmethod
    def terminate_session(db: Session, session_id: int):
        """Terminate a test session"""
        if db is None:
            logger.error("Database session is None in terminate_session")
            raise ValueError("Database session is not available")
            
        try:
            # Find the session
            session = db.query(TestSession).filter(TestSession.id == session_id).first()
            if not session:
                logger.error(f"Session {session_id} not found")
                raise ValueError(f"Session {session_id} not found")
            
            # Check if session is already terminated or completed
            if session.status in ["terminated", "completed"]:
                logger.warning(f"Session {session_id} is already {session.status}, cannot terminate")
                return session
            
            # Update session status
            session.status = "terminated"
            session.end_time = datetime.now(IST)
            
            # Stop the screenshot service if it's running for this session
            try:
                if screenshot_service.is_active() and screenshot_service.get_current_test_id() == session_id:
                    screenshot_service.stop_for_test()
                    logger.info(f"Stopped screenshot capture for test session {session_id}")
            except Exception as e:
                logger.error(f"Failed to stop screenshot service: {str(e)}")
                # Continue with termination even if stopping the screenshot service fails
            
            db.commit()
            logger.info(f"Successfully terminated session {session_id}")
            return session
            
        except ValueError as ve:
            logger.error(f"Validation error in terminate_session: {str(ve)}")
            db.rollback()
            raise
        except Exception as e:
            logger.error(f"Error in terminate_session: {str(e)}")
            logger.exception("Full traceback:")
            db.rollback()
            raise

    @staticmethod
    def delete_session(db: Session, session_id: int):
        """Delete a test session and all associated data"""
        if db is None:
            logger.error("Database session is None in delete_session")
            raise ValueError("Database session is not available")
            
        try:
            # Find the session
            session = db.query(TestSession).filter(TestSession.id == session_id).first()
            if not session:
                logger.error(f"Session {session_id} not found")
                raise ValueError(f"Session {session_id} not found")
            
            # Clean up associated files
            cleanup_session_files(session_id)
            
            # Delete the session (cascade will handle related data)
            db.delete(session)
            db.commit()
            
            logger.info(f"Successfully deleted session {session_id} and all associated data")
            return True
            
        except ValueError as ve:
            logger.error(f"Validation error in delete_session: {str(ve)}")
            db.rollback()
            raise
        except Exception as e:
            logger.error(f"Error in delete_session: {str(e)}")
            logger.exception("Full traceback:")
            db.rollback()
            raise

    @staticmethod
    def delete_all_sessions(db: Session):
        """Delete all test sessions and associated data"""
        if db is None:
            logger.error("Database session is None in delete_all_sessions")
            raise ValueError("Database session is not available")
            
        try:
            # Get all sessions
            sessions = db.query(TestSession).all()
            deleted_count = 0
            
            for session in sessions:
                try:
                    # Clean up associated files
                    cleanup_session_files(session.id)
                    
                    # Delete the session (cascade will handle related data)
                    db.delete(session)
                    deleted_count += 1
                    
                except Exception as e:
                    logger.error(f"Failed to delete session {session.id}: {str(e)}")
                    continue
            
            db.commit()
            logger.info(f"Successfully deleted {deleted_count} sessions and all associated data")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Error in delete_all_sessions: {str(e)}")
            logger.exception("Full traceback:")
            db.rollback()
            raise

    @staticmethod
    def delete_sessions_by_test(db: Session, test_id: int):
        """Delete all sessions for a specific test"""
        if db is None:
            logger.error("Database session is None in delete_sessions_by_test")
            raise ValueError("Database session is not available")
            
        try:
            # Get all sessions for this test
            sessions = db.query(TestSession).filter(TestSession.test_id == test_id).all()
            deleted_count = 0
            
            for session in sessions:
                try:
                    # Clean up associated files
                    cleanup_session_files(session.id)
                    
                    # Delete the session (cascade will handle related data)
                    db.delete(session)
                    deleted_count += 1
                    
                except Exception as e:
                    logger.error(f"Failed to delete session {session.id}: {str(e)}")
                    continue
            
            db.commit()
            logger.info(f"Successfully deleted {deleted_count} sessions for test {test_id} and all associated data")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Error in delete_sessions_by_test: {str(e)}")
            logger.exception("Full traceback:")
            db.rollback()
            raise 