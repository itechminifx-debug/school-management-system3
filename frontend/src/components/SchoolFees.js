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
  const [showArrears, setShowArrears] = useState(false);
  const [arrearsData, setArrearsData] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [studentFeeDetails, setStudentFeeDetails] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');

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
      console.error('Error:', error);
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
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to load fee data');
    } finally {
      setLoading(false);
    }
  };

  const fetchArrears = async () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${apiUrl}/api/school-fees/arrears/${selectedTerm}/${academicYear}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setArrearsData(response.data);
      setShowArrears(true);
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to load arrears data');
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentFeeDetails = async (studentId) => {
    setLoading(true);
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${apiUrl}/api/school-fees/student/${studentId}/${selectedTerm}/${academicYear}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudentFeeDetails(response.data);
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to load student fee details');
    } finally {
      setLoading(false);
    }
  };

  const handleMakePayment = async () => {
    if (!selectedStudent || !paymentAmount || paymentAmount <= 0) {
      setError('Please select a student and enter a valid amount');
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      await axios.post(`${apiUrl}/api/school-fees/payment`, {
        student_id: selectedStudent,
        amount: parseFloat(paymentAmount),
        payment_method: paymentMethod,
        notes: `School fee payment - ${selectedTerm} ${academicYear}`
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage(`✅ Payment of ₵${paymentAmount} recorded successfully!`);
      setPaymentAmount('');
      setSelectedStudent('');
      setStudentFeeDetails(null);
      fetchFeeSummary();
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
      unpaid: { background: '#e74c3c', color: 'white' }
    };
    const labels = {
      paid: '✓ FULLY PAID',
      partial: '⚠ PARTIAL',
      unpaid: '✗ NOT PAID'
    };
    return (
      <span style={{ ...styles[status], padding: '4px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' }}>
        {labels[status]}
      </span>
    );
  };

  const getClassName = (id) => {
    const cls = classLevels.find(c => c.id === id);
    return cls ? cls.name : 'Select Class';
  };

  return (
    <div className="container">
      <div className="card">
        <h2>🏫 School Fees Management</h2>
        {message && <div className="success">{message}</div>}
        {error && <div className="error">{error}</div>}

        {/* Filters */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1 }}>
            <label>Select Class:</label>
            <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="form-control">
              {classLevels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label>Select Term:</label>
            <select value={selectedTerm} onChange={(e) => setSelectedTerm(e.target.value)} className="form-control">
              <option value="Term 1">Term 1</option>
              <option value="Term 2">Term 2</option>
              <option value="Term 3">Term 3</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label>Academic Year:</label>
            <input type="text" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="form-control" />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button onClick={fetchArrears} style={{ background: '#e74c3c' }}>📋 View Arrears</button>
          </div>
        </div>

        {/* Summary Stats */}
        {feeData && feeData.totals && (
          <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-card">
              <h3>₵{feeData.totals.total_collected?.toLocaleString()}</h3>
              <p>Total Collected</p>
            </div>
            <div className="stat-card">
              <h3>₵{feeData.totals.total_outstanding?.toLocaleString()}</h3>
              <p>Outstanding Balance</p>
            </div>
            <div className="stat-card">
              <h3>{feeData.totals.paid_count}</h3>
              <p>Fully Paid</p>
            </div>
            <div className="stat-card">
              <h3>{feeData.totals.partial_count}</h3>
              <p>Partial Payment</p>
            </div>
            <div className="stat-card">
              <h3>{feeData.totals.unpaid_count}</h3>
              <p>Not Paid</p>
            </div>
          </div>
        )}

        {/* Fee Summary Table */}
        {loading ? (
          <div>Loading...</div>
        ) : feeData && feeData.students ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#1e3c72', color: 'white' }}>
                  <th style={{ padding: '10px' }}>Admission No</th>
                  <th style={{ padding: '10px' }}>Student Name</th>
                  <th style={{ padding: '10px' }}>Total (₵)</th>
                  <th style={{ padding: '10px' }}>Paid (₵)</th>
                  <th style={{ padding: '10px' }}>Balance (₵)</th>
                  <th style={{ padding: '10px' }}>Status</th>
                  <th style={{ padding: '10px' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {feeData.students.map(student => (
                  <tr key={student.id}>
                    <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{student.admission_number}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{student.full_name}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>₵{student.total_amount.toLocaleString()}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #ddd', color: '#2ecc71' }}>₵{student.amount_paid.toLocaleString()}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #ddd', color: student.balance > 0 ? '#e74c3c' : '#2ecc71' }}>
                      ₵{student.balance.toLocaleString()}
                    </td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>{getStatusBadge(student.status)}</td>
                    <td style={{ padding: '8px', borderBottom: '1px solid #ddd' }}>
                      <button onClick={() => {
                        setSelectedStudent(student.id);
                        fetchStudentFeeDetails(student.id);
                      }} style={{ background: '#3498db', padding: '4px 8px', fontSize: '11px' }}>
                        Record Payment
                      </button>
                    </td>
                  <tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {/* Payment Modal */}
        {studentFeeDetails && (
          <div style={{ marginTop: '2rem', borderTop: '2px solid #ddd', paddingTop: '1rem' }}>
            <h3>Record Payment for {studentFeeDetails.student?.full_name}</h3>
            <div className="stats-grid" style={{ marginBottom: '1rem' }}>
              <div className="stat-card"><h3>₵{studentFeeDetails.total_amount?.toLocaleString()}</h3><p>Total Fees</p></div>
              <div className="stat-card"><h3 style={{ color: '#2ecc71' }}>₵{studentFeeDetails.amount_paid?.toLocaleString()}</h3><p>Amount Paid</p></div>
              <div className="stat-card"><h3 style={{ color: '#e74c3c' }}>₵{studentFeeDetails.balance?.toLocaleString()}</h3><p>Balance</p></div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="number" placeholder="Amount (₵)" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} style={{ padding: '8px', width: '150px' }} />
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ padding: '8px' }}>
                <option value="cash">Cash</option>
                <option value="mobile_money">Mobile Money</option>
                <option value="bank_transfer">Bank Transfer</option>
                <option value="card">Card</option>
              </select>
              <button onClick={handleMakePayment} style={{ background: '#2ecc71' }}>Record Payment</button>
              <button onClick={() => { setStudentFeeDetails(null); setSelectedStudent(''); setPaymentAmount(''); }} style={{ background: '#95a5a6' }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Arrears Modal */}
        {showArrears && arrearsData && (
          <div style={{ marginTop: '2rem', borderTop: '2px solid #ddd', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>📋 Students with Arrears - {selectedTerm} {academicYear}</h3>
              <button onClick={() => setShowArrears(false)} style={{ background: '#95a5a6' }}>Close</button>
            </div>
            <div className="stats-grid" style={{ marginBottom: '1rem' }}>
              <div className="stat-card"><h3>{arrearsData.total_students_owing}</h3><p>Students Owing</p></div>
              <div className="stat-card"><h3>₵{arrearsData.total_owing_amount?.toLocaleString()}</h3><p>Total Arrears</p></div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%' }}>
                <thead><tr><th>Class</th><th>Admission No</th><th>Student Name</th><th>Total Fees</th><th>Paid</th><th>Arrears</th></tr></thead>
                <tbody>
                  {arrearsData.students?.map(s => (
                    <tr key={s.id}>
                      <td>{s.class_name}</td><td>{s.admission_number}</td><td>{s.full_name}</td>
                      <td>₵{s.total_fees?.toLocaleString()}</td><td>₵{s.amount_paid?.toLocaleString()}</td>
                      <td style={{ color: '#e74c3c', fontWeight: 'bold' }}>₵{s.balance?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SchoolFees;
