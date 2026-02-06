import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/index.css';
import './LandingPage.css';
import logo from './large_logo.png';
import bgImage from './tce_img.jpeg';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('scholar');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      navigate('/Dashboard');
    }
  }, [navigate]);

  const handleRoleChange = (e) => {
    const selectedRole = e.target.value;
    setRole(selectedRole);
    if(selectedRole=='admin'){
      window.location.replace('https://tcetrf.web.app/login');
    }
  }

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);

  try {
    const response = await fetch("https://trf-scholar-2.onrender.com/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role }),
    });

    const data = await response.json();

    console.log("Response status:", response.status);
    console.log("Response data:", data);

    if (!response.ok) {
      alert(data.message || "Login failed");
      return;
    }

    // 🔥 THIS IS THE KEY LINE
    localStorage.setItem("user", JSON.stringify(data.user));
    console.log("Stored in localStorage:", localStorage.getItem("user"));

    if (data.user.role === "admin") {
      navigate("Dashboard");
    } else {
      navigate("Dashboard");
    }
  } catch (err) {
    console.error("Login error:", err);
    alert("Server error");
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-header">
        <div className="header-container">
          <div className="logo-section">
            <img src={logo} alt="TCE Logo" className="tce-logo" />
          </div>

          <nav className="header-nav">
            <a href="https://tcetrf.web.app/home" className="nav-link">Home</a>
            <a href="https://tcetrf.web.app/home#about" className="nav-link">About TRF</a>
            <a href="https://tcetrf.web.app/home#eligibility" className="nav-link">Eligibility</a>
            <a href="https://tcetrf.web.app/home#guidelines" className="nav-link">Guidelines</a>
            <a href="https://tcetrf.web.app/home#contact" className="nav-link">Contact</a>
            <button onClick={() => navigate('/')} className="login-btn">
              Login
            </button>
          </nav>
        </div>
       
      </header>

    <div
      style={{
        minHeight: 'calc(100vh - 300px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 2rem',
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(5px)',
          padding: '3rem',
          borderRadius: '1rem',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          width: '100%',
          maxWidth: '450px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: '700', color: '#1f2937' }}>
            TRF Management System
          </h1>
          <p style={{ color: '#6b7280' }}>
            Thiagarajar Research Fellowship
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Login As</label>
            <select
              className="form-input"
              value={role}
              onChange={handleRoleChange}
              required
            >
              <option value="scholar">Scholar</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '1rem' }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-content">
            <div className="footer-section">
              <h4>Thiagarajar College of Engineering</h4>
              <p>Madurai - 625 015, Tamil Nadu, India</p>
            </div>
            <div className="footer-section">
              <h4>Contact</h4>
              <p>Email: <a href="mailto:research@res.tce.edu">research@res.tce.edu</a></p>
              <p>Phone: <a href="tel:+914522482240">+91 452 2482240</a></p>
              <p>Web: <a href="https://www.tce.edu" target="_blank" rel="noopener noreferrer">www.tce.edu</a></p>
            </div>
            <div className="footer-section">
              <h4>Quick Links</h4>
              <p><a href="https://tcetrf.web.app/home">Home</a></p>
              <p><a href="https://tcetrf.web.app/home#about">About TRF</a></p>
              <p><a href="https://tcetrf.web.app/home#eligibility">Eligibility</a></p>
              <p><a href="https://tcetrf.web.app/home#guidelines">Guidelines</a></p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>Copyright © 2026 Thiagarajar College of Engineering. All Rights Reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Login;
