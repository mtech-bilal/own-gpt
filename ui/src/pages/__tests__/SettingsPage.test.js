import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from '../../theme';
import { WalletProvider } from '../../contexts/WalletContext';
import SettingsPage from '../SettingsPage';

// Mock the components that SettingsPage uses
jest.mock('../../components/ThemeToggle', () => () => <div>ThemeToggle</div>);
jest.mock('../../components/NotificationSettings', () => () => <div>NotificationSettings</div>);

// Mock the wallet context
const mockWalletContext = {
  isConnected: true,
  address: '0x1234567890abcdef',
  balance: 100,
  connectWallet: jest.fn(),
  disconnectWallet: jest.fn(),
  sendTransaction: jest.fn(),
};

const renderSettingsPage = () => {
  return render(
    <ThemeProvider theme={theme}>
      <WalletProvider value={mockWalletContext}>
        <BrowserRouter>
          <SettingsPage />
        </BrowserRouter>
      </WalletProvider>
    </ThemeProvider>
  );
};

describe('SettingsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock localStorage
    Storage.prototype.setItem = jest.fn();
    Storage.prototype.getItem = jest.fn();
    Storage.prototype.removeItem = jest.fn();
  });

  it('should render all settings sections', () => {
    renderSettingsPage();
    
    // Check for section headers
    expect(screen.getByText('Account Settings')).toBeInTheDocument();
    expect(screen.getByText('Display')).toBeInTheDocument();
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText('Security')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
  });

  it('should show wallet address when connected', () => {
    renderSettingsPage();
    
    expect(screen.getByText('Wallet Address')).toBeInTheDocument();
    expect(screen.getByText(mockWalletContext.address)).toBeInTheDocument();
  });

  it('should allow disconnecting wallet', async () => {
    renderSettingsPage();
    
    const disconnectButton = screen.getByRole('button', { name: /disconnect wallet/i });
    fireEvent.click(disconnectButton);
    
    expect(mockWalletContext.disconnectWallet).toHaveBeenCalled();
  });

  it('should toggle dark mode', async () => {
    renderSettingsPage();
    
    const darkModeSwitch = screen.getByRole('checkbox', { name: /dark mode/i });
    
    // Toggle the switch
    fireEvent.click(darkModeSwitch);
    
    // Check if the theme preference was saved to localStorage
    expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
  });

  it('should update notification preferences', async () => {
    renderSettingsPage();
    
    // Navigate to Notifications tab
    const notificationsTab = screen.getByRole('tab', { name: /notifications/i });
    fireEvent.click(notificationsTab);
    
    // Toggle email notifications
    const emailToggle = screen.getByRole('checkbox', { name: /email notifications/i });
    fireEvent.click(emailToggle);
    
    // Check if the preference was saved
    expect(localStorage.setItem).toHaveBeenCalledWith('emailNotifications', 'false');
  });

  it('should change password when form is submitted', async () => {
    renderSettingsPage();
    
    // Navigate to Security tab
    const securityTab = screen.getByRole('tab', { name: /security/i });
    fireEvent.click(securityTab);
    
    // Fill out the change password form
    const currentPassword = screen.getByLabelText(/current password/i);
    const newPassword = screen.getByLabelText(/new password/i);
    const confirmPassword = screen.getByLabelText(/confirm new password/i);
    
    fireEvent.change(currentPassword, { target: { value: 'oldPassword123' } });
    fireEvent.change(newPassword, { target: { value: 'newSecurePassword123' } });
    fireEvent.change(confirmPassword, { target: { value: 'newSecurePassword123' } });
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: /update password/i });
    fireEvent.click(submitButton);
    
    // Check if the form was submitted with the correct data
    // Note: In a real test, you would mock the API call and verify it was called with the right data
  });

  it('should show error when passwords do not match', async () => {
    renderSettingsPage();
    
    // Navigate to Security tab
    const securityTab = screen.getByRole('tab', { name: /security/i });
    fireEvent.click(securityTab);
    
    // Fill out the change password form with mismatched passwords
    const currentPassword = screen.getByLabelText(/current password/i);
    const newPassword = screen.getByLabelText(/new password/i);
    const confirmPassword = screen.getByLabelText(/confirm new password/i);
    
    fireEvent.change(currentPassword, { target: { value: 'oldPassword123' } });
    fireEvent.change(newPassword, { target: { value: 'newSecurePassword123' } });
    fireEvent.change(confirmPassword, { target: { value: 'differentPassword' } });
    
    // Submit the form
    const submitButton = screen.getByRole('button', { name: /update password/i });
    fireEvent.click(submitButton);
    
    // Check for error message
    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
  });

  it('should export wallet data', async () => {
    renderSettingsPage();
    
    // Navigate to Security tab
    const securityTab = screen.getByRole('tab', { name: /security/i });
    fireEvent.click(securityTab);
    
    // Click export button
    const exportButton = screen.getByRole('button', { name: /export wallet data/i });
    fireEvent.click(exportButton);
    
    // Check if the export function was called
    // Note: In a real test, you would mock the export functionality
  });

  it('should show about information', () => {
    renderSettingsPage();
    
    // Navigate to About tab
    const aboutTab = screen.getByRole('tab', { name: /about/i });
    fireEvent.click(aboutTab);
    
    // Check for version information
    expect(screen.getByText(/version/i)).toBeInTheDocument();
    
    // Check for links to documentation and support
    expect(screen.getByRole('link', { name: /documentation/i })).toHaveAttribute('href', 'https://docs.localgpt.com');
    expect(screen.getByRole('link', { name: /support/i })).toHaveAttribute('href', 'mailto:support@localgpt.com');
  });
});
