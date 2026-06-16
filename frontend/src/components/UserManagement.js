import React, { useState, useEffect } from 'react';
import axios from 'axios';

function UserManagement() {
  const [users, setUsers] = useState([]);
  const [parents, setParents] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showCreateParent, setShowCreateParent] = useState(false);
  const [showCreateTeacher, setShowCreateTeacher] = useState(false);
  
  // Parent form state
  const [parentForm, setParentForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    student_ids: []
  });

  // Teacher form state
  const [teacherForm, setTeacherForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    role: 'teacher'
  });

  const apiUrl = 'https://school-management-api-5mml.onrender.com';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    try {
      // Fetch parents
      const parentsRes = await axios.get(`${apiUrl}/api/parent/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setParents(parentsRes.data.parents || []);

      // Fetch students for parent linking
      const studentsRes = await axios.get(`${apiUrl}/api/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(studentsRes.data.students || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleParentFormChange = (e) => {
    const { name, value } = e.target;
    if (name === 'student_ids') {
      const options = e.target.options;
      const selected = [];
      for (let i = 0; i < options.length; i++) {
        if (options[i].selected) {
          selected.push(parseInt(options[i].value));
        }
      }
      setParentForm({ ...parentForm, student_ids: selected });
    } else {
      setParentForm({ ...parentForm, [name]: value });
    }
  };

  const handleTeacherFormChange = (e) => {
    setTeacherForm({ ...teacherForm, [e.target.name]: e.target.value });
  };

  const handleCreateParent = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    const token = localStorage.getItem('token');
    try {
      await axios.post(`${apiUrl}/api/parent/create`, parentForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage('✅ Parent account created successfully!');
      setParentForm({
        full_name: '',
        email: '',
        phone: '',
        address: '',
        password: '',
        student_ids: []
      });
      setShowCreateParent(false);
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create parent account');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    const token = localStorage.getItem('token');
    try {
      await axios.post(`${apiUrl}/api/auth/register`, {
        full_name: teacherForm.full_name,
        email: teacherForm.email,
        password: teacherForm.password,
        role: 'teacher',
        school_name: 'School',
        school_phone: teacherForm.phone || '',
        school_address: ''
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage('✅ Teacher account created successfully!');
      setTeacherForm({
        full_name: '',
        email: '',
        phone: '',
        password: '',
        role: 'teacher'
      });
      setShowCreateTeacher(false);
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to create teacher account');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  return (
    <div className="container">
      <div className="card">
        <h2>👥 User Management</h2>
        {message && <div className="success">{message}</div>}
        {error && <div className="error">{error}</div>}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setShowCreateParent(!showCreateParent)}
            style={{ background: '#6366f1' }}
          >
            {showCreateParent ? 'Cancel' : '➕ Create Parent Account'}
          </button>
          <button 
            onClick={() => setShowCreateTeacher(!showCreateTeacher)}
            style={{ background: '#10b981' }}
          >
            {showCreateTeacher ? 'Cancel' : '👨‍🏫 Create Teacher Account'}
          </button>
        </div>

        {/* Create Parent Form */}
        {showCreateParent && (
          <div className="card" style={{ background: '#f8fafc' }}>
            <h3>➕ Create Parent Account</h3>
            <form onSubmit={handleCreateParent}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div>
                  <label>Full Name:</label>
                  <input
                    type="text"
                    name="full_name"
                    value={parentForm.full_name}
                    onChange={handleParentFormChange}
                    required
                  />
                </div>
                <div>
                  <label>Email:</label>
                  <input
                    type="email"
                    name="email"
                    value={parentForm.email}
                    onChange={handleParentFormChange}
                    required
                  />
                </div>
                <div>
                  <label>Phone:</label>
                  <input
                    type="text"
                    name="phone"
                    value={parentForm.phone}
                    onChange={handleParentFormChange}
                  />
                </div>
                <div>
                  <label>Password:</label>
                  <input
                    type="password"
                    name="password"
                    value={parentForm.password}
                    onChange={handleParentFormChange}
                    required
                    minLength="6"
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label>Address:</label>
                  <textarea
                    name="address"
                    value={parentForm.address}
                    onChange={handleParentFormChange}
                    rows="2"
                  />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label>Link to Students (hold Ctrl to select multiple):</label>
                  <select
                    name="student_ids"
                    multiple
                    value={parentForm.student_ids}
                    onChange={handleParentFormChange}
                    style={{ height: '100px' }}
                  >
                    {students.map(student => (
                      <option key={student.id} value={student.id}>
                        {student.full_name} ({student.admission_number})
                      </option>
                    ))}
                  </select>
                  <small style={{ display: 'block', color: '#666' }}>
                    Hold Ctrl (Windows) or Cmd (Mac) to select multiple students
                  </small>
                </div>
              </div>
              <button type="submit" disabled={loading} style={{ marginTop: '1rem', width: '100%' }}>
                {loading ? 'Creating...' : 'Create Parent Account'}
              </button>
            </form>
          </div>
        )}

        {/* Create Teacher Form */}
        {showCreateTeacher && (
          <div className="card" style={{ background: '#f8fafc' }}>
            <h3>👨‍🏫 Create Teacher Account</h3>
            <form onSubmit={handleCreateTeacher}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div>
                  <label>Full Name:</label>
                  <input
                    type="text"
                    name="full_name"
                    value={teacherForm.full_name}
                    onChange={handleTeacherFormChange}
                    required
                  />
                </div>
                <div>
                  <label>Email:</label>
                  <input
                    type="email"
                    name="email"
                    value={teacherForm.email}
                    onChange={handleTeacherFormChange}
                    required
                  />
                </div>
                <div>
                  <label>Phone:</label>
                  <input
                    type="text"
                    name="phone"
                    value={teacherForm.phone}
                    onChange={handleTeacherFormChange}
                  />
                </div>
                <div>
                  <label>Password:</label>
                  <input
                    type="password"
                    name="password"
                    value={teacherForm.password}
                    onChange={handleTeacherFormChange}
                    required
                    minLength="6"
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} style={{ marginTop: '1rem', width: '100%' }}>
                {loading ? 'Creating...' : 'Create Teacher Account'}
              </button>
            </form>
          </div>
        )}

        {/* Parents List */}
        <h3>👨‍👩‍👧 Registered Parents</h3>
        {parents.length === 0 ? (
          <p>No parents registered yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%' }}>
              <thead>
                <tr style={{ background: '#1e3c72', color: 'white' }}>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Children</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {parents.map(parent => (
                  <tr key={parent.id}>
                    <td>{parent.full_name}</td>
                    <td>{parent.email}</td>
                    <td>{parent.phone || '-'}</td>
                    <td>{parent.children_count || 0}</td>
                    <td>{new Date(parent.created_at).toLocaleDateString()}</td>
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

export default UserManagement;
