import hashlib
import json
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field, validator


class TransactionType(str, Enum):
    """Types of transactions in the blockchain."""
    TRANSFER = "TRANSFER"
    MEMORY = "MEMORY"
    FEEDBACK = "FEEDBACK"
    REWARD = "REWARD"


class TransactionInput(BaseModel):
    """Input for a transaction, referencing a previous output."""
    tx_id: str
    output_index: int
    signature: str


class TransactionOutput(BaseModel):
    """Output for a transaction, specifying amount and recipient."""
    amount: float
    address: str
    data: Optional[Dict[str, Any]] = None


class Transaction(BaseModel):
    """A transaction in the blockchain."""
    tx_id: Optional[str] = None
    tx_type: TransactionType
    inputs: List[TransactionInput] = Field(default_factory=list)
    outputs: List[TransactionOutput] = Field(default_factory=list)
    timestamp: float = Field(default_factory=lambda: datetime.utcnow().timestamp())
    sender_address: Optional[str] = None
    signature: Optional[str] = None

    def __init__(self, **data):
        super().__init__(**data)
        if not self.tx_id:
            self.tx_id = self.compute_hash()

    def compute_hash(self) -> str:
        """Compute the hash of the transaction."""
        tx_data = {
            "tx_type": self.tx_type,
            "inputs": [i.dict() for i in self.inputs],
            "outputs": [o.dict() for o in self.outputs],
            "timestamp": self.timestamp,
            "sender_address": self.sender_address
        }
        tx_string = json.dumps(tx_data, sort_keys=True).encode()
        return hashlib.sha256(tx_string).hexdigest()

    def to_dict(self) -> Dict[str, Any]:
        """Convert transaction to dictionary."""
        return {
            "tx_id": self.tx_id,
            "tx_type": self.tx_type,
            "inputs": [i.dict() for i in self.inputs],
            "outputs": [o.dict() for o in self.outputs],
            "timestamp": self.timestamp,
            "sender_address": self.sender_address,
            "signature": self.signature
        }

    @classmethod
    def create_memory_tx(
        cls,
        sender_address: str,
        memory_data: Dict[str, Any],
        signature: str
    ) -> 'Transaction':
        """Create a memory transaction."""
        output = TransactionOutput(
            amount=0,
            address=sender_address,
            data=memory_data
        )
        
        tx = cls(
            tx_type=TransactionType.MEMORY,
            outputs=[output],
            sender_address=sender_address,
            signature=signature
        )
        
        # Update tx_id after setting all fields
        tx.tx_id = tx.compute_hash()
        return tx

    @classmethod
    def create_feedback_tx(
        cls,
        sender_address: str,
        response_id: str,
        feedback_type: str,
        feedback_data: Dict[str, Any],
        signature: str
    ) -> 'Transaction':
        """Create a feedback transaction."""
        data = {
            "response_id": response_id,
            "feedback_type": feedback_type,
            **feedback_data
        }
        
        output = TransactionOutput(
            amount=0,
            address=sender_address,
            data=data
        )
        
        tx = cls(
            tx_type=TransactionType.FEEDBACK,
            outputs=[output],
            sender_address=sender_address,
            signature=signature
        )
        
        # Update tx_id after setting all fields
        tx.tx_id = tx.compute_hash()
        return tx
