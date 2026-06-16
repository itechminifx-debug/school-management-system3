import React, { useState, useEffect } from 'react';
import axios from 'axios';

function SchoolSettings() {
  const [settings, setSettings] = useState({
    school_name: '',
    school_address: '',
    school_phone: '',
    school_email: '',
    school_website: '',
    school_motto: '',
    academic_year: '2026',
    term: 'Term 1',
    currency_symbol: '₵',
    school_logo: null
  });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);

  const apiUrl = 'https://school-management-api-5mml.onrender.com';

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await axios.get(`${apiUrl}/api/school-settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettings(response.data.settings);
      if (response.data.settings.school_logo) {
        setLogoPreview(response.data.settings.school_logo);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      setError('Failed to load school settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
        setSettings({ ...settings, school_logo: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    const token = localStorage.getItem('token');
    try {
      await axios.put(`${apiUrl}/api/school-settings`, settings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage('✅ School settings updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setError('Failed to update settings');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="container">Loading school settings...</div>;
  }

  return (
    <div className="container">
      <div className="card">
        <h2>🏫 School Settings</h2>
        {message && <div className="success">{message}</div>}
        {error && <div className="error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            <div>
              <label>School Name:</label>
              <input type="text" name="school_name" value={settings.school_name} onChange={handleChange} required />
            </div>
            <div>
              <label>School Motto:</label>
              <input type="text" name="school_motto" value={settings.school_motto} onChange={handleChange} />
            </div>
            <div>
              <label>School Address:</label>
              <textarea name="school_address" value={settings.school_address} onChange={handleChange} rows="2" />
            </div>
            <div>
              <label>School Phone:</label>
              <input type="text" name="school_phone" value={settings.school_phone} onChange={handleChange} />
            </div>
            <div>
              <label>School Email:</label>
              <input type="email" name="school_email" value={settings.school_email} onChange={handleChange} />
            </div>
            <div>
              <label>School Website:</label>
              <input type="text" name="school_website" value={settings.school_website} onChange={handleChange} />
            </div>
            <div>
              <label>Current Academic Year:</label>
              <input type="text" name="academic_year" value={settings.academic_year} onChange={handleChange} />
            </div>
            <div>
              <label>Current Term:</label>
              <select name="term" value={settings.term} onChange={handleChange}>
                <option value="Term 1">Term 1</option>
                <option value="Term 2">Term 2</option>
                <option value="Term 3">Term 3</option>
              </select>
            </div>
            <div>
              <label>Currency Symbol:</label>
              <select name="currency_symbol" value={settings.currency_symbol} onChange={handleChange}>
                <option value="₵">₵ (Ghana Cedi)</option>
                <option value="$">$ (US Dollar)</option>
                <option value="£">£ (British Pound)</option>
                <option value="€">€ (Euro)</option>
                <option value="₦">₦ (Naira)</option>
              </select>
            </div>
            <div>
              <label>School Logo/Crest:</label>
              <input type="file" accept="image/*" onChange={handleLogoUpload} />
              {logoPreview && (
                <div style={{ marginTop: '10px', textAlign: 'center' }}>
                  <img src={logoPreview} alt="School Logo" style={{ maxWidth: '120px', maxHeight: '120px', borderRadius: '8px', border: '1px solid #ddd' }} />
                  <p style={{ fontSize: '12px', marginTop: '5px' }}>Logo Preview</p>
                </div>
              )}
            </div>
          </div>

          <button type="submit" disabled={loading} style={{ marginTop: '1rem' }}>
            {loading ? 'Saving...' : '💾 Save School Settings'}
          </button>
        </form>

        {/* Preview Section */}
        <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'linear-gradient(135deg, #f0f4f8, #e2e8f0)', borderRadius: '16px' }}>
          <h3>📋 Preview</h3>
          <div style={{ textAlign: 'center' }}>
            {logoPreview && <img src={logoPreview} alt="Logo" style={{ maxWidth: '100px', marginBottom: '10px' }} />}
            <h2 style={{ margin: '5px 0', color: '#1e3c72' }}>{settings.school_name}</h2>
            <p style={{ fontStyle: 'italic', color: '#666' }}>"{settings.school_motto}"</p>
            <p>{settings.school_address}</p>
            <p>Tel: {settings.school_phone} | Email: {settings.school_email}</p>
            {settings.school_website && <p>Website: {settings.school_website}</p>}
            <p style={{ marginTop: '10px', fontSize: '12px', color: '#888' }}>
              Academic Year: {settings.academic_year} | Term: {settings.term} | Currency: {settings.currency_symbol}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SchoolSettings;
