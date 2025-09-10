import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  CircularProgress,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Snackbar,
  Alert,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Search as SearchIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  MoreVert as MoreVertIcon,
  Add as AddIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useWallet } from '../contexts/WalletContext';

// Mock data for memories
const mockMemories = [
  {
    id: '1',
    content: 'User prefers dark mode for the interface.',
    timestamp: '2023-05-15T10:30:00Z',
    tags: ['preferences', 'ui'],
    metadata: {
      type: 'preference',
      source: 'user_settings',
    },
  },
  {
    id: '2',
    content: 'User is interested in machine learning and AI safety.',
    timestamp: '2023-05-14T15:20:00Z',
    tags: ['interests', 'ai'],
    metadata: {
      type: 'interest',
      source: 'conversation',
    },
  },
  {
    id: '3',
    content: 'User asked about the difference between supervised and unsupervised learning.',
    timestamp: '2023-05-13T09:15:00Z',
    tags: ['machine_learning', 'education'],
    metadata: {
      type: 'conversation',
      source: 'chat_history',
    },
  },
];

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
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

function MemoriesPage() {
  const { isConnected } = useWallet();
  const [searchQuery, setSearchQuery] = useState('');
  const [memories, setMemories] = useState([]);
  const [filteredMemories, setFilteredMemories] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedMemory, setSelectedMemory] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [anchorEl, setAnchorEl] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  // Fetch memories from the backend
  useEffect(() => {
    const fetchMemories = async () => {
      if (!isConnected) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // In a real app, you would fetch from the backend
        // const response = await axios.get('/api/memories');
        // setMemories(response.data);
        
        // Using mock data for now
        setMemories(mockMemories);
        setFilteredMemories(mockMemories);
      } catch (err) {
        console.error('Error fetching memories:', err);
        setError('Failed to load memories. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMemories();
  }, [isConnected]);

  // Filter memories based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredMemories(memories);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = memories.filter(
      memory =>
        memory.content.toLowerCase().includes(query) ||
        memory.tags.some(tag => tag.toLowerCase().includes(query))
    );
    
    setFilteredMemories(filtered);
  }, [searchQuery, memories]);

  const handleOpenMenu = (event, memory) => {
    setAnchorEl(event.currentTarget);
    setSelectedMemory(memory);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleEditClick = () => {
    if (selectedMemory) {
      setEditedContent(selectedMemory.content);
      setIsEditDialogOpen(true);
    }
    handleCloseMenu();
  };

  const handleDeleteClick = () => {
    setIsDeleteDialogOpen(true);
    handleCloseMenu();
  };

  const handleSaveEdit = async () => {
    if (!selectedMemory || !editedContent.trim()) return;
    
    try {
      // In a real app, you would make an API call to update the memory
      // await axios.patch(`/api/memories/${selectedMemory.id}`, { content: editedContent });
      
      // Update local state
      const updatedMemories = memories.map(memory =>
        memory.id === selectedMemory.id
          ? { ...memory, content: editedContent }
          : memory
      );
      
      setMemories(updatedMemories);
      setSnackbar({
        open: true,
        message: 'Memory updated successfully',
        severity: 'success',
      });
      setIsEditDialogOpen(false);
    } catch (err) {
      console.error('Error updating memory:', err);
      setSnackbar({
        open: true,
        message: 'Failed to update memory',
        severity: 'error',
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedMemory) return;
    
    try {
      // In a real app, you would make an API call to delete the memory
      // await axios.delete(`/api/memories/${selectedMemory.id}`);
      
      // Update local state
      const updatedMemories = memories.filter(memory => memory.id !== selectedMemory.id);
      setMemories(updatedMemories);
      setSnackbar({
        open: true,
        message: 'Memory deleted successfully',
        severity: 'success',
      });
      setIsDeleteDialogOpen(false);
    } catch (err) {
      console.error('Error deleting memory:', err);
      setSnackbar({
        open: true,
        message: 'Failed to delete memory',
        severity: 'error',
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
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
          To view and manage your memories, please connect your wallet first.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="memory tabs">
          <Tab label="All Memories" />
          <Tab label="Recent" />
          <Tab label="Starred" />
        </Tabs>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <TextField
          variant="outlined"
          placeholder="Search memories..."
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ width: 300 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => {
            setSelectedMemory(null);
            setEditedContent('');
            setIsEditDialogOpen(true);
          }}
        >
          New Memory
        </Button>
      </Box>

      {isLoading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : filteredMemories.length === 0 ? (
        <Paper
          sx={{
            p: 4,
            textAlign: 'center',
            color: 'text.secondary',
            bgcolor: 'background.paper',
          }}
        >
          <Typography variant="h6" gutterBottom>
            No memories found
          </Typography>
          <Typography variant="body2">
            {searchQuery
              ? 'Try a different search term'
              : 'Start by creating your first memory'}
          </Typography>
        </Paper>
      ) : (
        <List>
          {filteredMemories.map((memory) => (
            <React.Fragment key={memory.id}>
              <ListItem
                alignItems="flex-start"
                sx={{
                  '&:hover': {
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                  },
                }}
                secondaryAction={
                  <IconButton
                    edge="end"
                    aria-label="more"
                    onClick={(e) => handleOpenMenu(e, memory)}
                  >
                    <MoreVertIcon />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={memory.content}
                  secondary={
                    <>
                      <Typography
                        component="span"
                        variant="body2"
                        color="text.secondary"
                        display="block"
                        mb={1}
                      >
                        {formatDate(memory.timestamp)}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {memory.tags.map((tag) => (
                          <Chip
                            key={tag}
                            label={tag}
                            size="small"
                            variant="outlined"
                            onClick={() => setSearchQuery(tag)}
                          />
                        ))}
                      </Box>
                    </>
                  }
                />
              </ListItem>
              <Divider variant="inset" component="li" />
            </React.Fragment>
          ))}
        </List>
      )}

      {/* Edit Memory Dialog */}
      <Dialog
        open={isEditDialogOpen}
        onClose={() => setIsEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedMemory ? 'Edit Memory' : 'New Memory'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Memory content"
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
          />
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Tags (comma-separated)
            </Typography>
            <TextField
              fullWidth
              variant="outlined"
              size="small"
              placeholder="e.g., preferences, ui, settings"
              defaultValue={selectedMemory?.tags?.join(', ') || ''}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSaveEdit}
            variant="contained"
            disabled={!editedContent.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Memory</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this memory? This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Memory Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
      >
        <MenuItem onClick={handleEditClick}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={handleDeleteClick}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} color="error" />
          <Typography color="error">Delete</Typography>
        </MenuItem>
      </Menu>

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

export default MemoriesPage;
