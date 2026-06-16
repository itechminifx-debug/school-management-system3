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
  const [parentName, setParentName] = useState('Parent');

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      try {
        const userData = JSON.parse(user);
        setParentName(userData.full_name || 'Parent');
      } catch (e) {
        setParentName('Parent');
      }
    }
  }, []);

  return (
    <nav className="parent-navbar">
      <h1>🏫 {schoolSettings.school_name}</h1>
      <div className="parent-nav-links">
        <span className="parent-name">👤 {parentName}</span>
        <button onClick={onLogout} className="parent-logout-btn">🚪 Logout</button>
      </div>
    </nav>
  );
}

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    const role = localStorage.getItem('userRole');
    
    if (token && user) {
      setIsAuthenticated(true);
      setUserRole(role || 'admin');
    } else {
      setIsAuthenticated(false);
      setUserRole(null);
    }
    setLoading(false);
  }, []);

  const handleLogin = () => {
    const role = localStorage.getItem('userRole');
    setIsAuthenticated(true);
    setUserRole(role || 'admin');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    setIsAuthenticated(false);
    setUserRole(null);
    window.location.href = '/login';
  };

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  const isParent = userRole === 'parent';
  const isAdmin = userRole === 'admin' || userRole === 'teacher';

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/login" element={<MainLogin onLogin={handleLogin} />} />
          <Route path="/parent-login" element={<ParentLogin onLogin={handleLogin} />} />
          
          {/* Admin Routes - ONLY for admin/teacher users */}
          <Route path="/dashboard" element={
            isAuthenticated && isAdmin ? 
              <><AdminNavigation onLogout={handleLogout} /><Dashboard /></> : 
              <Navigate to={isParent ? '/parent-dashboard' : '/login'} />
          } />
          <Route path="/students" element={
            isAuthenticated && isAdmin ? 
              <><AdminNavigation onLogout={handleLogout} /><StudentList /></> : 
              <Navigate to="/login" />
          } />
          <Route path="/add-student" element={
            isAuthenticated && isAdmin ? 
              <><AdminNavigation onLogout={handleLogout} /><AddStudent /></> : 
              <Navigate to="/login" />
          } />
          <Route path="/attendance" element={
            isAuthenticated && isAdmin ? 
              <><AdminNavigation onLogout={handleLogout} /><Attendance /></> : 
              <Navigate to="/login" />
          } />
          <Route path="/grades" element={
            isAuthenticated && isAdmin ? 
              <><AdminNavigation onLogout={handleLogout} /><Grades /></> : 
              <Navigate to="/login" />
          } />
          <Route path="/report-card" element={
            isAuthenticated && isAdmin ? 
              <><AdminNavigation onLogout={handleLogout} /><ReportCard /></> : 
              <Navigate to="/login" />
          } />
          <Route path="/fees" element={
            isAuthenticated && isAdmin ? 
              <><AdminNavigation onLogout={handleLogout} /><Fees /></> : 
              <Navigate to="/login" />
          } />
          <Route path="/advance-payment" element={
            isAuthenticated && isAdmin ? 
              <><AdminNavigation onLogout={handleLogout} /><AdvancePayment /></> : 
              <Navigate to="/login" />
          } />
          <Route path="/school-fees" element={
            isAuthenticated && isAdmin ? 
              <><AdminNavigation onLogout={handleLogout} /><SchoolFees /></> : 
              <Navigate to="/login" />
          } />
          <Route path="/user-management" element={
            isAuthenticated && isAdmin ? 
              <><AdminNavigation onLogout={handleLogout} /><UserManagement /></> : 
              <Navigate to="/login" />
          } />
          <Route path="/school-settings" element={
            isAuthenticated && isAdmin ? 
              <><AdminNavigation onLogout={handleLogout} /><SchoolSettings /></> : 
              <Navigate to="/login" />
          } />
          
          {/* Parent Routes - ONLY for parent users */}
          <Route path="/parent-dashboard" element={
            isAuthenticated && isParent ? 
              <><ParentNavigation onLogout={handleLogout} /><ParentDashboard /></> : 
              <Navigate to={isAdmin ? '/dashboard' : '/parent-login'} />
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
