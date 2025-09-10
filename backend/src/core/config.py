from pydantic import BaseSettings
from typing import Optional
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings(BaseSettings):
    # Application Settings
    APP_NAME: str = "LocalGPT"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() in ("true", "1", "t")
    
    # Server Settings
    BACKEND_HOST: str = os.getenv("BACKEND_HOST", "0.0.0.0")
    BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", 8000))
    
    # MongoDB Settings
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    MONGODB_DB: str = os.getenv("MONGODB_DB", "localgpt")
    
    # JWT Settings
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "your-secret-key-here")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", 1440))
    
    # CORS Settings
    CORS_ORIGINS: list = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:8000").split(",")
    
    # AI Model Settings
    MODEL_NAME: str = os.getenv("MODEL_NAME", "distilgpt2")
    EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")
    
    # Blockchain Settings
    BLOCKCHAIN_NETWORK_ID: str = os.getenv("BLOCKCHAIN_NETWORK_ID", "localgpt")
    BLOCKCHAIN_DIFFICULTY: int = int(os.getenv("BLOCKCHAIN_DIFFICULTY", 4))
    BLOCKCHAIN_MINING_REWARD: float = float(os.getenv("BLOCKCHAIN_MINING_REWARD", 100))
    
    # Wallet Settings
    DEFAULT_WALLET_BALANCE: float = float(os.getenv("DEFAULT_WALLET_BALANCE", 1000))
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# Create settings instance
settings = Settings()
