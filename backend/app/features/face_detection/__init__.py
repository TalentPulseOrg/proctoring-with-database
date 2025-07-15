"""
Face Detection Feature Module

This module handles face detection, multiple face detection, and face verification.
It can be used independently in other applications.

Dependencies:
- FastAPI
- SQLAlchemy
- Pydantic
- OpenCV
- face_recognition

Usage:
    from app.features.face_detection import FaceDetectionFeature
    
    # Initialize the feature
    face_feature = FaceDetectionFeature()
    
    # Include in FastAPI app
    app.include_router(face_feature.router)
"""

from .routes import router
from .services import FaceDetectionService

__all__ = [
    'router',
    'FaceDetectionService', 
] 