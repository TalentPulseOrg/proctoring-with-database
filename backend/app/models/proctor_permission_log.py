from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base

class ProctorPermissionLog(Base):
    __tablename__ = "proctorpermissionlog"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    examSessionId = Column(Integer, ForeignKey("test_sessions.id"), nullable=False)
    permissionType = Column(String(255), nullable=False)
    granted = Column(Boolean, nullable=False)
    deviceInfo = Column(String(500), nullable=True)
    errorMessage = Column(String(1000), nullable=True)
    timeStamp = Column(DateTime, default=func.now())

    # Define relationship
    exam_session = relationship("TestSession", back_populates="proctor_permission_logs")

    def __repr__(self):
        return f"<ProctorPermissionLog(id={self.id}, examSessionId={self.examSessionId}, permissionType={self.permissionType}, granted={self.granted})>" 