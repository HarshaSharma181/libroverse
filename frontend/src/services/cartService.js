import axios from 'axios';

const API_URL = 'http://localhost:5000/api/cart';

// Get user's cart
export const getCart = async (token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
  
  try {
    const response = await axios.get(API_URL, config);
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

// Add item to cart
export const addToCart = async (bookId, quantity, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
  
  try {
    const response = await axios.post(
      `${API_URL}/add`,
      { bookId, quantity },
      config
    );
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

// Remove item from cart
export const removeFromCart = async (bookId, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
  
  try {
    const response = await axios.delete(
      `${API_URL}/remove/${bookId}`,
      config
    );
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

// Update item quantity
export const updateCartItem = async (bookId, quantity, token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
  
  try {
    const response = await axios.put(
      `${API_URL}/update/${bookId}`,
      { quantity },
      config
    );
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};

// Clear cart
export const clearCart = async (token) => {
  const config = {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
  
  try {
    const response = await axios.delete(`${API_URL}/clear`, config);
    return response.data;
  } catch (error) {
    throw error.response.data;
  }
};