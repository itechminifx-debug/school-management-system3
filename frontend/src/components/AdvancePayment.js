import React, { useState, useEffect } from 'react';
import axios from 'axios';

function AdvancePayment() {
  const [classLevels, setClassLevels] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [studentData, setStudentData] = useState(null);
  const [amount, setAmount] = useState('');
  const [paymentType, setPaymentType] = useState('weekly');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [deductAmount, setDeductAmount] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('record');

  const apiUrl = 'https://school-management-api-5mml.onrender.com';

  useEffect(() => {
    fetchClassLevels();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchStudentsByClass();
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedStudent) {
      fetchStudentAdvanceData();
    }
  }, [selectedStudent]);

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
      console.error('Error:', error);
      setError('Failed to load class levels');
    }
  };

  const fetchStudentsByClass = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${apiUrl}/api/fees/advance/class/${selectedClass}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(response.data.students || []);
      setSelectedStudent('');
      setStudentData(null);
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentAdvanceData = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${apiUrl}/api/fees/advance/student/${selectedStudent}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudentData(response.data);
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to load student data');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordAdvance = async (e) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (!endDate) {
      setError('Please select end date');
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      await axios.post(`${apiUrl}/api/fees/advance`, {
        student_id: selectedStudent,
        amount: parseFloat(amount),
        payment_type: paymentType,
        start_date: startDate,
        end_date: endDate,
        payment_method: 'cash',
        notes: `${paymentType.toUpperCase()} advance payment`
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage(`✅ Advance payment of ₵${amount} recorded successfully!`);
      setAmount('');
      setEndDate('');
      fetchStudentAdvanceData();
      fetchStudentsByClass();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to record advance payment');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleDeductAdvance = async (e) => {
    e.preventDefault();
    if (!deductAmount || deductAmount <= 0) {
      setError('Please enter a valid amount to deduct');
      return;
    }

    if (studentData && parseFloat(deductAmount) > studentData.balance) {
      setError(`Insufficient balance. Current balance: ₵${studentData.balance}`);
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      await axios.post(`${apiUrl}/api/fees/deduct`, {
        student_id: selectedStudent,
        amount: parseFloat(deductAmount),
        deduction_date: new Date().toISOString().split('T')[0]
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage(`✅ ₵${deductAmount} deducted from advance balance!`);
      setDeductAmount('');
      fetchStudentAdvanceData();
      fetchStudentsByClass();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to deduct');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentTypeColor = (type) => {
    const colors = { weekly: '#3498db', monthly: '#2ecc71', termly: '#f39c12' };
    return colors[type] || '#666';
  };

  if (loading && !studentData) {
    return <div className="container">Loading...</div>;
  }

  return (
    <div className="container">
      <div className="card">
        <h2>💰 Advance Payment Management</h2>
        {message && <div className="success">{message}</div>}
        {error && <div className="error">{error}</div>}

        {/* Class and Student Selection */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
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
            <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.3rem' }}>Select Student:</label>
            <select 
              value={selectedStudent} 
              onChange={(e) => setSelectedStudent(e.target.value)} 
              style={{ width: '100%', padding: '0.5rem', borderRadius: '8px' }}
            >
              <option value="">-- Select Student --</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.admission_number} - {s.full_name} (Balance: ₵{parseFloat(s.advance_balance || 0).toLocaleString()})
                </option>
              ))}
            </select>
            {students.length === 0 && selectedClass && (
              <p style={{ color: '#e74c3c', marginTop: '0.3rem' }}>No students found in this class</p>
            )}
          </div>
        </div>

        {selectedStudent && studentData && (
          <>
            {/* Student Balance Card */}
            <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
              <div className="stat-card" style={{ background: 'linear-gradient(135deg, #1e3c72, #2a5298)', color: 'white' }}>
                <h3 style={{ color: 'white' }}>₵{parseFloat(studentData.balance || 0).toLocaleString()}</h3>
                <p style={{ color: 'rgba(255,255,255,0.9)' }}>Current Advance Balance</p>
              </div>
              <div className="stat-card">
                <h3>{studentData.advance_payments?.length || 0}</h3>
                <p>Advance Payments</p>
              </div>
              <div className="stat-card">
                <h3>{studentData.deductions?.length || 0}</h3>
                <p>Deductions Made</p>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid #ddd', flexWrap: 'wrap' }}>
              <button 
                onClick={() => setActiveTab('record')} 
                style={{ 
                  background: activeTab === 'record' ? '#1e3c72' : 'transparent',
                  color: activeTab === 'record' ? 'white' : '#666',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  cursor: 'pointer',
                  borderRadius: '8px 8px 0 0'
                }}
              >
                📝 Record Advance
              </button>
              <button 
                onClick={() => setActiveTab('deduct')} 
                style={{ 
                  background: activeTab === 'deduct' ? '#1e3c72' : 'transparent',
                  color: activeTab === 'deduct' ? 'white' : '#666',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  cursor: 'pointer',
                  borderRadius: '8px 8px 0 0'
                }}
              >
                ➖ Deduct from Balance
              </button>
              <button 
                onClick={() => setActiveTab('history')} 
                style={{ 
                  background: activeTab === 'history' ? '#1e3c72' : 'transparent',
                  color: activeTab === 'history' ? 'white' : '#666',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  cursor: 'pointer',
                  borderRadius: '8px 8px 0 0'
                }}
              >
                📜 Payment History
              </button>
            </div>

            {/* Record Advance Payment Tab */}
            {activeTab === 'record' && (
              <form onSubmit={handleRecordAdvance}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label>Amount (₵):</label>
                    <input 
                      type="number" 
                      value={amount} 
                      onChange={(e) => setAmount(e.target.value)} 
                      required 
                      min="0" 
                      step="1"
                      style={{ width: '100%', padding: '0.5rem' }}
                    />
                  </div>
                  <div>
                    <label>Payment Type:</label>
                    <select 
                      value={paymentType} 
                      onChange={(e) => setPaymentType(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem' }}
                    >
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="termly">Termly</option>
                    </select>
                  </div>
                  <div>
                    <label>Start Date:</label>
                    <input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)} 
                      required 
                      style={{ width: '100%', padding: '0.5rem' }}
                    />
                  </div>
                  <div>
                    <label>End Date:</label>
                    <input 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)} 
                      required 
                      style={{ width: '100%', padding: '0.5rem' }}
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading} style={{ marginTop: '1rem', width: '100%' }}>
                  {loading ? 'Processing...' : '💰 Record Advance Payment'}
                </button>
              </form>
            )}

            {/* Deduct from Balance Tab */}
            {activeTab === 'deduct' && (
              <form onSubmit={handleDeductAdvance}>
                <div>
                  <label>Amount to Deduct (₵):</label>
                  <input 
                    type="number" 
                    value={deductAmount} 
                    onChange={(e) => setDeductAmount(e.target.value)} 
                    required 
                    min="0" 
                    step="0.5"
                    style={{ width: '100%', padding: '0.5rem' }}
                  />
                  <small style={{ display: 'block', marginTop: '0.3rem' }}>
                    Current Balance: ₵{parseFloat(studentData?.balance || 0).toLocaleString()}
                  </small>
                </div>
                <button type="submit" disabled={loading} style={{ marginTop: '1rem', width: '100%' }}>
                  {loading ? 'Processing...' : '➖ Deduct from Balance'}
                </button>
              </form>
            )}

            {/* Payment History Tab */}
            {activeTab === 'history' && (
              <div>
                <h3>Advance Payments History</h3>
                {studentData.advance_payments?.length === 0 ? (
                  <p>No advance payments recorded</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', marginBottom: '2rem', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#1e3c72', color: 'white' }}>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Date</th>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Amount</th>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Type</th>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Period</th>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Receipt</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentData.advance_payments?.map(p => (
                          <tr key={p.id}>
                            <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{new Date(p.payment_date).toLocaleDateString()}</td>
                            <td style={{ padding: '8px', borderBottom: '1px solid #ddd', color: '#2ecc71', fontWeight: 'bold' }}>₵{p.amount}</td>
                            <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                              <span style={{ background: getPaymentTypeColor(p.payment_type), color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
                                {p.payment_type}
                              </span>
                            </td>
                            <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{new Date(p.start_date).toLocaleDateString()} - {new Date(p.end_date).toLocaleDateString()}</td>
                            <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{p.receipt_number?.slice(-8)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <h3>Deduction History</h3>
                {studentData.deductions?.length === 0 ? (
                  <p>No deductions recorded</p>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f39c12', color: 'white' }}>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Date</th>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Amount Deducted</th>
                          <th style={{ padding: '10px', textAlign: 'left' }}>Remaining Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentData.deductions?.map(d => (
                          <tr key={d.id}>
                            <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{new Date(d.deduction_date).toLocaleDateString()}</td>
                            <td style={{ padding: '8px', borderBottom: '1px solid #ddd', color: '#e74c3c' }}>-₵{d.amount_deducted}</td>
                            <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>₵{d.remaining_balance}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default AdvancePayment;
