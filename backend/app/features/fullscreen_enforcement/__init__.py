"""
Full Screen Enforcement Feature Module

This module handles fullscreen enforcement and violation logging.
It can be used independently in other applications.

Dependencies:
- FastAPI
- SQLAlchemy
- Pydantic

Usage:
    from app.features.fullscreen_enforcement import FullscreenEnforcementFeature
    
    # Initialize the feature
    fullscreen_feature = FullscreenEnforcementFeature()
    
    # Include in FastAPI app
    app.include_router(fullscreen_feature.router)
"""

from .routes import router
from .services import FullscreenEnforcementService
from .models import FullscreenExitViolation
from .schemas import FullscreenExitViolationRequest

__all__ = [
    'router',
    'FullscreenEnforcementService', 
    'FullscreenExitViolation',
    'FullscreenExitViolationRequest'
] 