from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import List, Any, Dict
import logging
from ..database import get_db
from ..services.test_service import TestService
from ..services.question_service import QuestionService
from ..schemas.test import TestCreate, TestResponse, TestUpdate
from ..schemas.question import QuestionCreate, QuestionResponse
from ..utils.auth import validate_session
from pydantic import BaseModel

# Set up logging with reduced verbosity
logger = logging.getLogger(__name__)

# Define a new schema for the generate questions request
class QuestionsRequest(BaseModel):
    questions: List[QuestionCreate]

# Define a custom response model for tests with questions
class TestWithQuestionsResponse(TestResponse):
    questions: List[Dict[str, Any]] = []

router = APIRouter(prefix="/api/tests", tags=["Tests"])

@router.post("/create", response_model=TestResponse, status_code=status.HTTP_201_CREATED)
def create_test(test: TestCreate, db: Session = Depends(get_db)):
    """Create a new test"""
    try:
        return TestService.create_test(db, test)
    except Exception as e:
        logger.error(f"Error creating test: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/all", response_model=List[TestResponse])
def get_all_tests(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """Get all tests"""
    try:
        tests = TestService.get_tests(db, skip, limit)
        
        # If no tests are found, return an empty list
        if not tests:
            logger.info("No tests found")
            return []
            
        return tests
    except Exception as e:
        logger.error(f"Error getting tests: {str(e)}")
        logger.exception("Full traceback:")
        # Return empty list instead of raising an exception for more graceful degradation
        return []

@router.get("/{test_id}", response_model=TestWithQuestionsResponse)
def get_test(test_id: int, db: Session = Depends(get_db)):
    """Get a specific test by test_id with its questions and options"""
    try:
        db_test = TestService.get_test_by_test_id(db, test_id)
        if db_test is None:
            raise HTTPException(status_code=404, detail="Test not found")
        
        # Get the questions for this test
        db_questions = QuestionService.get_questions_by_test_id(db, db_test.test_id)
        
        # Format the questions in the expected format for the frontend
        formatted_questions = []
        for q in db_questions:
            # Get options and format them
            options = []
            correct_answer = None
            
            # Check if options exist for this question
            if q.options:
                for opt in q.options:
                    # Add the option to the list
                    options.append(opt.option_text)
                    
                    # If this is the correct option, save it
                    if opt.is_correct:
                        correct_answer = opt.option_text
            
            # If we don't have a correct answer from options, use the one stored directly
            if not correct_answer and q.correct_answer:
                correct_answer = q.correct_answer
                
            # Format the question
            formatted_q = {
                "id": q.id,
                "question": q.question_text,
                "options": options,
                "correct_answer": correct_answer
            }
            formatted_questions.append(formatted_q)
            
        # Create the response
        response = db_test.__dict__.copy()
        response["questions"] = formatted_questions
        
        return response
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting test: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{test_id}", response_model=TestResponse)
def update_test(test_id: int, test_update: TestUpdate, db: Session = Depends(get_db)):
    """Update a test"""
    try:
        # Find test by test_id
        db_test = TestService.get_test_by_test_id(db, test_id)
        if db_test is None:
            raise HTTPException(status_code=404, detail="Test not found")
            
        # Update the test
        updated_test = TestService.update_test(db, test_id, test_update)
        return updated_test
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating test: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{test_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_test(test_id: int, db: Session = Depends(get_db)):
    """Delete a test"""
    try:
        # Find test by test_id
        db_test = TestService.get_test_by_test_id(db, test_id)
        if db_test is None:
            raise HTTPException(status_code=404, detail="Test not found")
            
        # Delete the test
        success = TestService.delete_test(db, test_id)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete test")
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting test: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
def delete_all_tests(db: Session = Depends(get_db)):
    """Delete all tests and their associated data"""
    try:
        # Get all tests
        tests = TestService.get_tests(db)
        deleted_count = 0
        
        for test in tests:
            try:
                success = TestService.delete_test(db, test.test_id)
                if success:
                    deleted_count += 1
            except Exception as e:
                logger.error(f"Failed to delete test {test.test_id}: {str(e)}")
                continue
        
        return {"status": "success", "message": f"Deleted {deleted_count} tests successfully"}
    except Exception as e:
        logger.error(f"Error deleting all tests: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/questions/generate", response_model=List[QuestionResponse])
async def generate_questions(request: QuestionsRequest, db: Session = Depends(get_db)):
    """Generate questions for a test"""
    try:
        questions = request.questions
        logger.info(f"Received request to generate {len(questions)} questions")
        
        # Validate each question has a valid test_id
        for i, question in enumerate(questions):
            if not question.test_id:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Question at index {i} is missing test_id"
                )
        
        # Create batch of questions
        created_questions = QuestionService.create_questions_batch(db, questions)
        logger.info(f"Successfully created {len(created_questions)} questions")
        return created_questions
    except ValueError as e:
        logger.error(f"Validation error in generate_questions: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error generating questions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 