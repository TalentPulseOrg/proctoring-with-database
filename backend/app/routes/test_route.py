from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Request, Depends
from pydantic import BaseModel
import google.generativeai as genai
import os
import json
import re
from dotenv import load_dotenv
from datetime import datetime
import logging
import cv2
import numpy as np
import face_recognition
from ..utils.auth import validate_session


# Ensure the screenshots directory exists when the server starts
def ensure_snapshot_directories():
    try:
        base_dir = os.path.join("media", "screenshots")
        if not os.path.exists(base_dir):
            os.makedirs(base_dir, exist_ok=True)
        # Don't create a default test directory - they will be created dynamically based on session IDs
    except Exception as e:
        logger.error(f"Error creating snapshot directories: {str(e)}")


from ..services.test_service import TestService
from ..services.question_service import QuestionService
from ..schemas.test import TestCreate
from ..schemas.question import QuestionCreate, OptionCreate
from ..database import get_db
from sqlalchemy.orm import Session

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

router = APIRouter(prefix="/api/tests", tags=["tests"])

# Get API key from environment variable
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    logger.warning(
        "GEMINI_API_KEY environment variable is not set. Using mock data for tests."
    )
    mock_mode = True
else:
    mock_mode = False
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-2.5-flash-lite-preview-06-17")


class TestRequest(BaseModel):
    skill: str
    num_questions: int = 5
    duration: int = 30
    test_id: int = None  # Allow frontend to specify the test ID

    class Config:
        # Allow extra fields to be provided
        extra = "allow"


class TestResult(BaseModel):
    score: int
    total: int
    timestamp: str
    skill: str


@router.post("/generate")
async def generate_test(
    request: TestRequest, req: Request, db: Session = Depends(get_db)
):
    try:
        # Check if test_id was provided and if it already exists
        existing_test = None
        if request.test_id is not None:
            existing_test = TestService.get_test_by_test_id(db, request.test_id)
            if existing_test:
                logger.info(
                    f"Using existing test with test_id: {existing_test.test_id}"
                )

                # If test already exists, get its questions
                db_questions = QuestionService.get_questions_by_test_id(
                    db, existing_test.test_id
                )

                # If questions already exist, format and return them
                if db_questions and len(db_questions) > 0:
                    test_data = {"questions": []}
                    for q in db_questions:
                        options = [opt.option_text for opt in q.options]
                        correct_answer = next(
                            (opt.option_text for opt in q.options if opt.is_correct),
                            None,
                        )

                        question_data = {
                            "question": q.question_text,
                            "options": options,
                            "correct_answer": correct_answer or q.correct_answer,
                        }
                        test_data["questions"].append(question_data)

                    # Add test ID to the response
                    test_data["testId"] = existing_test.test_id
                    return test_data

        # Create a test record in the database (or use existing if found)
        test_create = TestCreate(
            test_id=request.test_id if request.test_id is not None else 1,
            skill=request.skill,
            num_questions=request.num_questions,
            duration=request.duration,
            created_by=1,  # Default user ID
        )

        db_test = TestService.create_test(db, test_create)
        logger.info(f"Created/retrieved test with test_id: {db_test.test_id}")

        # If in mock mode, generate sample data
        if mock_mode:
            logger.info(
                f"Using mock data for skill: {request.skill}, questions: {request.num_questions}"
            )
            test_data = generate_mock_questions(request.skill, request.num_questions)
        else:
            # Use Gemini to generate questions
            prompt = f"""You are an expert-level question generator tasked with creating {request.num_questions} high-quality multiple-choice questions (MCQs) on {request.skill}. Ensure accuracy, clarity, and adherence to Bloom’s Taxonomy. Adhere to following guidelines:

            ---
            ### *1. Topic Identification and Organization
            - Generate questions only for the provided topic {request.skill}.
            - Organize questions by topic, ensuring equal coverage across all topics.
            
            ### *2. Bloom's Taxonomy Coverage*
            - Ensure proper distribution of all six levels of Bloom's taxonomy as per the following chart:
                Remember : 10-15 percent
                Understand : 15-20 percent
                Apply : 25-30 percent
                Analyze : 15-20 percent
                Evaluate : 10-15 percent
                Create : 5-10 percent
                
            - *Remember*: Recall basic facts and definitions.  
            - *Understand*: Explain concepts or interpret information.  
            - *Apply*: Solve problems using learned techniques.  
            - *Analyze*: Break down information to examine relationships.  
            - *Evaluate*: Judge based on criteria or standards.  
            - *Create*: Formulate new solutions or ideas.  
            - Sort questions in the order of Bloom's taxonomy levels: remember, understand, apply, analyze, evaluate, and create.  
            
            ---
            
            ### *3. Question Design*  
            - Each question must be clear, concise, and self-contained.  
            - For applied questions, include *code snippets* where relevant, written in programming languages suitable to the "{request.skill}" (e.g., Python, JavaScript, etc.).  
            - Indicate the language explicitly in the "code" field.  
            - Ensure code snippets are executable and produce results aligned with the correct answer.  

            ---
            
            ### *4. Skills coverage
            - If comma seperated skills are provided, ensure questions of each comma seperated skill are included.
            - Generate equal number of questions of each skill.
            - Ensure generated questions are relevant to provided skills.

            ### *5. Options and Correct Answer*  
            - Provide *four options* (option1, option2, option3, option4) for each question.  
            - Systematically alternate the correct option between "A", "B", "C", and "D" across the set.  
            - Design *distractor options* (incorrect answers) to be plausible, closely related to the correct answer, and capable of challenging critical thinking.  

            ---
            
            ### *6. Difficulty Levels*  
            - Assign one of three difficulty levels to each question: *Easy, **Intermediate, or **Hard*.  
            - Ensure a balanced distribution of difficulty across questions.  

            ---
            
            ### *7. JSON Output Format*  
            Strictly adhere to the following JSON structure:
            {{
                "questions": [
                    {{
                        "topic": "{request.skill}",
                        "question": "What is ...?",
                        "code": "<language>\n<code_snippet>\n",
                        "options" : ["option A", "option B", "option C", "option D"],
                        "answer": "option A",
                        "BT_level": "understand",
                        "difficulty": "Easy"
                    }},
                ]
            }}

            ### *8. Verification Requirements*  
            - *Accuracy*: Verify the correctness of the provided correct option.  
            - *Code Execution*: For code-based questions, execute the code snippets in a sandbox environment to confirm results.  
            - *Distractor Quality*: Ensure incorrect options are plausible but not correct.  
            - *Taxonomy and Difficulty Validation*: Confirm that the Bloom's taxonomy level and difficulty level match the question's complexity.  

            ---

            ### *9. Additional Guidelines*  
            - Avoid ambiguity or overly complex jargon in questions and options.  
            - Use professional language and ensure all questions align with the topic and subtopic.  
            - Validate all Q&A pairs before finalizing.
            
            """

            response = model.generate_content(prompt)
            test_data = parse_gemini_response(response.text)

        # Store questions and options in the database - only if this is a new test
        # Check if the test already has questions first
        existing_questions = QuestionService.get_questions_by_test_id(
            db, db_test.test_id
        )
        if not existing_questions or len(existing_questions) == 0:
            db_questions = []
            for q_data in test_data["questions"]:
                # Create options in the format expected by QuestionCreate
                options = []
                for opt in q_data["options"]:
                    is_correct = opt == q_data["correct_answer"]
                    options.append(OptionCreate(option_text=opt, is_correct=is_correct))

                # Create question
                question = QuestionCreate(
                    test_id=db_test.test_id,  # Use test_id as foreign key
                    question_text=q_data["question"],
                    correct_answer=q_data["correct_answer"],
                    options=options,
                )

                # Add to database
                try:
                    db_question = QuestionService.create_question(db, question)
                    db_questions.append(db_question)
                    logger.info(
                        f"Created question ID: {db_question.id} for test {db_test.test_id}"
                    )
                except Exception as e:
                    logger.error(f"Error creating question: {str(e)}")
                    # Continue with other questions even if one fails

            # Log the number of stored questions
            logger.info(
                f"Successfully stored {len(db_questions)} questions for test {db_test.test_id}"
            )
        else:
            logger.info(
                f"Test {db_test.test_id} already has {len(existing_questions)} questions, skipping question creation"
            )

        # Return questions with database IDs for proper scoring
        # Get the saved questions from the database to include IDs
        saved_questions = QuestionService.get_questions_by_test_id(db, db_test.test_id)
        if saved_questions:
            formatted_questions = []
            for db_question in saved_questions:
                # Get options for this question
                options_data = []
                for option in db_question.options:
                    options_data.append(
                        {
                            "id": option.id,  # Include database option ID
                            "text": option.option_text,
                            "is_correct": option.is_correct,
                        }
                    )

                formatted_questions.append(
                    {
                        "id": db_question.id,  # Include database question ID
                        "question": db_question.question_text,
                        "options": options_data,
                        "correct_answer": db_question.correct_answer,
                    }
                )

            # Update the response with database questions
            test_data["questions"] = formatted_questions

        # Add test ID to the response
        test_data["testId"] = db_test.test_id

        return test_data
    except Exception as e:
        logger.error(f"Error generating test: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI Error: {str(e)}")


def generate_mock_questions(skill, num_questions):
    """Generate mock questions when API key is not available"""
    questions = []

    # Create some sample questions based on the skill
    for i in range(num_questions):
        questions.append(
            {
                "question": f"Sample question {i+1} about {skill}?",
                "options": [
                    f"Option A for question {i+1}",
                    f"Option B for question {i+1}",
                    f"Option C for question {i+1}",
                    f"Option D for question {i+1}",
                ],
                "correct_answer": f"Option A for question {i+1}",
            }
        )

    return {"questions": questions}


def parse_gemini_response(response_text):
    try:
        # Clean up the response text
        json_str = response_text.strip()

        # Remove any markdown code block indicators
        json_str = re.sub(r"```json\s*", "", json_str)
        json_str = re.sub(r"```\s*$", "", json_str)

        # Remove any leading/trailing non-JSON text
        start_idx = json_str.find("{")
        end_idx = json_str.rfind("}") + 1
        if start_idx >= 0 and end_idx > start_idx:
            json_str = json_str[start_idx:end_idx]

        # Parse the JSON
        test_data = json.loads(json_str)

        # Validate the structure
        if "questions" not in test_data:
            logger.error("Response missing 'questions' key")
            return {"questions": []}

        # Ensure each question has the required fields
        for i, q in enumerate(test_data["questions"]):
            if "question" not in q or "options" not in q or "correct_answer" not in q:
                logger.error(f"Question {i} missing required fields")
                continue

            # Ensure correct_answer is in options
            if q["correct_answer"] not in q["options"]:
                logger.warning(
                    f"Question {i}: correct_answer not in options, fixing..."
                )
                q["options"][0] = q["correct_answer"]

        return test_data
    except json.JSONDecodeError as e:
        logger.error(f"JSON decode error: {str(e)}\nResponse text: {response_text}")
        return {"questions": []}
    except Exception as e:
        logger.error(f"Error parsing response: {str(e)}")
        return {"questions": []}


@router.post("/submit")
async def submit_test(result: TestResult):
    try:
        # Process the test submission
        return {
            "success": True,
            "message": "Test results submitted successfully",
            "score": result.score,
            "total": result.total,
            "percentage": (
                (result.score / result.total) * 100 if result.total > 0 else 0
            ),
        }
    except Exception as e:
        logger.error(f"Error submitting test: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/save-snapshot")
async def save_snapshot(
    test_id: str = Form(...),
    snapshot_type: str = Form("webcam"),  # Default to webcam
    image: UploadFile = File(...),
):
    try:
        # Print debug info
        print(
            f"Received snapshot request - test_id: {test_id}, type: {snapshot_type}, filename: {image.filename}"
        )

        # Determine the save directory
        base_dir = os.path.join("media", "screenshots")
        print(f"Base directory: {base_dir}")

        # Ensure the base directory exists
        os.makedirs(base_dir, exist_ok=True)

        # Create test-specific directory
        test_dir = os.path.join(base_dir, f"test_{test_id}")
        os.makedirs(test_dir, exist_ok=True)
        print(f"Test directory: {test_dir}")

        # Read the image
        contents = await image.read()
        print(f"Read {len(contents)} bytes of image data")

        # Make sure the image data is valid
        if len(contents) == 0:
            print("Error: Image data is empty")
            raise HTTPException(status_code=400, detail="Empty image data")

        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            print("Error: Failed to decode image data")
            raise HTTPException(status_code=400, detail="Invalid image data")

        # Generate a filename with timestamp
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        filename = f"webcam_snapshot_{timestamp}.jpg"
        filepath = os.path.join(test_dir, filename)
        print(f"Saving to: {filepath}")

        # Save the image
        result = cv2.imwrite(filepath, img)
        if not result:
            print(f"Error: Failed to save image to {filepath}")
            raise HTTPException(status_code=500, detail="Failed to save image")

        print(f"Image saved successfully to {filepath}")

        # Create database entry for the webcam snapshot
        try:
            from app.services.media_database_service import media_db_service

            success = media_db_service.process_file_creation(filepath)
            if success:
                print(f"Database entry created for webcam snapshot: {filepath}")
            else:
                print(
                    f"Failed to create database entry for webcam snapshot: {filepath}"
                )
        except Exception as e:
            print(f"Error creating database entry for webcam snapshot: {str(e)}")
            logger.error(f"Error creating database entry for webcam snapshot: {str(e)}")

        # Detect faces in the image (if available)
        face_count = 0
        try:
            # Convert BGR to RGB for face_recognition
            rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            face_locations = face_recognition.face_locations(rgb_img)
            face_count = len(face_locations)
            print(f"Detected {face_count} faces in image")
        except Exception as e:
            print(f"Face detection error: {str(e)}")
            # Continue even if face detection fails
            pass

        # Get the absolute path to make it easier to find the file
        abs_path = os.path.abspath(filepath)
        print(f"Absolute path: {abs_path}")

        return {
            "success": True,
            "message": "Snapshot saved successfully",
            "file_path": filepath,
            "absolute_path": abs_path,
            "face_count": face_count,
        }
    except Exception as e:
        print(f"Error saving snapshot: {str(e)}")
        logger.error(f"Error saving snapshot: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Ensure the screenshots directory exists when the server starts
def ensure_snapshot_directories():
    try:
        base_dir = os.path.join("media", "screenshots")
        if not os.path.exists(base_dir):
            os.makedirs(base_dir, exist_ok=True)
        # Create a test_1 directory as a default
        test_dir = os.path.join(base_dir, "test_1")
        if not os.path.exists(test_dir):
            os.makedirs(test_dir, exist_ok=True)
    except Exception as e:
        logger.error(f"Error creating snapshot directories: {str(e)}")


# Create directories when module loads
ensure_snapshot_directories()
