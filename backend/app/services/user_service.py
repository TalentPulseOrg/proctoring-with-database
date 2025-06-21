from sqlalchemy.orm import Session
import logging
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate

logger = logging.getLogger(__name__)

class UserService:
    @staticmethod
    def create_user(db: Session, user: UserCreate) -> User:
        try:
            db_user = User(
                name=user.name,
                email=user.email,
                role=user.role
            )
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
            return db_user
        except Exception as e:
            db.rollback()
            logger.error(f"Error creating user: {str(e)}")
            raise

    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> User:
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def get_user_by_email(db: Session, email: str) -> User:
        return db.query(User).filter(User.email == email).first()

    @staticmethod
    def get_users(db: Session, skip: int = 0, limit: int = 100):
        # MSSQL requires ORDER BY when using OFFSET/LIMIT
        return db.query(User).order_by(User.id).offset(skip).limit(limit).all()

    @staticmethod
    def update_user(db: Session, user_id: int, user: UserUpdate) -> User:
        try:
            db_user = UserService.get_user_by_id(db, user_id)
            if db_user:
                # Handle both Pydantic v1 and v2
                user_data = {}
                if hasattr(user, 'model_dump'):
                    # Pydantic v2
                    user_data = user.model_dump(exclude_unset=True)
                else:
                    # Pydantic v1
                    user_data = user.dict(exclude_unset=True)
                
                for key, value in user_data.items():
                    if value is not None:
                        setattr(db_user, key, value)
                
                db.commit()
                db.refresh(db_user)
            return db_user
        except Exception as e:
            db.rollback()
            logger.error(f"Error updating user: {str(e)}")
            raise

    @staticmethod
    def delete_user(db: Session, user_id: int) -> bool:
        try:
            db_user = UserService.get_user_by_id(db, user_id)
            if db_user:
                db.delete(db_user)
                db.commit()
                return True
            return False
        except Exception as e:
            db.rollback()
            logger.error(f"Error deleting user: {str(e)}")
            raise 