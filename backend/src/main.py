import os
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Union
from enum import Enum
import time
import psutil
from pathlib import Path

from fastapi import (
    FastAPI, HTTPException, Depends, Header, 
    status, Request, BackgroundTasks
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, HttpUrl

# Local imports
from .database import init_db, close_db, get_database
from .models.mongodb_models import (
    Wallet, Transaction, Block, MemoryItem, 
    Conversation, Message, Feedback, MessageRole,
    TransactionType, FeedbackType
)
from .core.config import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('app.log')
    ]
)
logger = logging.getLogger(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="LocalGPT Backend",
    description="Backend service for LocalGPT with blockchain memory",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    debug=settings.DEBUG
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add startup and shutdown event handlers
@app.on_event("startup")
async def startup_db_client():
    """Initialize services and database connections on startup"""
    try:
        # Initialize MongoDB connection
        await init_db()
        
        # Verify database connection
        db = await get_database()
        await db.command('ping')
        
        # Initialize model manager and memory system
        app.state.model_manager = ModelManager()
        app.state.memory_system = MemorySystem(
            model_manager=app.state.model_manager,
            index_path=settings.MEMORY_INDEX_PATH
        )
        
        # Initialize blockchain client
        app.state.blockchain_client = BlockchainClient(
            blockchain_url=settings.BLOCKCHAIN_SERVICE
        )
        
        logger.info("Application startup complete")
        
    except Exception as e:
        logger.error(f"Error during startup: {str(e)}", exc_info=True)
        raise

@app.on_event("shutdown")
async def shutdown_db_client():
    """Cleanup resources on shutdown"""
    try:
        await close_db()
        
        # Close model manager and memory system if they exist
        if hasattr(app.state, 'model_manager'):
            if hasattr(app.state.model_manager, 'close'):
                await app.state.model_manager.close()
                
        if hasattr(app.state, 'memory_system'):
            if hasattr(app.state.memory_system, 'close'):
                await app.state.memory_system.close()
                
        # Close blockchain client
        if hasattr(app.state, 'blockchain_client'):
            if hasattr(app.state.blockchain_client, 'close'):
                await app.state.blockchain_client.close()
                
        logger.info("Application shutdown complete")
        
    except Exception as e:
        logger.error(f"Error during shutdown: {str(e)}", exc_info=True)

memory_system = MemorySystem(
    index_path=settings.MEMORY_INDEX_PATH,
    embedding_model=settings.EMBEDDING_MODEL
)

model_manager = ModelManager(
    model_name=settings.MODEL_NAME,
    model_path=settings.MODEL_PATH
)

# Request/Response Models
class ChatRequest(BaseModel):
    """Request model for chat endpoint."""
    message: str = Field(..., min_length=1, max_length=1000, description="User's message")
    user_id: str = Field(..., min_length=1, max_length=100, description="Unique user identifier")
    conversation_id: Optional[str] = Field(
        None,
        description="Optional conversation ID to continue an existing conversation"
    )
    context: Optional[Dict[str, Any]] = Field(
        None,
        description="Additional context for the conversation"
    )
    
    class Config:
        schema_extra = {
            "example": {
                "message": "What is the capital of France?",
                "user_id": "user123",
                "conversation_id": "conv_abc123",
                "context": {"location": "US"}
            }
        }
    context: Optional[Dict[str, Any]] = None

class ChatResponse(BaseModel):
    response: str
    response_id: str
    used_memories: List[Dict[str, Any]]

class FeedbackRequest(BaseModel):
    response_id: str
    feedback_type: str  # "like", "dislike", "rating", "comment"
    rating: Optional[float] = None
    comment: Optional[str] = None

# Helper function to verify wallet authorization
async def verify_wallet(authorization: str = Header(...)) -> str:
    """Verify wallet authorization header"""
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header"
        )
    wallet_address = authorization[7:]  # Remove 'Bearer ' prefix
    
    # Check if wallet exists, if not create it
    wallet = await Wallet.find_one(Wallet.address == wallet_address)
    if not wallet:
        wallet = Wallet(
            address=wallet_address,
            balance=settings.DEFAULT_WALLET_BALANCE,
            metadata={"created_at": datetime.utcnow()}
        )
        await wallet.create()
        logger.info(f"Created new wallet: {wallet_address}")
    
    return wallet_address

# API Endpoints
@app.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    wallet_address: str = Depends(verify_wallet)
):
    """
    Process a chat message and return a response.
    """
    try:
        # Get or create conversation
        conversation_id = request.context.get("conversation_id") if request.context else None
        if conversation_id:
            conversation = await Conversation.get(conversation_id)
            if not conversation:
                raise HTTPException(status_code=404, detail="Conversation not found")
        else:
            # Create new conversation
            conversation = Conversation(
                title=request.message[:50],  # First 50 chars as title
                user_id=wallet_address,
                messages=[],
                metadata={
                    "created_at": datetime.utcnow(),
                    "model": settings.MODEL_NAME
                }
            )
            await conversation.create()
        
        # Add user message to conversation
        user_message = Message(
            role=MessageRole.USER,
            content=request.message,
            metadata={"timestamp": datetime.utcnow()}
        )
        
        # Log the interaction in the background
        background_tasks.add_task(
            _log_interaction,
            user_id=request.user_id,
            wallet_address=wallet_address,
            conversation_id=result["conversation_id"],
            message=request.message,
            response=result["response"]
        )
        
        return result
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error in chat endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while processing your request"
        )

async def _log_interaction(
    user_id: str,
    wallet_address: str,
    conversation_id: str,
    message: str,
    response: str
):
    """Log the interaction details asynchronously."""
    try:
        # This could be extended to log to a separate analytics database
        logger.info(
            f"Chat interaction - "
            f"user: {user_id}, "
            f"wallet: {wallet_address}, "
            f"conversation: {conversation_id}, "
            f"message_length: {len(message)}, "
            f"response_length: {len(response)}"
        )
    except Exception as e:
        logger.error(f"Error logging interaction: {str(e)}", exc_info=True)

@app.post("/feedback")
async def submit_feedback(
    request: FeedbackRequest,
    wallet_address: str = Depends(verify_wallet)
):
    """
    Submit feedback for a previous response.
    """
    try:
        # Create feedback record
        feedback = Feedback(
            message_id=request.response_id,
            conversation_id=request.conversation_id,
            rating=request.rating,
            comment=request.comment,
            user_id=wallet_address,
            metadata={
                "timestamp": datetime.utcnow(),
                "feedback_type": request.feedback_type
            }
        )
        await feedback.create()
        
        # If the feedback is positive, we can use it to improve the model
        if request.rating and request.rating >= 4:
            try:
                # Get the conversation to update its metadata
                conversation = await Conversation.get(ObjectId(request.conversation_id))
                if conversation:
                    if not conversation.metadata:
                        conversation.metadata = {}
                    
                    # Track feedback in conversation metadata
                    if "feedback" not in conversation.metadata:
                        conversation.metadata["feedback"] = []
                    
                    conversation.metadata["feedback"].append({
                        "response_id": request.response_id,
                        "feedback_type": request.feedback_type,
                        "rating": request.rating,
                        "timestamp": datetime.utcnow().isoformat()
                    })
                    
                    # Update conversation's average rating
                    feedback_ratings = [
                        f.get("rating") 
                        for f in conversation.metadata.get("feedback", []) 
                        if f.get("rating") is not None
                    ]
                    
                    if feedback_ratings:
                        conversation.metadata["average_rating"] = sum(feedback_ratings) / len(feedback_ratings)
                    
                    await conversation.save()
            except Exception as e:
                logger.warning(f"Could not update conversation with feedback: {str(e)}")
        
        # Update memory item with feedback
        if not hasattr(memory_item, "feedback"):
            memory_item.feedback = []
            
        memory_item.feedback.append({
            "feedback_type": request.feedback_type,
            "rating": request.rating,
            "comment": request.comment,
            "created_at": datetime.utcnow()
        })
        
        # Update average rating if rating is provided
        if request.rating is not None:
            if memory_item.metadata is None:
                memory_item.metadata = {}
                
            if "ratings" not in memory_item.metadata:
                memory_item.metadata["ratings"] = {
                    "count": 0,
                    "average": 0.0,
                    "total": 0.0
                }
                
            # Update rating statistics
            ratings = memory_item.metadata["ratings"]
            ratings["count"] += 1
            ratings["total"] += request.rating
            ratings["average"] = ratings["total"] / ratings["count"]
        
        await memory_item.save()
        
        # If feedback is positive, we might want to reinforce the memory
        if request.feedback_type == FeedbackType.POSITIVE and request.rating and request.rating >= 4:
            try:
                boost_factor = min(1.0, (float(request.rating) - 3) / 2)  # Scale 4-5 to 0.5-1.0
                await app.state.memory_system.reinforce(
                    memory_id=request.response_id,
                    boost=boost_factor
                )
                logger.info(f"Reinforced memory {request.response_id} with boost {boost_factor}")
            except Exception as e:
                logger.error(f"Error reinforcing memory: {str(e)}", exc_info=True)
        
        # Create a small reward for providing feedback
        reward_amount = 0.05  # Small reward for feedback
        try:
            tx = await app.state.blockchain_client.submit_transaction(
                from_address=settings.REWARD_WALLET_ADDRESS or "system_rewards",
                to_address=wallet_address,
                amount=reward_amount,
                tx_type=TransactionType.REWARD,
                metadata={
                    "reward_type": "feedback",
                    "response_id": request.response_id,
                    "feedback_id": str(feedback.id),
                    "rating": request.rating
                }
            )
            logger.info(f"Created feedback reward transaction: {tx['tx_hash']}")
            
        except Exception as e:
            logger.error(f"Error creating feedback reward: {str(e)}")
            # Don't fail the request if reward fails
        
        return {
            "status": "success", 
            "message": "Thank you for your feedback!",
            "feedback_id": str(feedback.id),
            "reward_amount": reward_amount if request.rating and request.rating >= 3 else 0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in feedback endpoint: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An error occurred while processing your feedback"
        )

@app.get(
    "/health",
    status_code=status.HTTP_200_OK,
    summary="Health Check",
    description="Check the health status of the service and its dependencies"
)
async def health_check():
    """
    Health check endpoint that verifies the status of all critical services.
    
    Returns:
        Dict containing the health status of all services
    """
    try:
        # Check MongoDB connection
        db = await get_database()
        await db.command('ping')
        
        # Check blockchain service
        blockchain_health = await app.state.blockchain_client.check_health()
        
        # Check memory system
        memory_health = await app.state.memory_system.check_health()
        
        # Check model manager
        model_health = {
            "status": "healthy" if app.state.model_manager.is_ready() else "unhealthy",
            "model": app.state.model_manager.model_name,
            "device": app.state.model_manager.device
        }
        
        # Check if all services are healthy
        all_healthy = all([
            blockchain_health.get("status") == "healthy",
            memory_health.get("status") == "healthy",
            model_health["status"] == "healthy"
        ])
        
        return {
            "status": "healthy" if all_healthy else "degraded",
            "timestamp": datetime.utcnow().isoformat(),
            "version": "1.0.0",  # Should come from settings
            "services": {
                "mongodb": {"status": "healthy"},
                "blockchain": blockchain_health,
                "memory_system": memory_health,
                "model_manager": model_health
            }
        }
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}", exc_info=True)
        return {
            "status": "unhealthy",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e),
            "services": {
                "mongodb": {"status": "unhealthy", "error": str(e)},
                "blockchain": {"status": "unknown"},
                "memory_system": {"status": "unknown"},
                "model_manager": {"status": "unknown"}
            }
        }

@app.get(
    "/metrics",
    response_model=Dict[str, Any],
    summary="Service Metrics",
    description="Get operational metrics for the service"
)
async def get_metrics():
    """
    Returns operational metrics for monitoring and observability.
    
    Metrics include:
    - Conversation and message counts
    - Memory usage statistics
    - Model inference metrics
    - Blockchain transaction metrics
    """
    try:
        # Get basic counts from MongoDB
        db = await get_database()
        
        metrics = {
            "timestamp": datetime.utcnow().isoformat(),
            "conversations": {
                "total": await db.conversations.count_documents({}),
                "last_24h": await db.conversations.count_documents({
                    "created_at": {"$gte": datetime.utcnow() - timedelta(hours=24)}
                })
            },
            "messages": {
                "total": await db.messages.count_documents({}),
                "last_24h": await db.messages.count_documents({
                    "created_at": {"$gte": datetime.utcnow() - timedelta(hours=24)}
                })
            },
            "feedback": {
                "total": await db.feedback.count_documents({}),
                "by_type": {
                    "positive": await db.feedback.count_documents({"feedback_type": "positive"}),
                    "negative": await db.feedback.count_documents({"feedback_type": "negative"}),
                    "neutral": await db.feedback.count_documents({"feedback_type": "neutral"})
                },
                "average_rating": await db.feedback.aggregate([
                    {"$match": {"rating": {"$ne": None}}},
                    {"$group": {"_id": None, "avg_rating": {"$avg": "$rating"}}}
                ]).to_list(1) or [{"avg_rating": 0}]
            },
            "blockchain": {
                "wallets": await db.wallets.count_documents({}),
                "transactions": await db.transactions.count_documents({}),
                "blocks": await db.blocks.count_documents({})
            },
            "system": {
                "memory_usage_mb": await _get_process_memory_mb(),
                "cpu_percent": await _get_cpu_percent(),
                "uptime_seconds": time.time() - _start_time
            }
        }
        
        # Get memory system metrics if available
        if hasattr(app.state.memory_system, 'get_metrics'):
            metrics["memory_system"] = await app.state.memory_system.get_metrics()
            
        # Get model manager metrics if available
        if hasattr(app.state.model_manager, 'get_metrics'):
            metrics["model_manager"] = await app.state.model_manager.get_metrics()
            
        return metrics
        
    except Exception as e:
        logger.error(f"Failed to collect metrics: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to collect metrics"
        )

# Track application start time
_start_time = time.time()

async def _get_process_memory_mb() -> float:
    """Get current process memory usage in MB."""
    process = psutil.Process()
    return process.memory_info().rss / 1024 / 1024  # Convert to MB

async def _get_cpu_percent() -> float:
    """Get current CPU usage percentage."""
    return psutil.cpu_percent(interval=0.1)

# Add exception handler for validation errors
@app.exception_handler(ValueError)
async def validation_exception_handler(request: Request, exc: ValueError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": str(exc)}
    )

# Run with: uvicorn main:app --reload --host 0.0.0.0 --port 8000
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        reload=settings.DEBUG,
        log_level="info" if settings.DEBUG else "warning"
    )
