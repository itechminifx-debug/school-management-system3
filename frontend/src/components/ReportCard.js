import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSchool } from '../context/SchoolContext';

function ReportCard() {
  const { schoolSettings } = useSchool();
  const [classLevels, setClassLevels] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [reportCard, setReportCard] = useState(null);
  const [term, setTerm] = useState('Term 1');
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const apiUrl = 'https://school-management-api-5mml.onrender.com';

  useEffect(() => {
    fetchClassLevels();
    fetchAllStudents();
  }, []);

  useEffect(() => {
    if (selectedClass && students.length > 0) {
      const filtered = students.filter(s => s.class_level_id === parseInt(selectedClass));
      setFilteredStudents(filtered);
      setSelectedStudent('');
      setReportCard(null);
    }
  }, [selectedClass, students]);

  useEffect(() => {
    if (selectedStudent && term && academicYear) {
      fetchReportCard();
    }
  }, [selectedStudent, term, academicYear]);

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

  const fetchAllStudents = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${apiUrl}/api/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(response.data.students);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchReportCard = async () => {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('token');
    
    try {
      const response = await axios.get(
        `${apiUrl}/api/grades/report/${selectedStudent}/${term}/${academicYear}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      let filteredGrades = response.data.grades || [];
      const studentData = filteredStudents.find(s => s.id === parseInt(selectedStudent));
      const classId = studentData?.class_level_id;
      
      let allowedSubjects = [];
      
      if (classId === 4 || classId === 5) {
        allowedSubjects = ['Literacy', 'Numeracy', 'Creative Arts', 'Religious & Moral Education', 'Phonics'];
      } else if (classId === 6 || classId === 7 || classId === 8) {
        allowedSubjects = ['English Language', 'Mathematics', 'Science', 'Religious & Moral Education', 'French', 'Creative Arts', 'Phonics'];
      } else if (classId === 9 || classId === 10 || classId === 11) {
        allowedSubjects = ['English Language', 'Mathematics', 'Science', 'History', 'Creative Arts', 'Religious & Moral Education', 'Computing', 'Ghanaian Language', 'French'];
      } else if (classId === 12 || classId === 13 || classId === 14) {
        allowedSubjects = ['English Language', 'Mathematics', 'Integrated Science', 'Social Studies', 'Religious & Moral Education', 'Career Technology', 'Computing', 'Ghanaian Language', 'Creative Arts', 'French'];
      }
      
      filteredGrades = filteredGrades.filter(grade => allowedSubjects.includes(grade.subject));
      
      const existingSubjects = filteredGrades.map(g => g.subject);
      const missingSubjects = allowedSubjects.filter(s => !existingSubjects.includes(s));
      
      missingSubjects.forEach(subject => {
        filteredGrades.push({
          subject: subject,
          score: '-',
          grade_letter: '-'
        });
      });
      
      filteredGrades.sort((a, b) => {
        return allowedSubjects.indexOf(a.subject) - allowedSubjects.indexOf(b.subject);
      });
      
      let totalScore = 0;
      let gradedCount = 0;
      filteredGrades.forEach(g => {
        if (g.score !== '-' && g.score !== '') {
          totalScore += parseFloat(g.score);
          gradedCount++;
        }
      });
      const average = gradedCount > 0 ? (totalScore / gradedCount).toFixed(1) : 0;
      
      let performance = 'Needs Improvement';
      if (average >= 80) performance = 'Excellent';
      else if (average >= 70) performance = 'Very Good';
      else if (average >= 60) performance = 'Good';
      else if (average >= 50) performance = 'Average';
      
      setReportCard({
        ...response.data,
        grades: filteredGrades,
        summary: {
          total_subjects: allowedSubjects.length,
          total_score: totalScore,
          average_score: average,
          performance: performance
        }
      });
    } catch (error) {
      console.error('Error fetching report card:', error);
      setError('No grades found for this student.');
      setReportCard(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getGradeLetter = (score) => {
    if (score === '-' || !score) return '-';
    const s = parseFloat(score);
    if (s >= 80) return 'A';
    if (s >= 70) return 'B';
    if (s >= 60) return 'C';
    if (s >= 50) return 'D';
    return 'F';
  };

  const getGradeRemark = (score) => {
    if (score === '-' || !score) return 'Not Graded';
    const s = parseFloat(score);
    if (s >= 80) return 'Excellent';
    if (s >= 70) return 'Very Good';
    if (s >= 60) return 'Good';
    if (s >= 50) return 'Average';
    return 'Needs Improvement';
  };

  const getClassName = (classLevelId) => {
    const classLevel = classLevels.find(c => c.id === classLevelId);
    return classLevel ? classLevel.name : 'N/A';
  };

  return (
    <div className="container">
      <div className="card">
        <h2>📄 Term Report Card</h2>
        
        {error && <div className="error">{error}</div>}
        
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          flexWrap: 'wrap', 
          marginBottom: '1.5rem',
          padding: '1rem',
          background: '#f7fafc',
          borderRadius: '12px'
        }}>
          <div style={{ flex: 1, minWidth: '150px' }}>
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
          
          <div style={{ flex: 1, minWidth: '150px' }}>
            <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.3rem' }}>Select Student:</label>
            <select 
              value={selectedStudent} 
              onChange={(e) => setSelectedStudent(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '8px' }}
            >
              <option value="">-- Select Student --</option>
              {filteredStudents.map(s => (
                <option key={s.id} value={s.id}>
                  {s.admission_number} - {s.full_name}
                </option>
              ))}
            </select>
          </div>
          
          <div style={{ flex: 1, minWidth: '120px' }}>
            <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.3rem' }}>Term:</label>
            <select 
              value={term} 
              onChange={(e) => setTerm(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '8px' }}
            >
              <option>Term 1</option>
              <option>Term 2</option>
              <option>Term 3</option>
            </select>
          </div>
          
          <div style={{ flex: 1, minWidth: '120px' }}>
            <label style={{ fontWeight: '600', display: 'block', marginBottom: '0.3rem' }}>Academic Year:</label>
            <input 
              type="text" 
              value={academicYear} 
              onChange={(e) => setAcademicYear(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '8px' }}
            />
          </div>
        </div>
      </div>

      {loading && (
        <div className="card" style={{ textAlign: 'center' }}>
          <p>Loading report card...</p>
        </div>
      )}

      {!loading && reportCard && reportCard.grades && reportCard.grades.length > 0 && (
        <>
          <div className="report-card-container" id="report-card">
            <div className="report-card">
              {/* School Header with Logo and Settings */}
              <div className="school-header">
                {schoolSettings.school_logo && (
                  <div className="school-logo">
                    <img src={schoolSettings.school_logo} alt="School Logo" style={{ maxWidth: '100px', maxHeight: '100px' }} />
                  </div>
                )}
                <h1>{schoolSettings.school_name}</h1>
                <p className="school-motto">"{schoolSettings.school_motto}"</p>
                <p>{schoolSettings.school_address}</p>
                <p>Tel: {schoolSettings.school_phone} | Email: {schoolSettings.school_email}</p>
                {schoolSettings.school_website && <p>Website: {schoolSettings.school_website}</p>}
                <div className="report-title">
                  <h2>TERM REPORT CARD</h2>
                  <p>{term}, {academicYear} Academic Year</p>
                </div>
              </div>

              <div className="student-info">
                <table className="info-table">
                  <tbody>
                    <tr>
                      <td><strong>Student Name:</strong></td>
                      <td>{reportCard.student?.full_name}</td>
                      <td><strong>Admission No:</strong></td>
                      <td>{reportCard.student?.admission_number}</td>
                    </tr>
                    <tr>
                      <td><strong>Class:</strong></td>
                      <td>{getClassName(reportCard.student?.class_level_id)}</td>
                      <td><strong>Term:</strong></td>
                      <td>{reportCard.term}</td>
                    </tr>
                    <tr>
                      <td><strong>Academic Year:</strong></td>
                      <td>{reportCard.academic_year}</td>
                      <td><strong>Date Issued:</strong></td>
                      <td>{new Date().toLocaleDateString()}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="grades-table">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Score (%)</th>
                      <th>Grade</th>
                      <th>Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportCard.grades.map((grade, index) => (
                      <tr key={index}>
                        <td>{grade.subject}</td>
                        <td>{grade.score === '-' ? '-' : grade.score}</td>
                        <td>{grade.grade_letter === '-' ? '-' : (grade.grade_letter || getGradeLetter(grade.score))}</td>
                        <td>{grade.score === '-' ? 'Not Graded' : getGradeRemark(grade.score)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="summary-section">
                <div className="summary-box">
                  <h3>Performance Summary</h3>
                  <table className="summary-table">
                    <tbody>
                      <tr>
                        <td><strong>Total Subjects:</strong></td>
                        <td>{reportCard.summary?.total_subjects}</td>
                      </tr>
                      <tr>
                        <td><strong>Total Score:</strong></td>
                        <td>{reportCard.summary?.total_score}</td>
                      </tr>
                      <tr>
                        <td><strong>Average Score:</strong></td>
                        <td>{reportCard.summary?.average_score}%</td>
                      </tr>
                      <tr>
                        <td><strong>Overall Performance:</strong></td>
                        <td className="performance">{reportCard.summary?.performance}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="comments-section">
                <div className="teacher-comment">
                  <strong>Teacher's Comment:</strong>
                  <div className="comment-line">
                    _________________________________________________________
                  </div>
                </div>
                <div className="principal-comment">
                  <strong>Principal's Comment:</strong>
                  <div className="comment-line">
                    _________________________________________________________
                  </div>
                </div>
              </div>

              <div className="signatures">
                <div className="signature">
                  <p>_____________________</p>
                  <p><strong>Class Teacher</strong></p>
                </div>
                <div className="signature">
                  <p>_____________________</p>
                  <p><strong>Principal</strong></p>
                </div>
                <div className="signature">
                  <p>_____________________</p>
                  <p><strong>Parent's Signature</strong></p>
                </div>
              </div>

              <div className="footer">
                <p>* This report card is officially issued by {schoolSettings.school_name} *</p>
              </div>
            </div>
          </div>

          <div className="card" style={{ textAlign: 'center', marginTop: '2rem' }}>
            <button onClick={handlePrint} style={{ 
              background: '#48bb78',
              padding: '1rem 2rem',
              fontSize: '1.1rem'
            }}>
              🖨️ Print Report Card
            </button>
          </div>
        </>
      )}

      {!loading && selectedStudent && reportCard && reportCard.grades?.length === 0 && (
        <div className="card">
          <div className="error" style={{ textAlign: 'center' }}>
            No grades found for this student in {term}, {academicYear}.
          </div>
        </div>
      )}
    </div>
  );
}

export default ReportCard;
