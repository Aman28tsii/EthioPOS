const API_URL = 'http://localhost:5000/api';

const getAuthHeader = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json'
});

export const api = {
  // AUTH
  login: (credentials) => 
    fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    }).then(res => res.json()),

  // PRODUCTS
  getProducts: () => 
    fetch(`${API_URL}/products`, { headers: getAuthHeader() }).then(res => res.json()),

  // SALES
  saveSale: (saleData) => 
    fetch(`${API_URL}/sales`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify(saleData)
    }).then(res => res.json()),

  // ANALYTICS (For your Insights Page)
  getDailyStats: () => 
    fetch(`${API_URL}/analytics/daily-stats`, { headers: getAuthHeader() }).then(res => res.json())
};