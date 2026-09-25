import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function Report() {
    const { id } = useParams();
    const { token } = useAuth();
    const [report, setReport] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    // Customizer state
    const [customDays, setCustomDays] = useState(14);
    const [targetType, setTargetType] = useState('comprehensive');
    const [isUpdating, setIsUpdating] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    // Tabs & interactive state
    const [skillFilter, setSkillFilter] = useState('all');
    const [questionTab, setQuestionTab] = useState('technical');
    const [practiceIndex, setPracticeIndex] = useState(null);
    const [userAnswer, setUserAnswer] = useState('');
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [evaluationResult, setEvaluationResult] = useState(null);
    const [checkedTasks, setCheckedTasks] = useState({});

    useEffect(() => {
        setLoading(true);
        fetch(`${API_URL}/api/analysis/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(async (response) => {
                const data = await response.json();
                if (!response.ok || !data.success) throw new Error(data.message || 'Unable to load report');
                return data.report;
            })
            .then((loadedReport) => {
                setReport(loadedReport);
                if (loadedReport.customDays) setCustomDays(loadedReport.customDays);
                if (loadedReport.targetType) setTargetType(loadedReport.targetType);
            })
            .catch((loadError) => setError(loadError.message))
            .finally(() => setLoading(false));
    }, [id, token]);

    const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(''), 3500);
    };

    const handleApplyCustomization = async (overrideDays, overrideType) => {
        const daysToUse = overrideDays || customDays;
        const typeToUse = overrideType || targetType;

        setIsUpdating(true);
        try {
            const response = await fetch(`${API_URL}/api/analysis/${id}/customize`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ days: Number(daysToUse), targetType: typeToUse }),
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Failed to update preparation plan');
            }

            setReport(data.report);
            showToast(`Updated to ${daysToUse}-Day ${typeToUse.toUpperCase()} Sprint!`);
        } catch (err) {
            showToast(`Error: ${err.message}`);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleToggleTask = (taskKey) => {
        setCheckedTasks((prev) => ({ ...prev, [taskKey]: !prev[taskKey] }));
    };

    const handleEvaluateAnswer = async (question) => {
        if (!userAnswer.trim() || userAnswer.trim().length < 5) {
            showToast('Please type a more detailed answer before evaluating.');
            return;
        }

        setIsEvaluating(true);
        setEvaluationResult(null);

        try {
            const response = await fetch(`${API_URL}/api/analysis/${id}/mock-interview/evaluate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ question, answer: userAnswer }),
            });

            const data = await response.json();
            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Evaluation failed');
            }

            setEvaluationResult(data.evaluation);
            showToast('AI evaluation ready!');
        } catch (err) {
            showToast(`Evaluation error: ${err.message}`);
        } finally {
            setIsEvaluating(false);
        }
    };

    const handleDownloadMarkdown = () => {
        if (!report) return;

        const role = report.jobDescription?.title || 'Target Role';
        const company = report.jobDescription?.company || 'Company';

        let md = `# 🎯 CareerSignal Job Fit Analysis Report\n\n`;
        md += `**Target Role**: ${role}\n`;
        md += `**Company**: ${company}\n`;
        md += `**Overall Fit Score**: ${report.overallFit}/100\n`;
        md += `**Sprint Mode**: ${report.customDays || 14} Days (${(report.targetType || 'comprehensive').toUpperCase()})\n`;
        md += `**Generated**: ${new Date(report.createdAt).toLocaleDateString()}\n\n`;
        md += `---\n\n`;

        md += `## 📊 1. Job Fit Score Breakdown\n`;
        md += `- Overall Fit: **${report.overallFit}/100**\n`;
        if (report.scoreBreakdown) {
            md += `- Technical Skills: ${report.scoreBreakdown.skills}%\n`;
            md += `- Experience: ${report.scoreBreakdown.experience}%\n`;
            md += `- Projects: ${report.scoreBreakdown.projects}%\n`;
            md += `- DSA / Problem Solving: ${report.scoreBreakdown.dsa}%\n`;
            md += `- Job-Specific Skills: ${report.scoreBreakdown.jobSpecific}%\n\n`;
        }

        if (report.scoreExplanations) {
            md += `### Why This Score Exists:\n`;
            (report.scoreExplanations.strong || []).forEach((s) => {
                md += `+ **[STRONG] ${s.factor}**: ${s.evidence}\n`;
            });
            (report.scoreExplanations.missingOrWeak || []).forEach((m) => {
                md += `- **[GAP] ${m.factor}**: ${m.issue}\n`;
            });
            md += `\n`;
        }

        md += `---\n\n## ⚖️ 2. Skill Gap Intelligence\n`;
        if (report.skillGapsCategorized) {
            md += `### 🟢 Already Strong (Verified across multiple sources):\n`;
            (report.skillGapsCategorized.alreadyStrong || []).forEach((s) => {
                md += `- **${s.skill}** [${s.confidence?.toUpperCase()} confidence]: ${s.evidence}\n`;
            });
            md += `\n### 🟡 Partial Matches (Claimed in resume, unverified in GitHub/projects):\n`;
            (report.skillGapsCategorized.partial || []).forEach((p) => {
                md += `- **${p.skill}**: ${p.evidence}\n`;
            });
            md += `\n### 🔴 Missing Critical Requirements:\n`;
            (report.skillGapsCategorized.missing || []).forEach((m) => {
                md += `- **${m.skill}** [${m.priority?.toUpperCase()}]: ${m.evidence}\n`;
            });
            md += `\n`;
        }

        md += `---\n\n## 🥇 3. Project Relevance Leaderboard\n`;
        if (report.projectRelevance?.rankedProjects) {
            report.projectRelevance.rankedProjects.forEach((p) => {
                md += `### Rank ${p.rank}: ${p.name} [${p.matchTier?.toUpperCase()}] (Score: ${p.score}/100)\n`;
                md += `- **Technologies Matched**: ${p.techMatched?.join(', ') || 'N/A'}\n`;
                md += `- **Deployment Evidence**: ${p.deploymentEvidence ? 'Verified (Docker / Cloud)' : 'Not detected'}\n`;
                md += `- **Why**: ${(p.why || []).join('; ')}\n\n`;
            });
            md += `**Strategic Interview Advice**: ${report.projectRelevance.advice}\n\n`;
        }

        md += `---\n\n## 📅 4. Personalized ${report.customDays || 14}-Day Preparation Sprint\n`;
        (report.preparationPlan || []).forEach((p) => {
            md += `### Days ${p.dayStart}-${p.dayEnd}: ${p.topic} [${p.priority?.toUpperCase()}]\n`;
            md += `*Focus Area: ${p.focusArea || 'General'}*\n`;
            (p.tasks || []).forEach((t) => {
                md += `- [ ] ${t}\n`;
            });
            md += `\n`;
        });

        md += `---\n\n## ✍️ 5. Resume Optimization Studio\n`;
        if (report.resumeOptimization?.bulletRewrites) {
            md += `### Recommended Bullet Rewrites (Google X-Y-Z Formula):\n`;
            report.resumeOptimization.bulletRewrites.forEach((b, idx) => {
                md += `**Example ${idx + 1}**:\n`;
                md += `> Original: "${b.original}"\n`;
                md += `> Suggested: "**${b.suggested}**"\n`;
                md += `> Reason: ${b.improvementReason} (${b.impactMetric})\n\n`;
            });
        }
        if (report.resumeOptimization?.atsKeywords) {
            md += `### ATS Keywords Alignment:\n`;
            md += `- **Found Keywords**: ${(report.resumeOptimization.atsKeywords.found || []).join(', ')}\n`;
            md += `- **Missing Keywords**: ${(report.resumeOptimization.atsKeywords.missing || []).join(', ')}\n`;
            md += `*Guidance: ${report.resumeOptimization.atsKeywords.caution}*\n\n`;
        }

        md += `---\n\n## ⚠️ 6. "Why Am I Not Getting Shortlisted?" Diagnostic\n`;
        if (report.shortlistBlockers?.blockers) {
            report.shortlistBlockers.blockers.forEach((b) => {
                md += `### [${b.severity?.toUpperCase()} RISK] ${b.title}\n`;
                md += `- **Diagnosis**: ${b.explanation}\n`;
                md += `- **Impact**: ${b.impact}\n\n`;
            });
            md += `### Fix These First Checklist:\n`;
            (report.shortlistBlockers.fixTheseFirst || []).forEach((f) => {
                md += `${f.order}. **${f.action}** (${f.estimatedEffort}): ${f.detail}\n`;
            });
            md += `\n`;
        }

        md += `---\n\n## 💬 7. Predicted Interview Questions\n`;
        if (report.interviewQuestionsGrouped) {
            md += `### Technical Architecture Questions:\n`;
            (report.interviewQuestionsGrouped.technical || []).forEach((q, i) => {
                md += `${i + 1}. **${q.question}** (${q.topic})\n   *Context: ${q.context}*\n`;
            });
            md += `\n### Resume Deep-Dive Challenge Questions:\n`;
            (report.interviewQuestionsGrouped.resumeDeepDives || []).forEach((q, i) => {
                md += `${i + 1}. **${q.question}**\n   *Follow-ups: ${(q.followUps || []).join('; ')}*\n   *Why Asked: ${q.whyAsked}*\n`;
            });
        }

        md += `\n---\n*Report generated by CareerSignal (Resume-AI Platform)*\n`;

        const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${company.replace(/\s+/g, '_')}_${role.replace(/\s+/g, '_')}_CareerMatch.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Report downloaded as Markdown!');
    };

    const handlePrint = () => {
        window.print();
    };

    if (error) {
        return (
            <main className="analysis-shell">
                <nav className="home-nav">
                    <Link className="brand-mark" to="/dashboard">career<span>signal</span></Link>
                    <Link className="text-button" to="/dashboard">Back to dashboard</Link>
                </nav>
                <div className="report-error-card">
                    <h2>Unable to load report</h2>
                    <p className="form-error">{error}</p>
                    <Link className="primary-button" to="/dashboard">Return to dashboard</Link>
                </div>
            </main>
        );
    }

    if (loading || !report) {
        return (
            <main className="analysis-shell">
                <div className="report-loading-container">
                    <div className="loading-spinner" />
                    <h2>Analyzing your career signals...</h2>
                    <p>Generating explainable fit score, project rankings, and interview roadmap.</p>
                </div>
            </main>
        );
    }

    // Filter requirements
    const allMatches = report.requirementMatches || [];
    const filteredMatches = allMatches.filter((match) => {
        if (skillFilter === 'strong') return match.status === 'strong_match';
        if (skillFilter === 'partial') return match.status === 'partial_match';
        if (skillFilter === 'missing') return match.status === 'significant_gap';
        return true;
    });

    const questionsList = report.interviewQuestionsGrouped?.[questionTab] || [];

    const fitScore = report.overallFit || 0;
    const scoreColor = fitScore >= 75 ? '#10b981' : fitScore >= 55 ? '#f59e0b' : '#ef4444';

    return (
        <main className="report-workspace">
            {toastMessage && <div className="floating-toast">{toastMessage}</div>}

            <nav className="home-nav no-print" aria-label="Report navigation">
                <Link className="brand-mark" to="/dashboard">career<span>signal</span></Link>
                <div className="nav-report-actions">
                    <button className="secondary-button btn-sm" type="button" onClick={handleDownloadMarkdown}>
                        📥 Download .md
                    </button>
                    <button className="secondary-button btn-sm" type="button" onClick={handlePrint}>
                        🖨️ Export PDF
                    </button>
                    <Link className="text-button" to="/dashboard">Dashboard</Link>
                </div>
            </nav>

            <header className="report-header">
                <div className="report-header-main">
                    <div className="badge-row">
                        <span className="hero-badge company-badge">{report.jobDescription?.company || 'Company'}</span>
                        <span className="hero-badge sprint-badge">
                            ⏱️ {report.customDays || 14}-Day Sprint • {(report.targetType || 'comprehensive').toUpperCase()}
                        </span>
                        {report.status === 'complete' && <span className="hero-badge verified-badge">✓ Analyzed</span>}
                    </div>
                    <h1>{report.jobDescription?.title || 'Target Role'}</h1>
                    <p className="report-subtitle">
                        Comparative match evaluated against <strong>{report.resume?.title || 'Uploaded Resume'}</strong>
                        {report.candidateSignals?.githubSnapshot?.repositories ? ` and verified GitHub portfolio (${report.candidateSignals.githubSnapshot.repositories} repositories)` : ''}.
                    </p>
                </div>
                <div className="report-header-cta no-print">
                    <button className="primary-button" type="button" onClick={() => {
                        const el = document.getElementById('sprint-section');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}>
                        View Preparation Plan ↓
                    </button>
                </div>
            </header>

            {/* SPRINT CUSTOMIZER BAR */}
            <section className="sprint-customizer-banner no-print" aria-label="Sprint Customizer">
                <div className="customizer-copy">
                    <span className="customizer-tag">⚡ Sprint Customizer</span>
                    <h3>Adjust preparation timeline & target</h3>
                    <p>Tailor the study schedule and interview focus based on your upcoming round.</p>
                </div>

                <div className="customizer-controls">
                    <div className="control-group">
                        <span className="control-label">Target Round:</span>
                        <div className="pill-selector">
                            <button
                                type="button"
                                className={`pill-btn ${targetType === 'comprehensive' ? 'active' : ''}`}
                                onClick={() => {
                                    setTargetType('comprehensive');
                                    handleApplyCustomization(customDays, 'comprehensive');
                                }}
                            >
                                🎯 Full Loop
                            </button>
                            <button
                                type="button"
                                className={`pill-btn ${targetType === 'oa' ? 'active' : ''}`}
                                onClick={() => {
                                    setTargetType('oa');
                                    handleApplyCustomization(customDays, 'oa');
                                }}
                            >
                                💻 Online Assessment (OA)
                            </button>
                            <button
                                type="button"
                                className={`pill-btn ${targetType === 'technical' ? 'active' : ''}`}
                                onClick={() => {
                                    setTargetType('technical');
                                    handleApplyCustomization(customDays, 'technical');
                                }}
                            >
                                ⚙️ Tech & System Design
                            </button>
                        </div>
                    </div>

                    <div className="control-group">
                        <span className="control-label">Days Left:</span>
                        <div className="days-selector">
                            {[3, 7, 14, 30].map((d) => (
                                <button
                                    key={d}
                                    type="button"
                                    className={`day-btn ${customDays === d ? 'active' : ''}`}
                                    onClick={() => {
                                        setCustomDays(d);
                                        handleApplyCustomization(d, targetType);
                                    }}
                                >
                                    {d}d
                                </button>
                            ))}
                            <input
                                type="number"
                                min="1"
                                max="60"
                                value={customDays}
                                onChange={(e) => setCustomDays(Number(e.target.value))}
                                className="day-input"
                                aria-label="Custom days"
                            />
                            <button
                                type="button"
                                className="primary-button btn-sm"
                                disabled={isUpdating}
                                onClick={() => handleApplyCustomization(customDays, targetType)}
                            >
                                {isUpdating ? 'Updating...' : 'Apply'}
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* HERO SCORE & EXPLAINABILITY */}
            <section className="score-hero-grid">
                <div className="score-hero-card">
                    <div className="score-gauge-wrapper">
                        <svg className="score-gauge-svg" viewBox="0 0 160 160" width="160" height="160">
                            <circle cx="80" cy="80" r="68" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="12" fill="none" />
                            <circle
                                cx="80"
                                cy="80"
                                r="68"
                                stroke={scoreColor}
                                strokeWidth="12"
                                strokeDasharray={427}
                                strokeDashoffset={427 - (427 * fitScore) / 100}
                                strokeLinecap="round"
                                fill="none"
                                transform="rotate(-90 80 80)"
                            />
                        </svg>
                        <div className="score-center-text">
                            <span className="score-number">{fitScore}</span>
                            <span className="score-max">/100</span>
                        </div>
                    </div>
                    <div className="score-label-group">
                        <h2>Overall Role Alignment</h2>
                        <p>
                            {fitScore >= 75
                                ? 'Strong competitive alignment for technical rounds.'
                                : fitScore >= 55
                                ? 'Solid foundations with addressable skill & cloud gaps.'
                                : 'Significant gaps in required skills or deployment proof.'}
                        </p>
                    </div>

                    <div className="score-sub-bars">
                        {report.scoreBreakdown && (
                            <>
                                <div className="sub-bar-item">
                                    <div className="sub-bar-label">
                                        <span>Technical Skills</span>
                                        <strong>{report.scoreBreakdown.skills}%</strong>
                                    </div>
                                    <div className="sub-bar-track">
                                        <div className="sub-bar-fill" style={{ width: `${report.scoreBreakdown.skills}%` }} />
                                    </div>
                                </div>
                                <div className="sub-bar-item">
                                    <div className="sub-bar-label">
                                        <span>Experience Seniority</span>
                                        <strong>{report.scoreBreakdown.experience}%</strong>
                                    </div>
                                    <div className="sub-bar-track">
                                        <div className="sub-bar-fill" style={{ width: `${report.scoreBreakdown.experience}%` }} />
                                    </div>
                                </div>
                                <div className="sub-bar-item">
                                    <div className="sub-bar-label">
                                        <span>Project Verification</span>
                                        <strong>{report.scoreBreakdown.projects}%</strong>
                                    </div>
                                    <div className="sub-bar-track">
                                        <div className="sub-bar-fill" style={{ width: `${report.scoreBreakdown.projects}%` }} />
                                    </div>
                                </div>
                                <div className="sub-bar-item">
                                    <div className="sub-bar-label">
                                        <span>DSA & Problem Solving</span>
                                        <strong>{report.scoreBreakdown.dsa}%</strong>
                                    </div>
                                    <div className="sub-bar-track">
                                        <div className="sub-bar-fill" style={{ width: `${report.scoreBreakdown.dsa}%` }} />
                                    </div>
                                </div>
                                <div className="sub-bar-item">
                                    <div className="sub-bar-label">
                                        <span>Job-Specific Competency</span>
                                        <strong>{report.scoreBreakdown.jobSpecific}%</strong>
                                    </div>
                                    <div className="sub-bar-track">
                                        <div className="sub-bar-fill" style={{ width: `${report.scoreBreakdown.jobSpecific}%` }} />
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                <div className="score-explainability-card">
                    <div className="card-badge-header">
                        <span className="section-eyebrow">Explainable Engine</span>
                        <h3>Why this score exists</h3>
                    </div>

                    <div className="signals-dual-column">
                        <div className="signal-block strong-block">
                            <h4>
                                <span className="signal-icon green-icon">✓</span> Verified Strengths
                            </h4>
                            <ul className="signal-list">
                                {(report.scoreExplanations?.strong || []).map((s, idx) => (
                                    <li key={idx} className="signal-item positive-signal">
                                        <strong>{s.factor}</strong>
                                        <p>{s.evidence}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="signal-block gaps-block">
                            <h4>
                                <span className="signal-icon red-icon">⚠</span> Gaps & Missing Proof
                            </h4>
                            <ul className="signal-list">
                                {(report.scoreExplanations?.missingOrWeak || []).map((m, idx) => (
                                    <li key={idx} className="signal-item negative-signal">
                                        <strong>{m.factor}</strong>
                                        <p>{m.issue}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* BLOCKER DIAGNOSTIC ("WHY AM I NOT GETTING SHORTLISTED?") */}
            {report.shortlistBlockers?.blockers?.length > 0 && (
                <section className="blockers-diagnostic-panel" aria-labelledby="blocker-title">
                    <div className="blocker-header">
                        <div className="blocker-header-text">
                            <span className="blocker-alert-badge">Critical Diagnostic</span>
                            <h2 id="blocker-title">Why am I not getting shortlisted?</h2>
                            <p>Real-world blockers identified from recruiter screen filters and applicant tracking criteria.</p>
                        </div>
                    </div>

                    <div className="blockers-grid">
                        {report.shortlistBlockers.blockers.map((b) => (
                            <div key={b.id} className={`blocker-card severity-${b.severity}`}>
                                <div className="blocker-top-row">
                                    <span className={`severity-tag ${b.severity}`}>{b.severity.toUpperCase()} RISK</span>
                                    <h4>{b.title}</h4>
                                </div>
                                <p className="blocker-explanation">{b.explanation}</p>
                                <span className="blocker-impact">Impact: {b.impact}</span>
                            </div>
                        ))}
                    </div>

                    <div className="fix-first-container">
                        <h3>Prioritized Action Checklist (Fix These First)</h3>
                        <div className="fix-list">
                            {report.shortlistBlockers.fixTheseFirst?.map((fix) => (
                                <div key={fix.order} className="fix-item">
                                    <span className="fix-number">{fix.order}</span>
                                    <div className="fix-body">
                                        <div className="fix-headline">
                                            <strong>{fix.action}</strong>
                                            <span className="effort-badge">{fix.estimatedEffort}</span>
                                        </div>
                                        <p>{fix.detail}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* TRI-STATE SKILL GAP MATRIX */}
            <section className="section-container" aria-labelledby="skills-title">
                <div className="section-head-bar">
                    <div>
                        <span className="section-eyebrow">Evidence Verification</span>
                        <h2 id="skills-title">Skill Gap Intelligence Matrix</h2>
                        <p>Distinguishes verified demonstrated activity from unproven resume claims.</p>
                    </div>

                    <div className="matrix-filter-tabs no-print">
                        <button
                            type="button"
                            className={`tab-btn ${skillFilter === 'all' ? 'active' : ''}`}
                            onClick={() => setSkillFilter('all')}
                        >
                            All ({allMatches.length})
                        </button>
                        <button
                            type="button"
                            className={`tab-btn ${skillFilter === 'strong' ? 'active' : ''}`}
                            onClick={() => setSkillFilter('strong')}
                        >
                            🟢 Already Strong
                        </button>
                        <button
                            type="button"
                            className={`tab-btn ${skillFilter === 'partial' ? 'active' : ''}`}
                            onClick={() => setSkillFilter('partial')}
                        >
                            🟡 Partial Claims
                        </button>
                        <button
                            type="button"
                            className={`tab-btn ${skillFilter === 'missing' ? 'active' : ''}`}
                            onClick={() => setSkillFilter('missing')}
                        >
                            🔴 Missing
                        </button>
                    </div>
                </div>

                <div className="skill-matrix-table">
                    {filteredMatches.map((match) => (
                        <div key={`${match.category}-${match.requirement}`} className={`matrix-row row-${match.status}`}>
                            <div className="matrix-skill-col">
                                <span className={`status-pill pill-${match.status}`}>
                                    {match.status === 'strong_match' ? 'Strong Match' : match.status === 'partial_match' ? 'Partial Claim' : 'Missing'}
                                </span>
                                <strong className="matrix-skill-name">{match.requirement}</strong>
                            </div>

                            <div className="matrix-evidence-col">
                                <p>{match.evidence}</p>
                            </div>

                            <div className="matrix-meta-col">
                                <span className={`confidence-badge conf-${match.confidence}`}>
                                    {match.confidence.toUpperCase()} CONFIDENCE
                                </span>
                                <div className="sources-tags">
                                    {(match.sources || []).map((src) => (
                                        <span key={src} className="src-tag">{src}</span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* PROJECT RELEVANCE LEADERBOARD */}
            {report.projectRelevance?.rankedProjects?.length > 0 && (
                <section className="section-container" aria-labelledby="projects-title">
                    <div className="section-head-bar">
                        <div>
                            <span className="section-eyebrow">Portfolio Positioning</span>
                            <h2 id="projects-title">Project Relevance Leaderboard</h2>
                            <p>Which projects you should lead with and emphasize for this specific position.</p>
                        </div>
                    </div>

                    <div className="project-ranked-grid">
                        {report.projectRelevance.rankedProjects.map((project) => (
                            <div key={project.name} className={`ranked-project-card tier-${project.matchTier}`}>
                                <div className="project-card-header">
                                    <span className="project-rank-crown">
                                        {project.rank === 1 ? '🥇 Primary Lead' : project.rank === 2 ? '🥈 Supporting' : '🥉 Lower Relevance'}
                                    </span>
                                    <span className="project-score-badge">{project.score}% Match</span>
                                </div>

                                <h3>{project.name}</h3>

                                <div className="project-tech-tags">
                                    {(project.techMatched || []).map((tech) => (
                                        <span key={tech} className="tech-badge">{tech}</span>
                                    ))}
                                    {project.deploymentEvidence && (
                                        <span className="tech-badge deploy-badge">✓ Docker / Cloud</span>
                                    )}
                                </div>

                                <ul className="project-why-list">
                                    {(project.why || []).map((reason, i) => (
                                        <li key={i}>{reason}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    {report.projectRelevance.advice && (
                        <div className="project-advice-box">
                            <strong>💡 Technical Interview Strategy:</strong>
                            <p>{report.projectRelevance.advice}</p>
                        </div>
                    )}
                </section>
            )}

            {/* 14-DAY / SPRINT PREPARATION SCHEDULE */}
            <section id="sprint-section" className="section-container" aria-labelledby="prep-title">
                <div className="section-head-bar">
                    <div>
                        <span className="section-eyebrow">Personalized Roadmap</span>
                        <h2 id="prep-title">
                            {report.customDays || 14}-Day {(report.targetType || 'Comprehensive').toUpperCase()} Sprint
                        </h2>
                        <p>Job-specific daily milestones focused directly on eliminating interview blockers.</p>
                    </div>
                </div>

                <div className="sprint-timeline">
                    {(report.preparationPlan || []).map((step, idx) => (
                        <div key={idx} className={`timeline-card priority-${step.priority}`}>
                            <div className="timeline-date-col">
                                <span className="timeline-days">Days {step.dayStart}–{step.dayEnd}</span>
                                <span className={`priority-tag ${step.priority}`}>{step.priority.replace('_', ' ').toUpperCase()}</span>
                            </div>

                            <div className="timeline-content-col">
                                <div className="timeline-title-row">
                                    <h3>{step.topic}</h3>
                                    {step.focusArea && <span className="focus-area-badge">{step.focusArea}</span>}
                                </div>

                                <div className="timeline-checklist">
                                    {(step.tasks || []).map((task, tIdx) => {
                                        const key = `${idx}-${tIdx}`;
                                        const isChecked = Boolean(checkedTasks[key]);
                                        return (
                                            <label key={tIdx} className={`task-check-label ${isChecked ? 'completed' : ''}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => handleToggleTask(key)}
                                                />
                                                <span>{task}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* RESUME OPTIMIZATION STUDIO */}
            {report.resumeOptimization && (
                <section className="section-container" aria-labelledby="opt-title">
                    <div className="section-head-bar">
                        <div>
                            <span className="section-eyebrow">Application Enhancement</span>
                            <h2 id="opt-title">Resume Optimization Studio</h2>
                            <p>Quantifying bullet points using Google's X-Y-Z formula and targeting missing ATS keywords.</p>
                        </div>
                    </div>

                    <div className="bullet-rewrites-container">
                        <h3>Before & After Bullet Rewrites</h3>
                        <div className="rewrites-grid">
                            {(report.resumeOptimization.bulletRewrites || []).map((rewrite, idx) => (
                                <div key={idx} className="rewrite-card">
                                    <div className="rewrite-original">
                                        <span className="version-label before-label">Current Resume</span>
                                        <p>"{rewrite.original}"</p>
                                    </div>

                                    <div className="rewrite-arrow">↓</div>

                                    <div className="rewrite-suggested">
                                        <span className="version-label after-label">Recommended (Google X-Y-Z Formula)</span>
                                        <p>"{rewrite.suggested}"</p>
                                        <div className="rewrite-meta">
                                            <span className="impact-pill">Impact: {rewrite.impactMetric}</span>
                                            <small>{rewrite.improvementReason}</small>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {report.resumeOptimization.atsKeywords && (
                        <div className="ats-keywords-container">
                            <h3>Applicant Tracking System (ATS) Keyword Alignment</h3>
                            <div className="ats-dual-box">
                                <div className="ats-box ats-found">
                                    <h4>Matched Keywords in Resume</h4>
                                    <div className="keyword-chip-list">
                                        {(report.resumeOptimization.atsKeywords.found || []).map((k) => (
                                            <span key={k} className="chip chip-found">✓ {k}</span>
                                        ))}
                                    </div>
                                </div>

                                <div className="ats-box ats-missing">
                                    <h4>Missing High-Value Keywords</h4>
                                    <div className="keyword-chip-list">
                                        {(report.resumeOptimization.atsKeywords.missing || []).map((k) => (
                                            <span key={k} className="chip chip-missing" onClick={() => {
                                                navigator.clipboard.writeText(k);
                                                showToast(`Copied "${k}" to clipboard!`);
                                            }}>
                                                + {k}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <p className="ats-disclaimer">
                                <em>Note:</em> {report.resumeOptimization.atsKeywords.caution}
                            </p>
                        </div>
                    )}
                </section>
            )}

            {/* PREDICTED INTERVIEW QUESTIONS & MOCK INTERVIEW COACH */}
            <section className="section-container" aria-labelledby="interview-title">
                <div className="section-head-bar">
                    <div>
                        <span className="section-eyebrow">AI Interview Coach</span>
                        <h2 id="interview-title">Predicted Interview Questions & Mock Practice</h2>
                        <p>Questions tailored directly to your resume claims and target job requirements.</p>
                    </div>

                    <div className="matrix-filter-tabs no-print">
                        <button
                            type="button"
                            className={`tab-btn ${questionTab === 'technical' ? 'active' : ''}`}
                            onClick={() => {
                                setQuestionTab('technical');
                                setPracticeIndex(null);
                                setEvaluationResult(null);
                            }}
                        >
                            Technical Architecture
                        </button>
                        <button
                            type="button"
                            className={`tab-btn ${questionTab === 'resumeDeepDives' ? 'active' : ''}`}
                            onClick={() => {
                                setQuestionTab('resumeDeepDives');
                                setPracticeIndex(null);
                                setEvaluationResult(null);
                            }}
                        >
                            Resume Deep-Dives
                        </button>
                        <button
                            type="button"
                            className={`tab-btn ${questionTab === 'projectArchitecture' ? 'active' : ''}`}
                            onClick={() => {
                                setQuestionTab('projectArchitecture');
                                setPracticeIndex(null);
                                setEvaluationResult(null);
                            }}
                        >
                            Project Architecture
                        </button>
                        <button
                            type="button"
                            className={`tab-btn ${questionTab === 'behavioral' ? 'active' : ''}`}
                            onClick={() => {
                                setQuestionTab('behavioral');
                                setPracticeIndex(null);
                                setEvaluationResult(null);
                            }}
                        >
                            Behavioral
                        </button>
                    </div>
                </div>

                <div className="questions-interactive-list">
                    {questionsList.map((item, idx) => (
                        <div key={idx} className="question-card">
                            <div className="question-header">
                                <span className="question-category-tag">{questionTab}</span>
                                {item.topic && <span className="question-topic-pill">{item.topic}</span>}
                            </div>

                            <h3>{item.question}</h3>
                            {item.context && <p className="question-context"><em>Why interviewers ask this:</em> {item.context}</p>}
                            {item.whyAsked && <p className="question-context"><em>Interviewer intent:</em> {item.whyAsked}</p>}

                            {item.followUps?.length > 0 && (
                                <div className="follow-up-box">
                                    <strong>Expected Follow-Ups:</strong>
                                    <ul>
                                        {item.followUps.map((f, fIdx) => (
                                            <li key={fIdx}>{f}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="practice-cta-row no-print">
                                <button
                                    type="button"
                                    className="secondary-button btn-sm"
                                    onClick={() => {
                                        setPracticeIndex(practiceIndex === idx ? null : idx);
                                        setUserAnswer('');
                                        setEvaluationResult(null);
                                    }}
                                >
                                    {practiceIndex === idx ? 'Close Practice Studio' : '🎙️ Practice Answering with AI Coach'}
                                </button>
                            </div>

                            {/* PRACTICE & EVALUATOR STUDIO */}
                            {practiceIndex === idx && (
                                <div className="practice-studio no-print">
                                    <label>
                                        <span>Your Answer:</span>
                                        <textarea
                                            rows="5"
                                            value={userAnswer}
                                            onChange={(e) => setUserAnswer(e.target.value)}
                                            placeholder="Structure your answer: context, architectural decision, trade-offs, and failure handling..."
                                        />
                                    </label>

                                    <div className="practice-action-bar">
                                        <button
                                            type="button"
                                            className="primary-button"
                                            disabled={isEvaluating}
                                            onClick={() => handleEvaluateAnswer(item.question)}
                                        >
                                            {isEvaluating ? 'Evaluating with AI Coach...' : 'Submit Answer for AI Evaluation'}
                                        </button>
                                    </div>

                                    {evaluationResult && (
                                        <div className="evaluation-card">
                                            <div className="eval-score-header">
                                                <div>
                                                    <span className="eval-tag">Coach Scorecard</span>
                                                    <h4>Answer Quality: {evaluationResult.score}/10</h4>
                                                </div>
                                                <div className="eval-rubric-chips">
                                                    <span>Accuracy: {evaluationResult.rubric?.technicalAccuracy}/10</span>
                                                    <span>Clarity: {evaluationResult.rubric?.clarity}/10</span>
                                                    <span>Depth: {evaluationResult.rubric?.depth}/10</span>
                                                    <span>Confidence: {evaluationResult.rubric?.confidence}/10</span>
                                                </div>
                                            </div>

                                            <p className="eval-feedback"><strong>Feedback:</strong> {evaluationResult.feedback}</p>

                                            {evaluationResult.missingPoints?.length > 0 && (
                                                <div className="eval-missing-box">
                                                    <strong>What was missing in your answer:</strong>
                                                    <ul>
                                                        {evaluationResult.missingPoints.map((mp, mpIdx) => (
                                                            <li key={mpIdx}>{mp}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}

                                            {evaluationResult.sampleIdealAnswer && (
                                                <div className="eval-ideal-answer">
                                                    <strong>Sample Ideal Answer:</strong>
                                                    <p>{evaluationResult.sampleIdealAnswer}</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            {/* COMPANY PREPARATION RADAR */}
            {report.companyPrepFocus && (
                <section className="section-container" aria-labelledby="radar-title">
                    <div className="section-head-bar">
                        <div>
                            <span className="section-eyebrow">Company Focus</span>
                            <h2 id="radar-title">{report.companyPrepFocus.companyName} Interview Focus Distribution</h2>
                            <p>Estimated distribution of evaluation weight based on hiring standards for this tier of role.</p>
                        </div>
                    </div>

                    <div className="focus-distribution-grid">
                        {Object.entries(report.companyPrepFocus.focusDistribution || {}).map(([pillar, pct]) => (
                            <div key={pillar} className="focus-pillar-card">
                                <span className="pillar-name">{pillar.replace(/([A-Z])/g, ' $1').toUpperCase()}</span>
                                <strong className="pillar-pct">{pct}%</strong>
                                <div className="pillar-track">
                                    <div className="pillar-fill" style={{ width: `${pct}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="likely-areas-box">
                        <strong>Expected Focus Areas:</strong>
                        <div className="likely-chips">
                            {(report.companyPrepFocus.likelyInterviewAreas || []).map((area) => (
                                <span key={area} className="likely-chip">{area}</span>
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </main>
    );
}
