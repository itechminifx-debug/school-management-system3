import React, { useState, useEffect } from 'react';
import axios from 'axios';

function Grades() {
  const [classLevels, setClassLevels] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [gradesData, setGradesData] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [term, setTerm] = useState('Term 1');
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear().toString());

  useEffect(() => {
    fetchClassLevels();
    fetchAllStudents();
  }, []);

  useEffect(() => {
    if (selectedClass && students.length > 0) {
      const filtered = students.filter(s => s.class_level_id === parseInt(selectedClass));
      setFilteredStudents(filtered);
    } else {
      setFilteredStudents([]);
    }
  }, [selectedClass, students]);

  useEffect(() => {
    if (selectedClass) {
      fetchSubjectsByClass();
    }
  }, [selectedClass]);

  useEffect(() => {
    if (filteredStudents.length > 0 && subjects.length > 0) {
      fetchAllGrades();
    }
  }, [filteredStudents, subjects, term, academicYear]);

  const fetchClassLevels = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get('https://school-management-api-5mml.onrender.com/api/class-levels', {
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
      const response = await axios.get('https://school-management-api-5mml.onrender.com/api/students', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudents(response.data.students);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchSubjectsByClass = async () => {
    const token = localStorage.getItem('token');
    setLoading(true);
    try {
      const response = await axios.get(`https://school-management-api-5mml.onrender.com/api/subjects/by-class/${selectedClass}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      let subjectsList = response.data.subjects;
      const classId = parseInt(selectedClass);
      
      if (classId === 4 || classId === 5) {
        subjectsList = [
          { id: 1, name: 'Literacy', is_core: true },
          { id: 2, name: 'Numeracy', is_core: true },
          { id: 3, name: 'Creative Arts', is_core: true },
          { id: 4, name: 'Religious & Moral Education', is_core: true },
          { id: 5, name: 'Phonics', is_core: true }
        ];
      } else if (classId === 6 || classId === 7 || classId === 8) {
        subjectsList = [
          { id: 1, name: 'English Language', is_core: true },
          { id: 2, name: 'Mathematics', is_core: true },
          { id: 3, name: 'Science', is_core: true },
          { id: 4, name: 'Religious & Moral Education', is_core: true },
          { id: 5, name: 'French', is_core: false },
          { id: 6, name: 'Creative Arts', is_core: false },
          { id: 7, name: 'Phonics', is_core: false }
        ];
      } else if (classId === 9 || classId === 10 || classId === 11) {
        subjectsList = [
          { id: 1, name: 'English Language', is_core: true },
          { id: 2, name: 'Mathematics', is_core: true },
          { id: 3, name: 'Science', is_core: true },
          { id: 4, name: 'History', is_core: true },
          { id: 5, name: 'Creative Arts', is_core: true },
          { id: 6, name: 'Religious & Moral Education', is_core: true },
          { id: 7, name: 'Computing', is_core: true },
          { id: 8, name: 'Ghanaian Language', is_core: true },
          { id: 9, name: 'French', is_core: false }
        ];
      } else if (classId === 12 || classId === 13 || classId === 14) {
        subjectsList = [
          { id: 1, name: 'English Language', is_core: true },
          { id: 2, name: 'Mathematics', is_core: true },
          { id: 3, name: 'Integrated Science', is_core: true },
          { id: 4, name: 'Social Studies', is_core: true },
          { id: 5, name: 'Religious & Moral Education', is_core: true },
          { id: 6, name: 'Career Technology', is_core: false },
          { id: 7, name: 'Computing', is_core: false },
          { id: 8, name: 'Ghanaian Language', is_core: false },
          { id: 9, name: 'Creative Arts', is_core: false },
          { id: 10, name: 'French', is_core: false }
        ];
      }
      
      setSubjects(subjectsList);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      setSubjects([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllGrades = async () => {
    const token = localStorage.getItem('token');
    const gradesMap = {};
    
    for (const student of filteredStudents) {
      try {
        const response = await axios.get(
          `https://school-management-api-5mml.onrender.com/api/grades/report/${student.id}/${term}/${academicYear}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        const studentGrades = {};
        if (response.data.grades) {
          response.data.grades.forEach(grade => {
            studentGrades[grade.subject] = grade.score;
          });
        }
        gradesMap[student.id] = studentGrades;
      } catch (error) {
        gradesMap[student.id] = {};
      }
    }
    setGradesData(gradesMap);
  };

  const handleGradeChange = (studentId, subject, value) => {
    setGradesData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [subject]: value
      }
    }));
  };

  const handleSaveAllGrades = async () => {
    setSaving(true);
    const token = localStorage.getItem('token');
    let successCount = 0;
    let errorCount = 0;

    for (const student of filteredStudents) {
      for (const subject of subjects) {
        const score = gradesData[student.id]?.[subject.name];
        if (score && score !== '') {
          try {
            await axios.post('https://school-management-api-5mml.onrender.com/api/grades', {
              student_id: student.id,
              subject: subject.name,
              score: parseFloat(score),
              term: term,
              academic_year: academicYear
            }, { headers: { Authorization: `Bearer ${token}` } });
            successCount++;
          } catch (error) {
            errorCount++;
          }
        }
      }
    }

    setMessage(`✅ Saved ${successCount} grades. ${errorCount} errors.`);
    setTimeout(() => setMessage(''), 3000);
    setSaving(false);
    fetchAllGrades();
  };

  const getGradeLetter = (score) => {
    if (!score && score !== 0) return '-';
    const s = parseFloat(score);
    if (s >= 80) return 'A';
    if (s >= 70) return 'B';
    if (s >= 60) return 'C';
    if (s >= 50) return 'D';
    return 'F';
  };

  const getGradeColor = (score) => {
    if (!score && score !== 0) return '#e2e8f0';
    const s = parseFloat(score);
    if (s >= 80) return '#48bb78';
    if (s >= 70) return '#4299e1';
    if (s >= 60) return '#ed8936';
    if (s >= 50) return '#ecc94b';
    return '#f56565';
  };

  const getClassName = (classLevelId) => {
    const classLevel = classLevels.find(c => c.id === classLevelId);
    return classLevel ? classLevel.name : 'Select Class';
  };

  if (loading && subjects.length === 0) {
    return <div className="container">Loading subjects...</div>;
  }

  return (
    <div className="container">
      <div className="card">
        <h2>📊 Grade Management System</h2>
        {message && <div className="success">{message}</div>}
        
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

        {selectedClass && filteredStudents.length === 0 && (
          <div className="error" style={{ textAlign: 'center', marginBottom: '1rem' }}>
            No students found in {getClassName(parseInt(selectedClass))}.
          </div>
        )}

        {filteredStudents.length > 0 && subjects.length === 0 && (
          <div className="error" style={{ textAlign: 'center', marginBottom: '1rem' }}>
            No subjects defined for {getClassName(parseInt(selectedClass))}.
          </div>
        )}

        {filteredStudents.length > 0 && subjects.length > 0 && (
          <>
            <div className="success" style={{ marginBottom: '1rem' }}>
              📍 {filteredStudents.length} student(s) | {subjects.length} subject(s)
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table className="grade-table">
                <thead>
                  <tr>
                    <th style={{ minWidth: '150px', position: 'sticky', left: 0, background: '#1e3c72' }}>Student</th>
                    <th style={{ minWidth: '100px', position: 'sticky', left: '150px', background: '#1e3c72' }}>Admission No</th>
                    {subjects.map(subject => (
                      <th key={subject.id} style={{ minWidth: '90px' }}>{subject.name}</th>
                    ))}
                    <th style={{ minWidth: '80px' }}>Avg</th>
                    <th style={{ minWidth: '80px' }}>Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map(student => {
                    let totalScore = 0;
                    let subjectCount = 0;
                    subjects.forEach(subject => {
                      const score = gradesData[student.id]?.[subject.name];
                      if (score && score !== '') {
                        totalScore += parseFloat(score);
                        subjectCount++;
                      }
                    });
                    const average = subjectCount > 0 ? (totalScore / subjectCount).toFixed(1) : '-';
                    const letterGrade = average !== '-' ? getGradeLetter(average) : '-';
                    
                    return (
                      <tr key={student.id}>
                        <td style={{ position: 'sticky', left: 0, background: 'white', fontWeight: '600' }}>{student.full_name}</td>
                        <td style={{ position: 'sticky', left: '150px', background: 'white' }}>{student.admission_number}</td>
                        {subjects.map(subject => (
                          <td key={subject.id}>
                            <input
                              type="number"
                              value={gradesData[student.id]?.[subject.name] || ''}
                              onChange={(e) => handleGradeChange(student.id, subject.name, e.target.value)}
                              step="1"
                              min="0"
                              max="100"
                              style={{
                                width: '70px',
                                padding: '0.5rem',
                                textAlign: 'center',
                                border: `2px solid ${getGradeColor(gradesData[student.id]?.[subject.name])}`,
                                borderRadius: '8px'
                              }}
                            />
                          </td>
                        ))}
                        <td style={{ fontWeight: 'bold', textAlign: 'center' }}>{average !== '-' ? `${average}%` : '-'}</td>
                        <td style={{ textAlign: 'center' }}>
                          {letterGrade !== '-' && (
                            <span style={{ background: getGradeColor(average), color: 'white', padding: '0.2rem 0.6rem', borderRadius: '20px' }}>
                              {letterGrade}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={handleSaveAllGrades} disabled={saving}>
                {saving ? 'Saving...' : '💾 Save All Grades'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Grades;
