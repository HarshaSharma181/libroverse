// src/App.jsx
import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Navbar from "./components/Navbar";
import Homepage from "./pages/Homepage";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDashboard from "./pages/AdminDashboard";
import UserDashboard from "./pages/UserDashboard";
import EditProfileUser from "./pages/EditProfileUser";
import CheckoutPage from "./pages/checkoutPage";
import OrderSuccessPage from "./pages/OrderSuccessPage";
import TrackOrder from "./pages/TrackOrder"; // ✅ Import TrackOrder component

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("lv_user");
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (user) localStorage.setItem("lv_user", JSON.stringify(user));
    else localStorage.removeItem("lv_user");
  }, [user]);

  return (
    <BrowserRouter>
      <Navbar user={user} setUser={setUser} />

      <div className="page-container">
        <Routes>
          {/* Homepage at root */}
          <Route path="/" element={<Homepage />} />

          {/* Public routes */}
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route path="/register" element={<Register />} />

          {/* User Dashboard at /dashboard */}
          <Route
            path="/dashboard"
            element={user ? <UserDashboard user={user} /> : <Navigate to="/login" />}
          />

          {/* Books page (also points to UserDashboard for backward compatibility) */}
          <Route
            path="/books"
            element={user ? <UserDashboard user={user} /> : <Navigate to="/login" />}
          />

          {/* Edit Profile Page */}
          <Route
            path="/edit-profile"
            element={user ? <EditProfileUser /> : <Navigate to="/login" />}
          />

          {/* Checkout Page */}
          <Route
            path="/checkout"
            element={user ? <CheckoutPage /> : <Navigate to="/login" />}
          />

          {/* Order Success Page */}
          <Route
            path="/order-success"
            element={user ? <OrderSuccessPage /> : <Navigate to="/login" />}
          />

          {/* ✅ Track Order Page - Add this new route */}
          <Route
            path="/track-order"
            element={user ? <TrackOrder /> : <Navigate to="/login" />}
          />

          {/* ✅ Track Order by ID - For direct links/URLs */}
          <Route
            path="/track-order/:orderId"
            element={user ? <TrackOrder /> : <Navigate to="/login" />}
          />

          {/* Admin Dashboard */}
          <Route
            path="/admin"
            element={
              user?.role === "admin" ? (
                <AdminDashboard user={user} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />

          {/* Optional: Redirect /home to /dashboard if user is logged in */}
          <Route
            path="/home"
            element={user ? <Navigate to="/dashboard" /> : <Navigate to="/" />}
          />

          {/* 404 - Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;