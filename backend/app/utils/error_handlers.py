from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
from typing import Any, Dict, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ProctoringException(HTTPException):
    def __init__(
        self,
        status_code: int,
        detail: str,
        error_code: Optional[str] = None,
        additional_info: Optional[Dict[str, Any]] = None
    ):
        super().__init__(status_code=status_code, detail=detail)
        self.error_code = error_code
        self.additional_info = additional_info or {}

class ValidationException(ProctoringException):
    def __init__(self, detail: str, error_code: str = "VALIDATION_ERROR"):
        super().__init__(status_code=400, detail=detail, error_code=error_code)

class AuthenticationException(ProctoringException):
    def __init__(self, detail: str, error_code: str = "AUTH_ERROR"):
        super().__init__(status_code=401, detail=detail, error_code=error_code)

class AuthorizationException(ProctoringException):
    def __init__(self, detail: str, error_code: str = "FORBIDDEN"):
        super().__init__(status_code=403, detail=detail, error_code=error_code)

class ResourceNotFoundException(ProctoringException):
    def __init__(self, detail: str, error_code: str = "NOT_FOUND"):
        super().__init__(status_code=404, detail=detail, error_code=error_code)

class ServerException(ProctoringException):
    def __init__(self, detail: str, error_code: str = "SERVER_ERROR"):
        super().__init__(status_code=500, detail=detail, error_code=error_code)

async def proctoring_exception_handler(request: Request, exc: ProctoringException) -> JSONResponse:
    """Global exception handler for ProctoringException"""
    logger.error(f"Error occurred: {exc.detail}", extra={
        "error_code": exc.error_code,
        "additional_info": exc.additional_info,
        "path": request.url.path,
        "method": request.method
    })
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.error_code,
                "message": exc.detail,
                "additional_info": exc.additional_info
            }
        }
    )

async def validation_exception_handler(request: Request, exc: ValidationException) -> JSONResponse:
    """Handler for validation errors"""
    logger.warning(f"Validation error: {exc.detail}", extra={
        "error_code": exc.error_code,
        "path": request.url.path,
        "method": request.method
    })
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.error_code,
                "message": exc.detail,
                "additional_info": exc.additional_info
            }
        }
    )

async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Global exception handler for unhandled exceptions"""
    logger.error(f"Unhandled error: {str(exc)}", exc_info=True, extra={
        "path": request.url.path,
        "method": request.method
    })
    
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred",
                "additional_info": {"original_error": str(exc)}
            }
        }
    ) 