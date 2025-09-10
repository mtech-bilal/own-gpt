#!/usr/bin/env python3
"""
SQLite to MongoDB Migration Script

This script migrates data from SQLite to MongoDB for the LocalGPT application.
It should be run after setting up MongoDB and before switching the application to use MongoDB.
"""
import os
import sys
import sqlite3
import logging
from datetime import datetime
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class SQLiteToMongoDBMigrator:
    def __init__(self, sqlite_db_path: str, mongo_uri: str, mongo_db_name: str):
        """Initialize the migrator with database connection details.
        
        Args:
            sqlite_db_path: Path to the SQLite database file
            mongo_uri: MongoDB connection URI
            mongo_db_name: Name of the MongoDB database
        """
        self.sqlite_db_path = sqlite_db_path
        self.mongo_uri = mongo_uri
        self.mongo_db_name = mongo_db_name
        
        # Initialize connections
        self.sqlite_conn = None
        self.mongo_client = None
        self.mongo_db = None
    
    def connect(self):
        """Establish connections to both databases."""
        try:
            # Connect to SQLite
            logger.info(f"Connecting to SQLite database at {self.sqlite_db_path}")
            self.sqlite_conn = sqlite3.connect(self.sqlite_db_path)
            self.sqlite_conn.row_factory = sqlite3.Row  # Enable column access by name
            
            # Connect to MongoDB
            logger.info(f"Connecting to MongoDB at {self.mongo_uri}")
            self.mongo_client = MongoClient(self.mongo_uri)
            
            # Verify MongoDB connection
            self.mongo_client.admin.command('ping')
            self.mongo_db = self.mongo_client[self.mongo_db_name]
            
            logger.info("Successfully connected to both databases")
            return True
            
        except sqlite3.Error as e:
            logger.error(f"SQLite connection error: {e}")
            return False
        except ConnectionFailure as e:
            logger.error(f"MongoDB connection error: {e}")
            return False
    
    def close(self):
        """Close database connections."""
        if self.sqlite_conn:
            self.sqlite_conn.close()
            logger.info("Closed SQLite connection")
        
        if self.mongo_client:
            self.mongo_client.close()
            logger.info("Closed MongoDB connection")
    
    def migrate_wallets(self):
        """Migrate wallet data from SQLite to MongoDB."""
        logger.info("Starting wallet migration...")
        
        # Create MongoDB collection with validation
        wallets = self.mongo_db.wallets
        
        # Get wallet data from SQLite
        cursor = self.sqlite_conn.cursor()
        cursor.execute("""
            SELECT address, private_key, balance, nonce, created_at, updated_at
            FROM wallets
        """)
        
        migrated_count = 0
        for row in cursor.fetchall():
            wallet_data = {
                'address': row['address'],
                'private_key': row['private_key'],
                'balance': float(row['balance']),
                'nonce': row['nonce'],
                'created_at': datetime.fromisoformat(row['created_at']),
                'updated_at': datetime.fromisoformat(row['updated_at']),
                'metadata': {
                    'migrated_from_sqlite': True,
                    'migration_timestamp': datetime.utcnow()
                }
            }
            
            # Insert into MongoDB
            try:
                wallets.insert_one(wallet_data)
                migrated_count += 1
            except Exception as e:
                logger.error(f"Error migrating wallet {row['address']}: {e}")
        
        logger.info(f"Successfully migrated {migrated_count} wallets")
        return migrated_count
    
    def migrate_transactions(self):
        """Migrate transaction data from SQLite to MongoDB."""
        logger.info("Starting transaction migration...")
        
        # Create MongoDB collection
        transactions = self.mongo_db.transactions
        
        # Get transaction data from SQLite
        cursor = self.sqlite_conn.cursor()
        cursor.execute("""
            SELECT 
                tx_hash, from_address, to_address, amount, fee, 
                tx_type, status, block_number, created_at, updated_at
            FROM transactions
        """)
        
        migrated_count = 0
        for row in cursor.fetchall():
            tx_data = {
                'tx_hash': row['tx_hash'],
                'from_address': row['from_address'],
                'to_address': row['to_address'],
                'amount': float(row['amount']),
                'fee': float(row['fee']) if row['fee'] else 0.0,
                'tx_type': row['tx_type'],
                'status': row['status'],
                'block_number': row['block_number'],
                'created_at': datetime.fromisoformat(row['created_at']),
                'updated_at': datetime.fromisoformat(row['updated_at']),
                'metadata': {
                    'migrated_from_sqlite': True,
                    'migration_timestamp': datetime.utcnow()
                }
            }
            
            # Insert into MongoDB
            try:
                transactions.insert_one(tx_data)
                migrated_count += 1
            except Exception as e:
                logger.error(f"Error migrating transaction {row['tx_hash']}: {e}")
        
        logger.info(f"Successfully migrated {migrated_count} transactions")
        return migrated_count
    
    def migrate_blocks(self):
        """Migrate block data from SQLite to MongoDB."""
        logger.info("Starting block migration...")
        
        # Create MongoDB collection
        blocks = self.mongo_db.blocks
        
        # Get block data from SQLite
        cursor = self.sqlite_conn.cursor()
        cursor.execute("""
            SELECT 
                block_number, previous_hash, timestamp, nonce, 
                hash, miner, difficulty, created_at
            FROM blocks
            ORDER BY block_number
        """)
        
        migrated_count = 0
        for row in cursor.fetchall():
            block_data = {
                'block_number': row['block_number'],
                'previous_hash': row['previous_hash'],
                'timestamp': datetime.fromisoformat(row['timestamp']),
                'nonce': row['nonce'],
                'hash': row['hash'],
                'miner': row['miner'],
                'difficulty': row['difficulty'],
                'created_at': datetime.fromisoformat(row['created_at']),
                'transactions': [],  # Will be populated separately
                'metadata': {
                    'migrated_from_sqlite': True,
                    'migration_timestamp': datetime.utcnow()
                }
            }
            
            # Insert into MongoDB
            try:
                blocks.insert_one(block_data)
                migrated_count += 1
            except Exception as e:
                logger.error(f"Error migrating block {row['block_number']}: {e}")
        
        logger.info(f"Successfully migrated {migrated_count} blocks")
        return migrated_count
    
    def migrate_all(self):
        """Migrate all data from SQLite to MongoDB."""
        if not self.connect():
            logger.error("Failed to connect to databases")
            return False
        
        try:
            # Create indexes in MongoDB
            self._create_indexes()
            
            # Migrate data
            self.migrate_wallets()
            self.migrate_transactions()
            self.migrate_blocks()
            
            logger.info("Migration completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Migration failed: {e}", exc_info=True)
            return False
        finally:
            self.close()
    
    def _create_indexes(self):
        """Create necessary indexes in MongoDB."""
        logger.info("Creating MongoDB indexes...")
        
        # Wallets collection
        self.mongo_db.wallets.create_index("address", unique=True)
        
        # Transactions collection
        self.mongo_db.transactions.create_index("tx_hash", unique=True)
        self.mongo_db.transactions.create_index("from_address")
        self.mongo_db.transactions.create_index("to_address")
        self.mongo_db.transactions.create_index("block_number")
        
        # Blocks collection
        self.mongo_db.blocks.create_index("block_number", unique=True)
        self.mongo_db.blocks.create_index("hash", unique=True)
        self.mongo_db.blocks.create_index("miner")
        
        logger.info("Indexes created successfully")


def main():
    # Configuration - you might want to move these to environment variables
    config = {
        'sqlite_db_path': os.getenv('SQLITE_DB_PATH', '/data/blockchain.db'),
        'mongo_uri': os.getenv('MONGODB_URI', 'mongodb://localgpt:localgpt123@localhost:27017/'),
        'mongo_db_name': os.getenv('MONGODB_DB', 'localgpt')
    }
    
    logger.info("Starting SQLite to MongoDB migration")
    logger.info(f"Configuration: {config}")
    
    # Run migration
    migrator = SQLiteToMongoDBMigrator(
        sqlite_db_path=config['sqlite_db_path'],
        mongo_uri=config['mongo_uri'],
        mongo_db_name=config['mongo_db_name']
    )
    
    if migrator.migrate_all():
        logger.info("Migration completed successfully")
        return 0
    else:
        logger.error("Migration failed")
        return 1


if __name__ == "__main__":
    sys.exit(main())
