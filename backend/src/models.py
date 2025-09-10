import os
from typing import Dict, Any, Optional
import numpy as np
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    pipeline,
    set_seed
)
import torch

class ModelManager:
    """Manages the AI model for generating responses."""
    
    def __init__(
        self,
        model_name: str = "distilgpt2",
        model_path: Optional[str] = None,
        device: Optional[str] = None
    ):
        """
        Initialize the model manager.
        
        Args:
            model_name: Name of the model to use
            model_path: Path to load/save the model (optional)
            device: Device to run the model on ('cuda', 'cpu', or None for auto-detect)
        """
        self.model_name = model_name
        self.model_path = model_path
        
        # Set device
        if device is None:
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
        else:
            self.device = device
        
        # Initialize model and tokenizer
        self.tokenizer = None
        self.model = None
        self.generator = None
        
        # Load the model
        self._load_model()
    
    def _load_model(self) -> None:
        """Load the model and tokenizer."""
        try:
            # Try to load from local path if provided
            if self.model_path and os.path.exists(self.model_path):
                model_path = self.model_path
                print(f"Loading model from {model_path}")
            else:
                model_path = self.model_name
                print(f"Downloading model {model_path}")
            
            # Load tokenizer and model
            self.tokenizer = AutoTokenizer.from_pretrained(
                model_path,
                padding_side="left"
            )
            
            # Set pad token if not set
            if self.tokenizer.pad_token is None:
                self.tokenizer.pad_token = self.tokenizer.eos_token
            
            # Load model
            self.model = AutoModelForCausalLM.from_pretrained(
                model_path,
                pad_token_id=self.tokenizer.eos_token_id
            ).to(self.device)
            
            # Create text generation pipeline
            self.generator = pipeline(
                "text-generation",
                model=self.model,
                tokenizer=self.tokenizer,
                device=0 if self.device == "cuda" else -1
            )
            
            print(f"Model {self.model_name} loaded successfully on {self.device}")
            
        except Exception as e:
            print(f"Error loading model: {str(e)}")
            raise
    
    async def generate_response(
        self,
        message: str,
        context: Optional[Dict[str, Any]] = None,
        max_length: int = 100,
        temperature: float = 0.7,
        top_p: float = 0.9,
        top_k: int = 50,
        num_return_sequences: int = 1
    ) -> str:
        """
        Generate a response to the given message.
        
        Args:
            message: The input message
            context: Optional context including previous messages and memories
            max_length: Maximum length of the generated response
            temperature: Sampling temperature (higher = more random)
            top_p: Nucleus sampling parameter
            top_k: Top-k sampling parameter
            num_return_sequences: Number of sequences to generate
            
        Returns:
            The generated response
        """
        if self.generator is None:
            raise RuntimeError("Model not loaded")
        
        try:
            # Prepare the prompt with context
            prompt = self._prepare_prompt(message, context)
            
            # Generate response
            outputs = self.generator(
                prompt,
                max_length=max_length,
                temperature=temperature,
                top_p=top_p,
                top_k=top_k,
                num_return_sequences=num_return_sequences,
                do_sample=True,
                pad_token_id=self.tokenizer.eos_token_id
            )
            
            # Extract the generated text
            response = outputs[0]["generated_text"]
            
            # Remove the prompt from the response
            if response.startswith(prompt):
                response = response[len(prompt):].strip()
            
            return response
            
        except Exception as e:
            print(f"Error generating response: {str(e)}")
            return "I'm sorry, I encountered an error while generating a response."
    
    def _prepare_prompt(
        self,
        message: str,
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Prepare the prompt for the model.
        
        Args:
            message: The input message
            context: Optional context including previous messages and memories
            
        Returns:
            Formatted prompt string
        """
        prompt_parts = []
        
        # Add system message if provided in context
        system_message = context.get("system_message") if context else None
        if system_message:
            prompt_parts.append(f"System: {system_message}")
        
        # Add relevant memories if available
        memories = context.get("memories", []) if context else []
        if memories:
            prompt_parts.append("Relevant memories:")
            for i, memory in enumerate(memories[:3]):  # Limit to top 3 memories
                content = memory.get("content", "")
                prompt_parts.append(f"- Memory {i+1}: {content}")
        
        # Add conversation history if available
        history = context.get("history", []) if context else []
        for msg in history[-5:]:  # Limit to last 5 messages
            role = msg.get("role", "user").capitalize()
            content = msg.get("content", "")
            prompt_parts.append(f"{role}: {content}")
        
        # Add current message
        prompt_parts.append(f"User: {message}")
        prompt_parts.append("Assistant:")
        
        return "\n".join(prompt_parts)
    
    async def check_health(self) -> Dict[str, Any]:
        """Check the health of the model."""
        try:
            # Try a small generation to verify the model works
            test_response = await self.generate_response(
                "Hello!",
                max_length=10,
                temperature=0.1
            )
            
            return {
                "status": "ok",
                "model": self.model_name,
                "device": self.device,
                "test_response": test_response
            }
            
        except Exception as e:
            return {
                "status": "error",
                "error": str(e)
            }
    
    def train_on_feedback(
        self,
        input_text: str,
        target_text: str,
        feedback: Dict[str, Any],
        learning_rate: float = 5e-5,
        num_epochs: int = 1,
        batch_size: int = 1
    ) -> Dict[str, Any]:
        """
        Fine-tune the model on feedback data.
        
        Args:
            input_text: The input text that was used to generate the response
            target_text: The target (preferred) response
            feedback: Feedback data including reward, rating, etc.
            learning_rate: Learning rate for fine-tuning
            num_epochs: Number of training epochs
            batch_size: Batch size for training
            
        Returns:
            Training metrics
        """
        # This is a simplified implementation
        # In a real system, you would implement proper fine-tuning with PPO or similar
        
        # Tokenize the input and target
        inputs = self.tokenizer(
            input_text,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=512
        ).to(self.device)
        
        with self.tokenizer.as_target_tokenizer():
            labels = self.tokenizer(
                target_text,
                return_tensors="pt",
                padding=True,
                truncation=True,
                max_length=512
            )["input_ids"].to(self.device)
        
        # Set model to training mode
        self.model.train()
        
        # Define optimizer
        optimizer = torch.optim.AdamW(self.model.parameters(), lr=learning_rate)
        
        # Train for a few steps
        for epoch in range(num_epochs):
            # Forward pass
            outputs = self.model(
                input_ids=inputs["input_ids"],
                attention_mask=inputs["attention_mask"],
                labels=labels
            )
            
            # Backward pass and optimize
            loss = outputs.loss
            loss.backward()
            optimizer.step()
            optimizer.zero_grad()
        
        # Set model back to eval mode
        self.model.eval()
        
        return {
            "status": "trained",
            "loss": loss.item(),
            "epochs": num_epochs,
            "learning_rate": learning_rate
        }
