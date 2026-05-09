import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './UserDashboard.css';

export default function UserDashboard({ user: propUser }) {
  const navigate = useNavigate();
  const location = useLocation();
  const api = "http://localhost:5000/api";
  
  // Get user and token from multiple sources for compatibility
  const localStorageUser = JSON.parse(localStorage.getItem('lv_user') || localStorage.getItem('user') || '{}');
  const currentUser = propUser || localStorageUser;
  
  const token = localStorage.getItem('lv_token') || 
                localStorage.getItem('token') || 
                currentUser.token;

  // Get current user ID
  const getCurrentUserId = () => {
    return currentUser._id || currentUser.id || localStorageUser._id || localStorageUser.id;
  };

  // State management
  const [books, setBooks] = useState([]);
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeSection, setActiveSection] = useState('books');
  
  // User profile state
  const [userProfile, setUserProfile] = useState({
    name: currentUser.name || 'User',
    email: currentUser.email || '',
    joinDate: new Date().toISOString().split('T')[0],
    readingLevel: 'Intermediate',
    favoriteGenres: ['Fiction', 'Non-Fiction', 'Technology']
  });
  
  // Edit Profile Modal State
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState({
    name: '',
    email: '',
    readingLevel: '',
    favoriteGenres: []
  });
  
  // Checkouts state - only from backend
  const [checkouts, setCheckouts] = useState([]);
  const [loadingCheckouts, setLoadingCheckouts] = useState(false);
  
  // Track deleted checkouts to prevent reappearing
  const [deletedCheckouts, setDeletedCheckouts] = useState([]);
  
  // Reading lists state
  const readingListsInitialState = [
    { 
      _id: 'want-to-read', 
      name: 'Want to Read', 
      books: [],
      description: 'Books you plan to read'
    },
    { 
      _id: 'currently-reading', 
      name: 'Currently Reading', 
      books: [],
      description: 'Books you are currently reading'
    }
  ];
  const [readingLists, setReadingLists] = useState(readingListsInitialState);
  
  const [newListName, setNewListName] = useState('');
  
  // Purchase History state - specific to current user
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [loadingPurchaseHistory, setLoadingPurchaseHistory] = useState(false);
  
  // UI State for modals
  const [showReadingListModal, setShowReadingListModal] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  
  // Quick Preview State
  const [showQuickPreview, setShowQuickPreview] = useState(false);
  const [quickPreviewBook, setQuickPreviewBook] = useState(null);
  
  // ✅ READING PROGRESS STATE
  const [readingProgress, setReadingProgress] = useState({});
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [selectedProgressBook, setSelectedProgressBook] = useState(null);
  const [progressInput, setProgressInput] = useState('');
  const [progressMode, setProgressMode] = useState('percentage');
  const [readingGoals, setReadingGoals] = useState({
    yearlyGoal: 24,
    currentYearProgress: 0,
    monthlyGoal: 2,
    currentMonthProgress: 0
  });

  // ✅ BOOK REVIEWS STATE
  const [bookReviews, setBookReviews] = useState({});
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedReviewBook, setSelectedReviewBook] = useState(null);
  const [reviewData, setReviewData] = useState({
    rating: 5,
    title: '',
    review: ''
  });

  // ✅ ANALYTICS STATE
  const [analytics, setAnalytics] = useState({
    monthlyData: [],
    genreData: [],
    authorData: [],
    totalReadingTime: 0
  });

  // Categories
  const categories = [
    'All', 'Fiction', 'Non-Fiction', 'Science', 'Technology', 
    'Biography', 'History', 'Fantasy', 'Mystery', 'Romance',
    'Self-Help', 'Business', 'Children', 'Education'
  ];
  
  // Library information
  const [libraryInfo, setLibraryInfo] = useState({
    name: 'Libroverse Central Library',
    location: '123 Book Street, Knowledge City',
    hours: '9:00 AM - 8:00 PM (Mon-Sat)',
    contact: 'contact@libroverse.com',
    totalBooks: 12500,
    activeMembers: 3200,
    established: '2010'
  });

  // Available reading levels
  const readingLevels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];

  // Available genres for selection
  const availableGenres = [
    'Fiction', 'Non-Fiction', 'Science', 'Technology', 'Biography',
    'History', 'Fantasy', 'Mystery', 'Romance', 'Self-Help',
    'Business', 'Children', 'Education', 'Classics', 'Poetry',
    'Thriller', 'Horror', 'Cookbooks', 'Travel', 'Art'
  ];

  // Check if backend is available
  const [backendAvailable, setBackendAvailable] = useState(true);

  // ✅ AUTO-REFRESH TIMER FOR PURCHASE HISTORY
  const [refreshInterval, setRefreshInterval] = useState(null);

  // ✅ Helper function to format currency to 2 decimal places
  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '0.00';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return numAmount.toFixed(2);
  };

  // ✅ IMAGE URL HANDLING FUNCTION
  const fixImageUrl = (url) => {
    if (!url || url.trim() === '') return null;
    
    try {
      new URL(url);
      return url;
    } catch {
      if (url.startsWith('/')) {
        return url;
      }
      if (url.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i)) {
        return `http://localhost:5000/uploads/${url}`;
      }
      return url;
    }
  };

  // ✅ HELPER FUNCTION TO GET VALID IMAGE URL
  const getValidImageUrl = (book) => {
    if (!book) return null;
    
    const possibleFields = ['imageUrl', 'image', 'coverImage', 'thumbnail', 'cover', 'imageURL'];
    
    for (const field of possibleFields) {
      if (book[field]) {
        const url = String(book[field]).trim();
        const fixedUrl = fixImageUrl(url);
        return fixedUrl;
      }
    }
    
    return null;
  };

  // ✅ Function to get placeholder color based on book title
  const getBookColor = (title) => {
    const colors = [
      '#4A5568', '#2D3748', '#1A202C', 
      '#2C5282', '#2B6CB0', '#3182CE',
      '#2C7A7B', '#285E61', '#234E52',
      '#744210', '#7B341E', '#9C4221'
    ];
    if (!title) return colors[0];
    const index = title.length % colors.length;
    return colors[index];
  };

  // ✅ Function to get book initials
  const getBookInitials = (title) => {
    if (!title) return 'B';
    const words = title.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return title.substring(0, 2).toUpperCase();
  };

  // ✅ Function to get author initials
  const getAuthorInitials = (author) => {
    if (!author) return 'A';
    const words = author.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[words.length - 1][0]).toUpperCase();
    }
    return author.substring(0, 2).toUpperCase();
  };

  // ✅ Fetch books from database
  const fetchBooks = async () => {
    try {
      console.log('📚 Fetching books from API...');
      setLoading(true);
      
      setBooks([]);
      setFilteredBooks([]);
      
      try {
        console.log(`🌐 Making request to: ${api}/books`);
        const res = await fetch(`${api}/books`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        console.log(`📚 Response status:`, res.status);
        
        if (res.ok) {
          const data = await res.json();
          console.log('✅ Books API response:', data);
          
          let booksArray = [];
          
          if (data.success && Array.isArray(data.books)) {
            booksArray = data.books;
            console.log(`📚 Found ${booksArray.length} books in data.books`);
          } else if (Array.isArray(data)) {
            booksArray = data;
            console.log(`📚 Found ${booksArray.length} books in array response`);
          } else if (data.books && Array.isArray(data.books)) {
            booksArray = data.books;
            console.log(`📚 Found ${booksArray.length} books in data.books`);
          } else {
            console.warn('⚠️ Unexpected response structure:', data);
          }
          
          if (booksArray.length > 0) {
            const formattedBooks = booksArray.map(book => {
              const imageUrl = getValidImageUrl(book);
              
              let description = book.description;
              if (!description || description.trim() === '') {
                description = `${book.title} by ${book.author}. ${
                  book.category ? `A ${book.category.toLowerCase()} book` : 'An interesting read'
                }. Explore this book in our collection.`;
              }
              
              return {
                ...book,
                _id: book._id || book.id || `book_${Date.now()}_${Math.random()}`,
                imageUrl: imageUrl,
                price: book.price || 0,
                category: book.category || 'General',
                stock: book.stock || 0,
                rating: book.rating || 4.0,
                description: description,
                author: book.author || 'Unknown Author',
                title: book.title || 'Untitled Book'
              };
            });
            
            console.log('📚 Setting books state with:', formattedBooks.length, 'books');
            setBooks(formattedBooks);
            setFilteredBooks(formattedBooks);
            
            localStorage.setItem('user_books', JSON.stringify(formattedBooks));
            console.log('💾 Books saved to localStorage');
          } else {
            console.log('📚 No books found in API response');
            useMockBooks();
          }
        } else {
          console.error('❌ Failed to fetch books:', res.status);
          useMockBooks();
        }
      } catch (apiError) {
        console.error('❌ API fetch error:', apiError.message);
        useMockBooks();
      }
    } catch (outerError) {
      console.error('❌ Outer fetchBooks error:', outerError);
      useMockBooks();
    } finally {
      setLoading(false);
    }
  };

  // ✅ Use mock books
  const useMockBooks = () => {
    const mockBooks = [
      {
        _id: '1',
        title: 'PLAYING IT MY WAY',
        author: 'Sachin Tendulkar',
        price: 343,
        category: 'Biography',
        description: 'The autobiography of legendary cricketer Sachin Tendulkar',
        imageUrl: 'https://m.media-amazon.com/images/I/71izwO0t1dL._AC_UF1000,1000_QL80_.jpg',
        rating: 4.8,
        stock: 5,
        pages: 486,
        publishedDate: '2014-11-06'
      },
      {
        _id: '2',
        title: 'The Psychology of Money',
        author: 'Morgan Housel',
        price: 350,
        category: 'Business',
        description: 'Timeless lessons on wealth, greed, and happiness',
        imageUrl: 'https://m.media-amazon.com/images/I/71Ix5WXgZKL._AC_UF1000,1000_QL80_.jpg',
        rating: 4.5,
        stock: 8,
        pages: 256,
        publishedDate: '2020-09-08'
      },
      {
        _id: '3',
        title: '12 Years: My Messed-up Love Story',
        author: 'Chetan Bhagat',
        price: 499,
        category: 'Fiction',
        description: 'A story about love and relationships spanning 12 years',
        imageUrl: 'https://m.media-amazon.com/images/I/71k7x7KtYkL._AC_UF1000,1000_QL80_.jpg',
        rating: 4.2,
        stock: 10,
        pages: 280,
        publishedDate: '2023-01-01'
      },
      {
        _id: '4',
        title: 'Atomic Habits',
        author: 'James Clear',
        price: 399,
        category: 'Self-Help',
        description: 'Tiny Changes, Remarkable Results: An Easy & Proven Way to Build Good Habits & Break Bad Ones',
        imageUrl: 'https://m.media-amazon.com/images/I/91bYsX41DVL._AC_UF1000,1000_QL80_.jpg',
        rating: 4.7,
        stock: 5,
        pages: 320,
        publishedDate: '2018-10-16'
      },
      {
        _id: '5',
        title: 'Guilty Travels',
        author: 'Jonathan Swift',
        price: 179,
        category: 'Travel',
        description: 'A collection of travel essays and observations',
        imageUrl: 'https://m.media-amazon.com/images/I/81jY0KxGZKL._AC_UF1000,1000_QL80_.jpg',
        rating: 4.2,
        stock: 4,
        pages: 320,
        publishedDate: '2018-03-15'
      }
    ];
    
    setBooks(mockBooks);
    setFilteredBooks(mockBooks);
    localStorage.setItem('user_books', JSON.stringify(mockBooks));
  };

  // ✅ BOOK REVIEWS FUNCTIONS
  const openReviewModal = (book) => {
    setSelectedReviewBook(book);
    const existingReview = bookReviews[book._id];
    setReviewData({
      rating: existingReview?.rating || 5,
      title: existingReview?.title || '',
      review: existingReview?.review || ''
    });
    setShowReviewModal(true);
  };

  const submitReview = () => {
    if (!selectedReviewBook) return;
    
    if (!reviewData.title.trim()) {
      alert('Please enter a review title');
      return;
    }
    
    if (!reviewData.review.trim()) {
      alert('Please write your review');
      return;
    }
    
    const newReview = {
      bookId: selectedReviewBook._id,
      bookTitle: selectedReviewBook.title,
      bookAuthor: selectedReviewBook.author,
      bookImage: selectedReviewBook.imageUrl,
      rating: reviewData.rating,
      title: reviewData.title,
      review: reviewData.review,
      date: new Date().toISOString(),
      userName: userProfile.name,
      userId: getCurrentUserId() // Add user ID to review
    };
    
    setBookReviews(prev => ({
      ...prev,
      [selectedReviewBook._id]: newReview
    }));
    
    const allReviews = JSON.parse(localStorage.getItem('book_reviews') || '{}');
    allReviews[selectedReviewBook._id] = newReview;
    localStorage.setItem('book_reviews', JSON.stringify(allReviews));
    
    setShowReviewModal(false);
    alert('Review submitted successfully!');
  };

  const deleteReview = (bookId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    
    const updatedReviews = { ...bookReviews };
    delete updatedReviews[bookId];
    setBookReviews(updatedReviews);
    
    localStorage.setItem('book_reviews', JSON.stringify(updatedReviews));
    
    alert('Review deleted successfully!');
  };

  // ✅ ANALYTICS FUNCTIONS
  const calculateAnalytics = () => {
    const completedBooks = Object.values(readingProgress).filter(p => p.progress === 100);
    const monthlyData = calculateMonthlyData();
    const genreData = calculateGenreData();
    const authorData = calculateAuthorData();
    const totalReadingTime = calculateTotalReadingTime();
    
    setAnalytics({
      monthlyData,
      genreData,
      authorData,
      totalReadingTime
    });
  };

  const calculateMonthlyData = () => {
    const monthlyCount = {};
    const now = new Date();
    const currentYear = now.getFullYear();
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentYear, now.getMonth() - i, 1);
      const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthlyCount[monthKey] = 0;
    }
    
    Object.values(readingProgress).forEach(progress => {
      if (progress.progress === 100 && progress.updatedAt) {
        const date = new Date(progress.updatedAt);
        const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        if (monthlyCount[monthKey] !== undefined) {
          monthlyCount[monthKey]++;
        }
      }
    });
    
    return Object.entries(monthlyCount).map(([month, count]) => ({ month, count }));
  };

  const calculateGenreData = () => {
    const genreCount = {};
    const completedBooks = Object.values(readingProgress).filter(p => p.progress === 100);
    
    completedBooks.forEach(progress => {
      const book = books.find(b => b._id === progress.bookId);
      if (book && book.category) {
        genreCount[book.category] = (genreCount[book.category] || 0) + 1;
      }
    });
    
    return Object.entries(genreCount).map(([genre, count]) => ({ genre, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const calculateAuthorData = () => {
    const authorCount = {};
    const completedBooks = Object.values(readingProgress).filter(p => p.progress === 100);
    
    completedBooks.forEach(progress => {
      if (progress.bookAuthor) {
        authorCount[progress.bookAuthor] = (authorCount[progress.bookAuthor] || 0) + 1;
      }
    });
    
    return Object.entries(authorCount).map(([author, count]) => ({ author, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const calculateTotalReadingTime = () => {
    const completedBooks = Object.values(readingProgress).filter(p => p.progress === 100);
    let totalPages = 0;
    
    completedBooks.forEach(progress => {
      totalPages += progress.totalPages || 300;
    });
    
    return Math.round((totalPages * 2) / 60);
  };

  // ✅ QUICK PREVIEW FUNCTIONS
  const handleQuickPreview = (book) => {
    console.log('🔍 Quick preview for:', book.title);
    setQuickPreviewBook(book);
    setShowQuickPreview(true);
  };

  const closeQuickPreview = () => {
    setShowQuickPreview(false);
    setQuickPreviewBook(null);
  };

  // ✅ VIEW ORDER DETAILS FUNCTION
  const viewOrderDetails = (order) => {
    console.log('📄 Viewing order details for:', order.orderNumber);
    
    let itemsList = '';
    if (order.items && order.items.length > 0) {
      itemsList = order.items.map((item, index) => 
        `${index + 1}. ${item.book?.title || 'Unknown Book'} (x${item.quantity || 1}) - ₹${item.price || 0}`
      ).join('\n');
    } else {
      itemsList = 'No items found';
    }
    
    const orderDetails = `Order Details:
═══════════════════════════════════

Order #: ${order.orderNumber || order._id}
Date: ${new Date(order.createdAt).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}
Status: ${order.status}
Total: ₹${order.totalAmount ? order.totalAmount.toFixed(2) : '0.00'}

═══════════════════════════════════
Items (${order.items?.length || 0}):
═══════════════════════════════════
${itemsList}

═══════════════════════════════════
Shipping Information:
═══════════════════════════════════
Name: ${order.shippingInfo?.name || userProfile.name}
Email: ${order.shippingInfo?.email || userProfile.email}
Address: ${order.shippingInfo?.address || 'Not specified'}
City: ${order.shippingInfo?.city || 'Not specified'}
Pincode: ${order.shippingInfo?.pincode || 'Not specified'}

Payment Method: ${order.paymentMethod || 'Cash on Delivery'}
Payment Status: ${order.paymentStatus || 'Pending'}`;
    
    alert(orderDetails);
  };

  // ✅ REORDER FUNCTION
  const reorderItems = (order) => {
    console.log('🔄 Reordering items from order:', order.orderNumber);
    
    if (!order.items || order.items.length === 0) {
      alert('No items found in this order to reorder');
      return;
    }
    
    const confirmReorder = window.confirm(
      `Reorder ${order.items.length} item(s) from Order #${order.orderNumber}?\n\n` +
      `This will add all items to your cart.`
    );
    
    if (!confirmReorder) return;
    
    let addedCount = 0;
    let skippedCount = 0;
    
    order.items.forEach(item => {
      if (item.book && item.book._id) {
        const existingItemIndex = cart.findIndex(cartItem => 
          cartItem.book._id === item.book._id
        );
        
        if (existingItemIndex >= 0) {
          const updatedCart = [...cart];
          updatedCart[existingItemIndex] = {
            ...updatedCart[existingItemIndex],
            qty: updatedCart[existingItemIndex].qty + (item.quantity || 1)
          };
          setCart(updatedCart);
          addedCount++;
        } else {
          setCart(prev => [...prev, { 
            book: {
              _id: item.book._id,
              title: item.book.title,
              author: item.book.author,
              price: item.book.price,
              imageUrl: item.book.imageUrl || '/placeholder.png',
              category: item.book.category || 'General'
            }, 
            qty: item.quantity || 1 
          }]);
          addedCount++;
        }
      } else {
        skippedCount++;
      }
    });
    
    if (addedCount > 0) {
      alert(`✅ Successfully added ${addedCount} item(s) to your cart from Order #${order.orderNumber}!\n\n` +
            `Total items in cart: ${cart.length + addedCount}\n` +
            `Total amount: ₹${getCartTotal().toFixed(2)}`);
    }
    
    if (skippedCount > 0) {
      console.warn(`Skipped ${skippedCount} items due to missing book information`);
    }
  };

  // ✅ TRACK ORDER FUNCTION
  const handleTrackOrder = (order) => {
    console.log('🔍 Tracking order:', order.orderNumber || order._id);
    
    // Navigate to track order page with order data
    navigate('/track-order', { 
      state: { 
        orderData: order 
      } 
    });
  };

  // ✅ READING PROGRESS FUNCTIONS

  // Load reading progress from localStorage on mount
  useEffect(() => {
    const savedProgress = JSON.parse(localStorage.getItem('reading_progress') || '{}');
    setReadingProgress(savedProgress);
    
    const savedReviews = JSON.parse(localStorage.getItem('book_reviews') || '{}');
    setBookReviews(savedReviews);
    
    const savedGoals = JSON.parse(localStorage.getItem('reading_goals') || JSON.stringify({
      yearlyGoal: 24,
      currentYearProgress: 0,
      monthlyGoal: 2,
      currentMonthProgress: 0
    }));
    setReadingGoals(savedGoals);
    
    const currentlyReadingList = readingListsInitialState.find(list => list._id === 'currently-reading');
    if (currentlyReadingList) {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      
      let monthReadCount = 0;
      Object.values(savedProgress).forEach(progress => {
        const progressDate = new Date(progress.updatedAt);
        if (progress.progress === 100 && 
            progressDate.getFullYear() === currentYear && 
            progressDate.getMonth() + 1 === currentMonth) {
          monthReadCount++;
        }
      });
      
      let yearReadCount = 0;
      Object.values(savedProgress).forEach(progress => {
        const progressDate = new Date(progress.updatedAt);
        if (progress.progress === 100 && progressDate.getFullYear() === currentYear) {
          yearReadCount++;
        }
      });
      
      setReadingGoals(prev => ({
        ...prev,
        currentMonthProgress: monthReadCount,
        currentYearProgress: yearReadCount
      }));
    }
  }, []);

  // Calculate analytics when reading progress changes
  useEffect(() => {
    calculateAnalytics();
  }, [readingProgress, books]);

  // Save reading progress to localStorage
  useEffect(() => {
    localStorage.setItem('reading_progress', JSON.stringify(readingProgress));
  }, [readingProgress]);

  // Save reading goals to localStorage
  useEffect(() => {
    localStorage.setItem('reading_goals', JSON.stringify(readingGoals));
  }, [readingGoals]);

  // Update reading progress function
  const updateReadingProgress = (bookId, progress, totalPages = null) => {
    const book = books.find(b => b._id === bookId) || 
                checkouts.find(c => c.book._id === bookId)?.book ||
                readingLists.flatMap(list => list.books).find(b => b._id === bookId);
    
    if (!book) {
      console.error('Book not found for progress update');
      return;
    }

    const newProgress = {
      bookId,
      bookTitle: book.title,
      bookAuthor: book.author,
      bookImage: book.imageUrl,
      progress: progress,
      totalPages: totalPages || book.pages || 300,
      currentPage: totalPages ? Math.round((progress / 100) * totalPages) : null,
      updatedAt: new Date().toISOString(),
      status: progress === 100 ? 'Completed' : 'In Progress',
      userId: getCurrentUserId() // Add user ID to progress
    };

    setReadingProgress(prev => ({
      ...prev,
      [bookId]: newProgress
    }));

    if (progress === 100) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;
      const progressDate = new Date(newProgress.updatedAt);
      
      if (progressDate.getFullYear() === currentYear) {
        setReadingGoals(prev => ({
          ...prev,
          currentYearProgress: prev.currentYearProgress + 1
        }));
      }
      
      if (progressDate.getFullYear() === currentYear && progressDate.getMonth() + 1 === currentMonth) {
        setReadingGoals(prev => ({
          ...prev,
          currentMonthProgress: prev.currentMonthProgress + 1
        }));
      }
    }

    const currentlyReadingList = readingLists.find(list => list._id === 'currently-reading');
    if (currentlyReadingList) {
      const isInList = currentlyReadingList.books.some(b => b._id === bookId);
      if (!isInList) {
        addToReadingList(book, 'currently-reading');
      }
    }

    if (progress === 100) {
      const updatedLists = readingLists.map(list => {
        if (list._id === 'currently-reading') {
          return {
            ...list,
            books: list.books.filter(b => b._id !== bookId)
          };
        }
        return list;
      });
      setReadingLists(updatedLists);
    }

    alert(`Progress updated: ${book.title} - ${progress}% complete`);
    setShowProgressModal(false);
  };

  // Open progress modal
  const openProgressModal = (book) => {
    setSelectedProgressBook(book);
    const existingProgress = readingProgress[book._id];
    if (existingProgress) {
      setProgressInput(existingProgress.progress.toString());
    } else {
      setProgressInput('0');
    }
    setShowProgressModal(true);
  };

  // Save progress from modal
  const saveProgressFromModal = () => {
    if (!selectedProgressBook || !progressInput) return;
    
    let progressValue;
    if (progressMode === 'pages') {
      const totalPages = selectedProgressBook.pages || 300;
      progressValue = Math.round((parseInt(progressInput) / totalPages) * 100);
    } else {
      progressValue = parseInt(progressInput);
    }
    
    if (isNaN(progressValue) || progressValue < 0 || progressValue > 100) {
      alert('Please enter a valid percentage between 0 and 100');
      return;
    }
    
    updateReadingProgress(selectedProgressBook._id, progressValue);
  };

  // Update reading goals
  const updateReadingGoals = (type, value) => {
    setReadingGoals(prev => ({
      ...prev,
      [type]: value
    }));
  };

  // Get progress bar color
  const getProgressBarColor = (progress) => {
    if (progress >= 80) return '#10b981';
    if (progress >= 50) return '#3b82f6';
    if (progress >= 25) return '#f59e0b';
    return '#ef4444';
  };

  // Get reading stats
  const getReadingStats = () => {
    const activeProgress = Object.values(readingProgress).filter(p => p.progress > 0 && p.progress < 100);
    const completedBooks = Object.values(readingProgress).filter(p => p.progress === 100);
    
    const totalPagesRead = completedBooks.reduce((total, book) => total + (book.totalPages || 300), 0);
    const avgProgress = activeProgress.length > 0 
      ? activeProgress.reduce((sum, book) => sum + book.progress, 0) / activeProgress.length 
      : 0;
    
    return {
      activeBooks: activeProgress.length,
      completedBooks: completedBooks.length,
      totalPagesRead,
      avgProgress: Math.round(avgProgress),
      readingStreak: calculateReadingStreak()
    };
  };

  // Calculate reading streak
  const calculateReadingStreak = () => {
    const completedBooks = Object.values(readingProgress).filter(p => p.progress === 100);
    if (completedBooks.length === 0) return 0;
    
    const dates = completedBooks
      .map(b => new Date(b.updatedAt).toDateString())
      .sort();
    
    let streak = 1;
    for (let i = 1; i < dates.length; i++) {
      const prevDate = new Date(dates[i-1]);
      const currDate = new Date(dates[i]);
      const diffDays = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        streak++;
      } else if (diffDays > 1) {
        streak = 1;
      }
    }
    
    return streak;
  };

  // ✅ AUTO-REFRESH PURCHASE HISTORY EVERY 30 SECONDS
  const startAutoRefresh = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
    
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing purchase history...');
      fetchPurchaseHistoryForUser();
    }, 30000); // Refresh every 30 seconds
    
    setRefreshInterval(interval);
  };

  // ✅ STOP AUTO-REFRESH
  const stopAutoRefresh = () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  };

  // ✅ Load data from localStorage on mount
  useEffect(() => {
    console.log("UserDashboard mounted, fetching data...");
    
    // Load deleted checkouts
    const savedDeletedCheckouts = JSON.parse(localStorage.getItem('deleted_checkouts') || '[]');
    setDeletedCheckouts(savedDeletedCheckouts);
    
    const savedProfile = JSON.parse(localStorage.getItem('user_profile') || 'null');
    if (savedProfile) {
      console.log("👤 Loading profile from localStorage");
      setUserProfile(savedProfile);
    } else {
      setUserProfile({
        name: currentUser.name || 'User',
        email: currentUser.email || '',
        joinDate: currentUser.createdAt ? new Date(currentUser.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        readingLevel: 'Intermediate',
        favoriteGenres: ['Fiction', 'Non-Fiction', 'Technology']
      });
    }
    
    const savedWishlist = JSON.parse(localStorage.getItem('user_wishlist') || '[]');
    if (savedWishlist.length > 0) {
      console.log("❤️ Loading wishlist from localStorage:", savedWishlist.length, "items");
      setWishlist(savedWishlist);
    }
    
    const savedReadingLists = JSON.parse(localStorage.getItem('user_reading_lists') || '[]');
    if (savedReadingLists.length > 0) {
      console.log("📋 Loading reading lists from localStorage:", savedReadingLists.length, "lists");
      setReadingLists(savedReadingLists);
    } else {
      setReadingLists(readingListsInitialState);
      localStorage.setItem('user_reading_lists', JSON.stringify(readingListsInitialState));
    }
    
    const savedCart = JSON.parse(localStorage.getItem('cart') || '[]');
    if (savedCart.length > 0) {
      console.log("🛒 Loading cart from localStorage:", savedCart.length, "items");
      const validatedCart = savedCart.map(item => {
        if (!item.book && item._id) {
          return {
            book: {
              _id: item._id,
              title: item.title || 'Unknown Book',
              author: item.author || 'Unknown Author',
              price: item.price || 0,
              imageUrl: item.imageUrl || '/placeholder.png',
              category: item.category || 'General'
            },
            qty: item.qty || item.quantity || 1
          };
        }
        return item;
      });
      setCart(validatedCart);
    }
    
    // Load purchase history for specific user from localStorage
    const userId = getCurrentUserId();
    const savedPurchaseHistory = JSON.parse(localStorage.getItem(`user_purchase_history_${userId}`) || 
                                         localStorage.getItem('user_purchase_history') || '[]');
    
    if (savedPurchaseHistory.length > 0) {
      console.log("📦 Loading purchase history from localStorage:", savedPurchaseHistory.length, "items");
      
      const successfulOrders = savedPurchaseHistory.filter(order => 
        order.status && ['Delivered', 'Completed', 'Processing', 'Success', 'Paid', 'Pending'].includes(order.status)
      );
      setPurchaseHistory(successfulOrders);
    }
    
    checkBackendConnection();
    
    fetchBooks();
    fetchUserProfile();
    fetchCheckouts();
    fetchPurchaseHistoryForUser(); // Use the user-specific function
    
    // Start auto-refresh for purchase history
    startAutoRefresh();
    
    // Cleanup on unmount
    return () => {
      stopAutoRefresh();
    };
  }, []);

  // Check for successful order in location state
  useEffect(() => {
    if (location.state && location.state.orderSuccess) {
      console.log('✅ Order successful! Processing order data...');
      
      if (location.state.orderData) {
        addOrderToHistory(location.state.orderData);
      } else if (location.state.cart) {
        createOrderFromCart(location.state.cart);
      }
      
      navigate(location.pathname, { replace: true, state: {} });
    }
    
    if (location.state && location.state.checkoutSuccess) {
      console.log('✅ Checkout successful!');
      fetchCheckouts();
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  // Save user profile to localStorage
  useEffect(() => {
    localStorage.setItem('user_profile', JSON.stringify(userProfile));
    console.log("💾 Profile saved to localStorage");
  }, [userProfile]);

  // Save wishlist to localStorage
  useEffect(() => {
    localStorage.setItem('user_wishlist', JSON.stringify(wishlist));
    console.log("💾 Wishlist saved to localStorage:", wishlist.length, "items");
  }, [wishlist]);

  // Save reading lists to localStorage
  useEffect(() => {
    localStorage.setItem('user_reading_lists', JSON.stringify(readingLists));
    console.log("💾 Reading lists saved to localStorage:", readingLists.length, "lists");
  }, [readingLists]);

  // Save cart to localStorage
  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem('cart', JSON.stringify(cart));
      console.log("💾 Cart saved to localStorage:", cart.length, "items");
    } else {
      localStorage.removeItem('cart');
    }
  }, [cart]);

  // Save checkouts to localStorage
  useEffect(() => {
    if (checkouts.length > 0) {
      localStorage.setItem('user_checkouts', JSON.stringify(checkouts));
      console.log("💾 Checkouts saved to localStorage:", checkouts.length, "items");
    } else {
      localStorage.removeItem('user_checkouts');
    }
  }, [checkouts]);

  // Save deleted checkouts to localStorage
  useEffect(() => {
    localStorage.setItem('deleted_checkouts', JSON.stringify(deletedCheckouts));
  }, [deletedCheckouts]);

  // Save purchase history to localStorage with user-specific key
  useEffect(() => {
    if (purchaseHistory.length > 0) {
      const userId = getCurrentUserId();
      if (userId) {
        localStorage.setItem(`user_purchase_history_${userId}`, JSON.stringify(purchaseHistory));
      }
      localStorage.setItem('user_purchase_history', JSON.stringify(purchaseHistory));
      console.log("💾 Purchase history saved to localStorage:", purchaseHistory.length, "items");
    }
  }, [purchaseHistory]);

  // ✅ Filter books when search term or category changes
  useEffect(() => {
    let filtered = [...books];
    
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(book => book.category === selectedCategory);
    }
    
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(book =>
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (book.description && book.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    setFilteredBooks(filtered);
  }, [books, searchTerm, selectedCategory]);

  // ✅ EDIT PROFILE FUNCTIONS
  const openEditProfile = () => {
    setEditProfileData({
      name: userProfile.name,
      email: userProfile.email,
      readingLevel: userProfile.readingLevel,
      favoriteGenres: [...userProfile.favoriteGenres]
    });
    setShowEditProfile(true);
  };

  const closeEditProfile = () => {
    setShowEditProfile(false);
  };

  const handleEditProfileChange = (field, value) => {
    setEditProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleGenre = (genre) => {
    setEditProfileData(prev => {
      const newGenres = prev.favoriteGenres.includes(genre)
        ? prev.favoriteGenres.filter(g => g !== genre)
        : [...prev.favoriteGenres, genre];
      return {
        ...prev,
        favoriteGenres: newGenres
      };
    });
  };

  const saveProfileChanges = () => {
    if (!editProfileData.name.trim()) {
      alert('Name is required');
      return;
    }
    
    if (!editProfileData.email.trim()) {
      alert('Email is required');
      return;
    }
    
    if (!editProfileData.readingLevel) {
      alert('Please select a reading level');
      return;
    }
    
    setUserProfile({
      ...userProfile,
      name: editProfileData.name,
      email: editProfileData.email,
      readingLevel: editProfileData.readingLevel,
      favoriteGenres: editProfileData.favoriteGenres
    });
    
    if (backendAvailable && token) {
      updateProfileInBackend();
    }
    
    closeEditProfile();
    
    alert('Profile updated successfully!');
  };

  const updateProfileInBackend = async () => {
    try {
      const res = await fetch(`${api}/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({
          name: editProfileData.name,
          email: editProfileData.email,
          readingLevel: editProfileData.readingLevel,
          favoriteGenres: editProfileData.favoriteGenres
        })
      });
      
      if (res.ok) {
        console.log('✅ Profile updated in backend');
      } else {
        console.warn('⚠️ Failed to update profile in backend');
      }
    } catch (error) {
      console.warn('⚠️ Network error updating profile:', error.message);
    }
  };

  // Check backend connection
  const checkBackendConnection = async () => {
    try {
      const res = await fetch(`${api}/test`, { 
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log('✅ Backend available:', data.message);
        setBackendAvailable(true);
      } else {
        console.warn('⚠️ Backend test endpoint returned error');
        setBackendAvailable(false);
      }
    } catch (error) {
      console.warn('❌ Backend not available:', error.message);
      setBackendAvailable(false);
    }
  };

  const fetchUserProfile = async () => {
    if (!token) return;
    
    try {
      const res = await fetch(`${api}/users/profile`, {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      if (res.ok) {
        const data = await res.json();
        setUserProfile(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  // ✅ FETCH CHECKOUTS FROM BACKEND ONLY
  const fetchCheckouts = async () => {
    console.log('📖 ========== FETCHING CHECKOUTS ==========');
    
    if (!token) {
      console.log('No token, skipping checkouts fetch');
      setCheckouts([]);
      setLoadingCheckouts(false);
      return;
    }
    
    try {
      setLoadingCheckouts(true);
      console.log('📖 Fetching checkouts from backend...');
      
      const res = await fetch(`${api}/checkouts/my-checkouts`, {
        headers: { 
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log('✅ Checkouts fetched from backend:', data);
        
        let backendCheckouts = [];
        if (data.success && Array.isArray(data.data)) {
          backendCheckouts = data.data;
        } else if (Array.isArray(data)) {
          backendCheckouts = data;
        } else if (data.checkouts && Array.isArray(data.checkouts)) {
          backendCheckouts = data.checkouts;
        }
        
        console.log(`📖 Found ${backendCheckouts.length} checkouts in backend`);
        
        // Filter out backend checkouts that are in deleted list
        const filteredBackendCheckouts = backendCheckouts.filter(checkout => 
          !deletedCheckouts.includes(checkout._id)
        );
        
        console.log(`📖 After filtering deleted: ${filteredBackendCheckouts.length} checkouts`);
        
        // Only set checkouts from backend - no localStorage books
        setCheckouts(filteredBackendCheckouts);
        
        // Save checkouts to localStorage for offline viewing
        localStorage.setItem('user_checkouts', JSON.stringify(filteredBackendCheckouts));
        
      } else {
        console.error('❌ Failed to fetch checkouts from backend:', res.status);
        // Load from localStorage as fallback if backend fails
        const savedCheckouts = JSON.parse(localStorage.getItem('user_checkouts') || '[]');
        
        // Filter out deleted checkouts
        const filteredCheckouts = savedCheckouts.filter(checkout => 
          !deletedCheckouts.includes(checkout._id)
        );
        
        if (filteredCheckouts.length > 0) {
          console.log('📖 Using localStorage checkouts as fallback');
          setCheckouts(filteredCheckouts);
        } else {
          setCheckouts([]);
        }
      }
    } catch (error) {
      console.error("❌ Error fetching checkouts:", error);
      // Load from localStorage on error
      const savedCheckouts = JSON.parse(localStorage.getItem('user_checkouts') || '[]');
      
      // Filter out deleted checkouts
      const filteredCheckouts = savedCheckouts.filter(checkout => 
        !deletedCheckouts.includes(checkout._id)
      );
      
      if (filteredCheckouts.length > 0) {
        setCheckouts(filteredCheckouts);
      } else {
        setCheckouts([]);
      }
    } finally {
      setLoadingCheckouts(false);
    }
  };

  // ✅ FETCH PURCHASE HISTORY FOR SPECIFIC USER WITH REAL-TIME UPDATES
  const fetchPurchaseHistoryForUser = async () => {
    console.log('📦 ========== FETCHING PURCHASE HISTORY FOR SPECIFIC USER ==========');
    
    const userId = getCurrentUserId();
    console.log('👤 Current User ID:', userId);
    
    if (!userId) {
      console.log('⚠️ No user ID found, cannot fetch specific purchase history');
      setLoadingPurchaseHistory(false);
      return;
    }
    
    setLoadingPurchaseHistory(true);
    
    try {
      // Try to fetch from backend first (real-time data)
      if (backendAvailable && token) {
        try {
          console.log('🌐 Attempting to fetch from backend for specific user...');
          
          // Try multiple endpoints to get orders
          let ordersFromBackend = [];
          let foundOrders = false;
          
          // Endpoint 1: /api/orders/my-orders (most likely for user's own orders)
          try {
            console.log('🌐 Trying endpoint: /api/orders/my-orders');
            const myOrdersResponse = await fetch(`${api}/orders/my-orders`, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': token ? 'Bearer ' + token : ''
              }
            });
            
            if (myOrdersResponse.ok) {
              const myOrdersData = await myOrdersResponse.json();
              console.log('✅ Success from /api/orders/my-orders:', myOrdersData);
              
              if (myOrdersData.success && Array.isArray(myOrdersData.data)) {
                ordersFromBackend = myOrdersData.data;
                foundOrders = true;
                console.log(`📦 Found ${ordersFromBackend.length} orders from my-orders`);
              } else if (Array.isArray(myOrdersData)) {
                ordersFromBackend = myOrdersData;
                foundOrders = true;
                console.log(`📦 Found ${ordersFromBackend.length} orders in array`);
              } else if (myOrdersData.orders && Array.isArray(myOrdersData.orders)) {
                ordersFromBackend = myOrdersData.orders;
                foundOrders = true;
                console.log(`📦 Found ${ordersFromBackend.length} orders in data.orders`);
              }
            }
          } catch (myOrdersError) {
            console.log('⚠️ /api/orders/my-orders failed:', myOrdersError.message);
          }
          
          // Endpoint 2: /api/orders/user/:userId (if admin endpoint works for users)
          if (!foundOrders) {
            try {
              console.log(`🌐 Trying endpoint: /api/orders/user/${userId}`);
              const userOrdersResponse = await fetch(`${api}/orders/user/${userId}`, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                  'Authorization': token ? 'Bearer ' + token : ''
                }
              });
              
              if (userOrdersResponse.ok) {
                const userOrdersData = await userOrdersResponse.json();
                console.log(`✅ Success from /api/orders/user/${userId}:`, userOrdersData);
                
                if (userOrdersData.success && Array.isArray(userOrdersData.data)) {
                  ordersFromBackend = userOrdersData.data;
                  foundOrders = true;
                  console.log(`📦 Found ${ordersFromBackend.length} orders from user endpoint`);
                } else if (Array.isArray(userOrdersData)) {
                  ordersFromBackend = userOrdersData;
                  foundOrders = true;
                  console.log(`📦 Found ${ordersFromBackend.length} orders in array`);
                } else if (userOrdersData.orders && Array.isArray(userOrdersData.orders)) {
                  ordersFromBackend = userOrdersData.orders;
                  foundOrders = true;
                  console.log(`📦 Found ${ordersFromBackend.length} orders in data.orders`);
                }
              }
            } catch (userOrdersError) {
              console.log('⚠️ /api/orders/user/:userId failed:', userOrdersError.message);
            }
          }
          
          // If we got orders from backend, process them
          if (foundOrders && ordersFromBackend.length > 0) {
            console.log('✅ Processing orders from backend:', ordersFromBackend.length);
            
            const formattedOrders = ordersFromBackend.map(order => {
              // Determine the correct status
              let orderStatus = 'Processing';
              if (order.orderStatus) orderStatus = order.orderStatus;
              else if (order.status) orderStatus = order.status;
              
              // Capitalize first letter
              if (orderStatus) {
                orderStatus = orderStatus.charAt(0).toUpperCase() + orderStatus.slice(1).toLowerCase();
              }
              
              return {
                _id: order._id || order.id || `order_${Date.now()}`,
                orderNumber: order.orderNumber || `ORD-${order._id?.toString().slice(-8) || '0000'}`,
                createdAt: order.createdAt || order.createdAt || new Date().toISOString(),
                status: orderStatus,
                totalAmount: order.total || order.totalAmount || order.totalPrice || 0,
                userId: order.userId || order.user || userId,
                items: (order.items || []).map(item => {
                  // Handle nested book objects
                  let bookObj = item.book || {};
                  if (typeof bookObj === 'string') {
                    bookObj = { _id: bookObj, title: 'Unknown Book' };
                  }
                  
                  return {
                    book: {
                      _id: bookObj._id || item.bookId || item.book,
                      title: bookObj.title || 'Unknown Book',
                      author: bookObj.author || 'Unknown Author',
                      price: item.price || bookObj.price || 0,
                      imageUrl: bookObj.imageUrl || bookObj.image || '/placeholder.png',
                      category: bookObj.category || 'General'
                    },
                    quantity: item.qty || item.quantity || 1,
                    price: item.price || 0
                  };
                }),
                shippingInfo: order.shippingInfo || {
                  name: order.customerName || userProfile.name,
                  email: order.customerEmail || userProfile.email,
                  address: order.shippingAddress || 'Not specified'
                },
                paymentMethod: order.paymentMethod || 'Cash on Delivery',
                paymentStatus: order.paymentStatus || 'Pending'
              };
            });
            
            console.log('📦 Formatted orders from backend:', formattedOrders.length);
            
            // Sort by date (newest first)
            const sortedOrders = formattedOrders.sort((a, b) => 
              new Date(b.createdAt) - new Date(a.createdAt)
            );
            
            setPurchaseHistory(sortedOrders);
            
            // Save to localStorage
            localStorage.setItem(`user_purchase_history_${userId}`, JSON.stringify(sortedOrders));
            localStorage.setItem('user_purchase_history', JSON.stringify(sortedOrders));
            
            // Log the completed count
            const completedCount = sortedOrders.filter(order => 
              order.status === 'Delivered' || order.status === 'Completed'
            ).length;
            console.log(`✅ Completed orders count: ${completedCount}`);
            
          } else {
            console.log('⚠️ No orders found in backend, using localStorage');
            
            // Load from localStorage as fallback
            const savedHistory = JSON.parse(localStorage.getItem(`user_purchase_history_${userId}`) || 
                                         localStorage.getItem('user_purchase_history') || '[]');
            
            if (savedHistory.length > 0) {
              const userOrders = savedHistory.filter(order => 
                !order.userId || order.userId === userId
              );
              
              const successfulOrders = userOrders.filter(order => 
                order.status && ['Delivered', 'Completed', 'Processing', 'Success', 'Paid', 'Pending'].includes(order.status)
              );
              
              // Sort by date
              const sortedLocalOrders = successfulOrders.sort((a, b) => 
                new Date(b.createdAt) - new Date(a.createdAt)
              );
              
              setPurchaseHistory(sortedLocalOrders);
              
              const completedCount = sortedLocalOrders.filter(order => 
                order.status === 'Delivered' || order.status === 'Completed'
              ).length;
              console.log(`✅ Completed orders count from localStorage: ${completedCount}`);
            }
          }
        } catch (endpointError) {
          console.log(`⚠️ Network error with user purchases endpoint:`, endpointError.message);
          
          // Fallback to localStorage
          const savedHistory = JSON.parse(localStorage.getItem(`user_purchase_history_${userId}`) || 
                                       localStorage.getItem('user_purchase_history') || '[]');
          
          if (savedHistory.length > 0) {
            const userOrders = savedHistory.filter(order => 
              !order.userId || order.userId === userId
            );
            
            const successfulOrders = userOrders.filter(order => 
              order.status && ['Delivered', 'Completed', 'Processing', 'Success', 'Paid', 'Pending'].includes(order.status)
            );
            
            setPurchaseHistory(successfulOrders);
          }
        }
      } else {
        console.log('📱 Backend unavailable, using localStorage only');
        
        // Load from localStorage
        const savedHistory = JSON.parse(localStorage.getItem(`user_purchase_history_${userId}`) || 
                                     localStorage.getItem('user_purchase_history') || '[]');
        
        if (savedHistory.length > 0) {
          const userOrders = savedHistory.filter(order => 
            !order.userId || order.userId === userId
          );
          
          const successfulOrders = userOrders.filter(order => 
            order.status && ['Delivered', 'Completed', 'Processing', 'Success', 'Paid', 'Pending'].includes(order.status)
          );
          
          setPurchaseHistory(successfulOrders);
        }
      }
    } catch (error) {
      console.error('❌ Outer error in fetchPurchaseHistoryForUser:', error);
    } finally {
      setLoadingPurchaseHistory(false);
    }
  };

  // ✅ REFRESH PURCHASE HISTORY
  const refreshPurchaseHistory = () => {
    console.log('🔄 Manually refreshing purchase history...');
    fetchPurchaseHistoryForUser();
  };

  // ✅ CLEAR PURCHASE HISTORY FOR SPECIFIC USER
  const clearPurchaseHistory = async () => {
    const userId = getCurrentUserId();
    
    if (!userId) {
      alert('User ID not found');
      return;
    }
    
    if (!confirm(`⚠️ Are you sure you want to clear ALL purchase history for user ${userProfile.name}? This will delete all your orders and cannot be undone.`)) {
      return;
    }
    
    try {
      // Try to delete from backend if available
      if (backendAvailable) {
        const response = await fetch(`${api}/purchases/user/${userId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? 'Bearer ' + token : ''
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Purchase history cleared from backend for user ${userId}:`, result);
        } else {
          console.log('⚠️ Failed to clear from backend, but will clear locally');
        }
      }
      
      // Clear from state and localStorage
      setPurchaseHistory([]);
      localStorage.removeItem(`user_purchase_history_${userId}`);
      localStorage.removeItem('user_purchase_history');
      
      alert(`✅ All purchase history has been cleared for user ${userProfile.name}.`);
    } catch (error) {
      console.error('❌ Error clearing purchase history:', error);
      
      // Still clear locally even if backend fails
      setPurchaseHistory([]);
      localStorage.removeItem(`user_purchase_history_${userId}`);
      localStorage.removeItem('user_purchase_history');
      
      alert('✅ Purchase history cleared locally (backend sync failed).');
    }
  };

  // ✅ ADD ORDER TO HISTORY FOR SPECIFIC USER
  const addOrderToHistory = (orderData) => {
    console.log('📦 Adding order to purchase history:', orderData);
    
    const userId = getCurrentUserId();
    
    const newOrder = {
      _id: orderData._id || `order_${Date.now()}`,
      orderNumber: orderData.orderNumber || `ORD-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
      createdAt: orderData.createdAt || new Date().toISOString(),
      status: orderData.status || 'Processing',
      totalAmount: orderData.totalAmount || getCartTotal(),
      userId: userId,
      items: orderData.items || (cart.length > 0 ? cart.map(item => ({
        book: {
          _id: item.book._id,
          title: item.book.title,
          author: item.book.author,
          price: item.book.price,
          imageUrl: item.book.imageUrl || '/placeholder.png',
          category: item.book.category || 'General'
        },
        quantity: item.qty,
        price: item.book.price
      })) : [])
    };
    
    console.log('New order created:', newOrder);
    
    const updatedHistory = [newOrder, ...purchaseHistory];
    setPurchaseHistory(updatedHistory);
    
    // Save with user-specific key
    if (userId) {
      localStorage.setItem(`user_purchase_history_${userId}`, JSON.stringify(updatedHistory));
    }
    localStorage.setItem('user_purchase_history', JSON.stringify(updatedHistory));
    
    setCart([]);
    localStorage.removeItem('cart');
    
    alert(`✅ Order placed successfully!\nOrder #: ${newOrder.orderNumber}\nTotal: ₹${formatCurrency(newOrder.totalAmount)}`);
    
    setActiveSection('purchaseHistory');
    
    if (backendAvailable) {
      syncOrderWithBackend(newOrder);
    }
  };

  // ✅ SYNC ORDER WITH BACKEND
  const syncOrderWithBackend = async (order) => {
    try {
      console.log('🌐 Syncing order with backend...');
      const res = await fetch(`${api}/orders/checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: order.userId,
          items: order.items.map(item => ({
            bookId: item.book._id,
            quantity: item.quantity,
            price: item.price
          })),
          totalAmount: order.totalAmount,
          status: order.status,
          shippingInfo: {
            name: userProfile.name,
            email: userProfile.email,
            phone: '9999999999',
            address: 'Sample Address',
            city: 'Sample City',
            state: 'Sample State',
            pincode: '123456',
            country: 'India'
          },
          paymentMethod: 'cod'
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log('✅ Order synced with backend:', data);
      } else {
        console.log('⚠️ Backend sync failed, order saved locally only');
      }
    } catch (error) {
      console.log('⚠️ Network error during sync, order saved locally');
    }
  };

  // ✅ CREATE ORDER FROM CART
  const createOrderFromCart = (cartItems) => {
    console.log('🛒 Creating order from cart:', cartItems);
    
    const totalAmount = cartItems.reduce((total, item) => {
      const price = item.book?.price || item.price || 0;
      const qty = item.qty || item.quantity || 1;
      return total + (price * qty);
    }, 0);
    
    const orderData = {
      totalAmount,
      status: 'Processing',
      items: cartItems.map(item => ({
        book: {
          _id: item.book?._id || item._id,
          title: item.book?.title || item.title || 'Unknown Book',
          author: item.book?.author || item.author || 'Unknown Author',
          price: item.book?.price || item.price || 0,
          imageUrl: item.book?.imageUrl || item.imageUrl || '/placeholder.png',
          category: item.book?.category || item.category || 'General'
        },
        quantity: item.qty || item.quantity || 1,
        price: item.book?.price || item.price || 0
      }))
    };
    
    addOrderToHistory(orderData);
  };

  // ✅ ENHANCED WISHLIST FUNCTION
  const toggleWishlist = (book) => {
    if (!token && !localStorageUser.email) {
      alert('Please login to use wishlist');
      navigate('/login');
      return;
    }

    const isInWishlist = wishlist.some(item => item._id === book._id);
    
    if (isInWishlist) {
      const updatedWishlist = wishlist.filter(item => item._id !== book._id);
      setWishlist(updatedWishlist);
      alert(`"${book.title}" removed from wishlist!`);
    } else {
      const updatedWishlist = [...wishlist, {
        ...book,
        addedAt: new Date().toISOString(),
        userId: getCurrentUserId()
      }];
      setWishlist(updatedWishlist);
      alert(`"${book.title}" added to wishlist! ❤️`);
    }
  };

  // ✅ ENHANCED READING LIST FUNCTION
  const addToReadingList = (book, listId) => {
    if (!token && !localStorageUser.email) {
      alert('Please login to add books to reading lists');
      navigate('/login');
      return;
    }
    
    const listIndex = readingLists.findIndex(list => list._id === listId);
    if (listIndex === -1) {
      alert('Reading list not found');
      return;
    }
    
    const list = readingLists[listIndex];
    const isBookInList = list.books.some(b => b._id === book._id);
    
    if (isBookInList) {
      alert(`"${book.title}" is already in "${list.name}" list!`);
      return;
    }
    
    const updatedLists = [...readingLists];
    updatedLists[listIndex] = {
      ...list,
      books: [...list.books, {
        ...book,
        addedAt: new Date().toISOString(),
        userId: getCurrentUserId()
      }]
    };
    
    setReadingLists(updatedLists);
    alert(`"${book.title}" added to "${list.name}" list!`);
    setShowReadingListModal(false);
  };

  // ✅ SHOW READING LIST MODAL
  const showAddToReadingListModal = (book) => {
    console.log('📋 Showing reading list modal for:', book.title);
    setSelectedBook(book);
    setShowReadingListModal(true);
  };

  // ✅ CREATE NEW READING LIST
  const createReadingList = () => {
    if (!newListName.trim()) {
      alert('Please enter a list name');
      return;
    }
    
    if (!token && !localStorageUser.email) {
      alert('Please login to create reading lists');
      navigate('/login');
      return;
    }
    
    const newList = {
      _id: `list_${Date.now()}`,
      name: newListName,
      books: [],
      description: 'Your custom reading list',
      created: new Date().toISOString(),
      userId: getCurrentUserId()
    };
    
    setReadingLists([...readingLists, newList]);
    setNewListName('');
    alert(`"${newListName}" reading list created!`);
  };

  // ✅ REMOVE FROM READING LIST
  const removeFromReadingList = (listId, bookId) => {
    const updatedLists = readingLists.map(list => {
      if (list._id === listId) {
        return {
          ...list,
          books: list.books.filter(book => book._id !== bookId)
        };
      }
      return list;
    });
    
    setReadingLists(updatedLists);
    alert('Book removed from reading list!');
  };

  // ✅ DELETE READING LIST
  const deleteReadingList = (listId) => {
    if (!window.confirm('Are you sure you want to delete this reading list?')) {
      return;
    }
    
    if (listId === 'want-to-read' || listId === 'currently-reading') {
      alert('Cannot delete default reading lists');
      return;
    }
    
    const updatedLists = readingLists.filter(list => list._id !== listId);
    setReadingLists(updatedLists);
    alert('Reading list deleted!');
  };

  // ✅ REMOVE FROM WISHLIST
  const removeFromWishlist = (bookId) => {
    const updatedWishlist = wishlist.filter(book => book._id !== bookId);
    setWishlist(updatedWishlist);
    alert('Book removed from wishlist!');
  };

  // Cart functions
  const addToCart = (book) => {
    console.log("Adding to cart:", book.title);
    setCart(prev => {
      const exists = prev.find(i => i.book._id === book._id);
      if (exists) {
        return prev.map(i =>
          i.book._id === book._id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { 
        book: {
          _id: book._id,
          title: book.title,
          author: book.author,
          price: book.price,
          imageUrl: book.imageUrl || '/placeholder.png',
          category: book.category || 'General'
        }, 
        qty: 1 
      }];
    });
  };

  const removeFromCart = (bookId) => {
    setCart(prev => prev.filter(item => item.book._id !== bookId));
  };

  const updateQuantity = (bookId, newQty) => {
    if (newQty < 1) {
      removeFromCart(bookId);
      return;
    }
    setCart(prev => prev.map(item =>
      item.book._id === bookId ? { ...item, qty: newQty } : item
    ));
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + (item.book.price * item.qty), 0);
  };

  const checkout = () => {
    console.log('🛒 Checkout function called');
    
    if (cart.length === 0) {
      alert('Your cart is empty');
      return;
    }

    const formattedCart = cart.map(item => ({
      book: {
        _id: item.book._id,
        title: item.book.title,
        author: item.book.author,
        price: item.book.price,
        imageUrl: item.book.imageUrl,
        category: item.book.category
      },
      qty: item.qty,
      quantity: item.qty
    }));
    
    localStorage.setItem('cart', JSON.stringify(formattedCart));
    
    navigate('/checkout', { 
      state: { 
        cart: formattedCart,
        fromDashboard: true,
        userId: getCurrentUserId()
      } 
    });
  };

  // ✅ BORROW FUNCTION
  const checkoutBook = async (book) => {
    if (!token && !localStorageUser.email) {
      alert('Please login to borrow books');
      navigate('/login');
      return;
    }

    console.log('📚 Borrowing book:', book.title);
    
    try {
      if (backendAvailable && token) {
        console.log('🌐 Creating checkout in database...');
        
        const res = await fetch(`${api}/checkouts`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({
            bookId: book._id
          })
        });
        
        if (res.ok) {
          const data = await res.json();
          console.log('✅ Checkout created in database:', data);
          
          if (data.success) {
            // Add the new checkout to state
            setCheckouts(prev => [data.data, ...prev]);
            
            // Save to localStorage for offline viewing only
            const currentCheckouts = JSON.parse(localStorage.getItem('user_checkouts') || '[]');
            currentCheckouts.unshift(data.data);
            localStorage.setItem('user_checkouts', JSON.stringify(currentCheckouts));
            
            // Update book stock
            setBooks(prev => prev.map(b => 
              b._id === book._id ? { ...b, stock: Math.max(0, (b.stock || 1) - 1) } : b
            ));
            
            const dueDate = new Date(data.data.dueDate);
            alert(`✅ Successfully borrowed "${book.title}"!\nDue Date: ${dueDate.toLocaleDateString()}`);
            
            setActiveSection('checkouts');
            return;
          }
        } else {
          const errorData = await res.json();
          console.warn('⚠️ Backend checkout failed:', errorData.message);
          alert(`❌ Could not borrow book: ${errorData.message || 'Server error'}`);
          return;
        }
      } else {
        alert('❌ Backend is not available. Please try again later.');
      }
      
    } catch (error) {
      console.error('❌ Error borrowing book:', error);
      alert('❌ An error occurred while borrowing the book. Please try again.');
    }
  };

  // ✅ RENEW BOOK FUNCTION
  const renewBook = async (checkoutId) => {
    console.log('🔄 Renewing book with checkout ID:', checkoutId);
    
    if (!token && !localStorageUser.email) {
      alert('Please login to renew books');
      navigate('/login');
      return;
    }

    const checkoutToRenew = checkouts.find(c => c._id === checkoutId);
    if (!checkoutToRenew) {
      alert('Checkout not found!');
      return;
    }

    if (checkoutToRenew.status === 'Returned') {
      alert('Cannot renew a returned book!');
      return;
    }

    if (checkoutToRenew.renewals >= 2) {
      alert('Maximum renewals (2) reached!');
      return;
    }

    try {
      if (backendAvailable && token) {
        console.log('🌐 Renewing checkout in database...');
        
        const res = await fetch(`${api}/checkouts/${checkoutId}/renew`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          console.log('✅ Renewal successful in database:', data);
          
          if (data.success) {
            setCheckouts(prev => prev.map(c => 
              c._id === checkoutId ? { 
                ...c, 
                dueDate: data.data.newDueDate || new Date(new Date(c.dueDate).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'Renewed',
                renewals: (c.renewals || 0) + 1
              } : c
            ));
            
            const currentCheckouts = JSON.parse(localStorage.getItem('user_checkouts') || '[]');
            const updatedCheckouts = currentCheckouts.map(c => 
              c._id === checkoutId ? { 
                ...c, 
                dueDate: data.data.newDueDate || new Date(new Date(c.dueDate).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'Renewed',
                renewals: (c.renewals || 0) + 1
              } : c
            );
            localStorage.setItem('user_checkouts', JSON.stringify(updatedCheckouts));
            
            const newDueDate = new Date(data.data.newDueDate || new Date(checkoutToRenew.dueDate).getTime() + 14 * 24 * 60 * 60 * 1000);
            alert(`✅ Book renewed successfully!\nNew Due Date: ${newDueDate.toLocaleDateString()}`);
            return;
          }
        }
      }
      
      alert('❌ Failed to renew book. Please try again.');
      
    } catch (error) {
      console.error('❌ Error renewing book:', error);
      alert('❌ An error occurred while renewing the book. Please try again.');
    }
  };

  // ✅ RETURN BOOK FUNCTION
  const returnBook = async (checkoutId) => {
    console.log('📤 Returning book with checkout ID:', checkoutId);
    
    if (!token && !localStorageUser.email) {
      alert('Please login to return books');
      navigate('/login');
      return;
    }

    const checkoutToReturn = checkouts.find(c => c._id === checkoutId);
    if (!checkoutToReturn) {
      alert('Checkout not found!');
      return;
    }

    if (checkoutToReturn.status === 'Returned') {
      alert('This book has already been returned!');
      return;
    }

    try {
      if (backendAvailable && token) {
        console.log('🌐 Returning checkout in database...');
        
        const res = await fetch(`${api}/checkouts/${checkoutId}/return`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          console.log('✅ Return successful in database:', data);
          
          if (data.success) {
            setCheckouts(prev => prev.map(c => 
              c._id === checkoutId ? { 
                ...c, 
                returnDate: data.data.returnDate || new Date().toISOString(),
                status: 'Returned',
                fineAmount: data.data.fineAmount || 0
              } : c
            ));
            
            setBooks(prev => prev.map(b => 
              b._id === checkoutToReturn.book._id ? { ...b, stock: (b.stock || 0) + 1 } : b
            ));
            
            const currentCheckouts = JSON.parse(localStorage.getItem('user_checkouts') || '[]');
            const updatedCheckouts = currentCheckouts.map(c => 
              c._id === checkoutId ? { 
                ...c, 
                returnDate: data.data.returnDate || new Date().toISOString(),
                status: 'Returned',
                fineAmount: data.data.fineAmount || 0
              } : c
            );
            localStorage.setItem('user_checkouts', JSON.stringify(updatedCheckouts));
            
            const fineMsg = data.data.fineAmount > 0 ? `\nFine: ₹${data.data.fineAmount}` : '';
            alert(`✅ Book returned successfully!${fineMsg}`);
            return;
          }
        }
      }
      
      alert('❌ Failed to return book. Please try again.');
      
    } catch (error) {
      console.error('❌ Error returning book:', error);
      alert('❌ An error occurred while returning the book. Please try again.');
    }
  };

  // ✅ REMOVE CHECKOUT FUNCTION
  const removeCheckout = async (checkoutId) => {
    console.log('🗑️ Removing checkout with ID:', checkoutId);
    
    const checkoutToRemove = checkouts.find(c => c._id === checkoutId);
    if (!checkoutToRemove) {
      alert('Checkout not found!');
      return;
    }

    const confirmRemove = window.confirm(
      `Are you sure you want to permanently delete "${checkoutToRemove.book?.title}" from your checkouts?\n\n` +
      `This action cannot be undone.`
    );
    
    if (!confirmRemove) return;

    try {
      // Add to deleted checkouts list immediately to prevent reappearing
      setDeletedCheckouts(prev => {
        const updated = [...prev, checkoutId];
        localStorage.setItem('deleted_checkouts', JSON.stringify(updated));
        return updated;
      });
      
      // Try to delete from backend
      if (backendAvailable && token) {
        console.log('🌐 Deleting checkout from database...');
        
        const res = await fetch(`${api}/checkouts/${checkoutId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          console.log('✅ Checkout deleted from database:', data);
        } else {
          console.log('⚠️ Failed to delete from backend, but removed locally');
        }
      }
      
      // Remove from local state
      setCheckouts(prev => prev.filter(c => c._id !== checkoutId));
      
      // Remove from localStorage
      const currentCheckouts = JSON.parse(localStorage.getItem('user_checkouts') || '[]');
      const updatedCheckouts = currentCheckouts.filter(c => c._id !== checkoutId);
      localStorage.setItem('user_checkouts', JSON.stringify(updatedCheckouts));
      
      // If book was not returned, increase stock
      if (checkoutToRemove.status !== 'Returned') {
        setBooks(prev => prev.map(b => 
          b._id === checkoutToRemove.book._id ? { ...b, stock: (b.stock || 0) + 1 } : b
        ));
      }
      
      alert(`"${checkoutToRemove.book?.title}" has been permanently removed from your checkouts.`);
      
    } catch (error) {
      console.error('❌ Error removing checkout:', error);
      
      // If error occurs, remove from deleted list to allow retry
      setDeletedCheckouts(prev => prev.filter(id => id !== checkoutId));
      
      alert('❌ An error occurred while removing the checkout. Please try again.');
    }
  };

  // ✅ RENDER EDIT PROFILE MODAL
  const renderEditProfileModal = () => {
    if (!showEditProfile) return null;
    
    return (
      <div className="modal-overlay">
        <div className="modal-content edit-profile-modal">
          <div className="modal-header">
            <h3>Edit Profile</h3>
            <button 
              className="modal-close"
              onClick={closeEditProfile}
            >
              &times;
            </button>
          </div>
          
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                value={editProfileData.name}
                onChange={(e) => handleEditProfileChange('name', e.target.value)}
                placeholder="Enter your full name"
                className="form-input"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                value={editProfileData.email}
                onChange={(e) => handleEditProfileChange('email', e.target.value)}
                placeholder="Enter your email address"
                className="form-input"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="readingLevel">Reading Level</label>
              <select
                id="readingLevel"
                value={editProfileData.readingLevel}
                onChange={(e) => handleEditProfileChange('readingLevel', e.target.value)}
                className="form-select"
              >
                <option value="">Select reading level</option>
                {readingLevels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Favorite Genres</label>
              <div className="genres-selection">
                {availableGenres.map(genre => (
                  <button
                    key={genre}
                    type="button"
                    className={`genre-chip ${editProfileData.favoriteGenres.includes(genre) ? 'selected' : ''}`}
                    onClick={() => toggleGenre(genre)}
                  >
                    {genre}
                    {editProfileData.favoriteGenres.includes(genre) && (
                      <span className="checkmark">✓</span>
                    )}
                  </button>
                ))}
              </div>
              <p className="genre-hint">
                Selected: {editProfileData.favoriteGenres.length} genres
              </p>
            </div>
          </div>
          
          <div className="modal-actions">
            <button 
              className="modal-btn cancel-btn"
              onClick={closeEditProfile}
            >
              Cancel
            </button>
            <button 
              className="modal-btn save-btn"
              onClick={saveProfileChanges}
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ✅ RENDER READING LIST MODAL
  const renderReadingListModal = () => {
    if (!showReadingListModal || !selectedBook) return null;
    
    return (
      <div className="modal-overlay">
        <div className="modal-content reading-list-modal">
          <div className="modal-header">
            <h3>Add to Reading List</h3>
            <button 
              className="modal-close"
              onClick={() => setShowReadingListModal(false)}
            >
              &times;
            </button>
          </div>
          
          <div className="modal-body">
            <div className="modal-book-preview">
              <img 
                src={selectedBook.imageUrl || '/placeholder.png'} 
                alt={selectedBook.title}
                className="modal-book-image"
              />
              <div className="modal-book-info">
                <h4>{selectedBook.title}</h4>
                <p className="modal-book-author">by {selectedBook.author}</p>
                <p className="modal-book-category">{selectedBook.category}</p>
                <p className="modal-book-price">₹{selectedBook.price}</p>
              </div>
            </div>
            
            <p className="modal-instruction">
              Select a reading list to add this book to:
            </p>
            
            <div className="reading-lists-select">
              {readingLists.length === 0 ? (
                <p className="no-lists-message">No reading lists created yet.</p>
              ) : (
                readingLists.map(list => {
                  const isBookInList = list.books?.some(book => book._id === selectedBook._id);
                  return (
                    <button
                      key={list._id}
                      className={`reading-list-option ${isBookInList ? 'disabled' : ''}`}
                      onClick={() => !isBookInList && addToReadingList(selectedBook, list._id)}
                      disabled={isBookInList}
                    >
                      <div className="list-option-content">
                        <span className="list-name">{list.name}</span>
                        <span className="list-count">
                          {list.books?.length || 0} books
                        </span>
                        <span className="list-description">{list.description}</span>
                      </div>
                      {isBookInList && (
                        <span className="already-added">✓ Already added</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
            
            {/* Create new list */}
            <div className="create-list-in-modal">
              <input
                type="text"
                placeholder="Or create a new list..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="list-name-input-modal"
              />
              <button 
                onClick={() => {
                  createReadingList();
                }}
                className="create-list-btn-modal"
                disabled={!newListName.trim()}
              >
                Create List
              </button>
            </div>
          </div>
          
          <div className="modal-actions">
            <button 
              className="modal-btn cancel-btn"
              onClick={() => setShowReadingListModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ✅ RENDER PROGRESS MODAL
  const renderProgressModal = () => {
    if (!showProgressModal || !selectedProgressBook) return null;
    
    const existingProgress = readingProgress[selectedProgressBook._id];
    const currentProgress = existingProgress ? existingProgress.progress : 0;
    
    return (
      <div className="modal-overlay" onClick={() => setShowProgressModal(false)}>
        <div className="modal-content progress-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Update Reading Progress</h3>
            <button 
              className="modal-close"
              onClick={() => setShowProgressModal(false)}
            >
              &times;
            </button>
          </div>
          
          <div className="modal-body">
            <div className="progress-book-info">
              <img 
                src={selectedProgressBook.imageUrl || '/placeholder.png'} 
                alt={selectedProgressBook.title}
                className="progress-book-image"
              />
              <div className="progress-book-details">
                <h4>{selectedProgressBook.title}</h4>
                <p className="progress-book-author">by {selectedProgressBook.author}</p>
                <div className="progress-book-meta">
                  {selectedProgressBook.pages && (
                    <span className="pages-info">📖 {selectedProgressBook.pages} pages</span>
                  )}
                  {selectedProgressBook.category && (
                    <span className="category-info">🏷️ {selectedProgressBook.category}</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="current-progress-display">
              <div className="progress-header">
                <span>Current Progress</span>
                <span className="progress-percentage">{currentProgress}%</span>
              </div>
              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill"
                  style={{
                    width: `${currentProgress}%`,
                    backgroundColor: getProgressBarColor(currentProgress)
                  }}
                ></div>
              </div>
              {existingProgress?.currentPage && (
                <p className="page-info">
                  📄 Page {existingProgress.currentPage} of {existingProgress.totalPages}
                </p>
              )}
            </div>
            
            <div className="progress-input-section">
              <div className="progress-mode-selector">
                <button
                  className={`progress-mode-btn ${progressMode === 'percentage' ? 'active' : ''}`}
                  onClick={() => setProgressMode('percentage')}
                >
                  Percentage
                </button>
                <button
                  className={`progress-mode-btn ${progressMode === 'pages' ? 'active' : ''}`}
                  onClick={() => setProgressMode('pages')}
                >
                  Pages
                </button>
              </div>
              
              <div className="progress-input-group">
                {progressMode === 'percentage' ? (
                  <>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={progressInput}
                      onChange={(e) => setProgressInput(e.target.value)}
                      className="progress-slider"
                    />
                    <div className="progress-input-with-button">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={progressInput}
                        onChange={(e) => setProgressInput(e.target.value)}
                        className="progress-number-input"
                        placeholder="Enter percentage (0-100)"
                      />
                      <span className="percentage-symbol">%</span>
                    </div>
                  </>
                ) : (
                  <div className="pages-input-group">
                    <input
                      type="number"
                      min="0"
                      max={selectedProgressBook.pages || 300}
                      value={progressInput}
                      onChange={(e) => setProgressInput(e.target.value)}
                      className="pages-number-input"
                      placeholder={`Enter page number (0-${selectedProgressBook.pages || 300})`}
                    />
                    <span className="pages-label">
                      of {selectedProgressBook.pages || 300} pages
                    </span>
                  </div>
                )}
              </div>
              
              <div className="quick-progress-buttons">
                <button
                  className="quick-progress-btn"
                  onClick={() => setProgressInput('0')}
                >
                  Start (0%)
                </button>
                <button
                  className="quick-progress-btn"
                  onClick={() => setProgressInput('25')}
                >
                  25%
                </button>
                <button
                  className="quick-progress-btn"
                  onClick={() => setProgressInput('50')}
                >
                  Halfway
                </button>
                <button
                  className="quick-progress-btn"
                  onClick={() => setProgressInput('75')}
                >
                  75%
                </button>
                <button
                  className="quick-progress-btn complete-btn"
                  onClick={() => setProgressInput('100')}
                >
                  Complete
                </button>
              </div>
            </div>
          </div>
          
          <div className="modal-actions">
            <button 
              className="modal-btn cancel-btn"
              onClick={() => setShowProgressModal(false)}
            >
              Cancel
            </button>
            <button 
              className="modal-btn save-btn"
              onClick={saveProgressFromModal}
            >
              Save Progress
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ✅ RENDER REVIEW MODAL
  const renderReviewModal = () => {
    if (!showReviewModal || !selectedReviewBook) return null;
    
    return (
      <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
        <div className="modal-content review-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Write a Review</h3>
            <button 
              className="modal-close"
              onClick={() => setShowReviewModal(false)}
            >
              &times;
            </button>
          </div>
          
          <div className="modal-body">
            <div className="review-book-info">
              <img 
                src={selectedReviewBook.imageUrl || '/placeholder.png'} 
                alt={selectedReviewBook.title}
                className="review-book-image"
              />
              <div className="review-book-details">
                <h4>{selectedReviewBook.title}</h4>
                <p className="review-book-author">by {selectedReviewBook.author}</p>
              </div>
            </div>
            
            <div className="review-form">
              <div className="form-group">
                <label>Your Rating</label>
                <div className="rating-input">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      className={`star-btn ${star <= reviewData.rating ? 'active' : ''}`}
                      onClick={() => setReviewData(prev => ({ ...prev, rating: star }))}
                    >
                      ★
                    </button>
                  ))}
                  <span className="rating-text">
                    {reviewData.rating} star{reviewData.rating !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              
              <div className="form-group">
                <label htmlFor="review-title">Review Title</label>
                <input
                  type="text"
                  id="review-title"
                  value={reviewData.title}
                  onChange={(e) => setReviewData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Summarize your review in a few words"
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="review-text">Your Review</label>
                <textarea
                  id="review-text"
                  value={reviewData.review}
                  onChange={(e) => setReviewData(prev => ({ ...prev, review: e.target.value }))}
                  placeholder="Share your thoughts about this book..."
                  className="form-textarea"
                  rows={6}
                />
              </div>
            </div>
          </div>
          
          <div className="modal-actions">
            <button 
              className="modal-btn cancel-btn"
              onClick={() => setShowReviewModal(false)}
            >
              Cancel
            </button>
            <button 
              className="modal-btn save-btn"
              onClick={submitReview}
            >
              Submit Review
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ✅ RENDER QUICK PREVIEW MODAL
  const renderQuickPreviewModal = () => {
    if (!showQuickPreview || !quickPreviewBook) return null;
    
    return (
      <div className="modal-overlay" onClick={closeQuickPreview}>
        <div className="modal-content quick-preview-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Quick Preview</h3>
            <button 
              className="modal-close"
              onClick={closeQuickPreview}
            >
              &times;
            </button>
          </div>
          
          <div className="modal-body">
            <div className="preview-book-content">
              <div className="preview-book-image">
                <img 
                  src={quickPreviewBook.imageUrl || '/placeholder.png'} 
                  alt={quickPreviewBook.title}
                  className="preview-img"
                />
              </div>
              
              <div className="preview-book-details">
                <h4 className="preview-title">{quickPreviewBook.title}</h4>
                <p className="preview-author">by {quickPreviewBook.author}</p>
                <div className="preview-meta">
                  <span className="preview-category">{quickPreviewBook.category}</span>
                  {quickPreviewBook.pages && (
                    <span className="preview-pages"> • {quickPreviewBook.pages} pages</span>
                  )}
                  {quickPreviewBook.publishedDate && (
                    <span className="preview-year"> • Published: {new Date(quickPreviewBook.publishedDate).getFullYear()}</span>
                  )}
                </div>
                
                {quickPreviewBook.rating && (
                  <div className="preview-rating">
                    <div className="stars">
                      {'⭐'.repeat(Math.floor(quickPreviewBook.rating))}
                      {quickPreviewBook.rating % 1 >= 0.5 && '⭐'.slice(0, 1)}
                    </div>
                    <span className="rating-value">{quickPreviewBook.rating}/5</span>
                    {quickPreviewBook.reviewCount && (
                      <span className="review-count">({quickPreviewBook.reviewCount} reviews)</span>
                    )}
                  </div>
                )}
                
                <div className="preview-pricing">
                  <span className="price">₹{quickPreviewBook.price ? quickPreviewBook.price.toFixed(2) : '0.00'}</span>
                  {quickPreviewBook.originalPrice && quickPreviewBook.originalPrice > quickPreviewBook.price && (
                    <>
                      <span className="original-price">₹{quickPreviewBook.originalPrice.toFixed(2)}</span>
                      <span className="discount-percent">
                        {Math.round(((quickPreviewBook.originalPrice - quickPreviewBook.price) / quickPreviewBook.originalPrice) * 100)}% off
                      </span>
                    </>
                  )}
                </div>
                
                {quickPreviewBook.stock !== undefined && (
                  <div className="preview-stock">
                    {quickPreviewBook.stock === 0 ? (
                      <span className="out-of-stock">❌ Currently unavailable</span>
                    ) : quickPreviewBook.stock < 5 ? (
                      <span className="low-stock">⚠️ Only {quickPreviewBook.stock} left in stock</span>
                    ) : (
                      <span className="in-stock">✅ In Stock</span>
                    )}
                  </div>
                )}
                
                {quickPreviewBook.description && (
                  <div className="preview-description">
                    <h5>Description</h5>
                    <p>{quickPreviewBook.description}</p>
                  </div>
                )}
                
                <div className="preview-actions">
                  <button 
                    className={`preview-add-cart-btn ${cart.some(item => item.book._id === quickPreviewBook._id) ? 'in-cart' : ''}`}
                    onClick={() => {
                      addToCart(quickPreviewBook);
                      closeQuickPreview();
                    }}
                    disabled={quickPreviewBook.stock === 0}
                  >
                    {cart.some(item => item.book._id === quickPreviewBook._id) ? (
                      <>
                        <span className="check-icon">✓</span> 
                        <span>In Cart</span>
                      </>
                    ) : (
                      <>
                        <span className="cart-icon">🛒</span> 
                        <span>Add to Cart</span>
                      </>
                    )}
                  </button>
                  
                  <button 
                    className="preview-borrow-btn"
                    onClick={() => {
                      checkoutBook(quickPreviewBook);
                      closeQuickPreview();
                    }}
                    disabled={quickPreviewBook.stock === 0}
                  >
                    <span className="borrow-icon">📖</span> 
                    <span>Borrow</span>
                  </button>
                  
                  <button 
                    className="preview-reading-list-btn"
                    onClick={() => {
                      showAddToReadingListModal(quickPreviewBook);
                      closeQuickPreview();
                    }}
                  >
                    <span className="list-icon">📋</span> 
                    <span>Reading List</span>
                  </button>
                  
                  <button 
                    className="preview-wishlist-btn"
                    onClick={() => {
                      toggleWishlist(quickPreviewBook);
                      closeQuickPreview();
                    }}
                  >
                    <span className="wishlist-icon">
                      {wishlist.some(item => item._id === quickPreviewBook._id) ? '❤️' : '🤍'}
                    </span>
                    <span>
                      {wishlist.some(item => item._id === quickPreviewBook._id) ? 'In Wishlist' : 'Add to Wishlist'}
                    </span>
                  </button>
                  
                  <button 
                    className="preview-progress-btn"
                    onClick={() => {
                      openProgressModal(quickPreviewBook);
                      closeQuickPreview();
                    }}
                  >
                    <span className="progress-icon">📈</span> 
                    <span>Track Progress</span>
                  </button>
                  
                  <button 
                    className="preview-review-btn"
                    onClick={() => {
                      openReviewModal(quickPreviewBook);
                      closeQuickPreview();
                    }}
                  >
                    <span className="review-icon">✍️</span> 
                    <span>Write Review</span>
                  </button>
                  
                  <button 
                    className="preview-close-btn"
                    onClick={closeQuickPreview}
                  >
                    Close Preview
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ✅ RENDER BOOKS SECTION
  const renderBooksSection = () => {
    const stats = getReadingStats();
    
    return (
      <section className="books-section">
        <div className="section-header">
          <div className="header-content">
            <h2>Discover amazing books</h2>
            <p>Explore our vast collection across all genres</p>
          </div>
          
          {/* Reading Progress Quick Stats */}
          <div className="reading-stats-banner">
            <div className="stats-banner-content">
              <div className="stat-item-banner">
                <span className="stat-icon-banner">📚</span>
                <div className="stat-content-banner">
                  <span className="stat-value-banner">{stats.activeBooks}</span>
                  <span className="stat-label-banner">Active Books</span>
                </div>
              </div>
              <div className="stat-item-banner">
                <span className="stat-icon-banner">✅</span>
                <div className="stat-content-banner">
                  <span className="stat-value-banner">{stats.completedBooks}</span>
                  <span className="stat-label-banner">Completed</span>
                </div>
              </div>
              <div className="stat-item-banner">
                <span className="stat-icon-banner">🎯</span>
                <div className="stat-content-banner">
                  <span className="stat-value-banner">{readingGoals.currentYearProgress}/{readingGoals.yearlyGoal}</span>
                  <span className="stat-label-banner">Year Goal</span>
                </div>
              </div>
              <button 
                className="view-progress-btn"
                onClick={() => setActiveSection('readingProgress')}
              >
                View Progress →
              </button>
            </div>
          </div>
          
          <div className="search-filter-section">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search books by title, author, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <span className="search-icon">🔍</span>
            </div>
            
            <div className="category-filter">
              <span className="filter-label">Filter by Category:</span>
              <div className="category-chips">
                {categories.map(category => (
                  <button
                    key={category}
                    className={`category-chip ${selectedCategory === category ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading books...</p>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="empty-state">
            <p>No books found matching your criteria.</p>
            <button onClick={() => { setSearchTerm(''); setSelectedCategory('All'); }}>
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="books-grid">
            {filteredBooks.map(book => {
              const bookColor = getBookColor(book.title);
              const bookInitials = getBookInitials(book.title);
              const authorInitials = getAuthorInitials(book.author);
              const progress = readingProgress[book._id];
              const review = bookReviews[book._id];
              
              return (
                <div key={book._id} className="book-card-wrapper">
                  <div className="book-card">
                    <div className="book-image">
                      {book.imageUrl ? (
                        <>
                          <div className="image-loader">
                            <div className="loader-spinner"></div>
                          </div>
                          <img 
                            src={book.imageUrl} 
                            alt={book.title}
                            className="book-cover-img"
                            onLoad={(e) => {
                              e.target.classList.add('loaded');
                              const loader = e.target.parentElement.querySelector('.image-loader');
                              if (loader) loader.style.display = 'none';
                            }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              const placeholder = document.createElement('div');
                              placeholder.className = 'book-image-placeholder';
                              placeholder.style.background = `linear-gradient(135deg, ${bookColor} 0%, ${bookColor}80 100%)`;
                              placeholder.innerHTML = `
                                <div class="placeholder-icon">📚</div>
                                <div class="placeholder-title">${bookInitials}</div>
                                <div class="placeholder-author">${authorInitials}</div>
                              `;
                              e.target.parentElement.appendChild(placeholder);
                            }}
                          />
                        </>
                      ) : (
                        <div 
                          className="book-image-placeholder" 
                          style={{ background: `linear-gradient(135deg, ${bookColor} 0%, ${bookColor}80 100%)` }}
                        >
                          <div className="placeholder-icon">📚</div>
                          <div className="placeholder-title">{bookInitials}</div>
                          <div className="placeholder-author">{authorInitials}</div>
                        </div>
                      )}
                    </div>
                    <div className="book-info">
                      <h4>{book.title}</h4>
                      <p className="book-author">by {book.author}</p>
                      <div className="book-meta">
                        <span className="book-category">{book.category}</span>
                        <span className="book-price">₹{typeof book.price === 'number' ? book.price.toFixed(2) : '0.00'}</span>
                        <span className="book-stock">Stock: {book.stock || 0}</span>
                      </div>
                      {book.description && (
                        <p className="book-description">{book.description.length > 100 ? book.description.substring(0, 100) + '...' : book.description}</p>
                      )}
                      {/* Progress indicator on book card */}
                      {progress && (
                        <div className="book-progress-indicator">
                          <div className="book-progress-bar">
                            <div 
                              className="book-progress-fill"
                              style={{
                                width: `${progress.progress}%`,
                                backgroundColor: getProgressBarColor(progress.progress)
                              }}
                            ></div>
                          </div>
                          <span className="book-progress-percentage">{progress.progress}%</span>
                        </div>
                      )}
                      {/* Review indicator on book card */}
                      {review && (
                        <div className="book-review-indicator">
                          <div className="review-stars">
                            {'★'.repeat(review.rating)}
                            {'☆'.repeat(5 - review.rating)}
                          </div>
                          <p className="review-preview">"{review.title}"</p>
                          <button 
                            className="edit-review-btn"
                            onClick={() => openReviewModal(book)}
                          >
                            Edit Review
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="book-actions">
                      <button 
                        className="add-to-cart-btn"
                        onClick={() => addToCart(book)}
                        disabled={book.stock === 0}
                      >
                        {book.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                      </button>
                      <button 
                        className="borrow-btn"
                        onClick={() => checkoutBook(book)}
                        disabled={book.stock === 0}
                        title="Borrow this book"
                      >
                        📖 Borrow
                      </button>
                      <button 
                        className="wishlist-btn"
                        onClick={() => toggleWishlist(book)}
                        title={wishlist.some(item => item._id === book._id) ? 'Remove from wishlist' : 'Add to wishlist'}
                      >
                        {wishlist.some(item => item._id === book._id) ? '❤️' : '🤍'}
                      </button>
                      <button 
                        className="progress-btn"
                        onClick={() => openProgressModal(book)}
                        title={progress ? `Progress: ${progress.progress}%` : 'Track reading progress'}
                      >
                        {progress ? (
                          <div className="progress-indicator-small">
                            <div className="progress-bar-small">
                              <div 
                                className="progress-bar-fill-small"
                                style={{
                                  width: `${progress.progress}%`,
                                  backgroundColor: getProgressBarColor(progress.progress)
                                }}
                              ></div>
                            </div>
                            <span className="progress-percentage-small">{progress.progress}%</span>
                          </div>
                        ) : '📈'}
                      </button>
                      <button 
                        className="review-btn"
                        onClick={() => openReviewModal(book)}
                        title={review ? 'Edit your review' : 'Write a review'}
                      >
                        {review ? '✍️' : '📝'}
                      </button>
                      <button 
                        className="preview-btn"
                        onClick={() => handleQuickPreview(book)}
                        title="Quick preview"
                      >
                        👁️
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    );
  };

  // ✅ RENDER ANALYTICS SECTION
  const renderAnalyticsSection = () => (
    <section className="analytics-section">
      <div className="section-header">
        <h2>📊 Reading Analytics Dashboard</h2>
        <p>Track your reading habits and progress</p>
      </div>
      
      <div className="analytics-dashboard">
        {/* Monthly Reading Trend */}
        <div className="analytics-card">
          <h3>📈 Monthly Reading Trend</h3>
          <div className="chart-container">
            {analytics.monthlyData.length > 0 ? (
              <div className="bar-chart">
                {analytics.monthlyData.map((item, index) => {
                  const maxCount = Math.max(...analytics.monthlyData.map(d => d.count));
                  const height = maxCount > 0 ? (item.count / maxCount) * 100 : 10;
                  
                  return (
                    <div key={index} className="bar-item">
                      <div 
                        className="bar" 
                        style={{ height: `${height}%` }}
                        title={`${item.count} books in ${item.month}`}
                      >
                        <span className="bar-count">{item.count}</span>
                      </div>
                      <span className="bar-label">{item.month}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="no-data">No reading data available for the last 6 months</p>
            )}
          </div>
        </div>
        
        {/* Genre Distribution */}
        <div className="analytics-card">
          <h3>📚 Genre Distribution</h3>
          <div className="chart-container">
            {analytics.genreData.length > 0 ? (
              <div className="genre-chart">
                {analytics.genreData.map((item, index) => (
                  <div key={index} className="genre-item">
                    <div className="genre-info">
                      <span className="genre-name">{item.genre}</span>
                      <span className="genre-count">{item.count} books</span>
                    </div>
                    <div className="genre-bar">
                      <div 
                        className="genre-fill"
                        style={{ width: `${(item.count / Math.max(...analytics.genreData.map(g => g.count))) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No genre data available</p>
            )}
          </div>
        </div>
        
        {/* Most-Read Authors */}
        <div className="analytics-card">
          <h3>👤 Most-Read Authors</h3>
          <div className="chart-container">
            {analytics.authorData.length > 0 ? (
              <div className="author-list">
                {analytics.authorData.map((item, index) => (
                  <div key={index} className="author-item">
                    <span className="author-rank">#{index + 1}</span>
                    <span className="author-name">{item.author}</span>
                    <span className="author-count">{item.count} books</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-data">No author data available</p>
            )}
          </div>
        </div>
        
        {/* Reading Statistics */}
        <div className="analytics-card stats-card">
          <h3>📊 Reading Statistics</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-icon">📚</span>
              <div className="stat-content">
                <span className="stat-value">{Object.values(readingProgress).filter(p => p.progress === 100).length}</span>
                <span className="stat-label">Total Books Read</span>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-icon">⏱️</span>
              <div className="stat-content">
                <span className="stat-value">{analytics.totalReadingTime}</span>
                <span className="stat-label">Total Reading Hours</span>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-icon">📄</span>
              <div className="stat-content">
                <span className="stat-value">
                  {Object.values(readingProgress).filter(p => p.progress === 100).reduce((total, book) => total + (book.totalPages || 300), 0)}
                </span>
                <span className="stat-label">Total Pages Read</span>
              </div>
            </div>
            <div className="stat-item">
              <span className="stat-icon">⭐</span>
              <div className="stat-content">
                <span className="stat-value">{Object.keys(bookReviews).length}</span>
                <span className="stat-label">Books Reviewed</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Recent Reviews */}
        <div className="analytics-card">
          <h3>⭐ Recent Reviews</h3>
          <div className="recent-reviews">
            {Object.values(bookReviews).slice(0, 3).map((review, index) => (
              <div key={index} className="review-item">
                <div className="review-header">
                  <span className="review-book">{review.bookTitle}</span>
                  <div className="review-stars-small">
                    {'★'.repeat(review.rating)}
                    {'☆'.repeat(5 - review.rating)}
                  </div>
                </div>
                <p className="review-title">"{review.title}"</p>
                <p className="review-date">
                  Reviewed on {new Date(review.date).toLocaleDateString()}
                </p>
                <button 
                  className="view-review-btn"
                  onClick={() => {
                    const book = books.find(b => b._id === review.bookId);
                    if (book) openReviewModal(book);
                  }}
                >
                  View Review
                </button>
              </div>
            ))}
            {Object.keys(bookReviews).length === 0 && (
              <p className="no-data">No reviews yet</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );

  // ✅ RENDER ACCOUNT SECTION WITH EDIT BUTTON
  const renderAccountSection = () => (
    <section className="account-section">
      <div className="section-header">
        <div className="header-title">
          <h2>My Account</h2>
          <p>Manage your profile and settings</p>
        </div>
        <button 
          className="edit-profile-btn"
          onClick={openEditProfile}
        >
          ✏️ Edit Profile
        </button>
      </div>
      
      <div className="account-content">
        <div className="account-card">
          <div className="account-header">
            <div className="account-avatar">
              {userProfile.name.charAt(0).toUpperCase()}
            </div>
            <div className="account-info">
              <h3>{userProfile.name}</h3>
              <p className="account-email">{userProfile.email}</p>
              <p className="account-join-date">Member since {userProfile.joinDate}</p>
            </div>
          </div>
          
          <div className="account-details">
            <div className="detail-row">
              <span className="detail-label">Reading Level</span>
              <span className="detail-value">{userProfile.readingLevel}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Favorite Genres</span>
              <span className="detail-value">
                {userProfile.favoriteGenres.length > 0 
                  ? userProfile.favoriteGenres.join(', ')
                  : 'Not specified'}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Books Checked Out</span>
              <span className="detail-value">{checkouts.filter(c => c.status === 'Active' || c.status === 'Renewed').length}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Wishlist Items</span>
              <span className="detail-value">{wishlist.length}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Purchase History</span>
              <span className="detail-value">{purchaseHistory.length} orders</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Reading Progress</span>
              <span className="detail-value">
                {Object.values(readingProgress).filter(p => p.progress > 0).length} books tracked
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Reviews Written</span>
              <span className="detail-value">{Object.keys(bookReviews).length}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  // ✅ RENDER CHECKOUTS SECTION
  const renderCheckoutsSection = () => (
    <section className="checkouts-section">
      <div className="section-header">
        <h2>Current Checkouts</h2>
        <p>Books you've borrowed from the library</p>
        <button 
          className="refresh-btn"
          onClick={fetchCheckouts}
          style={{ marginLeft: 'auto' }}
        >
          🔄 Refresh
        </button>
      </div>

      {loadingCheckouts ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading your checkouts...</p>
        </div>
      ) : checkouts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📖</div>
          <p>You don't have any books checked out currently.</p>
          <p className="empty-state-subtext">Browse our collection and borrow your first book!</p>
          <button 
            className="browse-btn"
            onClick={() => setActiveSection('books')}
          >
            Browse Books to Borrow
          </button>
        </div>
      ) : (
        <div className="checkouts-grid">
          {checkouts.map(checkout => {
            const progress = readingProgress[checkout.book?._id];
            const review = bookReviews[checkout.book?._id];
            
            return (
              <div key={checkout._id} className="checkout-card">
                <div className="checkout-book-info">
                  <img 
                    src={checkout.book?.imageUrl || '/placeholder.png'} 
                    alt={checkout.book?.title}
                    className="checkout-book-cover"
                    onError={(e) => {
                      e.target.src = '/placeholder.png';
                    }}
                  />
                  <div className="checkout-book-details">
                    <h4>{checkout.book?.title || 'Unknown Book'}</h4>
                    <p className="checkout-book-author">by {checkout.book?.author || 'Unknown Author'}</p>
                    <p className="checkout-book-category">{checkout.book?.category || 'General'}</p>
                    <p className="checkout-book-price">₹{checkout.book?.price || 0}</p>
                  </div>
                </div>
                
                <div className="checkout-status-info">
                  <div className="status-indicator">
                    <span className={`status-badge ${checkout.status?.toLowerCase()}`}>
                      {checkout.status || 'Unknown'}
                    </span>
                  </div>
                  <div className="checkout-dates">
                    <p>
                      <span className="date-label">Checked Out:</span>
                      <span className="date-value">{new Date(checkout.checkoutDate).toLocaleDateString()}</span>
                    </p>
                    <p>
                      <span className="date-label">Due Date:</span>
                      <span className="date-value">{new Date(checkout.dueDate).toLocaleDateString()}</span>
                    </p>
                    {checkout.returnDate && (
                      <p>
                        <span className="date-label">Returned:</span>
                        <span className="date-value">{new Date(checkout.returnDate).toLocaleDateString()}</span>
                      </p>
                    )}
                    {checkout.renewals > 0 && (
                      <p>
                        <span className="date-label">Renewals:</span>
                        <span className="date-value">{checkout.renewals}</span>
                      </p>
                    )}
                    {checkout.fineAmount > 0 && (
                      <p>
                        <span className="date-label">Fine:</span>
                        <span className="date-value fine-amount">₹{checkout.fineAmount}</span>
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Progress & Review Section */}
                <div className="checkout-progress-review">
                  {progress ? (
                    <div className="progress-info">
                      <span className="progress-label">Reading Progress:</span>
                      <div className="progress-bar-container-small">
                        <div 
                          className="progress-bar-fill"
                          style={{
                            width: `${progress.progress}%`,
                            backgroundColor: getProgressBarColor(progress.progress)
                          }}
                        ></div>
                      </div>
                      <span className="progress-percentage">{progress.progress}%</span>
                      <button 
                        className="update-progress-btn-small"
                        onClick={() => openProgressModal(checkout.book)}
                      >
                        Update
                      </button>
                    </div>
                  ) : (
                    <button 
                      className="start-reading-btn"
                      onClick={() => openProgressModal(checkout.book)}
                    >
                      Start Reading
                    </button>
                  )}
                  
                  {review ? (
                    <div className="review-info">
                      <div className="review-stars-small">
                        {'★'.repeat(review.rating)}
                        {'☆'.repeat(5 - review.rating)}
                      </div>
                      <button 
                        className="view-review-btn"
                        onClick={() => openReviewModal(checkout.book)}
                      >
                        View Review
                      </button>
                    </div>
                  ) : (
                    <button 
                      className="write-review-btn"
                      onClick={() => openReviewModal(checkout.book)}
                    >
                      Write Review
                    </button>
                  )}
                </div>
                
                <div className="checkout-actions">
                  {(checkout.status === 'Active' || checkout.status === 'Renewed') && (
                    <>
                      <button 
                        className="renew-btn"
                        onClick={() => renewBook(checkout._id)}
                        disabled={checkout.renewals >= 2}
                        title={checkout.renewals >= 2 ? 'Maximum renewals reached' : 'Renew for 14 more days'}
                      >
                        {checkout.renewals >= 2 ? 'Max Renewed' : 'Renew'}
                      </button>
                      <button 
                        className="return-btn"
                        onClick={() => returnBook(checkout._id)}
                      >
                        Return
                      </button>
                    </>
                  )}
                  {checkout.status === 'Returned' && (
                    <span className="already-returned">✓ Returned</span>
                  )}
                  
                  <button 
                    className="remove-checkout-btn"
                    onClick={() => removeCheckout(checkout._id)}
                    title="Permanently delete this checkout"
                  >
                    × Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );

  // ✅ RENDER READING LISTS SECTION
  const renderReadingListsSection = () => (
    <section className="reading-lists-section">
      <div className="section-header">
        <h2>Reading Lists</h2>
        <p>Organize books you want to read</p>
      </div>

      <div className="create-list-section">
        <input
          type="text"
          placeholder="Create a new reading list..."
          value={newListName}
          onChange={(e) => setNewListName(e.target.value)}
          className="list-name-input"
        />
        <button onClick={createReadingList} className="create-list-btn">
          Create List
        </button>
      </div>

      {readingLists.length === 0 ? (
        <div className="empty-state">
          <p>You haven't created any reading lists yet.</p>
          <button 
            className="browse-btn"
            onClick={() => setActiveSection('books')}
          >
            Browse Books to Add
          </button>
        </div>
      ) : (
        <div className="reading-lists-grid">
          {readingLists.map(list => (
            <div key={list._id} className="reading-list-card">
              <div className="list-header">
                <h3>{list.name}</h3>
                <div className="list-header-right">
                  <span className="list-count">{list.books?.length || 0} books</span>
                </div>
              </div>
              {list.description && (
                <p className="list-description-text">{list.description}</p>
              )}
              <div className="list-books">
                {list.books && list.books.length > 0 ? (
                  list.books.slice(0, 5).map(book => {
                    const progress = readingProgress[book._id];
                    const review = bookReviews[book._id];
                    return (
                      <div key={book._id} className="list-book-item">
                        <img 
                          src={book.imageUrl || '/placeholder.png'} 
                          alt={book.title}
                          className="list-book-cover"
                        />
                        <div className="list-book-info">
                          <span className="book-title">{book.title}</span>
                          <span className="book-author">{book.author}</span>
                          {progress && (
                            <div className="list-book-progress">
                              <div className="list-progress-bar">
                                <div 
                                  className="list-progress-fill"
                                  style={{
                                    width: `${progress.progress}%`,
                                    backgroundColor: getProgressBarColor(progress.progress)
                                  }}
                                ></div>
                              </div>
                              <span className="list-progress-percentage">{progress.progress}%</span>
                            </div>
                          )}
                          {review && (
                            <div className="list-book-review">
                              <span className="review-stars-small">
                                {'★'.repeat(review.rating)}
                                {'☆'.repeat(5 - review.rating)}
                              </span>
                            </div>
                          )}
                          <button 
                            className="remove-from-list"
                            onClick={() => removeFromReadingList(list._id, book._id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="empty-list">No books in this list</p>
                )}
              </div>
              <div className="list-actions">
                <button 
                  onClick={() => setActiveSection('books')}
                  className="add-books-btn"
                >
                  Add More Books
                </button>
                <button className="view-list-btn">View All</button>
                {(list._id !== 'want-to-read' && list._id !== 'currently-reading') && (
                  <button 
                    className="remove-list-btn"
                    onClick={() => deleteReadingList(list._id)}
                  >
                    Remove List
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );

  // ✅ RENDER WISHLIST SECTION
  const renderWishlistSection = () => (
    <section className="wishlist-section">
      <div className="section-header">
        <h2>My Wishlist</h2>
        <p>Books you want to read or buy later</p>
      </div>

      {wishlist.length === 0 ? (
        <div className="empty-state">
          <p>Your wishlist is empty. Start adding books you love!</p>
          <button 
            className="browse-btn"
            onClick={() => setActiveSection('books')}
          >
            Browse Books
          </button>
        </div>
      ) : (
        <div className="wishlist-grid">
          {wishlist.map(book => {
            const progress = readingProgress[book._id];
            const review = bookReviews[book._id];
            
            return (
              <div key={book._id} className="wishlist-card">
                <div className="wishlist-card-image">
                  <img 
                    src={book.imageUrl || '/placeholder.png'} 
                    alt={book.title}
                    className="wishlist-book-cover"
                  />
                </div>
                <div className="wishlist-card-content">
                  <h4 className="wishlist-book-title">{book.title}</h4>
                  <p className="wishlist-book-author">by {book.author}</p>
                  <div className="wishlist-book-category">{book.category}</div>
                  <div className="wishlist-book-price">₹{book.price ? book.price.toFixed(2) : '0.00'}</div>
                  
                  {progress && (
                    <div className="wishlist-progress">
                      <div className="wishlist-progress-bar">
                        <div 
                          className="wishlist-progress-fill"
                          style={{
                            width: `${progress.progress}%`,
                            backgroundColor: getProgressBarColor(progress.progress)
                          }}
                        ></div>
                      </div>
                      <span className="wishlist-progress-percentage">{progress.progress}%</span>
                    </div>
                  )}
                  
                  {review && (
                    <div className="wishlist-review">
                      <div className="review-stars-small">
                        {'★'.repeat(review.rating)}
                        {'☆'.repeat(5 - review.rating)}
                      </div>
                      <p className="review-title-small">"{review.title}"</p>
                    </div>
                  )}
                  
                  <div className="wishlist-card-actions">
                    <button 
                      className="add-to-cart-btn"
                      onClick={() => addToCart(book)}
                    >
                      Add to Cart
                    </button>
                    <button 
                      className="borrow-btn"
                      onClick={() => checkoutBook(book)}
                    >
                      Borrow
                    </button>
                    <button 
                      className="add-to-reading-list-btn"
                      onClick={() => showAddToReadingListModal(book)}
                    >
                      Add to List
                    </button>
                    {progress ? (
                      <button 
                        className="update-progress-btn"
                        onClick={() => openProgressModal(book)}
                      >
                        Update Progress
                      </button>
                    ) : (
                      <button 
                        className="start-reading-btn"
                        onClick={() => openProgressModal(book)}
                      >
                        Start Reading
                      </button>
                    )}
                    {review ? (
                      <button 
                        className="edit-review-btn"
                        onClick={() => openReviewModal(book)}
                      >
                        Edit Review
                      </button>
                    ) : (
                      <button 
                        className="write-review-btn"
                        onClick={() => openReviewModal(book)}
                      >
                        Write Review
                      </button>
                    )}
                    <button 
                      className="remove-wishlist-btn"
                      onClick={() => removeFromWishlist(book._id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );

  // ✅ RENDER LIBRARY SECTION
  const renderLibrarySection = () => (
    <section className="library-section">
      <div className="section-header">
        <h2>Library Information</h2>
        <p>Learn more about our library</p>
      </div>

      <div className="library-info-card">
        <div className="library-header">
          <div className="library-avatar">🏛️</div>
          <div className="library-title">
            <h3>{libraryInfo.name}</h3>
            <p className="library-location">{libraryInfo.location}</p>
          </div>
        </div>
        
        <div className="library-details">
          <div className="detail-row">
            <span className="detail-label">Library Hours</span>
            <span className="detail-value">{libraryInfo.hours}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Contact Email</span>
            <span className="detail-value">{libraryInfo.contact}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Total Books</span>
            <span className="detail-value">{libraryInfo.totalBooks.toLocaleString()}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Active Members</span>
            <span className="detail-value">{libraryInfo.activeMembers.toLocaleString()}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Established</span>
            <span className="detail-value">{libraryInfo.established}</span>
          </div>
        </div>
      </div>
    </section>
  );

  // ✅ RENDER PURCHASE HISTORY SECTION - SPECIFIC TO USER
  const renderPurchaseHistorySection = () => {
    // Calculate total spent with 2 decimal places
    const totalSpent = purchaseHistory.reduce((total, order) => total + (order.totalAmount || 0), 0);
    const completedOrders = purchaseHistory.filter(order => 
      ['Delivered', 'Completed', 'Success'].includes(order.status)
    ).length;
    
    return (
      <section className="purchase-history-section">
        <div className="section-header">
          <div className="section-header-left">
            <h2>My Purchase History</h2>
            <p>Your successful book purchases</p>
          </div>
          <div className="section-header-right">
            <button 
              className="refresh-btn"
              onClick={refreshPurchaseHistory}
              title="Refresh purchase history from database"
            >
              🔄 Refresh
            </button>
            <button 
              className="clear-btn"
              onClick={clearPurchaseHistory}
              title="Clear all purchase history from database"
            >
              🗑️ Clear My History
            </button>
          </div>
        </div>

        {loadingPurchaseHistory ? (
          <div className="loading-container">
            <div className="spinner"></div>
            <p>Loading your purchase history from database...</p>
          </div>
        ) : purchaseHistory.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <p>You haven't made any purchases yet.</p>
            <p className="empty-state-subtext">Start shopping to see your purchase history here.</p>
            <div style={{marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center'}}>
              <button 
                className="browse-btn"
                onClick={() => setActiveSection('books')}
              >
                Browse Books to Buy
              </button>
            </div>
          </div>
        ) : (
          <div className="purchase-history-container">
            <div className="purchase-stats">
              <div className="stat-card">
                <span className="stat-number">{purchaseHistory.length}</span>
                <span className="stat-label">My Orders</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">₹{formatCurrency(totalSpent)}</span>
                <span className="stat-label">Total Spent</span>
              </div>
              <div className="stat-card">
                <span className="stat-number">{completedOrders}</span>
                <span className="stat-label">Completed</span>
              </div>
            </div>
            
            <div className="purchase-history-grid">
              {purchaseHistory.map(order => (
                <div key={order._id} className="order-card">
                  <div className="order-header">
                    <div className="order-info">
                      <span className="order-id">Order #{order.orderNumber || order._id?.slice(-8)}</span>
                      <span className="order-date">
                        {new Date(order.createdAt).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                      <span className={`order-status ${(order.status || '').toLowerCase()}`}>
                        {order.status || 'Pending'}
                      </span>
                    </div>
                    <div className="order-total">
                      <span>Total: ₹{formatCurrency(order.totalAmount)}</span>
                    </div>
                  </div>
                  
                  <div className="order-items">
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item, index) => {
                        // Get the best available image URL
                        const getItemImageUrl = () => {
                          // Try multiple possible image fields
                          if (item.book?.imageUrl) return item.book.imageUrl;
                          if (item.book?.image) return item.book.image;
                          if (item.book?.coverImage) return item.book.coverImage;
                          if (item.imageUrl) return item.imageUrl;
                          if (item.image) return item.image;
                          
                          // Try to construct from filename if available
                          if (item.book?.imageFilename) {
                            return `http://localhost:5000/uploads/${item.book.imageFilename}`;
                          }
                          
                          // Default placeholder
                          return '/placeholder.png';
                        };
                        
                        // Get book color for placeholder
                        const bookColor = getBookColor(item.book?.title || 'Unknown Book');
                        const bookInitials = getBookInitials(item.book?.title || 'Unknown Book');
                        const authorInitials = getAuthorInitials(item.book?.author || 'Unknown Author');
                        
                        return (
                          <div key={index} className="order-item">
                            <div className="order-item-image">
                              <img 
                                src={getItemImageUrl()} 
                                alt={item.book?.title || 'Unknown Book'}
                                onError={(e) => {
                                  // If image fails to load, replace with colored placeholder
                                  e.target.onerror = null; // Prevent infinite loop
                                  e.target.style.display = 'none';
                                  
                                  // Create and append placeholder div
                                  const parent = e.target.parentElement;
                                  const placeholder = document.createElement('div');
                                  placeholder.className = 'order-item-placeholder';
                                  placeholder.style.background = `linear-gradient(135deg, ${bookColor} 0%, ${bookColor}80 100%)`;
                                  placeholder.innerHTML = `
                                    <div class="placeholder-icon">📚</div>
                                    <div class="placeholder-title">${bookInitials}</div>
                                    <div class="placeholder-author">${authorInitials}</div>
                                  `;
                                  parent.appendChild(placeholder);
                                }}
                              />
                            </div>
                            <div className="order-item-details">
                              <h5>{item.book?.title || 'Unknown Book'}</h5>
                              <p className="order-item-author">by {item.book?.author || 'Unknown Author'}</p>
                              <div className="order-item-meta">
                                <span className="order-item-price">₹{formatCurrency(item.price)} × {item.quantity || 1}</span>
                                <span className="order-item-subtotal">₹{formatCurrency((item.price || 0) * (item.quantity || 1))}</span>
                              </div>
                              {item.book?.category && (
                                <span className="order-item-category">{item.book.category}</span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="no-items">No items in this order</div>
                    )}
                  </div>
                  
                  <div className="order-footer">
                    <button 
                      className="view-order-btn"
                      onClick={() => viewOrderDetails(order)}
                    >
                      View Order Details
                    </button>
                    <button 
                      className="reorder-btn"
                      onClick={() => reorderItems(order)}
                    >
                      Reorder
                    </button>
                    <button 
                      className="track-order-btn"
                      onClick={() => handleTrackOrder(order)}
                    >
                      Track Order
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    );
  };

  // ✅ RENDER READING PROGRESS SECTION
  const renderReadingProgressSection = () => {
    const stats = getReadingStats();
    const currentlyReading = Object.values(readingProgress).filter(p => p.progress > 0 && p.progress < 100);
    const completedBooks = Object.values(readingProgress).filter(p => p.progress === 100);
    
    return (
      <section className="reading-progress-section">
        <div className="section-header">
          <h2>📖 My Reading Journey</h2>
          <p>Track your reading progress and achievements</p>
        </div>
        
        {/* Goals Overview */}
        <div className="goals-overview">
          <div className="goal-card">
            <h3>Yearly Goal</h3>
            <div className="goal-progress">
              <div className="goal-progress-bar">
                <div 
                  className="goal-progress-fill"
                  style={{
                    width: `${Math.min(100, (readingGoals.currentYearProgress / readingGoals.yearlyGoal) * 100)}%`
                  }}
                ></div>
              </div>
              <div className="goal-numbers">
                <span className="current-count">{readingGoals.currentYearProgress}</span>
                <span className="goal-count">/{readingGoals.yearlyGoal} books</span>
              </div>
              <span className="goal-percentage">
                {Math.round((readingGoals.currentYearProgress / readingGoals.yearlyGoal) * 100)}%
              </span>
            </div>
            <div className="goal-actions">
              <button 
                className="goal-edit-btn"
                onClick={() => {
                  const newGoal = prompt('Set new yearly goal (number of books):', readingGoals.yearlyGoal);
                  if (newGoal && !isNaN(newGoal) && parseInt(newGoal) > 0) {
                    updateReadingGoals('yearlyGoal', parseInt(newGoal));
                  }
                }}
              >
                Edit Goal
              </button>
            </div>
          </div>
          
          <div className="goal-card">
            <h3>Monthly Goal</h3>
            <div className="goal-progress">
              <div className="goal-progress-bar">
                <div 
                  className="goal-progress-fill"
                  style={{
                    width: `${Math.min(100, (readingGoals.currentMonthProgress / readingGoals.monthlyGoal) * 100)}%`
                  }}
                ></div>
              </div>
              <div className="goal-numbers">
                <span className="current-count">{readingGoals.currentMonthProgress}</span>
                <span className="goal-count">/{readingGoals.monthlyGoal} books</span>
              </div>
              <span className="goal-percentage">
                {Math.round((readingGoals.currentMonthProgress / readingGoals.monthlyGoal) * 100)}%
              </span>
            </div>
            <div className="goal-actions">
              <button 
                className="goal-edit-btn"
                onClick={() => {
                  const newGoal = prompt('Set new monthly goal (number of books):', readingGoals.monthlyGoal);
                  if (newGoal && !isNaN(newGoal) && parseInt(newGoal) > 0) {
                    updateReadingGoals('monthlyGoal', parseInt(newGoal));
                  }
                }}
              >
                Edit Goal
              </button>
            </div>
          </div>
          
          <div className="stats-card">
            <h3>Reading Stats</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-icon">📚</span>
                <div className="stat-content">
                  <span className="stat-value">{stats.activeBooks}</span>
                  <span className="stat-label">Active Books</span>
                </div>
              </div>
              <div className="stat-item">
                <span className="stat-icon">✅</span>
                <div className="stat-content">
                  <span className="stat-value">{stats.completedBooks}</span>
                  <span className="stat-label">Completed</span>
                </div>
              </div>
              <div className="stat-item">
                <span className="stat-icon">📄</span>
                <div className="stat-content">
                  <span className="stat-value">{stats.totalPagesRead}</span>
                  <span className="stat-label">Pages Read</span>
                </div>
              </div>
              <div className="stat-item">
                <span className="stat-icon">🔥</span>
                <div className="stat-content">
                  <span className="stat-value">{stats.readingStreak}</span>
                  <span className="stat-label">Day Streak</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Currently Reading */}
        <div className="currently-reading-section">
          <div className="section-subheader">
            <h3>📖 Currently Reading</h3>
            <button 
              className="add-book-btn"
              onClick={() => setActiveSection('books')}
            >
              + Add Book
            </button>
          </div>
          
          {currentlyReading.length === 0 ? (
            <div className="empty-state">
              <p>You're not currently reading any books. Start by adding a book from your checkouts or wishlist!</p>
              <button 
                className="browse-btn"
                onClick={() => setActiveSection('books')}
              >
                Browse Books
              </button>
            </div>
          ) : (
            <div className="currently-reading-grid">
              {currentlyReading.map((progress, index) => {
                const book = books.find(b => b._id === progress.bookId) || 
                           checkouts.find(c => c.book._id === progress.bookId)?.book;
                const review = bookReviews[progress.bookId];
                
                return (
                  <div key={index} className="reading-progress-card">
                    <div className="progress-book-card">
                      <img 
                        src={progress.bookImage || '/placeholder.png'} 
                        alt={progress.bookTitle}
                        className="progress-book-cover"
                      />
                      <div className="progress-book-info">
                        <h4>{progress.bookTitle}</h4>
                        <p className="progress-book-author">{progress.bookAuthor}</p>
                        <div className="progress-indicator">
                          <div className="progress-bar">
                            <div 
                              className="progress-bar-fill"
                              style={{
                                width: `${progress.progress}%`,
                                backgroundColor: getProgressBarColor(progress.progress)
                              }}
                            ></div>
                          </div>
                          <div className="progress-details">
                            <span className="progress-percentage">{progress.progress}%</span>
                            {progress.currentPage && (
                              <span className="page-details">
                                Page {progress.currentPage} of {progress.totalPages}
                              </span>
                            )}
                          </div>
                        </div>
                        {review && (
                          <div className="review-indicator">
                            <div className="review-stars-small">
                              {'★'.repeat(review.rating)}
                              {'☆'.repeat(5 - review.rating)}
                            </div>
                            <button 
                              className="view-review-btn"
                              onClick={() => {
                                const bookToReview = books.find(b => b._id === progress.bookId);
                                if (bookToReview) openReviewModal(bookToReview);
                              }}
                            >
                              View Review
                            </button>
                          </div>
                        )}
                        <div className="progress-actions">
                          <button 
                            className="update-progress-btn"
                            onClick={() => {
                              const bookToUpdate = books.find(b => b._id === progress.bookId) || 
                                                 checkouts.find(c => c.book._id === progress.bookId)?.book;
                              if (bookToUpdate) {
                                openProgressModal(bookToUpdate);
                              }
                            }}
                          >
                            Update Progress
                          </button>
                          <button 
                            className="mark-complete-btn"
                            onClick={() => updateReadingProgress(progress.bookId, 100)}
                          >
                            Mark Complete
                          </button>
                          {!review && (
                            <button 
                              className="write-review-btn"
                              onClick={() => {
                                const bookToReview = books.find(b => b._id === progress.bookId);
                                if (bookToReview) openReviewModal(bookToReview);
                              }}
                            >
                              Write Review
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Recently Completed */}
        {completedBooks.length > 0 && (
          <div className="completed-books-section">
            <div className="section-subheader">
              <h3>✅ Recently Completed</h3>
            </div>
            <div className="completed-books-grid">
              {completedBooks.slice(0, 6).map((progress, index) => {
                const review = bookReviews[progress.bookId];
                return (
                  <div key={index} className="completed-book-card">
                    <img 
                      src={progress.bookImage || '/placeholder.png'} 
                      alt={progress.bookTitle}
                      className="completed-book-cover"
                    />
                    <div className="completed-book-info">
                      <h5>{progress.bookTitle}</h5>
                      <p className="completed-book-author">{progress.bookAuthor}</p>
                      {review && (
                        <div className="completed-review">
                          <div className="review-stars-small">
                            {'★'.repeat(review.rating)}
                            {'☆'.repeat(5 - review.rating)}
                          </div>
                        </div>
                      )}
                      <p className="completed-date">
                        Completed on {new Date(progress.updatedAt).toLocaleDateString()}
                      </p>
                      <button 
                        className="re-read-btn"
                        onClick={() => updateReadingProgress(progress.bookId, 0)}
                      >
                        Read Again
                      </button>
                      {!review && (
                        <button 
                          className="write-review-btn"
                          onClick={() => {
                            const book = books.find(b => b._id === progress.bookId);
                            if (book) openReviewModal(book);
                          }}
                        >
                          Write Review
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        
        {/* Reading Suggestions */}
        <div className="reading-suggestions">
          <div className="section-subheader">
            <h3>💡 Reading Suggestions</h3>
          </div>
          <div className="suggestions-list">
            <div className="suggestion-card">
              <span className="suggestion-icon">📚</span>
              <div className="suggestion-content">
                <h4>Start a new book</h4>
                <p>Browse books in your favorite genres</p>
                <button 
                  className="suggestion-btn"
                  onClick={() => setActiveSection('books')}
                >
                  Browse Now
                </button>
              </div>
            </div>
            <div className="suggestion-card">
              <span className="suggestion-icon">📊</span>
              <div className="suggestion-content">
                <h4>View Analytics</h4>
                <p>See your reading patterns and habits</p>
                <button 
                  className="suggestion-btn"
                  onClick={() => setActiveSection('analytics')}
                >
                  View Analytics
                </button>
              </div>
            </div>
            <div className="suggestion-card">
              <span className="suggestion-icon">⭐</span>
              <div className="suggestion-content">
                <h4>Write Reviews</h4>
                <p>Share your thoughts on books you've read</p>
                <button 
                  className="suggestion-btn"
                  onClick={() => {
                    const completedBooks = Object.values(readingProgress).filter(p => p.progress === 100);
                    if (completedBooks.length > 0) {
                      const randomBook = books.find(b => b._id === completedBooks[0].bookId);
                      if (randomBook) openReviewModal(randomBook);
                    } else {
                      alert('Complete a book first to write a review!');
                    }
                  }}
                >
                  Write a Review
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  };

  // ✅ RENDER SIDEBAR WISHLIST PREVIEW
  const renderSidebarWishlist = () => (
    <div className="sidebar-wishlist">
      <h3>Wishlist</h3>
      <div className="wishlist-count">
        <span className="wishlist-icon">❤️</span>
        <span className="wishlist-count-number">{wishlist.length} books</span>
      </div>
      <div className="sidebar-wishlist-books">
        {wishlist.length > 0 ? (
          wishlist.slice(0, 3).map(book => (
            <div key={book._id} className="sidebar-wishlist-book">
              <img 
                src={book.imageUrl || '/placeholder.png'} 
                alt={book.title}
                className="sidebar-wishlist-cover"
              />
              <div className="sidebar-wishlist-info">
                <span className="sidebar-wishlist-title">{book.title}</span>
                <span className="sidebar-wishlist-author">{book.author}</span>
                <button 
                  className="sidebar-remove-wishlist"
                  onClick={() => removeFromWishlist(book._id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="no-wishlist-message">No books in wishlist</p>
        )}
        {wishlist.length > 3 && (
          <button 
            className="view-all-wishlist"
            onClick={() => setActiveSection('wishlist')}
          >
            View all {wishlist.length} books
          </button>
        )}
      </div>
    </div>
  );

  // ✅ RENDER SIDEBAR READING PROGRESS PREVIEW
  const renderSidebarProgressPreview = () => {
    const stats = getReadingStats();
    
    return (
      <div className="sidebar-progress-preview">
        <h3>Reading Progress</h3>
        <div className="progress-preview-content">
          <div className="progress-preview-stats">
            <div className="progress-preview-stat">
              <span className="progress-stat-icon">📚</span>
              <span className="progress-stat-text">{stats.activeBooks} Active</span>
            </div>
            <div className="progress-preview-stat">
              <span className="progress-stat-icon">✅</span>
              <span className="progress-stat-text">{stats.completedBooks} Done</span>
            </div>
          </div>
          <div className="goal-preview">
            <div className="goal-preview-bar">
              <div 
                className="goal-preview-fill"
                style={{
                  width: `${Math.min(100, (readingGoals.currentYearProgress / readingGoals.yearlyGoal) * 100)}%`
                }}
              ></div>
            </div>
            <div className="goal-preview-text">
              <span>{readingGoals.currentYearProgress}/{readingGoals.yearlyGoal} books</span>
              <span className="goal-preview-percentage">
                {Math.round((readingGoals.currentYearProgress / readingGoals.yearlyGoal) * 100)}%
              </span>
            </div>
          </div>
          <button 
            className="sidebar-view-progress-btn"
            onClick={() => setActiveSection('readingProgress')}
          >
            View Full Progress →
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="user-dashboard">
      {/* Render Edit Profile Modal */}
      {renderEditProfileModal()}
      
      {/* Render Reading List Modal */}
      {renderReadingListModal()}
      
      {/* Render Progress Modal */}
      {renderProgressModal()}
      
      {/* Render Review Modal */}
      {renderReviewModal()}
      
      {/* Render Quick Preview Modal */}
      {renderQuickPreviewModal()}
      
      <div className="dashboard-container">
        {/* Left Sidebar Navigation */}
        <aside className="sidebar">
          <div className="user-info-card compact">
            <div className="user-avatar small">
              {userProfile.name.charAt(0).toUpperCase()}
            </div>
            <h3 className="compact-name">{userProfile.name}</h3>
            <p className="user-email compact-email">{userProfile.email}</p>
            
            <div className="user-stats compact-stats">
              <div className="user-stat compact-stat">
                <span className="stat-icon">📚</span>
                <span className="stat-text">{checkouts.filter(c => c.status === 'Active' || c.status === 'Renewed').length} Active</span>
              </div>
              <div className="user-stat compact-stat">
                <span className="stat-icon">❤️</span>
                <span className="stat-text">{wishlist.length} Wishlist</span>
              </div>
              <div className="user-stat compact-stat">
                <span className="stat-icon">⭐</span>
                <span className="stat-text">{Object.keys(bookReviews).length} Reviews</span>
              </div>
            </div>
          </div>

          <nav className="sidebar-nav">
            <button 
              className={`sidebar-nav-item ${activeSection === 'books' ? 'active' : ''}`}
              onClick={() => setActiveSection('books')}
            >
              <span className="nav-icon">📚</span>
              Browse Books
            </button>
            <button 
              className={`sidebar-nav-item ${activeSection === 'account' ? 'active' : ''}`}
              onClick={() => setActiveSection('account')}
            >
              <span className="nav-icon">👤</span>
              My Account
            </button>
            <button 
              className={`sidebar-nav-item ${activeSection === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveSection('analytics')}
            >
              <span className="nav-icon">📊</span>
              Analytics
            </button>
            <button 
              className={`sidebar-nav-item ${activeSection === 'readingProgress' ? 'active' : ''}`}
              onClick={() => setActiveSection('readingProgress')}
            >
              <span className="nav-icon">📖</span>
              Reading Progress
              {Object.values(readingProgress).filter(p => p.progress > 0 && p.progress < 100).length > 0 && (
                <span className="nav-badge">
                  {Object.values(readingProgress).filter(p => p.progress > 0 && p.progress < 100).length}
                </span>
              )}
            </button>
            <button 
              className={`sidebar-nav-item ${activeSection === 'checkouts' ? 'active' : ''}`}
              onClick={() => setActiveSection('checkouts')}
            >
              <span className="nav-icon">📖</span>
              Current Checkouts
              {checkouts.filter(c => c.status === 'Active' || c.status === 'Renewed').length > 0 && (
                <span className="nav-badge">{checkouts.filter(c => c.status === 'Active' || c.status === 'Renewed').length}</span>
              )}
            </button>
            <button 
              className={`sidebar-nav-item ${activeSection === 'lists' ? 'active' : ''}`}
              onClick={() => setActiveSection('lists')}
            >
              <span className="nav-icon">📋</span>
              Reading Lists
              {readingLists.length > 0 && (
                <span className="nav-badge">{readingLists.reduce((total, list) => total + (list.books?.length || 0), 0)}</span>
              )}
            </button>
            <button 
              className={`sidebar-nav-item ${activeSection === 'wishlist' ? 'active' : ''}`}
              onClick={() => setActiveSection('wishlist')}
            >
              <span className="nav-icon">❤️</span>
              My Wishlist
              {wishlist.length > 0 && (
                <span className="nav-badge">{wishlist.length}</span>
              )}
            </button>
            <button 
              className={`sidebar-nav-item ${activeSection === 'purchaseHistory' ? 'active' : ''}`}
              onClick={() => setActiveSection('purchaseHistory')}
            >
              <span className="nav-icon">📦</span>
              My Purchase History
              {purchaseHistory.length > 0 && (
                <span className="nav-badge">{purchaseHistory.length}</span>
              )}
            </button>
            <button 
              className={`sidebar-nav-item ${activeSection === 'library' ? 'active' : ''}`}
              onClick={() => setActiveSection('library')}
            >
              <span className="nav-icon">🏛️</span>
              Library Info
            </button>
          </nav>

          {/* Reading Progress Preview in Sidebar */}
          {renderSidebarProgressPreview()}

          {/* Wishlist Preview in Sidebar */}
          {renderSidebarWishlist()}

          {/* Cart Summary */}
          <div className="cart-summary">
            <h3>Your Cart</h3>
            <div className="cart-items-preview">
              {cart.length === 0 ? (
                <p className="empty-cart">No items yet</p>
              ) : (
                cart.slice(0, 3).map(item => (
                  <div key={item.book._id} className="cart-preview-item">
                    <span className="cart-item-title">{item.book.title}</span>
                    <span className="cart-item-qty">x{item.qty}</span>
                  </div>
                ))
              )}
            </div>
            {cart.length > 0 && (
              <>
                <div className="cart-total">
                  <span>Total:</span>
                  <span>₹{formatCurrency(getCartTotal())}</span>
                </div>
                <button className="checkout-btn" onClick={checkout}>
                  Proceed to Checkout
                </button>
              </>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          {activeSection === 'books' && renderBooksSection()}
          {activeSection === 'account' && renderAccountSection()}
          {activeSection === 'analytics' && renderAnalyticsSection()}
          {activeSection === 'readingProgress' && renderReadingProgressSection()}
          {activeSection === 'checkouts' && renderCheckoutsSection()}
          {activeSection === 'lists' && renderReadingListsSection()}
          {activeSection === 'library' && renderLibrarySection()}
          {activeSection === 'wishlist' && renderWishlistSection()}
          {activeSection === 'purchaseHistory' && renderPurchaseHistorySection()}
        </main>

        {/* Right Sidebar - Detailed Cart */}
        <aside className="cart-sidebar">
          <div className="cart-header">
            <h2 className="cart-title">
              <span className="cart-icon">🛒</span>
              Your Cart
              {cart.length > 0 && (
                <span className="cart-count">{cart.length}</span>
              )}
            </h2>
            <p className="cart-subtitle">
              {cart.length === 0 ? 'No items yet' : `${cart.length} item(s) in cart`}
            </p>
          </div>

          <div className="cart-content">
            {cart.length === 0 ? (
              <div className="empty-cart">
                <div className="empty-cart-icon">🛒</div>
                <p>Your cart is empty</p>
                <p className="empty-cart-hint">Add some books to get started!</p>
              </div>
            ) : (
              <>
                <div className="cart-items">
                  {cart.map(item => {
                    const progress = readingProgress[item.book._id];
                    
                    return (
                      <div key={item.book._id} className="cart-item">
                        <div className="cart-item-image">
                          <img 
                            src={item.book.imageUrl || '/placeholder.png'} 
                            alt={item.book.title}
                            onError={(e) => {
                              e.target.src = '/placeholder.png';
                            }}
                          />
                        </div>
                        <div className="cart-item-details">
                          <h4 className="cart-item-title">{item.book.title}</h4>
                          <p className="cart-item-author">By {item.book.author}</p>
                          
                          {progress && (
                            <div className="cart-item-progress">
                              <div className="cart-progress-bar">
                                <div 
                                  className="cart-progress-fill"
                                  style={{
                                    width: `${progress.progress}%`,
                                    backgroundColor: getProgressBarColor(progress.progress)
                                  }}
                                ></div>
                              </div>
                              <span className="cart-progress-percentage">{progress.progress}%</span>
                            </div>
                          )}
                          
                          <div className="cart-item-controls">
                            <div className="quantity-controls">
                              <button 
                                className="qty-btn"
                                onClick={() => updateQuantity(item.book._id, item.qty - 1)}
                              >
                                −
                              </button>
                              <span className="qty-value">{item.qty}</span>
                              <button 
                                className="qty-btn"
                                onClick={() => updateQuantity(item.book._id, item.qty + 1)}
                              >
                                +
                              </button>
                            </div>
                            <button 
                              className="remove-btn"
                              onClick={() => removeFromCart(item.book._id)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <div className="cart-item-price">
                          <div className="item-total">₹{formatCurrency(item.book.price * item.qty)}</div>
                          <div className="item-unit">₹{formatCurrency(item.book.price)} each</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="cart-summary">
                  <div className="summary-row">
                    <span>Subtotal</span>
                    <span>₹{formatCurrency(getCartTotal())}</span>
                  </div>
                  <div className="summary-row">
                    <span>Shipping</span>
                    <span className="free-shipping">FREE</span>
                  </div>
                  <div className="summary-row total">
                    <span>Total</span>
                    <span className="total-amount">₹{formatCurrency(getCartTotal())}</span>
                  </div>
                </div>

                <button 
                  className="checkout-btn-full"
                  onClick={checkout}
                  disabled={cart.length === 0}
                >
                  <span>Proceed to Checkout</span>
                  <span className="checkout-total">₹{formatCurrency(getCartTotal())}</span>
                </button>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}