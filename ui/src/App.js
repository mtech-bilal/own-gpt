import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { RecoilRoot } from 'recoil';

// Components
import Layout from './components/Layout';
import ChatPage from './pages/ChatPage';
import WalletPage from './pages/WalletPage';
import MemoriesPage from './pages/MemoriesPage';
import SettingsPage from './pages/SettingsPage';
import { theme } from './theme';

// State
import { WalletProvider } from './contexts/WalletContext';
import { ChatProvider } from './contexts/ChatContext';

function App() {
  return (
    <RecoilRoot>
      <ThemeProvider theme={theme}>
        <WalletProvider>
          <ChatProvider>
            <CssBaseline />
            <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<ChatPage />} />
                  <Route path="chat" element={<ChatPage />} />
                  <Route path="wallet" element={<WalletPage />} />
                  <Route path="memories" element={<MemoriesPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                </Route>
              </Routes>
            </Box>
          </ChatProvider>
        </WalletProvider>
      </ThemeProvider>
    </RecoilRoot>
  );
}

export default App;
