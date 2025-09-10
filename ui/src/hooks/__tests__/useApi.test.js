import { renderHook, act } from '@testing-library/react-hooks';
import { mockFetch, mockFetchError } from '../../test-utils';
import { useApi } from '../useApi';

describe('useApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockFetch({ data: 'test' });
  });

  it('should make a GET request', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useApi());
    
    let response;
    await act(async () => {
      response = await result.current.get('/test');
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/test'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      })
    );
    expect(response).toEqual({ data: 'test' });
  });

  it('should include auth token in headers when available', async () => {
    const token = 'test-token';
    localStorage.setItem('auth_token', token);
    
    const { result } = renderHook(() => useApi());
    
    await act(async () => {
      await result.current.get('/protected');
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': `Bearer ${token}`,
        }),
      })
    );
  });

  it('should handle POST requests with data', async () => {
    const { result } = renderHook(() => useApi());
    const postData = { name: 'Test' };
    
    await act(async () => {
      await result.current.post('/test', postData);
    });

    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(postData),
      })
    );
  });

  it('should handle errors', async () => {
    const errorMessage = 'Network error';
    mockFetchError(new Error(errorMessage));
    
    const { result } = renderHook(() => useApi());
    
    await act(async () => {
      await expect(result.current.get('/error')).rejects.toThrow(errorMessage);
    });
  });

  it('should set loading state correctly', async () => {
    const { result, waitForNextUpdate } = renderHook(() => useApi());
    
    // Initial state
    expect(result.current.loading).toBe(false);
    
    // Start request
    let promise;
    act(() => {
      promise = result.current.get('/test');
    });
    
    // Loading state should be true during request
    expect(result.current.loading).toBe(true);
    
    // Wait for request to complete
    await act(async () => {
      await promise;
    });
    
    // Loading state should be false after request completes
    expect(result.current.loading).toBe(false);
  });

  it('should handle 401 errors by not showing error message', async () => {
    global.fetch = jest.fn().mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized' }),
      })
    );
    
    const { result } = renderHook(() => useApi());
    
    // Mock console.error to check if it's called
    const originalConsoleError = console.error;
    console.error = jest.fn();
    
    await act(async () => {
      await result.current.get('/unauthorized');
    });
    
    // console.error should not be called for 401 errors
    expect(console.error).not.toHaveBeenCalled();
    
    // Restore console.error
    console.error = originalConsoleError;
  });
});
