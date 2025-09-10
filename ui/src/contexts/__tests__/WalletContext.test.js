import { renderHook, act } from '@testing-library/react-hooks';
import { WalletProvider, useWallet } from '../WalletContext';
import { render, screen, fireEvent } from '@testing-library/react';
import { mockFetch } from '../../../test-utils';

// Mock the API responses
const mockWalletResponse = {
  address: '0x1234567890abcdef',
  balance: 100,
  transactions: [],
};

describe('WalletContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockFetch(mockWalletResponse);
  });

  const wrapper = ({ children }) => (
    <WalletProvider>{children}</WalletProvider>
  );

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useWallet(), { wrapper });

    expect(result.current.address).toBe('');
    expect(result.current.balance).toBe(0);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should connect to a wallet', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useWallet(), { wrapper });

    await act(async () => {
      await result.current.connectWallet('test-private-key');
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.address).toBe(mockWalletResponse.address);
    expect(result.current.balance).toBe(mockWalletResponse.balance);
    expect(localStorage.setItem).toHaveBeenCalledWith('wallet_private_key', 'test-private-key');
  });

  it('should disconnect from wallet', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });

    // First connect
    await act(async () => {
      await result.current.connectWallet('test-private-key');
    });

    // Then disconnect
    act(() => {
      result.current.disconnectWallet();
    });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.address).toBe('');
    expect(result.current.balance).toBe(0);
    expect(localStorage.removeItem).toHaveBeenCalledWith('wallet_private_key');
  });

  it('should load wallet from localStorage on mount', async () => {
    localStorage.setItem('wallet_private_key', 'saved-private-key');
    
    const { result, waitForNextUpdate } = renderHook(() => useWallet(), { wrapper });
    
    // Wait for the effect to complete
    await waitForNextUpdate();
    
    expect(result.current.isConnected).toBe(true);
    expect(result.current.address).toBe(mockWalletResponse.address);
  });

  it('should handle connection errors', async () => {
    const errorMessage = 'Connection failed';
    global.fetch = jest.fn().mockRejectedValueOnce(new Error(errorMessage));
    
    const { result } = renderHook(() => useWallet(), { wrapper });
    
    await act(async () => {
      await result.current.connectWallet('invalid-key');
    });
    
    expect(result.current.error).toBe(errorMessage);
    expect(result.current.isConnected).toBe(false);
  });

  it('should send a transaction', async () => {
    const mockTransaction = {
      to: '0xrecipient',
      amount: 10,
      txHash: '0xtx123',
    };
    
    mockFetch({ ...mockWalletResponse, txHash: mockTransaction.txHash });
    
    const { result } = renderHook(() => useWallet(), { wrapper });
    
    // First connect
    await act(async () => {
      await result.current.connectWallet('test-private-key');
    });
    
    // Then send transaction
    let txResult;
    await act(async () => {
      txResult = await result.current.sendTransaction(mockTransaction.to, mockTransaction.amount);
    });
    
    expect(txResult.txHash).toBe(mockTransaction.txHash);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/wallet/send'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          to: mockTransaction.to,
          amount: mockTransaction.amount,
        }),
      })
    );
  });

  it('should refresh balance', async () => {
    const { result } = renderHook(() => useWallet(), { wrapper });
    
    // First connect
    await act(async () => {
      await result.current.connectWallet('test-private-key');
    });
    
    // Mock a new balance
    const newBalance = 200;
    mockFetch({ ...mockWalletResponse, balance: newBalance });
    
    // Refresh balance
    await act(async () => {
      await result.current.refreshBalance();
    });
    
    expect(result.current.balance).toBe(newBalance);
  });

  it('should handle transaction errors', async () => {
    const errorMessage = 'Insufficient funds';
    global.fetch = jest.fn().mockRejectedValueOnce(new Error(errorMessage));
    
    const { result } = renderHook(() => useWallet(), { wrapper });
    
    // First connect
    await act(async () => {
      await result.current.connectWallet('test-private-key');
    });
    
    // Then try to send transaction (should fail)
    await act(async () => {
      await expect(
        result.current.sendTransaction('0xrecipient', 1000)
      ).rejects.toThrow(errorMessage);
    });
    
    expect(result.current.error).toBe(errorMessage);
  });
});
