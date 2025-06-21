from sqlalchemy import Column, Integer, String, DateTime, Boolean, Float, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base

class FaceVerification(Base):
    __tablename__ = "face_verifications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    id_photo_path = Column(String(255))
    is_verified = Column(Boolean, default=False)
    verification_date = Column(DateTime, default=func.now())
    match_score = Column(Float, nullable=True)
    liveness_score = Column(Float, nullable=True)

    # Define relationship back to User
    user = relationship("User", back_populates="face_verification")

    def __repr__(self):
        return f"<FaceVerification(id={self.id}, user_id={self.user_id}, is_verified={self.is_verified})>" 