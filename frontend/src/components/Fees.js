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
      
      setMessage(`✅ Payment recorded successfully!`);
      setTimeout(() => setMessage(''), 3000);
      await fetchDailyCollection();
    } catch (error) {
      setError('Failed to record payment');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleUndoPayment = async (paymentId, studentName, amount) => {
    if (!window.confirm(`Undo payment of ₵${amount} for ${studentName}?`)) return;
    
    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      await axios.delete(`${apiUrl}/api/fees/payment/${paymentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage(`↶ Payment undone!`);
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
        <head><title>Feeding Fee Report - ${className}</title>
        <style>
          body { font-family: Arial; margin: 40px; }
          h1 { color: #1e3c72; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background: #1e3c72; color: white; }
          .summary { margin-top: 20px; padding: 10px; background: #f0f0f0; }
        </style>
        </head>
        <body>
          <h1>🍽️ Feeding Fee Collection Report</h1>
          <h3>Class: ${className}</h3>
          <h3>Date: ${selectedDate}</h3>
          <table>
            <thead><tr><th>#</th><th>Admission No</th><th>Student Name</th><th>Amount (₵)</th></tr></thead>
            <tbody>
              ${paidStudents.map((s, i) => `<tr><td>${i+1}</td><td>${s.admission_number}</td><td>${s.full_name}</td><td>₵${s.amount}</td></tr>`).join('')}
            </tbody>
          </table>
          <div class="summary">
            <strong>Total Students: ${collection.total_students}</strong><br>
            <strong>Paid: ${collection.total_paid}</strong><br>
            <strong>Not Paid: ${collection.total_students - collection.total_paid}</strong><br>
            <strong>Total Collected: ₵${collection.total_collected}</strong>
          </div>
          <p style="margin-top: 40px; text-align: center;">Printed: ${new Date().toLocaleString()}</p>
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

  if (loading && !collection.collection.length) {
    return <div className="container">Loading...</div>;
  }

  return (
    <div className="container">
      <div className="card">
        <h2>🍽️ Daily Feeding Fee Collection</h2>
        {message && <div className="success">{message}</div>}
        {error && <div className="error">{error}</div>}

        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1 }}>
            <label>Select Class:</label>
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="form-control">
              {classLevels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label>Select Date:</label>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="form-control" />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
            <button onClick={handlePrint} style={{ background: '#2ecc71' }}>🖨️ Print</button>
            <button onClick={handleShowRecent} style={{ background: '#f39c12' }}>{showRecent ? 'Hide' : 'Show'} Recent</button>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card"><h3>{collection.total_students}</h3><p>Total Students</p></div>
          <div className="stat-card"><h3>{collection.total_paid}</h3><p>Paid Today</p></div>
          <div className="stat-card"><h3>₵{collection.total_collected}</h3><p>Total Collected</p></div>
          <div className="stat-card"><h3>{collection.total_students - collection.total_paid}</h3><p>Not Paid</p></div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#1e3c72', color: 'white' }}>
                <th style={{ padding: '10px' }}>Admission No</th>
                <th style={{ padding: '10px' }}>Student Name</th>
                <th style={{ padding: '10px' }}>Amount (₵)</th>
                <th style={{ padding: '10px' }}>Status</th>
                <th style={{ padding: '10px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {collection.collection.map(student => (
                <tr key={student.id} style={{ background: student.paid ? '#d4edda' : 'white' }}>
                  <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>{student.admission_number}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>{student.full_name}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>
                    {student.paid ? `₵${student.amount}` : (
                      <input type="number" placeholder="Amount" value={amounts[student.id] || ''}
                        onChange={(e) => setAmounts({...amounts, [student.id]: e.target.value})}
                        style={{ width: '80px', padding: '5px' }} min="0" step="0.5" />
                    )}
                  </td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>
                    {student.paid ? <span className="status-present">✓ PAID</span> : <span className="status-absent">✗ NOT PAID</span>}
                  </td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #ddd' }}>
                    {!student.paid ? (
                      <button onClick={() => handleRecordPayment(student.id)} disabled={loading} style={{ background: '#3498db' }}>Record</button>
                    ) : (
                      <button onClick={() => handleUndoPayment(student.payment_id, student.full_name, student.amount)} style={{ background: '#e74c3c' }}>Undo</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showRecent && (
          <div style={{ marginTop: '2rem' }}>
            <h3>Recent Payments</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: '#f39c12' }}><th>Time</th><th>Student</th><th>Amount</th><th>Action</th></tr></thead>
              <tbody>
                {recentPayments.map(p => (
                  <tr key={p.id}><td>{new Date(p.created_at).toLocaleTimeString()}</td><td>{p.full_name}</td><td>₵{p.amount}</td>
                  <td><button onClick={() => handleUndoPayment(p.id, p.full_name, p.amount)} style={{ background: '#e74c3c' }}>Undo</button></td></tr>
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
