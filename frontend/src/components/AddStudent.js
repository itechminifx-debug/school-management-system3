import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AddStudent() {
  const [formData, setFormData] = useState({
    admission_number: '',
    full_name: '',
    class_level_id: '',
    parent_phone: '',
    address: '',
    date_of_birth: ''
  });
  const [classLevels, setClassLevels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchClassLevels();
  }, []);

  const fetchClassLevels = async () => {
    const token = localStorage.getItem('token');
    const apiUrl = 'https://school-management-api-5mml.onrender.com';
    
    try {
      const response = await axios.get(`${apiUrl}/api/class-levels`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClassLevels(response.data.classLevels);
    } catch (error) {
      console.error('Error fetching class levels:', error);
      setError('Failed to load class levels');
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    const token = localStorage.getItem('token');
    const apiUrl = 'https://school-management-api-5mml.onrender.com';

    try {
      await axios.post(`${apiUrl}/api/students`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('Student added successfully!');
      setFormData({ 
        admission_number: '', 
        full_name: '', 
        class_level_id: '', 
        parent_phone: '', 
        address: '',
        date_of_birth: ''
      });
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add student');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Group class levels by category
  const nurseryClasses = classLevels.filter(c => c.category === 'Nursery');
  const kindergartenClasses = classLevels.filter(c => c.category === 'Kindergarten');
  const primaryClasses = classLevels.filter(c => c.category === 'Primary');
  const jhsClasses = classLevels.filter(c => c.category === 'JHS');

  return (
    <div className="container">
      <div className="card">
        <h2>➕ Add New Student</h2>
        {message && <div className="success">{message}</div>}
        {error && <div className="error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <input 
            type="text" 
            name="admission_number" 
            placeholder="Admission Number (e.g., 2024001)" 
            value={formData.admission_number} 
            onChange={handleChange} 
            required 
          />
          
          <input 
            type="text" 
            name="full_name" 
            placeholder="Full Name" 
            value={formData.full_name} 
            onChange={handleChange} 
            required 
          />
          
          <select 
            name="class_level_id" 
            value={formData.class_level_id} 
            onChange={handleChange} 
            required
          >
            <option value="">Select Class Level</option>
            
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
          
          <input 
            type="tel" 
            name="parent_phone" 
            placeholder="Parent Phone Number" 
            value={formData.parent_phone} 
            onChange={handleChange} 
          />
          
          <input 
            type="date" 
            name="date_of_birth" 
            placeholder="Date of Birth" 
            value={formData.date_of_birth} 
            onChange={handleChange} 
          />
          
          <textarea 
            name="address" 
            placeholder="Address" 
            value={formData.address} 
            onChange={handleChange} 
            rows="3"
          ></textarea>
          
          <button type="submit" disabled={loading}>
            {loading ? 'Adding...' : 'Add Student'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddStudent;
