"""
Base Violation Class for Modular Features

This module provides a base violation class that each feature can extend to ensure
complete modularity and independence from the global violation system.

Usage:
    from app.features.shared.base_violation import BaseViolation
    
    class MyFeatureViolation(BaseViolation):
        __tablename__ = "my_feature_violations"
        # Add feature-specific fields
"""

from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class BaseViolation(Base):
    """Base violation class that all feature violations should extend"""
    
    __abstract__ = True  # This makes it an abstract base class
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    violation_type = Column(String(50), nullable=False)
    details = Column(Text, nullable=True)  # JSON string for additional details
    filepath = Column(String(500), nullable=True)  # Path to screenshot/snapshot
    
    def __repr__(self):
        return f"<{self.__class__.__name__}(id={self.id}, session_id={self.session_id}, type={self.violation_type})>"
    
    def to_dict(self):
        """Convert violation to dictionary"""
        return {
            'id': self.id,
            'session_id': self.session_id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'violation_type': self.violation_type,
            'details': self.details,
            'filepath': self.filepath
        } 