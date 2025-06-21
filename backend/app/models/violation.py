from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base

class Violation(Base):
    __tablename__ = "violations"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("test_sessions.id"), nullable=False)
    timestamp = Column(DateTime, default=func.now())
    violation_type = Column(String(50), nullable=False)
    details = Column(JSON, nullable=True)  # JSON column for additional details
    filepath = Column(String(500), nullable=True)  # Path to uploaded image file

    # Define relationship back to TestSession
    session = relationship("TestSession", back_populates="violations")

    def __repr__(self):
        return f"<Violation(id={self.id}, session_id={self.session_id}, violation_type={self.violation_type})>" 