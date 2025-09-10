import hashlib
import json
import time
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class BlockHeader(BaseModel):
    """Block header containing metadata."""
    version: str = "1.0"
    index: int
    previous_hash: str
    timestamp: float = Field(default_factory=time.time)
    nonce: int = 0
    difficulty: int = 4
    merkle_root: str = ""


class Block:
    """A block in the blockchain containing transactions."""
    
    def __init__(self, header: BlockHeader, transactions: List[Dict[str, Any]] = None, hash: str = None):
        self.header = header
        self.transactions = transactions or []
        self.hash = hash or self.compute_hash()
    
    def compute_hash(self) -> str:
        """Compute the hash of the block."""
        block_string = json.dumps({
            "header": self.header.dict(),
            "transactions": self.transactions,
            "nonce": self.header.nonce
        }, sort_keys=True)
        return hashlib.sha256(block_string.encode()).hexdigest()
    
    def mine(self, difficulty: int) -> None:
        """Mine the block with the given difficulty."""
        self.header.difficulty = difficulty
        target = "0" * difficulty
        
        while self.hash is None or not self.hash.startswith(target):
            self.header.nonce += 1
            self.hash = self.compute_hash()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert block to dictionary."""
        return {
            "header": self.header.dict(),
            "transactions": self.transactions,
            "hash": self.hash
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Block':
        """Create a Block from a dictionary."""
        block = cls(
            header=BlockHeader(**data["header"]),
            transactions=data["transactions"],
            hash=data.get("hash")
        )
        return block