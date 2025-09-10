import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';

// Mock matchMedia
window.matchMedia = window.matchMedia || function() {
  return {
    matches: false,
    addListener: function() {},
    removeListener: function() {},
  };
};

// Mock ResizeObserver
class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserver;

// Configure test timeout
jest.setTimeout(30000);

// Configure testing library
try {
  configure({ testIdAttribute: 'data-testid' });
} catch (e) {
  console.error('Error configuring testing library:', e);
}

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock fetch
global.fetch = jest.fn();

// Mock window.scrollTo
window.scrollTo = jest.fn();

// Mock console.error to fail tests on React warnings
const originalConsoleError = console.error;
console.error = (message, ...args) => {
  if (/(Failed prop type|React does not recognize the.*prop on a DOM element)/.test(message)) {
    throw new Error(message);
  }
  originalConsoleError(message, ...args);
};
