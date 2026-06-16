import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SchoolProvider, useSchool } from './context/SchoolContext';
import MainLogin from './components/MainLogin';
import Dashboard from './components/Dashboard';
import StudentList from './components/StudentList';
import AddStudent from './components/AddStudent';
import Attendance from './components/Attendance';
import Grades from './components/Grades';
import ReportCard from './components/ReportCard';
import Fees from './components/Fees';
import AdvancePayment from './components/AdvancePayment';
import SchoolFees from './components/SchoolFees';
import SchoolSettings from './components/SchoolSettings';
import ParentLogin from './components/ParentLogin';
import ParentDashboard from './components/ParentDashboard';
import UserManagement from './components/UserManagement';
import './App.css';

// Admin Navigation
function AdminNavigation({ onLogout }) {
  const { schoolSettings } = useSchool();

  return (
    <nav className="navbar">
      <h1>🏫 {schoolSettings.school_name}</h1>
      <div className="nav-links">
        <a href="/dashboard">📊 Dashboard</a>
        <a href="/students">👥 Students</a>
        <a href="/add-student">➕ Add Student</a>
        <a href="/attendance">📋 Attendance</a>
        <a href="/grades">🎓 Grades</a>
        <a href="/report-card">📄 Report Card</a>
        <a href="/fees">🍽️ Daily Fees</a>
        <a href="/advance-payment">💰 Advance Payment</a>
        <a href="/school-fees">🏫 School Fees</a>
        <a href="/user-management">👥 Users</a>
        <a href="/school-settings">⚙️ Settings</a>
        <button onClick={onLogout} className="logout-btn">🚪 Logout</button>
      </div>
    </nav>
  );
}

// Parent Navigation - Simple and clean
function ParentNavigation({ onLogout }) {
  const { schoolSettings } = useSchool();

  return (
    <nav className="parent-navbar">
      <h1>🏫 {schoolSettings.school_name}</h1>
      <div className="parent-nav-links">
        <span className="parent-name">👤 {localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')).full_name : 'Parent'}</span>
        <button onClick={onLogout} className="parent-logout-btn">🚪 Logout</button>
      </div>
    </nav>
  );
}

// Wrapper for admin pages
function AdminPage({ children, onLogout }) {
  return (
    <>
      <AdminNavigation onLogout={onLogout} />
      {children}
    </>
  );
}

// Wrapper for parent pages
function ParentPage({ children, onLogout }) {
  return (
    <>
      <ParentNavigation onLogout={onLogout} />
      {children}
    </>
  );
}

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      try {
        const userData = JSON.parse(user);
        setIsAuthenticated(true);
        setUserRole(userData.role || 'admin');
      } catch (e) {
        setIsAuthenticated(false);
        setUserRole(null);
      }
    } else {
      setIsAuthenticated(false);
      setUserRole(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    setLoading(false);
  }, []);

  const handleLogin = () => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        setIsAuthenticated(true);
        setUserRole(userData.role || 'admin');
      } catch (e) {
        setIsAuthenticated(true);
        setUserRole('admin');
      }
    } else {
      setIsAuthenticated(true);
      setUserRole('admin');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUserRole(null);
    window.location.href = '/login';
  };

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<MainLogin onLogin={handleLogin} />} />
          <Route path="/parent-login" element={<ParentLogin onLogin={handleLogin} />} />
          
          {/* Admin Routes */}
          <Route path="/dashboard" element={
            isAuthenticated && userRole !== 'parent' ? 
              <AdminPage onLogout={handleLogout}><Dashboard /></AdminPage> : 
              <Navigate to={userRole === 'parent' ? '/parent-dashboard' : '/login'} />
          } />
          <Route path="/students" element={
            isAuthenticated && userRole !== 'parent' ? 
              <AdminPage onLogout={handleLogout}><StudentList /></AdminPage> : 
              <Navigate to="/login" />
          } />
          <Route path="/add-student" element={
            isAuthenticated && userRole !== 'parent' ? 
              <AdminPage onLogout={handleLogout}><AddStudent /></AdminPage> : 
              <Navigate to="/login" />
          } />
          <Route path="/attendance" element={
            isAuthenticated && userRole !== 'parent' ? 
              <AdminPage onLogout={handleLogout}><Attendance /></AdminPage> : 
              <Navigate to="/login" />
          } />
          <Route path="/grades" element={
            isAuthenticated && userRole !== 'parent' ? 
              <AdminPage onLogout={handleLogout}><Grades /></AdminPage> : 
              <Navigate to="/login" />
          } />
          <Route path="/report-card" element={
            isAuthenticated && userRole !== 'parent' ? 
              <AdminPage onLogout={handleLogout}><ReportCard /></AdminPage> : 
              <Navigate to="/login" />
          } />
          <Route path="/fees" element={
            isAuthenticated && userRole !== 'parent' ? 
              <AdminPage onLogout={handleLogout}><Fees /></AdminPage> : 
              <Navigate to="/login" />
          } />
          <Route path="/advance-payment" element={
            isAuthenticated && userRole !== 'parent' ? 
              <AdminPage onLogout={handleLogout}><AdvancePayment /></AdminPage> : 
              <Navigate to="/login" />
          } />
          <Route path="/school-fees" element={
            isAuthenticated && userRole !== 'parent' ? 
              <AdminPage onLogout={handleLogout}><SchoolFees /></AdminPage> : 
              <Navigate to="/login" />
          } />
          <Route path="/user-management" element={
            isAuthenticated && userRole !== 'parent' ? 
              <AdminPage onLogout={handleLogout}><UserManagement /></AdminPage> : 
              <Navigate to="/login" />
          } />
          <Route path="/school-settings" element={
            isAuthenticated && userRole !== 'parent' ? 
              <AdminPage onLogout={handleLogout}><SchoolSettings /></AdminPage> : 
              <Navigate to="/login" />
          } />
          
          {/* Parent Routes */}
          <Route path="/parent-dashboard" element={
            isAuthenticated && userRole === 'parent' ? 
              <ParentPage onLogout={handleLogout}><ParentDashboard /></ParentPage> : 
              <Navigate to={userRole !== 'parent' ? '/dashboard' : '/parent-login'} />
          } />
          
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

function App() {
  return (
    <SchoolProvider>
      <AppContent />
    </SchoolProvider>
  );
}

export default App;
