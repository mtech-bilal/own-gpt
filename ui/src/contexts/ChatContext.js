import React, { createContext, useContext, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const ChatContext = createContext();

export const useChat = () => {
  return useContext(ChatContext);
};

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [activeMemoryIds, setActiveMemoryIds] = useState([]);
  const [conversationId] = useState(uuidv4());

  // Get user ID from localStorage or generate a new one
  const getUserId = () => {
    let userId = localStorage.getItem('localgpt_user_id');
    if (!userId) {
      userId = `user_${Date.now()}`;
      localStorage.setItem('localgpt_user_id', userId);
    }
    return userId;
  };

  // Get wallet address from localStorage
  const getWalletAddress = () => {
    return localStorage.getItem('wallet_address');
  };

  // Send a message to the backend
  const sendMessage = useCallback(async (content) => {
    const userId = getUserId();
    const messageId = uuidv4();
    const userMessage = {
      id: messageId,
      content,
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    // Add user message to the chat
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      // Call the backend API
      const response = await axios.post('/api/chat', {
        message: content,
        user_id: userId,
        conversation_id: conversationId,
      }, {
        headers: {
          'Authorization': `Bearer ${getWalletAddress()}`,
          'Content-Type': 'application/json',
        },
      });

      const { response: botResponse, response_id, used_memories } = response.data;

      // Add bot response to the chat
      const botMessage = {
        id: response_id,
        content: botResponse,
        sender: 'assistant',
        timestamp: new Date().toISOString(),
        usedMemories: used_memories || [],
      };

      setMessages(prev => [...prev, botMessage]);
      
      // Update active memory IDs for highlighting
      if (used_memories && used_memories.length > 0) {
        setActiveMemoryIds(prev => [...new Set([...prev, ...used_memories.map(m => m.id)])]);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message to chat
      const errorMessage = {
        id: uuidv4(),
        content: 'Sorry, I encountered an error. Please try again.',
        sender: 'assistant',
        timestamp: new Date().toISOString(),
        isError: true,
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  }, [conversationId]);

  // Send feedback for a message
  const sendFeedback = useCallback(async (messageId, feedbackType) => {
    try {
      const walletAddress = getWalletAddress();
      if (!walletAddress) {
        console.warn('No wallet address found. Please connect your wallet first.');
        return;
      }

      // Update local state to show feedback was received
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId ? { ...msg, feedback: feedbackType } : msg
        )
      );

      // Send feedback to the backend
      await axios.post(
        '/api/feedback',
        {
          response_id: messageId,
          feedback_type: feedbackType,
        },
        {
          headers: {
            'Authorization': `Bearer ${walletAddress}`,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error('Error sending feedback:', error);
      
      // Revert feedback in case of error
      setMessages(prev =>
        prev.map(msg =>
          msg.id === messageId ? { ...msg, feedback: undefined } : msg
        )
      );
    }
  }, []);

  // Clear the conversation
  const clearConversation = useCallback(() => {
    setMessages([]);
    setActiveMemoryIds([]);
  }, []);

  const value = {
    messages,
    isTyping,
    sendMessage,
    sendFeedback,
    clearConversation,
    activeMemoryIds,
    conversationId,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export default ChatContext;
