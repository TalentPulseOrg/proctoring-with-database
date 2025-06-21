from pydantic import BaseModel, Field
from typing import Optional, List, Union

class OptionBase(BaseModel):
    option_text: str
    is_correct: bool

class OptionCreate(OptionBase):
    pass

class OptionResponse(OptionBase):
    id: int
    question_id: int

    class Config:
        from_attributes = True

class QuestionBase(BaseModel):
    question_text: str
    correct_answer: Optional[str] = None

class QuestionCreate(QuestionBase):
    test_id: int  # Now directly references the Test.test_id field
    options: List[OptionCreate] = []

class QuestionResponse(QuestionBase):
    id: int
    test_id: int
    options: List[OptionResponse] = []

    class Config:
        from_attributes = True

class QuestionUpdate(BaseModel):
    question_text: Optional[str] = None
    correct_answer: Optional[str] = None 