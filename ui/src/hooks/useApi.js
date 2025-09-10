import { useState, useCallback } from 'react';
import axios from 'axios';
import { useSnackbar } from '../contexts/SnackbarContext';

const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { showSnackbar } = useSnackbar();

  const getAuthHeader = useCallback(() => {
    const token = localStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const request = useCallback(
    async (method, url, data = null, config = {}) => {
      setLoading(true);
      setError(null);

      const headers = {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
        ...(config.headers || {}),
      };

      try {
        const response = await axios({
          method,
          url: `/api${url}`,
          data,
          headers,
          ...config,
        });
        return response.data;
      } catch (err) {
        const errorMessage = 
          err.response?.data?.message || 
          err.response?.data?.error || 
          err.message || 
          'An error occurred';
        
        setError(errorMessage);
        
        // Show error snackbar for non-401 errors
        if (err.response?.status !== 401) {
          showSnackbar(errorMessage, 'error');
        }
        
        // Rethrow the error to be handled by the component
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [getAuthHeader, showSnackbar]
  );

  const get = useCallback((url, config = {}) => request('get', url, null, config), [request]);
  const post = useCallback((url, data, config = {}) => request('post', url, data, config), [request]);
  const put = useCallback((url, data, config = {}) => request('put', url, data, config), [request]);
  const del = useCallback((url, config = {}) => request('delete', url, null, config), [request]);
  const patch = useCallback((url, data, config = {}) => request('patch', url, data, config), [request]);

  return {
    loading,
    error,
    get,
    post,
    put,
    del,
    patch,
  };
};

export default useApi;
