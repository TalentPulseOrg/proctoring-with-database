from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base

class ScreenCapture(Base):
    __tablename__ = "screen_captures"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("test_sessions.id"), nullable=False)
    timestamp = Column(DateTime, default=func.now())
    image_path = Column(String(255), nullable=True)

    # Define relationship back to TestSession
    session = relationship("TestSession", back_populates="screen_captures")

    def __repr__(self):
        return f"<ScreenCapture(id={self.id}, session_id={self.session_id})>" 