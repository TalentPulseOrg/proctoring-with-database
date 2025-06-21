import os
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
load_dotenv()

# Database configuration
DB_SERVER = os.getenv("DB_SERVER", ".\SQLEXPRESS")
DB_NAME = os.getenv("DB_NAME", "test")
DB_USER = os.getenv("DB_USER", "preet")
DB_PASSWORD = os.getenv("DB_PASSWORD", "preet")
DB_DRIVER = os.getenv("DB_DRIVER", "ODBC Driver 17 for SQL Server")
DB_TRUSTED_CONNECTION = os.getenv("DB_TRUSTED_CONNECTION", "no")

# API configuration
API_SECRET_KEY = os.getenv("API_SECRET_KEY", "your-secret-key")
API_ALGORITHM = os.getenv("API_ALGORITHM", "HS256")
API_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("API_ACCESS_TOKEN_EXPIRE_MINUTES", 30))

# Application settings
DEBUG = os.getenv("DEBUG", "True").lower() in ("true", "1", "t") 