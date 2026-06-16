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

function Navigation({ onLogout }) {
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

function AuthenticatedPage({ children, onLogout }) {
  return (
    <>
      <Navigation onLogout={onLogout} />
      {children}
    </>
  );
}

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (token && user) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    setLoading(false);
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
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
          
          <Route path="/dashboard" element={
            isAuthenticated ? 
              <AuthenticatedPage onLogout={handleLogout}><Dashboard /></AuthenticatedPage> : 
              <Navigate to="/login" />
          } />
          <Route path="/parent-dashboard" element={
            isAuthenticated ? 
              <AuthenticatedPage onLogout={handleLogout}><ParentDashboard /></AuthenticatedPage> : 
              <Navigate to="/parent-login" />
          } />
          <Route path="/students" element={
            isAuthenticated ? 
              <AuthenticatedPage onLogout={handleLogout}><StudentList /></AuthenticatedPage> : 
              <Navigate to="/login" />
          } />
          <Route path="/add-student" element={
            isAuthenticated ? 
              <AuthenticatedPage onLogout={handleLogout}><AddStudent /></AuthenticatedPage> : 
              <Navigate to="/login" />
          } />
          <Route path="/attendance" element={
            isAuthenticated ? 
              <AuthenticatedPage onLogout={handleLogout}><Attendance /></AuthenticatedPage> : 
              <Navigate to="/login" />
          } />
          <Route path="/grades" element={
            isAuthenticated ? 
              <AuthenticatedPage onLogout={handleLogout}><Grades /></AuthenticatedPage> : 
              <Navigate to="/login" />
          } />
          <Route path="/report-card" element={
            isAuthenticated ? 
              <AuthenticatedPage onLogout={handleLogout}><ReportCard /></AuthenticatedPage> : 
              <Navigate to="/login" />
          } />
          <Route path="/fees" element={
            isAuthenticated ? 
              <AuthenticatedPage onLogout={handleLogout}><Fees /></AuthenticatedPage> : 
              <Navigate to="/login" />
          } />
          <Route path="/advance-payment" element={
            isAuthenticated ? 
              <AuthenticatedPage onLogout={handleLogout}><AdvancePayment /></AuthenticatedPage> : 
              <Navigate to="/login" />
          } />
          <Route path="/school-fees" element={
            isAuthenticated ? 
              <AuthenticatedPage onLogout={handleLogout}><SchoolFees /></AuthenticatedPage> : 
              <Navigate to="/login" />
          } />
          <Route path="/user-management" element={
            isAuthenticated ? 
              <AuthenticatedPage onLogout={handleLogout}><UserManagement /></AuthenticatedPage> : 
              <Navigate to="/login" />
          } />
          <Route path="/school-settings" element={
            isAuthenticated ? 
              <AuthenticatedPage onLogout={handleLogout}><SchoolSettings /></AuthenticatedPage> : 
              <Navigate to="/login" />
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
