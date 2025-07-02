from sqlalchemy import Column, Integer, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    test_id = Column(Integer, ForeignKey("tests.test_id"), nullable=False)
    question_text = Column(Text, nullable=False)
    code = Column(Text, nullable=True)  # Code snippets for programming questions
    correct_answer = Column(String(255), nullable=True)  # May be null if using options with is_correct flag

    # Define relationships
    test = relationship("Test", back_populates="questions")
    options = relationship("Option", back_populates="question", cascade="all, delete-orphan")
    user_responses = relationship("UserResponse", back_populates="question")

    def __repr__(self):
        return f"<Question(id={self.id}, test_id={self.test_id})>" 