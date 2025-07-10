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
    questionData: list

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
        # Handle both dict and list for 'questionData'
        if isinstance(data, dict):
            if 'questions' in data:
                # Map answerData to answer if present, and remove 'answer'
                for q in data['questions']:
                    if 'answerData' in q:
                        q['answer'] = q['answerData'][0] if isinstance(q['answerData'], list) else q['answerData']
                    if 'answer' in q:
                        del q['answer']
                return data['questions']
            if 'questionData' in data:
                qd = data['questionData']
                if isinstance(qd, dict) and 'questions' in qd:
                    for q in qd['questions']:
                        if 'answerData' in q:
                            q['answer'] = q['answerData'][0] if isinstance(q['answerData'], list) else q['answerData']
                        if 'answer' in q:
                            del q['answer']
                    return qd['questions']
                if isinstance(qd, list):
                    for q in qd:
                        if 'answerData' in q:
                            q['answer'] = q['answerData'][0] if isinstance(q['answerData'], list) else q['answerData']
                        if 'answer' in q:
                            del q['answer']
                    return qd
        logger.error("Response missing 'questions' key")
        return []
    except Exception as e:
        logger.error(f"Error parsing Gemini response: {str(e)}")
        return []

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
        prompt = f"""You are an expert-level question generator. 
        
        ### *0. You are provided with following inputs :-

            1. Text extracted from manual (Text from which you have to generate questions.):- {pdf_text}
            2. Domain (a broad area of knowledge, learning, or skill development that encompasses related subjects or disciplines.) :- {domain} 
            3. Topic (a specific subject or theme that is studied or discussed within a broader subject or domain.) :- {topic}
            4. Subtopics (a more detailed and specific component of a topic that breaks down complex information into manageable parts for focused learning.) :- {subtopicData}
            5. Number of questions (Exact no. of questions you are expected to generate) :- {noOfQuestions}
          
        You are tasked with creating high quality multiple choice questions (MCQs) from provided extracted text. Make sure to adhere to extracted text for question generation. Adhere to following guidelines:
        
        ---
        ### *1. Topic, Subtopic, and Domain Identification and Organization
        - Generate questions only for the provided subtopics {subtopicData} which are related to topic {topic} and in the domain {domain}.
        - Organize questions by subtopics, ensuring equal coverage across all subtopics.
        ---

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
        
        ### *4. Subtopics coverage
            - If comma seperated subtopics or topics are provided, ensure questions of each comma seperated subtopic or topic are included.
            - Generate equal number of questions of each subtopic or topic.
            - Ensure generated questions are relevant to provided subtopics or topics.
            - Include subtopics associated with a question in output format. Make sure to include subtopics only from provided subtopicData input. Strictly avoid any additional subtopics. If multiple subtopics are possible, then return an array.

        ### *5. Options and Correct Answer*  
        - Provide *four options* (option1, option2, option3, option4) for each question.
        - The optionName for each option must be exactly 'option1', 'option2', 'option3', 'option4' (not A, B, C, D or any other value).
        - The answerData should be one of: 'option1', 'option2', 'option3', 'option4'.
        - Systematically alternate the correct option between 'option1', 'option2', 'option3', and 'option4' across the set.  
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

        ### *7. Time to solve*
            - Assign time required to solve the question according to difficulty level and BT Level of the question
            - Ensure time to solve is realistic and correct.
        
        ### *8. JSON Output Format*  
        Strictly adhere to the following JSON structure:
        {{
            "questionData": [
                    {{
                        "questionText": "Question text here...",
                        "positiveMarking": 1,
                        "negativeMarking": 0,
                        "timeToSolve": 2,
                        "BTLevel": 1,
                        "difficulty": 1,
                        "subtopicData" : [" "," "],
                        "optionData": [
                          {{ "optionName": "option1", "optionText": "..." }},
                          {{ "optionName": "option2", "optionText": "..." }},
                          {{ "optionName": "option3", "optionText": "..." }},
                          {{ "optionName": "option4", "optionText": "..." }}
                        ],
                        "answerData": ["option2"]
                    }}
            ]
        }}

        ### *9. Verification Requirements*  
        - *Accuracy*: Verify the correctness of the provided correct option.  
        - *Code Execution*: For code-based questions, execute the code snippets in a sandbox environment to confirm results.  
        - *Distractor Quality*: Ensure incorrect options are plausible but not correct.  
        - *Taxonomy and Difficulty Validation*: Confirm that the Bloom's taxonomy level and difficulty level match the question's complexity.  

        ---
        
        ### *10. Additional Guidelines*  
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
        prompt = f"""You are an expert-level question generator.
         
            ### *0. You are provided with following inputs :-

            1. Domain (a broad area of knowledge, learning, or skill development that encompasses related subjects or disciplines.) :- {request.domain} 
            2. Topic (a specific subject or theme that is studied or discussed within a broader subject or domain.) :- {request.topic}
            3. Subtopics (a more detailed and specific component of a topic that breaks down complex information into manageable parts for focused learning.) :- {request.subtopicData}
            4. Number of questions (Exact no. of questions you are expected to generate) :- {request.noOfQuestions}
          
            You are tasked with creating high quality multiple choice questions (MCQs) from provided extracted text.  Adhere to following guidelines: 
           
        
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
            
            ### *4. Subtopics coverage
            - If comma seperated subtopics or topics are provided, ensure questions of each comma seperated subtopic or topic are included.
            - Generate equal number of questions of each subtopic or topic.
            - Ensure generated questions are relevant to provided subtopics or topics.
            - Include subtopics associated with a question in output format. Make sure to include subtopics only from provided subtopicData input. Strictly avoid any additional subtopics. If multiple subtopics are possible, then return an array.

            ### *5. Options and Correct Answer*  
            - Provide *four options* (option1, option2, option3, option4) for each question.
            - The optionName for each option must be exactly 'option1', 'option2', 'option3', 'option4' (not A, B, C, D or any other value).
            - The answerData should be one of: 'option1', 'option2', 'option3', 'option4'.
            - Systematically alternate the correct option between 'option1', 'option2', 'option3', and 'option4' across the set.  
            - Design *distractor options* (incorrect answers) to be plausible, closely related to the correct answer, and capable of challenging critical thinking.  

            ---
            
            ### *6. Difficulty Levels*  
            - Assign one of three difficulty levels to each question: *Easy, **Intermediate, or **Hard*.
            - Assign difficulty levels as per below :- 
                Easy :- 0
                Intermediate :- 1
                Hard :- 2 
            - Ensure a balanced distribution of difficulty across questions.

            ### *7. Time to solve*
            - Assign time required to solve the question according to difficulty level and BT Level of the question
            - Ensure time to solve is realistic and correct.  

            ---
        
            ### *8. JSON Output Format*  
            Strictly adhere to the following JSON structure:
            {{
                "questionData": [
                        {{
                            "questionText": "Question text here...",
                            "positiveMarking": 1,
                            "negativeMarking": 0,
                            "timeToSolve": 2,
                            "BTLevel": 1,
                            "difficulty": 1,
                            "subtopicData" : [" "," "],
                            "optionData": [
                              {{ "optionName": "option1", "optionText": "..." }},
                              {{ "optionName": "option2", "optionText": "..." }},
                              {{ "optionName": "option3", "optionText": "..." }},
                              {{ "optionName": "option4", "optionText": "..." }}
                            ],
                            "answerData": ["option2"]
                        }}
                ]
            }}

            ### *9. Verification Requirements*  
            - *Accuracy*: Verify the correctness of the provided correct option.  
            - *Code Execution*: For code-based questions, execute the code snippets in a sandbox environment to confirm results.  
            - *Distractor Quality*: Ensure incorrect options are plausible but not correct.  
            - *Taxonomy and Difficulty Validation*: Confirm that the Bloom's taxonomy level and difficulty level match the question's complexity.  

            ---

            ### *10. Additional Guidelines*  
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
