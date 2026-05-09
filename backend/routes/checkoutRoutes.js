// routes/checkoutRoutes.js - COMPLETE FIXED VERSION
const express = require('express');
const router = express.Router();
const Checkout = require('../models/Checkout');
const Book = require('../models/Book');
const { auth } = require('../middleware/authMiddleware');
const mongoose = require('mongoose');

// ==============================================
// EMERGENCY FIX ROUTES
// ==============================================

// @route   GET /api/checkouts/emergency-fix
// @desc    Emergency fix for duplicate key error
// @access  Private
router.get('/emergency-fix', auth, async (req, res) => {
  try {
    console.log('🚨 EMERGENCY FIX for duplicate key error...');
    
    // List all indexes
    const indexes = await Checkout.collection.indexes();
    console.log('📊 Current indexes:', indexes.map(i => i.name));
    
    // Try to drop the problematic index if it exists
    let indexDropped = false;
    try {
      await Checkout.collection.dropIndex('localId_1_user_1');
      console.log('✅ Dropped problematic index: localId_1_user_1');
      indexDropped = true;
    } catch (dropError) {
      console.log('ℹ️ Index might not exist or already dropped:', dropError.message);
    }
    
    // Remove null localId values
    const result = await Checkout.updateMany(
      { localId: null },
      { $unset: { localId: "" } }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} checkouts (removed null localId)`);
    
    res.json({
      success: true,
      message: 'Emergency fix applied successfully',
      details: {
        indexDropped,
        checkoutsUpdated: result.modifiedCount
      }
    });
    
  } catch (error) {
    console.error('❌ Emergency fix error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// @route   GET /api/checkouts/create-correct-index
// @desc    Create the correct sparse index
// @access  Private
router.get('/create-correct-index', auth, async (req, res) => {
  try {
    console.log('📊 Creating correct sparse index...');
    
    // Create the correct sparse index
    await Checkout.collection.createIndex(
      { user: 1, localId: 1 },
      { 
        unique: true, 
        sparse: true,
        partialFilterExpression: { localId: { $exists: true, $ne: null } }
      }
    );
    
    console.log('✅ Created correct sparse index');
    
    res.json({
      success: true,
      message: 'Correct sparse index created successfully'
    });
    
  } catch (error) {
    console.error('❌ Create index error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// ==============================================
// CHECKOUT ROUTES
// ==============================================

// @route   POST /api/checkouts
// @desc    Create a new checkout/borrow a book
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    console.log('\n📚 BORROW BOOK REQUEST');
    console.log('User:', req.user.email);
    console.log('Request body:', req.body);
    
    const { bookId, dueDate } = req.body;
    
    if (!bookId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Book ID is required' 
      });
    }

    // Check if book exists
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ 
        success: false, 
        message: 'Book not found' 
      });
    }

    // Check if book is in stock
    if (book.stock < 1) {
      return res.status(400).json({ 
        success: false, 
        message: 'Book is currently out of stock' 
      });
    }

    // Check if user already has this book checked out and not returned
    const existingCheckout = await Checkout.findOne({
      user: req.user._id,
      book: bookId,
      status: { $in: ['Active', 'Renewed'] }
    });

    if (existingCheckout) {
      return res.status(400).json({ 
        success: false, 
        message: 'You already have this book checked out' 
      });
    }

    // Calculate due date (14 days from now if not provided)
    const calculatedDueDate = dueDate 
      ? new Date(dueDate)
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    // Check if due date is in the future
    if (calculatedDueDate <= new Date()) {
      return res.status(400).json({ 
        success: false, 
        message: 'Due date must be in the future' 
      });
    }

    // Create checkout
    const checkoutData = {
      user: req.user._id,
      book: bookId,
      checkoutDate: new Date(),
      dueDate: calculatedDueDate,
      status: 'Active',
      renewals: 0,
      fineAmount: 0,
      isLocalCheckout: false,
      createdBy: 'User',
      notes: [`Checked out on ${new Date().toLocaleDateString()}`] // FIXED: Array
    };

    // Create and save the checkout
    const checkout = new Checkout(checkoutData);
    await checkout.save();

    // Update book stock and checkout count
    book.stock -= 1;
    book.checkoutCount = (book.checkoutCount || 0) + 1;
    await book.save();

    // Populate book details
    const populatedCheckout = await Checkout.findById(checkout._id)
      .populate('book', 'title author imageUrl category price');

    console.log('✅ Book borrowed successfully:', {
      user: req.user.email,
      book: book.title,
      checkoutId: checkout._id,
      dueDate: checkout.dueDate
    });

    res.status(201).json({
      success: true,
      message: 'Book successfully borrowed',
      data: populatedCheckout
    });

  } catch (error) {
    console.error('❌ Create checkout error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      console.log('🔄 Duplicate key error detected. Running auto-fix...');
      
      try {
        // Try to fix the issue
        await Checkout.collection.dropIndex('localId_1_user_1');
        console.log('✅ Dropped problematic index');
        
        return res.status(400).json({ 
          success: false, 
          message: 'Duplicate key error detected and fixed. Please try your request again.',
          autoFixed: true,
          error: error.message 
        });
      } catch (fixError) {
        console.log('⚠️ Auto-fix failed:', fixError.message);
        return res.status(400).json({ 
          success: false, 
          message: 'Duplicate key error. Please visit /api/checkouts/emergency-fix first.',
          error: error.message 
        });
      }
    }
    
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
});

// @route   GET /api/checkouts/my-checkouts
// @desc    Get current user's checkouts
// @access  Private
router.get('/my-checkouts', auth, async (req, res) => {
  try {
    console.log('📋 Fetching checkouts for user:', req.user.email);
    
    const { status, limit = 50, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    let query = { user: req.user._id };
    
    if (status) {
      query.status = status;
    }

    const checkouts = await Checkout.find(query)
      .populate('book', 'title author imageUrl category price')
      .sort({ checkoutDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Checkout.countDocuments(query);

    console.log(`✅ Found ${checkouts.length} checkouts for user`);

    res.json({
      success: true,
      count: checkouts.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: checkouts
    });

  } catch (error) {
    console.error('❌ Get checkouts error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// ==============================================
// UPDATE CHECKOUT STATUS ROUTES (ADMIN)
// ==============================================

// @route   PUT /api/checkouts/:id
// @desc    Update checkout information (admin only)
// @access  Private/Admin
router.put('/:id', auth, async (req, res) => {
  try {
    console.log('🔄 PUT Update checkout request:', req.params.id, 'by admin:', req.user.email);
    console.log('📤 Update data:', req.body);
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required' 
      });
    }

    const { status, fineAmount, returnDate, dueDate, renewals, notes } = req.body;
    
    // Find the checkout
    const checkout = await Checkout.findById(req.params.id);
    if (!checkout) {
      return res.status(404).json({ 
        success: false, 
        message: 'Checkout not found' 
      });
    }

    // Build update object
    const updateData = {};
    const updateNotes = [];
    
    // Track original values for logging
    const originalValues = {
      status: checkout.status,
      fineAmount: checkout.fineAmount,
      returnDate: checkout.returnDate,
      dueDate: checkout.dueDate,
      renewals: checkout.renewals
    };

    // Update status if provided
    if (status && checkout.status !== status) {
      updateData.status = status;
      updateNotes.push(`Status changed from "${checkout.status}" to "${status}" by admin ${req.user.email} on ${new Date().toLocaleString()}`);
      
      // Handle return date for returned status
      if (status === 'Returned' && !checkout.returnDate) {
        updateData.returnDate = returnDate || new Date();
        updateNotes.push(`Book marked as returned on ${updateData.returnDate.toLocaleString()}`);
        
        // Return book to stock if it was active/renewed
        if (checkout.status === 'Active' || checkout.status === 'Renewed') {
          const book = await Book.findById(checkout.book);
          if (book) {
            book.stock += 1;
            await book.save();
            console.log('📚 Book returned to stock:', book.title);
          }
        }
      }
    }

    // Update fine amount if provided
    if (fineAmount !== undefined && checkout.fineAmount !== fineAmount) {
      updateData.fineAmount = parseFloat(fineAmount) || 0;
      updateNotes.push(`Fine amount updated from ₹${checkout.fineAmount} to ₹${updateData.fineAmount}`);
    }

    // Update return date if provided
    if (returnDate && checkout.returnDate !== new Date(returnDate)) {
      updateData.returnDate = new Date(returnDate);
      updateNotes.push(`Return date updated to ${updateData.returnDate.toLocaleString()}`);
    }

    // Update due date if provided
    if (dueDate && checkout.dueDate !== new Date(dueDate)) {
      updateData.dueDate = new Date(dueDate);
      updateNotes.push(`Due date updated to ${updateData.dueDate.toLocaleString()}`);
    }

    // Update renewals if provided
    if (renewals !== undefined && checkout.renewals !== renewals) {
      updateData.renewals = parseInt(renewals) || 0;
      updateNotes.push(`Renewals updated from ${checkout.renewals} to ${updateData.renewals}`);
    }

    // Add custom notes if provided
    if (notes && typeof notes === 'string') {
      updateNotes.push(notes);
    }

    // If no updates, return early
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No valid fields provided for update' 
      });
    }

    // Add notes to update data
    if (updateNotes.length > 0) {
      updateData.$push = { 
        notes: { 
          $each: updateNotes.map(note => `${new Date().toISOString()} - ${note}`) 
        } 
      };
    }

    // Apply updates
    const updatedCheckout = await Checkout.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('book', 'title author').populate('user', 'name email');

    console.log('✅ Checkout updated successfully:', {
      checkoutId: updatedCheckout._id,
      original: originalValues,
      updated: {
        status: updatedCheckout.status,
        fineAmount: updatedCheckout.fineAmount,
        returnDate: updatedCheckout.returnDate,
        dueDate: updatedCheckout.dueDate,
        renewals: updatedCheckout.renewals
      }
    });

    res.json({
      success: true,
      message: 'Checkout updated successfully',
      data: updatedCheckout,
      original: originalValues
    });

  } catch (error) {
    console.error('❌ Update checkout error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error',
        error: error.message,
        details: error.errors 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
});

// @route   PATCH /api/checkouts/:id
// @desc    Update checkout information (admin only) - PATCH version
// @access  Private/Admin
router.patch('/:id', auth, async (req, res) => {
  try {
    console.log('🔄 PATCH Update checkout request:', req.params.id, 'by admin:', req.user.email);
    console.log('📤 PATCH Update data:', req.body);
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required' 
      });
    }

    const updateData = { ...req.body };
    delete updateData._id; // Prevent updating the ID
    
    // Find the checkout
    const checkout = await Checkout.findById(req.params.id);
    if (!checkout) {
      return res.status(404).json({ 
        success: false, 
        message: 'Checkout not found' 
      });
    }

    // Track changes for notes
    const updateNotes = [];
    const changedFields = [];

    // Compare each field and track changes
    for (const [key, newValue] of Object.entries(updateData)) {
      if (key !== 'notes' && checkout[key] !== newValue) {
        changedFields.push(`${key}: "${checkout[key]}" → "${newValue}"`);
      }
    }

    // Add note about changes
    if (changedFields.length > 0) {
      updateNotes.push(`Updated by admin ${req.user.email}: ${changedFields.join(', ')}`);
    }

    // Handle return to stock if status changed to Returned
    if (updateData.status === 'Returned' && (checkout.status === 'Active' || checkout.status === 'Renewed')) {
      const book = await Book.findById(checkout.book);
      if (book) {
        book.stock += 1;
        await book.save();
        console.log('📚 Book returned to stock:', book.title);
      }
    }

    // Add notes to update
    if (updateNotes.length > 0) {
      updateData.$push = { 
        notes: { 
          $each: updateNotes.map(note => `${new Date().toISOString()} - ${note}`) 
        } 
      };
    }

    // Apply updates
    const updatedCheckout = await Checkout.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('book', 'title author').populate('user', 'name email');

    console.log('✅ Checkout PATCH updated successfully:', updatedCheckout._id);

    res.json({
      success: true,
      message: 'Checkout updated successfully',
      data: updatedCheckout
    });

  } catch (error) {
    console.error('❌ PATCH Update checkout error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error',
        error: error.message,
        details: error.errors 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
});

// @route   PUT /api/checkouts/:id/status
// @desc    Update only checkout status (admin only)
// @access  Private/Admin
router.put('/:id/status', auth, async (req, res) => {
  try {
    console.log('📝 Update checkout status request:', req.params.id, 'by admin:', req.user.email);
    console.log('📤 Status update data:', req.body);
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required' 
      });
    }

    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ 
        success: false, 
        message: 'Status is required' 
      });
    }

    // Validate status
    const validStatuses = ['Active', 'Returned', 'Overdue', 'Cancelled', 'Renewed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }

    // Find the checkout
    const checkout = await Checkout.findById(req.params.id);
    if (!checkout) {
      return res.status(404).json({ 
        success: false, 
        message: 'Checkout not found' 
      });
    }

    // Track original status
    const originalStatus = checkout.status;
    
    // Prepare update data
    const updateData = {
      status: status,
      $push: { 
        notes: `${new Date().toISOString()} - Status changed from "${originalStatus}" to "${status}" by admin ${req.user.email}` 
      }
    };

    // Auto-calculate fine for Overdue status
    if (status === 'Overdue') {
      const fineAmount = Checkout.calculateFine(checkout.dueDate);
      updateData.fineAmount = fineAmount;
      console.log(`💰 Auto-calculated fine for overdue: ₹${fineAmount}`);
    }
    
    // Reset fine for Returned status
    if (status === 'Returned') {
      updateData.fineAmount = 0;
    }

    // Handle return date for returned status
    if (status === 'Returned' && !checkout.returnDate) {
      updateData.returnDate = new Date();
      
      // Return book to stock if it was active/renewed
      if (originalStatus === 'Active' || originalStatus === 'Renewed') {
        const book = await Book.findById(checkout.book);
        if (book) {
          book.stock += 1;
          await book.save();
          console.log('📚 Book returned to stock:', book.title);
        }
      }
    }

    // Update checkout
    const updatedCheckout = await Checkout.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('book', 'title author').populate('user', 'name email');

    console.log('✅ Checkout status updated:', {
      checkoutId: updatedCheckout._id,
      book: updatedCheckout.book?.title,
      user: updatedCheckout.user?.name,
      originalStatus,
      newStatus: updatedCheckout.status,
      fineAmount: updatedCheckout.fineAmount
    });

    res.json({
      success: true,
      message: `Checkout status updated from "${originalStatus}" to "${status}"`,
      data: updatedCheckout
    });

  } catch (error) {
    console.error('❌ Update checkout status error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        success: false, 
        message: 'Validation error',
        error: error.message,
        details: error.errors 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
});

// @route   PUT /api/checkouts/:id/renew
// @desc    Renew a checkout
// @access  Private
router.put('/:id/renew', auth, async (req, res) => {
  try {
    console.log('🔄 Renew checkout request:', req.params.id, 'by user:', req.user.email);
    
    const checkout = await Checkout.findById(req.params.id)
      .populate('book', 'title author');

    if (!checkout) {
      return res.status(404).json({ 
        success: false, 
        message: 'Checkout not found' 
      });
    }

    // Verify ownership
    if (checkout.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to renew this checkout' 
      });
    }

    // Check if can be renewed using the canRenew method
    const renewalCheck = checkout.canRenew();
    if (!renewalCheck.canRenew) {
      return res.status(400).json({ 
        success: false, 
        message: renewalCheck.reason 
      });
    }

    // Calculate new due date (add 14 days to current due date)
    const currentDueDate = new Date(checkout.dueDate);
    const newDueDate = new Date(currentDueDate.getTime() + 14 * 24 * 60 * 60 * 1000);

    // Update checkout - FIXED: Using $push with array notes
    await Checkout.updateOne(
      { _id: checkout._id },
      {
        $set: {
          dueDate: newDueDate,
          status: 'Renewed'
        },
        $inc: { renewals: 1 },
        $push: { 
          notes: `Renewed on ${new Date().toISOString()}` 
        }
      }
    );

    console.log('✅ Checkout renewed:', checkout._id);

    // Fetch updated checkout
    const updatedCheckout = await Checkout.findById(checkout._id)
      .populate('book', 'title author');

    res.json({
      success: true,
      message: 'Book successfully renewed',
      data: {
        checkoutId: updatedCheckout._id,
        bookTitle: updatedCheckout.book.title,
        newDueDate: updatedCheckout.dueDate,
        renewals: updatedCheckout.renewals,
        status: updatedCheckout.status
      }
    });

  } catch (error) {
    console.error('❌ Renew checkout error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
});

// @route   PUT /api/checkouts/:id/return
// @desc    Return a book
// @access  Private
router.put('/:id/return', auth, async (req, res) => {
  try {
    console.log('📥 Return book request:', req.params.id, 'by user:', req.user.email);
    
    const checkout = await Checkout.findById(req.params.id)
      .populate('book', 'title author');

    if (!checkout) {
      return res.status(404).json({ 
        success: false, 
        message: 'Checkout not found' 
      });
    }

    // Verify ownership
    if (checkout.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to return this book' 
      });
    }

    // Check if already returned
    if (checkout.status === 'Returned') {
      return res.status(400).json({ 
        success: false, 
        message: 'Book has already been returned' 
      });
    }

    // Calculate fine if any
    const fineAmount = Checkout.calculateFine(checkout.dueDate);
    
    // Update book stock
    const book = await Book.findById(checkout.book);
    if (book) {
      book.stock += 1;
      await book.save();
    }
    
    // Update checkout - FIXED: Using $push with array notes
    const returnDate = new Date();
    await Checkout.updateOne(
      { _id: checkout._id },
      {
        $set: {
          returnDate: returnDate,
          status: 'Returned',
          fineAmount: fineAmount
        },
        $push: { 
          notes: `Returned on ${returnDate.toISOString()}` 
        }
      }
    );

    console.log('✅ Book returned:', checkout._id, 'Fine:', fineAmount);

    // Fetch updated checkout
    const updatedCheckout = await Checkout.findById(checkout._id)
      .populate('book', 'title author');

    const response = {
      success: true,
      message: 'Book successfully returned',
      data: {
        checkoutId: updatedCheckout._id,
        bookTitle: updatedCheckout.book.title,
        returnDate: updatedCheckout.returnDate,
        fineAmount: updatedCheckout.fineAmount,
        status: updatedCheckout.status
      }
    };

    if (fineAmount > 0) {
      response.message += `. Fine: ₹${fineAmount}`;
    }

    res.json(response);

  } catch (error) {
    console.error('❌ Return checkout error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
});

// @route   DELETE /api/checkouts/:id
// @desc    Delete a checkout (for admin or user cleanup)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    console.log('🗑️ Delete checkout request:', req.params.id, 'by user:', req.user.email);
    
    const checkout = await Checkout.findById(req.params.id);

    if (!checkout) {
      return res.status(404).json({ 
        success: false, 
        message: 'Checkout not found' 
      });
    }

    // Verify ownership (users can only delete their own checkouts)
    if (checkout.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to delete this checkout' 
      });
    }

    // If book is not returned, increase stock
    if (checkout.status !== 'Returned') {
      const book = await Book.findById(checkout.book);
      if (book) {
        book.stock += 1;
        await book.save();
      }
    }

    await checkout.deleteOne();

    console.log('✅ Checkout deleted:', req.params.id);

    res.json({
      success: true,
      message: 'Checkout deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete checkout error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
});

// @route   POST /api/checkouts/delete-multiple
// @desc    Delete multiple checkouts (admin only)
// @access  Private/Admin
router.post('/delete-multiple', auth, async (req, res) => {
  try {
    console.log('🗑️ Delete multiple checkouts by admin:', req.user.email);
    console.log('Checkout IDs:', req.body.checkoutIds);
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required' 
      });
    }

    const { checkoutIds } = req.body;
    
    if (!checkoutIds || !Array.isArray(checkoutIds) || checkoutIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Checkout IDs array is required' 
      });
    }

    // Find checkouts to be deleted
    const checkouts = await Checkout.find({ _id: { $in: checkoutIds } });
    
    // Return books to stock for non-returned checkouts
    for (const checkout of checkouts) {
      if (checkout.status !== 'Returned') {
        const book = await Book.findById(checkout.book);
        if (book) {
          book.stock += 1;
          await book.save();
        }
      }
    }

    // Delete checkouts
    const result = await Checkout.deleteMany({ _id: { $in: checkoutIds } });

    console.log(`✅ Deleted ${result.deletedCount} checkouts`);

    res.json({
      success: true,
      message: `${result.deletedCount} checkout(s) deleted successfully`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('❌ Delete multiple checkouts error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
});

// @route   POST /api/checkouts/sync-local
// @desc    Sync local checkouts to database
// @access  Private
router.post('/sync-local', auth, async (req, res) => {
  try {
    console.log('🔄 Sync local checkout request by user:', req.user.email);
    
    const { localId, bookId, checkoutDate, dueDate, status } = req.body;

    if (!localId || !bookId) {
      return res.status(400).json({ 
        success: false, 
        message: 'localId and bookId are required' 
      });
    }

    // Check if book exists
    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ 
        success: false, 
        message: 'Book not found' 
      });
    }

    // Check if local checkout already exists
    let checkout = await Checkout.findOne({ localId, user: req.user._id });

    if (checkout) {
      // Update existing checkout
      await Checkout.updateOne(
        { _id: checkout._id },
        {
          $set: {
            checkoutDate: checkoutDate || checkout.checkoutDate,
            dueDate: dueDate || checkout.dueDate,
            status: status || checkout.status
          }
        }
      );
    } else {
      // For new sync, check stock if not returned
      if ((!status || status !== 'Returned') && book.stock < 1) {
        return res.status(400).json({ 
          success: false, 
          message: 'Book is out of stock' 
        });
      }

      // Reduce stock for new non-returned checkouts
      if (!status || status !== 'Returned') {
        book.stock -= 1;
        book.checkoutCount = (book.checkoutCount || 0) + 1;
        await book.save();
      }

      // Create new checkout from local data
      const checkoutData = {
        user: req.user._id,
        book: bookId,
        checkoutDate: checkoutDate || new Date(),
        dueDate: dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: status || 'Active',
        localId: localId,
        isLocalCheckout: true,
        renewals: 0,
        fineAmount: 0,
        createdBy: 'Local Sync',
        notes: [`Synced from local on ${new Date().toLocaleDateString()}`] // FIXED: Array
      };

      checkout = new Checkout(checkoutData);
      await checkout.save();
    }

    // Fetch the populated checkout
    const populatedCheckout = await Checkout.findById(checkout._id)
      .populate('book', 'title author imageUrl category price');

    console.log('✅ Local checkout synced:', localId);

    res.json({
      success: true,
      message: 'Local checkout synced successfully',
      data: populatedCheckout
    });

  } catch (error) {
    console.error('❌ Sync local checkout error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: 'Duplicate localId. This local checkout already exists.',
        error: error.message 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
});

// @route   GET /api/checkouts
// @desc    Get all checkouts (admin only)
// @access  Private/Admin
router.get('/', auth, async (req, res) => {
  try {
    console.log('👑 Admin: Get all checkouts request by:', req.user.email);
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required' 
      });
    }

    const { status, user, book, limit = 100, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    
    if (status) query.status = status;
    if (user) query.user = user;
    if (book) query.book = book;

    const checkouts = await Checkout.find(query)
      .populate('user', 'name email')
      .populate('book', 'title author imageUrl')
      .sort({ checkoutDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Checkout.countDocuments(query);

    console.log(`✅ Admin retrieved ${checkouts.length} checkouts`);

    res.json({
      success: true,
      count: checkouts.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      data: checkouts
    });

  } catch (error) {
    console.error('❌ Get all checkouts error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/checkouts/stats
// @desc    Get checkout statistics for user
// @access  Private
router.get('/stats', auth, async (req, res) => {
  try {
    console.log('📊 Get checkout stats for user:', req.user.email);
    
    const stats = await Checkout.aggregate([
      { $match: { user: req.user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalFines: { $sum: '$fineAmount' }
        }
      }
    ]);

    const totalCheckouts = await Checkout.countDocuments({ user: req.user._id });
    const activeCheckouts = await Checkout.countDocuments({ 
      user: req.user._id, 
      status: { $in: ['Active', 'Renewed'] } 
    });
    const overdueCheckouts = await Checkout.countDocuments({ 
      user: req.user._id, 
      status: 'Active', 
      dueDate: { $lt: new Date() } 
    });

    console.log('✅ Stats retrieved:', { totalCheckouts, activeCheckouts, overdueCheckouts });

    res.json({
      success: true,
      data: {
        total: totalCheckouts,
        active: activeCheckouts,
        overdue: overdueCheckouts,
        byStatus: stats,
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email
        }
      }
    });

  } catch (error) {
    console.error('❌ Get checkout stats error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error' 
    });
  }
});

// @route   GET /api/checkouts/check-duplicate
// @desc    Check for duplicate key issues
// @access  Private/Admin
router.get('/check-duplicate', auth, async (req, res) => {
  try {
    // Only admin can check
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required' 
      });
    }

    console.log('🔍 Checking for duplicate key issues...');
    
    // Find checkouts with localId: null or undefined
    const nullLocalIdCheckouts = await Checkout.find({ 
      $or: [{ localId: null }, { localId: { $exists: false } }] 
    });
    
    // Find checkouts with duplicate localId + user combinations
    const duplicateAggregation = await Checkout.aggregate([
      {
        $match: { localId: { $ne: null, $exists: true } }
      },
      {
        $group: {
          _id: { localId: "$localId", user: "$user" },
          count: { $sum: 1 }
        }
      },
      {
        $match: { count: { $gt: 1 } }
      }
    ]);

    console.log('✅ Check completed');
    
    res.json({
      success: true,
      data: {
        nullLocalIdCount: nullLocalIdCheckouts.length,
        duplicateCombinations: duplicateAggregation,
        nullLocalIdSamples: nullLocalIdCheckouts.slice(0, 5).map(c => ({
          id: c._id,
          user: c.user,
          book: c.book,
          status: c.status
        }))
      }
    });

  } catch (error) {
    console.error('❌ Check duplicate error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// @route   GET /api/checkouts/test
// @desc    Test endpoint to check if checkouts are working
// @access  Private
router.get('/test', auth, async (req, res) => {
  try {
    console.log('🧪 Test checkout endpoint');
    
    // Count all checkouts
    const totalCheckouts = await Checkout.countDocuments();
    const userCheckouts = await Checkout.countDocuments({ user: req.user._id });
    
    res.json({
      success: true,
      message: 'Checkout routes are working',
      data: {
        server: 'Checkout API is running',
        user: req.user.email,
        totalCheckoutsInSystem: totalCheckouts,
        userCheckouts: userCheckouts,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (error) {
    console.error('❌ Test error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// @route   GET /api/checkouts/check-indexes
// @desc    Check current indexes
// @access  Private/Admin
router.get('/check-indexes', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required' 
      });
    }

    const indexes = await Checkout.collection.indexes();
    
    res.json({
      success: true,
      indexes: indexes.map(index => ({
        name: index.name,
        key: index.key,
        unique: index.unique || false,
        sparse: index.sparse || false,
        partialFilterExpression: index.partialFilterExpression || null
      }))
    });
    
  } catch (error) {
    console.error('❌ Check indexes error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// ==============================================
// DEBUG ROUTE (ADD THIS)
// ==============================================

// @route   GET /api/checkouts/debug-routes
// @desc    Debug to list all registered routes
// @access  Public
router.get('/debug-routes', (req, res) => {
  try {
    const routes = [];
    router.stack.forEach((middleware) => {
      if (middleware.route) {
        routes.push({
          path: middleware.route.path,
          methods: Object.keys(middleware.route.methods),
          regexp: middleware.regexp.toString()
        });
      }
    });
    
    console.log('📋 Registered Checkout Routes:');
    routes.forEach(route => {
      console.log(`${Object.keys(route.methods).join(',')} ${route.path}`);
    });
    
    res.json({
      success: true,
      message: 'Checkout routes debug',
      totalRoutes: routes.length,
      routes: routes,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Debug routes error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// @route   GET /api/checkouts/test-update/:id
// @desc    Test update endpoint with sample data
// @access  Private/Admin
router.get('/test-update/:id', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Admin access required' 
      });
    }
    
    const checkoutId = req.params.id;
    console.log('🧪 Testing update for checkout:', checkoutId);
    
    // Try to find the checkout
    const checkout = await Checkout.findById(checkoutId);
    if (!checkout) {
      return res.status(404).json({
        success: false,
        message: 'Checkout not found for testing'
      });
    }
    
    res.json({
      success: true,
      message: 'Test endpoint working',
      data: {
        checkoutId: checkout._id,
        currentStatus: checkout.status,
        currentFine: checkout.fineAmount,
        testEndpoints: {
          updateStatus: `PUT /api/checkouts/${checkoutId}/status`,
          updateFull: `PUT /api/checkouts/${checkoutId}`,
          updatePartial: `PATCH /api/checkouts/${checkoutId}`
        },
        samplePayload: {
          status: 'Overdue',
          fineAmount: 50,
          notes: 'Test update from admin dashboard'
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Test update error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;