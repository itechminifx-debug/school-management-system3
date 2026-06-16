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
import './App.css';

// Navigation component - only shown when authenticated
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
        <a href="/school-settings">⚙️ Settings</a>
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
      // Clear any stale data
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
    // Force navigation to login
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
          <Route path="/dashboard" element={
            isAuthenticated ? (
              <>
                <Navigation onLogout={handleLogout} />
                <Dashboard />
              </>
            ) : <Navigate to="/login" />
          } />
          <Route path="/students" element={
            isAuthenticated ? (
              <>
                <Navigation onLogout={handleLogout} />
                <StudentList />
              </>
            ) : <Navigate to="/login" />
          } />
          <Route path="/add-student" element={
            isAuthenticated ? (
              <>
                <Navigation onLogout={handleLogout} />
                <AddStudent />
              </>
            ) : <Navigate to="/login" />
          } />
          <Route path="/attendance" element={
            isAuthenticated ? (
              <>
                <Navigation onLogout={handleLogout} />
                <Attendance />
              </>
            ) : <Navigate to="/login" />
          } />
          <Route path="/grades" element={
            isAuthenticated ? (
              <>
                <Navigation onLogout={handleLogout} />
                <Grades />
              </>
            ) : <Navigate to="/login" />
          } />
          <Route path="/report-card" element={
            isAuthenticated ? (
              <>
                <Navigation onLogout={handleLogout} />
                <ReportCard />
              </>
            ) : <Navigate to="/login" />
          } />
          <Route path="/fees" element={
            isAuthenticated ? (
              <>
                <Navigation onLogout={handleLogout} />
                <Fees />
              </>
            ) : <Navigate to="/login" />
          } />
          <Route path="/advance-payment" element={
            isAuthenticated ? (
              <>
                <Navigation onLogout={handleLogout} />
                <AdvancePayment />
              </>
            ) : <Navigate to="/login" />
          } />
          <Route path="/school-fees" element={
            isAuthenticated ? (
              <>
                <Navigation onLogout={handleLogout} />
                <SchoolFees />
              </>
            ) : <Navigate to="/login" />
          } />
          <Route path="/school-settings" element={
            isAuthenticated ? (
              <>
                <Navigation onLogout={handleLogout} />
                <SchoolSettings />
              </>
            ) : <Navigate to="/login" />
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
