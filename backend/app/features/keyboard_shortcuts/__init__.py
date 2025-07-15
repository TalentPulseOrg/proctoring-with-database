"""
Keyboard Shortcuts Control Feature Module

This module handles keyboard shortcuts detection and violation logging.
It can be used independently in other applications.

Dependencies:
- FastAPI
- SQLAlchemy
- Pydantic

Usage:
    from app.features.keyboard_shortcuts import KeyboardShortcutsFeature
    
    # Initialize the feature
    shortcuts_feature = KeyboardShortcutsFeature()
    
    # Include in FastAPI app
    app.include_router(shortcuts_feature.router)
"""

from .routes import router
from .services import KeyboardShortcutsService

__all__ = [
    'router',
    'KeyboardShortcutsService', 
] 