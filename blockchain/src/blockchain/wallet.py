import binascii
import hashlib
import json
import os
from typing import Dict, List, Optional, Tuple

from ecdsa import SigningKey, SECP256k1, VerifyingKey

from .transaction import Transaction, TransactionInput, TransactionOutput, TransactionType


class Wallet:
    """A wallet for managing keys and creating transactions."""
    
    def __init__(self, private_key: Optional[str] = None):
        """Initialize a wallet with an existing private key or generate a new one."""
        if private_key:
            self.private_key = SigningKey.from_string(
                binascii.unhexlify(private_key),
                curve=SECP256k1
            )
        else:
            self.private_key = SigningKey.generate(curve=SECP256k1)
        
        self.public_key = self.private_key.get_verifying_key()
    
    @property
    def address(self) -> str:
        """Get the wallet address (derived from public key)."""
        # Double hash the public key for the address
        public_key_bytes = self.public_key.to_string()
        sha256_hash = hashlib.sha256(public_key_bytes).hexdigest()
        ripemd160_hash = hashlib.new('ripemd160', sha256_hash.encode()).hexdigest()
        return ripemd160_hash
    
    def sign(self, data: Dict) -> str:
        """Sign a transaction or other data."""
        if isinstance(data, dict):
            data_str = json.dumps(data, sort_keys=True)
        else:
            data_str = str(data)
        
        signature = self.private_key.sign(
            data_str.encode(),
            hashfunc=hashlib.sha256
        )
        return binascii.hexlify(signature).decode()
    
    def create_transaction(
        self,
        recipient_address: str,
        amount: float,
        tx_type: TransactionType = TransactionType.TRANSFER,
        data: Optional[Dict] = None
    ) -> Transaction:
        """Create a new transaction."""
        # For now, we'll assume the inputs will be added later by the blockchain
        output = TransactionOutput(
            amount=amount,
            address=recipient_address,
            data=data
        )
        
        tx = Transaction(
            tx_type=tx_type,
            outputs=[output],
            sender_address=self.address
        )
        
        # Sign the transaction
        tx.signature = self.sign({
            "tx_type": tx.tx_type,
            "outputs": [o.dict() for o in tx.outputs],
            "timestamp": tx.timestamp,
            "sender_address": tx.sender_address
        })
        
        return tx
    
    def create_memory_transaction(
        self,
        memory_data: Dict[str, Any]
    ) -> Transaction:
        """Create a memory transaction."""
        signature = self.sign(memory_data)
        return Transaction.create_memory_tx(
            sender_address=self.address,
            memory_data=memory_data,
            signature=signature
        )
    
    def create_feedback_transaction(
        self,
        response_id: str,
        feedback_type: str,
        feedback_data: Dict[str, Any]
    ) -> Transaction:
        """Create a feedback transaction."""
        data_to_sign = {
            "response_id": response_id,
            "feedback_type": feedback_type,
            **feedback_data
        }
        signature = self.sign(data_to_sign)
        
        return Transaction.create_feedback_tx(
            sender_address=self.address,
            response_id=response_id,
            feedback_type=feedback_type,
            feedback_data=feedback_data,
            signature=signature
        )
    
    def export_private_key(self) -> str:
        """Export the private key as a hexadecimal string."""
        return binascii.hexlify(self.private_key.to_string()).decode()
    
    @classmethod
    def verify_signature(
        cls,
        public_key_hex: str,
        data: Dict,
        signature_hex: str
    ) -> bool:
        """Verify a signature with a public key."""
        try:
            if isinstance(data, dict):
                data_str = json.dumps(data, sort_keys=True)
            else:
                data_str = str(data)
            
            vk = VerifyingKey.from_string(
                binascii.unhexlify(public_key_hex),
                curve=SECP256k1
            )
            
            return vk.verify(
                binascii.unhexlify(signature_hex),
                data_str.encode(),
                hashfunc=hashlib.sha256
            )
        except Exception:
            return False
