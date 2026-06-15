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
  const [showRecent, setShowRecent] = useState(false);
  const [recentPayments, setRecentPayments] = useState([]);
  
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
      setError('Failed to load class levels');
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
      const initialAmounts = {};
      response.data.collection.forEach(student => {
        if (student.paid) {
          initialAmounts[student.id] = student.amount;
        }
      });
      setAmounts(initialAmounts);
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to load collection');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentPayments = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${apiUrl}/api/fees/recent?limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecentPayments(response.data.recent_payments);
    } catch (error) {
      console.error('Error:', error);
    }
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
      
      setMessage(`✅ Payment of ₵${amount} recorded successfully!`);
      setTimeout(() => setMessage(''), 3000);
      await fetchDailyCollection();
      if (showRecent) await fetchRecentPayments();
    } catch (error) {
      setError('Failed to record payment');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleUndoPayment = async (paymentId, studentName, amount) => {
    if (!window.confirm(`⚠️ UNDO PAYMENT\n\nAre you sure you want to undo the payment of ₵${amount} for ${studentName}?\n\nThis action cannot be undone.`)) {
      return;
    }
    
    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      await axios.delete(`${apiUrl}/api/fees/payment/${paymentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage(`↶ Payment of ₵${amount} for ${studentName} has been undone!`);
      setTimeout(() => setMessage(''), 3000);
      await fetchDailyCollection();
      if (showRecent) await fetchRecentPayments();
    } catch (error) {
      setError('Failed to undo payment');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleShowRecent = async () => {
    const newState = !showRecent;
    setShowRecent(newState);
    if (newState) await fetchRecentPayments();
  };

  const handlePrint = () => {
    const className = classLevels.find(c => c.id === parseInt(selectedClass))?.name || '';
    const paidStudents = collection.collection.filter(s => s.paid);
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Feeding Fee Report - ${className}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; }
            h1 { color: #1e3c72; text-align: center; }
            .header { text-align: center; margin-bottom: 30px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background: #1e3c72; color: white; }
            .summary { margin-top: 20px; padding: 15px; background: #f0f4f8; border-radius: 8px; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #888; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🏫 GREENWOOD HIGH SCHOOL</h1>
            <h3>DAILY FEEDING FEE COLLECTION REPORT</h3>
          </div>
          <h3>Class: ${className}</h3>
          <h3>Date: ${selectedDate}</h3>
          <table>
            <thead>
              <tr><th>#</th><th>Admission No</th><th>Student Name</th><th>Amount (₵)</th><th>Receipt No</th></tr>
            </thead>
            <tbody>
              ${paidStudents.map((s, i) => `
                <tr>
                  <td>${i+1}</td>
                  <td>${s.admission_number}</td>
                  <td>${s.full_name}</td>
                  <td style="text-align: center; font-weight: bold;">₵${s.amount}</td>
                  <td>${s.receipt_number || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="summary">
            <strong>📊 SUMMARY</strong><br>
            Total Students in Class: ${collection.total_students}<br>
            Students Who Paid: ${collection.total_paid}<br>
            Students Not Paid: ${collection.total_students - collection.total_paid}<br>
            <strong>Total Collection: ₵${collection.total_collected}</strong>
          </div>
          <div class="footer">
            Printed on: ${new Date().toLocaleString()}<br>
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
          
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
            <button onClick={handlePrint} style={{ background: '#2ecc71', padding: '0.5rem 1rem' }}>
              🖨️ Print Collection List
            </button>
            <button onClick={handleShowRecent} style={{ background: '#f39c12', padding: '0.5rem 1rem' }}>
              {showRecent ? 'Hide Recent' : '📋 Show Recent Payments'}
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
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#1e3c72', color: 'white' }}>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Admission No</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Student Name</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Amount (₵)</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left' }}>Receipt No</th>
                  <th style={{ padding: '12px', textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {collection.collection.map((student) => (
                  <tr key={student.id} style={{ background: student.paid ? '#d4edda' : 'white' }}>
                    <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>{student.admission_number}</td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}><strong>{student.full_name}</strong></td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>
                      {student.paid ? (
                        <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>₵{student.amount}</span>
                      ) : (
                        <input
                          type="number"
                          placeholder="Enter amount"
                          value={amounts[student.id] || ''}
                          onChange={(e) => setAmounts({...amounts, [student.id]: e.target.value})}
                          style={{ width: '100px', padding: '5px', borderRadius: '4px', border: '1px solid #ddd' }}
                          min="0"
                          step="0.5"
                        />
                      )}
                    </td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>
                      {student.paid ? (
                        <span className="status-present">✓ PAID</span>
                      ) : (
                        <span className="status-absent">✗ NOT PAID</span>
                      )}
                    </td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>
                      {student.paid ? (student.receipt_number?.slice(-8) || 'N/A') : '-'}
                    </td>
                    <td style={{ padding: '10px', borderBottom: '1px solid #ddd', textAlign: 'center' }}>
                      {!student.paid ? (
                        <button 
                          onClick={() => handleRecordPayment(student.id)} 
                          disabled={loading}
                          style={{ 
                            background: '#3498db', 
                            color: 'white',
                            padding: '5px 12px',
                            borderRadius: '5px',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          💰 Record
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleUndoPayment(student.payment_id, student.full_name, student.amount)}
                          style={{ 
                            background: '#e74c3c', 
                            color: 'white',
                            padding: '5px 12px',
                            borderRadius: '5px',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                          title="Undo this payment"
                        >
                          ↶ Undo / Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Recent Payments Panel for Undo */}
        {showRecent && (
          <div style={{ marginTop: '2rem' }}>
            <div className="card">
              <h3>🔄 Recent Payments (Click Undo to reverse)</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f39c12', color: 'white' }}>
                      <th style={{ padding: '10px' }}>Time</th>
                      <th style={{ padding: '10px' }}>Student Name</th>
                      <th style={{ padding: '10px' }}>Class</th>
                      <th style={{ padding: '10px' }}>Amount</th>
                      <th style={{ padding: '10px' }}>Date</th>
                      <th style={{ padding: '10px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPayments.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>No recent payments found</td>
                      </tr>
                    ) : (
                      recentPayments.map(payment => (
                        <tr key={payment.id}>
                          <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{new Date(payment.created_at).toLocaleTimeString()}</td>
                          <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}><strong>{payment.full_name}</strong></td>
                          <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{payment.class_name}</td>
                          <td style={{ padding: '8px', borderBottom: '1px solid #ddd', color: '#2ecc71', fontWeight: 'bold' }}>₵{payment.amount}</td>
                          <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{new Date(payment.payment_date).toLocaleDateString()}</td>
                          <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                            <button 
                              onClick={() => handleUndoPayment(payment.id, payment.full_name, payment.amount)}
                              style={{ 
                                background: '#e74c3c', 
                                color: 'white',
                                padding: '4px 10px',
                                borderRadius: '4px',
                                border: 'none',
                                cursor: 'pointer'
                              }}
                            >
                              ↶ Undo
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Fees;
