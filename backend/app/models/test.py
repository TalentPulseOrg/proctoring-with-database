from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base

class Test(Base):
    __tablename__ = "tests"

    test_id = Column(Integer, primary_key=True, index=True)  # Now primary key
    skill = Column(String(100), nullable=False)
    num_questions = Column(Integer, nullable=False)
    duration = Column(Integer, nullable=False)  # in minutes
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=func.now())

    # Define relationships
    questions = relationship("Question", back_populates="test", cascade="all, delete-orphan")
    test_sessions = relationship("TestSession", back_populates="test")
    creator = relationship("User", foreign_keys=[created_by])

    def __repr__(self):
        return f"<Test(test_id={self.test_id}, skill={self.skill}, num_questions={self.num_questions})>" 