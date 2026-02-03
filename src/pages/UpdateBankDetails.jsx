import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import '../styles/components.css';

const UpdateBankDetails = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
    
    // Get user details from localStorage
    const storedUser = JSON.parse(localStorage.getItem('user')) || {};

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [currentDetails, setCurrentDetails] = useState(null);
    const [formData, setFormData] = useState({
        bank_account: '',
        ifsc_code: '',
        bank_name: '',
        branch_name: '',
        passbook_copy: null
    });

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
        const fetchBankDetails = async () => {
            if (!storedUser?.email) return;
            try {
                // Assuming an endpoint exists to get details, otherwise this might need adjustment
                const response = await fetch(`http://localhost:5000/getBankDetails?email=${storedUser.email}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data) {
                        const { bankDetails } = data.data;
                        setCurrentDetails(bankDetails);
                        setFormData(prev => ({
                            ...prev,
                            bank_account: bankDetails.accountNumber || '',
                            ifsc_code: bankDetails.ifscCode || '',
                            bank_name: bankDetails.bankName || '',
                            branch_name: bankDetails.branchName || ''
                        }));
                    }
                }
            } catch (err) {
                console.error('Error fetching bank details:', err);
            }
        };
        fetchBankDetails();
    }, []);

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

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // const handleFileChange = (e) => {
    //     const { name, files } = e.target;
    //     setFormData(prev => ({
    //         ...prev,
    //         [name]: files[0]
    //     }));
    // };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch("http://localhost:5000/bankUpdate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email: storedUser.email, ...formData })
            });
            const data = await res.json();
            if (data.success) {
                alert("Bank details updated successfully!");
                navigate('/Dashboard');
            } else {
                setError(data.message || 'Failed to update bank details');
            }
        } catch (err) {
            console.error(err);
            setError('Failed to update bank details');
        } finally {
            setLoading(false);
        }
    };

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
                        <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', marginLeft: 'auto' }}>
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
                    <h1>Update Bank Details</h1>
                </header>

                <div className="content-body">
                    {currentDetails && (
                        <div className="card" style={{ marginBottom: '2rem' }}>
                            <div className="card-header">
                                <h3>Current Bank Details</h3>
                            </div>
                            <div className="card-body">
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                                    <div>
                                        <div className="stat-label">Bank Name</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 500, color: '#1f2937' }}>{currentDetails.bankName || '-'}</div>
                                    </div>
                                    <div>
                                        <div className="stat-label">Branch Name</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 500, color: '#1f2937' }}>{currentDetails.branchName || '-'}</div>
                                    </div>
                                    <div>
                                        <div className="stat-label">Account Number</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 500, color: '#1f2937' }}>{currentDetails.accountNumber || '-'}</div>
                                    </div>
                                    <div>
                                        <div className="stat-label">IFSC Code</div>
                                        <div style={{ fontSize: '1.1rem', fontWeight: 500, color: '#1f2937' }}>{currentDetails.ifscCode || '-'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="card">
                        <div className="card-header">
                            <h3>Bank Account Information</h3>
                        </div>
                        <div className="card-body">
                            {error && <div className="alert alert-error">{error}</div>}

                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label className="form-label">Bank Name *</label>
                                    <input
                                        type="text"
                                        name="bank_name"
                                        className="form-input"
                                        value={formData.bank_name}
                                        onChange={handleChange}
                                        required
                                        placeholder="e.g., State Bank of India"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Branch Name *</label>
                                    <input
                                        type="text"
                                        name="branch_name"
                                        className="form-input"
                                        value={formData.branch_name}
                                        onChange={handleChange}
                                        required
                                        placeholder="e.g., TCE Campus Branch"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Bank Account Number *</label>
                                    <input
                                        type="text"
                                        name="bank_account"
                                        className="form-input"
                                        value={formData.bank_account}
                                        onChange={handleChange}
                                        required
                                        placeholder="Enter your bank account number"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">IFSC Code *</label>
                                    <input
                                        type="text"
                                        name="ifsc_code"
                                        className="form-input"
                                        value={formData.ifsc_code}
                                        onChange={handleChange}
                                        required
                                        placeholder="e.g., SBIN0001234"
                                    />
                                </div>

                                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                    <button type="submit" className="btn btn-primary" disabled={loading}>
                                        {loading ? 'Updating...' : 'Update Details'}
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => navigate('/Dashboard')}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default UpdateBankDetails;