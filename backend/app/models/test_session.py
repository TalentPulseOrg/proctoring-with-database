from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base

class TestSession(Base):
    __tablename__ = "test_sessions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    test_id = Column(Integer, ForeignKey("tests.test_id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user_name = Column(String(255), nullable=True)
    user_email = Column(String(255), nullable=True)
    start_time = Column(DateTime, default=func.now())
    end_time = Column(DateTime, nullable=True)
    score = Column(Integer, nullable=True)
    total_questions = Column(Integer, nullable=True)
    percentage = Column(Float, nullable=True)
    status = Column(String(20), default="in_progress")  # in_progress/completed/terminated

    # Define relationships
    test = relationship("Test", back_populates="test_sessions")
    user = relationship("User", back_populates="test_sessions")
    violations = relationship("Violation", back_populates="session", cascade="all, delete-orphan")
    screen_captures = relationship("ScreenCapture", back_populates="session", cascade="all, delete-orphan")
    behavioral_anomalies = relationship("BehavioralAnomaly", back_populates="session", cascade="all, delete-orphan")
    user_responses = relationship("UserResponse", back_populates="session", cascade="all, delete-orphan")
    snapshot_captures = relationship("SnapshotCapture", back_populates="session", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<TestSession(id={self.id}, test_id={self.test_id}, user_id={self.user_id}, status={self.status})>" 