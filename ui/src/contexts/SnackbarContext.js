import React, { createContext, useContext, useState, useCallback } from 'react';

export const SnackbarContext = createContext({
  showSnackbar: () => {},
  hideSnackbar: () => {},
  snackbar: null,
});

export const SnackbarProvider = ({ children }) => {
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success', // 'success', 'error', 'warning', 'info'
    autoHideDuration: 6000,
  });

  const showSnackbar = useCallback((message, severity = 'success', autoHideDuration = 6000) => {
    setSnackbar({
      open: true,
      message,
      severity,
      autoHideDuration,
    });
  }, []);

  const hideSnackbar = useCallback(() => {
    setSnackbar(prev => ({
      ...prev,
      open: false,
    }));
  }, []);

  const value = {
    showSnackbar,
    hideSnackbar,
    snackbar,
  };

  return (
    <SnackbarContext.Provider value={value}>
      {children}
    </SnackbarContext.Provider>
  );
};

export const useSnackbar = () => {
  const context = useContext(SnackbarContext);
  if (!context) {
    throw new Error('useSnackbar must be used within a SnackbarProvider');
  }
  return context;
};

export default SnackbarContext;
