import { useState } from 'react';
import { Link } from 'react-router-dom';
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
    const [form, setForm] = useState({ title: '', company: '', rawText: '' });
    const [resumeFile, setResumeFile] = useState(null);
    const [report, setReport] = useState(null);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const updateForm = (field, value) => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setReport(null);

        if (!resumeFile) {
            setError('Choose your resume PDF first.');
            return;
        }

        setIsSubmitting(true);

        try {
            const resumeData = new FormData();
            resumeData.append('resume', resumeFile);
            resumeData.append('title', resumeFile.name.replace(/\.pdf$/i, ''));

            const resumeResponse = await request(`${API_URL}/api/resumes/upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: resumeData,
            });

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

            const analysisResponse = await request(`${API_URL}/api/analysis`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    resumeId: resumeResponse.resume._id,
                    jobDescriptionId: jobResponse.jobDescription._id,
                }),
            });

            setReport(analysisResponse.report);
        } catch (submitError) {
            setError(submitError.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="analysis-shell">
            <nav className="home-nav" aria-label="Analysis navigation">
                <Link className="brand-mark" to="/dashboard">resume<span>/</span>ai</Link>
                <Link className="text-button" to="/dashboard">Back to dashboard</Link>
            </nav>

            <header className="analysis-header">
                <p className="eyebrow">New job match</p>
                <h1>See how your experience maps to the role.</h1>
                <p>Upload your resume and paste the job description. We will compare the evidence before making recommendations.</p>
            </header>

            <form className="analysis-form" onSubmit={handleSubmit}>
                <section className="input-panel">
                    <div className="panel-heading">
                        <span className="panel-index">01</span>
                        <div>
                            <h2>Your resume</h2>
                            <p>Use a text-based PDF for the best extraction.</p>
                        </div>
                    </div>
                    <label className="file-drop">
                        <span>{resumeFile ? resumeFile.name : 'Choose resume PDF'}</span>
                        <small>{resumeFile ? 'Ready to analyze' : 'Maximum file size: 5 MB'}</small>
                        <input type="file" accept="application/pdf,.pdf" onChange={(event) => setResumeFile(event.target.files[0] || null)} />
                    </label>
                </section>

                <section className="input-panel">
                    <div className="panel-heading">
                        <span className="panel-index">02</span>
                        <div>
                            <h2>Target role</h2>
                            <p>Paste the job description from the company site or LinkedIn.</p>
                        </div>
                    </div>
                    <div className="analysis-fields">
                        <label>
                            <span>Job title</span>
                            <input value={form.title} onChange={(event) => updateForm('title', event.target.value)} placeholder="Backend Engineer" required />
                        </label>
                        <label>
                            <span>Company <em>optional</em></span>
                            <input value={form.company} onChange={(event) => updateForm('company', event.target.value)} placeholder="Example Inc." />
                        </label>
                    </div>
                    <label>
                        <span>Job description</span>
                        <textarea value={form.rawText} onChange={(event) => updateForm('rawText', event.target.value)} placeholder="Paste the complete job description here..." rows="12" required />
                    </label>
                </section>

                {error && <p className="form-error" role="alert">{error}</p>}
                <button className="primary-button analysis-submit" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Analyzing your match...' : 'Generate my match report'}
                </button>
            </form>

            {report && (
                <section className="report-panel" aria-labelledby="report-title">
                    <div className="report-score">
                        <p className="eyebrow">Your job fit</p>
                        <strong>{report.overallFit}</strong><span>/100</span>
                    </div>
                    <div className="report-content">
                        <h2 id="report-title">A clear starting point for this role.</h2>
                        {report.aiInsights?.summary ? (
                            <div className="ai-insights">
                                <p className="eyebrow">AI perspective</p>
                                <p>{report.aiInsights.summary}</p>
                                <ul>
                                    {report.aiInsights.recommendations.map((recommendation) => (
                                        <li key={recommendation}>{recommendation}</li>
                                    ))}
                                </ul>
                            </div>
                        ) : (
                            <div className="ai-insights ai-insights-fallback">
                                <p className="eyebrow">AI perspective</p>
                                <p>AI enrichment was unavailable, so this report is based on the explainable comparison engine.</p>
                            </div>
                        )}
                        <div className="score-grid">
                            {Object.entries(report.scoreBreakdown).map(([key, value]) => (
                                <div key={key} className="score-item">
                                    <span>{key.replace(/([A-Z])/g, ' $1')}</span>
                                    <strong>{value}%</strong>
                                </div>
                            ))}
                        </div>
                        <div className="requirements-list">
                            <h3>Requirement evidence</h3>
                            {report.requirementMatches?.map((match) => (
                                <div className={`requirement-row ${match.matched ? 'is-matched' : 'is-missing'}`} key={`${match.category}-${match.requirement}`}>
                                    <span className="requirement-status">{match.matched ? 'Matched' : 'Missing'}</span>
                                    <strong>{match.requirement}</strong>
                                    <span>{match.evidence}</span>
                                </div>
                            ))}
                        </div>
                        <div className="report-columns">
                            <div>
                                <h3>Skill gaps</h3>
                                {report.gaps.length ? <ul>{report.gaps.map((gap) => <li key={gap.skill}>{gap.skill}<span>{gap.priority.replace('_', ' ')}</span></li>)}</ul> : <p>No immediate skill gaps found.</p>}
                            </div>
                            <div>
                                <h3>Next preparation steps</h3>
                                {report.preparationPlan.length ? <ul>{report.preparationPlan.map((item) => <li key={item.topic}>Days {item.dayStart}-{item.dayEnd}: {item.topic}</li>)}</ul> : <p>Your profile is ready for deeper interview preparation.</p>}
                            </div>
                        </div>
                    </div>
                </section>
            )}
        </main>
    );
}
