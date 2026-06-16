import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
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
import './App.css';

function Navigation({ onLogout }) {
  const location = useLocation();
  const { schoolSettings } = useSchool();
  
  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <nav className="navbar">
      <h1>🏫 {schoolSettings.school_name}</h1>
      <div className="nav-links">
        <Link to="/dashboard" className={isActive('/dashboard')}>📊 Dashboard</Link>
        <Link to="/students" className={isActive('/students')}>👥 Students</Link>
        <Link to="/add-student" className={isActive('/add-student')}>➕ Add Student</Link>
        <Link to="/attendance" className={isActive('/attendance')}>📋 Attendance</Link>
        <Link to="/grades" className={isActive('/grades')}>🎓 Grades</Link>
        <Link to="/report-card" className={isActive('/report-card')}>📄 Report Card</Link>
        <Link to="/fees" className={isActive('/fees')}>🍽️ Daily Fees</Link>
        <Link to="/advance-payment" className={isActive('/advance-payment')}>💰 Advance Payment</Link>
        <Link to="/school-fees" className={isActive('/school-fees')}>🏫 School Fees</Link>
        <Link to="/school-settings" className={isActive('/school-settings')}>⚙️ Settings</Link>
        <button onClick={onLogout} className="logout-btn">🚪 Logout</button>
      </div>
    </nav>
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
  };

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  return (
    <Router>
      <div className="App">
        {isAuthenticated && <Navigation onLogout={handleLogout} />}
        <Routes>
          <Route path="/login" element={<MainLogin onLogin={handleLogin} />} />
          <Route path="/dashboard" element={isAuthenticated ? <Dashboard /> : <Navigate to="/login" />} />
          <Route path="/students" element={isAuthenticated ? <StudentList /> : <Navigate to="/login" />} />
          <Route path="/add-student" element={isAuthenticated ? <AddStudent /> : <Navigate to="/login" />} />
          <Route path="/attendance" element={isAuthenticated ? <Attendance /> : <Navigate to="/login" />} />
          <Route path="/grades" element={isAuthenticated ? <Grades /> : <Navigate to="/login" />} />
          <Route path="/report-card" element={isAuthenticated ? <ReportCard /> : <Navigate to="/login" />} />
          <Route path="/fees" element={isAuthenticated ? <Fees /> : <Navigate to="/login" />} />
          <Route path="/advance-payment" element={isAuthenticated ? <AdvancePayment /> : <Navigate to="/login" />} />
          <Route path="/school-fees" element={isAuthenticated ? <SchoolFees /> : <Navigate to="/login" />} />
          <Route path="/school-settings" element={isAuthenticated ? <SchoolSettings /> : <Navigate to="/login" />} />
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
