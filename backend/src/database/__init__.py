"""
Database package for LocalGPT.

This package contains all database-related code, including:
- Database connection management
- Database models
- Database migrations
- Database utilities
"""

# Import database components for easier access
from .mongodb import MongoDB, get_database

# Initialize database connection
async def init_db():
    """Initialize the database connection."""
    await MongoDB.connect_to_mongo()

# Close database connection
async def close_db():
    """Close the database connection."""
    await MongoDB.close_mongo_connection()

# Export database components
__all__ = [
    'MongoDB',
    'get_database',
    'init_db',
    'close_db',
]
