# Import the models in the correct order to avoid circular dependencies
# Models with foreign keys should be imported after the models they reference

# Base models without foreign key dependencies
from app.models.user import User

# Models with foreign keys to base models
from app.models.test import Test
from app.models.face_verification import FaceVerification

# Models with foreign keys to Test
from app.models.question import Question
from app.models.test_session import TestSession

# Models with foreign keys to Question
from app.models.option import Option

# Models with foreign keys to TestSession
from app.models.violation import Violation
from app.models.screen_capture import ScreenCapture
from app.models.behavioral_anomaly import BehavioralAnomaly

# Models with foreign keys to multiple tables
from app.models.user_response import UserResponse

# Export all models
__all__ = [
    'User',
    'Test',
    'FaceVerification',
    'Question',
    'TestSession',
    'Option',
    'Violation',
    'ScreenCapture',
    'BehavioralAnomaly',
    'UserResponse'
] 