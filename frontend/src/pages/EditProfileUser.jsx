import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './EditProfileUser.css';

const EditProfileUser = () => {
  const navigate = useNavigate();
  const api = "http://localhost:5000";
  
  // Get the user data from localStorage (using the correct key)
  const user = JSON.parse(localStorage.getItem('lv_user') || '{}');
  
  // Check if token exists - it might be stored differently
  const token = localStorage.getItem('lv_token') || localStorage.getItem('token');

  const [profile, setProfile] = useState({
    name: user.name || '',
    email: user.email || '',
    readingLevel: 'Intermediate',
    favoriteGenres: [],
    joinDate: user.joinDate || new Date().toISOString().split('T')[0]
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Available reading levels
  const readingLevels = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
  
  // Available genres
  const availableGenres = [
    'Fiction', 'Non-Fiction', 'Science', 'Technology', 'Biography', 
    'History', 'Fantasy', 'Mystery', 'Romance', 'Self-Help', 
    'Business', 'Children', 'Education', 'Science Fiction', 'Horror',
    'Thriller', 'Classic', 'Poetry', 'Drama', 'Cookbooks'
  ];

  useEffect(() => {
    // Check if we have user data
    if (!user || !user.name) {
      navigate('/login');
      return;
    }
    
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    // If we have no token, just use the data from localStorage
    if (!token) {
      console.log("No token found, using localStorage data");
      setProfile({
        name: user.name || '',
        email: user.email || '',
        readingLevel: user.readingLevel || 'Intermediate',
        favoriteGenres: user.favoriteGenres || [],
        joinDate: user.joinDate || new Date().toISOString().split('T')[0]
      });
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${api}/users/profile`, {
        headers: {
          'Authorization': 'Bearer ' + token
        }
      });

      if (res.ok) {
        const data = await res.json();
        setProfile({
          name: data.name || user.name || '',
          email: data.email || user.email || '',
          readingLevel: data.readingLevel || 'Intermediate',
          favoriteGenres: data.favoriteGenres || [],
          joinDate: data.joinDate || user.joinDate || new Date().toISOString().split('T')[0]
        });
      } else {
        // If API fails, use localStorage data
        console.log("API failed, using localStorage data");
        setProfile({
          name: user.name || '',
          email: user.email || '',
          readingLevel: user.readingLevel || 'Intermediate',
          favoriteGenres: user.favoriteGenres || [],
          joinDate: user.joinDate || new Date().toISOString().split('T')[0]
        });
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      // Use localStorage data if API fails
      setProfile({
        name: user.name || '',
        email: user.email || '',
        readingLevel: user.readingLevel || 'Intermediate',
        favoriteGenres: user.favoriteGenres || [],
        joinDate: user.joinDate || new Date().toISOString().split('T')[0]
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleGenreToggle = (genre) => {
    setProfile(prev => {
      if (prev.favoriteGenres.includes(genre)) {
        return {
          ...prev,
          favoriteGenres: prev.favoriteGenres.filter(g => g !== genre)
        };
      } else {
        return {
          ...prev,
          favoriteGenres: [...prev.favoriteGenres, genre]
        };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!profile.name.trim()) {
      setMessage({
        type: 'error',
        text: 'Please enter your name'
      });
      return;
    }

    if (!profile.email.trim()) {
      setMessage({
        type: 'error',
        text: 'Please enter your email'
      });
      return;
    }

    try {
      setSaving(true);
      
      // Update localStorage first
      const updatedUser = { 
        ...user, 
        name: profile.name, 
        email: profile.email,
        readingLevel: profile.readingLevel,
        favoriteGenres: profile.favoriteGenres,
        joinDate: profile.joinDate
      };
      localStorage.setItem('lv_user', JSON.stringify(updatedUser));
      
      // Try to update via API if we have a token
      if (token) {
        const res = await fetch(`${api}/users/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({
            name: profile.name,
            email: profile.email,
            readingLevel: profile.readingLevel,
            favoriteGenres: profile.favoriteGenres
          })
        });

        if (!res.ok) {
          const data = await res.json();
          console.log("API update failed:", data.message);
        }
      }
      
      setMessage({
        type: 'success',
        text: 'Profile updated successfully!'
      });
      
      // Redirect back to books page after 2 seconds
      setTimeout(() => {
        navigate('/books');
      }, 2000);
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage({
        type: 'error',
        text: 'Network error. Profile saved locally.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/books');
  };

  if (loading) {
    return (
      <div className="edit-profile-loading">
        <div className="spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="edit-profile-container">
      {/* Header */}
      <header className="edit-profile-header">
        <button className="back-btn" onClick={() => navigate('/books')}>
          ← Back to Dashboard
        </button>
        <h1 className="edit-profile-title">Edit Profile</h1>
        <div className="header-actions">
          <button className="logout-btn" onClick={() => {
            localStorage.removeItem('lv_token');
            localStorage.removeItem('lv_user');
            navigate('/login');
          }}>
            Logout
          </button>
        </div>
      </header>

      <div className="edit-profile-content">
        <div className="edit-profile-card">
          {/* Profile Header with Avatar */}
          <div className="profile-header-section">
            <div className="profile-avatar-large">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div className="profile-header-info">
              <h2>{profile.name}</h2>
              <p className="profile-email">{profile.email}</p>
              <div className="membership-status">
                <span className="membership-badge">Gold Member</span>
                <span className="member-since">
                  Member Since: {new Date(profile.joinDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Success/Error Messages */}
          {message.text && (
            <div className={`message-alert ${message.type}`}>
              {message.text}
            </div>
          )}

          {/* Edit Form */}
          <form onSubmit={handleSubmit} className="edit-profile-form">
            {/* Basic Information */}
            <div className="form-section">
              <h3 className="section-title">Basic Information</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Full Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={profile.name}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={profile.email}
                    onChange={handleInputChange}
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Reading Preferences */}
            <div className="form-section">
              <h3 className="section-title">Reading Preferences</h3>
              
              <div className="form-group">
                <label>Reading Level</label>
                <div className="reading-level-selector">
                  {readingLevels.map(level => (
                    <button
                      key={level}
                      type="button"
                      className={`level-option ${profile.readingLevel === level ? 'selected' : ''}`}
                      onClick={() => setProfile(prev => ({ ...prev, readingLevel: level }))}
                    >
                      {level}
                    </button>
                  ))}
                </div>
                <p className="field-description">
                  Select your current reading proficiency level
                </p>
              </div>

              <div className="form-group">
                <label>Favorite Genres</label>
                <div className="genres-grid">
                  {availableGenres.map(genre => (
                    <div
                      key={genre}
                      className={`genre-chip ${profile.favoriteGenres.includes(genre) ? 'selected' : ''}`}
                      onClick={() => handleGenreToggle(genre)}
                    >
                      {genre}
                      {profile.favoriteGenres.includes(genre) && (
                        <span className="checkmark">✓</span>
                      )}
                    </div>
                  ))}
                </div>
                <p className="field-description">
                  Click to select/deselect your favorite genres
                </p>
              </div>
            </div>

            {/* Read-only Information */}
            <div className="form-section">
              <h3 className="section-title">Account Information</h3>
              
              <div className="read-only-info">
                <div className="info-row">
                  <span className="info-label">Member Since:</span>
                  <span className="info-value">
                    {new Date(profile.joinDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                <div className="info-row">
                  <span className="info-label">Member ID:</span>
                  <span className="info-value">{user._id || 'N/A'}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Account Type:</span>
                  <span className="info-value">Gold Member</span>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="form-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={handleCancel}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="save-btn"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="spinner-small"></span>
                    Saving...
                  </>
                ) : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar with Stats */}
        <aside className="profile-sidebar">
          <div className="sidebar-card">
            <h3>Profile Summary</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <span className="stat-number">{profile.favoriteGenres.length}</span>
                <span className="stat-label">Favorite Genres</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{profile.readingLevel}</span>
                <span className="stat-label">Reading Level</span>
              </div>
            </div>
          </div>

          <div className="sidebar-card">
            <h3>Selected Genres</h3>
            {profile.favoriteGenres.length === 0 ? (
              <p className="no-genres">No genres selected yet</p>
            ) : (
              <div className="selected-genres-list">
                {profile.favoriteGenres.map(genre => (
                  <span key={genre} className="selected-genre-tag">
                    {genre}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="sidebar-card">
            <h3>Tips</h3>
            <ul className="tips-list">
              <li>Select genres you enjoy for better recommendations</li>
              <li>Update your reading level for appropriate suggestions</li>
              <li>Your profile helps us personalize your experience</li>
              <li>Changes may take a few minutes to reflect everywhere</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default EditProfileUser;