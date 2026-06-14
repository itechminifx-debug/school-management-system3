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
  const [classLevels, setClassLevels] = useState([]);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    fetchClassLevels();
    fetchDashboardData();
  }, []);

  const fetchClassLevels = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get('http://localhost:5000/api/class-levels', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClassLevels(response.data.classLevels);
    } catch (error) {
      console.error('Error fetching class levels:', error);
    }
  };

  const getClassName = (classLevelId) => {
    if (!classLevelId) return 'Not Assigned';
    const classLevel = classLevels.find(c => c.id === classLevelId);
    return classLevel ? classLevel.name : 'Unknown';
  };

  const fetchDashboardData = async () => {
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      // Fetch students
      const studentsRes = await axios.get('http://localhost:5000/api/students', config);
      const totalStudents = studentsRes.data.students.length;
      setRecentStudents(studentsRes.data.students.slice(0, 5));

      // Fetch today's attendance
      const today = new Date().toISOString().split('T')[0];
      try {
        const attendanceRes = await axios.get(`http://localhost:5000/api/attendance/date/${today}`, config);
        const attendance = attendanceRes.data.attendance;
        setTodayAttendance(attendance);
        
        const presentCount = attendance.filter(a => a.status === 'present').length;
        const absentCount = attendance.filter(a => a.status === 'absent').length;
        const lateCount = attendance.filter(a => a.status === 'late').length;
        const attendanceRate = totalStudents > 0 ? ((presentCount / totalStudents) * 100).toFixed(1) : 0;
        
        setStats({
          totalStudents,
          totalPresent: presentCount,
          totalAbsent: absentCount,
          totalLate: lateCount,
          attendanceRate
        });
      } catch (attError) {
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
    }
  };

  const getStatusClass = (status) => {
    return `status-${status}`;
  };

  return (
    <div className="container">
      {user && (
        <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          <h2 style={{ color: 'white', borderLeftColor: 'white' }}>Welcome back, {user.full_name}! 👋</h2>
          <p style={{ opacity: 0.9 }}>Role: {user.role.toUpperCase()} | School ID: {user.school_id}</p>
        </div>
      )}

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
        <h3>📊 Today's Attendance List</h3>
        {todayAttendance.length === 0 ? (
          <p>No attendance recorded for today. Go to Attendance page to mark attendance.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Admission No</th>
                  <th>Class</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {todayAttendance.map(record => (
                  <tr key={record.id}>
                    <td><strong>{record.full_name}</strong></td>
                    <td>{record.admission_number}</td>
                    <td>{getClassName(record.class_level_id)}</td>
                    <td>
                      <span className={getStatusClass(record.status)}>
                        {record.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recently Enrolled Students with Class Column */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <h3 style={{ marginBottom: 0 }}>📋 Recently Enrolled Students</h3>
          <button 
            onClick={() => window.print()}
            style={{ 
              background: 'linear-gradient(135deg, #48bb78 0%, #38a169 100%)',
              padding: '0.5rem 1rem'
            }}
          >
            🖨️ Print Student List
          </button>
        </div>
        {recentStudents.length === 0 ? (
          <p>No students added yet. Click "Add Student" to get started.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Admission No</th>
                  <th>Student Name</th>
                  <th>Class</th>
                  <th>Parent Contact</th>
                  <th>Address</th>
                </tr>
              </thead>
              <tbody>
                {recentStudents.map(student => (
                  <tr key={student.id}>
                    <td><strong>{student.admission_number}</strong></td>
                    <td>{student.full_name}</td>
                    <td>
                      <span style={{ 
                        background: '#667eea', 
                        color: 'white', 
                        padding: '0.2rem 0.6rem', 
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        fontWeight: '600'
                      }}>
                        {getClassName(student.class_level_id)}
                      </span>
                    </td>
                    <td>{student.parent_phone || '-'}</td>
                    <td>{student.address || '-'}</td>
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