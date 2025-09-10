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
    merkle_root: str


class Block(BaseModel):
    """A block in the blockchain containing transactions."""
    header: BlockHeader
    transactions: List[Dict[str, Any]] = Field(default_factory=list)
    hash: Optional[str] = None

    class Config:
        json_encoders = {
            'BlockHeader': lambda v: v.dict(),
        }

    def compute_hash(self) -> str:
        """Compute the hash of the block."""
        block_string = json.dumps({
            "header": self.header.dict(),
            "transactions": self.transactions
        }, sort_keys=True).encode()
        return hashlib.sha256(block_string).hexdigest()

    def mine(self, difficulty: int) -> None:
        ""
        Mine the block by finding a nonce that satisfies the difficulty.
        
        Args:
            difficulty: The number of leading zeros required in the hash.
        """
        self.hash = self.compute_hash()
        target = '0' * difficulty
        
        while not self.hash.startswith(target):
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
