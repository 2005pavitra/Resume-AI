import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';

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

    const [form, setForm] = useState({ title: '', company: '', rawText: '' });
    const [resumeFile, setResumeFile] = useState(null);
    const [targetType, setTargetType] = useState('comprehensive');
    const [days, setDays] = useState(14);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submittingStep, setSubmittingStep] = useState('');

    const updateForm = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
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
        <main className="analysis-shell">
            <nav className="home-nav" aria-label="Analysis navigation">
                <Link className="brand-mark" to="/dashboard">career<span>signal</span></Link>
                <div className="home-nav-actions">
                    <Link className="text-button" to="/profiles">Connected Profiles</Link>
                    <Link className="text-button" to="/dashboard">Dashboard</Link>
                </div>
            </nav>

            <header className="analysis-header">
                <span className="section-eyebrow">Evidence-Based Career Analysis</span>
                <h1>Map your experience to the target role.</h1>
                <p>Upload your resume and the job description. Our explainable engine cross-references evidence from your resume, GitHub activity, and competitive programming profiles.</p>
            </header>

            <form className="analysis-form" onSubmit={handleSubmit}>
                <section className="input-panel">
                    <div className="panel-heading">
                        <span className="panel-index">01</span>
                        <div>
                            <h2>Your Resume</h2>
                            <p>Upload your latest text-based PDF resume.</p>
                        </div>
                    </div>
                    <label className="file-drop">
                        <span className="file-name-display">{resumeFile ? `📄 ${resumeFile.name}` : '📁 Choose or drop your Resume PDF'}</span>
                        <small>{resumeFile ? `${(resumeFile.size / 1024).toFixed(1)} KB • Ready for extraction` : 'Supports PDF up to 5 MB'}</small>
                        <input
                            type="file"
                            accept="application/pdf,.pdf"
                            onChange={(event) => setResumeFile(event.target.files[0] || null)}
                        />
                    </label>
                </section>

                <section className="input-panel">
                    <div className="panel-heading">
                        <span className="panel-index">02</span>
                        <div>
                            <h2>Target Role & Company</h2>
                            <p>Provide the job details and full job description text.</p>
                        </div>
                    </div>
                    <div className="analysis-fields">
                        <label>
                            <span>Job Title</span>
                            <input
                                value={form.title}
                                onChange={(event) => updateForm('title', event.target.value)}
                                placeholder="e.g. Senior Backend Engineer"
                                required
                            />
                        </label>
                        <label>
                            <span>Company</span>
                            <input
                                value={form.company}
                                onChange={(event) => updateForm('company', event.target.value)}
                                placeholder="e.g. Stripe, Razorpay, Google"
                            />
                        </label>
                    </div>
                    <label className="textarea-label">
                        <span>Job Description Text</span>
                        <textarea
                            value={form.rawText}
                            onChange={(event) => updateForm('rawText', event.target.value)}
                            placeholder="Paste the complete job description, requirements, and responsibilities here..."
                            rows="10"
                            required
                        />
                    </label>
                </section>

                <section className="input-panel">
                    <div className="panel-heading">
                        <span className="panel-index">03</span>
                        <div>
                            <h2>Sprint Customization</h2>
                            <p>Configure the preparation roadmap based on your upcoming round.</p>
                        </div>
                    </div>

                    <div className="sprint-config-grid">
                        <div className="sprint-config-item">
                            <span className="sprint-label">Preparation Target:</span>
                            <div className="pill-selector">
                                <button
                                    type="button"
                                    className={`pill-btn ${targetType === 'comprehensive' ? 'active' : ''}`}
                                    onClick={() => setTargetType('comprehensive')}
                                >
                                    🎯 Full Loop
                                </button>
                                <button
                                    type="button"
                                    className={`pill-btn ${targetType === 'oa' ? 'active' : ''}`}
                                    onClick={() => setTargetType('oa')}
                                >
                                    💻 Online Assessment (OA)
                                </button>
                                <button
                                    type="button"
                                    className={`pill-btn ${targetType === 'technical' ? 'active' : ''}`}
                                    onClick={() => setTargetType('technical')}
                                >
                                    ⚙️ Tech & System Design
                                </button>
                            </div>
                        </div>

                        <div className="sprint-config-item">
                            <span className="sprint-label">Days Until Round:</span>
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
                </section>

                {error && <p className="form-error" role="alert">{error}</p>}

                <div className="submit-action-row">
                    <button className="primary-button analysis-submit-btn" type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <span className="btn-loading-content">
                                <span className="spinner-sm" />
                                {submittingStep || 'Processing match...'}
                            </span>
                        ) : (
                            'Generate My Match Report →'
                        )}
                    </button>
                </div>
            </form>
        </main>
    );
}
