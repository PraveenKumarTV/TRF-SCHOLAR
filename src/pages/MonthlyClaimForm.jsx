import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import '../styles/components.css';
import '../styles/MonthlyClaimForm.css';
import html2pdf from 'html2pdf.js';
import tceLogo from './tceLogo.png';

const MonthlyClaimForm = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

    // Get user details from localStorage
    const storedUser = JSON.parse(localStorage.getItem('user')) || {};
    const pdfRef = useRef();
    const [balCL, setBalCl] = useState(storedUser.balCL !== undefined ? storedUser.balCL : 12);

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/');
    };

    // Get previous month and current year for claim period
    const now = new Date();
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1);
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const [loading, setLoading] = useState(false);
    const [claimStatus, setClaimStatus] = useState(null);
    const [claimDetails, setClaimDetails] = useState(null);
    const [pdfGenerated, setPdfGenerated] = useState(false);
    const [formData, setFormData] = useState({
        scholarName: storedUser.name || '',
        department: storedUser.dept || '',
        programme: storedUser.programme || 'PhD',
        monthYearOfAdmission: storedUser.month || '',
        supervisorName: storedUser.Supervisor || '',
        tceRollNo: storedUser.rollno || '',
        category: storedUser.category || 'Full-time',
        claimPeriod: {
            month: monthNames[prevMonthDate.getMonth()],
            year: prevMonthDate.getFullYear().toString()
        },
        leaveDetails: {
            thisMonth: { cl: 0, llp: 0, od: 0 },
            alreadyAvailed: { cl: 0, llp: 0, od: 0 },
            balanceAvailable: { cl: 12, llp: 30, od: 0 }
        },
        claimAmount: 25000,
        attendanceCertificate: null,
        progressReport: null,
        researchProgress: {
            articlesSubmitted: { conference: 0, journal: 0 },
            articlesPublished: { conference: 0, journal: 0 },
            progressDescription: ''
        },
        workloadDetails: {
            labHours: 0,
            deptLoad: 0
        },
        declarations: {
            noOtherFellowship: false,
            abidesGuidelines: false,
            informationTrue: false
        },
        resubmissionRemarks: ''
    });

    // Handle nested field changes
    const handleNestedChange = (section, field, value) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }));
    };

    // Handle deep nested changes (like leaveDetails.thisMonth.cl)
    const handleDeepNestedChange = (section, subsection, field, value) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [subsection]: {
                    ...prev[section][subsection],
                    [field]: parseInt(value) || 0
                }
            }
        }));
    };

    // Handle declarations
    const handleDeclarationChange = (field) => {
        setFormData(prev => ({
            ...prev,
            declarations: {
                ...prev.declarations,
                [field]: !prev.declarations[field]
            }
        }));
        setPdfGenerated(false);
    };

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        if (!user) {
            navigate('/');
        }
    }, [navigate]);

    useEffect(() => {
        const fetchBalCl = async () => {
            if (storedUser.email) {
                try {
                    const response = await fetch(`https://trf-scholar-2.onrender.com/scholar/getBalCl?email=${storedUser.email}`);
                    if (response.ok) {
                        const data = await response.json();
                        if (data.balCL !== undefined) {
                            setBalCl(data.balCL);
                            const updatedUser = { ...storedUser, balCL: data.balCL };
                            localStorage.setItem('user', JSON.stringify(updatedUser));
                        }
                    }
                } catch (error) {
                    console.error("Error fetching balCl:", error);
                }
            }
        };
        fetchBalCl();
        const fetchClaimStatus = async () => {
            if (!storedUser.email) return;
            
            const month = monthNames[prevMonthDate.getMonth()];
            const year = prevMonthDate.getFullYear().toString();

            try {
                const response = await fetch(`https://trf-scholar-2.onrender.com/api/claims/status?email=${storedUser.email}&month=${month}&year=${year}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data.submitted) {
                        setClaimDetails(data.claim);
                        localStorage.setItem('claimDetails', JSON.stringify(data.claim));
                        const claim = data.claim || {};
                        
                        // Populate form data if available
                        if (claim.leave_details) {
                            setFormData(prev => ({
                                ...prev,
                                leaveDetails: {
                                    ...prev.leaveDetails,
                                    thisMonth: {
                                        cl: claim.leave_details.cl || 0,
                                        llp: claim.leave_details.llp || 0,
                                        od: claim.leave_details.od || 0
                                    }
                                },
                                claimAmount: claim.claim_amount !== undefined ? claim.claim_amount : prev.claimAmount,
                                researchProgress: claim.research_progress || prev.researchProgress,
                                workloadDetails: claim.trf_workload || prev.workloadDetails,
                                attendanceCertificate: claim.attendance_certificate || prev.attendanceCertificate,
                                progressReport: claim.progress_report || prev.progressReport,
                                declarations: {
                                    noOtherFellowship: true,
                                    abidesGuidelines: true,
                                    informationTrue: true
                                }
                            }));
                        }

                        const statuses = [
                            claim.isSupervisorApproved || 'pending',
                            claim.isHodApproved || 'pending',
                            claim.isDlcApproved || 'pending',
                            claim.isadminApproved || 'pending'
                        ];

                        if (statuses.includes('rejected')) {
                            setClaimStatus('rejected');
                        } else if (statuses.every(s => s === 'approved')) {
                            setClaimStatus('approved');
                        } else {
                            setClaimStatus('submitted');
                        }
                    } else {
                        setClaimStatus('not_submitted');
                    }
                } else {
                    setClaimStatus('not_submitted');
                }
            } catch (error) {
                console.error("Error fetching claim status:", error);
                setClaimStatus('not_submitted');
            }
        };

        fetchClaimStatus();
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

    useEffect(() => {
        const { month, year } = formData.claimPeriod;
        const monthIndex = monthNames.indexOf(month);
        const daysInMonth = monthIndex !== -1 
            ? new Date(year, monthIndex + 1, 0).getDate() 
            : 30;

        let { cl, llp } = formData.leaveDetails.thisMonth;
        let shouldUpdate = false;
        let newCl = cl;
        let newLlp = llp;

        if (cl > balCL) {
            const excess = cl - balCL;
            newCl = balCL;
            newLlp = llp + excess;
            shouldUpdate = true;
        }

        const deduction = (25000 / daysInMonth) * newLlp;
        const newAmount = Math.max(0, Math.round(25000 - deduction));

        if (newAmount !== formData.claimAmount) {
            shouldUpdate = true;
        }

        if (shouldUpdate) {
            setFormData(prev => ({
                ...prev,
                leaveDetails: {
                    ...prev.leaveDetails,
                    thisMonth: { ...prev.leaveDetails.thisMonth, cl: newCl, llp: newLlp }
                },
                claimAmount: newAmount
            }));
        }
    }, [formData.leaveDetails.thisMonth.cl, formData.leaveDetails.thisMonth.llp, formData.claimPeriod.month, formData.claimPeriod.year, balCL]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!window.confirm("Are you sure you want to submit the claim?")) return;

        if (!formData.declarations.noOtherFellowship ||
            !formData.declarations.abidesGuidelines ||
            !formData.declarations.informationTrue) {
            alert('Please accept all declarations');
            return;
        }

        setLoading(true);

        const payload = {
            user_email: storedUser.email,
            leave_details: {
                cl: formData.leaveDetails.thisMonth.cl,
                llp: formData.leaveDetails.thisMonth.llp,
                od: formData.leaveDetails.thisMonth.od
            },
            claim_amount: formData.claimAmount,
            research_progress: formData.researchProgress,
            trf_workload: formData.workloadDetails,
            isAllocated: 'submitted',
            claim_month: formData.claimPeriod.month,
            claimId: claimDetails?.id,
            claim_year: formData.claimPeriod.year,
            attendance_certificate: formData.attendanceCertificate,
            progress_report: formData.progressReport,
            isSupervisorApproved: 'pending',
            supervisorRejectionReason: null,
            isHodApproved: 'pending',
            hodRejectionReason: null,
            isDlcApproved: 'pending',
            dlcRejectionReason: null,
            isadminApproved: 'pending',
            adminRejectionReason: null,
            resubmission_remarks: formData.resubmissionRemarks
        };

        try {
            const response = await fetch('https://trf-scholar-2.onrender.com/api/claims', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const usedCl = formData.leaveDetails.thisMonth.cl;
                if (usedCl > 0) {
                    try {
                        await fetch('https://trf-scholar-2.onrender.com/scholar/updateBalCl', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: storedUser.email, usedCl })
                        });
                        const newBal = balCL - usedCl;
                        setBalCl(newBal);
                        const updatedUser = { ...storedUser, balCL: newBal };
                        localStorage.setItem('user', JSON.stringify(updatedUser));
                    } catch (err) {
                        console.error("Error updating balCl:", err);
                    }
                }
                alert('Claim submitted successfully!');
                setClaimStatus('submitted');
                setClaimDetails({
                    isSupervisorApproved: 'pending',
                    isHodApproved: 'pending',
                    isDlcApproved: 'pending',
                    isadminApproved: 'pending',
                    supervisorRejectionReason: null,
                    hodRejectionReason: null,
                    dlcRejectionReason: null,
                    adminRejectionReason: null
                });
            } else {
                alert('Error submitting claim');
            }
        } catch (error) {
            console.error(error);
            alert('Error submitting claim');
        } finally {
            setLoading(false);
        }
    };

    const handleSaveDraft = async () => {
        setLoading(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            alert('Draft saved successfully!');
        } catch (error) {
            console.error(error);
            alert('Error saving draft');
        } finally {
            setLoading(false);
        }
    };

    const generatePDF = () => {
        const element = pdfRef.current;
        if (!element) return;

        const opt = {
            margin: 10,
            filename: `TRF_Claim_${formData.scholarName}_${formData.claimPeriod.month}_${formData.claimPeriod.year}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        };

        html2pdf().set(opt).from(element).save();
        setPdfGenerated(true);
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
                    { path: 'https://drive.google.com/file/d/1vht_RfO9R7Ygqam1XZN4AUWv8BXIzPll/view?usp=drive_link', label: 'TRF Guidelines', isExternal:true },
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
                    <h1>Monthly Claim Form</h1>
                </header>
                <div className="content-body">
                    {claimStatus === null ? (
                        <div style={{ textAlign: 'center', padding: '2rem' }}>Loading...</div>
                    ) : claimStatus === 'submitted' ? (
                        <div className="card" style={{ padding: '2rem' }}>
                            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                                <h2 style={{ color: '#f59e0b', marginTop: 0 }}>Claim Request Submitted</h2>
                                <p>You have submitted a claim for {formData.claimPeriod.month} {formData.claimPeriod.year}.</p>
                            </div>
                            
                            <h3 style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Approval Status</h3>
                            <div style={{ display: 'grid', gap: '1rem' }}>
                                {[
                                    { role: 'Supervisor', status: claimDetails?.isSupervisorApproved || 'pending' },
                                    { role: 'DLC', status: claimDetails?.isDlcApproved || 'pending' },
                                    { role: 'HoD', status: claimDetails?.isHodApproved || 'pending' },
                                    { role: 'Dean', status: claimDetails?.isadminApproved || 'pending' }
                                ].map((item, index) => (
                                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: '#f9fafb', borderRadius: '0.5rem' }}>
                                        <span style={{ fontWeight: 500 }}>{item.role}</span>
                                        <span style={{
                                            backgroundColor: item.status === 'approved' ? '#dcfce7' : item.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                                            color: item.status === 'approved' ? '#166534' : item.status === 'rejected' ? '#991b1b' : '#92400e',
                                            padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 500, textTransform: 'capitalize'
                                        }}>{item.status}</span>
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                                <button type="button" onClick={generatePDF} className="btn-primary">
                                    Generate PDF
                                </button>
                            </div>
                        </div>
                    ) : claimStatus === 'approved' ? (
                        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                            <h2 style={{ color: '#10b981' }}>Claim Accepted</h2>
                            <p>Your claim for {formData.claimPeriod.month} {formData.claimPeriod.year} has been accepted.</p>
                        </div>
                    ) : (
                    <>
                    {claimStatus === 'rejected' && (
                        <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem', borderLeft: '4px solid #ef4444', backgroundColor: '#fff' }}>
                            <h2 style={{ color: '#ef4444', marginTop: 0, fontSize: '1.5rem' }}>Claim Rejected</h2>
                            <p style={{ marginBottom: '1rem' }}>Your claim for {formData.claimPeriod.month} {formData.claimPeriod.year} was rejected.</p>
                            {claimDetails?.isSupervisorApproved === 'rejected' && (
                                <div style={{ backgroundColor: '#fee2e2', padding: '1rem', borderRadius: '0.375rem', color: '#991b1b', marginBottom: '0.5rem' }}>
                                    <strong>Supervisor Rejected:</strong> {claimDetails.supervisorRejectionReason || 'No reason provided'}
                                </div>
                            )}
                            {claimDetails?.isHodApproved === 'rejected' && (
                                <div style={{ backgroundColor: '#fee2e2', padding: '1rem', borderRadius: '0.375rem', color: '#991b1b', marginBottom: '0.5rem' }}>
                                    <strong>HoD Rejected:</strong> {claimDetails.hodRejectionReason || 'No reason provided'}
                                </div>
                            )}
                            {claimDetails?.isDlcApproved === 'rejected' && (
                                <div style={{ backgroundColor: '#fee2e2', padding: '1rem', borderRadius: '0.375rem', color: '#991b1b', marginBottom: '0.5rem' }}>
                                    <strong>DLC Rejected:</strong> {claimDetails.dlcRejectionReason || 'No reason provided'}
                                </div>
                            )}
                            {claimDetails?.isadminApproved === 'rejected' && (
                                <div style={{ backgroundColor: '#fee2e2', padding: '1rem', borderRadius: '0.375rem', color: '#991b1b', marginBottom: '0.5rem' }}>
                                    <strong>Dean Rejected:</strong> {claimDetails.adminRejectionReason || 'No reason provided'}
                                </div>
                            )}
                            {claimDetails?.rejectionReason && !claimDetails?.isSupervisorApproved && !claimDetails?.isHodApproved && !claimDetails?.isDlcApproved && !claimDetails?.isadminApproved && (
                                <div style={{ backgroundColor: '#fee2e2', padding: '1rem', borderRadius: '0.375rem', color: '#991b1b' }}>
                                    <strong>Reason:</strong> {claimDetails.rejectionReason}
                                </div>
                            )}
                            <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#6b7280' }}>Please correct the details below and resubmit.</p>
                        </div>
                    )}
                    <div className="monthly-claim-form-container">
                        <div className="form-header">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '15px' }}>
                        <img src={tceLogo} alt="Logo" style={{ width: '80px', height: '80px', marginRight: '15px' }} />
                        <div className="college-header">
                            <h1>THIAGARAJAR COLLEGE OF ENGINEERING, MADURAI - 625015</h1>
                            <p>(A Govt. Aided, Autonomous Institution, Affiliated to Anna University)</p>
                        </div>
                    </div>
                    <h2>Thiagarajar Research Fellowship Claim Form</h2>
                    <p className="claim-period-title">
                        For the month of {formData.claimPeriod.month} {formData.claimPeriod.year}, <strong>Attempts Allowed:1</strong>
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="monthly-claim-form">
                    {/* Resubmission Remarks Section */}
                    {claimStatus === 'rejected' && (
                        <div className="form-section" style={{ border: '1px solid #ef4444', background: '#fef2f2' }}>
                            <h3 className="section-title" style={{ color: '#b91c1c' }}>Resubmission Updates</h3>
                            <div className="form-row">
                                <div className="form-group">
                                    <label style={{ color: '#b91c1c' }}>Updates made after rejection *</label>
                                    <textarea rows="3"
                                        value={formData.resubmissionRemarks}
                                        onChange={(e) => setFormData(prev => ({ ...prev, resubmissionRemarks: e.target.value }))}
                                        placeholder="Please describe the corrections/updates made based on the rejection reason..."
                                        required />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Section 1: Particulars of the Scholar */}
                    <div className="form-section">
                        <h3 className="section-title">Particulars of the Scholar</h3>

                        <div className="form-row">
                            <div className="form-group">
                                <label>1. Name of the Scholar</label>
                                <input type="text" value={formData.scholarName} disabled />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>2. Department & Programme</label>
                                <input type="text" value={`${formData.department} - ${formData.programme}`} disabled />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>3. Month & Year of admission at TRF</label>
                                <input type="text" value={formData.monthYearOfAdmission} disabled />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>4. Name of the Supervisor</label>
                                <input type="text" value={formData.supervisorName} disabled />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group half-width">
                                <label>5. TCE Roll No.</label>
                                <input type="text" value={formData.tceRollNo} disabled />
                            </div>
                            <div className="form-group half-width">
                                <label>6. Category</label>
                                <input type="text" value={formData.category} disabled />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group half-width">
                                <label>7. Claim Period - Month</label>
                                <input type="text" value={formData.claimPeriod.month} disabled />
                            </div>
                            <div className="form-group half-width">
                                <label>Year</label>
                                <input type="text" value={formData.claimPeriod.year} disabled />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Leave Details */}
                    <div className="form-section">
                        <h3 className="section-title">8. Leave Details (Balance CL: {balCL} | Remaining: {balCL - formData.leaveDetails.thisMonth.cl})</h3>
                        <table className="leave-table">
                            <thead>
                                <tr>
                                    <th></th>
                                    <th>CL</th>
                                    <th>LLP</th>
                                    <th>OD</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>No. of days availed in this Month</td>
                                    <td>
                                        <input type="number" min="0"
                                            value={formData.leaveDetails.thisMonth.cl}
                                            onChange={(e) => handleDeepNestedChange('leaveDetails', 'thisMonth', 'cl', e.target.value)} required />
                                    </td>
                                    <td>
                                        <input type="number" min="0"
                                            value={formData.leaveDetails.thisMonth.llp}
                                            onChange={(e) => handleDeepNestedChange('leaveDetails', 'thisMonth', 'llp', e.target.value)} required />
                                    </td>
                                    <td>
                                        <input type="number" min="0"
                                            value={formData.leaveDetails.thisMonth.od}
                                            onChange={(e) => handleDeepNestedChange('leaveDetails', 'thisMonth', 'od', e.target.value)} required />
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Section 3: Claim Amount */}
                    <div className="form-section">
                        <div className="form-row">
                            <div className="form-group">
                                <label>9. Claim Amount in Rs.</label>
                                <input type="number" value={formData.claimAmount} readOnly className="readonly-field" />
                                <small>Amount is auto-calculated based on your year of study</small>
                            </div>
                        </div>
                    </div>

                    {/* Section 4: Upload Documents */}
                    <div className="form-section">
                        <h3 className="section-title">10. Upload Documents (Drive Links) 
                            <a href="https://drive.google.com/" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', marginLeft: '10px', color: '#2563eb', textDecoration: 'underline' }}>Open Google Drive ↗</a>
                        </h3>
                        <div className="form-row">
                            <div className="form-group half-width">
                                <label>Attendance Report Link *</label>
                                <input type="text" name="attendanceCertificate" value={formData.attendanceCertificate || ''} onChange={(e) => setFormData(prev => ({ ...prev, attendanceCertificate: e.target.value }))} placeholder="Paste Google Drive link" required />
                            </div>
                            <div className="form-group half-width">
                                <label>Workload Report Link *</label>
                                <input type="text" name="progressReport" value={formData.progressReport || ''} onChange={(e) => setFormData(prev => ({ ...prev, progressReport: e.target.value }))} placeholder="Paste Google Drive link" required />
                            </div>
                        </div>
                    </div>

                    {/* Section 5: Research Progress */}
                    <div className="form-section">
                        <h3 className="section-title">11. Research Progress in this month (Attach proofs)</h3>
                        <div className="form-row">
                            <div className="form-group half-width">
                                <label>No. of Articles Submitted - Conference</label>
                                <input type="number" min="0"
                                    value={formData.researchProgress.articlesSubmitted.conference}
                                    onChange={(e) => handleDeepNestedChange('researchProgress', 'articlesSubmitted', 'conference', e.target.value)} required />
                            </div>
                            <div className="form-group half-width">
                                <label>No. of Articles Submitted - Journal</label>
                                <input type="number" min="0"
                                    value={formData.researchProgress.articlesSubmitted.journal}
                                    onChange={(e) => handleDeepNestedChange('researchProgress', 'articlesSubmitted', 'journal', e.target.value)} required />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group half-width">
                                <label>No. of Articles Published - Conference</label>
                                <input type="number" min="0"
                                    value={formData.researchProgress.articlesPublished.conference}
                                    onChange={(e) => handleDeepNestedChange('researchProgress', 'articlesPublished', 'conference', e.target.value)} required />
                            </div>
                            <div className="form-group half-width">
                                <label>No. of Articles Published - Journal</label>
                                <input type="number" min="0"
                                    value={formData.researchProgress.articlesPublished.journal}
                                    onChange={(e) => handleDeepNestedChange('researchProgress', 'articlesPublished', 'journal', e.target.value)} required />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Progress Description *</label>
                                <textarea rows="4"
                                    value={formData.researchProgress.progressDescription}
                                    onChange={(e) => handleNestedChange('researchProgress', 'progressDescription', e.target.value)}
                                    placeholder="Describe your research progress this month..." required />
                            </div>
                        </div>
                    </div>

                    {/* Section: Workload Details */}
                    <div className="form-section">
                        <h3 className="section-title">12. TRF Workload Details (Max. 8 Hours per week)</h3>
                        <div className="form-row">
                            <div className="form-group half-width">
                                <label>No. of Lab/ Tutorial hours per week</label>
                                <input type="number" min="0" max="8"
                                    value={formData.workloadDetails.labHours}
                                    onChange={(e) => handleNestedChange('workloadDetails', 'labHours', e.target.value)} required />
                            </div>
                            <div className="form-group half-width">
                                <label>No. of Dept. work Load per week</label>
                                <input type="number" min="0" max="8"
                                    value={formData.workloadDetails.deptLoad}
                                    onChange={(e) => handleNestedChange('workloadDetails', 'deptLoad', e.target.value)} required />
                            </div>
                        </div>
                    </div>

                    {/* Section 6: Declarations */}
                    <div className="form-section declarations-section">
                        <h3 className="section-title">Declaration by the Scholar</h3>
                        <div className="declaration-item">
                            <label className="checkbox-label">
                                <input type="checkbox" checked={formData.declarations.noOtherFellowship} onChange={() => handleDeclarationChange('noOtherFellowship')} />
                                <span>1. I am NOT receiving any other fellowship from any organization/industry.</span>
                            </label>
                        </div>
                        <div className="declaration-item">
                            <label className="checkbox-label">
                                <input type="checkbox" checked={formData.declarations.abidesGuidelines} onChange={() => handleDeclarationChange('abidesGuidelines')} />
                                <span>2. I abide by the TRF guidelines dated 01.01.2026.</span>
                            </label>
                        </div>
                        <div className="declaration-item">
                            <label className="checkbox-label">
                                <input type="checkbox" checked={formData.declarations.informationTrue} onChange={() => handleDeclarationChange('informationTrue')} />
                                <span>3. The information furnished in the claim form are true to the best of my knowledge.</span>
                            </label>
                        </div>
                    </div>

                    {/* Form Actions */}
                    <div className="form-actions">
                        {/* <button type="button" onClick={handleSaveDraft} className="btn-secondary" disabled={loading || !(formData.declarations.noOtherFellowship && formData.declarations.abidesGuidelines && formData.declarations.informationTrue)}>Save as Draft</button> */}
                        <button type="button" onClick={generatePDF} className="btn-primary" disabled={!(formData.declarations.noOtherFellowship && formData.declarations.abidesGuidelines && formData.declarations.informationTrue)}>Generate PDF</button>
                        <button type="submit" className="btn-primary" disabled={loading || !pdfGenerated}>{loading ? 'Submitting...' : 'Submit Claim'}</button>
                    </div>
                </form>
            </div>
            </>
    )}
                {/* Hidden PDF Template */}
                <div style={{ display: 'none' }}>
                    <div ref={pdfRef} style={{ padding: '20px', fontFamily: 'Arial, sans-serif', fontSize: '11px', lineHeight: '1.3' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px', borderBottom: '2px solid #000', paddingBottom: '5px' }}>
                            <img src={tceLogo} alt="Logo" style={{ width: '90px', height: '60px', marginRight: '15px' }} />
                            <div style={{ textAlign: 'center' }}>
                                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>THIAGARAJAR COLLEGE OF ENGINEERING, MADURAI - 625015</h2>
                                <p style={{ margin: '3px 0', fontSize: '10px' }}>(A Govt. Aided, Autonomous Institution, Affiliated to Anna University)</p>
                                <h3 style={{ marginTop: '3px', marginBottom: '0', fontSize: '14px', fontWeight: 'bold' }}>Thiagarajar Research Fellowship Claim Form</h3>
                                <p style={{ margin: '3px 0 0 0' }}>For the month of {formData.claimPeriod.month} {formData.claimPeriod.year}</p>
                            </div>
                        </div>

                        <div style={{ marginBottom: '10px' }}>
                            <h4 style={{ borderBottom: '1px solid #000', paddingBottom: '3px', margin: '0 0 5px 0', fontSize: '12px' }}>Particulars of the Scholar</h4>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <tbody>
                                    <tr><td style={{ padding: '4px' }}><strong>Name:</strong> {formData.scholarName}</td><td style={{ padding: '4px' }}><strong>Roll No:</strong> {formData.tceRollNo}</td></tr>
                                    <tr><td style={{ padding: '4px' }}><strong>Dept:</strong> {formData.department}</td><td style={{ padding: '4px' }}><strong>Programme:</strong> {formData.programme}</td></tr>
                                    <tr><td style={{ padding: '4px' }}><strong>Supervisor:</strong> {formData.supervisorName}</td><td style={{ padding: '4px' }}><strong>Category:</strong> {formData.category}</td></tr>
                                </tbody>
                            </table>
                        </div>

                        <div style={{ marginBottom: '10px' }}>
                            <h4 style={{ borderBottom: '1px solid #000', paddingBottom: '3px', margin: '0 0 5px 0', fontSize: '12px' }}>Leave Details</h4>
                            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000' }}>
                                <thead>
                                    <tr style={{ background: '#f0f0f0' }}>
                                        <th style={{ border: '1px solid #000', padding: '4px' }}>Type</th>
                                        <th style={{ border: '1px solid #000', padding: '4px' }}>CL</th>
                                        <th style={{ border: '1px solid #000', padding: '4px' }}>LLP</th>
                                        <th style={{ border: '1px solid #000', padding: '4px' }}>OD</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ border: '1px solid #000', padding: '4px' }}>This Month</td>
                                        <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{claimDetails?.leave_details?.cl !== undefined ? claimDetails.leave_details.cl : formData.leaveDetails.thisMonth.cl}</td>
                                        <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{claimDetails?.leave_details?.llp !== undefined ? claimDetails.leave_details.llp : formData.leaveDetails.thisMonth.llp}</td>
                                        <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{claimDetails?.leave_details?.od !== undefined ? claimDetails.leave_details.od : formData.leaveDetails.thisMonth.od}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div style={{ marginBottom: '10px' }}>
                            <p style={{ margin: '5px 0', fontSize: '12px' }}><strong>Claim Amount:</strong> Rs. {claimDetails?.claim_amount !== undefined ? claimDetails.claim_amount : formData.claimAmount}/-</p>
                        </div>

                        <div style={{ marginBottom: '10px' }}>
                            <h4 style={{ borderBottom: '1px solid #000', paddingBottom: '3px', margin: '0 0 5px 0', fontSize: '12px' }}>Research Progress (Attach the proofs with supervisor signature)</h4>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <tbody>
                                    <tr>
                                        <td style={{ padding: '4px' }}><strong>Articles Submitted:</strong> Conference: {formData.researchProgress.articlesSubmitted.conference}, Journal: {formData.researchProgress.articlesSubmitted.journal}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '4px' }}><strong>Articles Published:</strong> Conference: {formData.researchProgress.articlesPublished.conference}, Journal: {formData.researchProgress.articlesPublished.journal}</td>
                                    </tr>
                                    {/* <tr>
                                        <td style={{ padding: '4px' }}><strong>Description:</strong> {formData.researchProgress.progressDescription}</td>
                                    </tr> */}
                                </tbody>
                            </table>
                        </div>

                        <div style={{ marginBottom: '10px' }}>
                            <h4 style={{ borderBottom: '1px solid #000', paddingBottom: '3px', margin: '0 0 5px 0', fontSize: '12px' }}>Declarations</h4>
                            <ul style={{ listStyleType: 'none', padding: 0, margin: 0 }}>
                                <li style={{ marginBottom: '4px' }}>1. I am NOT receiving any other fellowship from any organization/industry.</li>
                                <li style={{ marginBottom: '4px' }}>2. I abide by the TRF guidelines dated 01.07.2025.</li>
                                <li style={{ marginBottom: '4px' }}>3. The information furnished in the claim form are true to the best of my knowledge.</li>
                            </ul>
                        </div>

                        <div style={{ marginBottom: '10px' }}>
                            <p style={{ margin: '5px 0' }}><strong>Attachments:</strong> Attendance Certificate, Progress Report (Attached as proofs)</p>
                        </div>

                        <div style={{ marginTop: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <div style={{ textAlign: 'left' }}>
                                    <p style={{ margin: '3px 0' }}><strong>Place:</strong> TCE-MADURAI</p>
                                    <p style={{ margin: '3px 0' }}><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ margin: '3px 0' }}>__________________________</p>
                                    <p style={{ margin: '3px 0' }}><strong>Signature of the Scholar</strong></p>
                                </div>
                            </div>

                            <div style={{ border: '1px solid #000', padding: '10px' }}>
                                <h4 style={{ textAlign: 'center', margin: '0 0 5px 0', textDecoration: 'underline', fontSize: '11px' }}>FOR OFFICE USE</h4>
                                
                                <div style={{ marginBottom: '10px' }}>
                                    <p style={{ margin: '0 0 5px 0' }}><strong>TRF Workload Details (Max. 8 Hours per week)</strong></p>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000' }}>
                                        <thead>
                                            <tr>
                                                <th style={{ border: '1px solid #000', padding: '4px' }}>No. of Lab/ Tutorial hours per week</th>
                                                <th style={{ border: '1px solid #000', padding: '4px' }}>No. of Dept. work Load per week</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{formData.workloadDetails.labHours}</td>
                                                <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center' }}>{formData.workloadDetails.deptLoad}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: '10px', fontSize: '10px' }}>
                                    <div style={{ width: '48%' }}>
                                        <p style={{ margin: '3px 0' }}><strong>Supervisor Remarks:</strong></p>
                                        <p style={{ margin: '3px 0' }}>{claimDetails?.['SupervisorRemarks(ResearchProgress)'] || 'Satisfactory / Not Satisfactory'}</p>
                                        <br />
                                        <p style={{ margin: '3px 0' }}>__________________</p>
                                        <p style={{ margin: '3px 0' }}>Signature</p>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-start', width: '48%' }}>
  <div>
    <p style={{ margin: '6px 0' }}><strong>HoD Remarks:</strong></p>
    <p style={{ margin: '6px 0' }}>{claimDetails?.['HodRemarks(Recommendation)'] || 'Recommended / Not Recommended'}</p>
    <br />
    <p style={{ margin: '3px 0' }}>__________________</p>
    <p style={{ margin: '3px 0' }}>Signature</p>
  </div>
</div>

                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '20px', fontSize: '10px' }}>
                                    <div style={{ width: '48%' }}>
                                        <p style={{ margin: '3px 0' }}>__________________</p>
                                        <p style={{ margin: '3px 0' }}>Signature of the DLC</p>
                                    </div>
                                    <div style={{ width: '48%', textAlign: 'right' }}>
                                        <p style={{ margin: '3px 0' }}>__________________</p>
                                        <p style={{ margin: '3px 0' }}>Signature of Assoc. Dean</p>
                                    </div>
                                </div>

                                <div style={{ marginTop: '10px', textAlign: 'center', paddingTop: '10px', borderTop: '1px dotted #000' }}>
                                    <img 
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`https://tcetrf.web.app/verifyclaim/${storedUser.email}/${formData.claimPeriod.month}/${formData.claimPeriod.year}`)}`} 
                                        alt="Verification QR Code" 
                                        style={{ width: '80px', height: '80px' }} 
                                    />
                                    <p style={{ fontSize: '9px', margin: '5px 0 0 0' }}>{`https://tcetrf.web.app/verifyclaim/${storedUser.email}/${formData.claimPeriod.month}/${formData.claimPeriod.year}`}</p>
                                </div>
                            </div>
                    
                        </div>
                    </div>
                </div>
                </div>
                
            </main>
        </div>
    );
};

export default MonthlyClaimForm;
