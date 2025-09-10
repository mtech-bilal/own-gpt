import { renderHook, act } from '@testing-library/react-hooks';
import { ChatProvider, useChat } from '../ChatContext';
import { mockFetch } from '../../../test-utils';

// Mock API responses
const mockMessages = [
  { id: '1', content: 'Hello', sender: 'user', timestamp: '2023-05-15T10:00:00Z' },
  { id: '2', content: 'Hi there!', sender: 'assistant', timestamp: '2023-05-15T10:00:05Z' },
];

const mockResponse = {
  message: 'Test response',
  messageId: '123',
  timestamp: '2023-05-15T10:01:00Z',
};

describe('ChatContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockFetch(mockResponse);
  });

  const wrapper = ({ children }) => (
    <ChatProvider>{children}</ChatProvider>
  );

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useChat(), { wrapper });

    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.activeConversation).toBeNull();
  });

  it('should load conversation history', async () => {
    const mockConversations = [
      { id: 'conv1', title: 'Test Conversation 1', lastMessage: 'Hello', timestamp: '2023-05-15T10:00:00Z' },
      { id: 'conv2', title: 'Test Conversation 2', lastMessage: 'Hi there', timestamp: '2023-05-15T09:00:00Z' },
    ];
    
    mockFetch({ conversations: mockConversations });
    
    const { result, waitForNextUpdate } = renderHook(() => useChat(), { wrapper });
    
    // Load conversations
    await act(async () => {
      await result.current.loadConversations();
    });
    
    expect(result.current.conversations).toEqual(mockConversations);
  });

  it('should send a message and receive a response', async () => {
    const { result } = renderHook(() => useChat(), { wrapper });
    
    // Send a message
    await act(async () => {
      await result.current.sendMessage('Hello');
    });
    
    // Check that the message was added to the chat
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].content).toBe('Hello');
    expect(result.current.messages[0].sender).toBe('user');
    
    // Check that the API was called
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/chat'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          message: 'Hello',
          conversationId: null,
        }),
      })
    );
    
    // The response should be added to the messages
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1].content).toBe(mockResponse.message);
    expect(result.current.messages[1].sender).toBe('assistant');
  });

  it('should handle message sending errors', async () => {
    const errorMessage = 'Failed to send message';
    global.fetch = jest.fn().mockRejectedValueOnce(new Error(errorMessage));
    
    const { result } = renderHook(() => useChat(), { wrapper });
    
    await act(async () => {
      await expect(result.current.sendMessage('Test')).rejects.toThrow(errorMessage);
    });
    
    expect(result.current.error).toBe(errorMessage);
  });

  it('should load a conversation', async () => {
    const conversationId = 'conv1';
    mockFetch({ messages: mockMessages });
    
    const { result } = renderHook(() => useChat(), { wrapper });
    
    await act(async () => {
      await result.current.loadConversation(conversationId);
    });
    
    expect(result.current.messages).toEqual(mockMessages);
    expect(result.current.activeConversation).toBe(conversationId);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/conversations/${conversationId}`),
      expect.any(Object)
    );
  });

  it('should create a new conversation', async () => {
    const newConversation = {
      id: 'new-conv',
      title: 'New Conversation',
      messages: [],
    };
    
    mockFetch(newConversation);
    
    const { result } = renderHook(() => useChat(), { wrapper });
    
    await act(async () => {
      const conversation = await result.current.createConversation('New Conversation');
      expect(conversation).toEqual(newConversation);
    });
    
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/conversations'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          title: 'New Conversation',
        }),
      })
    );
  });

  it('should delete a conversation', async () => {
    const conversationId = 'conv1';
    mockFetch({ success: true });
    
    const { result } = renderHook(() => useChat(), { wrapper });
    
    await act(async () => {
      await result.current.deleteConversation(conversationId);
    });
    
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining(`/conversations/${conversationId}`),
      expect.objectContaining({
        method: 'DELETE',
      })
    );
  });

  it('should clear the current conversation', () => {
    const { result } = renderHook(() => useChat(), { wrapper });
    
    // Set some initial state
    act(() => {
      result.current.messages = mockMessages;
      result.current.activeConversation = 'test-conv';
    });
    
    // Clear the conversation
    act(() => {
      result.current.clearConversation();
    });
    
    expect(result.current.messages).toEqual([]);
    expect(result.current.activeConversation).toBeNull();
  });
});
