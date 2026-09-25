import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/hooks/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import {
    SignalLogo,
    EventStreamIcon,
    CacheIcon,
    ShieldVerifyIcon,
    TerminalIcon,
    TargetIcon,
    ClockIcon,
    MicIcon,
    FolderOpenIcon
} from '../../../components/Icons';
import { API_URL } from '../../../config/api';

export default function Home() {
    const { user, token, logout } = useAuth();
    const navigate = useNavigate();
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        fetch(`${API_URL}/api/analysis`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((response) => response.json())
            .then((data) => {
                if (isMounted && data.success) setHistory(data.reports || []);
            })
            .catch(() => {
                if (isMounted) setHistory([]);
            })
            .finally(() => {
                if (isMounted) setIsLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [token]);

    return (
        <div className="app-canvas">
            {/* Ambient Background Lights */}
            <div className="ambient-glow glow-top-left" />
            <div className="ambient-glow glow-top-right" />
            <div className="ambient-glow glow-bottom-center" />

            <div className="home-shell">
                <nav className="glass-nav" aria-label="Main navigation">
                    <Link className="brand-logo" to="/dashboard">
                        <span className="brand-icon">
                            <SignalLogo size={18} />
                        </span>
                        career<span className="brand-highlight">signal</span>
                    </Link>

                    <div className="nav-right-cluster">
                        <Link className="nav-link" to="/profiles">Connected Profiles</Link>
                        <div className="user-avatar-chip">
                            <span className="avatar-dot" />
                            <span className="avatar-name">{user?.username || user?.email?.split('@')[0] || 'User'}</span>
                        </div>
                        <button className="nav-logout-btn" type="button" onClick={logout}>
                            Log out
                        </button>
                    </div>
                </nav>

                {/* HERO SECTION */}
                <section className="hero-banner" aria-labelledby="home-title">
                    <div className="hero-announcement-chip">
                        <span className="chip-pulsar" />
                        <span className="chip-text">Career Intelligence Platform • Event-Driven Architecture</span>
                    </div>

                    <h1 id="home-title" className="hero-headline">
                        Turn your experience into <br />
                        <span className="gradient-highlight">interview-winning signals.</span>
                    </h1>

                    <p className="hero-lead">
                        Cross-reference your resume against real-world job requirements, live GitHub repository proof, and competitive programming benchmarks. Uncover recruiter blockers and practice with our AI interview coach.
                    </p>

                    <div className="hero-button-group">
                        <button className="btn-glow-primary" type="button" onClick={() => navigate('/analyze')}>
                            <span>Start New Job Match</span>
                            <span className="btn-arrow">→</span>
                        </button>
                        <button className="btn-glass-secondary" type="button" onClick={() => navigate('/profiles')}>
                            <span>Connect Developer Profiles</span>
                        </button>
                    </div>

                    {/* LIVE ARCHITECTURE METRICS STRIP */}
                    <div className="architecture-strip">
                        <div className="arch-metric-card">
                            <div className="metric-header">
                                <span className="metric-icon-wrap">
                                    <EventStreamIcon size={16} />
                                </span>
                                <span className="metric-title">Event-Driven</span>
                            </div>
                            <span className="metric-detail">Apache Kafka async background workers</span>
                        </div>

                        <div className="arch-metric-card">
                            <div className="metric-header">
                                <span className="metric-icon-wrap">
                                    <CacheIcon size={16} />
                                </span>
                                <span className="metric-title">Redis Cache</span>
                            </div>
                            <span className="metric-detail">Sub-second report retrieval & JWT revocation</span>
                        </div>

                        <div className="arch-metric-card">
                            <div className="metric-header">
                                <span className="metric-icon-wrap">
                                    <ShieldVerifyIcon size={16} />
                                </span>
                                <span className="metric-title">Deduplication</span>
                            </div>
                            <span className="metric-detail">SHA-256 idempotent ingestion engine</span>
                        </div>

                        <div className="arch-metric-card">
                            <div className="metric-header">
                                <span className="metric-icon-wrap">
                                    <TerminalIcon size={16} />
                                </span>
                                <span className="metric-title">AI Mock Coach</span>
                            </div>
                            <span className="metric-detail">4-metric rubric scoring & model answers</span>
                        </div>
                    </div>
                </section>

                {/* FEATURE WORKSPACE SHOWCASE */}
                <section className="features-showcase-section" aria-labelledby="toolkit-title">
                    <div className="section-title-wrap">
                        <span className="section-mini-tag">YOUR TOOLKIT</span>
                        <h2 id="toolkit-title">Engineered for Technical Career Acceleration</h2>
                        <p>Everything you need from initial recruiter screening to final architecture defense.</p>
                    </div>

                    <div className="toolkit-grid">
                        <div className="toolkit-card" onClick={() => navigate('/analyze')}>
                            <div className="card-top-bar">
                                <span className="toolkit-icon-badge icon-cyan">
                                    <TargetIcon size={20} />
                                </span>
                                <span className="card-step-badge">Phase 01</span>
                            </div>
                            <h3>Job Match & Blocker Diagnostic</h3>
                            <p>Identify why you might get filtered out. Evaluates missing keywords, unquantified bullets, and cloud proof.</p>
                            <span className="card-explore-link">
                                Launch matcher <span className="arrow-sym">→</span>
                            </span>
                        </div>

                        <div className="toolkit-card" onClick={() => navigate('/analyze')}>
                            <div className="card-top-bar">
                                <span className="toolkit-icon-badge icon-amber">
                                    <ClockIcon size={20} />
                                </span>
                                <span className="card-step-badge">Phase 02</span>
                            </div>
                            <h3>Custom Sprint Roadmap</h3>
                            <p>Tailor study schedules for Online Assessments (OA) or Technical System Design across 3, 7, 14, or 30 days.</p>
                            <span className="card-explore-link">
                                Configure sprint <span className="arrow-sym">→</span>
                            </span>
                        </div>

                        <div className="toolkit-card" onClick={() => navigate('/analyze')}>
                            <div className="card-top-bar">
                                <span className="toolkit-icon-badge icon-emerald">
                                    <MicIcon size={20} />
                                </span>
                                <span className="card-step-badge">Phase 03</span>
                            </div>
                            <h3>AI Mock Interview Studio</h3>
                            <p>Practice answering high-probability questions. Get scored on accuracy, depth, clarity, and receive model answers.</p>
                            <span className="card-explore-link">
                                Start studio <span className="arrow-sym">→</span>
                            </span>
                        </div>
                    </div>
                </section>

                {/* RECENT ANALYSES FEED */}
                <section className="history-feed-section" aria-labelledby="history-heading">
                    <div className="feed-header-bar">
                        <div>
                            <span className="section-mini-tag">PORTFOLIO HISTORY</span>
                            <h2 id="history-heading">Recent Analyses & Match Reports</h2>
                        </div>
                        <button className="btn-glass-secondary btn-sm" type="button" onClick={() => navigate('/analyze')}>
                            + New Analysis
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="feed-loading-state">
                            <span className="feed-spinner" />
                            <p>Loading your match history...</p>
                        </div>
                    ) : history.length > 0 ? (
                        <div className="history-cards-list">
                            {history.slice(0, 6).map((report) => {
                                const score = report.overallFit || 0;
                                const scoreColorClass = score >= 75 ? 'score-high' : score >= 55 ? 'score-mid' : 'score-low';
                                const companyName = report.jobDescription?.company || 'Company';
                                const initial = companyName.charAt(0).toUpperCase();

                                return (
                                    <div
                                        key={report._id}
                                        className="history-feed-card"
                                        onClick={() => navigate(`/reports/${report._id}`)}
                                        role="button"
                                        tabIndex={0}
                                    >
                                        <div className="card-left-group">
                                            <div className="company-avatar-box">{initial}</div>
                                            <div className="history-title-group">
                                                <h4>{report.jobDescription?.title || 'Target Role'}</h4>
                                                <div className="history-meta-row">
                                                    <span className="company-text">{companyName}</span>
                                                    <span className="meta-bullet">•</span>
                                                    <span className="sprint-tag-pill">
                                                        {report.customDays || 14}D {(report.targetType || 'comprehensive').toUpperCase()}
                                                    </span>
                                                    <span className="meta-bullet">•</span>
                                                    <span className="date-text">
                                                        {new Date(report.createdAt).toLocaleDateString(undefined, {
                                                            month: 'short',
                                                            day: 'numeric',
                                                        })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="card-right-group">
                                            <div className={`score-badge-circle ${scoreColorClass}`}>
                                                <span className="badge-score-val">{score}</span>
                                                <span className="badge-score-unit">/100</span>
                                            </div>
                                            <span className="view-report-chevron">→</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="empty-history-box">
                            <div className="empty-icon-shield">
                                <FolderOpenIcon size={36} />
                            </div>
                            <h3>No job analyses yet</h3>
                            <p>Upload your resume and a target job description to generate your first explainable career report.</p>
                            <button className="btn-glow-primary btn-sm" type="button" onClick={() => navigate('/analyze')}>
                                Generate First Match Report →
                            </button>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}