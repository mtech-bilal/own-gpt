import os
import json
import faiss
import numpy as np
from typing import List, Dict, Any, Optional
import uuid
from sentence_transformers import SentenceTransformer
import time
from pathlib import Path
import pickle

class MemorySystem:
    """
    Memory system that stores and retrieves memories using FAISS for efficient similarity search.
    """
    
    def __init__(self, index_path: str, embedding_model: str = "all-MiniLM-L6-v2"):
        """
        Initialize the memory system.
        
        Args:
            index_path: Path to store the FAISS index and metadata
            embedding_model: Name of the sentence transformer model to use for embeddings
        """
        self.index_path = Path(index_path)
        self.index_path.mkdir(parents=True, exist_ok=True)
        
        # Initialize the embedding model
        self.embedding_model = SentenceTransformer(embedding_model)
        self.embedding_dim = self.embedding_model.get_sentence_embedding_dimension()
        
        # Initialize FAISS index
        self.index = None
        self.metadata = {}
        self._load_or_create_index()
    
    def _load_or_create_index(self) -> None:
        """Load existing index or create a new one if it doesn't exist."""
        index_file = self.index_path / "index.faiss"
        metadata_file = self.index_path / "metadata.json"
        
        if index_file.exists() and metadata_file.exists():
            # Load existing index
            self.index = faiss.read_index(str(index_file))
            with open(metadata_file, 'r') as f:
                self.metadata = json.load(f)
        else:
            # Create new index
            self.index = faiss.IndexFlatL2(self.embedding_dim)
            self.metadata = {"next_id": 0, "memories": {}}
            self._save_index()
    
    def _save_index(self) -> None:
        """Save the FAISS index and metadata to disk."""
        if self.index is not None:
            faiss.write_index(self.index, str(self.index_path / "index.faiss"))
            
            # Save metadata
            with open(self.index_path / "metadata.json", 'w') as f:
                json.dump(self.metadata, f, indent=2)
    
    async def add_memory(
        self,
        content: str,
        metadata: Dict[str, Any],
        user_id: str,
        memory_id: Optional[str] = None
    ) -> str:
        """
        Add a new memory to the system.
        
        Args:
            content: The content to remember
            metadata: Additional metadata about the memory
            user_id: ID of the user who owns this memory
            memory_id: Optional ID for the memory (auto-generated if not provided)
            
        Returns:
            The ID of the created memory
        """
        # Generate embedding for the content
        embedding = self.embedding_model.encode(content)
        
        # Generate a unique ID if not provided
        if memory_id is None:
            memory_id = str(uuid.uuid4())
        
        # Add to FAISS index
        embedding_array = np.array([embedding]).astype('float32')
        self.index.add(embedding_array)
        
        # Store metadata
        self.metadata["memories"][memory_id] = {
            "id": memory_id,
            "content": content,
            "user_id": user_id,
            "metadata": metadata,
            "timestamp": time.time(),
            "embedding_shape": embedding.shape
        }
        
        # Save the updated index and metadata
        self._save_index()
        
        return memory_id
    
    async def retrieve_memories(
        self,
        query: str,
        user_id: str,
        k: int = 5,
        threshold: float = 0.7
    ) -> List[Dict[str, Any]]:
        """
        Retrieve relevant memories based on a query.
        
        Args:
            query: The query to search for
            user_id: ID of the user whose memories to search
            k: Maximum number of memories to return
            threshold: Minimum similarity score (0-1) for a memory to be included
            
        Returns:
            List of relevant memories with their similarity scores
        """
        # Encode the query
        query_embedding = self.embedding_model.encode(query)
        query_embedding = np.array([query_embedding]).astype('float32')
        
        # Search the FAISS index
        distances, indices = self.index.search(query_embedding, k)
        
        # Convert distances to similarity scores (lower distance = higher similarity)
        similarities = 1 / (1 + distances[0])
        
        # Get the metadata for the top-k results
        results = []
        memory_ids = list(self.metadata["memories"].keys())
        
        for i, (distance, similarity) in enumerate(zip(distances[0], similarities)):
            if similarity >= threshold:
                memory_id = memory_ids[indices[0][i]]
                memory = self.metadata["memories"].get(memory_id)
                
                # Only return memories for the specified user
                if memory and memory["user_id"] == user_id:
                    results.append({
                        **memory,
                        "similarity": float(similarity),
                        "distance": float(distance)
                    })
        
        # Sort by similarity (highest first)
        results.sort(key=lambda x: x["similarity"], reverse=True)
        
        return results[:k]
    
    async def get_memory(self, memory_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a specific memory by its ID.
        
        Args:
            memory_id: ID of the memory to retrieve
            
        Returns:
            The memory data or None if not found
        """
        return self.metadata["memories"].get(memory_id)
    
    async def delete_memory(self, memory_id: str) -> bool:
        """
        Delete a memory by its ID.
        
        Args:
            memory_id: ID of the memory to delete
            
        Returns:
            True if the memory was deleted, False if not found
        """
        if memory_id in self.metadata["memories"]:
            # Note: FAISS doesn't support deleting vectors, so we just mark it in metadata
            # In a production system, you might want to rebuild the index without the deleted memory
            del self.metadata["memories"][memory_id]
            self._save_index()
            return True
        return False
    
    async def check_health(self) -> Dict[str, Any]:
        """Check the health of the memory system."""
        return {
            "status": "ok",
            "index_size": len(self.metadata["memories"]),
            "embedding_dim": self.embedding_dim,
            "index_file_exists": (self.index_path / "index.faiss").exists(),
            "metadata_file_exists": (self.index_path / "metadata.json").exists()
        }
