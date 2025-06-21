from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base

class BehavioralAnomaly(Base):
    __tablename__ = "behavioral_anomalies"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("test_sessions.id"), nullable=False)
    timestamp = Column(DateTime, default=func.now())
    anomaly_type = Column(String(50), nullable=False)
    details = Column(JSON, nullable=True)  # JSON column for additional details

    # Define relationship back to TestSession
    session = relationship("TestSession", back_populates="behavioral_anomalies")

    def __repr__(self):
        return f"<BehavioralAnomaly(id={self.id}, session_id={self.session_id}, anomaly_type={self.anomaly_type})>" 