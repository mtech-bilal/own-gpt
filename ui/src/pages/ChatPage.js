import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  CircularProgress,
  Tooltip,
  Chip,
} from '@mui/material';
import {
  Send as SendIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
} from '@mui/icons-material';
import { useChat } from '../contexts/ChatContext';

function ChatPage() {
  const theme = useTheme();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);
  
  const {
    messages,
    isTyping,
    sendMessage,
    sendFeedback,
    activeMemoryIds,
  } = useChat();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (message.trim() === '') return;
    
    await sendMessage(message);
    setMessage('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFeedback = (messageId, type) => {
    sendFeedback(messageId, type);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 64px)',
        maxWidth: '900px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        {messages.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'text.secondary',
              textAlign: 'center',
              px: 2,
            }}
          >
            <Typography variant="h5" gutterBottom>
              Welcome to LocalGPT
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Start a conversation by typing a message below.
            </Typography>
          </Box>
        ) : (
          <List sx={{ width: '100%', maxWidth: '100%' }}>
            {messages.map((msg, index) => (
              <React.Fragment key={msg.id}>
                <ListItem
                  alignItems="flex-start"
                  sx={{
                    flexDirection: 'column',
                    alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                    px: 1,
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      maxWidth: '80%',
                      ...(msg.sender === 'user' && { ml: 'auto' }),
                    }}
                  >
                    {msg.sender === 'assistant' && (
                      <Avatar
                        sx={{
                          bgcolor: 'primary.main',
                          width: 32,
                          height: 32,
                          mr: 1,
                          mt: 0.5,
                        }}
                      >
                        AI
                      </Avatar>
                    )}
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <Paper
                        elevation={2}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          bgcolor:
                            msg.sender === 'user'
                              ? 'primary.main'
                              : 'background.paper',
                          color:
                            msg.sender === 'user' ? 'primary.contrastText' : 'text.primary',
                        }}
                      >
                        <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                          {msg.content}
                        </Typography>
                      </Paper>
                      {msg.sender === 'assistant' && (
                        <Box
                          sx={{
                            display: 'flex',
                            gap: 1,
                            mt: 0.5,
                            visibility: msg.id ? 'visible' : 'hidden',
                          }}
                        >
                          <Tooltip title="Good response">
                            <IconButton
                              size="small"
                              color={msg.feedback === 'like' ? 'primary' : 'default'}
                              onClick={() => handleFeedback(msg.id, 'like')}
                            >
                              <ThumbUpIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Could be better">
                            <IconButton
                              size="small"
                              color={msg.feedback === 'dislike' ? 'error' : 'default'}
                              onClick={() => handleFeedback(msg.id, 'dislike')}
                            >
                              <ThumbDownIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )}
                      {msg.usedMemories && msg.usedMemories.length > 0 && (
                        <Box sx={{ mt: 1, maxWidth: '100%' }}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block', mb: 0.5 }}
                          >
                            Used memories:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {msg.usedMemories.map((memory) => (
                              <Chip
                                key={memory.id}
                                label={memory.content.substring(0, 30) + '...'}
                                size="small"
                                variant="outlined"
                                color={activeMemoryIds.includes(memory.id) ? 'primary' : 'default'}
                                sx={{ cursor: 'pointer' }}
                                onClick={() => {}}
                              />
                            ))}
                          </Box>
                        </Box>
                      )}
                    </Box>
                    {msg.sender === 'user' && (
                      <Avatar
                        sx={{
                          bgcolor: 'secondary.main',
                          width: 32,
                          height: 32,
                          ml: 1,
                          mt: 0.5,
                        }}
                      >
                        U
                      </Avatar>
                    )}
                  </Box>
                </ListItem>
                {index < messages.length - 1 && <Divider variant="inset" component="li" />}
              </React.Fragment>
            ))}
            {isTyping && (
              <ListItem alignItems="flex-start">
                <Box display="flex" alignItems="center">
                  <Avatar
                    sx={{
                      bgcolor: 'primary.main',
                      width: 32,
                      height: 32,
                      mr: 1,
                    }}
                  >
                    AI
                  </Avatar>
                  <CircularProgress size={20} />
                </Box>
              </ListItem>
            )}
            <div ref={messagesEndRef} />
          </List>
        )}
      </Box>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          p: 2,
          borderTop: `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.paper',
          position: 'sticky',
          bottom: 0,
          zIndex: theme.zIndex.appBar,
        }}
      >
        <Box display="flex" gap={1}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            multiline
            maxRows={4}
            disabled={isTyping}
            InputProps={{
              sx: {
                borderRadius: 4,
                bgcolor: 'background.paper',
                '&:hover': {
                  bgcolor: 'background.paper',
                },
                '&.Mui-focused': {
                  bgcolor: 'background.paper',
                },
              },
            }}
          />
          <IconButton
            type="submit"
            color="primary"
            disabled={!message.trim() || isTyping}
            sx={{
              alignSelf: 'flex-end',
              height: '56px',
              width: '56px',
              borderRadius: '50%',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': {
                bgcolor: 'primary.dark',
              },
              '&:disabled': {
                bgcolor: 'action.disabledBackground',
                color: 'action.disabled',
              },
            }}
          >
            <SendIcon />
          </IconButton>
        </Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 1, textAlign: 'center' }}
        >
          LocalGPT - Your data never leaves your machine
        </Typography>
      </Box>
    </Box>
  );
}

export default ChatPage;
