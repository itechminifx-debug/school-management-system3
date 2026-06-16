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
  const [error, setError] = useState('');
  const [savedAttendance, setSavedAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const apiUrl = 'https://school-management-api-5mml.onrender.com';

  useEffect(() => {
    fetchClassLevels();
    fetchAllStudents();
  }, []);

  useEffect(() => {
    if (selectedClass && students.length > 0) {
      const filtered = students.filter(s => s.class_level_id === parseInt(selectedClass));
      setFilteredStudents(filtered);
    } else {
      setFilteredStudents([]);
    }
  }, [selectedClass, students]);

  useEffect(() => {
    if (filteredStudents.length > 0) {
      fetchTodayAttendance();
    } else {
      setSavedAttendance([]);
      setAttendance({});
    }
  }, [date, filteredStudents]);

  const fetchClassLevels = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${apiUrl}/api/class-levels`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClassLevels(response.data.classLevels);
      if (response.data.classLevels.length > 0) {
        setSelectedClass(response.data.classLevels[0].id.toString());
      }
    } catch (error) {
      console.error('Error fetching class levels:', error);
    }
  };

  const fetchAllStudents = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${apiUrl}/api/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(response.data.students);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayAttendance = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${apiUrl}/api/attendance/date/${date}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const allAttendance = response.data.attendance || [];
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
    setError('');

    try {
      const promises = Object.entries(attendance).map(([studentId, status]) =>
        axios.post(`${apiUrl}/api/attendance`, 
          { student_id: parseInt(studentId), date, status },
          { headers: { Authorization: `Bearer ${token}` } }
        )
      );
      
      await Promise.all(promises);
      setMessage('Attendance saved successfully!');
      setTimeout(() => setMessage(''), 3000);
      await fetchTodayAttendance();
    } catch (err) {
      setError('Error saving attendance');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAttendance = async (attendanceId, studentName, status, recordDate) => {
    if (!window.confirm(`Delete ${status.toUpperCase()} record for ${studentName} on ${recordDate}? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(attendanceId);
    const token = localStorage.getItem('token');
    
    try {
      await axios.delete(`${apiUrl}/api/attendance/${attendanceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage(`Attendance record for ${studentName} has been deleted!`);
      await fetchTodayAttendance();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Failed to delete attendance record');
      setTimeout(() => setError(''), 3000);
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusClass = (status) => {
    return `status-${status}`;
  };

  const getClassName = (classLevelId) => {
    const classLevel = classLevels.find(c => c.id === classLevelId);
    return classLevel ? classLevel.name : 'Select Class';
  };

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  return (
    <div className="container">
      <div className="card">
        <h2>Mark Attendance</h2>
        {message && <div className="success">{message}</div>}
        {error && <div className="error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ fontWeight: '600', marginRight: '0.5rem' }}>Select Class:</label>
              <select 
                value={selectedClass} 
                onChange={(e) => setSelectedClass(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '8px', minWidth: '150px' }}
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
              Students: {filteredStudents.length}
            </div>
          </div>
          
          {filteredStudents.length === 0 && (
            <div className="error" style={{ textAlign: 'center', marginBottom: '1rem' }}>
              No students found in {getClassName(parseInt(selectedClass))}.
            </div>
          )}
          
          {filteredStudents.length > 0 && (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#1e3c72', color: 'white' }}>
                      <th style={{ padding: '10px' }}>Admission No</th>
                      <th style={{ padding: '10px' }}>Student Name</th>
                      <th style={{ padding: '10px' }}>Status</th>
                      <th style={{ padding: '10px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map(student => {
                      const currentStatus = attendance[student.id] || 'present';
                      const existingRecord = savedAttendance.find(r => r.student_id === student.id);
                      
                      return (
                        <tr key={student.id} style={{ borderBottom: '1px solid #ddd' }}>
                          <td style={{ padding: '8px' }}>{student.admission_number}</td>
                          <td style={{ padding: '8px' }}><strong>{student.full_name}</strong></td>
                          <td style={{ padding: '8px' }}>
                            <select 
                              onChange={(e) => handleStatusChange(student.id, e.target.value)} 
                              value={currentStatus}
                              style={{ padding: '0.5rem', borderRadius: '8px', cursor: 'pointer', minWidth: '120px' }}
                            >
                              <option value="present"> Present</option>
                              <option value="absent"> Absent</option>
                              <option value="late"> Late</option>
                              <option value="excused"> Excused</option>
                            </select>
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            {existingRecord && (
                              <button
                                type="button"
                                onClick={() => handleDeleteAttendance(
                                  existingRecord.id, 
                                  student.full_name, 
                                  existingRecord.status,
                                  new Date(existingRecord.date).toLocaleDateString()
                                )}
                                disabled={deletingId === existingRecord.id}
                                style={{
                                  background: '#dc3545',
                                  padding: '4px 12px',
                                  fontSize: '0.75rem',
                                  opacity: deletingId === existingRecord.id ? 0.6 : 1,
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  color: 'white'
                                }}
                              >
                                {deletingId === existingRecord.id ? '...' : 'Delete'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              <button type="submit" disabled={saving} style={{ marginTop: '1.5rem' }}>
                {saving ? 'Saving...' : 'Save Attendance'}
              </button>
            </>
          )}
        </form>
      </div>

      {savedAttendance.length > 0 && (
        <div className="card">
          <h3>Attendance Summary for {date}</h3>
          
          <div className="stats-grid" style={{ marginBottom: '1rem' }}>
            <div className="stat-card">
              <h3 style={{ color: '#10b981' }}>{savedAttendance.filter(a => a.status === 'present').length}</h3>
              <p>Present</p>
            </div>
            <div className="stat-card">
              <h3 style={{ color: '#ef4444' }}>{savedAttendance.filter(a => a.status === 'absent').length}</h3>
              <p>Absent</p>
            </div>
            <div className="stat-card">
              <h3 style={{ color: '#f59e0b' }}>{savedAttendance.filter(a => a.status === 'late').length}</h3>
              <p>Late</p>
            </div>
            <div className="stat-card">
              <h3 style={{ color: '#8b5cf6' }}>{savedAttendance.filter(a => a.status === 'excused').length}</h3>
              <p>Excused</p>
            </div>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#1e3c72', color: 'white' }}>
                  <th style={{ padding: '10px' }}>Student Name</th>
                  <th style={{ padding: '10px' }}>Admission No</th>
                  <th style={{ padding: '10px' }}>Class</th>
                  <th style={{ padding: '10px' }}>Status</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {savedAttendance.map(record => (
                  <tr key={record.id} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '8px' }}><strong>{record.full_name}</strong></td>
                    <td style={{ padding: '8px' }}>{record.admission_number}</td>
                    <td style={{ padding: '8px' }}>{getClassName(record.class_level_id)}</td>
                    <td style={{ padding: '8px' }}>
                      <span className={getStatusClass(record.status)}>
                        {record.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleDeleteAttendance(
                          record.id, 
                          record.full_name, 
                          record.status,
                          new Date(record.date).toLocaleDateString()
                        )}
                        disabled={deletingId === record.id}
                        style={{
                          background: '#dc3545',
                          padding: '4px 12px',
                          fontSize: '0.75rem',
                          opacity: deletingId === record.id ? 0.6 : 1,
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          color: 'white'
                        }}
                      >
                        {deletingId === record.id ? '...' : 'Delete'}
                      </button>
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
