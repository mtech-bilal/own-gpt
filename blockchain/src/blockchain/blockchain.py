import json
import os
import time
from typing import Dict, List, Optional, Set, Tuple
import plyvel
from .block import Block, BlockHeader
from .transaction import Transaction, TransactionType


class Blockchain:
    """A simple blockchain implementation."""
    
    def __init__(self, db_path: str = "/data/blockchain"):
        """Initialize the blockchain."""
        self.db_path = db_path
        os.makedirs(db_path, exist_ok=True)
        
        # Initialize Plyvel DB
        self.blocks_db = plyvel.DB(os.path.join(db_path, 'blocks'), create_if_missing=True)
        self.utxo_db = plyvel.DB(os.path.join(db_path, 'utxos'), create_if_missing=True)
        self.wallets_db = plyvel.DB(os.path.join(db_path, 'wallets'), create_if_missing=True)
        
        # Cache for quick access
        self.block_hashes: List[str] = []
        self.unconfirmed_transactions: List[Transaction] = []
        self.known_tx_ids: Set[str] = set()
        
        # Initialize or load blockchain
        self._initialize_blockchain()
    
    def _initialize_blockchain(self) -> None:
        """Initialize the blockchain with genesis block if empty."""
        # Try to get the last block hash
        last_block_hash = self.blocks_db.get(b'last_block')
        if last_block_hash is not None:
            self.block_hashes = json.loads(
                self.blocks_db.get(b'block_hashes').decode()
            )
        else:
            # No blocks yet, create genesis block
            self._create_genesis_block()
    
    def _create_genesis_block(self) -> None:
        """Create the genesis block."""
        genesis_block = Block(
            header=BlockHeader(
                index=0,
                previous_hash="0" * 64,
                timestamp=time.time(),
                merkle_root="0" * 64
            ),
            transactions=[],
        )
        genesis_block.header.merkle_root = self._calculate_merkle_root(genesis_block.transactions)
        genesis_block.mine(difficulty=4)
        
        # Store the genesis block
        self._store_block(genesis_block)
    
    def _store_block(self, block: Block) -> None:
        """Store a block in the database."""
        # Convert block to dictionary and then to JSON
        block_data = json.dumps(block.to_dict()).encode()
        
        # Store the block
        with self.blocks_db.write_batch() as batch:
            batch.put(block.hash.encode(), block_data)
            
            # Update the last block hash
            batch.put(b'last_block', block.hash.encode())
            
            # Update the block hashes list
            self.block_hashes.append(block.hash)
            batch.put(b'block_hashes', json.dumps(self.block_hashes).encode())
        
        # Update UTXO set
        self._update_utxo_set(block)
    
    def _update_utxo_set(self, block: Block) -> None:
        """Update the UTXO set with transactions from a new block."""
        # Process each transaction in the block
        for tx in block.transactions:
            # Add new outputs to UTXO set
            for i, output in enumerate(tx.outputs):
                utxo_key = f"{tx.tx_id}:{i}".encode()
                utxo_data = {
                    "tx_id": tx.tx_id,
                    "output_index": i,
                    "output": output.dict(),
                    "block_hash": block.hash,
                    "spent": False
                }
                self.utxo_db.Put(utxo_key, json.dumps(utxo_data).encode())
            
            # Mark inputs as spent
            for tx_input in tx.inputs:
                utxo_key = f"{tx_input.tx_id}:{tx_input.output_index}".encode()
                if self.utxo_db.Get(utxo_key):
                    utxo_data = json.loads(self.utxo_db.Get(utxo_key).decode())
                    utxo_data["spent"] = True
                    self.utxo_db.Put(utxo_key, json.dumps(utxo_data).encode())
    
    def add_transaction(self, transaction: Transaction) -> bool:
        """Add a new transaction to the mempool."""
        # Basic validation
        if not self._validate_transaction(transaction):
            return False
        
        # Add to mempool
        self.unconfirmed_transactions.append(transaction)
        self.known_tx_ids.add(transaction.tx_id)
        return True
    
    def mine_block(self, miner_address: str) -> Optional[Block]:
        """Mine a new block with unconfirmed transactions."""
        if not self.unconfirmed_transactions:
            return None
        
        # Get previous block
        prev_block = self.get_last_block()
        
        # Create coinbase transaction (mining reward)
        reward_tx = self._create_coinbase_transaction(miner_address)
        
        # Prepare block with transactions
        block = Block(
            header=BlockHeader(
                index=prev_block.header.index + 1,
                previous_hash=prev_block.hash,
                timestamp=time.time(),
                merkle_root=""  # Will be calculated
            ),
            transactions=[reward_tx] + self.unconfirmed_transactions.copy()
        )
        
        # Calculate merkle root
        block.header.merkle_root = self._calculate_merkle_root(block.transactions)
        
        # Mine the block
        block.mine(difficulty=4)
        
        # Store the block
        self._store_block(block)
        
        # Clear mempool
        self.unconfirmed_transactions = []
        
        return block
    
    def _validate_transaction(self, transaction: Transaction) -> bool:
        """Validate a transaction."""
        # Check if transaction already exists
        if transaction.tx_id in self.known_tx_ids:
            return False
        
        # Validate inputs and signatures
        if transaction.tx_type != TransactionType.REWARD:
            input_sum = 0
            output_sum = sum(output.amount for output in transaction.outputs)
            
            for tx_input in transaction.inputs:
                # Check if input exists and is unspent
                utxo_key = f"{tx_input.tx_id}:{tx_input.output_index}".encode()
                try:
                    utxo_data = json.loads(self.utxo_db.Get(utxo_key).decode())
                    if utxo_data["spent"]:
                        return False
                    
                    # Verify signature
                    if not self._verify_transaction_input(transaction, tx_input, utxo_data):
                        return False
                    
                    input_sum += utxo_data["output"]["amount"]
                except KeyError:
                    return False
            
            # Check if inputs cover outputs (except for memory transactions)
            if transaction.tx_type != TransactionType.MEMORY and input_sum < output_sum:
                return False
        
        return True
    
    def _verify_transaction_input(
        self,
        transaction: Transaction,
        tx_input: 'TransactionInput',
        utxo_data: Dict
    ) -> bool:
        """Verify a transaction input's signature."""
        # Implementation depends on your signature scheme
        # This is a simplified version
        try:
            # Get the public key from the previous output
            output = utxo_data["output"]
            public_key_hex = output.get("public_key")
            
            if not public_key_hex:
                return False
            
            # Verify the signature
            # This is a placeholder - implement actual verification based on your crypto
            return True
        except Exception:
            return False
    
    def _create_coinbase_transaction(self, miner_address: str) -> Transaction:
        """Create a coinbase transaction (mining reward)."""
        # In a real implementation, this would include proper coinbase structure
        output = TransactionOutput(
            amount=50,  # Fixed reward amount
            address=miner_address
        )
        
        return Transaction(
            tx_type=TransactionType.REWARD,
            outputs=[output]
        )
    
    def _calculate_merkle_root(self, transactions: List[Transaction]) -> str:
        """Calculate the Merkle root of a list of transactions."""
        if not transactions:
            return ""
        
        # Get transaction hashes
        tx_hashes = [tx.tx_id for tx in transactions]
        
        while len(tx_hashes) > 1:
            # If odd number of hashes, duplicate the last one
            if len(tx_hashes) % 2 != 0:
                tx_hashes.append(tx_hashes[-1])
            
            new_hashes = []
            for i in range(0, len(tx_hashes), 2):
                # Concatenate and hash pairs
                pair_hash = hashlib.sha256(
                    (tx_hashes[i] + tx_hashes[i+1]).encode()
                ).hexdigest()
                new_hashes.append(pair_hash)
            
            tx_hashes = new_hashes
        
        return tx_hashes[0]
    
    def get_block(self, block_hash: str) -> Optional[Block]:
        """Get a block by its hash."""
        try:
            block_data = self.blocks_db.Get(block_hash.encode())
            return Block.parse_raw(block_data)
        except KeyError:
            return None
    
    def get_last_block(self) -> Block:
        """Get the last block in the chain."""
        last_block_hash = self.blocks_db.Get(b'last_block').decode()
        return self.get_block(last_block_hash)
    
    def get_balance(self, address: str) -> float:
        """Get the balance of an address."""
        balance = 0.0
        
        # Iterate through all UTXOs
        for key, value in self.utxo_db.RangeIter():
            utxo_data = json.loads(value.decode())
            if not utxo_data["spent"] and utxo_data["output"]["address"] == address:
                balance += utxo_data["output"]["amount"]
        
        return balance
    
    def get_chain_length(self) -> int:
        """Get the length of the blockchain."""
        return len(self.block_hashes)
    
    def is_chain_valid(self) -> bool:
        """Check if the blockchain is valid."""
        # Check each block's hash and previous hash
        for i in range(1, len(self.block_hashes)):
            current_block = self.get_block(self.block_hashes[i])
            previous_block = self.get_block(self.block_hashes[i-1])
            
            # Check block hash
            if current_block.compute_hash() != current_block.hash:
                return False
            
            # Check previous hash
            if current_block.header.previous_hash != previous_block.hash:
                return False
            
            # Check merkle root
            if current_block.header.merkle_root != self._calculate_merkle_root(current_block.transactions):
                return False
        
        return True
