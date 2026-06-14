import React, { useState, useEffect } from 'react';
import axios from 'axios';

function StudentList() {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [classLevels, setClassLevels] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchClassLevels();
    fetchStudents();
  }, []);

  useEffect(() => {
    if (selectedClass && students.length > 0) {
      const filtered = students.filter(s => s.class_level_id === parseInt(selectedClass));
      setFilteredStudents(filtered);
    } else if (students.length > 0) {
      setFilteredStudents(students);
    }
  }, [selectedClass, students]);

  const fetchClassLevels = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get('https://school-management-api-5mml.onrender.com/api/class-levels', {
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

  const fetchStudents = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get('https://school-management-api-5mml.onrender.com/api/students', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(response.data.students);
      setErrorMsg('');
    } catch (err) {
      setErrorMsg('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const deleteStudent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this student?')) return;
    
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`https://school-management-api-5mml.onrender.com/api/students/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchStudents();
    } catch (err) {
      alert('Failed to delete student');
    }
  };

  const getClassName = (classLevelId) => {
    const classLevel = classLevels.find(c => c.id === classLevelId);
    return classLevel ? classLevel.name : 'Not Assigned';
  };

  if (loading) return <div className="container">Loading students...</div>;

  return (
    <div className="container">
      <div className="card">
        <h2>📚 Student List</h2>
        
        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontWeight: '600' }}>Filter by Class:</label>
          <select 
            value={selectedClass} 
            onChange={(e) => setSelectedClass(e.target.value)}
            style={{ padding: '0.5rem 1rem', borderRadius: '8px', minWidth: '200px' }}
          >
            {classLevels.map(classLevel => (
              <option key={classLevel.id} value={classLevel.id}>
                {classLevel.name}
              </option>
            ))}
          </select>
          
          <div className="success" style={{ margin: 0, padding: '0.3rem 1rem' }}>
            Total: {filteredStudents.length} student(s)
          </div>
        </div>
        
        {errorMsg && <div className="error">{errorMsg}</div>}
        
        {filteredStudents.length === 0 ? (
          <p>No students found in this class. Click "Add Student" to add students.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>Admission No</th>
                  <th>Full Name</th>
                  <th>Class</th>
                  <th>Parent Phone</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(student => (
                  <tr key={student.id}>
                    <td>{student.admission_number}</td>
                    <td>{student.full_name}</td>
                    <td><strong>{getClassName(student.class_level_id)}</strong></td>
                    <td>{student.parent_phone || '-'}</td>
                    <td>
                      <button 
                        onClick={() => deleteStudent(student.id)} 
                        style={{ background: '#dc3545', padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}
                      >
                        Delete
                      </button>
                    </td>
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

export default StudentList;
