from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from ..core.config import settings
from ..models import Block, Transaction, Wallet, MemoryItem, Conversation, Message

class MongoDB:
    client: AsyncIOMotorClient = None
    
    @classmethod
    async def connect_to_mongo(cls):
        """Initialize MongoDB connection"""
        cls.client = AsyncIOMotorClient(settings.MONGODB_URL)
        await init_beanie(
            database=cls.client[settings.MONGODB_DB],
            document_models=[
                Block,
                Transaction,
                Wallet,
                MemoryItem,
                Conversation,
                Message
            ]
        )
        
    @classmethod
    async def close_mongo_connection(cls):
        """Close MongoDB connection"""
        if cls.client:
            cls.client.close()
            cls.client = None

# Dependency to get MongoDB client
async def get_database() -> AsyncIOMotorClient:
    if not MongoDB.client:
        await MongoDB.connect_to_mongo()
    return MongoDB.client[settings.MONGODB_DB]
