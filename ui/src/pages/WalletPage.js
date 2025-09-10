import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  TextField,
  Divider,
  Grid,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Tooltip,
  CircularProgress,
  Snackbar,
  Alert,
  InputAdornment,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Refresh as RefreshIcon,
  AccountBalanceWallet as WalletIcon,
  Send as SendIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { useWallet } from '../contexts/WalletContext';

function WalletPage() {
  const {
    address,
    balance,
    createWallet,
    connectWallet,
    sendTransaction,
    isConnected,
    isLoading,
    error,
    clearError,
  } = useWallet();

  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [copied, setCopied] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
    }
  };

  const handleSend = async () => {
    if (!recipient || !amount) return;
    
    try {
      await sendTransaction(recipient, parseFloat(amount));
      setAmount('');
      setRecipient('');
      setShowSuccess(true);
    } catch (err) {
      console.error('Error sending transaction:', err);
    }
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  if (!isConnected) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          textAlign: 'center',
          p: 3,
        }}
      >
        <WalletIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          Connect Your Wallet
        </Typography>
        <Typography color="text.secondary" paragraph>
          To use the wallet features, please connect or create a wallet.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Button
            variant="contained"
            onClick={connectWallet}
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} /> : null}
          >
            Connect Wallet
          </Button>
          <Button
            variant="outlined"
            onClick={createWallet}
            disabled={isLoading}
            startIcon={isLoading ? <CircularProgress size={20} /> : null}
          >
            Create New Wallet
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: { xs: 1, sm: 3 } }}>
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={clearError}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={clearError} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={showSuccess}
        autoHideDuration={6000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={() => setShowSuccess(false)} severity="success" sx={{ width: '100%' }}>
          Transaction sent successfully!
        </Alert>
      </Snackbar>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Wallet Balance
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" component="div">
                  {balance.toFixed(4)}
                </Typography>
                <Typography variant="h6" color="primary" sx={{ ml: 1 }}>
                  LGPT
                </Typography>
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  p: 1,
                  mt: 2,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: 'monospace',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    flex: 1,
                  }}
                >
                  {address}
                </Typography>
                <Tooltip title={copied ? 'Copied!' : 'Copy address'}>
                  <IconButton onClick={handleCopyAddress} size="small">
                    {copied ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
              </Box>
            </CardContent>
            <CardActions sx={{ justifyContent: 'space-between', p: 2 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  const privateKey = localStorage.getItem('private_key');
                  if (privateKey) {
                    navigator.clipboard.writeText(privateKey);
                    setCopied(true);
                  }
                }}
                disabled={copied}
                startIcon={<CopyIcon />}
              >
                {copied ? 'Copied!' : 'Copy Private Key'}
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={connectWallet}
                startIcon={<RefreshIcon />}
              >
                Refresh
              </Button>
            </CardActions>
          </Card>

          <Card elevation={3} sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Receive Tokens
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Share your address to receive LGPT tokens
              </Typography>
              <TextField
                fullWidth
                variant="outlined"
                value={address}
                margin="normal"
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Copy address">
                        <IconButton onClick={handleCopyAddress} edge="end">
                          {copied ? <CheckIcon /> : <CopyIcon />}
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={3}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Send Tokens
              </Typography>
              <TextField
                fullWidth
                label="Recipient Address"
                variant="outlined"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                margin="normal"
                placeholder="Enter recipient's address"
              />
              <TextField
                fullWidth
                label="Amount (LGPT)"
                type="number"
                variant="outlined"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                margin="normal"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">LGPT</InputAdornment>
                  ),
                }}
              />
              <Button
                fullWidth
                variant="contained"
                color="primary"
                size="large"
                onClick={handleSend}
                disabled={!recipient || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > balance}
                startIcon={<SendIcon />}
                sx={{ mt: 2 }}
              >
                Send
              </Button>
            </CardContent>
          </Card>

          <Card elevation={3} sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Get Test Tokens
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Get free test LGPT tokens to try out the platform
              </Typography>
              <Button
                fullWidth
                variant="outlined"
                onClick={async () => {
                  try {
                    // Call backend to get test tokens
                    // This is a placeholder - implement the actual API call
                    setShowSuccess(true);
                  } catch (err) {
                    console.error('Error getting test tokens:', err);
                  }
                }}
              >
                Get 100 Test LGPT
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default WalletPage;
