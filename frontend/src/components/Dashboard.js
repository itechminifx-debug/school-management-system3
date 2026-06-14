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
    
    if (!token) {
      setError('Please login again');
      setLoading(false);
      return;
    }

    const config = { headers: { Authorization: `Bearer ${token}` } };
    const apiUrl = 'https://school-management-api-5mml.onrender.com';

    try {
      const studentsRes = await axios.get(`${apiUrl}/api/students`, config);
      const allStudents = studentsRes.data.students || [];
      const totalStudents = allStudents.length;
      setRecentStudents(allStudents.slice(0, 5));

      const today = new Date().toISOString().split('T')[0];
      try {
        const attendanceRes = await axios.get(`${apiUrl}/api/attendance/date/${today}`, config);
        const attendance = attendanceRes.data.attendance || [];
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
        console.log('No attendance records for today');
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
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status) => {
    return `status-${status}`;
  };

  const getClassName = (classLevelId) => {
    const classMap = {
      4: 'KG 1', 5: 'KG 2', 6: 'Basic 1', 7: 'Basic 2', 8: 'Basic 3',
      9: 'Basic 4', 10: 'Basic 5', 11: 'Basic 6', 12: 'JHS 1', 13: 'JHS 2', 14: 'JHS 3'
    };
    return classMap[classLevelId] || 'N/A';
  };

  if (loading) {
    return React.createElement('div', { className: 'container' }, 'Loading dashboard data...');
  }

  if (error) {
    return React.createElement('div', { className: 'container' },
      React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'error' }, error),
        React.createElement('button', { onClick: () => window.location.reload() }, 'Retry')
      )
    );
  }

  return React.createElement('div', { className: 'container' },
    user && React.createElement('div', { className: 'card', style: { textAlign: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' } },
      React.createElement('h2', { style: { color: 'white', borderLeftColor: 'white' } }, `Welcome back, ${user.full_name}! 👋`),
      React.createElement('p', { style: { opacity: 0.9 } }, `Role: ${user.role.toUpperCase()} | School ID: ${user.school_id}`)
    ),
    React.createElement('div', { className: 'stats-grid' },
      React.createElement('div', { className: 'stat-card' }, React.createElement('h3', null, stats.totalStudents), React.createElement('p', null, 'Total Students')),
      React.createElement('div', { className: 'stat-card' }, React.createElement('h3', null, stats.totalPresent), React.createElement('p', null, 'Present Today ✅')),
      React.createElement('div', { className: 'stat-card' }, React.createElement('h3', null, stats.totalAbsent), React.createElement('p', null, 'Absent Today ❌')),
      React.createElement('div', { className: 'stat-card' }, React.createElement('h3', null, stats.totalLate), React.createElement('p', null, 'Late Today ⏰')),
      React.createElement('div', { className: 'stat-card' }, React.createElement('h3', null, `${stats.attendanceRate}%`), React.createElement('p', null, 'Attendance Rate'))
    ),
    React.createElement('div', { className: 'card' },
      React.createElement('h3', null, `📊 Today's Attendance List - ${new Date().toLocaleDateString()}`),
      todayAttendance.length === 0 ? React.createElement('p', null, 'No attendance recorded for today.') :
        React.createElement('div', { style: { overflowX: 'auto' } },
          React.createElement('table', { className: 'attendance-table' },
            React.createElement('thead', null,
              React.createElement('tr', null,
                React.createElement('th', null, 'Student Name'),
                React.createElement('th', null, 'Admission No'),
                React.createElement('th', null, 'Class'),
                React.createElement('th', null, 'Status')
              )
            ),
            React.createElement('tbody', null,
              todayAttendance.map(record =>
                React.createElement('tr', { key: record.id },
                  React.createElement('td', null, React.createElement('strong', null, record.full_name)),
                  React.createElement('td', null, record.admission_number),
                  React.createElement('td', null, getClassName(record.class_level_id)),
                  React.createElement('td', null, React.createElement('span', { className: getStatusClass(record.status) }, record.status.toUpperCase()))
                )
              )
            )
          )
        )
    ),
    React.createElement('div', { className: 'card' },
      React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' } },
        React.createElement('h3', { style: { marginBottom: 0 } }, '📋 Recently Enrolled Students'),
        React.createElement('button', { onClick: () => window.print(), style: { background: '#48bb78', padding: '0.5rem 1rem' } }, '🖨️ Print Student List')
      ),
      recentStudents.length === 0 ? React.createElement('p', null, 'No students added yet.') :
        React.createElement('div', { style: { overflowX: 'auto' } },
          React.createElement('table', { className: 'student-table' },
            React.createElement('thead', null,
              React.createElement('tr', null,
                React.createElement('th', null, 'Admission No'),
                React.createElement('th', null, 'Student Name'),
                React.createElement('th', null, 'Class'),
                React.createElement('th', null, 'Parent Contact'),
                React.createElement('th', null, 'Address')
              )
            ),
            React.createElement('tbody', null,
              recentStudents.map(student =>
                React.createElement('tr', { key: student.id },
                  React.createElement('td', null, React.createElement('strong', null, student.admission_number)),
                  React.createElement('td', null, student.full_name),
                  React.createElement('td', null, React.createElement('span', { style: { background: '#667eea', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.8rem' } }, getClassName(student.class_level_id))),
                  React.createElement('td', null, student.parent_phone || '-'),
                  React.createElement('td', null, student.address || '-')
                )
              )
            )
          )
        )
    )
  );
}

export default Dashboard;
