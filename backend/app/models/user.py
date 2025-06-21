from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100))
    email = Column(String(100), unique=True, index=True)
    role = Column(String(20))  # admin/candidate
    created_at = Column(DateTime, default=func.now())

    # Define relationships with string references to avoid circular imports
    face_verification = relationship("FaceVerification", back_populates="user", uselist=False)
    test_sessions = relationship("TestSession", back_populates="user")

    def __repr__(self):
        return f"<User(id={self.id}, name={self.name}, email={self.email}, role={self.role})>" 