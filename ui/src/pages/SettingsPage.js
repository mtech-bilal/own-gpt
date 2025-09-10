import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Divider,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Grid,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  FormHelperText,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Snackbar,
  Alert,
  CircularProgress,
  Tab,
  Tabs,
  Slider,
  Tooltip,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { useWallet } from '../contexts/WalletContext';

// Mock data for API keys
const mockApiKeys = [
  { id: '1', name: 'OpenAI API', key: 'sk-...xyz123', created: '2023-05-10' },
  { id: '2', name: 'Anthropic API', key: 'sk-ant-...abc456', created: '2023-05-15' },
];

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function SettingsPage() {
  const { isConnected, disconnectWallet } = useWallet();
  const [activeTab, setActiveTab] = useState(0);
  const [settings, setSettings] = useState({
    theme: 'dark',
    fontSize: 14,
    enableNotifications: true,
    autoSave: true,
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 1000,
  });
  const [apiKeys, setApiKeys] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedApiKey, setSelectedApiKey] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [newApiKey, setNewApiKey] = useState({
    name: '',
    key: '',
  });

  // Load settings and API keys on mount
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      try {
        // In a real app, you would load these from the backend
        // const response = await axios.get('/api/settings');
        // setSettings(response.data);
        
        // Using mock data for now
        setApiKeys(mockApiKeys);
      } catch (err) {
        console.error('Error loading settings:', err);
        showSnackbar('Failed to load settings', 'error');
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleSettingChange = (setting, value) => {
    setSettings(prev => ({
      ...prev,
      [setting]: value,
    }));
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      // In a real app, you would save these to the backend
      // await axios.post('/api/settings', settings);
      showSnackbar('Settings saved successfully', 'success');
    } catch (err) {
      console.error('Error saving settings:', err);
      showSnackbar('Failed to save settings', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddApiKey = () => {
    setNewApiKey({ name: '', key: '' });
    setSelectedApiKey(null);
    setIsApiKeyDialogOpen(true);
  };

  const handleEditApiKey = (apiKey) => {
    setNewApiKey({ name: apiKey.name, key: apiKey.key });
    setSelectedApiKey(apiKey);
    setIsApiKeyDialogOpen(true);
  };

  const handleDeleteApiKey = (apiKey) => {
    setSelectedApiKey(apiKey);
    setIsDeleteDialogOpen(true);
  };

  const handleSaveApiKey = async () => {
    if (!newApiKey.name.trim() || !newApiKey.key.trim()) {
      showSnackbar('Please fill in all fields', 'error');
      return;
    }

    setIsLoading(true);
    try {
      // In a real app, you would save the API key to the backend
      // const response = await axios.post('/api/keys', newApiKey);
      
      if (selectedApiKey) {
        // Update existing key
        const updatedKeys = apiKeys.map(key => 
          key.id === selectedApiKey.id 
            ? { ...key, name: newApiKey.name, key: newApiKey.key }
            : key
        );
        setApiKeys(updatedKeys);
        showSnackbar('API key updated successfully', 'success');
      } else {
        // Add new key
        const newKey = {
          id: `key-${Date.now()}`,
          name: newApiKey.name,
          key: newApiKey.key,
          created: new Date().toISOString().split('T')[0],
        };
        setApiKeys([...apiKeys, newKey]);
        showSnackbar('API key added successfully', 'success');
      }
      
      setIsApiKeyDialogOpen(false);
      setNewApiKey({ name: '', key: '' });
    } catch (err) {
      console.error('Error saving API key:', err);
      showSnackbar('Failed to save API key', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedApiKey) return;

    setIsLoading(true);
    try {
      // In a real app, you would delete the API key from the backend
      // await axios.delete(`/api/keys/${selectedApiKey.id}`);
      
      const updatedKeys = apiKeys.filter(key => key.id !== selectedApiKey.id);
      setApiKeys(updatedKeys);
      showSnackbar('API key deleted successfully', 'success');
      setIsDeleteDialogOpen(false);
    } catch (err) {
      console.error('Error deleting API key:', err);
      showSnackbar('Failed to delete API key', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleDisconnectWallet = () => {
    disconnectWallet();
    showSnackbar('Wallet disconnected', 'info');
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
        <Typography variant="h5" gutterBottom>
          Connect Your Wallet
        </Typography>
        <Typography color="text.secondary" paragraph>
          To access settings, please connect your wallet first.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        aria-label="settings tabs"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="General" />
        <Tab label="AI Model" />
        <Tab label="API Keys" />
        <Tab label="Advanced" />
      </Tabs>

      <TabPanel value={activeTab} index={0}>
        <Typography variant="h6" gutterBottom>
          General Settings
        </Typography>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.theme === 'dark'}
                    onChange={(e) =>
                      handleSettingChange('theme', e.target.checked ? 'dark' : 'light')
                    }
                    color="primary"
                  />
                }
                label="Dark Mode"
              />
              <FormHelperText>
                Toggle between light and dark theme
              </FormHelperText>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box>
                <Typography id="font-size-slider" gutterBottom>
                  Font Size: {settings.fontSize}px
                </Typography>
                <Slider
                  value={settings.fontSize}
                  onChange={(e, value) => handleSettingChange('fontSize', value)}
                  aria-labelledby="font-size-slider"
                  valueLabelDisplay="auto"
                  step={1}
                  marks
                  min={12}
                  max={24}
                />
              </Box>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.enableNotifications}
                    onChange={(e) =>
                      handleSettingChange('enableNotifications', e.target.checked)
                    }
                    color="primary"
                  />
                }
                label="Enable Notifications"
              />
              <FormHelperText>
                Receive desktop notifications for important updates
              </FormHelperText>
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.autoSave}
                    onChange={(e) =>
                      handleSettingChange('autoSave', e.target.checked)
                    }
                    color="primary"
                  />
                }
                label="Auto-save Conversations"
              />
              <FormHelperText>
                Automatically save your conversation history
              </FormHelperText>
            </Grid>
          </Grid>
        </Paper>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <Typography variant="h6" gutterBottom>
          AI Model Settings
        </Typography>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="model-select-label">Model</InputLabel>
                <Select
                  labelId="model-select-label"
                  id="model-select"
                  value={settings.model}
                  label="Model"
                  onChange={(e) => handleSettingChange('model', e.target.value)}
                >
                  <MenuItem value="gpt-4">GPT-4</MenuItem>
                  <MenuItem value="gpt-3.5-turbo">GPT-3.5 Turbo</MenuItem>
                  <MenuItem value="claude-2">Claude 2</MenuItem>
                  <MenuItem value="llama-2-70b">LLaMA 2 (70B)</MenuItem>
                </Select>
                <FormHelperText>
                  Select the default AI model to use
                </FormHelperText>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box>
                <Typography id="temperature-slider" gutterBottom>
                  Temperature: {settings.temperature.toFixed(1)}
                </Typography>
                <Slider
                  value={settings.temperature}
                  onChange={(e, value) => handleSettingChange('temperature', value)}
                  aria-labelledby="temperature-slider"
                  valueLabelDisplay="auto"
                  step={0.1}
                  min={0}
                  max={1}
                />
                <FormHelperText>
                  Higher values make the output more random, lower values more deterministic
                </FormHelperText>
              </Box>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Max Tokens"
                type="number"
                value={settings.maxTokens}
                onChange={(e) =>
                  handleSettingChange('maxTokens', parseInt(e.target.value, 10) || 1000)
                }
                margin="normal"
                helperText="Maximum number of tokens to generate in each response"
              />
            </Grid>
          </Grid>
        </Paper>
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">API Keys</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddApiKey}
          >
            Add API Key
          </Button>
        </Box>
        <Paper sx={{ p: 2, mb: 3 }}>
          {apiKeys.length === 0 ? (
            <Box textAlign="center" p={3}>
              <Typography color="text.secondary">
                No API keys found. Add your first API key to get started.
              </Typography>
            </Box>
          ) : (
            <List>
              {apiKeys.map((apiKey) => (
                <React.Fragment key={apiKey.id}>
                  <ListItem>
                    <ListItemText
                      primary={apiKey.name}
                      secondary={`Created on ${apiKey.created}`}
                    />
                    <ListItemText
                      primary={
                        <Typography variant="body2" fontFamily="monospace">
                          {apiKey.key}
                        </Typography>
                      }
                      secondary="Last used: 2 days ago"
                      sx={{ mx: 2 }}
                    />
                    <ListItemSecondaryAction>
                      <Tooltip title="Edit">
                        <IconButton
                          edge="end"
                          aria-label="edit"
                          onClick={() => handleEditApiKey(apiKey)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          edge="end"
                          aria-label="delete"
                          onClick={() => handleDeleteApiKey(apiKey)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider variant="inset" component="li" />
                </React.Fragment>
              ))}
            </List>
          )}
        </Paper>
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        <Typography variant="h6" gutterBottom>
          Advanced Settings
        </Typography>
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Wallet Connection
              </Typography>
              <Button
                variant="outlined"
                color="error"
                onClick={handleDisconnectWallet}
                disabled={!isConnected}
              >
                Disconnect Wallet
              </Button>
              <FormHelperText>
                Disconnect your wallet from this application
              </FormHelperText>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Clear Data
              </Typography>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear all local data? This cannot be undone.')) {
                    localStorage.clear();
                    window.location.reload();
                  }
                }}
              >
                Clear All Local Data
              </Button>
              <FormHelperText>
                This will clear all locally stored data, including chat history and preferences
              </FormHelperText>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                About
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                LocalGPT v1.0.0
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                A privacy-focused AI assistant that runs entirely on your device.
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Need help? Visit our documentation or contact support.
                </Typography>
                <Button
                  variant="text"
                  size="small"
                  sx={{ ml: 1 }}
                  onClick={() =>
                    window.open('https://github.com/yourusername/localgpt', '_blank')
                  }
                >
                  Documentation
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </TabPanel>

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={handleSaveSettings}
          disabled={isLoading}
        >
          {isLoading ? <CircularProgress size={24} /> : 'Save Settings'}
        </Button>
      </Box>

      {/* Add/Edit API Key Dialog */}
      <Dialog
        open={isApiKeyDialogOpen}
        onClose={() => setIsApiKeyDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedApiKey ? 'Edit API Key' : 'Add New API Key'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            variant="outlined"
            value={newApiKey.name}
            onChange={(e) =>
              setNewApiKey({ ...newApiKey, name: e.target.value })
            }
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="API Key"
            fullWidth
            variant="outlined"
            value={newApiKey.key}
            onChange={(e) =>
              setNewApiKey({ ...newApiKey, key: e.target.value })
            }
            helperText="Enter your API key. For security, it will be stored locally on your device only."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsApiKeyDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSaveApiKey}
            variant="contained"
            disabled={!newApiKey.name.trim() || !newApiKey.key.trim() || isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete API Key</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the API key "{selectedApiKey?.name}"?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default SettingsPage;
