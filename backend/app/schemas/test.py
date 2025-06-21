from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class TestBase(BaseModel):
    skill: str
    num_questions: int
    duration: int

class TestCreate(TestBase):
    test_id: int
    created_by: int

class TestResponse(TestBase):
    test_id: int
    created_at: datetime
    created_by: int

    class Config:
        from_attributes = True

class TestUpdate(BaseModel):
    skill: Optional[str] = None
    num_questions: Optional[int] = None
    duration: Optional[int] = None 