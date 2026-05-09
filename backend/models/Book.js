// models/Book.js
const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: [true, 'Book title is required'],
    trim: true,
    minlength: [2, 'Title must be at least 2 characters']
  },
  author: { 
    type: String, 
    required: [true, 'Author name is required'],
    trim: true
  },
  description: { 
    type: String, 
    trim: true,
    default: ''
  },
  price: { 
    type: Number, 
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
    get: v => parseFloat(v.toFixed(2)), // Format to 2 decimal places
    set: v => parseFloat(v.toFixed(2))
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'Fiction', 'Non-Fiction', 'Science', 'Technology', 
      'Biography', 'History', 'Fantasy', 'Mystery', 'Romance',
      'Self-Help', 'Business', 'Children', 'Education'
    ],
    default: 'Fiction'
  },
  imageUrl: { 
    type: String, 
    default: ''
  },
  stock: { // ✅ ADDED: Stock Quantity field
    type: Number,
    min: 0,
    default: 0
  }
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

module.exports = mongoose.model('Book', bookSchema);