from datetime import datetime
from typing import List, Optional, Dict, Any
from beanie import Document, Indexed, PydanticObjectId
from pydantic import Field, BaseModel
from enum import Enum

# Base model for common fields
class BaseDocument(Document):
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        use_state_management = True
        use_revision = True

# Enums
class TransactionType(str, Enum):
    TRANSFER = "transfer"
    REWARD = "reward"
    FEE = "fee"

class MessageRole(str, Enum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"

# Models
class Wallet(BaseDocument):
    address: str = Field(..., unique=True)
    private_key: str
    balance: float = 0.0
    nonce: int = 0
    metadata: Dict[str, Any] = {}

    class Settings:
        name = "wallets"
        indexes = ["address"]

class Transaction(BaseDocument):
    tx_hash: str = Field(..., unique=True)
    from_address: str
    to_address: str
    amount: float
    fee: float = 0.0
    tx_type: TransactionType
    status: str = "pending"
    block_number: Optional[int] = None
    metadata: Dict[str, Any] = {}

    class Settings:
        name = "transactions"
        indexes = ["tx_hash", "from_address", "to_address", "block_number"]

class Block(BaseDocument):
    block_number: int = Field(..., unique=True)
    previous_hash: str
    timestamp: datetime
    transactions: List[PydanticObjectId] = []
    nonce: int
    hash: str
    miner: str
    difficulty: int
    metadata: Dict[str, Any] = {}

    class Settings:
        name = "blocks"
        indexes = ["block_number", "hash", "miner"]

class MemoryItem(BaseDocument):
    content: str
    embedding: List[float]
    metadata: Dict[str, Any] = {}
    tags: List[str] = []
    source: Optional[str] = None
    importance: float = 1.0
    last_accessed: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "memories"
        indexes = [
            [("content", "text")],  # Text index for search
            "tags",
            "source",
            [("embedding", "vector")]  # Vector index for similarity search
        ]

class Message(BaseModel):
    role: MessageRole
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = {}

class Conversation(BaseDocument):
    title: str
    messages: List[Message] = []
    user_id: str
    is_active: bool = True
    metadata: Dict[str, Any] = {}
    tags: List[str] = []

    class Settings:
        name = "conversations"
        indexes = ["user_id", "is_active", "tags"]

class Feedback(BaseDocument):
    message_id: str
    conversation_id: PydanticObjectId
    rating: int  # 1-5
    comment: Optional[str] = None
    metadata: Dict[str, Any] = {}
    user_id: str

    class Settings:
        name = "feedback"
        indexes = ["message_id", "conversation_id", "user_id"]

# Index models for vector search
class VectorIndexConfig:
    """Configuration for vector indexes"""
    @classmethod
    def get_indexes(cls):
        return [
            {
                "name": "memory_search",
                "fields": [("embedding", "vector")],
                "vectorOptions": {
                    "dimension": 384,  # Should match your embedding dimension
                    "metric": "cosine"
                }
            }
        ]

# Export all models
__all__ = [
    'Wallet',
    'Transaction',
    'Block',
    'MemoryItem',
    'Conversation',
    'Message',
    'Feedback',
    'TransactionType',
    'MessageRole',
    'VectorIndexConfig'
]
