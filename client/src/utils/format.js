/**
 * Utility Functions for Formatting Data
 * Consistent formatting across the entire application
 */

// Format price with Ethiopian Birr standard (2 decimal places)
export const formatPrice = (price, currency = 'ETB') => {
  if (!price && price !== 0) return '0.00 ETB';
  
  return `${Number(price).toLocaleString('en-ET', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })} ${currency}`;
};

// Format date to readable format
export const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-ET', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// Format time to 12-hour format
export const formatTime = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleTimeString('en-ET', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Truncate long text with ellipsis
export const truncate = (text, maxLength = 50) => {
  if (!text || typeof text !== 'string') return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};

// Format number with thousands separator
export const formatNumber = (num, decimals = 0) => {
  return Number(num).toLocaleString('en-ET', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

// Calculate percentage change
export const calculatePercentChange = (current, previous) => {
  if (!previous) return 0;
  if (previous === 0 && current > 0) return 100;
  return ((current - previous) / previous) * 100;
};

// Check if stock level is low
export const getStockStatus = (stock) => {
  if (stock === 0) return 'out';
  if (stock < 10) return 'low';
  if (stock >= 10 && stock < 20) return 'medium';
  return 'good';
};