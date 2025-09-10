import os
import json
import logging
import httpx
from typing import Dict, Any, List, Optional, Union
from datetime import datetime
from pydantic import BaseModel, HttpUrl

from .database.mongodb import get_database
from .models.mongodb_models import Wallet, Transaction, Block, TransactionType

class BlockchainClient:
    """Client for interacting with the blockchain service."""
    
    def __init__(self, blockchain_url: str = "http://blockchain:5000"):
        """
        Initialize the blockchain client.
        
        Args:
            blockchain_url: Base URL of the blockchain service
        """
        self.base_url = blockchain_url.rstrip('/')
        self.client = httpx.AsyncClient()
        self.logger = logging.getLogger(__name__)
    
    async def _get_database(self):
        """Get MongoDB database instance."""
        return await get_database()
    
    async def create_wallet(self) -> Dict[str, Any]:
        """
        Create a new wallet.
        
        Returns:
            Dict containing wallet address and private key
        """
        try:
            wallet = Wallet()
            await wallet.create()
            
            self.logger.info(f"Created new wallet: {wallet.address}")
            return {
                "address": wallet.address,
                "private_key": wallet.private_key,
                "balance": wallet.balance
            }
        except Exception as e:
            self.logger.error(f"Error creating wallet: {str(e)}")
            raise
    
    async def get_balance(self, wallet_address: str) -> float:
        """
        Get the balance of a wallet.
        
        Args:
            wallet_address: Wallet address to check balance for
            
        Returns:
            Current balance
        """
        try:
            wallet = await Wallet.find_one(Wallet.address == wallet_address)
            if not wallet:
                self.logger.warning(f"Wallet not found: {wallet_address}")
                return 0.0
            return float(wallet.balance)
        except Exception as e:
            self.logger.error(f"Error getting balance for {wallet_address}: {str(e)}")
            raise
    
    async def create_memory_transaction(
        self,
        wallet_address: str,
        content: str,
        memory_id: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a memory transaction on the blockchain.
        
        Args:
            wallet_address: Address of the wallet creating the transaction
            content: Content of the memory
            memory_id: Unique ID for the memory
            metadata: Additional metadata about the memory
            
        Returns:
            Transaction details
        """
        try:
            tx = Transaction(
                from_address=wallet_address,
                to_address="memory_system",
                amount=0,  # No value transfer for memory storage
                tx_type=TransactionType.DATA,
                status="pending",
                metadata={
                    "type": "memory_store",
                    "content": content[:1000],  # Store first 1000 chars as preview
                    "memory_id": memory_id,
                    **(metadata or {})
                }
            )
            
            await tx.create()
            self.logger.info(f"Created memory transaction: {tx.id}")
            
            return {
                "tx_hash": str(tx.id),
                "status": tx.status,
                "timestamp": tx.created_at.isoformat()
            }
        except Exception as e:
            self.logger.error(f"Error creating memory transaction: {str(e)}")
            raise
    
    async def submit_transaction(
        self,
        from_address: str,
        to_address: str,
        amount: float,
        tx_type: str = "transfer",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Submit a transaction to the blockchain.
        
        Args:
            from_address: Sender's wallet address
            to_address: Recipient's wallet address
            amount: Amount to transfer (must be positive)
            tx_type: Type of transaction (e.g., 'transfer', 'reward', 'fee')
            metadata: Additional transaction metadata
            
        Returns:
            Transaction details
        """
        if amount <= 0:
            raise ValueError("Amount must be positive")
            
        # Get sender wallet
        from_wallet = await Wallet.find_one(Wallet.address == from_address)
        if not from_wallet:
            raise ValueError(f"Sender wallet not found: {from_address}")
            
        # Check balance if not a reward transaction
        if tx_type != "reward" and from_wallet.balance < amount:
            raise ValueError("Insufficient balance")
        
        # Get or create recipient wallet
        to_wallet = await Wallet.find_one(Wallet.address == to_address)
        if not to_wallet and tx_type == "reward":
            # Auto-create wallet for rewards if it doesn't exist
            to_wallet = Wallet(address=to_address, balance=0)
            await to_wallet.create()
        elif not to_wallet:
            raise ValueError(f"Recipient wallet not found: {to_address}")
        
        try:
            # Create transaction
            tx = Transaction(
                from_address=from_address,
                to_address=to_address,
                amount=float(amount),
                fee=0.0,  # Could be calculated based on tx size or other factors
                tx_type=tx_type,
                status="pending",
                metadata=metadata or {}
            )
            
            # Update balances
            if tx_type != "reward":
                from_wallet.balance -= amount
                from_wallet.nonce += 1
                await from_wallet.save()
                
            to_wallet.balance += amount
            if tx_type == "reward":
                to_wallet.nonce += 1
            await to_wallet.save()
            
            # Update transaction status
            tx.status = "completed"
            await tx.create()
            
            self.logger.info(
                f"Transaction {tx.id} completed: "
                f"{from_address} -> {to_address} ({amount} {tx_type})"
            )
            
            return {
                "tx_hash": str(tx.id),
                "from": from_address,
                "to": to_address,
                "amount": amount,
                "fee": tx.fee,
                "type": tx_type,
                "status": tx.status,
                "timestamp": tx.created_at.isoformat()
            }
            
        except Exception as e:
            # Revert balance changes if transaction fails
            if tx and tx_type != "reward":
                from_wallet.balance += amount
                from_wallet.nonce -= 1
                await from_wallet.save()
                
            to_wallet.balance -= amount
            if tx_type == "reward":
                to_wallet.nonce -= 1
            await to_wallet.save()
            
            self.logger.error(f"Transaction failed: {str(e)}")
            raise
    
    async def get_transaction(self, tx_hash: str) -> Optional[Dict[str, Any]]:
        """
        Get transaction details by hash.
        
        Args:
            tx_hash: Transaction hash (MongoDB _id)
            
        Returns:
            Transaction details or None if not found
        """
        try:
            from bson import ObjectId
            
            tx = await Transaction.get(ObjectId(tx_hash))
            if not tx:
                return None
                
            return await self._format_transaction(tx)
            
        except Exception as e:
            self.logger.error(f"Error getting transaction {tx_hash}: {str(e)}")
            return None
    
    async def get_block(self, block_number: int) -> Optional[Dict[str, Any]]:
        """
        Get block details by number.
        
        Args:
            block_number: Block number
            
        Returns:
            Block details or None if not found
        """
        try:
            block = await Block.find_one(Block.block_number == block_number)
            if not block:
                return None
                
            return await self._format_block(block)
            
        except Exception as e:
            self.logger.error(f"Error getting block {block_number}: {str(e)}")
            return None
    
    async def get_latest_block(self) -> Optional[Dict[str, Any]]:
        """
        Get the latest block in the blockchain.
        
        Returns:
            Latest block details or None if no blocks exist
        """
        try:
            block = await Block.find().sort(-Block.block_number).limit(1).to_list(1)
            if not block:
                return None
                
            return await self._format_block(block[0])
            
        except Exception as e:
            self.logger.error(f"Error getting latest block: {str(e)}")
            return None
    
    async def get_transactions_by_address(
        self,
        address: str,
        limit: int = 10,
        offset: int = 0
    ) -> Dict[str, Any]:
        """
        Get transactions for a specific address.
        
        Args:
            address: Wallet address
            limit: Maximum number of transactions to return (max 100)
            offset: Number of transactions to skip
            
        Returns:
            Dictionary containing transactions and pagination info
        """
        try:
            # Validate limit
            limit = min(max(1, limit), 100)
            
            # Query transactions where address is either sender or recipient
            query = {
                "$or": [
                    {"from_address": address},
                    {"to_address": address}
                ]
            }
            
            # Get total count for pagination
            total = await Transaction.find(query).count()
            
            # Get paginated transactions
            transactions = await Transaction.find(query) \
                .sort(-Transaction.created_at) \
                .skip(offset) \
                .limit(limit) \
                .to_list()
            
            # Format transactions
            formatted_txs = [
                await self._format_transaction(tx) 
                for tx in transactions
            ]
            
            return {
                "transactions": formatted_txs,
                "pagination": {
                    "total": total,
                    "count": len(formatted_txs),
                    "limit": limit,
                    "offset": offset,
                    "has_more": (offset + len(formatted_txs)) < total
                }
            }
            
        except Exception as e:
            self.logger.error(f"Error getting transactions for {address}: {str(e)}")
            return {"transactions": [], "pagination": {"total": 0, "count": 0, "limit": limit, "offset": offset, "has_more": False}}
    
    async def _format_transaction(self, tx: Transaction) -> Dict[str, Any]:
        """Format a transaction for API response."""
        return {
            "tx_hash": str(tx.id),
            "from": tx.from_address,
            "to": tx.to_address,
            "amount": float(tx.amount),
            "fee": float(tx.fee) if hasattr(tx, 'fee') else 0.0,
            "type": tx.tx_type,
            "status": tx.status,
            "block_number": tx.block_number,
            "timestamp": tx.created_at.isoformat(),
            "metadata": tx.metadata or {}
        }
    
    async def _format_block(self, block: Block) -> Dict[str, Any]:
        """Format a block for API response."""
        # Get transactions for this block
        transactions = await Transaction.find(
            Transaction.block_number == block.block_number
        ).to_list()
        
        return {
            "block_number": block.block_number,
            "hash": block.hash,
            "previous_hash": block.previous_hash,
            "timestamp": block.timestamp.isoformat(),
            "miner": block.miner,
            "difficulty": block.difficulty,
            "nonce": block.nonce,
            "transaction_count": len(block.transactions or []),
            "transactions": [
                await self._format_transaction(tx) 
                for tx in transactions
            ],
            "metadata": block.metadata or {}
        }
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()
    
    async def check_health(self) -> Dict[str, Any]:
        """Check the health of the blockchain service."""
        try:
            response = await self.client.get(f"{self.base_url}/health")
            response.raise_for_status()
            return {
                "status": "ok",
                "blockchain": {
                    "chain_length": response.json().get("chain_length", 0),
                    "pending_transactions": response.json().get("pending_transactions", 0)
                }
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e)
            }
