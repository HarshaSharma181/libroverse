import axios from 'axios';

const API_URL = 'http://localhost:5000/api/orders';

// Checkout - Create order from cart
export const checkout = async (token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
  
  try {
    const response = await axios.post(
      `${API_URL}/checkout`,
      {},
      config
    );
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

// Get user's orders
export const getMyOrders = async (token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
  
  try {
    const response = await axios.get(
      `${API_URL}/my-orders`,
      config
    );
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

// Get specific order
export const getOrderById = async (orderId, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
  
  try {
    const response = await axios.get(
      `${API_URL}/${orderId}`,
      config
    );
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};