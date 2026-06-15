import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement } from 'chart.js';
import { Bar, Pie, Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement);

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
  const [classData, setClassData] = useState([]);
  const [weeklyAttendance, setWeeklyAttendance] = useState([]);
  const [feeData, setFeeData] = useState({ collected: 0, expected: 0 });

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
    fetchClassDistribution();
    fetchWeeklyAttendance();
    fetchFeeStats();
  }, []);

  const fetchDashboardData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please login again');
      setLoading(false);
      return;
    }

    const config = { headers: { Authorization: `Bearer ${token}` } };

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

  const fetchClassDistribution = async () => {
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };
    
    try {
      const response = await axios.get(`${apiUrl}/api/students`, config);
      const students = response.data.students || [];
      
      const classCount = {};
      students.forEach(student => {
        const className = getClassNameFromId(student.class_level_id);
        classCount[className] = (classCount[className] || 0) + 1;
      });
      
      const sortedData = Object.entries(classCount)
        .sort((a, b) => {
          const order = ['Crèche', 'Nursery 1', 'Nursery 2', 'KG 1', 'KG 2', 'Basic 1', 'Basic 2', 'Basic 3', 'Basic 4', 'Basic 5', 'Basic 6', 'JHS 1', 'JHS 2', 'JHS 3'];
          return order.indexOf(a[0]) - order.indexOf(b[0]);
        })
        .map(([name, count]) => ({ name, count }));
      
      setClassData(sortedData);
    } catch (error) {
      console.error('Error fetching class distribution:', error);
    }
  };

  const fetchWeeklyAttendance = async () => {
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };
    
    try {
      const weeklyData = [];
      const today = new Date();
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        try {
          const response = await axios.get(`${apiUrl}/api/attendance/date/${dateStr}`, config);
          const attendance = response.data.attendance || [];
          const presentCount = attendance.filter(a => a.status === 'present').length;
          const absentCount = attendance.filter(a => a.status === 'absent').length;
          
          weeklyData.push({
            date: dateStr,
            day: date.toLocaleDateString('en-US', { weekday: 'short' }),
            present: presentCount,
            absent: absentCount
          });
        } catch (error) {
          weeklyData.push({
            date: dateStr,
            day: date.toLocaleDateString('en-US', { weekday: 'short' }),
            present: 0,
            absent: 0
          });
        }
      }
      
      setWeeklyAttendance(weeklyData);
    } catch (error) {
      console.error('Error fetching weekly attendance:', error);
    }
  };

  const fetchFeeStats = async () => {
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };
    
    try {
      const response = await axios.get(`${apiUrl}/api/school-fees/summary/4/Term%201/2026`, config);
      if (response.data) {
        setFeeData({
          collected: response.data.total_collected || 0,
          expected: response.data.total_expected || 0
        });
      }
    } catch (error) {
      console.error('Error fetching fee stats:', error);
    }
  };

  const getClassNameFromId = (classLevelId) => {
    const classMap = {
      1: 'Crèche', 2: 'Nursery 1', 3: 'Nursery 2',
      4: 'KG 1', 5: 'KG 2', 6: 'Basic 1', 7: 'Basic 2', 8: 'Basic 3',
      9: 'Basic 4', 10: 'Basic 5', 11: 'Basic 6', 12: 'JHS 1', 13: 'JHS 2', 14: 'JHS 3'
    };
    return classMap[classLevelId] || 'Other';
  };

  const getClassName = (classLevelId) => {
    const classMap = {
      4: 'KG 1', 5: 'KG 2', 6: 'Basic 1', 7: 'Basic 2', 8: 'Basic 3',
      9: 'Basic 4', 10: 'Basic 5', 11: 'Basic 6', 12: 'JHS 1', 13: 'JHS 2', 14: 'JHS 3'
    };
    return classMap[classLevelId] || 'N/A';
  };

  const getStatusClass = (status) => {
    return `status-${status}`;
  };

  const barChartData = {
    labels: classData.map(c => c.name),
    datasets: [{
      label: 'Number of Students',
      data: classData.map(c => c.count),
      backgroundColor: 'rgba(99, 102, 241, 0.7)',
      borderColor: 'rgba(99, 102, 241, 1)',
      borderWidth: 1,
      borderRadius: 8,
    }],
  };

  const attendanceLineData = {
    labels: weeklyAttendance.map(w => w.day),
    datasets: [
      {
        label: 'Present',
        data: weeklyAttendance.map(w => w.present),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Absent',
        data: weeklyAttendance.map(w => w.absent),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const pieChartData = {
    labels: ['Present Today', 'Absent Today', 'Late Today'],
    datasets: [{
      data: [stats.totalPresent, stats.totalAbsent, stats.totalLate],
      backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
      borderColor: ['#fff', '#fff', '#fff'],
      borderWidth: 2,
    }],
  };

  const doughnutChartData = {
    labels: ['Collected', 'Outstanding'],
    datasets: [{
      data: [feeData.collected, feeData.expected - feeData.collected],
      backgroundColor: ['#10b981', '#ef4444'],
      borderColor: ['#fff', '#fff'],
      borderWidth: 2,
    }],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { position: 'top' }, title: { display: false } },
    scales: { y: { beginAtZero: true, title: { display: true, text: 'Number of Students' } }, x: { title: { display: true, text: 'Class Level' } } },
  };

  const attendanceLineOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { position: 'top' }, title: { display: false } },
    scales: { y: { beginAtZero: true, title: { display: true, text: 'Number of Students' } }, x: { title: { display: true, text: 'Day of Week' } } },
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { position: 'bottom' } },
  };

  if (loading) {
    return <div className="container">Loading dashboard data...</div>;
  }

  if (error) {
    return (
      <div className="container">
        <div className="card"><div className="error">{error}</div><button onClick={() => window.location.reload()}>Retry</button></div>
      </div>
    );
  }

  return (
    <div className="container">
      {user && (
        <div className="card" style={{ textAlign: 'center', background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', color: 'white' }}>
          <h2 style={{ color: 'white', borderLeftColor: 'white' }}>Welcome back, {user.full_name}! 👋</h2>
          <p style={{ opacity: 0.9 }}>Role: {user.role.toUpperCase()} | School ID: {user.school_id}</p>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card"><h3>{stats.totalStudents}</h3><p>Total Students</p></div>
        <div className="stat-card"><h3 style={{ color: '#10b981' }}>{stats.totalPresent}</h3><p>Present Today ✅</p></div>
        <div className="stat-card"><h3 style={{ color: '#ef4444' }}>{stats.totalAbsent}</h3><p>Absent Today ❌</p></div>
        <div className="stat-card"><h3 style={{ color: '#f59e0b' }}>{stats.totalLate}</h3><p>Late Today ⏰</p></div>
        <div className="stat-card"><h3>{stats.attendanceRate}%</h3><p>Attendance Rate</p></div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div className="card"><h3>📊 Student Enrollment by Class</h3>{classData.length > 0 ? <Bar data={barChartData} options={barChartOptions} height={250} /> : <p>No student data available</p>}</div>
        <div className="card"><h3>📈 Weekly Attendance Trend</h3>{weeklyAttendance.length > 0 ? <Line data={attendanceLineData} options={attendanceLineOptions} height={250} /> : <p>No attendance data available</p>}</div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        <div className="card"><h3>🥧 Today's Attendance Distribution</h3><Pie data={pieChartData} options={pieChartOptions} height={250} /></div>
        <div className="card">
          <h3>💰 School Fees Collection</h3>
          <Doughnut data={doughnutChartData} options={pieChartOptions} height={250} />
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <p><strong>Total Expected:</strong> ₵{feeData.expected.toLocaleString()}</p>
            <p><strong>Total Collected:</strong> ₵{feeData.collected.toLocaleString()}</p>
            <p><strong>Outstanding:</strong> ₵{(feeData.expected - feeData.collected).toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>📋 Today's Attendance List - {new Date().toLocaleDateString()}</h3>
        {todayAttendance.length === 0 ? <p>No attendance recorded for today.</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: '#6366f1', color: 'white' }}><th>Student Name</th><th>Admission No</th><th>Class</th><th>Status</th></tr></thead>
              <tbody>{todayAttendance.map(record => (<tr key={record.id}><td><strong>{record.full_name}</strong></td><td>{record.admission_number}</td><td>{getClassName(record.class_level_id)}</td><td><span className={getStatusClass(record.status)}>{record.status.toUpperCase()}</span></td></tr>))}</tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <h3 style={{ marginBottom: 0 }}>📋 Recently Enrolled Students</h3>
          <button onClick={() => window.print()} style={{ background: '#10b981', padding: '0.5rem 1rem', border: 'none', borderRadius: '8px', cursor: 'pointer', color: 'white' }}>🖨️ Print List</button>
        </div>
        {recentStudents.length === 0 ? <p>No students added yet.</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: '#6366f1', color: 'white' }}><th>Admission No</th><th>Student Name</th><th>Class</th><th>Parent Contact</th></tr></thead>
              <tbody>{recentStudents.map(student => (<tr key={student.id}><td>{student.admission_number}</td><td>{student.full_name}</td><td>{getClassName(student.class_level_id)}</td><td>{student.parent_phone || '-'}</td></tr>))}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;