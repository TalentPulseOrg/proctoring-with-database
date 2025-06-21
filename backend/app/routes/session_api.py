from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Union
import logging
from ..database import get_db
from ..services.test_session_service import TestSessionService
from ..services.face_verification_service import FaceVerificationService
from ..schemas.test_session import (
    TestSessionCreate,
    TestSessionResponse,
    TestSessionSubmit,
)
from ..models.test_session import TestSession
from ..models.user import User
from ..models.test import Test
from ..models.option import Option
from ..models.question import Question
from ..models.user_response import UserResponse

# Set up logging with reduced verbosity
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/sessions", tags=["Test Sessions"])


@router.post("/start", response_model=TestSessionResponse)
def start_session(session: TestSessionCreate, db: Session = Depends(get_db)):
    try:
        # Use the service to create a new session
        return TestSessionService.create_session(db, session)

    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error starting test session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/submit", response_model=TestSessionResponse)
def submit_test(submit_data: TestSessionSubmit, db: Session = Depends(get_db)):
    try:
        # Add detailed logging to track the submission process
        logger.info(f"Received test submission via /submit endpoint for session {submit_data.session_id}")
        logger.info(f"Answer count: {len(submit_data.answers)}")
        logger.info(f"End time: {submit_data.end_time}")
        
        # Use the service to submit the test
        result = TestSessionService.submit_test(db, submit_data)
        
        # Verify that score was properly set
        if result and result.score is None:
            logger.warning(f"Score was not set for session {submit_data.session_id}, manually recalculating")
            # Calculate basic score information as a fallback
            correct_answers = sum(1 for a in submit_data.answers if a.get('is_correct', False))
            total_questions = len(submit_data.answers)
            percentage = (correct_answers / total_questions) * 100 if total_questions > 0 else 0
            
            # Update the session with these values
            result.score = correct_answers
            result.total_questions = total_questions
            result.percentage = percentage
            result.status = "completed"
            
            # Save changes to database
            db.commit()
            db.refresh(result)
            
        return result
    except Exception as e:
        db.rollback()
        logger.error(f"Error in submit_test endpoint: {str(e)}")
        logger.exception("Full traceback:")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{session_id}/submit", response_model=TestSessionResponse)
def submit_test_by_id(
    session_id: Union[int, str],
    submit_data: TestSessionSubmit,
    db: Session = Depends(get_db),
):
    """Submit a completed test by session ID"""
    try:
        # Use session_id from path parameter and override submit_data session_id
        target_session_id = session_id
        submit_data.session_id = session_id
        logger.info(f"Received submit request via /{session_id}/submit endpoint")

        logger.info(f"Processing submission for session_id: {target_session_id}")
        logger.info(f"Answer count: {len(submit_data.answers)}")
        logger.info(f"End time: {submit_data.end_time}")

        # Ensure session_id is numeric for database operations
        if isinstance(target_session_id, str):
            try:
                target_session_id = int(target_session_id)
            except ValueError:
                logger.error(f"Invalid session ID format: {target_session_id}")
                raise HTTPException(status_code=400, detail="Invalid session ID format")

        # Check if session exists in database
        existing_session = (
            db.query(TestSession).filter(TestSession.id == target_session_id).first()
        )

        if existing_session:
            logger.info(f"Found existing session in database: {existing_session.id}")
            logger.info(
                f"Current session state: status={existing_session.status}, user={existing_session.user_name}"
            )

            # Update the existing session using the service
            submit_data.session_id = target_session_id
            db_session = TestSessionService.submit_test(db, submit_data)
            
            # Verify that score was properly set
            if db_session and db_session.score is None:
                logger.warning(f"Score was not set for session {target_session_id}, manually recalculating")
                # Calculate basic score information as a fallback
                correct_answers = sum(1 for a in submit_data.answers if a.get('is_correct', False))
                total_questions = len(submit_data.answers)
                percentage = (correct_answers / total_questions) * 100 if total_questions > 0 else 0
                
                # Update the session with these values
                db_session.score = correct_answers
                db_session.total_questions = total_questions
                db_session.percentage = percentage
                db_session.status = "completed"
                
                # Save changes to database
                db.commit()
                db.refresh(db_session)
            
            if db_session:
                logger.info(
                    f"Successfully updated database session: score={db_session.score}, percentage={db_session.percentage}"
                )
                return db_session
            else:
                logger.error("TestSessionService.submit_test returned None")
                raise HTTPException(
                    status_code=500, detail="Failed to update session in database"
                )
        else:
            logger.error(f"Session {target_session_id} not found in database")
            # Instead of just failing, create a detailed error message with available sessions
            all_sessions = db.query(TestSession).all()
            available_ids = [str(s.id) for s in all_sessions]
            error_detail = f"Session {target_session_id} not found in database. Available session IDs: {', '.join(available_ids) if available_ids else 'No sessions exist'}"
            raise HTTPException(status_code=404, detail=error_detail)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting test: {str(e)}")
        logger.exception("Full traceback:")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user/{user_id}", response_model=List[TestSessionResponse])
def get_user_sessions(user_id: int, db: Session = Depends(get_db)):
    """Get all sessions for a user"""
    try:
        sessions = TestSessionService.get_sessions_by_user(db, user_id)
        return sessions
    except Exception as e:
        logger.error(f"Error getting user sessions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/test/{test_id}", response_model=List[TestSessionResponse])
def get_test_sessions(test_id: Union[int, str], db: Session = Depends(get_db)):
    """Get all sessions for a test"""
    try:
        sessions = TestSessionService.get_sessions_by_test(db, test_id)
        return sessions
    except Exception as e:
        logger.error(f"Error getting test sessions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{session_id}", response_model=TestSessionResponse)
def get_session(session_id: Union[int, str], db: Session = Depends(get_db)):
    """Get session by ID"""
    try:
        session = TestSessionService.get_session_by_id(db, session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return session
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/completed", response_model=List[TestSessionResponse])
def get_completed_sessions(db: Session = Depends(get_db)):
    """Get all completed sessions"""
    try:
        sessions = TestSessionService.get_completed_sessions(db)
        return sessions
    except Exception as e:
        logger.error(f"Error getting completed sessions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/debug/all", response_model=List[TestSessionResponse])
def get_all_sessions_debug(db: Session = Depends(get_db)):
    """Get all sessions - debug endpoint"""
    try:
        sessions = TestSessionService.get_all_sessions(db)
        
        # Count how many sessions we have
        session_count = len(sessions) if sessions else 0
        logger.info(f"Found {session_count} sessions in database")
        
        if session_count == 0:
            # Check if there are any tests in the database
            tests = db.query(Test).all()
            test_count = len(tests) if tests else 0
            logger.info(f"Found {test_count} tests in database")
            
            # Check if there are any users in the database
            users = db.query(User).all()
            user_count = len(users) if users else 0
            logger.info(f"Found {user_count} users in database")
            
            # Return empty list but with diagnostic info in headers
            raise HTTPException(
                status_code=200,
                detail=f"No sessions found. Database has {test_count} tests and {user_count} users."
            )
        
        return sessions
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting all sessions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/user/{user_id}/results", response_model=List[dict])
def get_user_results(user_id: int, db: Session = Depends(get_db)):
    """Get detailed results for a user's test sessions, including user responses"""
    try:
        # Get the user's sessions
        sessions = db.query(TestSession).filter(TestSession.user_id == user_id).all()
        
        results = []
        for session in sessions:
            # Get user responses for this session
            responses = db.query(UserResponse).filter(UserResponse.session_id == session.id).all()
            
            # Format the response data
            session_data = {
                "session_id": session.id,
                "test_id": session.test_id,
                "score": session.score,
                "total_questions": session.total_questions,
                "percentage": session.percentage,
                "status": session.status,
                "start_time": session.start_time,
                "end_time": session.end_time,
                "responses": []
            }
            
            # Add response details
            for response in responses:
                # Get question and option details
                question = db.query(Question).filter(Question.id == response.question_id).first()
                selected_option = db.query(Option).filter(Option.id == response.selected_option_id).first()
                
                response_data = {
                    "question_id": response.question_id,
                    "question_text": question.question_text if question else "Unknown",
                    "selected_option_id": response.selected_option_id,
                    "selected_option_text": selected_option.option_text if selected_option else "Unknown",
                    "is_correct": response.is_correct
                }
                
                session_data["responses"].append(response_data)
                
            results.append(session_data)
            
        return results
        
    except Exception as e:
        logger.error(f"Error getting user results: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{session_id}/terminate", response_model=TestSessionResponse)
def terminate_session(session_id: Union[int, str], db: Session = Depends(get_db)):
    """Terminate a test session"""
    try:
        session = TestSessionService.terminate_session(db, session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return session
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error terminating session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/validate/{session_id}")
def validate_session(session_id: Union[int, str], db: Session = Depends(get_db)):
    """Validate a session ID - checks if the session exists and returns its status"""
    try:
        # Handle both string and integer session IDs
        if isinstance(session_id, str) and session_id.isdigit():
            session_id = int(session_id)
            
        # Find the session
        session = db.query(TestSession).filter(TestSession.id == session_id).first()
        
        if not session:
            return {
                "valid": False,
                "message": f"Session with ID {session_id} not found",
                "status": None
            }
            
        # Check if the session is in a valid state
        valid_status = session.status == "in_progress"
        
        return {
            "valid": valid_status,
            "message": "Session is valid and in progress" if valid_status else f"Session is in {session.status} state",
            "status": session.status,
            "user_id": session.user_id,
            "test_id": session.test_id,
            "user_name": session.user_name
        }
        
    except Exception as e:
        logger.error(f"Error validating session: {str(e)}")
        return {
            "valid": False,
            "message": f"Error validating session: {str(e)}",
            "status": None
        }


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(session_id: Union[int, str], db: Session = Depends(get_db)):
    """Delete a test session and all associated data"""
    try:
        # Handle both string and integer session IDs
        if isinstance(session_id, str) and session_id.isdigit():
            session_id = int(session_id)
            
        # Use the service to delete the session
        success = TestSessionService.delete_session(db, session_id)
        if not success:
            raise HTTPException(status_code=404, detail="Session not found")
        return {"status": "success", "message": f"Session {session_id} deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
def delete_all_sessions(db: Session = Depends(get_db)):
    """Delete all test sessions and associated data"""
    try:
        # Use the service to delete all sessions
        deleted_count = TestSessionService.delete_all_sessions(db)
        return {"status": "success", "message": f"Deleted {deleted_count} sessions successfully"}
    except Exception as e:
        logger.error(f"Error deleting all sessions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/test/{test_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sessions_by_test(test_id: Union[int, str], db: Session = Depends(get_db)):
    """Delete all sessions for a specific test"""
    try:
        # Handle both string and integer test IDs
        if isinstance(test_id, str) and test_id.isdigit():
            test_id = int(test_id)
            
        # Use the service to delete sessions for this test
        deleted_count = TestSessionService.delete_sessions_by_test(db, test_id)
        return {"status": "success", "message": f"Deleted {deleted_count} sessions for test {test_id} successfully"}
    except Exception as e:
        logger.error(f"Error deleting sessions for test: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
