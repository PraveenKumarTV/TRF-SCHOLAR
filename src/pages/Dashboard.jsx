import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import '../styles/components.css';

const Dashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
    
    // Get user details from localStorage
    const storedUser = JSON.parse(localStorage.getItem('user')) || {};

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/');
    };

    const getNavigationLinks = () => {
        const role = storedUser.role || 'scholar';
        switch (role) {
            case 'scholar':
                return [
                    { path: '/Dashboard', label: 'Dashboard' },
                    // { path: '/SixMonthReview', label: 'Six-Month Review' },
                    { path: '/Publications', label: 'My Publications' },
                    { path: '/UpdateBankDetails', label: 'Update Bank Details' },
                    { path: '/MonthlyClaimForm', label: 'Monthly Claim Form' },
                    { path: 'https://drive.google.com/file/d/1vht_RfO9R7Ygqam1XZN4AUWv8BXIzPll/view?usp=drive_link', label: 'TRF Guidelines', isExternal: true },
                ];
            case 'admin':
                return [
                    { path: '/Dashboard', label: 'Dashboard' },
                ];
            default:
                return [];
        }
    };

    const navLinks = getNavigationLinks();

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (!mobile) {
                setSidebarOpen(true);
            } else {
                setSidebarOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (isMobile && sidebarOpen) {
                const sidebar = document.querySelector('.sidebar');
                const hamburger = document.querySelector('.hamburger-menu');
                if (sidebar && !sidebar.contains(event.target) && hamburger && !hamburger.contains(event.target)) {
                    setSidebarOpen(false);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMobile, sidebarOpen]);

    return (
        <div className="layout">
            {/* Sidebar */}
            <aside 
                className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}
                style={isMobile ? {
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    height: '100vh',
                    zIndex: 1000,
                    width: '250px',
                    transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
                    transition: 'transform 0.3s ease-in-out',
                    boxShadow: '2px 0 5px rgba(0,0,0,0.1)'
                } : {}}
            >
                <div className="sidebar-header">
                    <h2>TRF System</h2>
                    {!isMobile && (
                        <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
                            {sidebarOpen ? '◀' : '▶'}
                        </button>
                    )}
                    {isMobile && (
                        <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', marginLeft: 'auto', color: 'white' }}>
                            ✕
                        </button>
                    )}
                </div>

                <nav className="sidebar-nav">
                    {navLinks.map((link) => (
                        link.isExternal ? (
                            <a
                                key={link.path}
                                href={link.path}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
                            >
                                {sidebarOpen && <span className="nav-label">{link.label}</span>}
                            </a>
                        ) : (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
                            >
                                {sidebarOpen && <span className="nav-label">{link.label}</span>}
                            </Link>
                        )
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        {sidebarOpen && (
                            <>
                                <p className="user-name">{storedUser?.name}</p>
                                <p className="user-role">{storedUser?.role?.toUpperCase()}</p>
                            </>
                        )}
                    </div>
                    <button className="logout-btn" onClick={handleLogout}>
                        {sidebarOpen && 'Logout'}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={`main-content ${sidebarOpen && !isMobile ? '' : 'expanded'}`}>
                <header className="content-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {isMobile && (
                        <button 
                            className="hamburger-menu"
                            onClick={() => setSidebarOpen(true)}
                            style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}
                        >
                            ☰
                        </button>
                    )}
                    <h1>Dashboard</h1>
                </header>

                <div className="content-body">
                    <div className="stats-grid">
                        <div className="stat-card" style={{ background: 'linear-gradient(180deg, #1e3a8a 0%, #1e40af 100%)', color: 'white' }}>
                            <div className="stat-value" style={{ fontSize: '2rem', fontWeight: 700, color: 'white' }}>{storedUser.npublications || 0}</div>
                            <div className="stat-label" style={{ fontSize: '0.875rem', color: 'white', marginBottom: '0.5rem' }}>Total No of Publications</div>
                        </div>
                        <div className="stat-card" style={{ background: 'linear-gradient(180deg, #1e3a8a 0%, #1e40af 100%)', color: 'white' }}>
                            <div className="stat-value" style={{ fontSize: '2rem', fontWeight: 700, color: 'white' }}>Rs. {storedUser.tclaim || 0}</div>
                            <div className="stat-label" style={{ fontSize: '0.875rem', color: 'white', marginBottom: '0.5rem' }}>Total Claim Received</div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Dashboard;