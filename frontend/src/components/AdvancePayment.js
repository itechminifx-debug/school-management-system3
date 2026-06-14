import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AdvancePayment() {
  const [classLevels, setClassLevels] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const apiUrl = 'https://school-management-api-5mml.onrender.com';

  useEffect(() => {
    fetchClassLevels();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchStudentsByClass();
    }
  }, [selectedClass]);

  const fetchClassLevels = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${apiUrl}/api/class-levels`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Class levels:', response.data);
      setClassLevels(response.data.classLevels);
      if (response.data.classLevels.length > 0) {
        setSelectedClass(response.data.classLevels[0].id.toString());
      }
    } catch (error) {
      console.error('Error fetching class levels:', error);
      setError('Failed to load class levels: ' + (error.response?.data?.message || error.message));
    }
  };

  const fetchStudentsByClass = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${apiUrl}/api/fees/advance/class/${selectedClass}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Students response:', response.data);
      setStudents(response.data.students || []);
      setError('');
    } catch (error) {
      console.error('Error fetching students:', error);
      setError('Failed to load students: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h2>💰 Advance Payment Management</h2>
        {error && <div className="error">{error}</div>}

        {/* Debug info */}
        <div style={{ background: '#f0f0f0', padding: '10px', marginBottom: '10px', fontSize: '12px' }}>
          <strong>Debug Info:</strong><br/>
          API URL: {apiUrl}<br/>
          Selected Class: {selectedClass}<br/>
          Students Count: {students.length}<br/>
          Token exists: {localStorage.getItem('token') ? 'Yes' : 'No'}
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1 }}>
            <label>Select Class:</label>
            <select 
              value={selectedClass} 
              onChange={(e) => setSelectedClass(e.target.value)} 
              style={{ width: '100%', padding: '0.5rem' }}
            >
              {classLevels.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>

        {loading && <p>Loading students...</p>}

        {students.length > 0 && (
          <div>
            <h3>Students in this class:</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#1e3c72', color: 'white' }}>
                  <th style={{ padding: '10px' }}>Admission No</th>
                  <th style={{ padding: '10px' }}>Student Name</th>
                  <th style={{ padding: '10px' }}>Balance</th>
                 </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id}>
                    <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{s.admission_number}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{s.full_name}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>₵{parseFloat(s.advance_balance || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && selectedClass && students.length === 0 && (
          <p>No students found in this class. Please add students first.</p>
        )}
      </div>
    </div>
  );
}

export default AdvancePayment;
