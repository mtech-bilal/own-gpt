import React from 'react';
import { LoadingButton as MuiLoadingButton } from '@mui/lab';
import { styled } from '@mui/material/styles';

const StyledLoadingButton = styled(MuiLoadingButton)(({ theme, variant, color = 'primary' }) => ({
  ...(variant === 'contained' && {
    '&.Mui-disabled': {
      backgroundColor: theme.palette[color].main,
      opacity: 0.7,
      color: theme.palette[color].contrastText,
    },
  }),
  '& .MuiCircularProgress-root': {
    color: 'inherit',
  },
  textTransform: 'none',
  borderRadius: 8,
  fontWeight: 500,
  letterSpacing: 0.5,
  boxShadow: 'none',
  '&:hover': {
    boxShadow: 'none',
  },
}));

const LoadingButton = ({
  children,
  loading = false,
  loadingPosition = 'center',
  loadingIndicator = 'Loading...',
  disabled = false,
  fullWidth = false,
  size = 'medium',
  variant = 'contained',
  color = 'primary',
  startIcon,
  endIcon,
  onClick,
  sx = {},
  ...props
}) => {
  return (
    <StyledLoadingButton
      loading={loading}
      loadingPosition={loadingPosition}
      loadingIndicator={loadingIndicator}
      disabled={disabled || loading}
      fullWidth={fullWidth}
      size={size}
      variant={variant}
      color={color}
      startIcon={startIcon}
      endIcon={endIcon}
      onClick={onClick}
      sx={{
        ...(fullWidth && { width: '100%' }),
        ...sx,
      }}
      {...props}
    >
      {!loading && children}
    </StyledLoadingButton>
  );
};

export default LoadingButton;
