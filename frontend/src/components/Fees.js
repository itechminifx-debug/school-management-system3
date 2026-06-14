import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Fees() {
  const [classLevels, setClassLevels] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [feeSummary, setFeeSummary] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [studentFees, setStudentFees] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState({ total_collected: 0, total_outstanding: 0 });

  const apiUrl = 'https://school-management-api-5mml.onrender.com';

  useEffect(() => {
    fetchClassLevels();
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchFeeSummary();
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedStudent) {
      fetchStudentFees();
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
      console.error('Error fetching class levels:', error);
    }
  };

  const fetchDashboard = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${apiUrl}/api/fees/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDashboard(response.data);
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    }
  };

  const fetchFeeSummary = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${apiUrl}/api/fees/summary/${selectedClass}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeeSummary(response.data.summary);
    } catch (error) {
      console.error('Error fetching fee summary:', error);
    }
  };

  const fetchStudentFees = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${apiUrl}/api/fees/student/${selectedStudent}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudentFees(response.data.fees);
    } catch (error) {
      console.error('Error fetching student fees:', error);
    }
  };

  const handlePayment = async (feeId) => {
    if (!paymentAmount || paymentAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      await axios.post(`${apiUrl}/api/fees/payment`, {
        student_fee_id: feeId,
        amount_paid: parseFloat(paymentAmount),
        payment_method: paymentMethod,
        remarks: 'Feeding fee payment'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage('Payment recorded successfully!');
      setPaymentAmount('');
      fetchStudentFees();
      fetchFeeSummary();
      fetchDashboard();
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setError('Failed to record payment');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      paid: { background: '#2ecc71', color: 'white' },
      partial: { background: '#f39c12', color: 'white' },
      pending: { background: '#e74c3c', color: 'white' },
      overdue: { background: '#c0392b', color: 'white' }
    };
    return (
      <span style={{
        ...styles[status],
        padding: '0.25rem 0.75rem',
        borderRadius: '20px',
        fontSize: '0.75rem',
        fontWeight: '600'
      }}>
        {status.toUpperCase()}
      </span>
    );
  };

  const getClassName = (id) => {
    const cls = classLevels.find(c => c.id === id);
    return cls ? cls.name : 'N/A';
  };

  return (
    <div className="container">
      {/* Dashboard Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>₵{parseFloat(dashboard.total_collected).toLocaleString()}</h3>
          <p>Total Fees Collected</p>
        </div>
        <div className="stat-card">
          <h3>₵{parseFloat(dashboard.total_outstanding).toLocaleString()}</h3>
          <p>Outstanding Balance</p>
        </div>
      </div>

      <div className="card">
        <h2>💰 Feeding Fee Management</h2>
        {message && <div className="success">{message}</div>}
        {error && <div className="error">{error}</div>}

        {/* Class Filter */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>Select Class:</label>
          <select 
            value={selectedClass} 
            onChange={(e) => setSelectedClass(e.target.value)}
            style={{ width: '100%', padding: '0.75rem', borderRadius: '8px' }}
          >
            {classLevels.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Fee Summary Table */}
        <h3>Fee Summary - {getClassName(parseInt(selectedClass))}</h3>
        <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
          <table>
            <thead>
              <tr>
                <th>Admission No</th>
                <th>Student Name</th>
                <th>Total Fees (₵)</th>
                <th>Paid (₵)</th>
                <th>Balance (₵)</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {feeSummary.map(student => (
                <tr key={student.id}>
                  <td>{student.admission_number}</td>
                  <td>{student.full_name}</td>
                  <td>{parseFloat(student.total_fees).toLocaleString()}</td>
                  <td>{parseFloat(student.total_paid).toLocaleString()}</td>
                  <td>{parseFloat(student.total_balance).toLocaleString()}</td>
                  <td>
                    <button 
                      onClick={() => setSelectedStudent(student.id)}
                      style={{ padding: '0.3rem 0.8rem', fontSize: '0.8rem' }}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Student Fee Details */}
        {selectedStudent && (
          <div style={{ marginTop: '2rem', borderTop: '2px solid #eee', paddingTop: '1rem' }}>
            <h3>Fee Details</h3>
            {studentFees.map(fee => (
              <div key={fee.id} style={{ 
                border: '1px solid #ddd', 
                borderRadius: '12px', 
                padding: '1rem', 
                marginBottom: '1rem',
                background: '#f9f9f9'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  <div>
                    <strong>{fee.fee_name}</strong> - {fee.term} {fee.academic_year}
                  </div>
                  <div>{getStatusBadge(fee.status)}</div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
                  <div><strong>Total:</strong> ₵{parseFloat(fee.amount).toLocaleString()}</div>
                  <div><strong>Paid:</strong> ₵{parseFloat(fee.amount_paid).toLocaleString()}</div>
                  <div><strong>Balance:</strong> ₵{parseFloat(fee.balance).toLocaleString()}</div>
                </div>

                {/* Payment Form */}
                {fee.status !== 'paid' && (
                  <div style={{ 
                    display: 'flex', 
                    gap: '1rem', 
                    alignItems: 'center', 
                    flexWrap: 'wrap',
                    marginTop: '1rem',
                    paddingTop: '1rem',
                    borderTop: '1px dashed #ddd'
                  }}>
                    <input
                      type="number"
                      placeholder="Amount (₵)"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      style={{ width: '150px', padding: '0.5rem' }}
                    />
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      style={{ padding: '0.5rem', borderRadius: '8px' }}
                    >
                      <option value="cash">Cash</option>
                      <option value="mobile_money">Mobile Money</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="card">Card</option>
                    </select>
                    <button 
                      onClick={() => handlePayment(fee.id)} 
                      disabled={loading}
                      style={{ background: '#2ecc71', padding: '0.5rem 1rem' }}
                    >
                      {loading ? 'Processing...' : 'Record Payment'}
                    </button>
                  </div>
                )}

                {/* Payment History */}
                {fee.payments && fee.payments.length > 0 && (
                  <div style={{ marginTop: '1rem' }}>
                    <strong>Payment History:</strong>
                    <div style={{ overflowX: 'auto', marginTop: '0.5rem' }}>
                      <table style={{ fontSize: '0.8rem' }}>
                        <thead>
                          <tr><th>Date</th><th>Amount</th><th>Method</th><th>Receipt No</th></tr>
                        </thead>
                        <tbody>
                          {fee.payments.map(p => (
                            <tr key={p.id}>
                              <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                              <td>₵{parseFloat(p.amount_paid).toLocaleString()}</td>
                              <td>{p.payment_method?.toUpperCase()}</td>
                              <td>{p.receipt_number}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Fees;
