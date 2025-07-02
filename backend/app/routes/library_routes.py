from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import List, Dict, Any
import google.generativeai as genai
import os
import json, re

router = APIRouter()

class OptionData(BaseModel):
    optionName: str
    optionText: str

class Question(BaseModel):
    questionText: str
    positiveMarking: float
    negativeMarking: float
    timeToSolve: int
    BTLevel: int
    difficulty: int
    optionData: List[OptionData]
    answer: str

class QuestionData(BaseModel):
    questions: List[Question]
    questionIds: List[int]

class LibraryCreateRequest(BaseModel):
    libraryName: str
    topic: str
    summary: str
    description: str
    difficulty: str

def get_gemini_api_key():
    # You should set your Gemini API key as an environment variable
    return os.getenv("GEMINI_API_KEY")

async def generate_questions_with_gemini(library_name: str, topic: str) -> Dict[str, Any]:
    api_key = get_gemini_api_key()
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API key not set.")
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.5-flash-lite-preview-06-17')
    prompt = f"""
    You are an expert-level creating high quality multiple-choice questions (MCQs) libraries. Ensure accuracy, clarity, and adherence to Bloom’s Taxonomy. Adhere to following guidelines: 
    
    ---
    ### *1. Topic and Skill area identification and Organization*
    - Generate questions only for the provided topic {topic}.
    - Organize questions by topic, ensuring equal coverage across all topics.
    - Given the library name: '{library_name}' and topic: '{topic}',
      - Identify 5 skill areas that are important for this topic in the context of the library.
      - For each skill area, generate 5 multiple-choice questions.
    
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
    - For applied questions, include *code snippets* where relevant, written in programming languages suitable to the "{topic}" (e.g., Python, JavaScript, etc.).  
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
    - Ensure a balanced distribution of difficulty across questions. 
    
    ---
    
    ### *7. JSON Output Format*  
    Strictly adhere to the following JSON structure:
    {{
      "skillAreas": [
        {{
          "skillAreaId":1,
          "skillAreaName": "...",
          "questionData": {{
            "questions": [
              {{
                "questionText": "...",
                "positiveMarking": 1,
                "negativeMarking": 0,
                "timeToSolve": 10,
                "BTLevel": 1,
                "difficulty": 1,
                "optionData": [
                  {{"optionName": "option1", "optionText": "..."}},
                  {{"optionName": "option2", "optionText": "..."}},
                  {{"optionName": "option3", "optionText": "..."}},
                  {{"optionName": "option4", "optionText": "..."}},
                ],
                "answer": "option2"
              }}
            ],
            "questionIds":[1]
          }}
        }}
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
    text = response.text.strip()
    # Remove triple backticks and optional 'json' label
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?", "", text, flags=re.IGNORECASE).strip()
        text = re.sub(r"```$", "", text).strip()
    try:
        data = json.loads(text)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response: {str(e)}. Raw response: {response.text}")

@router.post("/api/v1/libraries/create")
async def create_library(request: LibraryCreateRequest):
    ai_data = await generate_questions_with_gemini(request.libraryName, request.topic)
    skill_areas = ai_data.get("skillAreas", [])
    if not skill_areas:
        raise HTTPException(status_code=500, detail="AI did not return any skill areas.")
    response = []
    for idx, skill_area in enumerate(skill_areas, start=1):
        questions = skill_area.get("questions", [])
        question_ids = list(range(1, len(questions) + 1))
        response.append({
            "skillAreaId": idx,
            "skillAreaName": skill_area.get("skillAreaName", f"Skill Area {idx}"),
            "questionData": {
                "questions": questions,
                "questionIds": question_ids
            }
        })
    return response 