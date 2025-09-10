import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../theme';
import { ChatProvider } from '../../contexts/ChatContext';
import { WalletProvider } from '../../contexts/WalletContext';
import ChatPage from '../ChatPage';

// Mock the components that ChatPage uses
jest.mock('../../components/ChatMessage', () => ({ message, isOwnMessage }) => (
  <div data-testid="chat-message" data-own={isOwnMessage}>
    {message.content}
  </div>
));

// Mock the API responses
const mockMessages = [
  { id: '1', content: 'Hello', sender: 'user', timestamp: '2023-05-15T10:00:00Z' },
  { id: '2', content: 'Hi there!', sender: 'assistant', timestamp: '2023-05-15T10:00:05Z' },
];

const mockResponse = {
  message: 'Test response',
  messageId: '123',
  timestamp: '2023-05-15T10:01:00Z',
};

// Mock the ChatContext
const mockChatContext = {
  messages: mockMessages,
  isLoading: false,
  error: null,
  sendMessage: jest.fn().mockResolvedValue(mockResponse),
  activeConversation: 'conv1',
  conversations: [
    { id: 'conv1', title: 'Test Conversation', lastMessage: 'Hello', timestamp: '2023-05-15T10:00:00Z' },
  ],
  loadConversation: jest.fn(),
  createConversation: jest.fn().mockResolvedValue({ id: 'new-conv' }),
  deleteConversation: jest.fn(),
  clearConversation: jest.fn(),
};

// Mock the WalletContext
const mockWalletContext = {
  isConnected: true,
  address: '0x1234567890abcdef',
  balance: 100,
  connectWallet: jest.fn(),
  disconnectWallet: jest.fn(),
  sendTransaction: jest.fn(),
};

const renderChatPage = () => {
  return render(
    <ThemeProvider theme={theme}>
      <WalletProvider value={mockWalletContext}>
        <ChatProvider value={mockChatContext}>
          <BrowserRouter>
            <ChatPage />
          </BrowserRouter>
        </ChatProvider>
      </WalletProvider>
    </ThemeProvider>
  );
};

describe('ChatPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock localStorage
    Storage.prototype.setItem = jest.fn();
    Storage.prototype.getItem = jest.fn();
  });

  it('should render chat messages', () => {
    renderChatPage();
    
    // Check if messages are rendered
    const messages = screen.getAllByTestId('chat-message');
    expect(messages).toHaveLength(mockMessages.length);
    
    // Check if the first message is from the user
    expect(messages[0]).toHaveTextContent(mockMessages[0].content);
    expect(messages[0]).toHaveAttribute('data-own', 'true');
    
    // Check if the second message is from the assistant
    expect(messages[1]).toHaveTextContent(mockMessages[1].content);
    expect(messages[1]).toHaveAttribute('data-own', 'false');
  });

  it('should send a message when the form is submitted', async () => {
    renderChatPage();
    
    // Find the input field and submit button
    const input = screen.getByPlaceholderText(/type your message/i);
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    // Type a message
    const testMessage = 'Hello, world!';
    fireEvent.change(input, { target: { value: testMessage } });
    
    // Submit the form
    fireEvent.click(sendButton);
    
    // Check if the sendMessage function was called with the right arguments
    expect(mockChatContext.sendMessage).toHaveBeenCalledWith(testMessage);
    
    // The input should be cleared after sending
    expect(input.value).toBe('');
  });

  it('should not send an empty message', () => {
    renderChatPage();
    
    // Find the input field and submit button
    const input = screen.getByPlaceholderText(/type your message/i);
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    // Try to send an empty message
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(sendButton);
    
    // sendMessage should not be called
    expect(mockChatContext.sendMessage).not.toHaveBeenCalled();
  });

  it('should create a new conversation when clicking new chat', async () => {
    renderChatPage();
    
    // Click the new chat button
    const newChatButton = screen.getByRole('button', { name: /new chat/i });
    fireEvent.click(newChatButton);
    
    // Check if createConversation was called
    expect(mockChatContext.createConversation).toHaveBeenCalled();
  });

  it('should load a conversation when selected from the sidebar', async () => {
    renderChatPage();
    
    // Find and click on a conversation in the sidebar
    const conversationItem = screen.getByText('Test Conversation');
    fireEvent.click(conversationItem);
    
    // Check if loadConversation was called with the right ID
    expect(mockChatContext.loadConversation).toHaveBeenCalledWith('conv1');
  });

  it('should show loading state when sending a message', () => {
    // Override the context to show loading state
    const loadingChatContext = {
      ...mockChatContext,
      isLoading: true,
    };
    
    render(
      <ThemeProvider theme={theme}>
        <WalletProvider value={mockWalletContext}>
          <ChatProvider value={loadingChatContext}>
            <BrowserRouter>
              <ChatPage />
            </BrowserRouter>
          </ChatProvider>
        </WalletProvider>
      </ThemeProvider>
    );
    
    // Check if loading indicator is shown
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should show error message when there is an error', () => {
    const errorMessage = 'Failed to send message';
    
    // Override the context to show an error
    const errorChatContext = {
      ...mockChatContext,
      error: errorMessage,
    };
    
    render(
      <ThemeProvider theme={theme}>
        <WalletProvider value={mockWalletContext}>
          <ChatProvider value={errorChatContext}>
            <BrowserRouter>
              <ChatPage />
            </BrowserRouter>
          </ChatProvider>
        </WalletProvider>
      </ThemeProvider>
    );
    
    // Check if error message is shown
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('should clear the conversation when clear button is clicked', () => {
    renderChatPage();
    
    // Click the clear conversation button
    const clearButton = screen.getByRole('button', { name: /clear conversation/i });
    fireEvent.click(clearButton);
    
    // Check if clearConversation was called
    expect(mockChatContext.clearConversation).toHaveBeenCalled();
  });
});
