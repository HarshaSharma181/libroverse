// routes/bookRoutes.js
const express = require('express');
const router = express.Router();
const Book = require('../models/Book');

// ✅ CREATE BOOK - FIXED VERSION
router.post('/add', async (req, res) => {
    try {
        console.log('📦 Received book data:', JSON.stringify(req.body, null, 2));
        
        // Extract ALL form fields (7 fields from your form)
        const { 
            title, 
            author, 
            price, 
            imageUrl, 
            stock,  // ✅ Stock Quantity from form
            category, 
            description 
        } = req.body;
        
        console.log('📋 Parsed fields:', {
            title, author, price, imageUrl, stock, category, description
        });
        
        // VALIDATION - Check required fields
        if (!title || title.trim() === '') {
            return res.status(400).json({ 
                success: false,
                message: 'Book Title is required' 
            });
        }
        
        if (!author || author.trim() === '') {
            return res.status(400).json({ 
                success: false,
                message: 'Author is required' 
            });
        }
        
        if (!price || isNaN(price) || parseFloat(price) < 0) {
            return res.status(400).json({ 
                success: false,
                message: 'Valid Price is required and must be a positive number' 
            });
        }
        
        if (!category || category.trim() === '') {
            return res.status(400).json({ 
                success: false,
                message: 'Category is required' 
            });
        }
        
        // Validate category against enum
        const validCategories = [
            'Fiction', 'Non-Fiction', 'Science', 'Technology', 
            'Biography', 'History', 'Fantasy', 'Mystery', 'Romance',
            'Self-Help', 'Business', 'Children', 'Education'
        ];
        
        if (!validCategories.includes(category)) {
            return res.status(400).json({ 
                success: false,
                message: `Invalid category. Must be one of: ${validCategories.join(', ')}` 
            });
        }
        
        // Prepare book data with ALL fields
        const bookData = {
            title: title.trim(),
            author: author.trim(),
            price: parseFloat(price),
            category: category,
            description: (description || '').trim(),
            imageUrl: (imageUrl || '').trim(),
            stock: stock ? parseInt(stock) : 0  // ✅ Handle stock quantity
        };
        
        console.log('📝 Creating book with:', bookData);
        
        // Create and save book
        const newBook = new Book(bookData);
        const savedBook = await newBook.save();
        
        console.log('✅ Book created successfully:', savedBook._id);
        
        res.status(201).json({
            success: true,
            message: "Book Added Successfully!",
            book: savedBook
        });
        
    } catch (err) {
        console.error('❌ ERROR creating book:', err.message);
        console.error('❌ Full error:', err);
        
        // Handle Mongoose validation errors
        if (err.name === 'ValidationError') {
            const errors = {};
            Object.keys(err.errors).forEach(key => {
                errors[key] = err.errors[key].message;
            });
            
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors
            });
        }
        
        // Handle duplicate errors
        if (err.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'A book with this title already exists'
            });
        }
        
        // General error
        res.status(500).json({ 
            success: false,
            message: 'Failed to create book. Please try again.',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// ✅ GET ALL BOOKS with Search & Filter
router.get('/', async (req, res) => {
    try {
        const { category, search } = req.query;
        let query = {};
        
        // Filter by category (if provided)
        if (category && category !== 'All' && category !== '') {
            query.category = category;
        }
        
        // Search functionality
        if (search && search.trim() !== '') {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { author: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        
        const books = await Book.find(query).sort({ createdAt: -1 });
        
        res.json({
            success: true,
            books: books,
            count: books.length
        });
    } catch (err) {
        console.error('❌ Error fetching books:', err);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch books',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// ✅ GET SINGLE BOOK
router.get('/:id', async (req, res) => {
    try {
        const book = await Book.findById(req.params.id);
        if (!book) {
            return res.status(404).json({ 
                success: false,
                message: 'Book not found' 
            });
        }
        res.json({
            success: true,
            book
        });
    } catch (err) {
        console.error('❌ Error fetching book:', err);
        res.status(500).json({ 
            success: false,
            message: 'Failed to fetch book'
        });
    }
});

// ✅ UPDATE BOOK
router.put('/:id', async (req, res) => {
    try {
        console.log('📝 Updating book:', req.params.id, req.body);
        
        // Extract ALL fields including stock
        const { title, author, price, imageUrl, stock, category, description } = req.body;
        
        const updateData = {
            title: title?.trim(),
            author: author?.trim(),
            price: price ? parseFloat(price) : undefined,
            category: category || 'Fiction',
            description: description || '',
            imageUrl: imageUrl || '',
            stock: stock ? parseInt(stock) : 0  // ✅ Include stock
        };
        
        // Remove undefined fields
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) {
                delete updateData[key];
            }
        });
        
        const updated = await Book.findByIdAndUpdate(
            req.params.id, 
            updateData,
            { new: true, runValidators: true }
        );
        
        if (!updated) {
            return res.status(404).json({ 
                success: false,
                message: 'Book not found' 
            });
        }
        
        console.log('✅ Book updated:', updated._id);
        
        res.json({ 
            success: true,
            message: "Book Updated Successfully", 
            book: updated 
        });
    } catch (err) {
        console.error('❌ Error updating book:', err);
        
        if (err.name === 'ValidationError') {
            const errors = {};
            Object.keys(err.errors).forEach(key => {
                errors[key] = err.errors[key].message;
            });
            
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors
            });
        }
        
        res.status(500).json({ 
            success: false,
            message: 'Failed to update book',
            error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// ✅ DELETE BOOK
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await Book.findByIdAndDelete(req.params.id);
        
        if (!deleted) {
            return res.status(404).json({ 
                success: false,
                message: 'Book not found' 
            });
        }
        
        res.json({ 
            success: true,
            message: "Book Deleted Successfully" 
        });
    } catch (err) {
        console.error('❌ Error deleting book:', err);
        res.status(500).json({ 
            success: false,
            message: 'Failed to delete book'
        });
    }
});

// ✅ GET ALL CATEGORIES
router.get('/categories/all', async (req, res) => {
    try {
        const categories = await Book.distinct('category');
        res.json({
            success: true,
            categories: categories || []
        });
    } catch (err) {
        console.error('❌ Error fetching categories:', err);
        res.status(500).json({ 
            success: false,
            error: err.message 
        });
    }
});

// ✅ TEST ROUTE - Create book with test data
router.post('/test', async (req, res) => {
    try {
        const testBook = {
            title: "Test Book " + Date.now(),
            author: "Test Author",
            price: 19.99,
            category: "Fiction",
            description: "Test description",
            imageUrl: "https://via.placeholder.com/300x400",
            stock: 10
        };
        
        const book = new Book(testBook);
        await book.save();
        
        res.json({
            success: true,
            message: "Test book created",
            book: book
        });
    } catch (err) {
        console.error('❌ Test error:', err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

module.exports = router;