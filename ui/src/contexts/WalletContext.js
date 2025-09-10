import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const WalletContext = createContext();

export const useWallet = () => {
  return useContext(WalletContext);
};

export const WalletProvider = ({ children }) => {
  const [address, setAddress] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [balance, setBalance] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load wallet from localStorage on mount
  useEffect(() => {
    const loadWallet = () => {
      const savedAddress = localStorage.getItem('wallet_address');
      const savedPrivateKey = localStorage.getItem('private_key');
      
      if (savedAddress && savedPrivateKey) {
        setAddress(savedAddress);
        setPrivateKey(savedPrivateKey);
        setIsConnected(true);
        fetchBalance(savedAddress);
      }
    };
    
    loadWallet();
    
    // Set up polling for balance updates
    const interval = setInterval(() => {
      if (isConnected) {
        fetchBalance(address);
      }
    }, 30000); // Poll every 30 seconds
    
    return () => clearInterval(interval);
  }, [isConnected, address]);

  // Fetch balance from the blockchain
  const fetchBalance = useCallback(async (walletAddress) => {
    try {
      const response = await axios.get(`/blockchain/wallets/${walletAddress}/balance`);
      setBalance(parseFloat(response.data.balance) || 0);
    } catch (err) {
      console.error('Error fetching balance:', err);
      setError('Failed to fetch balance');
    }
  }, []);

  // Create a new wallet
  const createWallet = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('/blockchain/wallets');
      const { address, private_key } = response.data;
      
      // Save to local storage
      localStorage.setItem('wallet_address', address);
      localStorage.setItem('private_key', private_key);
      
      // Update state
      setAddress(address);
      setPrivateKey(private_key);
      setIsConnected(true);
      
      // Fetch initial balance
      await fetchBalance(address);
      
      return { address, privateKey: private_key };
    } catch (err) {
      console.error('Error creating wallet:', err);
      setError('Failed to create wallet. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchBalance]);

  // Connect an existing wallet
  const connectWallet = useCallback(async (privateKey = null) => {
    setIsLoading(true);
    setError(null);
    
    try {
      let walletAddress = '';
      
      if (privateKey) {
        // If private key is provided, use it to connect
        walletAddress = await getAddressFromPrivateKey(privateKey);
        
        // Save to local storage
        localStorage.setItem('wallet_address', walletAddress);
        localStorage.setItem('private_key', privateKey);
      } else {
        // Otherwise, try to connect with existing wallet
        walletAddress = localStorage.getItem('wallet_address');
        const savedPrivateKey = localStorage.getItem('private_key');
        
        if (!walletAddress || !savedPrivateKey) {
          throw new Error('No wallet found. Please create a new wallet.');
        }
        
        // Verify the wallet exists on the blockchain
        try {
          await axios.get(`/blockchain/wallets/${walletAddress}/balance`);
        } catch (err) {
          if (err.response && err.response.status === 404) {
            throw new Error('Wallet not found on the blockchain');
          }
          throw err;
        }
      }
      
      // Update state
      setAddress(walletAddress);
      setPrivateKey(privateKey || localStorage.getItem('private_key'));
      setIsConnected(true);
      
      // Fetch balance
      await fetchBalance(walletAddress);
      
      return walletAddress;
    } catch (err) {
      console.error('Error connecting wallet:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to connect wallet';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [fetchBalance]);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    localStorage.removeItem('wallet_address');
    localStorage.removeItem('private_key');
    setAddress('');
    setPrivateKey('');
    setBalance(0);
    setIsConnected(false);
  }, []);

  // Send a transaction
  const sendTransaction = useCallback(async (recipient, amount) => {
    if (!isConnected || !privateKey) {
      throw new Error('Wallet not connected');
    }
    
    if (!recipient || !amount || amount <= 0) {
      throw new Error('Invalid recipient or amount');
    }
    
    if (amount > balance) {
      throw new Error('Insufficient balance');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // In a real implementation, you would sign the transaction with the private key
      // and send it to the blockchain
      const response = await axios.post(
        '/blockchain/transactions',
        {
          recipient,
          amount,
        },
        {
          headers: {
            'Authorization': `Bearer ${address}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      // Update balance
      await fetchBalance(address);
      
      return response.data;
    } catch (err) {
      console.error('Error sending transaction:', err);
      const errorMessage = err.response?.data?.detail || err.message || 'Transaction failed';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [address, balance, fetchBalance, isConnected, privateKey]);

  // Get address from private key (simplified)
  const getAddressFromPrivateKey = async (privateKey) => {
    // In a real implementation, you would derive the address from the private key
    // For this example, we'll assume the private key is the address
    return privateKey;
  };

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const value = {
    address,
    privateKey,
    balance,
    isConnected,
    isLoading,
    error,
    createWallet,
    connectWallet,
    disconnectWallet,
    sendTransaction,
    clearError,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

export default WalletContext;
