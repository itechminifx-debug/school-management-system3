import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const SchoolContext = createContext();

export const useSchool = () => useContext(SchoolContext);

export const SchoolProvider = ({ children }) => {
  const [schoolSettings, setSchoolSettings] = useState({
    school_name: 'Greenwood High School',
    school_address: '123 Education Street, Accra, Ghana',
    school_phone: '+233 24 123 4567',
    school_email: 'info@greenwood.edu.gh',
    school_website: 'www.greenwood.edu.gh',
    school_motto: 'Excellence in Education',
    currency_symbol: '₵',
    academic_year: '2026',
    term: 'Term 1'
  });
  const [loading, setLoading] = useState(true);

  const apiUrl = 'https://school-management-api-5mml.onrender.com';

  useEffect(() => {
    fetchSchoolSettings();
  }, []);

  const fetchSchoolSettings = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    
    try {
      const response = await axios.get(`${apiUrl}/api/school-settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data && response.data.settings) {
        setSchoolSettings(response.data.settings);
      }
    } catch (error) {
      console.error('Error fetching school settings:', error);
      // Use default settings if API fails
    } finally {
      setLoading(false);
    }
  };

  return (
    <SchoolContext.Provider value={{ schoolSettings, loading }}>
      {children}
    </SchoolContext.Provider>
  );
};