from pydantic import BaseModel, validator, Field
from datetime import datetime
from typing import Optional, List, Union, Any, Dict
import logging

logger = logging.getLogger(__name__)

class TestSessionBase(BaseModel):
    test_id: Union[int, str]  # Accept either integer ID or string UUID
    user_id: int
    
    # Validator to convert string test_id to int when possible
    @validator('test_id')
    def validate_test_id(cls, v):
        if isinstance(v, str) and v.isdigit():
            try:
                return int(v)
            except (ValueError, TypeError):
                logger.warning(f"Could not convert test_id to int: {v}")
        return v

class TestSessionCreate(TestSessionBase):
    user_name: Optional[str] = None
    user_email: Optional[str] = None

class TestSessionResponse(TestSessionBase):
    id: Union[int, str]  # Support both integer IDs and string IDs
    start_time: Union[datetime, str]  # Support both datetime and string ISO format
    end_time: Optional[Union[datetime, str]] = None  # Support both datetime and string ISO format
    score: Optional[int] = None
    total_questions: Optional[int] = None
    percentage: Optional[float] = None
    status: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    
    # Validator to convert string id to int when possible
    @validator('id')
    def validate_id(cls, v):
        if isinstance(v, str) and v.isdigit():
            try:
                return int(v)
            except (ValueError, TypeError):
                logger.warning(f"Could not convert id to int: {v}")
        return v

    class Config:
        from_attributes = True

class TestSessionUpdate(BaseModel):
    end_time: Optional[datetime] = None
    score: Optional[int] = None
    total_questions: Optional[int] = None
    percentage: Optional[float] = None
    status: Optional[str] = None
    user_name: Optional[str] = None
    user_email: Optional[str] = None

class AnswerSubmission(BaseModel):
    question_id: int
    selected_option_id: int

class TestSessionSubmit(BaseModel):
    session_id: Union[int, str]  # Support both integer IDs and string IDs
    answers: List[Dict[str, Any]] = Field(..., description="List of answers in format {question_id: int, selected_option_id: int}")
    end_time: Union[datetime, str, None] = None
    
    # Validator to convert string session_id to int when possible
    @validator('session_id')
    def validate_session_id(cls, v):
        if isinstance(v, str) and v.isdigit():
            try:
                return int(v)
            except (ValueError, TypeError):
                logger.warning(f"Could not convert session_id to int: {v}")
        return v
    
    # Validator to ensure answers contain required fields
    @validator('answers')
    def validate_answers(cls, v):
        if not isinstance(v, list):
            logger.error(f"Answers must be a list, got {type(v)}")
            raise ValueError("Answers must be a list")
        
        # Check each answer has the required fields
        for i, answer in enumerate(v):
            if not isinstance(answer, dict):
                logger.error(f"Answer {i} must be a dictionary, got {type(answer)}")
                raise ValueError(f"Answer {i} must be a dictionary")
            
            if 'question_id' not in answer:
                logger.error(f"Answer {i} missing question_id")
                raise ValueError(f"Answer {i} missing question_id")
            
            if 'selected_option_id' not in answer:
                logger.error(f"Answer {i} missing selected_option_id")
                raise ValueError(f"Answer {i} missing selected_option_id")
            
            # Ensure values are integers or can be converted to integers
            try:
                answer['question_id'] = int(answer['question_id'])
                answer['selected_option_id'] = int(answer['selected_option_id'])
            except (ValueError, TypeError):
                logger.error(f"Answer {i} has invalid values: {answer}")
                raise ValueError(f"Answer {i} has invalid values: {answer}")
        
        return v 