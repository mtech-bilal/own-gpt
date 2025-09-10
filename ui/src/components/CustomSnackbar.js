import React from 'react';
import { Snackbar, Alert, Slide } from '@mui/material';
import { useSnackbar } from '../contexts/SnackbarContext';

function SlideTransition(props) {
  return <Slide {...props} direction="up" />;
}

const CustomSnackbar = () => {
  const { snackbar, hideSnackbar } = useSnackbar();

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    hideSnackbar();
  };

  return (
    <Snackbar
      open={snackbar.open}
      autoHideDuration={snackbar.autoHideDuration}
      onClose={handleClose}
      TransitionComponent={SlideTransition}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      sx={{
        '& .MuiPaper-root': {
          minWidth: '300px',
        },
      }}
    >
      <Alert
        onClose={handleClose}
        severity={snackbar.severity}
        variant="filled"
        sx={{
          width: '100%',
          boxShadow: 3,
          '& .MuiAlert-message': {
            py: 1,
          },
          '& .MuiAlert-icon': {
            alignItems: 'center',
          },
        }}
      >
        {snackbar.message}
      </Alert>
    </Snackbar>
  );
};

export default CustomSnackbar;
