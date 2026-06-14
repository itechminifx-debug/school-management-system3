import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Attendance() {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [classLevels, setClassLevels] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [attendance, setAttendance] = useState({});
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [message, setMessage] = useState('');
  const [savedAttendance, setSavedAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchClassLevels();
    fetchStudents();
  }, []);

  useEffect(() => {
    if (students.length > 0) {
      filterStudentsByClass();
    }
  }, [selectedClass, students]);

  useEffect(() => {
    if (filteredStudents.length > 0) {
      fetchTodayAttendance();
    }
  }, [date, filteredStudents]);

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

  const fetchStudents = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get('http://localhost:5000/api/students', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(response.data.students);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterStudentsByClass = () => {
    if (selectedClass) {
      setFilteredStudents(students.filter(s => s.class_level_id === parseInt(selectedClass)));
    } else if (classLevels.length > 0) {
      // Default to first class if none selected
      setSelectedClass(classLevels[0].id.toString());
      setFilteredStudents(students.filter(s => s.class_level_id === classLevels[0].id));
    } else {
      setFilteredStudents(students);
    }
  };

  const fetchTodayAttendance = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`http://localhost:5000/api/attendance/date/${date}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const allAttendance = response.data.attendance;
      // Filter attendance for current class
      const classAttendance = allAttendance.filter(record => 
        filteredStudents.some(s => s.id === record.student_id)
      );
      setSavedAttendance(classAttendance);
      
      const attendanceMap = {};
      classAttendance.forEach(record => {
        attendanceMap[record.student_id] = record.status;
      });
      
      filteredStudents.forEach(student => {
        if (!attendanceMap[student.id]) {
          attendanceMap[student.id] = 'present';
        }
      });
      
      setAttendance(attendanceMap);
    } catch (error) {
      const defaultAttendance = {};
      filteredStudents.forEach(student => {
        defaultAttendance[student.id] = 'present';
      });
      setAttendance(defaultAttendance);
      setSavedAttendance([]);
    }
  };

  const handleStatusChange = (studentId, status) => {
    setAttendance({ ...attendance, [studentId]: status });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    setSaving(true);

    try {
      const promises = Object.entries(attendance).map(([studentId, status]) =>
        axios.post('http://localhost:5000/api/attendance', 
          { student_id: parseInt(studentId), date, status },
          { headers: { Authorization: `Bearer ${token}` } }
        )
      );
      
      await Promise.all(promises);
      setMessage('Attendance saved successfully!');
      setTimeout(() => setMessage(''), 3000);
      await fetchTodayAttendance();
      
    } catch (error) {
      console.error('Error saving attendance:', error);
      setMessage('Error saving attendance');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const getStatusClass = (status) => {
    return `status-${status}`;
  };

  const getClassName = (classLevelId) => {
    const classLevel = classLevels.find(c => c.id === classLevelId);
    return classLevel ? classLevel.name : 'N/A';
  };

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  return (
    <div className="container">
      <div className="card">
        <h2>📋 Mark Attendance</h2>
        {message && <div className="success">{message}</div>}
        
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ fontWeight: '600', marginRight: '0.5rem' }}>Select Class:</label>
              <select 
                value={selectedClass} 
                onChange={(e) => setSelectedClass(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '8px' }}
              >
                {classLevels.map(classLevel => (
                  <option key={classLevel.id} value={classLevel.id}>
                    {classLevel.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={{ fontWeight: '600', marginRight: '0.5rem' }}>Select Date:</label>
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)} 
                required 
                style={{ padding: '0.5rem', borderRadius: '8px' }}
              />
            </div>
            
            <div className="success" style={{ margin: 0, padding: '0.3rem 1rem' }}>
              👨‍🎓 Students: {filteredStudents.length}
            </div>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Admission No</th>
                  <th>Student Name</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(student => (
                  <tr key={student.id}>
                    <td>{student.admission_number}</td>
                    <td><strong>{student.full_name}</strong></td>
                    <td>
                      <select 
                        onChange={(e) => handleStatusChange(student.id, e.target.value)} 
                        value={attendance[student.id] || 'present'}
                        style={{ padding: '0.5rem', borderRadius: '8px', cursor: 'pointer' }}
                      >
                        <option value="present">✅ Present</option>
                        <option value="absent">❌ Absent</option>
                        <option value="late">⏰ Late</option>
                        <option value="excused">📝 Excused</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <button type="submit" disabled={saving}>
            {saving ? 'Saving...' : '💾 Save Attendance'}
          </button>
        </form>
      </div>

      {savedAttendance.length > 0 && (
        <div className="card">
          <h3>📊 Attendance Summary for {date} - {getClassName(parseInt(selectedClass))}</h3>
          
          <div className="stats-grid">
            <div className="stat-card">
              <h3>{savedAttendance.filter(a => a.status === 'present').length}</h3>
              <p>Present ✅</p>
            </div>
            <div className="stat-card">
              <h3>{savedAttendance.filter(a => a.status === 'absent').length}</h3>
              <p>Absent ❌</p>
            </div>
            <div className="stat-card">
              <h3>{savedAttendance.filter(a => a.status === 'late').length}</h3>
              <p>Late ⏰</p>
            </div>
            <div className="stat-card">
              <h3>{savedAttendance.filter(a => a.status === 'excused').length}</h3>
              <p>Excused 📝</p>
            </div>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Admission No</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {savedAttendance.map(record => (
                  <tr key={record.id}>
                    <td>{record.full_name}</td>
                    <td>{record.admission_number}</td>
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
        </div>
      )}
    </div>
  );
}

export default Attendance;