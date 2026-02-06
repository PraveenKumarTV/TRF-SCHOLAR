import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import '../styles/components.css';

const Publications = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
    
    // Get user details from localStorage
    const storedUser = JSON.parse(localStorage.getItem('user')) || {};

    const [publications, setPublications] = useState([]);
    const [stats, setStats] = useState(null);
    const [compliance, setCompliance] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    
    const initialFormState = {
        category: 'journal',
        title: '',
        authors: '',
        correspondingAuthor: '',
        venue: '',
        doi: '',
        year: new Date().getFullYear(),
        volume: '',
        issue: '',
        pages: '',
        scopusIndexed: false,
        quartile: '',
        trfAcknowledgement: false,
        acknowledgementText: '',
        status: 'submitted'
    };

    const [formData, setFormData] = useState(initialFormState);

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
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
            navigate('/');
        }
    }, [navigate]);

    useEffect(() => {
        if (storedUser.email) {
            fetchPublications();
            fetchStats();
            fetchCompliance();
        }
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

    const fetchPublications = async () => {
        try {
            const response = await fetch(`https://trf-scholar-2.onrender.com/publications/my-publications?email=${storedUser.email}`);
            if (response.ok) {
                const data = await response.json();
                setPublications(data);
            }
        } catch (error) {
            console.error('Error fetching publications:', error);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await fetch(`https://trf-scholar-2.onrender.com/publications/stats/my-stats?email=${storedUser.email}`);
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const fetchCompliance = async () => {
        try {
            const response = await fetch(`https://trf-scholar-2.onrender.com/publications/compliance/check?email=${storedUser.email}&fellowshipYear=1&monthsCompleted=12`);
            if (response.ok) {
                const data = await response.json();
                setCompliance(data);
            }
        } catch (error) {
            console.error('Error fetching compliance:', error);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleEdit = (pub) => {
        setFormData({
            category: pub.category || 'journal',
            title: pub.title || '',
            authors: Array.isArray(pub.authors) ? pub.authors.join(', ') : pub.authors || '',
            correspondingAuthor: pub.correspondingAuthor || '',
            venue: pub.venue || '',
            doi: pub.doi || '',
            year: pub.year || new Date().getFullYear(),
            volume: pub.volume || '',
            issue: pub.issue || '',
            pages: pub.pages || '',
            scopusIndexed: pub.scopusIndexed || false,
            quartile: pub.quartile || '',
            trfAcknowledgement: pub.trfAcknowledgement || false,
            acknowledgementText: pub.acknowledgementText || '',
            status: pub.status || 'submitted'
        });
        setEditingId(pub.id);
        setShowAddForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const toggleAddForm = () => {
        if (showAddForm) {
            setShowAddForm(false);
            setEditingId(null);
            setFormData(initialFormState);
        } else {
            setShowAddForm(true);
            setEditingId(null);
            setFormData(initialFormState);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const authorsArray = formData.authors.split(',').map(a => a.trim());
            const payload = {
                email: storedUser.email,
                ...formData,
                authors: authorsArray
            };

            const url = editingId 
                ? `http://localhost:5000/publications/${editingId}`
                : 'http://localhost:5000/publications';
            
            const method = editingId ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to ${editingId ? 'update' : 'add'} publication`);
            }

            alert(`Publication ${editingId ? 'updated' : 'added'} successfully!`);
            setShowAddForm(false);
            setEditingId(null);
            setFormData(initialFormState);
            fetchPublications();
            fetchStats();
            fetchCompliance();
            
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);  
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this publication?')) return;

        try {
            const response = await fetch(`http://localhost:5000/publications/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                alert('Publication deleted successfully!');
                fetchPublications();
                fetchStats();
                fetchCompliance();
            } else {
                alert('Failed to delete publication');
            }
        } catch (error) {
            alert('Failed to delete publication');
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
                    <h1>My Publications</h1>
                </header>
                
                <div className="content-body">
                    {/* Statistics Cards */}
                    {stats && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                            <div className="stat-card" style={{ background: 'linear-gradient(180deg, #1e3a8a 0%, #1e40af 100%)', color: 'white' }}>
                                <div className="stat-value" style={{ fontSize: '2rem', fontWeight: 700, color: 'white' }}>{stats.total}</div>
                                <div className="stat-label" style={{ fontSize: '0.875rem', color: 'white', marginBottom: '0.5rem' }}>Total Publications</div>
                            </div>
                            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
                                <div className="stat-value">{stats.journals}</div>
                                <div className="stat-label" style={{color:'black'}}>Journal Papers</div>
                            </div>
                            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
                                <div className="stat-value">{stats.conferences}</div>
                                <div className="stat-label" style={{color:'black'}}>Conference Papers</div>
                            </div>
                            <div className="stat-card" style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)', color: 'white' }}>
                                <div className="stat-value">{stats.scopusIndexed}</div>
                                <div className="stat-label" style={{color:'black'}}>Scopus Indexed</div>
                            </div>
                        </div>
                    )}

                    {/* Compliance Status */}
                    {/* {compliance && (
                        <div className="card" style={{ marginBottom: '2rem' }}>
                            <div className="card-header">
                                <h3>Publication Compliance Status</h3>
                            </div>
                            <div className="card-body">
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div style={{
                                        background: compliance.scopusConferences.met ? '#dcfce7' : '#fee2e2',
                                        padding: '1rem',
                                        borderRadius: '0.5rem',
                                        border: `2px solid ${compliance.scopusConferences.met ? '#16a34a' : '#dc2626'}`
                                    }}>
                                        <h4 style={{ color: compliance.scopusConferences.met ? '#15803d' : '#991b1b', marginBottom: '0.5rem', marginTop: 0 }}>
                                            Scopus Conferences
                                        </h4>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: compliance.scopusConferences.met ? '#15803d' : '#991b1b' }}>
                                            {compliance.scopusConferences.current} / {compliance.scopusConferences.required}
                                        </div>
                                        <div style={{ fontSize: '0.875rem', marginTop: '0.25rem', color: compliance.scopusConferences.met ? '#15803d' : '#991b1b' }}>
                                            {compliance.scopusConferences.met ? '✓ Requirement Met' : '✗ Not Met'}
                                        </div>
                                    </div>

                                    <div style={{
                                        background: compliance.journals.met ? '#dcfce7' : '#fee2e2',
                                        padding: '1rem',
                                        borderRadius: '0.5rem',
                                        border: `2px solid ${compliance.journals.met ? '#16a34a' : '#dc2626'}`
                                    }}>
                                        <h4 style={{ color: compliance.journals.met ? '#15803d' : '#991b1b', marginBottom: '0.5rem', marginTop: 0 }}>
                                            Q1/Q2/Q3 Journals
                                        </h4>
                                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: compliance.journals.met ? '#15803d' : '#991b1b' }}>
                                            {compliance.journals.current} / {compliance.journals.required}
                                        </div>
                                        <div style={{ fontSize: '0.875rem', marginTop: '0.25rem', color: compliance.journals.met ? '#15803d' : '#991b1b' }}>
                                            {compliance.journals.met ? '✓ Requirement Met' : '✗ Not Met'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )} */}

                    <div className="card">
                        <div className="card-header">
                            <h3>Publications Management</h3>
                        </div>
                        <div className="card-body">
                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                                <button className="btn btn-primary" onClick={toggleAddForm}>
                                    {showAddForm ? 'Cancel' : (editingId ? 'Edit Publication' : '+ Add Publication')}
                                </button>
                            </div>

                            {/* Add Publication Form */}
                            {showAddForm && (
                                <form onSubmit={handleSubmit} style={{ background: '#f9fafb', padding: '1.5rem', borderRadius: '0.5rem', marginBottom: '2rem' }}>
                                    <h3 style={{ marginBottom: '1rem', marginTop: 0 }}>{editingId ? 'Edit Publication' : 'Add New Publication'}</h3>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div className="form-group">
                                            <label className="form-label">Category *</label>
                                            <select name="category" value={formData.category} onChange={handleChange} className="form-input" required>
                                                <option value="journal">Journal</option>
                                                <option value="conference">Conference</option>
                                                <option value="book-chapter">Book Chapter</option>
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Status *</label>
                                            <select name="status" value={formData.status} onChange={handleChange} className="form-input" required>
                                                <option value="submitted">Submitted</option>
                                                <option value="accepted">Accepted</option>
                                                <option value="published">Published</option>
                                            </select>
                                        </div>

                                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                                            <label className="form-label">Title *</label>
                                            <input type="text" name="title" value={formData.title} onChange={handleChange} className="form-input" required />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Authors (comma-separated, max 4) *</label>
                                            <input type="text" name="authors" value={formData.authors} onChange={handleChange} className="form-input" required placeholder="Author1, Author2, Author3" />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Corresponding Author *</label>
                                            <input type="text" name="correspondingAuthor" value={formData.correspondingAuthor} onChange={handleChange} className="form-input" required />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Journal/Conference Name *</label>
                                            <input type="text" name="venue" value={formData.venue} onChange={handleChange} className="form-input" required />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">DOI</label>
                                            <input type="text" name="doi" value={formData.doi} onChange={handleChange} className="form-input" placeholder="10.1234/example" />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Year *</label>
                                            <input type="number" name="year" value={formData.year} onChange={handleChange} className="form-input" required min="2020" max="2030" />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Volume</label>
                                            <input type="text" name="volume" value={formData.volume} onChange={handleChange} className="form-input" />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Issue</label>
                                            <input type="text" name="issue" value={formData.issue} onChange={handleChange} className="form-input" />
                                        </div>

                                        <div className="form-group">
                                            <label className="form-label">Pages</label>
                                            <input type="text" name="pages" value={formData.pages} onChange={handleChange} className="form-input" placeholder="100-110" />
                                        </div>

                                        {formData.category === 'conference' && (
                                            <div className="form-group">
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                                                    <input type="checkbox" name="scopusIndexed" checked={formData.scopusIndexed} onChange={handleChange} style={{ width: 'auto' }} />
                                                    <span>Scopus Indexed</span>
                                                </label>
                                            </div>
                                        )}

                                        {formData.category === 'journal' && (
                                            <div className="form-group">
                                                <label className="form-label">Quartile (SCImago Journal Ranking)</label>
                                                <select name="quartile" value={formData.quartile} onChange={handleChange} className="form-input">
                                                    <option value="">Select Quartile</option>
                                                    <option value="NA">NA</option>
                                                    <option value="Q1">Q1</option>
                                                    <option value="Q2">Q2</option>
                                                    <option value="Q3">Q3</option>
                                                    <option value="Q4">Q4</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ marginTop: '1rem' }}>
                                        <button type="submit" className="btn btn-primary" disabled={loading}>
                                            {loading ? (editingId ? 'Updating...' : 'Adding...') : (editingId ? 'Update Publication' : 'Add Publication')}
                                        </button>
                                    </div>
                                </form>
                            )}

                            {/* Publications List */}
                            {publications.length === 0 ? (
                                <p style={{ textAlign: 'center', color: '#6b7280', padding: '2rem' }}>
                                    No publications added yet. Click "Add Publication" to get started.
                                </p>
                            ) : (
                                <div className="table-container">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Category</th>
                                                <th>Title</th>
                                                <th>Venue</th>
                                                <th>Year</th>
                                                <th>Status</th>
                                                <th style={{ textAlign: 'center' }}>TRF Ack</th>
                                                <th style={{ textAlign: 'center' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {publications.map((pub) => (
                                                <tr key={pub.id}>
                                                    <td>
                                                        <span style={{
                                                            background: pub.category === 'journal' ? '#dbeafe' : '#dcfce7',
                                                            color: pub.category === 'journal' ? '#1e40af' : '#15803d',
                                                            padding: '0.25rem 0.5rem',
                                                            borderRadius: '0.25rem',
                                                            fontSize: '0.75rem',
                                                            fontWeight: '600'
                                                        }}>
                                                            {pub.category}
                                                        </span>
                                                    </td>
                                                    <td>{pub.title}</td>
                                                    <td>{pub.venue}</td>
                                                    <td>{pub.year}</td>
                                                    <td>
                                                        <span style={{
                                                            background: pub.status === 'published' ? '#dcfce7' : '#fef3c7',
                                                            color: pub.status === 'published' ? '#15803d' : '#92400e',
                                                            padding: '0.25rem 0.5rem',
                                                            borderRadius: '0.25rem',
                                                            fontSize: '0.75rem'
                                                        }}>
                                                            {pub.status}
                                                        </span>
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        {pub.trfAcknowledgement ? '✓' : '✗'}
                                                    </td>
                                                    <td style={{ textAlign: 'center' }}>
                                                        <button
                                                            onClick={() => handleEdit(pub)}
                                                            className="btn btn-secondary btn-small"
                                                            style={{ marginRight: '0.5rem' }}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(pub.id)}
                                                            className="btn btn-danger btn-small"
                                                        >
                                                            Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Publications;
