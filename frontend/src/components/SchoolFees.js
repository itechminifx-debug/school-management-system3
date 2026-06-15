import React, { useState, useEffect } from 'react';
import axios from 'axios';

function SchoolFees() {
  const [classLevels, setClassLevels] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  const [academicYear, setAcademicYear] = useState('2026');
  const [feeData, setFeeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [studentHistory, setStudentHistory] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const apiUrl = 'https://school-management-api-5mml.onrender.com';

  useEffect(() => {
    fetchClassLevels();
  }, []);

  useEffect(() => {
    if (selectedClass && selectedTerm && academicYear) {
      fetchFeeSummary();
    }
  }, [selectedClass, selectedTerm, academicYear]);

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

  const fetchFeeSummary = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${apiUrl}/api/school-fees/summary/${selectedClass}/${selectedTerm}/${academicYear}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeeData(response.data);
      setError('');
    } catch (error) {
      console.error('Error fetching fee summary:', error);
      setError('Failed to load fee data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentHistory = async (student) => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${apiUrl}/api/school-fees/student/${student.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudentHistory(response.data);
      setShowHistory(true);
    } catch (error) {
      console.error('Error fetching student history:', error);
      setError('Failed to load student history');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentAmount || paymentAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      await axios.post(`${apiUrl}/api/school-fees/pay`, {
        student_id: selectedStudent.id,
        amount: parseFloat(paymentAmount),
        term: selectedTerm,
        academic_year: academicYear,
        payment_method: paymentMethod,
        notes: `School fee payment for ${selectedTerm} ${academicYear}`
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage(`Payment of ₵${paymentAmount} recorded successfully for ${selectedStudent.full_name}!`);
      setPaymentAmount('');
      setShowPaymentModal(false);
      setSelectedStudent(null);
      fetchFeeSummary();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Failed to record payment');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleUndoPayment = async (paymentId, studentName, amount) => {
    if (!window.confirm(`Undo payment of ₵${amount} for ${studentName}? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      await axios.delete(`${apiUrl}/api/school-fees/payment/${paymentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage(`Payment of ₵${amount} for ${studentName} has been undone!`);
      fetchFeeSummary();
      if (showHistory) {
        fetchStudentHistory(selectedStudent);
      }
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Failed to undo payment');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const getClassName = (id) => {
    const cls = classLevels.find(c => c.id === id);
    return cls ? cls.name : 'Select Class';
  };

  return (
    <div className="container">
      <div className="card">
        <h2>School Fees Management</h2>
        {message && <div className="success">{message}</div>}
        {error && <div className="error">{error}</div>}

        {/* Filters */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
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
            <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.3rem' }}>Select Term:</label>
            <select 
              value={selectedTerm} 
              onChange={(e) => setSelectedTerm(e.target.value)} 
              style={{ width: '100%', padding: '0.5rem', borderRadius: '8px' }}
            >
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.3rem' }}>Academic Year:</label>
            <input 
              type="text" 
              value={academicYear} 
              onChange={(e) => setAcademicYear(e.target.value)} 
              style={{ width: '100%', padding: '0.5rem', borderRadius: '8px' }}
            />
          </div>
        </div>

        {/* Summary Stats */}
        {feeData && (
          <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-card">
              <h3>{feeData.total_students}</h3>
              <p>Total Students</p>
            </div>
            <div className="stat-card">
              <h3>{feeData.paid_count}</h3>
              <p>Paid</p>
            </div>
            <div className="stat-card">
              <h3>{feeData.not_paid_count}</h3>
              <p>Not Paid</p>
            </div>
            <div className="stat-card">
              <h3>₵{feeData.total_collected?.toLocaleString()}</h3>
              <p>Total Collected</p>
            </div>
          </div>
        )}

        {/* Student Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
        ) : feeData && feeData.students ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#1e3c72', color: 'white' }}>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Admission No</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Student Name</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Amount Paid</th>
                  <th style={{ padding: '10px', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '10px', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {feeData.students.map(student => (
                  <tr key={student.id} style={{ borderBottom: '1px solid #ddd' }}>
                    <td style={{ padding: '8px' }}>{student.admission_number}</td>
                    <td style={{ padding: '8px' }}><strong>{student.full_name}</strong></td>
                    <td style={{ padding: '8px', color: student.has_paid ? '#2ecc71' : '#e74c3c' }}>
                      {student.has_paid ? `₵${student.amount_paid}` : '₵0'}
                    </td>
                    <td style={{ padding: '8px' }}>
                      {student.has_paid ? (
                        <span style={{ background: '#2ecc71', color: 'white', padding: '4px 8px', borderRadius: '20px', fontSize: '11px' }}>PAID</span>
                      ) : (
                        <span style={{ background: '#e74c3c', color: 'white', padding: '4px 8px', borderRadius: '20px', fontSize: '11px' }}>NOT PAID</span>
                      )}
                    </td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      {!student.has_paid ? (
                        <button 
                          onClick={() => {
                            setSelectedStudent(student);
                            setPaymentAmount('');
                            setShowPaymentModal(true);
                          }}
                          style={{ background: '#3498db', padding: '4px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}
                        >
                          Pay
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleUndoPayment(student.payment_id, student.full_name, student.amount_paid)}
                          style={{ background: '#e74c3c', padding: '4px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer', marginRight: '5px' }}
                        >
                          Undo
                        </button>
                      )}
                      <button 
                        onClick={() => {
                          setSelectedStudent(student);
                          fetchStudentHistory(student);
                        }}
                        style={{ background: '#95a5a6', padding: '4px 12px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        History
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {/* Payment Modal */}
        {showPaymentModal && selectedStudent && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '400px', maxWidth: '90%' }}>
              <h3>Record School Fee Payment</h3>
              <p><strong>Student:</strong> {selectedStudent.full_name}</p>
              <p><strong>Term:</strong> {selectedTerm} {academicYear}</p>
              
              <div style={{ marginBottom: '1rem' }}>
                <label>Amount (₵):</label>
                <input 
                  type="number" 
                  value={paymentAmount} 
                  onChange={(e) => setPaymentAmount(e.target.value)} 
                  placeholder="Enter amount"
                  style={{ width: '100%', padding: '0.5rem', marginTop: '0.3rem' }}
                />
              </div>
              
              <div style={{ marginBottom: '1rem' }}>
                <label>Payment Method:</label>
                <select 
                  value={paymentMethod} 
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', marginTop: '0.3rem' }}
                >
                  <option value="cash">Cash</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="card">Card</option>
                </select>
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button onClick={() => { setShowPaymentModal(false); setSelectedStudent(null); }} style={{ background: '#95a5a6', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleRecordPayment} style={{ background: '#2ecc71', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Record Payment</button>
              </div>
            </div>
          </div>
        )}

        {/* History Modal */}
        {showHistory && studentHistory && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '500px', maxWidth: '90%', maxHeight: '80%', overflowY: 'auto' }}>
              <h3>Payment History - {studentHistory.student?.full_name}</h3>
              <p><strong>Class:</strong> {studentHistory.student?.class_name}</p>
              <p><strong>Admission No:</strong> {studentHistory.student?.admission_number}</p>
              
              {studentHistory.payments?.length === 0 ? (
                <p>No payment records found.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#1e3c72', color: 'white' }}>
                      <th style={{ padding: '8px' }}>Term</th>
                      <th style={{ padding: '8px' }}>Year</th>
                      <th style={{ padding: '8px' }}>Amount</th>
                      <th style={{ padding: '8px' }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentHistory.payments?.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #ddd' }}>
                        <td style={{ padding: '8px' }}>{p.term}</td>
                        <td style={{ padding: '8px' }}>{p.academic_year}</td>
                        <td style={{ padding: '8px', color: '#2ecc71' }}>₵{p.amount_paid}</td>
                        <td style={{ padding: '8px' }}>{new Date(p.payment_date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button onClick={() => { setShowHistory(false); setStudentHistory(null); }} style={{ background: '#95a5a6', padding: '8px 16px', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SchoolFees;
