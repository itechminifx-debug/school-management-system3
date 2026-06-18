import React, { useState, useEffect } from 'react';
import axios from 'axios';

function UserManagement() {
  const [parents, setParents] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showCreateParent, setShowCreateParent] = useState(false);
  const [showEditParent, setShowEditParent] = useState(false);
  const [editingParent, setEditingParent] = useState(null);
  
  const [parentForm, setParentForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    student_ids: []
  });

  const apiUrl = 'https://school-management-api-5mml.onrender.com';

  useEffect(() => {
    fetchData();
    fetchStudents();
  }, []);

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    try {
      const parentsRes = await axios.get(`${apiUrl}/api/parent/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setParents(parentsRes.data.parents || []);
    } catch (error) {
      console.error('Error fetching parents:', error);
      setError('Failed to load parents data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${apiUrl}/api/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(response.data.students || []);
    } catch (error) {
      console.error('Error fetching students:', error);
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

  const handleEditParent = (parent) => {
    setEditingParent(parent);
    setParentForm({
      full_name: parent.full_name || '',
      email: parent.email || '',
      phone: parent.phone || '',
      address: parent.address || '',
      password: '',
      student_ids: parent.student_ids || []
    });
    setShowEditParent(true);
  };

  const handleUpdateParent = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    const token = localStorage.getItem('token');
    try {
      await axios.put(`${apiUrl}/api/parent/${editingParent.id}`, parentForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage('✅ Parent updated successfully!');
      setShowEditParent(false);
      setEditingParent(null);
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to update parent');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteParent = async (parentId, parentName) => {
    if (!window.confirm(`⚠️ Delete Parent Account\n\nAre you sure you want to delete ${parentName}?\n\nThis action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${apiUrl}/api/parent/${parentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage(`🗑️ Parent ${parentName} deleted successfully!`);
      fetchData();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setError('Failed to delete parent');
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

        {/* Create Parent Button */}
        <div style={{ marginBottom: '2rem' }}>
          <button 
            onClick={() => setShowCreateParent(!showCreateParent)}
            style={{ background: '#6366f1' }}
          >
            {showCreateParent ? 'Cancel' : '➕ Create Parent Account'}
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
                  <label>Password (min 6 chars):</label>
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

        {/* Edit Parent Modal */}
        {showEditParent && editingParent && (
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
              <h2>✏️ Edit Parent</h2>
              <form onSubmit={handleUpdateParent}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
                    <label>New Password (leave blank to keep current):</label>
                    <input
                      type="password"
                      name="password"
                      value={parentForm.password}
                      onChange={handleParentFormChange}
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
                    <label>Link to Students:</label>
                    <select
                      name="student_ids"
                      multiple
                      value={parentForm.student_ids}
                      onChange={handleParentFormChange}
                      style={{ height: '100px', width: '100%' }}
                    >
                      {students.map(student => (
                        <option key={student.id} value={student.id}>
                          {student.full_name} ({student.admission_number})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button type="submit" disabled={loading} style={{ flex: 1 }}>
                    {loading ? 'Saving...' : '💾 Save Changes'}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setShowEditParent(false); setEditingParent(null); }}
                    style={{ background: '#95a5a6' }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Parents List */}
        <h3>👨‍👩‍👧 Registered Parents</h3>
        {parents.length === 0 ? (
          <p>No parents registered yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#1e3c72', color: 'white' }}>
                  <th style={{ padding: '10px' }}>Name</th>
                  <th style={{ padding: '10px' }}>Email</th>
                  <th style={{ padding: '10px' }}>Phone</th>
                  <th style={{ padding: '10px' }}>Children</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {parents.map(parent => (
                  <tr key={parent.id}>
                    <td>{parent.full_name}</td>
                    <td>{parent.email}</td>
                    <td>{parent.phone || '-'}</td>
                    <td>{parent.children_count || 0}</td>
                    <td style={{ textAlign: 'center' }}>
                      <button 
                        onClick={() => handleEditParent(parent)}
                        style={{ background: '#f39c12', padding: '4px 12px', marginRight: '5px', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'white' }}
                      >
                        ✏️ Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteParent(parent.id, parent.full_name)}
                        style={{ background: '#dc3545', padding: '4px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', color: 'white' }}
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
    </div>
  );
}

export default UserManagement;
