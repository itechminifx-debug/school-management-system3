import React, { useState, useEffect } from 'react';
import axios from 'axios';

function StudentList() {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [classLevels, setClassLevels] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    admission_number: '',
    class_level_id: '',
    parent_phone: '',
    address: '',
    date_of_birth: ''
  });
  const [editMessage, setEditMessage] = useState('');
  const [editError, setEditError] = useState('');

  const apiUrl = 'https://school-management-api-5mml.onrender.com';

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

  const fetchStudents = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${apiUrl}/api/students`, {
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

  const handleEditClick = (student) => {
    setEditingStudent(student);
    setEditFormData({
      full_name: student.full_name || '',
      admission_number: student.admission_number || '',
      class_level_id: student.class_level_id || '',
      parent_phone: student.parent_phone || '',
      address: student.address || '',
      date_of_birth: student.date_of_birth ? student.date_of_birth.split('T')[0] : ''
    });
    setShowEditModal(true);
    setEditMessage('');
    setEditError('');
  };

  const handleEditChange = (e) => {
    setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    setEditMessage('');
    setEditError('');

    const token = localStorage.getItem('token');
    
    try {
      await axios.put(`${apiUrl}/api/students/${editingStudent.id}`, editFormData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setEditMessage('✅ Student updated successfully!');
      setTimeout(() => {
        setShowEditModal(false);
        setEditingStudent(null);
        fetchStudents();
      }, 1500);
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update student');
    }
  };

  const deleteStudent = async (id) => {
    if (!window.confirm('⚠️ Are you sure you want to delete this student?\n\nThis action cannot be undone.')) return;
    
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${apiUrl}/api/students/${id}`, {
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

  // Group class levels by category for edit modal
  const nurseryClasses = classLevels.filter(c => c.category === 'Nursery');
  const kindergartenClasses = classLevels.filter(c => c.category === 'Kindergarten');
  const primaryClasses = classLevels.filter(c => c.category === 'Primary');
  const jhsClasses = classLevels.filter(c => c.category === 'JHS');

  if (loading) return <div className="container">Loading students...</div>;

  return (
    <div className="container">
      <div className="card">
        <h2>📚 Student List</h2>
        
        {/* Class Filter */}
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
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#1e3c72', color: 'white' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Admission No</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Full Name</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Class</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Parent Phone</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Address</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(student => (
                  <tr key={student.id} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '8px' }}>{student.admission_number}</td>
                    <td style={{ padding: '8px' }}><strong>{student.full_name}</strong></td>
                    <td style={{ padding: '8px' }}>{getClassName(student.class_level_id)}</td>
                    <td style={{ padding: '8px' }}>{student.parent_phone || '-'}</td>
                    <td style={{ padding: '8px' }}>{student.address || '-'}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <button 
                        onClick={() => handleEditClick(student)}
                        style={{ 
                          background: '#f39c12', 
                          padding: '4px 12px', 
                          marginRight: '5px',
                          border: 'none', 
                          borderRadius: '4px', 
                          cursor: 'pointer',
                          color: 'white'
                        }}
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        onClick={() => deleteStudent(student.id)} 
                        style={{ 
                          background: '#dc3545', 
                          padding: '4px 12px', 
                          border: 'none', 
                          borderRadius: '4px', 
                          cursor: 'pointer',
                          color: 'white'
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </td>
                   </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Student Modal */}
      {showEditModal && editingStudent && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          width: '100%', 
          height: '100%', 
          background: 'rgba(0,0,0,0.5)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1000 
        }}>
          <div style={{ 
            background: 'white', 
            padding: '2rem', 
            borderRadius: '12px', 
            width: '500px', 
            maxWidth: '90%',
            maxHeight: '90%',
            overflowY: 'auto'
          }}>
            <h2 style={{ marginBottom: '1rem' }}>✏️ Edit Student</h2>
            {editMessage && <div className="success">{editMessage}</div>}
            {editError && <div className="error">{editError}</div>}
            
            <form onSubmit={handleUpdateStudent}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.3rem' }}>Admission Number:</label>
                <input
                  type="text"
                  name="admission_number"
                  value={editFormData.admission_number}
                  onChange={handleEditChange}
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #ddd' }}
                />
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.3rem' }}>Full Name:</label>
                <input
                  type="text"
                  name="full_name"
                  value={editFormData.full_name}
                  onChange={handleEditChange}
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #ddd' }}
                />
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.3rem' }}>Class Level:</label>
                <select
                  name="class_level_id"
                  value={editFormData.class_level_id}
                  onChange={handleEditChange}
                  required
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #ddd' }}
                >
                  <option value="">Select Class</option>
                  {nurseryClasses.length > 0 && (
                    <optgroup label="🍼 NURSERY">
                      {nurseryClasses.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </optgroup>
                  )}
                  {kindergartenClasses.length > 0 && (
                    <optgroup label="🎨 KINDERGARTEN">
                      {kindergartenClasses.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </optgroup>
                  )}
                  {primaryClasses.length > 0 && (
                    <optgroup label="📚 PRIMARY">
                      {primaryClasses.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </optgroup>
                  )}
                  {jhsClasses.length > 0 && (
                    <optgroup label="🏆 JHS">
                      {jhsClasses.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.3rem' }}>Parent Phone:</label>
                <input
                  type="tel"
                  name="parent_phone"
                  value={editFormData.parent_phone}
                  onChange={handleEditChange}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #ddd' }}
                />
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.3rem' }}>Date of Birth:</label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={editFormData.date_of_birth}
                  onChange={handleEditChange}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #ddd' }}
                />
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.3rem' }}>Address:</label>
                <textarea
                  name="address"
                  value={editFormData.address}
                  onChange={handleEditChange}
                  rows="2"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #ddd' }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button 
                  type="button"
                  onClick={() => { setShowEditModal(false); setEditingStudent(null); }}
                  style={{ background: '#95a5a6', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'white' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  style={{ background: '#2ecc71', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'white' }}
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentList;
