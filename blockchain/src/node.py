import os
import time
from typing import Dict, List, Optional

from fastapi import FastAPI, HTTPException, status, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from blockchain import Blockchain, Wallet, Transaction, TransactionType

app = FastAPI(
    title="LocalGPT Blockchain Node",
    description="A local blockchain node for the LocalGPT project",
    version="0.1.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize blockchain
blockchain = Blockchain()

# In-memory wallet store (in production, use a proper database)
wallets: Dict[str, Wallet] = {}

# API Models
class WalletCreateRequest(BaseModel):
    private_key: Optional[str] = None

class WalletResponse(BaseModel):
    address: str
    private_key: str
    balance: float

class TransactionRequest(BaseModel):
    recipient: str
    amount: float
    data: Optional[dict] = None

class MemoryTransactionRequest(BaseModel):
    content: str
    embedding_ref: str
    content_type: str = "text/plain"
    metadata: dict = {}

class FeedbackTransactionRequest(BaseModel):
    response_id: str
    feedback_type: str  # "like", "dislike", "rating", "comment"
    rating: Optional[float] = None
    comment: Optional[str] = None

class BlockResponse(BaseModel):
    hash: str
    previous_hash: str
    index: int
    timestamp: float
    transactions: List[dict]

class ChainResponse(BaseModel):
    length: int
    blocks: List[BlockResponse]

# Helper function to get wallet from Authorization header
async def get_wallet(authorization: str = Header(...)) -> Wallet:
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header"
        )
    
    address = authorization[7:]  # Remove 'Bearer ' prefix
    if address not in wallets:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Wallet not found"
        )
    
    return wallets[address]

# API Endpoints
@app.post("/wallets", response_model=WalletResponse, status_code=status.HTTP_201_CREATED)
async def create_wallet(request: WalletCreateRequest = None):
    """Create a new wallet or import an existing one."""
    if request and request.private_key:
        try:
            wallet = Wallet(private_key=request.private_key)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid private key: {str(e)}"
            )
    else:
        wallet = Wallet()
    
    # Store the wallet
    wallets[wallet.address] = wallet
    
    return {
        "address": wallet.address,
        "private_key": wallet.export_private_key(),
        "balance": blockchain.get_balance(wallet.address)
    }

@app.get("/wallets/{address}/balance", response_model=Dict[str, float])
async def get_balance(address: str):
    """Get the balance of a wallet."""
    return {"balance": blockchain.get_balance(address)}

@app.post("/transactions", status_code=status.HTTP_201_CREATED)
async def create_transaction(
    request: TransactionRequest,
    wallet: Wallet = Depends(get_wallet)
):
    """Create a new transaction."""
    try:
        tx = wallet.create_transaction(
            recipient_address=request.recipient,
            amount=request.amount,
            data=request.data
        )
        
        if blockchain.add_transaction(tx):
            return {"message": "Transaction added to mempool", "tx_id": tx.tx_id}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid transaction"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.post("/transactions/memory", status_code=status.HTTP_201_CREATED)
async def create_memory_transaction(
    request: MemoryTransactionRequest,
    wallet: Wallet = Depends(get_wallet)
):
    """Create a memory transaction."""
    try:
        memory_data = {
            "content": request.content,
            "embedding_ref": request.embedding_ref,
            "content_type": request.content_type,
            "metadata": request.metadata,
            "timestamp": time.time()
        }
        
        tx = wallet.create_memory_transaction(memory_data)
        
        if blockchain.add_transaction(tx):
            return {
                "message": "Memory transaction added to mempool",
                "tx_id": tx.tx_id,
                "memory_id": tx.tx_id  # Use tx_id as memory_id
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid memory transaction"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.post("/transactions/feedback", status_code=status.HTTP_201_CREATED)
async def create_feedback_transaction(
    request: FeedbackTransactionRequest,
    wallet: Wallet = Depends(get_wallet)
):
    """Create a feedback transaction."""
    try:
        feedback_data = {}
        if request.rating is not None:
            feedback_data["rating"] = request.rating
        if request.comment:
            feedback_data["comment"] = request.comment
        
        tx = wallet.create_feedback_transaction(
            response_id=request.response_id,
            feedback_type=request.feedback_type,
            feedback_data=feedback_data
        )
        
        if blockchain.add_transaction(tx):
            return {
                "message": "Feedback transaction added to mempool",
                "tx_id": tx.tx_id
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid feedback transaction"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@app.post("/mine", status_code=status.HTTP_200_OK)
async def mine_block(wallet: Wallet = Depends(get_wallet)):
    """Mine a new block with pending transactions."""
    if not blockchain.unconfirmed_transactions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No transactions to mine"
        )
    
    block = blockchain.mine_block(wallet.address)
    
    if block:
        return {
            "message": "New block mined",
            "block_hash": block.hash,
            "block_index": block.header.index,
            "transactions": len(block.transactions) - 1  # Exclude coinbase
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mine block"
        )

@app.get("/chain", response_model=ChainResponse)
async def get_chain():
    """Get the full blockchain."""
    blocks = []
    for block_hash in blockchain.block_hashes:
        block = blockchain.get_block(block_hash)
        blocks.append({
            "hash": block.hash,
            "previous_hash": block.header.previous_hash,
            "index": block.header.index,
            "timestamp": block.header.timestamp,
            "transactions": [tx.dict() for tx in block.transactions]
        })
    
    return {
        "length": len(blocks),
        "blocks": blocks
    }

@app.get("/block/{block_hash}", response_model=BlockResponse)
async def get_block(block_hash: str):
    """Get a block by its hash."""
    block = blockchain.get_block(block_hash)
    if not block:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Block not found"
        )
    
    return {
        "hash": block.hash,
        "previous_hash": block.header.previous_hash,
        "index": block.header.index,
        "timestamp": block.header.timestamp,
        "transactions": [tx.dict() for tx in block.transactions]
    }

@app.get("/transactions/pending", response_model=List[dict])
async def get_pending_transactions():
    """Get all pending transactions."""
    return [tx.dict() for tx in blockchain.unconfirmed_transactions]

@app.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "chain_length": blockchain.get_chain_length(),
        "pending_transactions": len(blockchain.unconfirmed_transactions)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
