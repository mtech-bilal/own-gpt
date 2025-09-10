import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../theme';
import { WalletProvider } from '../../contexts/WalletContext';
import { ChatProvider } from '../../contexts/ChatContext';
import WalletPage from '../WalletPage';

// Mock the components that WalletPage uses
jest.mock('../../components/WalletConnect', () => () => <div>WalletConnect</div>);
jest.mock('../../components/TransactionHistory', () => () => <div>TransactionHistory</div>);

// Mock the WalletContext
const mockWalletContext = {
  isConnected: false,
  address: '',
  balance: 0,
  connectWallet: jest.fn(),
  disconnectWallet: jest.fn(),
  sendTransaction: jest.fn().mockResolvedValue({ txHash: '0x123' }),
  refreshBalance: jest.fn(),
  error: null,
  isLoading: false,
};

// Mock the ChatContext
const mockChatContext = {
  messages: [],
  isLoading: false,
  error: null,
  sendMessage: jest.fn(),
};

const renderWalletPage = () => {
  return render(
    <ThemeProvider theme={theme}>
      <WalletProvider value={mockWalletContext}>
        <ChatProvider value={mockChatContext}>
          <BrowserRouter>
            <WalletPage />
          </BrowserRouter>
        </ChatProvider>
      </WalletProvider>
    </ThemeProvider>
  );
};

describe('WalletPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock localStorage
    Storage.prototype.setItem = jest.fn();
    Storage.prototype.getItem = jest.fn();
  });

  it('should render wallet connect component when not connected', () => {
    renderWalletPage();
    
    // Check if the wallet connect component is rendered
    expect(screen.getByText('WalletConnect')).toBeInTheDocument();
    
    // Check that the send form is not shown
    expect(screen.queryByLabelText(/recipient address/i)).not.toBeInTheDocument();
  });

  it('should show wallet info when connected', () => {
    // Override the context to show connected state
    const connectedWalletContext = {
      ...mockWalletContext,
      isConnected: true,
      address: '0x1234567890abcdef',
      balance: 100,
    };
    
    render(
      <ThemeProvider theme={theme}>
        <WalletProvider value={connectedWalletContext}>
          <ChatProvider value={mockChatContext}>
            <BrowserRouter>
              <WalletPage />
            </BrowserRouter>
          </ChatProvider>
        </WalletProvider>
      </ThemeProvider>
    );
    
    // Check if the wallet info is displayed
    expect(screen.getByText(/connected wallet/i)).toBeInTheDocument();
    expect(screen.getByText(connectedWalletContext.address)).toBeInTheDocument();
    expect(screen.getByText(connectedWalletContext.balance.toString())).toBeInTheDocument();
    
    // Check that the send form is shown
    expect(screen.getByLabelText(/recipient address/i)).toBeInTheDocument();
  });

  it('should send a transaction when the form is submitted', async () => {
    // Override the context to show connected state
    const connectedWalletContext = {
      ...mockWalletContext,
      isConnected: true,
      address: '0x1234567890abcdef',
      balance: 100,
    };
    
    render(
      <ThemeProvider theme={theme}>
        <WalletProvider value={connectedWalletContext}>
          <ChatProvider value={mockChatContext}>
            <BrowserRouter>
              <WalletPage />
            </BrowserRouter>
          </ChatProvider>
        </WalletProvider>
      </ThemeProvider>
    );
    
    // Fill out the send form
    const recipientInput = screen.getByLabelText(/recipient address/i);
    const amountInput = screen.getByLabelText(/amount/i);
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    const recipientAddress = '0x9876543210fedcba';
    const amount = '1.5';
    
    fireEvent.change(recipientInput, { target: { value: recipientAddress } });
    fireEvent.change(amountInput, { target: { value: amount } });
    
    // Submit the form
    fireEvent.click(sendButton);
    
    // Check if sendTransaction was called with the right arguments
    await waitFor(() => {
      expect(connectedWalletContext.sendTransaction).toHaveBeenCalledWith(
        recipientAddress,
        parseFloat(amount)
      );
    });
    
    // Check for success message
    expect(await screen.findByText(/transaction sent successfully/i)).toBeInTheDocument();
  });

  it('should show an error when transaction fails', async () => {
    const errorMessage = 'Insufficient funds';
    
    // Override the context to show connected state and mock a failed transaction
    const errorWalletContext = {
      ...mockWalletContext,
      isConnected: true,
      address: '0x1234567890abcdef',
      balance: 100,
      sendTransaction: jest.fn().mockRejectedValue(new Error(errorMessage)),
    };
    
    render(
      <ThemeProvider theme={theme}>
        <WalletProvider value={errorWalletContext}>
          <ChatProvider value={mockChatContext}>
            <BrowserRouter>
              <WalletPage />
            </BrowserRouter>
          </ChatProvider>
        </WalletProvider>
      </ThemeProvider>
    );
    
    // Fill out the send form
    const recipientInput = screen.getByLabelText(/recipient address/i);
    const amountInput = screen.getByLabelText(/amount/i);
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    fireEvent.change(recipientInput, { target: { value: '0x9876543210fedcba' } });
    fireEvent.change(amountInput, { target: { value: '150' } }); // More than balance
    
    // Submit the form
    fireEvent.click(sendButton);
    
    // Check for error message
    expect(await screen.findByText(errorMessage)).toBeInTheDocument();
  });

  it('should validate the send form', async () => {
    // Override the context to show connected state
    const connectedWalletContext = {
      ...mockWalletContext,
      isConnected: true,
      address: '0x1234567890abcdef',
      balance: 100,
    };
    
    render(
      <ThemeProvider theme={theme}>
        <WalletProvider value={connectedWalletContext}>
          <ChatProvider value={mockChatContext}>
            <BrowserRouter>
              <WalletPage />
            </BrowserRouter>
          </ChatProvider>
        </WalletProvider>
      </ThemeProvider>
    );
    
    const recipientInput = screen.getByLabelText(/recipient address/i);
    const amountInput = screen.getByLabelText(/amount/i);
    const sendButton = screen.getByRole('button', { name: /send/i });
    
    // Test empty recipient
    fireEvent.change(recipientInput, { target: { value: '' } });
    fireEvent.change(amountInput, { target: { value: '1' } });
    fireEvent.click(sendButton);
    
    expect(await screen.findByText(/recipient address is required/i)).toBeInTheDocument();
    
    // Test invalid recipient address
    fireEvent.change(recipientInput, { target: { value: 'invalid-address' } });
    fireEvent.click(sendButton);
    
    expect(await screen.findByText(/invalid ethereum address/i)).toBeInTheDocument();
    
    // Test empty amount
    fireEvent.change(recipientInput, { target: { value: '0x9876543210fedcba' } });
    fireEvent.change(amountInput, { target: { value: '' } });
    fireEvent.click(sendButton);
    
    expect(await screen.findByText(/amount is required/i)).toBeInTheDocument();
    
    // Test invalid amount (negative)
    fireEvent.change(amountInput, { target: { value: '-1' } });
    fireEvent.click(sendButton);
    
    expect(await screen.findByText(/amount must be greater than 0/i)).toBeInTheDocument();
    
    // Test amount greater than balance
    fireEvent.change(amountInput, { target: { value: '200' } });
    fireEvent.click(sendButton);
    
    expect(await screen.findByText(/insufficient balance/i)).toBeInTheDocument();
  });

  it('should show loading state when sending a transaction', () => {
    // Override the context to show loading state
    const loadingWalletContext = {
      ...mockWalletContext,
      isConnected: true,
      address: '0x1234567890abcdef',
      balance: 100,
      isLoading: true,
    };
    
    render(
      <ThemeProvider theme={theme}>
        <WalletProvider value={loadingWalletContext}>
          <ChatProvider value={mockChatContext}>
            <BrowserRouter>
              <WalletPage />
            </BrowserRouter>
          </ChatProvider>
        </WalletProvider>
      </ThemeProvider>
    );
    
    // Check if loading indicator is shown
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should show transaction history', () => {
    // Override the context to show connected state
    const connectedWalletContext = {
      ...mockWalletContext,
      isConnected: true,
      address: '0x1234567890abcdef',
      balance: 100,
    };
    
    render(
      <ThemeProvider theme={theme}>
        <WalletProvider value={connectedWalletContext}>
          <ChatProvider value={mockChatContext}>
            <BrowserRouter>
              <WalletPage />
            </BrowserRouter>
          </ChatProvider>
        </WalletProvider>
      </ThemeProvider>
    );
    
    // Check if transaction history is shown
    expect(screen.getByText('TransactionHistory')).toBeInTheDocument();
  });
});
