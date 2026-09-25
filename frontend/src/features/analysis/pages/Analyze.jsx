import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import { SignalLogo, UploadCloudIcon, FileTextIcon } from '../../../components/Icons';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(url, options) {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok || !data.success) {
        throw new Error(data.message || 'Something went wrong');
    }

    return data;
}

export default function Analyze() {
    const { token } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [form, setForm] = useState({ title: '', company: '', rawText: '' });
    const [resumeFile, setResumeFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [targetType, setTargetType] = useState('comprehensive');
    const [days, setDays] = useState(14);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submittingStep, setSubmittingStep] = useState('');

    const updateForm = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const handleFileChange = (file) => {
        if (file && (file.type === 'application/pdf' || file.name.endsWith('.pdf'))) {
            setResumeFile(file);
            setError('');
        } else if (file) {
            setError('Please choose a valid PDF file.');
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileChange(e.dataTransfer.files[0]);
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');

        if (!resumeFile) {
            setError('Please choose your resume PDF file first.');
            return;
        }

        setIsSubmitting(true);
        setSubmittingStep('Uploading & deduplicating resume...');

        try {
            const resumeData = new FormData();
            resumeData.append('resume', resumeFile);
            resumeData.append('title', resumeFile.name.replace(/\.pdf$/i, ''));

            const resumeResponse = await request(`${API_URL}/api/resumes/upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: resumeData,
            });

            setSubmittingStep('Ingesting target job requirements...');
            const jobResponse = await request(`${API_URL}/api/jobs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    title: form.title,
                    company: form.company,
                    rawText: form.rawText,
                }),
            });

            setSubmittingStep('Running comparative analysis & preparation engine...');
            const analysisResponse = await request(`${API_URL}/api/analysis`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    resumeId: resumeResponse.resume._id,
                    jobDescriptionId: jobResponse.jobDescription._id,
                    days: Number(days),
                    targetType,
                }),
            });

            setSubmittingStep('Ready! Redirecting to your report...');
            navigate(`/reports/${analysisResponse.report._id}`);
        } catch (submitError) {
            setError(submitError.message);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="app-canvas">
            {/* Ambient Background Lights */}
            <div className="ambient-glow glow-top-left" />
            <div className="ambient-glow glow-top-right" />

            <div className="home-shell">
                <nav className="glass-nav" aria-label="Analysis navigation">
                    <Link className="brand-logo" to="/dashboard">
                        <span className="brand-icon">
                            <SignalLogo size={18} />
                        </span>
                        career<span className="brand-highlight">signal</span>
                    </Link>
                    <div className="nav-right-cluster">
                        <Link className="nav-link" to="/profiles">Connected Profiles</Link>
                        <Link className="nav-link" to="/dashboard">Dashboard</Link>
                    </div>
                </nav>

                <header className="page-header-center">
                    <div className="hero-announcement-chip">
                        <span className="chip-pulsar" />
                        <span className="chip-text">Multi-Source Verification Engine</span>
                    </div>
                    <h1>Map Your Experience to the Target Role</h1>
                    <p>
                        Upload your resume and paste the job description. Our engine correlates your background with live GitHub activity and competitive programming profiles to uncover blockers and build a customized sprint plan.
                    </p>
                </header>

                <form className="analyze-stepper-form" onSubmit={handleSubmit}>
                    {/* STEP 1: RESUME UPLOAD */}
                    <div className="glass-stepper-card">
                        <div className="stepper-card-header">
                            <span className="step-num-bubble">01</span>
                            <div>
                                <h2>Candidate Resume</h2>
                                <p>Upload your latest text-based PDF resume</p>
                            </div>
                        </div>

                        <div
                            className={`dropzone-box ${isDragging ? 'dragging' : ''} ${resumeFile ? 'has-file' : ''}`}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            role="button"
                            tabIndex={0}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="application/pdf,.pdf"
                                style={{ display: 'none' }}
                                onChange={(e) => handleFileChange(e.target.files[0])}
                            />

                            {resumeFile ? (
                                <div className="file-active-preview">
                                    <span className="file-icon-badge">
                                        <FileTextIcon size={28} />
                                    </span>
                                    <div className="file-details">
                                        <strong>{resumeFile.name}</strong>
                                        <div className="file-meta-row">
                                            <span className="size-badge">{(resumeFile.size / 1024).toFixed(1)} KB</span>
                                            <span className="ready-badge">Ready for extraction</span>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className="btn-change-file"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            fileInputRef.current?.click();
                                        }}
                                    >
                                        Change file
                                    </button>
                                </div>
                            ) : (
                                <div className="dropzone-idle-content">
                                    <div className="upload-cloud-icon">
                                        <UploadCloudIcon size={38} />
                                    </div>
                                    <h3>Click or drag resume PDF here</h3>
                                    <p>Supports standard text-based PDF formats up to 5 MB</p>
                                    <span className="btn-browse-file">Browse Files</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* STEP 2: JOB DESCRIPTION */}
                    <div className="glass-stepper-card">
                        <div className="stepper-card-header">
                            <span className="step-num-bubble">02</span>
                            <div>
                                <h2>Target Role & Requirements</h2>
                                <p>Provide the job title, company, and complete requirements</p>
                            </div>
                        </div>

                        <div className="dual-inputs-grid">
                            <div className="field-group">
                                <label htmlFor="job-title-input">Job Title</label>
                                <input
                                    id="job-title-input"
                                    className="glass-input"
                                    value={form.title}
                                    onChange={(event) => updateForm('title', event.target.value)}
                                    placeholder="e.g. Senior Backend Engineer"
                                    required
                                />
                            </div>

                            <div className="field-group">
                                <label htmlFor="company-name-input">Company Name</label>
                                <input
                                    id="company-name-input"
                                    className="glass-input"
                                    value={form.company}
                                    onChange={(event) => updateForm('company', event.target.value)}
                                    placeholder="e.g. Stripe, Razorpay, Google"
                                />
                            </div>
                        </div>

                        <div className="field-group textarea-group">
                            <label htmlFor="jd-textarea">Full Job Description</label>
                            <textarea
                                id="jd-textarea"
                                className="glass-textarea"
                                value={form.rawText}
                                onChange={(event) => updateForm('rawText', event.target.value)}
                                placeholder="Paste the complete job description, requirements, responsibilities, and qualifications here..."
                                rows="8"
                                required
                            />
                        </div>
                    </div>

                    {/* STEP 3: SPRINT CUSTOMIZATION */}
                    <div className="glass-stepper-card">
                        <div className="stepper-card-header">
                            <span className="step-num-bubble">03</span>
                            <div>
                                <h2>Sprint Preparation Target</h2>
                                <p>Configure the preparation timeline and target round focus</p>
                            </div>
                        </div>

                        <div className="sprint-config-layout">
                            <div className="config-block">
                                <span className="config-label">Target Round Focus:</span>
                                <div className="pill-selector">
                                    <button
                                        type="button"
                                        className={`pill-btn ${targetType === 'comprehensive' ? 'active' : ''}`}
                                        onClick={() => setTargetType('comprehensive')}
                                    >
                                        Full Loop (All Rounds)
                                    </button>
                                    <button
                                        type="button"
                                        className={`pill-btn ${targetType === 'oa' ? 'active' : ''}`}
                                        onClick={() => setTargetType('oa')}
                                    >
                                        Online Assessment (OA)
                                    </button>
                                    <button
                                        type="button"
                                        className={`pill-btn ${targetType === 'technical' ? 'active' : ''}`}
                                        onClick={() => setTargetType('technical')}
                                    >
                                        Technical & System Design
                                    </button>
                                </div>
                            </div>

                            <div className="config-block">
                                <span className="config-label">Days Left Until Interview:</span>
                                <div className="days-selector">
                                    {[3, 7, 14, 30].map((d) => (
                                        <button
                                            key={d}
                                            type="button"
                                            className={`day-btn ${days === d ? 'active' : ''}`}
                                            onClick={() => setDays(d)}
                                        >
                                            {d} Days
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="form-error-banner" role="alert">
                            <span>Alert:</span>
                            <p>{error}</p>
                        </div>
                    )}

                    <div className="submit-action-bar">
                        <button className="btn-glow-primary btn-submit-large" type="submit" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <span className="submit-loading-wrap">
                                    <span className="feed-spinner" />
                                    <span>{submittingStep || 'Analyzing match signals...'}</span>
                                </span>
                            ) : (
                                <span>Generate Match Analysis & Report →</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
