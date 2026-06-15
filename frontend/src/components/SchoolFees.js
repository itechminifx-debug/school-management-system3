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
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [studentHistory, setStudentHistory] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [classFeeAmount, setClassFeeAmount] = useState('');
  const [currentFeeSetting, setCurrentFeeSetting] = useState(null);
  const [showSettingsMessage, setShowSettingsMessage] = useState('');

  const apiUrl = 'https://school-management-api-5mml.onrender.com';

  useEffect(() => {
    fetchClassLevels();
  }, []);

  useEffect(() => {
    if (selectedClass && selectedTerm && academicYear) {
      fetchFeeSummary();
      fetchFeeSetting();
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

  const fetchFeeSetting = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${apiUrl}/api/school-fees/fee-settings/${selectedClass}/${selectedTerm}/${academicYear}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCurrentFeeSetting(response.data.setting);
      if (response.data.setting) {
        setClassFeeAmount(response.data.setting.fee_amount.toString());
      }
    } catch (error) {
      console.error('Error fetching fee setting:', error);
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

  const fetchReceipt = async (receiptNumber) => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${apiUrl}/api/school-fees/receipt/${receiptNumber}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReceiptData(response.data.receipt);
      setShowReceipt(true);
    } catch (error) {
      console.error('Error fetching receipt:', error);
      setError('Failed to load receipt');
    }
  };

  const handleUpdateFeeSetting = async () => {
    if (!classFeeAmount || classFeeAmount <= 0) {
      setShowSettingsMessage('Please enter a valid fee amount');
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      await axios.put(`${apiUrl}/api/school-fees/fee-settings`, {
        class_level_id: parseInt(selectedClass),
        term: selectedTerm,
        academic_year: academicYear,
        fee_amount: parseFloat(classFeeAmount)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setShowSettingsMessage('✅ Fee amount updated successfully!');
      fetchFeeSetting();
      fetchFeeSummary();
      setTimeout(() => setShowSettingsMessage(''), 3000);
    } catch (err) {
      setShowSettingsMessage('❌ Failed to update fee amount');
      setTimeout(() => setShowSettingsMessage(''), 3000);
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
      const response = await axios.post(`${apiUrl}/api/school-fees/pay`, {
        student_id: selectedStudent.id,
        amount: parseFloat(paymentAmount),
        term: selectedTerm,
        academic_year: academicYear,
        payment_method: paymentMethod,
        notes: `School fee payment for ${selectedTerm} ${academicYear}`
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage(`✅ Payment of ₵${paymentAmount} recorded successfully for ${selectedStudent.full_name}!`);
      setPaymentAmount('');
      setShowPaymentModal(false);
      setSelectedStudent(null);
      fetchFeeSummary();
      
      // Show receipt option
      if (response.data.receipt_number) {
        setTimeout(() => {
          if (window.confirm(`Payment recorded! Receipt number: ${response.data.receipt_number}\n\nWould you like to print the receipt?`)) {
            fetchReceipt(response.data.receipt_number);
          }
        }, 500);
      }
      
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Failed to record payment');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleUndoPayment = async (paymentId, studentName, amount) => {
    if (!window.confirm(`⚠️ UNDO PAYMENT\n\nUndo payment of ₵${amount} for ${studentName}?\n\nThis action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      await axios.delete(`${apiUrl}/api/school-fees/payment/${paymentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setMessage(`↶ Payment of ₵${amount} for ${studentName} has been undone!`);
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

  const handlePrintClassReport = () => {
    if (!feeData) return;
    
    const printWindow = window.open('', '_blank');
    const className = classLevels.find(c => c.id === parseInt(selectedClass))?.name || 'Class';
    const paidStudents = feeData.students.filter(s => s.status === 'paid');
    const partialStudents = feeData.students.filter(s => s.status === 'partial');
    const unpaidStudents = feeData.students.filter(s => s.status === 'unpaid');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>School Fees Report - ${className} - ${selectedTerm} ${academicYear}</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; }
            h1 { color: #1e3c72; text-align: center; }
            h2 { color: #2c3e50; border-bottom: 2px solid #1e3c72; padding-bottom: 5px; margin-top: 30px; }
            .header { text-align: center; margin-bottom: 30px; }
            .school-name { font-size: 24px; font-weight: bold; color: #1e3c72; }
            .report-title { font-size: 18px; margin-top: 10px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background: #1e3c72; color: white; }
            .summary { margin: 20px 0; padding: 15px; background: #f0f4f8; border-radius: 8px; }
            .summary-grid { display: flex; gap: 20px; flex-wrap: wrap; }
            .summary-card { flex: 1; text-align: center; padding: 10px; background: white; border-radius: 8px; }
            .amount-paid { color: #2ecc71; font-weight: bold; }
            .arrears { color: #e74c3c; font-weight: bold; }
            .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #ddd; padding-top: 20px; }
            .status-paid { background: #d4edda; color: #155724; padding: 2px 8px; border-radius: 20px; font-size: 11px; display: inline-block; }
            .status-partial { background: #fff3cd; color: #856404; padding: 2px 8px; border-radius: 20px; font-size: 11px; display: inline-block; }
            .status-unpaid { background: #f8d7da; color: #721c24; padding: 2px 8px; border-radius: 20px; font-size: 11px; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="school-name">🏫 GREENWOOD HIGH SCHOOL</div>
            <div class="report-title">SCHOOL FEES COLLECTION REPORT</div>
            <div>${className} - ${selectedTerm}, ${academicYear} Academic Year</div>
            <div>Fee Amount per Student: ₵${feeData.default_expected}</div>
            <div>Printed: ${new Date().toLocaleString()}</div>
          </div>
          
          <div class="summary">
            <div class="summary-grid">
              <div class="summary-card"><strong>Total Students</strong><br>${feeData.total_students}</div>
              <div class="summary-card"><strong>Total Expected</strong><br>₵${feeData.total_expected?.toLocaleString()}</div>
              <div class="summary-card"><strong>Total Collected</strong><br><span class="amount-paid">₵${feeData.total_collected?.toLocaleString()}</span></div>
              <div class="summary-card"><strong>Total Arrears</strong><br><span class="arrears">₵${feeData.total_arrears?.toLocaleString()}</span></div>
            </div>
          </div>
          
          <h2>✅ FULLY PAID (${paidStudents.length} students)</h2>
          ${paidStudents.length > 0 ? `<table><thead><tr><th>#</th><th>Admission No</th><th>Student Name</th><th>Amount Paid</th><th>Receipt No</th></tr></thead><tbody>
            ${paidStudents.map((s, i) => `<tr><td>${i+1}</td><td>${s.admission_number}</td><td>${s.full_name}</td><td class="amount-paid">₵${s.amount_paid}</td><td>${s.receipt_number?.slice(-8) || '-'}</td></tr>`).join('')}
          </tbody></table>` : '<p>No students have fully paid</p>'}
          
          <h2>⚠️ PARTIAL PAYMENT (${partialStudents.length} students)</h2>
          ${partialStudents.length > 0 ? `<table><thead><tr><th>#</th><th>Admission No</th><th>Student Name</th><th>Expected</th><th>Paid</th><th>Arrears</th></tr></thead><tbody>
            ${partialStudents.map((s, i) => `<tr><td>${i+1}</td><td>${s.admission_number}</td><td>${s.full_name}</td><td>₵${s.expected_amount}</td><td>₵${s.amount_paid}</td><td class="arrears">₵${s.arrears}</td></tr>`).join('')}
          </tbody></table>` : '<p>No students with partial payment</p>'}
          
          <h2>❌ NO PAYMENT (${unpaidStudents.length} students)</h2>
          ${unpaidStudents.length > 0 ? `<table><thead><tr><th>#</th><th>Admission No</th><th>Student Name</th><th>Expected Amount</th></tr></thead><tbody>
            ${unpaidStudents.map((s, i) => `<tr><td>${i+1}</td><td>${s.admission_number}</td><td>${s.full_name}</td><td>₵${s.expected_amount}</td></tr>`).join('')}
          </tbody></table>` : '<p>All students have paid something</p>'}
          
          <div class="footer">Generated by School Management System</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handlePrintReceipt = () => {
    if (!receiptData) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment Receipt - ${receiptData.receipt_number}</title>
          <style>
            body { font-family: 'Courier New', monospace; margin: 0; padding: 20px; }
            .receipt { max-width: 300px; margin: 0 auto; border: 1px solid #000; padding: 20px; }
            .header { text-align: center; border-bottom: 1px dashed #000; margin-bottom: 15px; }
            .school-name { font-size: 18px; font-weight: bold; }
            .receipt-title { font-size: 14px; margin-top: 5px; }
            .info-row { margin: 10px 0; display: flex; justify-content: space-between; }
            .amount { font-size: 18px; font-weight: bold; margin: 15px 0; text-align: center; }
            .footer { text-align: center; font-size: 10px; margin-top: 20px; padding-top: 10px; border-top: 1px dashed #000; }
            hr { margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <div class="school-name">GREENWOOD HIGH SCHOOL</div>
              <div class="receipt-title">SCHOOL FEES PAYMENT RECEIPT</div>
            </div>
            <div class="info-row"><span>Receipt No:</span><strong>${receiptData.receipt_number}</strong></div>
            <div class="info-row"><span>Date:</span>${new Date(receiptData.payment_date).toLocaleDateString()}</div>
            <hr>
            <div class="info-row"><span>Student Name:</span><strong>${receiptData.student_name || receiptData.full_name}</strong></div>
            <div class="info-row"><span>Admission No:</span>${receiptData.admission_number}</div>
            <div class="info-row"><span>Class:</span>${receiptData.class_name}</div>
            <div class="info-row"><span>Term:</span>${receiptData.term} ${receiptData.academic_year}</div>
            <hr>
            <div class="info-row"><span>Payment Method:</span>${receiptData.payment_method?.toUpperCase()}</div>
            <div class="amount">Amount Paid: ₵${receiptData.amount_paid}</div>
            <hr>
            <div class="info-row"><span>Collected By:</span>${receiptData.collected_by_name || 'Cashier'}</div>
            <div class="footer">
              Thank you for your payment!<br>
              This is a computer-generated receipt.
            </div>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getClassName = (id) => {
    const cls = classLevels.find(c => c.id === id);
    return cls ? cls.name : 'Select Class';
  };

  const getStatusBadge = (status) => {
    if (status === 'paid') return <span style={{ background: '#2ecc71', color: 'white', padding: '4px 8px', borderRadius: '20px', fontSize: '11px' }}>✓ FULLY PAID</span>;
    if (status === 'partial') return <span style={{ background: '#f39c12', color: 'white', padding: '4px 8px', borderRadius: '20px', fontSize: '11px' }}>⚠ PARTIAL</span>;
    return <span style={{ background: '#e74c3c', color: 'white', padding: '4px 8px', borderRadius: '20px', fontSize: '11px' }}>✗ NOT PAID</span>;
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
              <option value="Term 1">Term 1</option><option value="Term 2">Term 2</option><option value="Term 3">Term 3</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label>Academic Year:</label>
            <input type="text" value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="form-control" />
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5px' }}>
            <button onClick={handlePrintClassReport} style={{ background: '#2ecc71', padding: '8px 16px' }}>🖨️ Print Report</button>
            <button onClick={() => setShowSettingsModal(true)} style={{ background: '#f39c12', padding: '8px 16px' }}>⚙️ Set Fee</button>
          </div>
        </div>

        {/* Current Fee Display */}
        {currentFeeSetting && (
          <div className="success" style={{ textAlign: 'center', marginBottom: '1rem' }}>
            📌 {getClassName(parseInt(selectedClass))} Fee: ₵{currentFeeSetting.fee_amount} per student for {selectedTerm} {academicYear}
          </div>
        )}

        {/* Summary Stats */}
        {feeData && (
          <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="stat-card"><h3>{feeData.total_students}</h3><p>Total Students</p></div>
            <div className="stat-card"><h3>{feeData.paid_count}</h3><p>Fully Paid ✓</p></div>
            <div className="stat-card"><h3>{feeData.partial_count}</h3><p>Partial ⚠</p></div>
            <div className="stat-card"><h3>{feeData.unpaid_count}</h3><p>Not Paid ✗</p></div>
            <div className="stat-card"><h3>₵{feeData.total_collected?.toLocaleString()}</h3><p>Total Collected</p></div>
            <div className="stat-card"><h3 style={{ color: '#e74c3c' }}>₵{feeData.total_arrears?.toLocaleString()}</h3><p>Total Arrears</p></div>
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
                  <th>Admission No</th><th>Student Name</th><th>Expected</th><th>Paid</th><th>Arrears</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {feeData.students.map(student => (
                  <tr key={student.id} style={{ borderBottom: '1px solid #ddd', background: student.status === 'partial' ? '#fff3cd' : student.status === 'unpaid' ? '#f8d7da' : 'white' }}>
                    <td>{student.admission_number}</td>
                    <td><strong>{student.full_name}</strong></td>
                    <td>₵{student.expected_amount}</td>
                    <td style={{ color: '#2ecc71' }}>₵{student.amount_paid}</td>
                    <td style={{ color: '#e74c3c', fontWeight: 'bold' }}>₵{student.arrears}</td>
                    <td>{getStatusBadge(student.status)}</td>
                    <td>
                      {student.status !== 'paid' ? (
                        <button onClick={() => { setSelectedStudent(student); setPaymentAmount(''); setShowPaymentModal(true); }} style={{ background: '#3498db', padding: '4px 12px', marginRight: '5px' }}>Pay</button>
                      ) : (
                        <button onClick={() => handleUndoPayment(student.payment_id, student.full_name, student.amount_paid)} style={{ background: '#e74c3c', padding: '4px 12px', marginRight: '5px' }}>Undo</button>
                      )}
                      <button onClick={() => fetchStudentHistory(student)} style={{ background: '#95a5a6', padding: '4px 12px', marginRight: '5px' }}>History</button>
                      {student.receipt_number && (
                        <button onClick={() => fetchReceipt(student.receipt_number)} style={{ background: '#2ecc71', padding: '4px 8px' }}>Receipt</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {/* Settings Modal */}
        {showSettingsModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '400px' }}>
              <h3>Set Fee Amount for {getClassName(parseInt(selectedClass))}</h3>
              <p><strong>Term:</strong> {selectedTerm} {academicYear}</p>
              {showSettingsMessage && <div className={showSettingsMessage.includes('✅') ? 'success' : 'error'} style={{ marginBottom: '1rem' }}>{showSettingsMessage}</div>}
              <div><label>Fee Amount (₵):</label><input type="number" value={classFeeAmount} onChange={(e) => setClassFeeAmount(e.target.value)} placeholder="Enter fee amount" style={{ width: '100%', padding: '0.5rem', margin: '0.5rem 0' }} /></div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button onClick={() => { setShowSettingsModal(false); setShowSettingsMessage(''); }} style={{ background: '#95a5a6' }}>Cancel</button>
                <button onClick={handleUpdateFeeSetting} style={{ background: '#2ecc71' }}>Save</button>
              </div>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && selectedStudent && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '400px' }}>
              <h3>Record Payment</h3>
              <p><strong>Student:</strong> {selectedStudent.full_name}</p>
              <p><strong>Expected Amount:</strong> ₵{selectedStudent.expected_amount}</p>
              <p><strong>Current Arrears:</strong> ₵{selectedStudent.arrears}</p>
              <div><label>Amount to Pay (₵):</label><input type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="Enter amount" style={{ width: '100%', padding: '0.5rem', margin: '0.5rem 0' }} /></div>
              <div><label>Payment Method:</label><select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ width: '100%', padding: '0.5rem', margin: '0.5rem 0' }}><option value="cash">Cash</option><option value="mobile_money">Mobile Money</option><option value="bank_transfer">Bank Transfer</option><option value="card">Card</option></select></div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button onClick={() => { setShowPaymentModal(false); setSelectedStudent(null); }} style={{ background: '#95a5a6' }}>Cancel</button>
                <button onClick={handleRecordPayment} style={{ background: '#2ecc71' }}>Record Payment</button>
              </div>
            </div>
          </div>
        )}

        {/* History Modal */}
        {showHistory && studentHistory && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '500px', maxHeight: '80%', overflowY: 'auto' }}>
              <h3>Payment History - {studentHistory.student?.full_name}</h3>
              {studentHistory.payments?.length === 0 ? <p>No payment records found.</p> : (
                <table style={{ width: '100%' }}>
                  <thead><tr style={{ background: '#1e3c72', color: 'white' }}><th>Term</th><th>Year</th><th>Amount</th><th>Date</th><th>Receipt</th></tr></thead>
                  <tbody>
                    {studentHistory.payments?.map(p => (
                      <tr key={p.id}>
                        <td>{p.term}</td><td>{p.academic_year}</td><td style={{ color: '#2ecc71' }}>₵{p.amount_paid}</td>
                        <td>{new Date(p.payment_date).toLocaleDateString()}</td>
                        <td><button onClick={() => fetchReceipt(p.receipt_number)} style={{ background: '#2ecc71', padding: '2px 6px', fontSize: '10px' }}>View</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <button onClick={() => { setShowHistory(false); setStudentHistory(null); }} style={{ background: '#95a5a6', marginTop: '1rem' }}>Close</button>
            </div>
          </div>
        )}

        {/* Receipt Modal */}
        {showReceipt && receiptData && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', width: '400px' }}>
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <h3>🏫 GREENWOOD HIGH SCHOOL</h3>
                <p><strong>SCHOOL FEES RECEIPT</strong></p>
              </div>
              <div style={{ borderTop: '1px dashed #ddd', borderBottom: '1px dashed #ddd', padding: '10px 0' }}>
                <p><strong>Receipt No:</strong> {receiptData.receipt_number}</p>
                <p><strong>Date:</strong> {new Date(receiptData.payment_date).toLocaleDateString()}</p>
                <p><strong>Student:</strong> {receiptData.student_name || receiptData.full_name}</p>
                <p><strong>Admission No:</strong> {receiptData.admission_number}</p>
                <p><strong>Class:</strong> {receiptData.class_name}</p>
                <p><strong>Term:</strong> {receiptData.term} {receiptData.academic_year}</p>
                <p><strong>Amount Paid:</strong> ₵{receiptData.amount_paid}</p>
                <p><strong>Payment Method:</strong> {receiptData.payment_method?.toUpperCase()}</p>
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
                <button onClick={handlePrintReceipt} style={{ background: '#2ecc71' }}>🖨️ Print Receipt</button>
                <button onClick={() => { setShowReceipt(false); setReceiptData(null); }} style={{ background: '#95a5a6' }}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SchoolFees;
