import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import StudentList from './components/StudentList';
import AddStudent from './components/AddStudent';
import Attendance from './components/Attendance';
import Grades from './components/Grades';
import ReportCard from './components/ReportCard';
import Fees from './components/Fees';
import AdvancePayment from './components/AdvancePayment';
import SchoolFees from './components/SchoolFees';
import './App.css';

function Navigation({ onLogout }) {
  const location = useLocation();
  
  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <nav className="navbar">
      <h1>🏫 School Management System</h1>
      <div className="nav-links">
        <Link to="/dashboard" className={isActive('/dashboard')}>📊 Dashboard</Link>
        <Link to="/students" className={isActive('/students')}>👥 Students</Link>
        <Link to="/add-student" className={isActive('/add-student')}>➕ Add Student</Link>
        <Link to="/attendance" className={isActive('/attendance')}>📋 Attendance</Link>
        <Link to="/grades" className={isActive('/grades')}>🎓 Grades</Link>
        <Link to="/report-card" className={isActive('/report-card')}>📄 Report Card</Link>
        <Link to="/fees" className={isActive('/fees')}>🍽️ Fees</Link>
        <Link to="/advance-payment" className={isActive('/advance-payment')}>💰 Advance Payment</Link>
        <Link to="/school-fees" className={isActive('/school-fees')}>🏫 School Fees</Link>
        <button onClick={onLogout} className="logout-btn">🚪 Logout</button>
      </div>
    </nav>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
  };

  return (
    <Router>
      <div className="App">
        {isAuthenticated && <Navigation onLogout={handleLogout} />}
        
        <Routes>
          <Route path="/login" element={
            isAuthenticated ? <Navigate to="/dashboard" /> : <Login onLogin={handleLogin} />
          } />
          <Route path="/dashboard" element={
            isAuthenticated ? <Dashboard /> : <Navigate to="/login" />
          } />
          <Route path="/students" element={
            isAuthenticated ? <StudentList /> : <Navigate to="/login" />
          } />
          <Route path="/add-student" element={
            isAuthenticated ? <AddStudent /> : <Navigate to="/login" />
          } />
          <Route path="/attendance" element={
            isAuthenticated ? <Attendance /> : <Navigate to="/login" />
          } />
          <Route path="/grades" element={
            isAuthenticated ? <Grades /> : <Navigate to="/login" />
          } />
          <Route path="/report-card" element={
            isAuthenticated ? <ReportCard /> : <Navigate to="/login" />
          } />
          <Route path="/fees" element={
            isAuthenticated ? <Fees /> : <Navigate to="/login" />
          } />
          <Route path="/advance-payment" element={
            isAuthenticated ? <AdvancePayment /> : <Navigate to="/login" />
          } />
          <Route path="/school-fees" element={
            isAuthenticated ? <SchoolFees /> : <Navigate to="/login" />
          } />
          <Route path="/" element={<Navigate to="/login" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
