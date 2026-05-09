import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminDashboard.css';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const AdminDashboard = () => {
  // State for books
  const [books, setBooks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredBooks, setFilteredBooks] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // State for book form
  const [bookData, setBookData] = useState({
    title: '',
    author: '',
    price: '',
    stock: '',
    imageUrl: '',
    description: '',
    category: 'Fiction'
  });
  
  // State for users
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  
  // State for orders
  const [orders, setOrders] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  
  // State for borrowings
  const [borrowings, setBorrowings] = useState([]);
  const [selectedBorrowings, setSelectedBorrowings] = useState([]);
  const [isLoadingBorrowings, setIsLoadingBorrowings] = useState(false);
  
  // General state
  const [activeSection, setActiveSection] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [currentBookId, setCurrentBookId] = useState(null);

  // Delete loading states
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [isDeletingSelected, setIsDeletingSelected] = useState(false);
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);
  const [isDeletingSelectedOrders, setIsDeletingSelectedOrders] = useState(false);
  const [isDeletingBorrowing, setIsDeletingBorrowing] = useState(false);
  const [isDeletingSelectedBorrowings, setIsDeletingSelectedBorrowings] = useState(false);

  // Update loading states
  const [isUpdatingBorrowing, setIsUpdatingBorrowing] = useState(false);
  const [updatingBorrowingId, setUpdatingBorrowingId] = useState(null);

  // Analytics states
  const [analyticsData, setAnalyticsData] = useState({
    monthlyTrends: [],
    categoryDistribution: [],
    userGrowth: [],
    revenueData: [],
    topBooks: [],
    performanceMetrics: {}
  });
  
  const [timeFilter, setTimeFilter] = useState('month'); // 'today', 'week', 'month', 'year'
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [chartType, setChartType] = useState('bar'); // For monthly trends chart

  // Categories
  const categories = [
    'All', 'Fiction', 'Non-Fiction', 'Science', 'Technology', 
    'Biography', 'History', 'Fantasy', 'Mystery', 'Romance',
    'Self-Help', 'Business', 'Children', 'Education'
  ];

  // Order status options
  const orderStatuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

  // Borrowing status options
  const borrowingStatuses = ['Active', 'Returned', 'Overdue', 'Cancelled', 'Renewed'];

  // Statistics
  const [stats, setStats] = useState({
    totalBooks: 0,
    totalUsers: 0,
    activeBorrowings: 0,
    overdueBooks: 0,
    totalOrders: 0,
    totalRevenue: 0
  });

  // Performance metrics
  const [performanceMetrics, setPerformanceMetrics] = useState({
    conversionRate: 0,
    userEngagement: 0,
    growthRate: 0,
    avgOrderValue: 0,
    returnRate: 0
  });

  // Get token from localStorage
  const getToken = () => {
    return localStorage.getItem('token');
  };

  // Time period options
  const timePeriods = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' }
  ];

  // Chart colors
  const CHART_COLORS = {
    primary: '#8884d8',
    secondary: '#82ca9d',
    tertiary: '#ffc658',
    quaternary: '#ff8042',
    success: '#4caf50',
    warning: '#ff9800',
    danger: '#f44336',
    info: '#2196f3'
  };

  const CATEGORY_COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8',
    '#82ca9d', '#ffc658', '#ff6b6b', '#4ecdc4', '#ffd166',
    '#06d6a0', '#118ab2', '#ef476f', '#073b4c'
  ];

  // Fetch data based on active section
  useEffect(() => {
    if (activeSection === 'dashboard') {
      fetchBooks();
      fetchUsers();
      fetchOrders();
      fetchBorrowings();
    } else if (activeSection === 'analytics') {
      fetchAnalyticsData();
    } else if (activeSection === 'books') {
      fetchBooks();
    } else if (activeSection === 'users') {
      fetchUsers();
    } else if (activeSection === 'orders') {
      fetchOrders();
    } else if (activeSection === 'borrowings') {
      fetchBorrowings();
    }
  }, [activeSection]);

  // Fetch analytics data when time filter changes
  useEffect(() => {
    if (activeSection === 'analytics') {
      fetchAnalyticsData();
    }
  }, [timeFilter]);

  // Update stats
  useEffect(() => {
    const activeBorrowingsCount = borrowings.filter(b => 
      b.status === 'Active' || b.status === 'active' || b.status === 'Renewed'
    ).length;
    
    const overdueBorrowingsCount = borrowings.filter(b => 
      b.status === 'Overdue' || b.status === 'overdue'
    ).length;

    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);

    setStats({
      totalBooks: books.length,
      totalUsers: users.length,
      activeBorrowings: activeBorrowingsCount,
      overdueBooks: overdueBorrowingsCount,
      totalOrders: orders.length,
      totalRevenue: totalRevenue
    });
  }, [books, users, orders, borrowings]);

  // Filter books
  useEffect(() => {
    let filtered = books;
    
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(book => book.category === selectedCategory);
    }
    
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(book =>
        book.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        book.author.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredBooks(filtered);
  }, [searchTerm, selectedCategory, books]);

  // REAL DATA: Fetch and process analytics data from MongoDB
  const fetchAnalyticsData = async () => {
    setIsLoadingAnalytics(true);
    try {
      // Calculate category distribution from real books data
      const categoryDistribution = calculateRealCategoryDistribution();
      
      // Calculate monthly trends from real data
      const monthlyTrends = calculateRealMonthlyTrends();
      
      // Calculate user growth from real data
      const userGrowth = calculateRealUserGrowth();
      
      // Calculate revenue data from real orders
      const revenueData = calculateRealRevenueData();
      
      // Calculate top performing books from real data
      const topBooks = calculateRealTopBooks();
      
      // Calculate performance metrics from real data
      const metrics = calculateRealPerformanceMetrics();
      
      setAnalyticsData({
        monthlyTrends,
        categoryDistribution,
        userGrowth,
        revenueData,
        topBooks
      });
      
      setPerformanceMetrics(metrics);
      
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data.');
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  // REAL DATA: Calculate category distribution from actual books
  const calculateRealCategoryDistribution = () => {
    const categoryCounts = {};
    
    books.forEach(book => {
      const category = book.category || 'Uncategorized';
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });
    
    return Object.entries(categoryCounts).map(([name, value], index) => ({
      name,
      value,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
    }));
  };

  // REAL DATA: Calculate monthly trends from actual data
  const calculateRealMonthlyTrends = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Get orders by month
    const ordersByMonth = {};
    orders.forEach(order => {
      if (order.createdAt) {
        const date = new Date(order.createdAt);
        const month = date.getMonth();
        const monthName = months[month];
        
        if (!ordersByMonth[monthName]) {
          ordersByMonth[monthName] = { orders: 0, revenue: 0 };
        }
        ordersByMonth[monthName].orders += 1;
        ordersByMonth[monthName].revenue += (order.total || 0);
      }
    });
    
    // Get borrowings by month
    const borrowingsByMonth = {};
    borrowings.forEach(borrowing => {
      if (borrowing.borrowDate) {
        const date = new Date(borrowing.borrowDate);
        const month = date.getMonth();
        const monthName = months[month];
        
        if (!borrowingsByMonth[monthName]) {
          borrowingsByMonth[monthName] = 0;
        }
        borrowingsByMonth[monthName] += 1;
      }
    });
    
    // Get users by month
    const usersByMonth = {};
    users.forEach(user => {
      if (user.createdAt) {
        const date = new Date(user.createdAt);
        const month = date.getMonth();
        const monthName = months[month];
        
        if (!usersByMonth[monthName]) {
          usersByMonth[monthName] = 0;
        }
        usersByMonth[monthName] += 1;
      }
    });
    
    // Combine all data
    return months.map(month => ({
      month,
      orders: ordersByMonth[month]?.orders || 0,
      borrowings: borrowingsByMonth[month] || 0,
      revenue: ordersByMonth[month]?.revenue || 0,
      users: usersByMonth[month] || 0
    }));
  };

  // REAL DATA: Calculate user growth
  const calculateRealUserGrowth = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    
    const userGrowthByMonth = {};
    let cumulativeUsers = 0;
    
    // Sort users by creation date
    const sortedUsers = [...users].sort((a, b) => 
      new Date(a.createdAt) - new Date(b.createdAt)
    );
    
    // Calculate new users per month
    sortedUsers.forEach(user => {
      if (user.createdAt) {
        const date = new Date(user.createdAt);
        const month = date.getMonth();
        const monthName = months[month];
        
        if (!userGrowthByMonth[monthName]) {
          userGrowthByMonth[monthName] = { newUsers: 0, totalUsers: 0 };
        }
        userGrowthByMonth[monthName].newUsers += 1;
      }
    });
    
    // Calculate cumulative totals
    return months.slice(0, currentMonth + 1).map(month => {
      cumulativeUsers += userGrowthByMonth[month]?.newUsers || 0;
      return {
        month,
        newUsers: userGrowthByMonth[month]?.newUsers || 0,
        totalUsers: cumulativeUsers
      };
    });
  };

  // REAL DATA: Calculate revenue data
  const calculateRealRevenueData = () => {
    // Group orders by day for the last 30 days
    const revenueByDay = {};
    const now = new Date();
    
    // Initialize last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayKey = `Day ${i + 1}`;
      revenueByDay[dayKey] = { sales: 0, borrowings: 0 };
    }
    
    // Calculate sales from orders
    orders.forEach(order => {
      if (order.createdAt) {
        const orderDate = new Date(order.createdAt);
        const daysAgo = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24));
        
        if (daysAgo >= 0 && daysAgo < 30) {
          const dayKey = `Day ${30 - daysAgo}`;
          revenueByDay[dayKey].sales += (order.total || 0);
        }
      }
    });
    
    // Calculate borrowings (we'll use fine amounts as revenue for borrowings)
    borrowings.forEach(borrowing => {
      if (borrowing.borrowDate) {
        const borrowDate = new Date(borrowing.borrowDate);
        const daysAgo = Math.floor((now - borrowDate) / (1000 * 60 * 60 * 24));
        
        if (daysAgo >= 0 && daysAgo < 30) {
          const dayKey = `Day ${30 - daysAgo}`;
          revenueByDay[dayKey].borrowings += (borrowing.fine || 0);
        }
      }
    });
    
    return Object.entries(revenueByDay).map(([day, data]) => ({
      day,
      sales: data.sales,
      borrowings: data.borrowings,
      total: data.sales + data.borrowings
    }));
  };

  // REAL DATA: Calculate top performing books
  const calculateRealTopBooks = () => {
    // Calculate borrowings per book
    const bookBorrows = {};
    borrowings.forEach(borrowing => {
      const bookId = borrowing.book?._id || borrowing.book;
      if (bookId) {
        bookBorrows[bookId] = (bookBorrows[bookId] || 0) + 1;
      }
    });
    
    // Calculate sales per book
    const bookSales = {};
    orders.forEach(order => {
      order.items?.forEach(item => {
        const bookId = item.book?._id || item.book;
        if (bookId) {
          bookSales[bookId] = (bookSales[bookId] || 0) + (item.qty || 1);
        }
      });
    });
    
    // Find book details and combine data
    const bookData = {};
    
    books.forEach(book => {
      const borrows = bookBorrows[book._id] || 0;
      const sales = bookSales[book._id] || 0;
      const revenue = sales * (book.price || 0);
      
      if (borrows > 0 || sales > 0) {
        bookData[book._id] = {
          name: book.title,
          borrows,
          sales,
          revenue
        };
      }
    });
    
    // Convert to array and sort by revenue (descending)
    return Object.values(bookData)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  };

  // REAL DATA: Calculate performance metrics from actual data
  const calculateRealPerformanceMetrics = () => {
    const totalUsers = users.length;
    const totalOrders = orders.length;
    const totalBorrowings = borrowings.length;
    const returnedBorrowings = borrowings.filter(b => 
      b.status === 'Returned' || b.status === 'returned'
    ).length;
    
    // Total revenue from orders
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    
    // Conversion rate (orders per user)
    const conversionRate = totalUsers > 0 ? (totalOrders / totalUsers * 100) : 0;
    
    // User engagement (borrowings per user)
    const userEngagement = totalUsers > 0 ? (totalBorrowings / totalUsers) : 0;
    
    // Growth rate - compare last month vs previous month
    const growthRate = calculateMonthlyGrowthRate();
    
    // Average order value
    const avgOrderValue = totalOrders > 0 ? (totalRevenue / totalOrders) : 0;
    
    // Return rate (books returned vs total borrowings)
    const returnRate = totalBorrowings > 0 ? (returnedBorrowings / totalBorrowings * 100) : 0;
    
    return {
      conversionRate: parseFloat(conversionRate.toFixed(1)),
      userEngagement: parseFloat(userEngagement.toFixed(1)),
      growthRate: parseFloat(growthRate.toFixed(1)),
      avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
      returnRate: parseFloat(returnRate.toFixed(1))
    };
  };

  // Calculate monthly growth rate
  const calculateMonthlyGrowthRate = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Count orders for current month
    const currentMonthOrders = orders.filter(order => {
      if (!order.createdAt) return false;
      const date = new Date(order.createdAt);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).length;
    
    // Count orders for previous month
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    
    const prevMonthOrders = orders.filter(order => {
      if (!order.createdAt) return false;
      const date = new Date(order.createdAt);
      return date.getMonth() === prevMonth && date.getFullYear() === prevYear;
    }).length;
    
    // Calculate growth rate
    if (prevMonthOrders === 0) return currentMonthOrders > 0 ? 100 : 0;
    return ((currentMonthOrders - prevMonthOrders) / prevMonthOrders * 100);
  };

  // Get filtered data based on time period
  const getFilteredData = () => {
    const now = new Date();
    let startDate;
    
    switch (timeFilter) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case 'year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    }
    
    // Filter orders
    const filteredOrders = orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= startDate;
    });
    
    // Filter borrowings
    const filteredBorrowings = borrowings.filter(borrowing => {
      const borrowDate = new Date(borrowing.borrowDate);
      return borrowDate >= startDate;
    });
    
    // Filter users
    const filteredUsers = users.filter(user => {
      const userDate = new Date(user.createdAt);
      return userDate >= startDate;
    });
    
    // Filter books (by creation date if available, otherwise use all books for time period)
    const filteredBooks = books; // Note: books might not have createdAt field
    
    return {
      orders: filteredOrders,
      borrowings: filteredBorrowings,
      users: filteredUsers,
      books: filteredBooks
    };
  };

  // Fetch books
  const fetchBooks = async () => {
    if (activeSection !== 'books' && activeSection !== 'dashboard') return;
    
    setIsLoading(true);
    setError('');
    try {
      const response = await axios.get(`${API_URL}/books`);
      setBooks(response.data.books || []);
      setFilteredBooks(response.data.books || []);
    } catch (err) {
      console.error('Error fetching books:', err);
      setError('Failed to load books.');
      setBooks([]);
      setFilteredBooks([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch all users
  const fetchUsers = async () => {
    if (activeSection !== 'users' && activeSection !== 'dashboard') return;
    
    setIsLoadingUsers(true);
    setError('');
    try {
      const response = await axios.get(`${API_URL}/auth/debug/users`);
      
      if (response.data.users) {
        setUsers(response.data.users || []);
      } else {
        setUsers([]);
        setError('No users found in database.');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(`Failed to load users. ${err.response?.data?.message || 'Check if backend is running.'}`);
      setUsers([]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Fetch all orders
  const fetchOrders = async () => {
    if (activeSection !== 'orders' && activeSection !== 'dashboard') return;
    
    setIsLoadingOrders(true);
    setError('');
    try {
      const token = getToken();
      
      if (!token) {
        setError('No authentication token found. Please login again.');
        setIsLoadingOrders(false);
        return;
      }
      
      const response = await axios.get(`${API_URL}/orders`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (response.data.orders) {
        setOrders(response.data.orders || []);
      } else {
        setOrders([]);
        setError('No orders found in database.');
      }
    } catch (err) {
      console.error('❌ Error fetching orders:', err);
      
      if (err.response?.status === 401) {
        setError('Authentication failed. Please login again.');
      } else if (err.response?.status === 403) {
        setError('Access denied. Admin privileges required.');
      } else {
        setError(`Failed to load orders. ${err.response?.data?.message || 'Check if backend is running.'}`);
      }
      setOrders([]);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  // Fetch all borrowings
  const fetchBorrowings = async () => {
    if (activeSection !== 'borrowings' && activeSection !== 'dashboard') return;
    
    setIsLoadingBorrowings(true);
    setError('');
    try {
      const token = getToken();
      
      if (!token) {
        setError('No authentication token found. Please login again.');
        setIsLoadingBorrowings(false);
        return;
      }
      
      const response = await axios.get(`${API_URL}/checkouts`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      let borrowingsData = [];
      
      if (response.data.checkouts) {
        borrowingsData = response.data.checkouts;
      } else if (response.data.data) {
        borrowingsData = response.data.data;
      } else if (Array.isArray(response.data)) {
        borrowingsData = response.data;
      }
      
      const processedBorrowings = borrowingsData.map((borrowing) => {
        let bookId = borrowing.book;
        let userId = borrowing.user;
        
        if (bookId && typeof bookId === 'object') {
          bookId = bookId._id || bookId;
        }
        
        if (userId && typeof userId === 'object') {
          userId = userId._id || userId;
        }
        
        let bookDetails = { 
          _id: bookId, 
          title: 'Unknown Book' 
        };
        
        if (borrowing.book && typeof borrowing.book === 'object' && borrowing.book.title) {
          bookDetails = {
            _id: borrowing.book._id || bookId,
            title: borrowing.book.title || 'Unknown Book',
            author: borrowing.book.author || 'Unknown Author'
          };
        }
        
        let userDetails = { 
          _id: userId, 
          name: 'Unknown User', 
          email: 'N/A' 
        };
        
        if (borrowing.user && typeof borrowing.user === 'object' && borrowing.user.name) {
          userDetails = {
            _id: borrowing.user._id || userId,
            name: borrowing.user.name || 'Unknown User',
            email: borrowing.user.email || 'N/A'
          };
        }
        
        return {
          _id: borrowing._id,
          book: bookDetails,
          user: userDetails,
          borrowDate: borrowing.checkoutDate || borrowing.borrowDate || borrowing.createdAt || new Date().toISOString(),
          dueDate: borrowing.dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          returnDate: borrowing.returnDate || null,
          status: borrowing.status || 'active',
          fine: borrowing.fineAmount || borrowing.fine || 0,
          borrowNumber: borrowing.borrowNumber || borrowing._id?.substring(0, 8).toUpperCase() || `BOR-${Date.now()}`,
          renewals: borrowing.renewals || 0
        };
      });
      
      setBorrowings(processedBorrowings);
      
    } catch (err) {
      console.error('❌ Error fetching borrowings:', err);
      
      if (err.response?.status === 401) {
        setError('Authentication failed. Please login again.');
      } else if (err.response?.status === 403) {
        setError('Access denied. Admin privileges required.');
      } else {
        setError(`Failed to load borrowings. ${err.response?.data?.message || err.message}`);
      }
    } finally {
      setIsLoadingBorrowings(false);
    }
  };

  // Helper functions
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setBookData({ ...bookData, [name]: value });
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
  };

  const handleCreateBook = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!bookData.title || !bookData.author || !bookData.price || !bookData.category) {
      setError('Please fill in all required fields.');
      return;
    }

    const price = parseFloat(bookData.price);
    if (isNaN(price) || price < 0) {
      setError('Price must be a valid positive number.');
      return;
    }

    try {
      const bookToCreate = {
        title: bookData.title.trim(),
        author: bookData.author.trim(),
        price: price,
        stock: parseInt(bookData.stock) || 0,
        imageUrl: bookData.imageUrl.trim() || '',
        description: bookData.description.trim() || '',
        category: bookData.category
      };

      let response;
      
      if (editMode && currentBookId) {
        response = await axios.put(`${API_URL}/books/${currentBookId}`, bookToCreate);
      } else {
        response = await axios.post(`${API_URL}/books/add`, bookToCreate);
      }

      if (response.data.success) {
        setSuccess(editMode ? 'Book updated!' : 'Book created!');
        setBookData({
          title: '', author: '', price: '', stock: '', imageUrl: '', description: '', category: 'Fiction'
        });
        setEditMode(false);
        setCurrentBookId(null);
        setTimeout(() => fetchBooks(), 500);
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.data.message || 'Failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Server error.');
    }
  };

  const handleDeleteBook = async (bookId) => {
    if (!window.confirm('Delete this book?')) return;
    
    setError('');
    setSuccess('');
    try {
      const response = await axios.delete(`${API_URL}/books/${bookId}`);
      if (response.data.success) {
        setSuccess('Book deleted!');
        fetchBooks();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Server error.');
    }
  };

  const handleEditClick = (book) => {
    setBookData({
      title: book.title || '',
      author: book.author || '',
      price: book.price || '',
      stock: book.stock || '',
      imageUrl: book.imageUrl || '',
      description: book.description || '',
      category: book.category || 'Fiction'
    });
    setEditMode(true);
    setCurrentBookId(book._id);
    document.getElementById('create-book-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setBookData({
      title: '', author: '', price: '', stock: '', imageUrl: '', description: '', category: 'Fiction'
    });
    setEditMode(false);
    setCurrentBookId(null);
  };

  // User functions
  const handleUserSelect = (userId) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(selectedUsers.filter(id => id !== userId));
    } else {
      setSelectedUsers([...selectedUsers, userId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length && users.length > 0) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(user => user._id));
    }
  };

  // Delete selected users
  const handleDeleteSelectedUsers = async () => {
    if (selectedUsers.length === 0) {
      setError('Select users to delete.');
      return;
    }
    
    if (!window.confirm(`Delete ${selectedUsers.length} user(s)?`)) return;
    
    setError('');
    setSuccess('');
    setIsDeletingSelected(true);
    
    try {
      const token = getToken();
      const response = await axios.post(
        `${API_URL}/auth/admin/delete-users`,
        { userIds: selectedUsers },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        setSuccess(`${response.data.deletedCount} user(s) deleted successfully!`);
        
        setUsers(prevUsers => prevUsers.filter(user => !selectedUsers.includes(user._id)));
        setSelectedUsers([]);
        
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.data.message || 'Failed to delete users.');
      }
    } catch (err) {
      console.error('Error deleting users:', err);
      setError(err.response?.data?.message || 'Failed to delete users. Check if you are logged in as admin.');
    } finally {
      setIsDeletingSelected(false);
    }
  };

  // Delete single user
  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Delete user "${userName}"?`)) return;
    
    setError('');
    setSuccess('');
    setIsDeletingUser(true);
    
    try {
      const token = getToken();
      const response = await axios.delete(
        `${API_URL}/auth/admin/users/${userId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        setSuccess(`User "${userName}" deleted successfully!`);
        
        setUsers(prevUsers => prevUsers.filter(user => user._id !== userId));
        setSelectedUsers(prev => prev.filter(id => id !== userId));
        
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.data.message || 'Failed to delete user.');
      }
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err.response?.data?.message || 'Failed to delete user. Check if you are logged in as admin.');
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Order functions
  const handleOrderSelect = (orderId) => {
    if (selectedOrders.includes(orderId)) {
      setSelectedOrders(selectedOrders.filter(id => id !== orderId));
    } else {
      setSelectedOrders([...selectedOrders, orderId]);
    }
  };

  const handleSelectAllOrders = () => {
    if (selectedOrders.length === orders.length && orders.length > 0) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map(order => order._id));
    }
  };

  // Delete selected orders
  const handleDeleteSelectedOrders = async () => {
    if (selectedOrders.length === 0) {
      setError('Select orders to delete.');
      return;
    }
    
    if (!window.confirm(`Delete ${selectedOrders.length} order(s)?`)) return;
    
    setError('');
    setSuccess('');
    setIsDeletingSelectedOrders(true);
    
    try {
      const token = getToken();
      const response = await axios.post(
        `${API_URL}/orders/delete-multiple`,
        { orderIds: selectedOrders },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        setSuccess(`${response.data.deletedCount} order(s) deleted successfully!`);
        
        setOrders(prevOrders => prevOrders.filter(order => !selectedOrders.includes(order._id)));
        setSelectedOrders([]);
        
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.data.message || 'Failed to delete orders.');
      }
    } catch (err) {
      console.error('Error deleting orders:', err);
      setError(err.response?.data?.message || 'Failed to delete orders. Check if you are logged in as admin.');
    } finally {
      setIsDeletingSelectedOrders(false);
    }
  };

  // Delete single order
  const handleDeleteOrder = async (orderId, orderNumber) => {
    if (!window.confirm(`Delete order "${orderNumber}"?`)) return;
    
    setError('');
    setSuccess('');
    setIsDeletingOrder(true);
    
    try {
      const token = getToken();
      const response = await axios.delete(
        `${API_URL}/orders/${orderId}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        setSuccess(`Order "${orderNumber}" deleted successfully!`);
        
        setOrders(prevOrders => prevOrders.filter(order => order._id !== orderId));
        setSelectedOrders(prev => prev.filter(id => id !== orderId));
        
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.data.message || 'Failed to delete order.');
      }
    } catch (err) {
      console.error('Error deleting order:', err);
      setError(err.response?.data?.message || 'Failed to delete order. Check if you are logged in as admin.');
    } finally {
      setIsDeletingOrder(false);
    }
  };

  // Update order status
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    setError('');
    setSuccess('');
    
    try {
      const token = getToken();
      const response = await axios.put(
        `${API_URL}/orders/${orderId}/status`,
        { status: newStatus.toLowerCase() },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      if (response.data.success) {
        setSuccess(`Order status updated to ${newStatus}!`);
        
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order._id === orderId ? { 
              ...order, 
              orderStatus: newStatus.toLowerCase()
            } : order
          )
        );
        
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(response.data.message || 'Failed to update order status.');
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      setError(err.response?.data?.message || 'Failed to update order status.');
    }
  };

  // Borrowing management functions
  const handleBorrowingSelect = (borrowingId) => {
    if (selectedBorrowings.includes(borrowingId)) {
      setSelectedBorrowings(selectedBorrowings.filter(id => id !== borrowingId));
    } else {
      setSelectedBorrowings([...selectedBorrowings, borrowingId]);
    }
  };

  const handleSelectAllBorrowings = () => {
    if (selectedBorrowings.length === borrowings.length && borrowings.length > 0) {
      setSelectedBorrowings([]);
    } else {
      setSelectedBorrowings(borrowings.map(borrowing => borrowing._id));
    }
  };

  // Update borrowing status
  const handleUpdateBorrowingStatus = async (borrowingId, newStatus) => {
    setError('');
    setSuccess('');
    setIsUpdatingBorrowing(true);
    setUpdatingBorrowingId(borrowingId);
    
    try {
      const token = getToken();
      const borrowingToUpdate = borrowings.find(b => b._id === borrowingId);
      
      if (!borrowingToUpdate) {
        setError('Borrowing record not found.');
        setIsUpdatingBorrowing(false);
        setUpdatingBorrowingId(null);
        return;
      }
      
      const previousStatus = borrowingToUpdate.status || 'active';
      let newFineAmount = borrowingToUpdate.fine || 0;
      
      if (newStatus === 'Overdue') {
        newFineAmount = 50;
      }
      
      // Update UI immediately
      const updatedBorrowing = {
        ...borrowingToUpdate,
        status: newStatus,
        fine: newFineAmount,
        returnDate: newStatus === 'Returned' ? new Date().toISOString() : borrowingToUpdate.returnDate
      };
      
      setBorrowings(prev => 
        prev.map(b => b._id === borrowingId ? updatedBorrowing : b)
      );
      
      // Try to update backend
      try {
        await axios.put(
          `${API_URL}/checkouts/${borrowingId}/status`,
          { 
            status: newStatus,
            fineAmount: newFineAmount
          },
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        setSuccess(`Status updated from "${previousStatus}" to "${newStatus}" successfully!`);
      } catch (err) {
        console.error('Error updating borrowing status:', err);
        setSuccess(`Status updated locally from "${previousStatus}" to "${newStatus}".`);
      }
      
    } catch (err) {
      console.error('Unexpected error:', err);
      setError(`Update process error: ${err.message}`);
    } finally {
      setIsUpdatingBorrowing(false);
      setUpdatingBorrowingId(null);
      
      setTimeout(() => {
        setSuccess('');
        setError('');
      }, 5000);
    }
  };

  // Delete single borrowing
  const handleDeleteBorrowing = async (borrowingId, bookTitle) => {
    if (!window.confirm(`Delete borrowing record for "${bookTitle}"?`)) return;
    
    setError('');
    setSuccess('');
    setIsDeletingBorrowing(true);
    
    try {
      const token = getToken();
      
      if (!token) {
        setError('No authentication token found. Please login again.');
        setIsDeletingBorrowing(false);
        return;
      }
      
      try {
        const response = await axios.delete(
          `${API_URL}/checkouts/${borrowingId}`,
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (response.data.success) {
          setSuccess(`Borrowing record deleted successfully!`);
          setBorrowings(prev => prev.filter(b => b._id !== borrowingId));
          setSelectedBorrowings(prev => prev.filter(id => id !== borrowingId));
        }
      } catch (err) {
        console.error('Error deleting borrowing:', err);
        setSuccess(`Borrowing record removed from UI!`);
        setBorrowings(prev => prev.filter(b => b._id !== borrowingId));
        setSelectedBorrowings(prev => prev.filter(id => id !== borrowingId));
      }
      
    } catch (err) {
      console.error('Unexpected error:', err);
      setError(`Delete process error: ${err.message}`);
    } finally {
      setIsDeletingBorrowing(false);
      setTimeout(() => {
        setSuccess('');
        setError('');
      }, 5000);
    }
  };

  // Delete selected borrowings
  const handleDeleteSelectedBorrowings = async () => {
    if (selectedBorrowings.length === 0) {
      setError('Select borrowings to delete.');
      return;
    }
    
    if (!window.confirm(`Delete ${selectedBorrowings.length} borrowing record(s)?`)) return;
    
    setError('');
    setSuccess('');
    setIsDeletingSelectedBorrowings(true);
    
    try {
      const token = getToken();
      
      if (!token) {
        setError('No authentication token found. Please login again.');
        setIsDeletingSelectedBorrowings(false);
        return;
      }
      
      try {
        const response = await axios.post(
          `${API_URL}/checkouts/delete-multiple`,
          { checkoutIds: selectedBorrowings },
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (response.data.success) {
          const deletedCount = response.data.deletedCount || selectedBorrowings.length;
          setSuccess(`${deletedCount} borrowing record(s) deleted successfully!`);
          setBorrowings(prev => prev.filter(b => !selectedBorrowings.includes(b._id)));
          setSelectedBorrowings([]);
        }
      } catch (err) {
        console.error('Error deleting borrowings:', err);
        setSuccess(`${selectedBorrowings.length} borrowing record(s) removed from UI!`);
        setBorrowings(prev => prev.filter(b => !selectedBorrowings.includes(b._id)));
        setSelectedBorrowings([]);
      }
      
    } catch (err) {
      console.error('Unexpected error:', err);
      setError(`Delete operation partially failed.`);
    } finally {
      setIsDeletingSelectedBorrowings(false);
      setTimeout(() => {
        setSuccess('');
        setError('');
      }, 5000);
    }
  };

  // Helper functions
  const isValidImageUrl = (url) => {
    if (!url) return false;
    
    if (url.startsWith('data:image')) return true;
    
    try {
      const urlObj = new URL(url);
      const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
      const hasValidExtension = validExtensions.some(ext => 
        urlObj.pathname.toLowerCase().endsWith(ext)
      );
      return hasValidExtension;
    } catch {
      return false;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB') + ' ' + date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const getStatusColor = (status) => {
    const orderStatus = status?.toLowerCase();
    switch (orderStatus) {
      case 'pending': return '#ff9800';
      case 'processing': return '#2196f3';
      case 'shipped': return '#4caf50';
      case 'delivered': return '#2e7d32';
      case 'cancelled': return '#f44336';
      default: return '#757575';
    }
  };

  const getBorrowingStatusColor = (status) => {
    const borrowingStatus = status?.toLowerCase();
    switch (borrowingStatus) {
      case 'active': return '#4caf50';
      case 'returned': return '#2196f3';
      case 'overdue': return '#f44336';
      case 'cancelled': return '#757575';
      case 'renewed': return '#9c27b0';
      default: return '#ff9800';
    }
  };

  const getOrderNumber = (order) => {
    return order.orderNumber || `ORD-${order._id?.substring(0, 8).toUpperCase() || 'N/A'}`;
  };

  const getBorrowingNumber = (borrowing) => {
    return borrowing.borrowNumber || borrowing.borrowingNumber || `BOR-${borrowing._id?.substring(0, 8).toUpperCase() || 'N/A'}`;
  };

  const getDisplayStatus = (status) => {
    if (!status) return 'Active';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const calculateDays = (dueDate) => {
    if (!dueDate) return 'N/A';
    
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays > 0) {
      return `${diffDays} days remaining`;
    } else if (diffDays < 0) {
      return `${Math.abs(diffDays)} days overdue`;
    } else {
      return 'Due today';
    }
  };

  const calculateBorrowingSummary = () => {
    const totalActive = borrowings.filter(b => 
      b.status === 'Active' || b.status === 'active' || b.status === 'Renewed'
    ).length;
    
    const totalReturned = borrowings.filter(b => 
      b.status === 'Returned' || b.status === 'returned'
    ).length;
    
    const totalOverdue = borrowings.filter(b => 
      b.status === 'Overdue' || b.status === 'overdue'
    ).length;
    
    const totalFines = borrowings.reduce((sum, b) => sum + (b.fine || 0), 0);
    
    return { totalActive, totalReturned, totalOverdue, totalFines };
  };

  // Render performance metrics cards
  const renderPerformanceMetrics = () => (
    <div className="performance-metrics">
      <h4>Performance Metrics</h4>
      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon" style={{ background: CHART_COLORS.primary }}>📈</div>
          <div className="metric-info">
            <h5>Conversion Rate</h5>
            <p className="metric-value">{performanceMetrics.conversionRate}%</p>
            <small>Orders per 100 users</small>
          </div>
        </div>
        
        <div className="metric-card">
          <div className="metric-icon" style={{ background: CHART_COLORS.secondary }}>👥</div>
          <div className="metric-info">
            <h5>User Engagement</h5>
            <p className="metric-value">{performanceMetrics.userEngagement}</p>
            <small>Avg borrowings per user</small>
          </div>
        </div>
        
        <div className="metric-card">
          <div className="metric-icon" style={{ background: CHART_COLORS.success }}>🌱</div>
          <div className="metric-info">
            <h5>Growth Rate</h5>
            <p className="metric-value">+{performanceMetrics.growthRate}%</p>
            <small>Monthly growth</small>
          </div>
        </div>
        
        <div className="metric-card">
          <div className="metric-icon" style={{ background: CHART_COLORS.tertiary }}>💰</div>
          <div className="metric-info">
            <h5>Avg Order Value</h5>
            <p className="metric-value">{formatCurrency(performanceMetrics.avgOrderValue)}</p>
            <small>Per transaction</small>
          </div>
        </div>
        
        <div className="metric-card">
          <div className="metric-icon" style={{ background: CHART_COLORS.info }}>📖</div>
          <div className="metric-info">
            <h5>Return Rate</h5>
            <p className="metric-value">{performanceMetrics.returnRate}%</p>
            <small>Books returned on time</small>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="admin-dashboard">
      <div className="dashboard-layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-header">
            <h2>Admin Panel</h2>
          </div>
          
          <nav className="nav-menu">
            <button 
              className={`nav-item ${activeSection === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveSection('dashboard')}
            >
              📊 Dashboard
            </button>
            <button 
              className={`nav-item ${activeSection === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveSection('analytics')}
            >
              📈 Analytics
            </button>
            <button 
              className={`nav-item ${activeSection === 'books' ? 'active' : ''}`}
              onClick={() => setActiveSection('books')}
            >
              📚 Book Management
            </button>
            <button 
              className={`nav-item ${activeSection === 'users' ? 'active' : ''}`}
              onClick={() => setActiveSection('users')}
            >
              👥 User Management
            </button>
            <button 
              className={`nav-item ${activeSection === 'orders' ? 'active' : ''}`}
              onClick={() => setActiveSection('orders')}
            >
              🛒 Order Management
            </button>
            <button 
              className={`nav-item ${activeSection === 'borrowings' ? 'active' : ''}`}
              onClick={() => setActiveSection('borrowings')}
            >
              📖 Borrow Management
            </button>
          </nav>

          <div className="quick-actions">
            <h3>Quick Actions</h3>
            <button 
              className="action-btn"
              onClick={() => {
                setActiveSection('books');
                setTimeout(() => {
                  document.getElementById('create-book-form')?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
              }}
            >
              ＋ Add New Book
            </button>
            <button 
              className="action-btn"
              onClick={() => {
                setActiveSection('books');
                setSearchTerm('');
                setSelectedCategory('All');
                fetchBooks();
              }}
            >
              📖 View All Books
            </button>
            <button 
              className="action-btn"
              onClick={() => {
                setActiveSection('analytics');
                fetchAnalyticsData();
              }}
            >
              📊 Refresh Analytics
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          {/* Messages */}
          {error && (
            <div className="error-message">
              <p>❌ {error}</p>
              <button className="close-btn" onClick={() => setError('')}>×</button>
            </div>
          )}
          
          {success && (
            <div className="success-message">
              <p>✅ {success}</p>
              <button className="close-btn" onClick={() => setSuccess('')}>×</button>
            </div>
          )}

          {/* DASHBOARD */}
          {activeSection === 'dashboard' && (
            <div className="dashboard-content">
              <h3>Dashboard Overview</h3>
              
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">📚</div>
                  <div className="stat-info">
                    <h4>TOTAL BOOKS</h4>
                    <p className="stat-value">{stats.totalBooks}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">👥</div>
                  <div className="stat-info">
                    <h4>TOTAL USERS</h4>
                    <p className="stat-value">{stats.totalUsers}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">📖</div>
                  <div className="stat-info">
                    <h4>ACTIVE BORROWINGS</h4>
                    <p className="stat-value">{stats.activeBorrowings}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">⚠️</div>
                  <div className="stat-info">
                    <h4>OVERDUE BOOKS</h4>
                    <p className="stat-value">{stats.overdueBooks}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">🛒</div>
                  <div className="stat-info">
                    <h4>TOTAL ORDERS</h4>
                    <p className="stat-value">{stats.totalOrders}</p>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-icon">💰</div>
                  <div className="stat-info">
                    <h4>TOTAL REVENUE</h4>
                    <p className="stat-value">{formatCurrency(stats.totalRevenue)}</p>
                  </div>
                </div>
              </div>

              <div className="quick-stats">
                <h4>Quick Stats</h4>
                <div className="stats-row">
                  <div className="stat-item">
                    <span className="stat-label">Books by Category:</span>
                    <div className="category-stats">
                      {categories.filter(c => c !== 'All').map(category => {
                        const count = books.filter(b => b.category === category).length;
                        if (count > 0) {
                          return (
                            <span key={category} className="category-stat">
                              {category}: {count}
                            </span>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Borrowings by Status:</span>
                    <div className="status-stats">
                      {borrowingStatuses.map(status => {
                        const count = borrowings.filter(b => 
                          b.status?.toLowerCase() === status.toLowerCase()
                        ).length;
                        if (count > 0) {
                          return (
                            <span key={status} className="status-stat" style={{ 
                              color: getBorrowingStatusColor(status)
                            }}>
                              {status}: {count}
                            </span>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="recent-activity">
                <h4>Recent Activity</h4>
                <div className="activity-list">
                  <div className="activity-item">
                    <span className="activity-icon">📊</span>
                    <div className="activity-details">
                      <p>Welcome to LIBROVERSE Admin Dashboard</p>
                      <span className="activity-time">Just now</span>
                    </div>
                  </div>
                  <div className="activity-item">
                    <span className="activity-icon">📚</span>
                    <div className="activity-details">
                      <p>Total books in database: {books.length}</p>
                      <span className="activity-time">Live</span>
                    </div>
                  </div>
                  <div className="activity-item">
                    <span className="activity-icon">👥</span>
                    <div className="activity-details">
                      <p>Total users in database: {users.length}</p>
                      <span className="activity-time">Live</span>
                    </div>
                  </div>
                  <div className="activity-item">
                    <span className="activity-icon">📖</span>
                    <div className="activity-details">
                      <p>Active borrowings: {stats.activeBorrowings}</p>
                      <span className="activity-time">Live</span>
                    </div>
                  </div>
                  <div className="activity-item">
                    <span className="activity-icon">🛒</span>
                    <div className="activity-details">
                      <p>Total orders in database: {orders.length}</p>
                      <span className="activity-time">Live</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ANALYTICS SECTION */}
          {activeSection === 'analytics' && (
            <div className="analytics-content">
              <div className="dashboard-header">
                <h3>Analytics Dashboard</h3>
                <div className="time-filters">
                  <span>Time Period:</span>
                  {timePeriods.map(period => (
                    <button
                      key={period.value}
                      className={`time-filter-btn ${timeFilter === period.value ? 'active' : ''}`}
                      onClick={() => setTimeFilter(period.value)}
                    >
                      {period.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {isLoadingAnalytics ? (
                <div className="loading">Loading analytics data...</div>
              ) : (
                <>
                  {/* Performance Metrics */}
                  {renderPerformanceMetrics()}

                  {/* Charts Section */}
                  <div className="charts-section">
                    <div className="chart-container">
                      <div className="chart-header">
                        <h4>Monthly Trends</h4>
                        <div className="chart-controls">
                          <select 
                            value={chartType}
                            onChange={(e) => setChartType(e.target.value)}
                            className="chart-select"
                          >
                            <option value="bar">Bar Chart</option>
                            <option value="line">Line Chart</option>
                            <option value="area">Area Chart</option>
                          </select>
                        </div>
                      </div>
                      <div className="chart-wrapper">
                        {analyticsData.monthlyTrends.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            {chartType === 'bar' ? (
                              <BarChart data={analyticsData.monthlyTrends}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="orders" fill={CHART_COLORS.primary} name="Orders" />
                                <Bar dataKey="borrowings" fill={CHART_COLORS.secondary} name="Borrowings" />
                                <Bar dataKey="revenue" fill={CHART_COLORS.tertiary} name="Revenue (₹)" />
                              </BarChart>
                            ) : chartType === 'line' ? (
                              <LineChart data={analyticsData.monthlyTrends}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line type="monotone" dataKey="orders" stroke={CHART_COLORS.primary} name="Orders" />
                                <Line type="monotone" dataKey="borrowings" stroke={CHART_COLORS.secondary} name="Borrowings" />
                                <Line type="monotone" dataKey="revenue" stroke={CHART_COLORS.tertiary} name="Revenue (₹)" />
                              </LineChart>
                            ) : (
                              <AreaChart data={analyticsData.monthlyTrends}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="month" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Area type="monotone" dataKey="orders" stackId="1" stroke={CHART_COLORS.primary} fill={CHART_COLORS.primary} name="Orders" />
                                <Area type="monotone" dataKey="borrowings" stackId="1" stroke={CHART_COLORS.secondary} fill={CHART_COLORS.secondary} name="Borrowings" />
                                <Area type="monotone" dataKey="revenue" stackId="1" stroke={CHART_COLORS.tertiary} fill={CHART_COLORS.tertiary} name="Revenue (₹)" />
                              </AreaChart>
                            )}
                          </ResponsiveContainer>
                        ) : (
                          <div className="no-data">No monthly data available</div>
                        )}
                      </div>
                    </div>

                    <div className="chart-container">
                      <div className="chart-header">
                        <h4>Category Distribution</h4>
                      </div>
                      <div className="chart-wrapper">
                        {analyticsData.categoryDistribution.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={analyticsData.categoryDistribution}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {analyticsData.categoryDistribution.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => [`${value} books`, 'Count']} />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="no-data">No category data available</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Additional Charts Row */}
                  <div className="charts-section">
                    <div className="chart-container">
                      <div className="chart-header">
                        <h4>User Growth</h4>
                      </div>
                      <div className="chart-wrapper">
                        {analyticsData.userGrowth.length > 0 ? (
                          <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={analyticsData.userGrowth}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="month" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Area type="monotone" dataKey="newUsers" stackId="1" stroke={CHART_COLORS.info} fill={CHART_COLORS.info} name="New Users" />
                              <Area type="monotone" dataKey="totalUsers" stackId="1" stroke={CHART_COLORS.success} fill={CHART_COLORS.success} name="Total Users" />
                            </AreaChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="no-data">No user growth data available</div>
                        )}
                      </div>
                    </div>

                    <div className="chart-container">
                      <div className="chart-header">
                        <h4>Top Performing Books</h4>
                      </div>
                      <div className="chart-wrapper">
                        {analyticsData.topBooks.length > 0 ? (
                          <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={analyticsData.topBooks}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} />
                              <YAxis />
                              <Tooltip formatter={(value, name) => {
                                if (name === 'revenue') return [formatCurrency(value), 'Revenue'];
                                return [value, name === 'borrows' ? 'Borrows' : 'Sales'];
                              }} />
                              <Legend />
                              <Bar dataKey="borrows" fill={CHART_COLORS.primary} name="Borrows" />
                              <Bar dataKey="sales" fill={CHART_COLORS.secondary} name="Sales" />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="no-data">No top books data available</div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* BOOK MANAGEMENT */}
          {activeSection === 'books' && (
            <div className="books-content">
              <div className="section-header">
                <h3>Book Management</h3>
              </div>
              
              <div className="create-book-form" id="create-book-form">
                <h4>{editMode ? 'Edit Book' : 'Add New Book'}</h4>
                <form onSubmit={handleCreateBook}>
                  <div className="form-row">
                    <input
                      type="text"
                      name="title"
                      value={bookData.title}
                      onChange={handleInputChange}
                      placeholder="Book Title *"
                      required
                    />
                    <input
                      type="text"
                      name="author"
                      value={bookData.author}
                      onChange={handleInputChange}
                      placeholder="Author *"
                      required
                    />
                    <input
                      type="number"
                      name="price"
                      value={bookData.price}
                      onChange={handleInputChange}
                      placeholder="Price *"
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>
                  <div className="form-row">
                    <input
                      type="text"
                      name="imageUrl"
                      value={bookData.imageUrl}
                      onChange={handleInputChange}
                      placeholder="Image URL (e.g., https://example.com/book.jpg)"
                    />
                    <input
                      type="number"
                      name="stock"
                      value={bookData.stock}
                      onChange={handleInputChange}
                      placeholder="Stock"
                      min="0"
                    />
                    <select
                      name="category"
                      value={bookData.category}
                      onChange={handleInputChange}
                      required
                    >
                      {categories.filter(c => c !== 'All').map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    name="description"
                    value={bookData.description}
                    onChange={handleInputChange}
                    placeholder="Description"
                    rows="3"
                  />
                  <div className="form-actions">
                    <button type="submit" className="submit-btn">
                      {editMode ? 'Update Book' : 'Add Book'}
                    </button>
                    {editMode && (
                      <button type="button" className="cancel-btn" onClick={handleCancelEdit}>
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div className="search-filter">
                <div className="search-box">
                  <input
                    type="text"
                    placeholder="Search books by title or author..."
                    value={searchTerm}
                    onChange={handleSearchChange}
                  />
                  <span className="search-icon">🔍</span>
                </div>
                
                <div className="category-filters">
                  {categories.map(category => (
                    <button
                      key={category}
                      className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
                      onClick={() => handleCategoryChange(category)}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div className="books-list">
                {isLoading ? (
                  <div className="loading">Loading books...</div>
                ) : filteredBooks.length === 0 ? (
                  <div className="no-results">
                    <p>No books found.</p>
                    {searchTerm && <p>Try a different search term or category.</p>}
                  </div>
                ) : (
                  <div className="books-grid">
                    {filteredBooks.map(book => (
                      <div key={book._id} className="book-card">
                        <div className="book-image">
                          {isValidImageUrl(book.imageUrl) ? (
                            <img 
                              src={book.imageUrl} 
                              alt={book.title}
                              className="book-cover"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                                e.target.parentElement.innerHTML = `
                                  <div class="book-image-placeholder">
                                    <div class="placeholder-icon">📚</div>
                                    <div class="placeholder-text">No Image</div>
                                  </div>
                                `;
                              }}
                            />
                          ) : (
                            <div className="book-image-placeholder">
                              <div className="placeholder-icon">📚</div>
                              <div className="placeholder-text">No Image</div>
                            </div>
                          )}
                        </div>
                        <div className="book-info">
                          <h4 className="book-title">{book.title}</h4>
                          <p className="book-author">by {book.author}</p>
                          <div className="book-meta">
                            <span className="book-category">{book.category}</span>
                            <span className="book-price">₹{book.price?.toFixed(2) || '0.00'}</span>
                            <span className="book-stock">Stock: {book.stock || 0}</span>
                          </div>
                          {book.description && (
                            <p className="book-description">
                              {book.description.length > 100 
                                ? `${book.description.substring(0, 100)}...` 
                                : book.description}
                            </p>
                          )}
                        </div>
                        <div className="book-actions">
                          <button className="edit-btn" onClick={() => handleEditClick(book)}>
                            Edit
                          </button>
                          <button className="delete-btn" onClick={() => handleDeleteBook(book._id)}>
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* USER MANAGEMENT */}
          {activeSection === 'users' && (
            <div className="users-content">
              <div className="section-header">
                <h3>User Management</h3>
                <div className="user-stats">
                  <span>Total Users: {users.length}</span>
                  <span>Selected: {selectedUsers.length}</span>
                  <button 
                    onClick={fetchUsers} 
                    className="refresh-btn"
                  >
                    Refresh Users
                  </button>
                </div>
              </div>

              {selectedUsers.length > 0 && (
                <div className="bulk-actions">
                  <button 
                    className="delete-btn" 
                    onClick={handleDeleteSelectedUsers}
                    disabled={isDeletingSelected}
                  >
                    {isDeletingSelected ? 'Deleting...' : `Delete Selected (${selectedUsers.length})`}
                  </button>
                  <button 
                    className="cancel-btn" 
                    onClick={() => setSelectedUsers([])}
                  >
                    Clear Selection
                  </button>
                </div>
              )}

              <div className="users-table-container">
                {isLoadingUsers ? (
                  <div className="loading">Loading users from MongoDB...</div>
                ) : users.length === 0 ? (
                  <div className="no-results">
                    <p>No users found in MongoDB database.</p>
                    <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
                      Check if your backend is running and has users.
                    </p>
                    <button 
                      onClick={fetchUsers} 
                      style={{ 
                        marginTop: '10px',
                        padding: '8px 16px', 
                        background: '#007bff', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px', 
                        cursor: 'pointer' 
                      }}
                    >
                      Try Again
                    </button>
                  </div>
                ) : (
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th style={{ width: '50px' }}>
                          <input
                            type="checkbox"
                            checked={selectedUsers.length === users.length && users.length > 0}
                            onChange={handleSelectAll}
                          />
                        </th>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Joined Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(user => (
                        <tr key={user._id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedUsers.includes(user._id)}
                              onChange={() => handleUserSelect(user._id)}
                            />
                          </td>
                          <td className="user-id">{user._id?.substring(0, 8) || 'N/A'}...</td>
                          <td className="user-name">{user.name || 'N/A'}</td>
                          <td className="user-email">{user.email || 'N/A'}</td>
                          <td>
                            <span className={`user-role ${user.role}`}>
                              {user.role || 'user'}
                            </span>
                          </td>
                          <td className="user-date">{formatDate(user.createdAt)}</td>
                          <td className="user-actions">
                            <button 
                              className="delete-btn-small"
                              onClick={() => handleDeleteUser(user._id, user.name)}
                              title="Delete User"
                              disabled={isDeletingUser}
                            >
                              {isDeletingUser ? '⏳' : '🗑️'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ORDER MANAGEMENT */}
          {activeSection === 'orders' && (
            <div className="orders-content">
              <div className="section-header">
                <h3>Order Management</h3>
                <div className="order-stats">
                  <span>Total Orders: {orders.length}</span>
                  <span>Selected: {selectedOrders.length}</span>
                  <button 
                    onClick={fetchOrders} 
                    className="refresh-btn"
                  >
                    Refresh Orders
                  </button>
                </div>
              </div>

              {selectedOrders.length > 0 && (
                <div className="bulk-actions">
                  <button 
                    className="delete-btn" 
                    onClick={handleDeleteSelectedOrders}
                    disabled={isDeletingSelectedOrders}
                  >
                    {isDeletingSelectedOrders ? 'Deleting...' : `Delete Selected (${selectedOrders.length})`}
                  </button>
                  <button 
                    className="cancel-btn" 
                    onClick={() => setSelectedOrders([])}
                  >
                    Clear Selection
                  </button>
                </div>
              )}

              <div className="orders-table-container">
                {isLoadingOrders ? (
                  <div className="loading">Loading orders from MongoDB...</div>
                ) : orders.length === 0 ? (
                  <div className="no-results">
                    <p>No orders found in MongoDB database.</p>
                    <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
                      Check if your backend is running and has orders.
                    </p>
                    <button 
                      onClick={fetchOrders} 
                      style={{ 
                        marginTop: '10px',
                        padding: '8px 16px', 
                        background: '#007bff', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px', 
                        cursor: 'pointer' 
                      }}
                    >
                      Try Again
                    </button>
                  </div>
                ) : (
                  <table className="orders-table">
                    <thead>
                      <tr>
                        <th style={{ width: '50px' }}>
                          <input
                            type="checkbox"
                            checked={selectedOrders.length === orders.length && orders.length > 0}
                            onChange={handleSelectAllOrders}
                          />
                        </th>
                        <th>Order #</th>
                        <th>Customer</th>
                        <th>Items</th>
                        <th>Total</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(order => {
                        const currentStatus = order.orderStatus || 'pending';
                        
                        return (
                          <tr key={order._id}>
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedOrders.includes(order._id)}
                                onChange={() => handleOrderSelect(order._id)}
                              />
                            </td>
                            <td className="order-id">{getOrderNumber(order)}</td>
                            <td className="order-customer">
                              <div>{order.user?.name || order.shippingInfo?.name || 'Guest'}</div>
                              <small>{order.user?.email || order.shippingInfo?.email || 'N/A'}</small>
                            </td>
                            <td className="order-items">
                              <div className="order-items-count">
                                {order.items?.length || 0} item(s)
                              </div>
                              {order.items?.slice(0, 2).map((item, index) => (
                                <div key={index} className="order-item">
                                  {item.book?.title || 'Unknown Item'} x {item.qty || 1}
                                </div>
                              ))}
                              {order.items && order.items.length > 2 && (
                                <div className="more-items">+{order.items.length - 2} more</div>
                              )}
                            </td>
                            <td className="order-total">
                              {formatCurrency(order.total || 0)}
                            </td>
                            <td className="order-status">
                              <select
                                value={getDisplayStatus(currentStatus)}
                                onChange={(e) => handleUpdateOrderStatus(order._id, e.target.value)}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  border: 'none',
                                  background: getStatusColor(currentStatus),
                                  color: 'white',
                                  fontWeight: 'bold',
                                  cursor: 'pointer',
                                  minWidth: '120px'
                                }}
                              >
                                {orderStatuses.map(status => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="order-date">
                              {formatDate(order.createdAt)}
                            </td>
                            <td className="order-actions">
                              <button 
                                className="delete-btn-small"
                                onClick={() => handleDeleteOrder(order._id, getOrderNumber(order))}
                                title="Delete Order"
                                disabled={isDeletingOrder}
                              >
                                {isDeletingOrder ? '⏳' : '🗑️'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* BORROW MANAGEMENT */}
          {activeSection === 'borrowings' && (
            <div className="borrowings-content">
              <div className="section-header">
                <h3>Borrow Management</h3>
                <div className="borrowing-stats">
                  <span>Total Borrowings: {borrowings.length}</span>
                  <span>Active: {borrowings.filter(b => 
                    b.status === 'Active' || b.status === 'active' || b.status === 'Renewed'
                  ).length}</span>
                  <span>Selected: {selectedBorrowings.length}</span>
                  <button 
                    onClick={fetchBorrowings} 
                    className="refresh-btn"
                    disabled={isLoadingBorrowings}
                  >
                    {isLoadingBorrowings ? 'Refreshing...' : 'Refresh Borrowings'}
                  </button>
                </div>
              </div>

              {selectedBorrowings.length > 0 && (
                <div className="bulk-actions">
                  <button 
                    className="delete-btn" 
                    onClick={handleDeleteSelectedBorrowings}
                    disabled={isDeletingSelectedBorrowings}
                  >
                    {isDeletingSelectedBorrowings ? 'Deleting...' : `Delete Selected (${selectedBorrowings.length})`}
                  </button>
                  <button 
                    className="cancel-btn" 
                    onClick={() => setSelectedBorrowings([])}
                  >
                    Clear Selection
                  </button>
                </div>
              )}

              <div className="borrowings-table-container">
                {isLoadingBorrowings ? (
                  <div className="loading">Loading borrowings from MongoDB...</div>
                ) : borrowings.length === 0 ? (
                  <div className="no-results">
                    <p>No borrowings found in database.</p>
                    <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
                      Check if your backend is running and has borrowing records.
                    </p>
                    <button 
                      onClick={fetchBorrowings} 
                      style={{ 
                        marginTop: '10px',
                        padding: '8px 16px', 
                        background: '#007bff', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '4px', 
                        cursor: 'pointer' 
                      }}
                    >
                      Try Again
                    </button>
                  </div>
                ) : (
                  <table className="borrowings-table">
                    <thead>
                      <tr>
                        <th style={{ width: '50px' }}>
                          <input
                            type="checkbox"
                            checked={selectedBorrowings.length === borrowings.length && borrowings.length > 0}
                            onChange={handleSelectAllBorrowings}
                            disabled={isLoadingBorrowings}
                          />
                        </th>
                        <th>Borrow #</th>
                        <th>Book</th>
                        <th>User</th>
                        <th>Borrow Date</th>
                        <th>Due Date</th>
                        <th>Status</th>
                        <th>Fine</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {borrowings.map(borrowing => {
                        const currentStatus = borrowing.status || 'active';
                        const bookTitle = borrowing.book?.title || 'Unknown Book';
                        const userName = borrowing.user?.name || 'Unknown User';
                        const userEmail = borrowing.user?.email || 'N/A';
                        const borrowNumber = getBorrowingNumber(borrowing);
                        const isUpdating = isUpdatingBorrowing && updatingBorrowingId === borrowing._id;
                        
                        return (
                          <tr key={borrowing._id}>
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedBorrowings.includes(borrowing._id)}
                                onChange={() => handleBorrowingSelect(borrowing._id)}
                                disabled={isDeletingBorrowing || isUpdating}
                              />
                            </td>
                            <td className="borrowing-id">{borrowNumber}</td>
                            <td className="borrowing-book">
                              <div className="book-title">{bookTitle}</div>
                              {borrowing.book?.author && <small>by {borrowing.book.author}</small>}
                            </td>
                            <td className="borrowing-user">
                              <div>{userName}</div>
                              <small>{userEmail}</small>
                            </td>
                            <td className="borrowing-date">
                              {formatDateTime(borrowing.borrowDate)}
                            </td>
                            <td className="borrowing-due">
                              <div>{formatDate(borrowing.dueDate)}</div>
                              <small style={{ 
                                color: currentStatus === 'overdue' ? '#f44336' : 
                                       currentStatus === 'active' || currentStatus === 'renewed' ? '#4caf50' : '#757575',
                                fontWeight: 'bold'
                              }}>
                                {calculateDays(borrowing.dueDate)}
                              </small>
                            </td>
                            <td className="borrowing-status">
                              <select
                                value={getDisplayStatus(currentStatus)}
                                onChange={(e) => handleUpdateBorrowingStatus(borrowing._id, e.target.value)}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  border: 'none',
                                  background: getBorrowingStatusColor(currentStatus),
                                  color: 'white',
                                  fontWeight: 'bold',
                                  cursor: isUpdating ? 'wait' : 'pointer',
                                  minWidth: '120px',
                                  opacity: isUpdating ? 0.7 : 1
                                }}
                                disabled={isUpdating}
                              >
                                {borrowingStatuses.map(status => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                              {isUpdating && (
                                <span style={{ marginLeft: '8px', fontSize: '12px', color: '#ff9800' }}>
                                  Updating...
                                </span>
                              )}
                            </td>
                            <td className="borrowing-fine">
                              {formatCurrency(borrowing.fine || 0)}
                            </td>
                            <td className="borrowing-actions">
                              <button 
                                className="delete-btn-small"
                                onClick={() => handleDeleteBorrowing(borrowing._id, bookTitle)}
                                title="Delete Borrowing Record"
                                disabled={isDeletingBorrowing || isUpdating}
                              >
                                {isDeletingBorrowing ? '⏳' : '🗑️'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="borrowing-summary">
                <h4>Borrowing Summary</h4>
                <div className="summary-stats">
                  <div className="summary-item">
                    <span className="summary-label">Total Active:</span>
                    <span className="summary-value" style={{ color: '#4caf50' }}>
                      {calculateBorrowingSummary().totalActive}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Total Returned:</span>
                    <span className="summary-value" style={{ color: '#2196f3' }}>
                      {calculateBorrowingSummary().totalReturned}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Total Overdue:</span>
                    <span className="summary-value" style={{ color: '#f44336' }}>
                      {calculateBorrowingSummary().totalOverdue}
                    </span>
                  </div>
                  <div className="summary-item">
                    <span className="summary-label">Total Fines:</span>
                    <span className="summary-value">
                      {formatCurrency(calculateBorrowingSummary().totalFines)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;