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
You are an expert question generator for technical libraries.
Given the library name: '{library_name}' and topic: '{topic}',
1. Identify 5 skill areas that are important for this topic in the context of the library.
2. For each skill area, generate 5 multiple-choice questions. Each question should have 4 options, specify the correct answer, and provide metadata: positiveMarking (float), negativeMarking (float), timeToSolve (int, seconds), BTLevel (1-6), difficulty (1-3).
Return the result as a JSON object in this format:
{{
  "skillAreas": [
    {{
      "skillAreaName": "...",
      "questions": [
        {{
          "questionText": "...",
          "positiveMarking": 1,
          "negativeMarking": 0.25,
          "timeToSolve": 15,
          "BTLevel": 2,
          "difficulty": 2,
          "optionData": [
            {{"optionName": "option1", "optionText": "..."}},
            ...
          ],
          "answer": "option2"
        }}
      ]
    }}
  ]
}}
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