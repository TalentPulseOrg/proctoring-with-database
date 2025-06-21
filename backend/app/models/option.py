from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Option(Base):
    __tablename__ = "options"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    question_id = Column(Integer, ForeignKey("questions.id"), nullable=False)
    option_text = Column(String(255), nullable=False)
    is_correct = Column(Boolean, default=False)

    # Define relationship back to Question
    question = relationship("Question", back_populates="options")

    def __repr__(self):
        return f"<Option(id={self.id}, question_id={self.question_id}, is_correct={self.is_correct})>" 