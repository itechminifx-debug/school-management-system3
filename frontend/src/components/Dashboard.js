import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Dashboard() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalPresent: 0,
    totalAbsent: 0,
    totalLate: 0,
    attendanceRate: 0
  });
  const [recentStudents, setRecentStudents] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const apiUrl = 'https://school-management-api-5mml.onrender.com';

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    
    console.log('Fetching dashboard data...', token ? 'Token exists' : 'No token');
    
    if (!token) {
      setError('Please login again');
      setLoading(false);
      return;
    }

    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      // Fetch all students
      console.log('Fetching students from:', `${apiUrl}/api/students`);
      const studentsRes = await axios.get(`${apiUrl}/api/students`, config);
      const allStudents = studentsRes.data.students || [];
      const totalStudents = allStudents.length;
      setRecentStudents(allStudents.slice(0, 5));
      console.log('Total students:', totalStudents);

      // Fetch today's attendance
      const today = new Date().toISOString().split('T')[0];
      console.log('Fetching attendance for date:', today);
      
      try {
        const attendanceRes = await axios.get(`${apiUrl}/api/attendance/date/${today}`, config);
        const attendance = attendanceRes.data.attendance || [];
        setTodayAttendance(attendance);
        
        const presentCount = attendance.filter(a => a.status === 'present').length;
        const absentCount = attendance.filter(a => a.status === 'absent').length;
        const lateCount = attendance.filter(a => a.status === 'late').length;
        const attendanceRate = totalStudents > 0 ? ((presentCount / totalStudents) * 100).toFixed(1) : 0;
        
        console.log('Attendance stats:', { presentCount, absentCount, lateCount, attendanceRate });
        
        setStats({
          totalStudents,
          totalPresent: presentCount,
          totalAbsent: absentCount,
          totalLate: lateCount,
          attendanceRate
        });
      } catch (attError) {
        console.log('No attendance records for today:', attError.message);
        setStats({
          totalStudents,
          totalPresent: 0,
          totalAbsent: 0,
          totalLate: 0,
          attendanceRate: 0
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status) => {
    return `status-${status}`;
  };

  const getClassName = (classLevelId) => {
    const classMap = {
      1: 'Crèche', 2: 'Nursery 1', 3: 'Nursery 2',
      4: 'KG 1', 5: 'KG 2', 6: 'Basic 1', 7: 'Basic 2', 8: 'Basic 3',
      9: 'Basic 4', 10: 'Basic 5', 11: 'Basic 6', 12: 'JHS 1', 13: 'JHS 2', 14: 'JHS 3'
    };
    return classMap[classLevelId] || 'N/A';
  };

  if (loading) {
    return <div className="container">Loading dashboard data...</div>;
  }

  if (error) {
    return (
      <div className="container">
        <div className="card">
          <div className="error">{error}</div>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {user && (
        <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)', color: 'white' }}>
          <h2 style={{ color: 'white', borderLeftColor: 'white' }}>Welcome back, {user.full_name}! 👋</h2>
          <p style={{ opacity: 0.9 }}>Role: {user.role.toUpperCase()} | School ID: {user.school_id}</p>
        </div>
      )}

      {/* Statistics Cards - These should always show numbers */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>{stats.totalStudents}</h3>
          <p>Total Students</p>
        </div>
        <div className="stat-card">
          <h3>{stats.totalPresent}</h3>
          <p>Present Today ✅</p>
        </div>
        <div className="stat-card">
          <h3>{stats.totalAbsent}</h3>
          <p>Absent Today ❌</p>
        </div>
        <div className="stat-card">
          <h3>{stats.totalLate}</h3>
          <p>Late Today ⏰</p>
        </div>
        <div className="stat-card">
          <h3>{stats.attendanceRate}%</h3>
          <p>Attendance Rate</p>
        </div>
      </div>

      {/* Today's Attendance List */}
      <div className="card">
        <h3>📊 Today's Attendance List - {new Date().toLocaleDateString()}</h3>
        {todayAttendance.length === 0 ? (
          <p>No attendance recorded for today. Go to the Attendance page to mark attendance.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#1e3c72', color: 'white' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Student Name</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Admission No</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Class</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {todayAttendance.map(record => (
                  <tr key={record.id} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '8px' }}><strong>{record.full_name}</strong></td>
                    <td style={{ padding: '8px' }}>{record.admission_number}</td>
                    <td style={{ padding: '8px' }}>{getClassName(record.class_level_id)}</td>
                    <td style={{ padding: '8px' }}><span className={getStatusClass(record.status)}>{record.status.toUpperCase()}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recently Enrolled Students */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <h3 style={{ marginBottom: 0 }}>📋 Recently Enrolled Students</h3>
          <button onClick={() => window.print()} style={{ background: '#2ecc71', padding: '0.5rem 1rem', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>
            🖨️ Print List
          </button>
        </div>
        {recentStudents.length === 0 ? (
          <p>No students added yet. Click "Add Student" to get started.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#1e3c72', color: 'white' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Admission No</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Student Name</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Class</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Parent Contact</th>
                </tr>
              </thead>
              <tbody>
                {recentStudents.map(student => (
                  <tr key={student.id} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '8px' }}>{student.admission_number}</td>
                    <td style={{ padding: '8px' }}>{student.full_name}</td>
                    <td style={{ padding: '8px' }}>{getClassName(student.class_level_id)}</td>
                    <td style={{ padding: '8px' }}>{student.parent_phone || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
