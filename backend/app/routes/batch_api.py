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
    genai_model = genai.GenerativeModel('gemini-1.5-flash')

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
        json_str = re.sub(r'```json\\s*', '', json_str)
        json_str = re.sub(r'```\\s*$', '', json_str)
        start_idx = json_str.find('{')
        end_idx = json_str.rfind('}') + 1
        if start_idx >= 0 and end_idx > start_idx:
            json_str = json_str[start_idx:end_idx]
        data = json.loads(json_str)
        if 'questions' not in data:
            logger.error("Response missing 'questions' key")
            return {"questions": []}
        return data
    except Exception as e:
        logger.error(f"Error parsing Gemini response: {str(e)}")
        return {"questions": []}

@router.post("/api/v1/questions/manual/generate", response_model=QuestionGenerationResponse)
async def manual_generate_question_api(
    manual: UploadFile = File(...),
    domain: str = Form(...),
    topic: str = Form(...),
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
        prompt = f"""Generate {noOfQuestions} MCQs keeping blooms taxonomy in center and ensuring that all levels of blooms taxonomy (remember, understand, apply, analyze, evaluate, create) are covered in equal proportion from the following text for domain '{domain}' and topic '{topic}':\n\n{pdf_text}\n\nGenerate response with the following JSON format:\n{{\n  \"questions\": [\n    {{\n      \"questionText\": \"What is...?\",\n      \"positiveMarking\": 1,\n      \"negativeMarking\": 0,\n      \"timeToSolve\": 10,\n      \"BTLevel\": 1,\n      \"difficulty\": 1,\n      \"optionData\": [\n        {{\"optionName\": \"option1\", \"optionText\": \"Option A\"}},\n        {{\"optionName\": \"option2\", \"optionText\": \"Option B\"}},\n        {{\"optionName\": \"option3\", \"optionText\": \"Option C\"}},\n        {{\"optionName\": \"option4\", \"optionText\": \"Option D\"}}\n      ],\n      \"answer\": \"option1\"\n    }}\n  ]\n}}\n\nRequirements:\n1. Return ONLY the JSON object, no other text\n2. Each question must have exactly 4 options in optionData\n3. The answer must match one of the optionName values\n4. Make sure the JSON is properly formatted with no trailing commas\n5. Use proper JSON escaping for special characters\n6. Questions should be sorted in order of blooms taxonomy levels: remember, understand, analyze, apply, evaluate, create\n7. Ensure all levels of blooms taxonomy are covered in equal proportion"""
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
