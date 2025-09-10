import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../theme';
import { WalletProvider } from '../../contexts/WalletContext';
import { ChatProvider } from '../../contexts/ChatContext';
import MemoriesPage from '../MemoriesPage';

// Mock the API responses
const mockMemories = [
  {
    id: '1',
    content: 'Test memory 1',
    timestamp: '2023-05-15T10:00:00Z',
    tags: ['tag1', 'tag2'],
    metadata: { type: 'note' },
  },
  {
    id: '2',
    content: 'Test memory 2',
    timestamp: '2023-05-14T10:00:00Z',
    tags: ['tag2', 'tag3'],
    metadata: { type: 'reminder' },
  },
  {
    id: '3',
    content: 'Test memory 3',
    timestamp: '2023-05-13T10:00:00Z',
    tags: ['tag1', 'tag3'],
    metadata: { type: 'note' },
  },
];

// Mock the WalletContext
const mockWalletContext = {
  isConnected: true,
  address: '0x1234567890abcdef',
  balance: 100,
  connectWallet: jest.fn(),
  disconnectWallet: jest.fn(),
};

// Mock the ChatContext
const mockChatContext = {
  messages: [],
  isLoading: false,
  error: null,
  sendMessage: jest.fn(),
};

// Mock the API functions
jest.mock('../../api/memories', () => ({
  getMemories: jest.fn().mockResolvedValue(mockMemories),
  createMemory: jest.fn().mockResolvedValue({ id: 'new-memory' }),
  updateMemory: jest.fn().mockResolvedValue({ success: true }),
  deleteMemory: jest.fn().mockResolvedValue({ success: true }),
  searchMemories: jest.fn().mockResolvedValue(mockMemories),
}));

const renderMemoriesPage = () => {
  return render(
    <ThemeProvider theme={theme}>
      <WalletProvider value={mockWalletContext}>
        <ChatProvider value={mockChatContext}>
          <BrowserRouter>
            <MemoriesPage />
          </BrowserRouter>
        </ChatProvider>
      </WalletProvider>
    </ThemeProvider>
  );
};

describe('MemoriesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the mock implementations
    const { getMemories } = require('../../api/memories');
    getMemories.mockResolvedValue(mockMemories);
  });

  it('should render memories list', async () => {
    renderMemoriesPage();
    
    // Wait for the memories to load
    await waitFor(() => {
      expect(screen.getByText('Test memory 1')).toBeInTheDocument();
      expect(screen.getByText('Test memory 2')).toBeInTheDocument();
      expect(screen.getByText('Test memory 3')).toBeInTheDocument();
    });
    
    // Check if tags are rendered
    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();
    expect(screen.getByText('tag3')).toBeInTheDocument();
  });

  it('should open create memory dialog when add button is clicked', async () => {
    renderMemoriesPage();
    
    // Click the add button
    const addButton = screen.getByRole('button', { name: /add memory/i });
    fireEvent.click(addButton);
    
    // Check if the dialog is open
    expect(screen.getByText(/create new memory/i)).toBeInTheDocument();
  });

  it('should create a new memory', async () => {
    const { createMemory } = require('../../api/memories');
    
    renderMemoriesPage();
    
    // Open the create memory dialog
    const addButton = screen.getByRole('button', { name: /add memory/i });
    fireEvent.click(addButton);
    
    // Fill out the form
    const contentInput = screen.getByLabelText(/content/i);
    const tagsInput = screen.getByLabelText(/tags/i);
    const submitButton = screen.getByRole('button', { name: /save/i });
    
    fireEvent.change(contentInput, { target: { value: 'New test memory' } });
    fireEvent.change(tagsInput, { target: { value: 'tag1, tag4' } });
    
    // Submit the form
    fireEvent.click(submitButton);
    
    // Check if createMemory was called with the right arguments
    await waitFor(() => {
      expect(createMemory).toHaveBeenCalledWith({
        content: 'New test memory',
        tags: ['tag1', 'tag4'],
        metadata: { type: 'note' },
      });
    });
    
    // The dialog should be closed
    expect(screen.queryByText(/create new memory/i)).not.toBeInTheDocument();
  });

  it('should edit an existing memory', async () => {
    const { updateMemory } = require('../../api/memories');
    
    renderMemoriesPage();
    
    // Wait for the memories to load
    await waitFor(() => {
      expect(screen.getByText('Test memory 1')).toBeInTheDocument();
    });
    
    // Click the edit button on the first memory
    const editButtons = screen.getAllByRole('button', { name: /edit/i });
    fireEvent.click(editButtons[0]);
    
    // Check if the edit dialog is open with the correct memory data
    expect(screen.getByText(/edit memory/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test memory 1')).toBeInTheDocument();
    
    // Update the content
    const contentInput = screen.getByLabelText(/content/i);
    fireEvent.change(contentInput, { target: { value: 'Updated memory content' } });
    
    // Submit the form
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);
    
    // Check if updateMemory was called with the right arguments
    await waitFor(() => {
      expect(updateMemory).toHaveBeenCalledWith('1', {
        content: 'Updated memory content',
        tags: ['tag1', 'tag2'],
        metadata: { type: 'note' },
      });
    });
    
    // The dialog should be closed
    expect(screen.queryByText(/edit memory/i)).not.toBeInTheDocument();
  });

  it('should delete a memory', async () => {
    const { deleteMemory } = require('../../api/memories');
    
    renderMemoriesPage();
    
    // Wait for the memories to load
    await waitFor(() => {
      expect(screen.getByText('Test memory 1')).toBeInTheDocument();
    });
    
    // Click the delete button on the first memory
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);
    
    // Confirm the deletion
    const confirmButton = screen.getByRole('button', { name: /yes, delete/i });
    fireEvent.click(confirmButton);
    
    // Check if deleteMemory was called with the right ID
    await waitFor(() => {
      expect(deleteMemory).toHaveBeenCalledWith('1');
    });
  });

  it('should filter memories by tag', async () => {
    const { searchMemories } = require('../../api/memories');
    
    renderMemoriesPage();
    
    // Wait for the memories to load
    await waitFor(() => {
      expect(screen.getByText('Test memory 1')).toBeInTheDocument();
    });
    
    // Click on a tag to filter
    const tag1 = screen.getByText('tag1');
    fireEvent.click(tag1);
    
    // Check if searchMemories was called with the right tag
    expect(searchMemories).toHaveBeenCalledWith({ tags: ['tag1'] });
  });

  it('should search memories by content', async () => {
    const { searchMemories } = require('../../api/memories');
    
    renderMemoriesPage();
    
    // Find the search input
    const searchInput = screen.getByPlaceholderText(/search memories/i);
    const searchButton = screen.getByRole('button', { name: /search/i });
    
    // Enter search term and submit
    fireEvent.change(searchInput, { target: { value: 'test' } });
    fireEvent.click(searchButton);
    
    // Check if searchMemories was called with the right query
    expect(searchMemories).toHaveBeenCalledWith({ query: 'test' });
  });

  it('should show loading state', async () => {
    // Mock a slow API response
    const { getMemories } = require('../../api/memories');
    getMemories.mockImplementationOnce(
      () => new Promise((resolve) => setTimeout(() => resolve(mockMemories), 1000))
    );
    
    renderMemoriesPage();
    
    // Check if loading indicator is shown
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    
    // Wait for the loading to complete
    await waitFor(() => {
      expect(screen.getByText('Test memory 1')).toBeInTheDocument();
    });
  });

  it('should show error message when API call fails', async () => {
    const errorMessage = 'Failed to load memories';
    
    // Mock a failed API call
    const { getMemories } = require('../../api/memories');
    getMemories.mockRejectedValueOnce(new Error(errorMessage));
    
    renderMemoriesPage();
    
    // Check if error message is shown
    expect(await screen.findByText(errorMessage)).toBeInTheDocument();
  });
});
