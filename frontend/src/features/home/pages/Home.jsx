import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const focusItems = [
    {
        number: '01',
        title: 'Build your profile',
        description: 'Add the experience and skills that make your story stand out.',
        action: 'Complete profile',
    },
    {
        number: '02',
        title: 'Practice an interview',
        description: 'Get focused questions and sharpen your answers for the role ahead.',
        action: 'Start practice',
    },
    {
        number: '03',
        title: 'Refine your resume',
        description: 'Turn your experience into a clear, role-specific application.',
        action: 'Open resume tools',
    },
];

export default function Home() {
    const { user, token, logout } = useAuth();
    const navigate = useNavigate();
    const [history, setHistory] = useState([]);

    useEffect(() => {
        let isMounted = true;

        fetch(`${API_URL}/api/analysis`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((response) => response.json())
            .then((data) => {
                if (isMounted && data.success) setHistory(data.reports);
            })
            .catch(() => {
                if (isMounted) setHistory([]);
            });

        return () => {
            isMounted = false;
        };
    }, [token]);

    return (
        <main className="home-shell">
            <nav className="home-nav" aria-label="Main navigation">
                <a className="brand-mark" href="/dashboard">resume<span>/</span>ai</a>
                <div className="home-nav-actions">
                    <span className="user-greeting">{user?.username || user?.email}</span>
                    <button className="text-button" type="button" onClick={logout}>Log out</button>
                </div>
            </nav>

            <section className="home-hero" aria-labelledby="home-title">
                <div className="hero-copy">
                    <p className="eyebrow">Your career workspace</p>
                    <h1 id="home-title">Make your next move with clarity.</h1>
                    <p className="hero-description">
                        Welcome back, {user?.username || 'there'}. Your profile, practice, and job search tools are ready when you are.
                    </p>
                    <div className="hero-actions">
                        <button className="primary-button" type="button" onClick={() => navigate('/analyze')}>Start a job match</button>
                        <button className="secondary-button" type="button">View my profile</button>
                    </div>
                </div>
                <div className="progress-panel" aria-label="Getting started progress">
                    <div className="progress-heading">
                        <span>Getting started</span>
                        <strong>1 of 3</strong>
                    </div>
                    <div className="progress-track"><span /></div>
                    <p>Complete your profile to unlock more tailored guidance.</p>
                </div>
            </section>

            <section className="focus-section" aria-labelledby="focus-title">
                <div className="section-heading">
                    <div>
                        <p className="eyebrow">Your toolkit</p>
                        <h2 id="focus-title">Choose your next focus</h2>
                    </div>
                    <span className="section-note">Built around your goals</span>
                </div>
                <div className="focus-grid">
                    {focusItems.map((item) => (
                        <article className="focus-card" key={item.number}>
                            <span className="card-number">{item.number}</span>
                            <h3>{item.title}</h3>
                            <p>{item.description}</p>
                            <button className="card-link" type="button" onClick={() => navigate('/analyze')}>{item.action} <span aria-hidden="true">-&gt;</span></button>
                        </article>
                    ))}
                </div>
            </section>

            <section className="history-section" aria-labelledby="history-title">
                <div className="section-heading">
                    <div>
                        <p className="eyebrow">Saved work</p>
                        <h2 id="history-title">Recent analyses</h2>
                    </div>
                    <button className="text-button" type="button" onClick={() => navigate('/analyze')}>New analysis</button>
                </div>
                {history.length ? (
                    <div className="history-list">
                        {history.slice(0, 5).map((report) => (
                            <button className="history-item" key={report._id} type="button" onClick={() => navigate(`/reports/${report._id}`)}>
                                <div>
                                    <h3>{report.jobDescription?.title || 'Untitled role'}</h3>
                                    <p>{report.jobDescription?.company || 'Company not specified'} · {new Date(report.createdAt).toLocaleDateString()}</p>
                                </div>
                                <strong>{report.overallFit}<span>/100</span></strong>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="history-empty">Your completed job analyses will appear here.</div>
                )}
            </section>
        </main>
    );
}