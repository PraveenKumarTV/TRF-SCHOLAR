import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

import '../styles/components.css';

const Layout = ({ children, title }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getNavigationLinks = () => {
        switch (user?.role) {
            case 'scholar':
                return [
                    { path: 'Dashboard', label: 'Dashboard' },
                    { path: '', label: 'Six-Month Review' },
                    { path: '/scholar/publications', label: 'My Publications' },
                    { path: '/scholar/bank-details', label: 'Update Bank Details' },
                    { path: '/scholar/monthly-claim', label: 'Monthly Claim Form' },
                    { path: '/trf-guidelines', label: 'TRF Guidelines' },
                ];
            case 'supervisor':
                return [
                    { path: '/supervisor/dashboard', label: 'Dashboard' },
                ];
            case 'dlc':
                return [
                    { path: '/dlc/dashboard', label: 'Dashboard' },
                ];
            case 'hod':
                return [
                    { path: '/hod/dashboard', label: 'Dashboard' },
                ];
            case 'dean':
                return [
                    { path: '/dean/dashboard', label: 'Dashboard' },
                    { path: '/dean/reports', label: 'Reports' },
                ];
            case 'admin':
                return [
                    { path: '/admin/dashboard', label: 'Dashboard' },
                    { path: '/admin/enroll', label: 'Enroll Scholar' },
                    { path: '/admin/users', label: 'User Management' },
                    { path: '/admin/stipend', label: 'Stipend Config' },
                ];
            default:
                return [];
        }
    };

    const navLinks = getNavigationLinks();

    return (
        <div className="layout">
            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
                <div className="sidebar-header">
                    <h2>TRF System</h2>
                    <button
                        className="sidebar-toggle"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                        {sidebarOpen ? '◀' : '▶'}
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {navLinks.map((link) => (
                        <Link
                            key={link.path}
                            to={link.path}
                            className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
                        >
                            {sidebarOpen && <span className="nav-label">{link.label}</span>}
                        </Link>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        {sidebarOpen && (
                            <>
                                <p className="user-name">{user?.name}</p>
                                <p className="user-role">{user?.role?.toUpperCase()}</p>
                            </>
                        )}
                    </div>
                    <button className="logout-btn" onClick={handleLogout}>
                        {sidebarOpen && 'Logout'}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={`main-content ${sidebarOpen ? '' : 'expanded'}`}>
                <header className="content-header">
                    <h1>{title}</h1>
                    <NotificationPanel />
                </header>
                <div className="content-body">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
