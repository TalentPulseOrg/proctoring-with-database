from sqlalchemy import Column, Integer, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database import Base

class UserResponse(Base):
    __tablename__ = "user_responses"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("test_sessions.id"), nullable=False)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    selected_option_id = Column(Integer, ForeignKey("options.id"), nullable=False)
    is_correct = Column(Boolean, default=False)

    # Define relationships
    session = relationship("TestSession", back_populates="user_responses")
    question = relationship("Question", back_populates="user_responses")
    selected_option = relationship("Option")

    def __repr__(self):
        return f"<UserResponse(id={self.id}, session_id={self.session_id}, question_id={self.question_id}, is_correct={self.is_correct})>" 