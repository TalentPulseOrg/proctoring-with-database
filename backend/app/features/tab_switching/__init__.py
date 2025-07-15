"""
Tab Switching Control Feature Module

This module handles tab switching detection and violation logging.
It can be used independently in other applications.

Dependencies:
- FastAPI
- SQLAlchemy
- Pydantic

Usage:
    from app.features.tab_switching import TabSwitchingFeature
    
    # Initialize the feature
    tab_feature = TabSwitchingFeature()
    
    # Include in FastAPI app
    app.include_router(tab_feature.router)
"""

from .routes import router
from .services import TabSwitchingService
from .models import TabSwitchingViolation
from .schemas import TabSwitchingViolationRequest

__all__ = [
    'router',
    'TabSwitchingService', 
    'TabSwitchingViolation',
    'TabSwitchingViolationRequest'
] 