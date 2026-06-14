import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Fees() {
  const [classLevels, setClassLevels] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [collection, setCollection] = useState({ 
    collection: [], 
    total_students: 0, 
    total_paid: 0, 
    total_collected: 0 
  });
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
      setError('');
    } catch (error) {
      console.error('Error fetching collection:', error);
      setError('Failed to load collection data');
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
      console.error('Error fetching recent payments:', error);
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
      
      setMessage(`✅ Payment of ₵${amount} recorded successfully!`);
      setTimeout(() => setMessage(''), 3000);
      
      await fetchDailyCollection();
      if (showRecent) {
        await fetchRecentPayments();
      }
    } catch (error) {
      setError('Failed to record payment');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleUndoPayment = async (paymentId, studentName, amount) => {
    if (!window.confirm(`⚠️ Undo payment of ₵${amount} for ${studentName}?\n\nThis action cannot be undone.`)) {
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
      if (showRecent) {
        await fetchRecentPayments();
      }
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
    if (newState) {
      await fetchRecentPayments();
    }
  };

  const handlePrint = () => {
    const className = getClassName(parseInt(selectedClass));
    const paidStudents = collection.collection.filter(s => s.paid);
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Feeding Fee Collection Report - ${className}</title>
          <meta charset="UTF-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Segoe UI', Arial, sans-serif; 
              margin: 40px 20px; 
              background: white;
            }
            .container { max-width: 1000px; margin: 0 auto; }
            .header { 
              text-align: center; 
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 3px solid #1e3c72;
            }
            .header h1 { color: #1e3c72; font-size: 28px; margin-bottom: 5px; }
            .header h3 { color: #555; font-weight: normal; }
            .school-info { margin-bottom: 10px; color: #666; }
            .report-title { 
              background: #1e3c72; 
              color: white; 
              padding: 8px 20px; 
              display: inline-block;
              border-radius: 30px;
              margin-top: 15px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 20px 0;
            }
            th, td { 
              border: 1px solid #ddd; 
              padding: 12px; 
              text-align: left; 
            }
            th { 
              background: #1e3c72; 
              color: white; 
              font-weight: 600;
            }
            tr:nth-child(even) { background: #f9f9f9; }
            .summary {
              margin-top: 30px;
              padding: 15px;
              background: #f0f4f8;
              border-radius: 8px;
            }
            .summary p { margin: 5px 0; }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 11px;
              color: #888;
              border-top: 1px solid #ddd;
              padding-top: 20px;
            }
            .signatures {
              display: flex;
              justify-content: space-between;
              margin-top: 50px;
            }
            .signature {
              text-align: center;
              width: 200px;
            }
            .signature-line {
              border-top: 1px solid #000;
              margin-top: 40px;
              padding-top: 5px;
            }
            @media print {
              body { margin: 0; padding: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🏫 GREENWOOD HIGH SCHOOL</h1>
              <div class="school-info">
                123 Education Street, Accra, Ghana<br>
                Tel: +233 24 123 4567 | Email: info@greenwood.edu.gh
              </div>
              <div class="report-title">DAILY FEEDING FEE COLLECTION REPORT</div>
            </div>
            
            <h3>Class: ${className}</h3>
            <h3>Date: ${selectedDate}</h3>
            
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Admission No</th>
                  <th>Student Name</th>
                  <th>Amount Paid (₵)</th>
                  <th>Receipt No</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                ${paidStudents.map((student, index) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${student.admission_number}</td>
                    <td>${student.full_name}</td>
                    <td style="text-align: center; font-weight: bold;">₵${student.amount}</td>
                    <td>${student.receipt_number || '-'}</td>
                    <td>${student.payment_time || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <div class="summary">
              <p><strong>📊 SUMMARY</strong></p>
              <p>Total Students in Class: ${collection.total_students}</p>
              <p>Students Who Paid: ${collection.total_paid}</p>
              <p>Students Not Paid: ${collection.total_students - collection.total_paid}</p>
              <p><strong>Total Collection: ₵${collection.total_collected}</strong></p>
            </div>
            
            <div class="signatures">
              <div class="signature">
                <div class="signature-line">Class Teacher</div>
              </div>
              <div class="signature">
                <div class="signature-line">Accountant</div>
              </div>
              <div class="signature">
                <div class="signature-line">Head of School</div>
              </div>
            </div>
            
            <div class="footer">
              Printed on: ${new Date().toLocaleString()}<br>
              Generated by School Management System
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          <\/script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
          <div style={{ flex: 1, minWidth: '180px' }}>
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
          
          <div style={{ flex: 1, minWidth: '180px' }}>
            <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.3rem' }}>Select Date:</label>
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '8px' }}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button 
              onClick={handlePrint}
              style={{ background: '#2ecc71', padding: '0.5rem 1rem' }}
            >
              🖨️ Print Collection List
            </button>
            
            <button 
              onClick={handleShowRecent}
              style={{ background: '#f39c12', padding: '0.5rem 1rem' }}
            >
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
            <table className="fee-table">
              <thead>
                <tr>
                  <th style={{ width: '50px' }}>#</th>
                  <th>Admission No</th>
                  <th>Student Name</th>
                  <th style={{ width: '100px' }}>Amount (₵)</th>
                  <th style={{ width: '100px' }}>Status</th>
                  <th style={{ width: '120px' }}>Action</th>
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
                          style={{ width: '90px', padding: '0.3rem' }}
                          min="0"
                          step="0.5"
                        />
                      )}
                    </td>
                    <td>
                      {student.paid ? (
                        <span className="status-present">✓ PAID</span>
                      ) : (
                        <span className="status-absent">✗ NOT PAID</span>
                      )}
                    </td>
                    <td>
                      {!student.paid ? (
                        <button 
                          onClick={() => handleRecordPayment(student.id)} 
                          disabled={loading}
                          style={{ 
                            background: '#3498db', 
                            padding: '0.3rem 0.8rem', 
                            fontSize: '0.75rem',
                            width: '100%'
                          }}
                        >
                          💰 Record Payment
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.7rem', color: '#666', flex: 1 }}>
                            Receipt: {student.receipt_number?.slice(-6) || 'N/A'}
                          </span>
                          <button 
                            onClick={() => handleUndoPayment(student.payment_id, student.full_name, student.amount)}
                            style={{ 
                              background: '#e74c3c', 
                              padding: '0.2rem 0.5rem', 
                              fontSize: '0.7rem'
                            }}
                            title="Undo this payment"
                          >
                            ↶ Undo
                          </button>
                        </div>
                      )}
                    </td>
                  <tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Recent Payments Panel */}
        {showRecent && (
          <div style={{ marginTop: '2rem' }}>
            <div className="card">
              <h3>🔄 Recent Payments (Last 20)</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f39c12', color: 'white' }}>
                      <th>Time</th>
                      <th>Student Name</th>
                      <th>Class</th>
                      <th>Amount</th>
                      <th>Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPayments.length === 0 ? (
                      <tr>
                        <td colSpan="6" style={{ textAlign: 'center' }}>No recent payments found</td>
                      </tr>
                    ) : (
                      recentPayments.map(payment => (
                        <tr key={payment.id}>
                          <td>{new Date(payment.created_at).toLocaleTimeString()}</td>
                          <td><strong>{payment.full_name}</strong></td>
                          <td>{payment.class_name}</td>
                          <td style={{ color: '#2ecc71', fontWeight: 'bold' }}>₵{payment.amount}</td>
                          <td>{new Date(payment.payment_date).toLocaleDateString()}</td>
                          <td>
                            <button 
                              onClick={() => handleUndoPayment(payment.id, payment.full_name, payment.amount)}
                              style={{ 
                                background: '#e74c3c', 
                                padding: '0.2rem 0.6rem', 
                                fontSize: '0.7rem'
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
