import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Fees() {
  const [classLevels, setClassLevels] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [collection, setCollection] = useState({ collection: [], total_students: 0, total_paid: 0, total_collected: 0 });
  const [amounts, setAmounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  const apiUrl = 'https://school-management-api-5mml.onrender.com';

  useEffect(() => {
    fetchClassLevels();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchDailyCollection();
    }
  }, [selectedClass, selectedDate]);

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

  const fetchDailyCollection = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${apiUrl}/api/fees/daily/${selectedDate}/${selectedClass}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCollection(response.data);
      
      // Initialize amounts with existing payments
      const initialAmounts = {};
      response.data.collection.forEach(student => {
        if (student.paid) {
          initialAmounts[student.id] = student.amount;
        }
      });
      setAmounts(initialAmounts);
    } catch (error) {
      console.error('Error fetching collection:', error);
      setError('Failed to load collection data');
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (studentId, value) => {
    setAmounts(prev => ({ ...prev, [studentId]: value }));
  };

  const handleRecordPayment = async (studentId) => {
    const amount = amounts[studentId];
    if (!amount || amount <= 0) {
      setError('Please enter a valid amount');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      await axios.post(`${apiUrl}/api/fees/record`, {
        student_id: studentId,
        amount: parseFloat(amount),
        payment_method: 'cash',
        notes: `Feeding fee for ${selectedDate}`
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage(`Payment of ₵${amount} recorded successfully!`);
      setTimeout(() => setMessage(''), 3000);
      
      // Refresh collection
      await fetchDailyCollection();
    } catch (error) {
      setError('Failed to record payment');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Feeding Fee Collection Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #1e3c72; text-align: center; }
            h3 { text-align: center; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background: #1e3c72; color: white; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #888; }
            .summary { margin-top: 20px; padding: 10px; background: #f0f0f0; border-radius: 8px; }
          </style>
        </head>
        <body>
          <h1>🏫 Feeding Fee Collection Report</h1>
          <h3>Class: ${getClassName(parseInt(selectedClass))}</h3>
          <h3>Date: ${selectedDate}</h3>
          
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Admission No</th>
                <th>Student Name</th>
                <th>Amount Paid (₵)</th>
                <th>Receipt No</th>
              </tr>
            </thead>
            <tbody>
              ${collection.collection.filter(s => s.paid).map((student, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${student.admission_number}</td>
                  <td>${student.full_name}</td>
                  <td>${student.amount}</td>
                  <td>${student.receipt_number || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="summary">
            <strong>Summary:</strong><br/>
            Total Students in Class: ${collection.total_students}<br/>
            Students Who Paid: ${collection.total_paid}<br/>
            Total Collection: ₵${collection.total_collected}<br/>
            Not Paid: ${collection.total_students - collection.total_paid}
          </div>
          
          <div class="footer">
            Printed on: ${new Date().toLocaleString()}<br/>
            Generated by School Management System
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const getClassName = (id) => {
    const cls = classLevels.find(c => c.id === id);
    return cls ? cls.name : 'Select Class';
  };

  return (
    <div className="container">
      <div className="card">
        <h2>🍽️ Daily Feeding Fee Collection</h2>
        {message && <div className="success">{message}</div>}
        {error && <div className="error">{error}</div>}

        {/* Filters */}
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          flexWrap: 'wrap', 
          marginBottom: '1.5rem',
          padding: '1rem',
          background: '#f7fafc',
          borderRadius: '12px'
        }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.3rem' }}>Select Class:</label>
            <select 
              value={selectedClass} 
              onChange={(e) => setSelectedClass(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '8px' }}
            >
              {classLevels.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          
          <div style={{ flex: 1 }}>
            <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.3rem' }}>Select Date:</label>
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '8px' }}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button 
              onClick={handlePrint}
              style={{ background: '#2ecc71', padding: '0.5rem 1rem' }}
            >
              🖨️ Print Collection List
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
          <div className="stat-card">
            <h3>{collection.total_students}</h3>
            <p>Total Students</p>
          </div>
          <div className="stat-card">
            <h3>{collection.total_paid}</h3>
            <p>Paid Today</p>
          </div>
          <div className="stat-card">
            <h3>₵{collection.total_collected}</h3>
            <p>Total Collected</p>
          </div>
          <div className="stat-card">
            <h3>{collection.total_students - collection.total_paid}</h3>
            <p>Not Paid</p>
          </div>
        </div>

        {/* Collection Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="fee-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Admission No</th>
                  <th>Student Name</th>
                  <th>Amount (₵)</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {collection.collection.map((student, index) => (
                  <tr key={student.id} style={{ background: student.paid ? '#d4edda' : 'white' }}>
                    <td>{index + 1}</td>
                    <td>{student.admission_number}</td>
                    <td><strong>{student.full_name}</strong></td>
                    <td>
                      {student.paid ? (
                        <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>₵{student.amount}</span>
                      ) : (
                        <input
                          type="number"
                          placeholder="Amount"
                          value={amounts[student.id] || ''}
                          onChange={(e) => handleAmountChange(student.id, e.target.value)}
                          style={{ width: '100px', padding: '0.3rem' }}
                          min="0"
                          step="0.5"
                        />
                      )}
                    </td>
                    <td>
                      {student.paid ? (
                        <span className="status-present">PAID</span>
                      ) : (
                        <span className="status-absent">NOT PAID</span>
                      )}
                    </td>
                    <td>
                      {!student.paid && (
                        <button 
                          onClick={() => handleRecordPayment(student.id)} 
                          disabled={loading}
                          style={{ background: '#3498db', padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}
                        >
                          Record Payment
                        </button>
                      )}
                      {student.paid && (
                        <span style={{ fontSize: '0.7rem', color: '#666' }}>
                          Receipt: {student.receipt_number?.slice(-8)}
                        </span>
                      )}
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

export default Fees;
