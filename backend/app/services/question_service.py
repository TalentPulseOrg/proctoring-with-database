from sqlalchemy.orm import Session
from ..models.question import Question
from ..models.option import Option
from ..schemas.question import QuestionCreate, QuestionUpdate, OptionCreate
from typing import List
import logging
from sqlalchemy import func

# Set up logging
logger = logging.getLogger(__name__)

class QuestionService:
    @staticmethod
    def create_question(db: Session, question: QuestionCreate):
        if db is None:
            logger.error("Database session is None in create_question")
            raise ValueError("Database session is not available")
            
        try:
            # Check if test_id is a string that needs conversion
            test_id = question.test_id
            if isinstance(test_id, str) and test_id.isdigit():
                test_id = int(test_id)
            
            # Create the question
            db_question = Question(
                test_id=test_id,
                question_text=question.question_text,
                code=question.code,  # Include the code field
                correct_answer=question.correct_answer
            )
            db.add(db_question)
            db.commit()
            db.refresh(db_question)
            
            # Create options if provided
            if question.options:
                for option in question.options:
                    db_option = Option(
                        question_id=db_question.id,
                        option_text=option.option_text,
                        is_correct=option.is_correct
                    )
                    db.add(db_option)
                db.commit()
                
            return db_question
        except Exception as e:
            logger.error(f"Error in create_question: {str(e)}")
            db.rollback()
            raise
    
    @staticmethod
    def create_questions_batch(db: Session, questions: List[QuestionCreate]):
        if db is None:
            logger.error("Database session is None in create_questions_batch")
            raise ValueError("Database session is not available")
            
        try:
            created_questions = []
            for i, question in enumerate(questions):
                try:
                    db_question = QuestionService.create_question(db, question)
                    created_questions.append(db_question)
                except Exception as e:
                    # Log error for this specific question but continue with others
                    logger.error(f"Error creating question at index {i}: {str(e)}")
                    # Re-raise if we haven't created any questions yet
                    if len(created_questions) == 0:
                        raise
            
            if len(created_questions) < len(questions):
                logger.warning(f"Only created {len(created_questions)} out of {len(questions)} questions")
                
            return created_questions
        except Exception as e:
            logger.error(f"Error in create_questions_batch: {str(e)}")
            raise
    
    @staticmethod
    def get_questions_by_test_id(db: Session, test_id: int):
        if db is None:
            logger.error("Database session is None in get_questions_by_test_id")
            raise ValueError("Database session is not available")
            
        try:
            # Add ORDER BY id for SQL Server compatibility
            return db.query(Question).filter(Question.test_id == test_id).order_by(Question.id).all()
        except Exception as e:
            logger.error(f"Error in get_questions_by_test_id: {str(e)}")
            raise
    
    @staticmethod
    def get_question_by_id(db: Session, question_id: int):
        if db is None:
            logger.error("Database session is None in get_question_by_id")
            raise ValueError("Database session is not available")
            
        try:
            return db.query(Question).filter(Question.id == question_id).first()
        except Exception as e:
            logger.error(f"Error in get_question_by_id: {str(e)}")
            raise
    
    @staticmethod
    def update_question(db: Session, question_id: int, question_update: QuestionUpdate):
        if db is None:
            logger.error("Database session is None in update_question")
            raise ValueError("Database session is not available")
            
        try:
            db_question = QuestionService.get_question_by_id(db, question_id)
            if db_question:
                update_data = question_update.dict(exclude_unset=True)
                for key, value in update_data.items():
                    setattr(db_question, key, value)
                db.commit()
                db.refresh(db_question)
            return db_question
        except Exception as e:
            logger.error(f"Error in update_question: {str(e)}")
            db.rollback()
            raise
    
    @staticmethod
    def delete_question(db: Session, question_id: int):
        if db is None:
            logger.error("Database session is None in delete_question")
            raise ValueError("Database session is not available")
            
        try:
            db_question = QuestionService.get_question_by_id(db, question_id)
            if db_question:
                db.delete(db_question)
                db.commit()
                return True
            return False
        except Exception as e:
            logger.error(f"Error in delete_question: {str(e)}")
            db.rollback()
            raise
    
    @staticmethod
    def add_option(db: Session, question_id: int, option: OptionCreate):
        if db is None:
            logger.error("Database session is None in add_option")
            raise ValueError("Database session is not available")
            
        try:
            db_option = Option(
                question_id=question_id,
                option_text=option.option_text,
                is_correct=option.is_correct
            )
            db.add(db_option)
            db.commit()
            db.refresh(db_option)
            return db_option
        except Exception as e:
            logger.error(f"Error in add_option: {str(e)}")
            db.rollback()
            raise
    
    @staticmethod
    def get_random_questions_by_test_id(db: Session, test_id: int, num_questions: int):
        if db is None:
            logger.error("Database session is None in get_random_questions_by_test_id")
            raise ValueError("Database session is not available")
        try:
            # Detect SQL dialect for random ordering
            dialect_name = db.bind.dialect.name
            if dialect_name == "mssql":
                # SQL Server uses NEWID()
                return db.query(Question).filter(Question.test_id == test_id).order_by(func.newid()).limit(num_questions).all()
            else:
                # SQLite/Postgres use RANDOM()
                return db.query(Question).filter(Question.test_id == test_id).order_by(func.random()).limit(num_questions).all()
        except Exception as e:
            logger.error(f"Error in get_random_questions_by_test_id: {str(e)}")
            raise 