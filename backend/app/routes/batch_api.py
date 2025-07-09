from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field
from typing import List, Optional
import os
import re
import json
import logging
from dotenv import load_dotenv
import google.generativeai as genai
import PyPDF2
from werkzeug.utils import secure_filename

router = APIRouter()

# Request schema
class QuestionGenerationRequest(BaseModel):
    domain: str
    topic: str
    subtopicData : List[str]
    difficulty: Optional[str] = None
    BTLevel: Optional[str] = None
    noOfQuestions: int = Field(..., alias="noOfQuestions")

# Option and Question response schemas
class OptionData(BaseModel):
    optionName: str
    optionText: str

class QuestionData(BaseModel):
    questionText: str
    positiveMarking: int
    negativeMarking: int
    timeToSolve: int
    BTLevel: int
    difficulty: int
    optionData: List[OptionData]
    answer: str

class QuestionGenerationResponse(BaseModel):
    questionData: dict

# Load environment variables
load_dotenv()
logger = logging.getLogger(__name__)

# Get API key from environment variable
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    logger.warning("GEMINI_API_KEY environment variable is not set. AI question generation will not work.")
    genai_model = None
else:
    genai.configure(api_key=api_key)
    genai_model = genai.GenerativeModel('gemini-2.5-flash-lite-preview-06-17')

# File upload configuration
UPLOAD_FOLDER = "uploads"
ALLOWED_EXTENSIONS = {'pdf'}

# Create upload folder if it doesn't exist
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def handle_file_upload(file: UploadFile):
    if not file or file.filename == "":
        raise HTTPException(status_code=400, detail="File not found in request body")
    if not allowed_file(file.filename):
        raise HTTPException(status_code=400, detail="File type not allowed. Only PDF files are supported.")
    filename = secure_filename(file.filename)
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    with open(file_path, "wb") as buffer:
        content = file.file.read()
        buffer.write(content)
    return filename

def extract_pdf_text(pdf_path):
    text = ""
    try:
        with open(pdf_path, "rb") as file:
            reader = PyPDF2.PdfReader(file)
            for page_num in range(len(reader.pages)):
                text += reader.pages[page_num].extract_text()
        return text
    except Exception as e:
        logger.error(f"Error extracting PDF text: {str(e)}")
        raise Exception(f"Failed to extract text from PDF: {str(e)}")

def clean_json_string(data):
    # Clean up the response text
    json_str = data.strip()
    json_str = re.sub(r'```json\s*', '', json_str)
    json_str = re.sub(r'```\s*$', '', json_str)
    start_idx = json_str.find('{')
    end_idx = json_str.rfind('}') + 1
    if start_idx >= 0 and end_idx > start_idx:
        json_str = json_str[start_idx:end_idx]
    return json_str

def parse_gemini_response(response_text):
    try:
        json_str = response_text.strip()
        json_str = re.sub(r'```json\s*', '', json_str)
        json_str = re.sub(r'```\s*$', '', json_str)
        start_idx = json_str.find('{')
        end_idx = json_str.rfind('}') + 1
        if start_idx >= 0 and end_idx > start_idx:
            json_str = json_str[start_idx:end_idx]
        data = json.loads(json_str)
        # Check for 'questions' at the top level
        if 'questions' in data:
            return data
        # Check for 'questionData' with 'questions' inside
        if 'questionData' in data and 'questions' in data['questionData']:
            return data['questionData']
        logger.error("Response missing 'questions' key")
        return {"questions": []}
    except Exception as e:
        logger.error(f"Error parsing Gemini response: {str(e)}")
        return {"questions": []}

@router.post("/api/v1/questions/manual/generate", response_model=QuestionGenerationResponse)
async def manual_generate_question_api(
    manual: UploadFile = File(...),
    domain: str = Form(...),
    topic: str = Form(...),
    subtopicData: List[str] = Form(...),
    noOfQuestions: int = Form(...)
):
    if not genai_model:
        raise HTTPException(status_code=500, detail="AI model not configured. Set GEMINI_API_KEY.")
    try:
        # Handle file upload
        filename = handle_file_upload(manual)
        # Extract text from the uploaded PDF
        pdf_path = os.path.join(UPLOAD_FOLDER, filename)
        pdf_text = extract_pdf_text(pdf_path)
        # Generate prompt from PDF text
        prompt = f"""You are an expert-level question generator tasked with creating exactly {noOfQuestions} high-quality multiple-choice questions (MCQs) for subtopics '{subtopicData}' related to topic '{topic}' in domain '{domain}': {pdf_text}. Ensure accuracy, clarity, and adherence to Bloom’s Taxonomy. Adhere to following guidelines:
        
        ---
        ### *1. Topic, Subtopic, and Domain Identification and Organization
        - Generate questions only for the provided subtopics {subtopicData} which are related to topic {topic} and in the domain {domain}.
        - Organize questions by subtopics, ensuring equal coverage across all subtopics.
        
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
        - Assign BT-level as per below :-
            Remember :- 0
            Understand :- 1
            Apply :- 2
            Analyze :- 3
            Evaluate :- 4
            Create :- 5
        ---
        
        ### *3. Question Design*  
        - Each question must be clear, concise, and self-contained.  
        - For applied questions, include *code snippets* where relevant, written in programming languages suitable to the "{topic}" (e.g., Python, JavaScript, etc.).  
        - Indicate the language explicitly in the "code" field.  
        - Ensure code snippets are executable and produce results aligned with the correct answer.  
        ---
        
        ### *4. Skills coverage
        - If comma separated skills or topic are provided, ensure questions of each comma separated skill are included.
        - Generate equal number of questions of each skill or topic.
        - Ensure generated questions are relevant to provided skills or topic.

        ### *5. Options and Correct Answer*  
        - Provide *four options* (option1, option2, option3, option4) for each question.  
        - Systematically alternate the correct option between "A", "B", "C", and "D" across the set.  
        - Design *distractor options* (incorrect answers) to be plausible, closely related to the correct answer, and capable of challenging critical thinking.  

        ---
        
        ### *6. Difficulty Levels*  
        - Assign one of three difficulty levels to each question: *Easy, **Intermediate, or **Hard*.
        - Assign difficulty levels as per below :- 
            Easy :- 0
            Intermediate :- 1
            Hard :- 2 
        - Ensure a balanced distribution of difficulty across questions.  

        ---
        
        ### *7. JSON Output Format*  
        Strictly adhere to the following JSON structure:
        {{
            "questionData": {{
                "questions": [
                    {{
                        "questionText": "Question text here...",
                        "positiveMarking": 1,
                        "negativeMarking": 0,
                        "timeToSolve": 10,
                        "BTLevel": 1,
                        "difficulty": 1,
                        "optionData": [
                          {{ "optionName": "option1", "optionText": "..." }},
                          {{ "optionName": "option2", "optionText": "..." }},
                          {{ "optionName": "option3", "optionText": "..." }},
                          {{ "optionName": "option4", "optionText": "..." }}
                        ],
                        "answerData": "option2"
                    }}
                ]
            }}
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
        response = genai_model.generate_content(prompt)
        data = parse_gemini_response(response.text)
        # Clean up the uploaded file
        try:
            os.remove(pdf_path)
        except Exception as e:
            logger.warning(f"Failed to clean up uploaded file {pdf_path}: {str(e)}")
        return {"questionData": data}
    except Exception as e:
        logger.error(f"Error in manual question generation: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Manual Question Generation Error: {str(e)}")

@router.post("/api/v1/questions/generate", response_model=QuestionGenerationResponse)
def generate_question_api(request: QuestionGenerationRequest):
    if not genai_model:
        raise HTTPException(status_code=500, detail="AI model not configured. Set GEMINI_API_KEY.")
    try:
        prompt = f"""You are an expert-level question generator tasked with creating exactly {request.noOfQuestions} high-qaulity multiple-choice questions (MCQs) on subtopics '{request.subtopicData}' which are related to topic '{request.topic}' in the domain '{request.domain}'. Ensure accuracy, clarity, and adherence to Bloom’s Taxonomy. Adhere to following guidelines:
        
            ---
            ### *1. Topic, Subtopic and Domain Identification and Organization
            - Generate questions only for the provided subtopics {request.subtopicData} which are related to topic {request.topic} and in the domain {request.domain}.
            - Organize questions by subtopics, ensuring equal coverage across all subtopics.
            
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
            - Assign BT-level as per below :-
                Remember :- 0
                Understand :- 1
                Apply :- 2
                Analyze :- 3
                Evaluate :- 4
                Create :- 5
            
            ---
            
            ### *3. Question Design*  
            - Each question must be clear, concise, and self-contained.  
            - For applied questions, include *code snippets* where relevant, written in programming languages suitable to the "{request.topic}" (e.g., Python, JavaScript, etc.).  
            - Indicate the language explicitly in the "code" field.  
            - Ensure code snippets are executable and produce results aligned with the correct answer.  

            ---
            
            ### *4. Skills coverage
            - If comma seperated skills or topics are provided, ensure questions of each comma seperated skill or topic are included.
            - Generate equal number of questions of each skill or topic.
            - Ensure generated questions are relevant to provided skills or topics.

            ### *5. Options and Correct Answer*  
            - Provide *four options* (option1, option2, option3, option4) for each question.  
            - Systematically alternate the correct option between "A", "B", "C", and "D" across the set.  
            - Design *distractor options* (incorrect answers) to be plausible, closely related to the correct answer, and capable of challenging critical thinking.  

            ---
            
            ### *6. Difficulty Levels*  
            - Assign one of three difficulty levels to each question: *Easy, **Intermediate, or **Hard*.
            - Assign difficulty levels as per below :- 
                Easy :- 0
                Intermediate :- 1
                Hard :- 2 
            - Ensure a balanced distribution of difficulty across questions.  

            ---
        
            ### *7. JSON Output Format*  
            Strictly adhere to the following JSON structure:
            {{
                "questionData": {{
                    "questions": [
                        {{
                            "questionText": "Question text here...",
                            "positiveMarking": 1,
                            "negativeMarking": 0,
                            "timeToSolve": 10,
                            "BTLevel": 1,
                            "difficulty": 1,
                            "optionData": [
                              {{ "optionName": "option1", "optionText": "..." }},
                              {{ "optionName": "option2", "optionText": "..." }},
                              {{ "optionName": "option3", "optionText": "..." }},
                              {{ "optionName": "option4", "optionText": "..." }}
                            ],
                            "answerData": "option2"
                        }}
                    ]
                }}
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
        

        response = genai_model.generate_content(prompt)
        data = parse_gemini_response(response.text)
        return {"questionData": data}
    except Exception as e:
        logger.error(f"Error generating questions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI Error: {str(e)}")
