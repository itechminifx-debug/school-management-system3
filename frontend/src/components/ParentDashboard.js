import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSchool } from '../context/SchoolContext';

function ParentDashboard() {
  const { schoolSettings } = useSchool();
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [grades, setGrades] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState({});
  const [fees, setFees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [error, setError] = useState('');
  const [parentInfo, setParentInfo] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const apiUrl = 'https://school-management-api-5mml.onrender.com';

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        setParentInfo(parsed);
        console.log('📌 PARENT INFO:', parsed);
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    fetchChildren();
  }, []);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && selectedChild && !loading) {
        console.log('📌 TAB VISIBLE - REFRESHING...');
        fetchChildData(selectedChild.id);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [selectedChild, loading]);

  useEffect(() => {
    const handleFocus = () => {
      if (selectedChild && !loading) {
        console.log('📌 WINDOW FOCUS - REFRESHING...');
        fetchChildData(selectedChild.id);
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [selectedChild, loading]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (selectedChild && !loading) {
        console.log('📌 AUTO-REFRESH...');
        fetchChildData(selectedChild.id);
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [selectedChild, loading]);

  const fetchChildren = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    
    if (!token) {
      setError('No authentication token found. Please login again.');
      setLoading(false);
      return;
    }
    
    try {
      const response = await axios.get(`${apiUrl}/api/parent/children?t=${Date.now()}`, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
      
      console.log('📌 CHILDREN RESPONSE:', response.data);
      
      if (response.data.children && response.data.children.length > 0) {
        setChildren(response.data.children);
        setSelectedChild(response.data.children[0]);
        await fetchChildData(response.data.children[0].id);
        setLastUpdated(new Date());
      } else {
        setChildren([]);
        setError('No children linked to your account.');
      }
    } catch (error) {
      console.error('Error fetching children:', error);
      if (error.response?.status === 403) {
        setError('Access denied. Please login again.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userRole');
        setTimeout(() => {
          window.location.href = '/parent-login';
        }, 2000);
      } else {
        setError(error.response?.data?.message || 'Failed to load children data');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchChildData = async (studentId) => {
    const token = localStorage.getItem('token');
    const currentYear = new Date().getFullYear();
    
    if (!token) return;
    
    console.log('📌 FETCHING DATA FOR STUDENT:', studentId);
    
    try {
      const gradesRes = await axios.get(
        `${apiUrl}/api/parent/grades/${studentId}/Term%201/${currentYear}?t=${Date.now()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setGrades(gradesRes.data.grades || []);
      console.log('✅ GRADES:', gradesRes.data.grades?.length || 0);

      const attendanceRes = await axios.get(
        `${apiUrl}/api/parent/attendance/${studentId}?t=${Date.now()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAttendance(attendanceRes.data.attendance || []);
      setAttendanceSummary(attendanceRes.data.summary || {});
      console.log('✅ ATTENDANCE:', attendanceRes.data.attendance?.length || 0);

      await fetchFees(studentId);
      
      setLastUpdated(new Date());
      console.log('✅ DATA REFRESHED AT:', new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Error fetching child data:', error);
    }
  };

  const fetchFees = async (studentId) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    
    try {
      console.log('📌 FETCHING FEES FOR STUDENT:', studentId);
      
      const response = await axios.get(
        `${apiUrl}/api/parent/fees/${studentId}?t=${Date.now()}&r=${Math.random()}`,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          } 
        }
      );
      
      console.log('📌 FEES RESPONSE:', response.data);
      
      if (response.data && response.data.fees) {
        const updatedFees = response.data.fees.map(fee => {
          const total = parseFloat(fee.total_amount || 0);
          const paid = parseFloat(fee.amount_paid || 0);
          const balance = total - paid;
          let status = 'unpaid';
          if (balance <= 0) status = 'paid';
          else if (paid > 0) status = 'partial';
          
          return { ...fee, balance, status };
        });
        
        setFees(updatedFees);
        console.log('✅ FEES UPDATED:', updatedFees);
        console.log('✅ FEES COUNT:', updatedFees.length);
      } else {
        setFees([]);
        console.log('📌 NO FEES FOUND');
      }
    } catch (error) {
      console.error('Error fetching fees:', error);
      setFees([]);
    }
  };

  const handleRefreshFees = async () => {
    if (!selectedChild) return;
    setRefreshing(true);
    console.log('🔄 MANUAL FEES REFRESH...');
    await fetchFees(selectedChild.id);
    setRefreshing(false);
  };

  const handleChildSelect = (child) => {
    setSelectedChild(child);
    fetchChildData(child.id);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    console.log('🔄 MANUAL FULL REFRESH...');
    if (selectedChild) {
      await fetchChildData(selectedChild.id);
    } else {
      await fetchChildren();
    }
    setRefreshing(false);
  };

  const getStatusClass = (status) => {
    return `status-${status}`;
  };

  const getGradeLetter = (score) => {
    if (!score) return '-';
    const s = parseFloat(score);
    if (s >= 80) return 'A';
    if (s >= 70) return 'B';
    if (s >= 60) return 'C';
    if (s >= 50) return 'D';
    return 'F';
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    window.location.href = '/parent-login';
  };

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  if (children.length === 0) {
    return (
      <div className="parent-dashboard-container">
        <div className="container">
          <div className="card">
            <h2>👨‍👩‍👧 Parent Dashboard</h2>
            <div className="error">⚠️ {error || 'No children linked to your account.'}</div>
            {parentInfo && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '8px' }}>
                <p><strong>Parent ID:</strong> {parentInfo.id}</p>
                <p><strong>Name:</strong> {parentInfo.full_name}</p>
                <p><strong>Email:</strong> {parentInfo.email}</p>
              </div>
            )}
            <button onClick={handleLogout} style={{ marginTop: '1rem', background: '#dc3545', padding: '0.5rem 1rem', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'white' }}>
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="parent-dashboard-container">
      <div className="container">
        <div className="card" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ color: 'white', borderLeftColor: 'white' }}>👨‍👩‍👧 Welcome, {parentInfo?.full_name || 'Parent'}!</h2>
              <p style={{ opacity: 0.9 }}>View your child's academic progress and school information</p>
              <p style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '0.3rem' }}>
                🔄 Auto-refreshes every 15 seconds
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button onClick={handleRefresh} disabled={refreshing} style={{ background: 'rgba(255,255,255,0.2)', padding: '0.3rem 1rem', border: '1px solid rgba(255,255,255,0.3)', color: 'white', borderRadius: '8px', cursor: 'pointer' }}>
                {refreshing ? '🔄 Refreshing...' : '🔄 Refresh'}
              </button>
              <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.2)', padding: '0.3rem 1rem', border: '1px solid rgba(255,255,255,0.3)', color: 'white', borderRadius: '8px', cursor: 'pointer' }}>
                Logout
              </button>
            </div>
          </div>
          {lastUpdated && (
            <p style={{ fontSize: '0.7rem', opacity: 0.7, marginTop: '0.5rem' }}>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>

        <div className="card">
          <h3>Select Child</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {children.map(child => (
              <button
                key={child.id}
                onClick={() => handleChildSelect(child)}
                style={{
                  background: selectedChild?.id === child.id ? '#6366f1' : '#f1f5f9',
                  color: selectedChild?.id === child.id ? 'white' : '#1e293b',
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                {child.full_name} ({child.class_name})
              </button>
            ))}
          </div>
          <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#666' }}>
            Total linked children: {children.length}
          </p>
        </div>

        {selectedChild && (
          <>
            <div className="card">
              <h3>📋 Student Information</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div><strong>Name:</strong> {selectedChild.full_name}</div>
                <div><strong>Admission No:</strong> {selectedChild.admission_number}</div>
                <div><strong>Class:</strong> {selectedChild.class_name}</div>
                <div><strong>Relationship:</strong> {selectedChild.relationship}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              {['overview', 'grades', 'attendance', 'fees'].map(tab => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    if (tab === 'fees' && selectedChild) {
                      fetchFees(selectedChild.id);
                    }
                  }}
                  style={{
                    background: activeTab === tab ? '#6366f1' : 'white',
                    color: activeTab === tab ? 'white' : '#1e293b',
                    padding: '0.5rem 1.5rem',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {activeTab === 'overview' && (
              <div className="stats-grid">
                <div className="stat-card"><h3>{attendanceSummary.total || 0}</h3><p>Total Days</p></div>
                <div className="stat-card"><h3 style={{ color: '#10b981' }}>{attendanceSummary.present || 0}</h3><p>Present</p></div>
                <div className="stat-card"><h3 style={{ color: '#ef4444' }}>{attendanceSummary.absent || 0}</h3><p>Absent</p></div>
                <div className="stat-card"><h3 style={{ color: '#f59e0b' }}>{attendanceSummary.late || 0}</h3><p>Late</p></div>
                <div className="stat-card"><h3>{grades.length}</h3><p>Subjects</p></div>
                <div className="stat-card">
                  <h3>
                    {fees.filter(f => {
                      const balance = parseFloat(f.total_amount || 0) - parseFloat(f.amount_paid || 0);
                      return balance <= 0;
                    }).length}
                  </h3>
                  <p>Fees Paid</p>
                </div>
              </div>
            )}

            {activeTab === 'grades' && (
              <div className="card">
                <h3>📊 Grades Overview</h3>
                {grades.length === 0 ? <p>No grades available for this term.</p> : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%' }}>
                      <thead><tr><th>Subject</th><th>Score</th><th>Grade</th><th>Status</th></tr></thead>
                      <tbody>
                        {grades.map((grade, index) => (
                          <tr key={index}>
                            <td>{grade.subject}</td>
                            <td>{grade.score}</td>
                            <td>{getGradeLetter(grade.score)}</td>
                            <td>
                              <span style={{
                                background: parseFloat(grade.score) >= 70 ? '#10b981' : parseFloat(grade.score) >= 50 ? '#f59e0b' : '#ef4444',
                                color: 'white', padding: '2px 12px', borderRadius: '20px', fontSize: '12px'
                              }}>
                                {parseFloat(grade.score) >= 70 ? '✅ Good' : parseFloat(grade.score) >= 50 ? '⚠️ Average' : '❌ Needs Improvement'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'attendance' && (
              <div className="card">
                <h3>📋 Attendance Records</h3>
                <div className="stats-grid" style={{ marginBottom: '1rem' }}>
                  <div className="stat-card"><h3 style={{ color: '#10b981' }}>{attendanceSummary.present || 0}</h3><p>Present</p></div>
                  <div className="stat-card"><h3 style={{ color: '#ef4444' }}>{attendanceSummary.absent || 0}</h3><p>Absent</p></div>
                  <div className="stat-card"><h3 style={{ color: '#f59e0b' }}>{attendanceSummary.late || 0}</h3><p>Late</p></div>
                  <div className="stat-card"><h3>{attendanceSummary.total || 0}</h3><p>Total Days</p></div>
                </div>
                {attendance.length === 0 ? <p>No attendance records found.</p> : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%' }}>
                      <thead><tr><th>Date</th><th>Status</th></tr></thead>
                      <tbody>
                        {attendance.map(record => (
                          <tr key={record.date}>
                            <td>{new Date(record.date).toLocaleDateString()}</td>
                            <td><span className={getStatusClass(record.status)}>{record.status.toUpperCase()}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'fees' && (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  <h3 style={{ marginBottom: 0 }}>💰 School Fees</h3>
                  <div>
                    <button onClick={handleRefreshFees} disabled={refreshing} style={{ background: '#6366f1', padding: '0.3rem 1rem', border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'white', fontSize: '0.85rem', marginRight: '0.5rem' }}>
                      {refreshing ? '🔄 Refreshing...' : '🔄 Refresh Fees'}
                    </button>
                  </div>
                </div>
                
                {console.log('📌 RENDERING FEES TAB. FEES:', fees)}
                {console.log('📌 FEES LENGTH:', fees.length)}
                
                {fees.length === 0 ? (
                  <p>No fee records found.</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#1e3c72', color: 'white' }}>
                          <th style={{ padding: '10px' }}>Fee Type</th>
                          <th style={{ padding: '10px' }}>Term</th>
                          <th style={{ padding: '10px' }}>Year</th>
                          <th style={{ padding: '10px', textAlign: 'center' }}>Total (₵)</th>
                          <th style={{ padding: '10px', textAlign: 'center' }}>Paid (₵)</th>
                          <th style={{ padding: '10px', textAlign: 'center' }}>Balance (₵)</th>
                          <th style={{ padding: '10px', textAlign: 'center' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fees.map((fee, index) => {
                          const total = parseFloat(fee.total_amount || 0);
                          const paid = parseFloat(fee.amount_paid || 0);
                          const balance = total - paid;
                          let status = 'unpaid';
                          if (balance <= 0) status = 'paid';
                          else if (paid > 0) status = 'partial';
                          
                          return (
                            <tr key={index} style={{ borderBottom: '1px solid #ddd' }}>
                              <td style={{ padding: '8px' }}><strong>{fee.fee_name || 'Unknown'}</strong></td>
                              <td style={{ padding: '8px' }}>{fee.term || 'N/A'}</td>
                              <td style={{ padding: '8px' }}>{fee.academic_year || 'N/A'}</td>
                              <td style={{ padding: '8px', textAlign: 'center' }}>₵{total.toFixed(2)}</td>
                              <td style={{ padding: '8px', textAlign: 'center', color: '#10b981', fontWeight: 'bold' }}>₵{paid.toFixed(2)}</td>
                              <td style={{ padding: '8px', textAlign: 'center', color: balance > 0 ? '#e74c3c' : '#10b981', fontWeight: 'bold' }}>
                                ₵{balance.toFixed(2)}
                              </td>
                              <td style={{ padding: '8px', textAlign: 'center' }}>
                                <span style={{
                                  background: status === 'paid' ? '#10b981' : status === 'partial' ? '#f59e0b' : '#ef4444',
                                  color: 'white',
                                  padding: '4px 12px',
                                  borderRadius: '20px',
                                  fontSize: '11px',
                                  fontWeight: 'bold'
                                }}>
                                  {status.toUpperCase()}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ParentDashboard;
