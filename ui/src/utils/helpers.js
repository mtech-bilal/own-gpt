/**
 * Formats a date string into a human-readable format
 * @param {string} dateString - ISO date string
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString, options = {}) => {
  if (!dateString) return '';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  };
  
  return new Date(dateString).toLocaleDateString(undefined, defaultOptions);
};

/**
 * Truncates a string to a specified length and adds an ellipsis
 * @param {string} str - The string to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Truncated string
 */
export const truncate = (str, maxLength = 100) => {
  if (!str) return '';
  return str.length > maxLength ? `${str.substring(0, maxLength)}...` : str;
};

/**
 * Generates a unique ID
 * @returns {string} A unique ID
 */
export const generateId = () => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
};

/**
 * Converts an object to URL query string
 * @param {Object} params - The object to convert
 * @returns {string} URL query string
 */
export const toQueryString = (params) => {
  return Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return value.map(v => `${encodeURIComponent(key)}=${encodeURIComponent(v)}`).join('&');
      }
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
    })
    .join('&');
};

/**
 * Debounce a function
 * @param {Function} func - The function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Deep clones an object
 * @param {Object} obj - The object to clone
 * @returns {Object} Deep cloned object
 */
export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Formats a number with commas as thousands separators
 * @param {number} num - The number to format
 * @returns {string} Formatted number string
 */
export const formatNumber = (num) => {
  return new Intl.NumberFormat().format(num);
};

/**
 * Capitalizes the first letter of a string
 * @param {string} str - The string to capitalize
 * @returns {string} Capitalized string
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

/**
 * Checks if an object is empty
 * @param {Object} obj - The object to check
 * @returns {boolean} True if the object is empty
 */
export const isEmpty = (obj) => {
  return Object.keys(obj).length === 0;
};

/**
 * Converts a string to title case
 * @param {string} str - The string to convert
 * @returns {string} Title-cased string
 */
export const toTitleCase = (str) => {
  if (!str) return '';
  return str.replace(\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};

/**
 * Generates a random color hex code
 * @returns {string} Random hex color code
 */
export const getRandomColor = () => {
  return `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
};

/**
 * Safely access nested object properties
 * @param {Object} obj - The object to access
 * @param {string} path - The path to the property (e.g., 'user.profile.name')
 * @param {*} defaultValue - Default value if the path doesn't exist
 * @returns {*} The value at the specified path or the default value
 */
export const get = (obj, path, defaultValue = undefined) => {
  const travel = (regexp) =>
    String.prototype.split
      .call(path, regexp)
      .filter(Boolean)
      .reduce((res, key) => (res !== null && res !== undefined ? res[key] : res), obj);
  const result = travel(/[,[\]]+?/) || travel(/[,[\].]+?/);
  return result === undefined || result === obj ? defaultValue : result;
};
