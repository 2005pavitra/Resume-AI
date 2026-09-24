import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function Report() {
    const { id } = useParams();
    const { token } = useAuth();
    const [report, setReport] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch(`${API_URL}/api/analysis/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(async (response) => {
                const data = await response.json();
                if (!response.ok || !data.success) throw new Error(data.message || 'Unable to load report');
                return data.report;
            })
            .then(setReport)
            .catch((loadError) => setError(loadError.message));
    }, [id, token]);

    if (error) {
        return <main className="analysis-shell"><p className="form-error">{error}</p><Link className="text-button" to="/dashboard">Back to dashboard</Link></main>;
    }

    if (!report) {
        return <main className="analysis-shell"><p className="eyebrow">Loading report...</p></main>;
    }

    return (
        <main className="analysis-shell">
            <nav className="home-nav" aria-label="Report navigation">
                <Link className="brand-mark" to="/dashboard">resume<span>/</span>ai</Link>
                <Link className="text-button" to="/dashboard">Back to dashboard</Link>
            </nav>

            <header className="analysis-header">
                <p className="eyebrow">Saved analysis</p>
                <h1>{report.jobDescription?.title || 'Job match report'}</h1>
                <p>{report.jobDescription?.company || 'Company not specified'} · Generated {new Date(report.createdAt).toLocaleDateString()}</p>
            </header>

            <section className="report-panel" aria-labelledby="report-title">
                <div className="report-score">
                    <p className="eyebrow">Your job fit</p>
                    <strong>{report.overallFit}</strong><span>/100</span>
                </div>
                <div className="report-content">
                    <h2 id="report-title">Your saved comparison report.</h2>
                    {report.aiInsights?.summary && (
                        <div className="ai-insights">
                            <p className="eyebrow">AI perspective</p>
                            <p>{report.aiInsights.summary}</p>
                            <ul>{report.aiInsights.recommendations.map((item) => <li key={item}>{item}</li>)}</ul>
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
                            <h3>Preparation steps</h3>
                            {report.preparationPlan.length ? <ul>{report.preparationPlan.map((item) => <li key={item.topic}>Days {item.dayStart}-{item.dayEnd}: {item.topic}</li>)}</ul> : <p>No preparation steps were generated.</p>}
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
