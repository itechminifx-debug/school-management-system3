import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function MainLogin({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const apiUrl = 'https://school-management-api-5mml.onrender.com';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!email || !password) {
      setError('Please enter email and password');
      setLoading(false);
      return;
    }

    try {
      // Admin and Teacher login use the same auth endpoint
      const response = await axios.post(`${apiUrl}/api/auth/login`, {
        email,
        password
      });

      if (response.data.token && response.data.user) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        
        if (onLogin) {
          onLogin();
        }
        
        // Redirect based on role
        const userRole = response.data.user.role;
        if (userRole === 'admin' || userRole === 'teacher') {
          navigate('/dashboard');
        } else if (userRole === 'parent') {
          navigate('/parent-dashboard');
        } else {
          navigate('/dashboard');
        }
      } else {
        setError('Invalid response from server');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleParentRedirect = () => {
    // Navigate to parent login page
    navigate('/parent-login');
  };

  const handleTeacherRedirect = () => {
    // For now, teacher uses same login as admin
    setRole('teacher');
    // You can add a message or change the form label
  };

  return (
    <div className="main-login-container">
      <div className="login-background">
        <div className="floating-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
          <div className="shape shape-4"></div>
        </div>
      </div>

      <div className="main-login-card">
        <div className="login-header">
          <div className="school-icon">🏫</div>
          <h1>School Management System</h1>
          <p>Welcome back! Please select your portal to continue</p>
        </div>

        {/* Portal Selection Buttons */}
        <div className="portal-selector">
          <button 
            type="button"
            className={`portal-btn ${role === 'admin' ? 'active' : ''}`}
            onClick={() => setRole('admin')}
          >
            <span className="portal-icon">👑</span>
            <span className="portal-name">Administrator</span>
            <span className="portal-desc">Full system access</span>
          </button>
          <button 
            type="button"
            className={`portal-btn ${role === 'teacher' ? 'active' : ''}`}
            onClick={handleTeacherRedirect}
          >
            <span className="portal-icon">👨‍🏫</span>
            <span className="portal-name">Teacher</span>
            <span className="portal-desc">Manage classes & grades</span>
          </button>
          <button 
            type="button"
            className={`portal-btn ${role === 'parent' ? 'active' : ''}`}
            onClick={handleParentRedirect}
          >
            <span className="portal-icon">👨‍👩‍👧</span>
            <span className="portal-name">Parent</span>
            <span className="portal-desc">View child's progress</span>
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="input-group">
            <span className="input-icon">📧</span>
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="off"
            />
          </div>

          <div className="input-group">
            <span className="input-icon">🔒</span>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {role === 'parent' && (
            <div className="parent-info">
              <p>📌 Parent Login</p>
              <small>Parents, please click the Parent button or go to <strong>/parent-login</strong> to access your portal.</small>
            </div>
          )}

          {role === 'teacher' && (
            <div className="teacher-info">
              <p>📌 Teacher Login</p>
              <small>Use your school email address and password provided by the administrator.</small>
            </div>
          )}

          {role === 'admin' && (
            <div className="teacher-info">
              <p>📌 Administrator Login</p>
              <small>Full system access. Use your admin credentials.</small>
            </div>
          )}

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? 'Logging in...' : `Login as ${role === 'admin' ? 'Administrator' : role === 'teacher' ? 'Teacher' : 'Parent'}`}
          </button>
        </form>

        <div className="login-footer">
          <p>© 2026 School Management System | All Rights Reserved</p>
          <p className="version">Version 2.0 - Multi-Portal Edition</p>
        </div>
      </div>
    </div>
  );
}

export default MainLogin;
