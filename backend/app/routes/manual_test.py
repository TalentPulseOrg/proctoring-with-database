from fastapi import APIRouter, UploadFile, File, Form

router = APIRouter()

@router.post("/api/v1/manual-test")
async def manual_test(
    manual: UploadFile = File(...),
    domain: str = Form(...),
    topic: str = Form(...),
    noOfQuestions: int = Form(...)
):
    print(f"DEBUG: manual={manual.filename if manual else None}, domain={domain}, topic={topic}, noOfQuestions={noOfQuestions}")
    return {
        "manual": manual.filename if manual else None,
        "domain": domain,
        "topic": topic,
        "noOfQuestions": noOfQuestions
    } 