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

  const handleUndoAdvance = async (paymentId, amount, studentName) => {
    if (!window.confirm(`⚠️ UNDO ADVANCE PAYMENT\n\nUndo advance payment of ₵${amount} for ${studentName}?\n\nThis will also remove all related deductions and cannot be undone.`)) {
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      await axios.delete(`${apiUrl}/api/fees/advance/${paymentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage(`↶ Advance payment of ₵${amount} has been undone!`);
      fetchStudentAdvanceData();
      fetchStudentsByClass();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setError('Failed to undo advance payment');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleUndoDeduction = async (deductionId, amount, studentName) => {
    if (!window.confirm(`⚠️ UNDO DEDUCTION\n\nUndo deduction of ₵${amount} for ${studentName}?\n\nThis will add the amount back to the advance balance.`)) {
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      await axios.delete(`${apiUrl}/api/fees/deduction/${deductionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage(`↶ Deduction of ₵${amount} has been undone! Amount added back to balance.`);
      fetchStudentAdvanceData();
      fetchStudentsByClass();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setError('Failed to undo deduction');
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

  const handlePrintReport = () => {
    if (!studentData) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Advance Payment Report - ${studentData.student?.full_name}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; }
            h1 { color: #1e3c72; text-align: center; }
            .header { text-align: center; margin-bottom: 30px; }
            .student-info { background: #f0f4f8; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background: #1e3c72; color: white; }
            .summary { margin-top: 20px; padding: 15px; background: #f0f4f8; border-radius: 8px; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #888; }
            .balance { font-size: 18px; font-weight: bold; color: #2ecc71; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>🏫 GREENWOOD HIGH SCHOOL</h1>
            <h3>ADVANCE PAYMENT STATEMENT</h3>
          </div>
          
          <div class="student-info">
            <strong>Student Name:</strong> ${studentData.student?.full_name}<br>
            <strong>Admission No:</strong> ${studentData.student?.admission_number}<br>
            <strong>Class:</strong> ${studentData.class_name || 'N/A'}<br>
            <strong>Current Balance:</strong> <span class="balance">₵${(studentData.balance || 0).toLocaleString()}</span>
          </div>
          
          <h3>Advance Payments History</h3>
          <table>
            <thead><tr><th>Date</th><th>Amount</th><th>Type</th><th>Period</th><th>Receipt No</th></tr></thead>
            <tbody>
              ${studentData.advance_payments?.map(p => `
                <tr>
                  <td>${new Date(p.payment_date).toLocaleDateString()}</td>
                  <td style="color: #2ecc71; font-weight: bold;">₵${p.amount}</td>
                  <td>${p.payment_type}</td>
                  <td>${new Date(p.start_date).toLocaleDateString()} - ${new Date(p.end_date).toLocaleDateString()}</td>
                  <td>${p.receipt_number?.slice(-8)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <h3>Deductions History</h3>
          <table>
            <thead><tr><th>Date</th><th>Amount Deducted</th><th>Remaining Balance</th></tr></thead>
            <tbody>
              ${studentData.deductions?.map(d => `
                <tr>
                  <td>${new Date(d.deduction_date).toLocaleDateString()}</td>
                  <td style="color: #e74c3c;">-₵${d.amount_deducted}</td>
                  <td>₵${d.remaining_balance}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="summary">
            <strong>Summary</strong><br>
            Total Advance Payments: ₵${studentData.advance_payments?.reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0}<br>
            Total Deductions: ₵${studentData.deductions?.reduce((sum, d) => sum + parseFloat(d.amount_deducted), 0) || 0}<br>
            Current Balance: ₵${(studentData.balance || 0).toLocaleString()}
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
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button 
              onClick={handlePrintReport} 
              disabled={!selectedStudent}
              style={{ background: '#2ecc71', padding: '0.5rem 1rem' }}
            >
              🖨️ Print Statement
            </button>
          </div>
        </div>

        {selectedStudent && studentData && (
          <>
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

            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid #ddd', flexWrap: 'wrap' }}>
              <button onClick={() => setActiveTab('record')} style={{ 
                background: activeTab === 'record' ? '#1e3c72' : 'transparent',
                color: activeTab === 'record' ? 'white' : '#666',
                border: 'none', padding: '0.5rem 1rem', cursor: 'pointer'
              }}>📝 Record Advance</button>
              <button onClick={() => setActiveTab('deduct')} style={{ 
                background: activeTab === 'deduct' ? '#1e3c72' : 'transparent',
                color: activeTab === 'deduct' ? 'white' : '#666',
                border: 'none', padding: '0.5rem 1rem', cursor: 'pointer'
              }}>➖ Deduct from Balance</button>
              <button onClick={() => setActiveTab('history')} style={{ 
                background: activeTab === 'history' ? '#1e3c72' : 'transparent',
                color: activeTab === 'history' ? 'white' : '#666',
                border: 'none', padding: '0.5rem 1rem', cursor: 'pointer'
              }}>📜 Payment History</button>
            </div>

            {activeTab === 'record' && (
              <form onSubmit={handleRecordAdvance}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div><label>Amount (₵):</label><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required min="0" step="1" /></div>
                  <div><label>Payment Type:</label><select value={paymentType} onChange={(e) => setPaymentType(e.target.value)}><option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="termly">Termly</option></select></div>
                  <div><label>Start Date:</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required /></div>
                  <div><label>End Date:</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required /></div>
                </div>
                <button type="submit" disabled={loading} style={{ marginTop: '1rem', width: '100%' }}>{loading ? 'Processing...' : '💰 Record Advance Payment'}</button>
              </form>
            )}

            {activeTab === 'deduct' && (
              <form onSubmit={handleDeductAdvance}>
                <div><label>Amount to Deduct (₵):</label><input type="number" value={deductAmount} onChange={(e) => setDeductAmount(e.target.value)} required min="0" step="0.5" /><small>Current Balance: ₵{parseFloat(studentData?.balance || 0).toLocaleString()}</small></div>
                <button type="submit" disabled={loading} style={{ marginTop: '1rem', width: '100%' }}>{loading ? 'Processing...' : '➖ Deduct from Balance'}</button>
              </form>
            )}

            {activeTab === 'history' && (
              <div>
                <h3>Advance Payments History</h3>
                {studentData.advance_payments?.length === 0 ? <p>No advance payments recorded</p> : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', marginBottom: '2rem' }}>
                      <thead><tr style={{ background: '#1e3c72', color: 'white' }}><th>Date</th><th>Amount</th><th>Type</th><th>Period</th><th>Receipt</th><th>Action</th></tr></thead>
                      <tbody>
                        {studentData.advance_payments?.map(p => (
                          <tr key={p.id}>
                            <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                            <td style={{ color: '#2ecc71', fontWeight: 'bold' }}>₵{p.amount}</td>
                            <td><span style={{ background: getPaymentTypeColor(p.payment_type), color: 'white', padding: '2px 8px', borderRadius: '12px' }}>{p.payment_type}</span></td>
                            <td>{new Date(p.start_date).toLocaleDateString()} - {new Date(p.end_date).toLocaleDateString()}</td>
                            <td>{p.receipt_number?.slice(-8)}</td>
                            <td><button onClick={() => handleUndoAdvance(p.id, p.amount, studentData.student?.full_name)} style={{ background: '#e74c3c', padding: '4px 8px', fontSize: '11px' }}>↶ Undo</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <h3>Deduction History</h3>
                {studentData.deductions?.length === 0 ? <p>No deductions recorded</p> : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%' }}>
                      <thead><tr style={{ background: '#f39c12', color: 'white' }}><th>Date</th><th>Amount Deducted</th><th>Remaining Balance</th><th>Action</th></tr></thead>
                      <tbody>
                        {studentData.deductions?.map(d => (
                          <tr key={d.id}>
                            <td>{new Date(d.deduction_date).toLocaleDateString()}</td>
                            <td style={{ color: '#e74c3c' }}>-₵{d.amount_deducted}</td>
                            <td>₵{d.remaining_balance}</td>
                            <td><button onClick={() => handleUndoDeduction(d.id, d.amount_deducted, studentData.student?.full_name)} style={{ background: '#e74c3c', padding: '4px 8px', fontSize: '11px' }}>↶ Undo</button></td>
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
