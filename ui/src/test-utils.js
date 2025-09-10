import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import { theme } from './theme';

// Mock providers for testing
const AllTheProviders = ({ children }) => {
  return (
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        {children}
      </MemoryRouter>
    </ThemeProvider>
  );
};

// Custom render function that includes all providers
const customRender = (ui, options) =>
  render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';

// Override render method
export { customRender as render };

// Helper functions
export const mockLocalStorage = () => {
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  };
  
  global.localStorage = localStorageMock;
  return localStorageMock;
};

export const mockSessionStorage = () => {
  const sessionStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  };
  
  global.sessionStorage = sessionStorageMock;
  return sessionStorageMock;
};

export const mockMatchMedia = () => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
};

export const mockResizeObserver = () => {
  global.ResizeObserver = class MockResizeObserver {
    constructor(callback) {
      this.observe = jest.fn();
      this.unobserve = jest.fn();
      this.disconnect = jest.fn();
      this.callback = callback;
    }
  };
};

export const mockFetch = (response, ok = true) => {
  global.fetch = jest.fn().mockImplementation(() =>
    Promise.resolve({
      ok,
      json: () => Promise.resolve(response),
      text: () => Promise.resolve(JSON.stringify(response)),
      headers: new Headers(),
      redirected: false,
      status: 200,
      statusText: 'OK',
      type: 'basic',
      url: 'http://localhost',
      clone: function() {
        return this;
      },
    })
  );
};

export const mockFetchError = (error) => {
  global.fetch = jest.fn().mockImplementation(() => Promise.reject(error));
};
