import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';
import { SignalLogo, GitBranchIcon, CodeIcon, TerminalIcon, TargetIcon } from '../../../components/Icons';
import { API_URL } from '../../../config/api';

const providers = [
    {
        id: 'github',
        name: 'GitHub',
        tag: 'GH',
        iconComp: GitBranchIcon,
        accentColor: '#8b5cf6',
        description: 'Syncs active repositories, primary languages, backend architectures, and Docker / CI-CD deployment evidence.',
        placeholder: 'e.g. torvalds or your-username',
    },
    {
        id: 'leetcode',
        name: 'LeetCode',
        tag: 'LC',
        iconComp: CodeIcon,
        accentColor: '#f59e0b',
        description: 'Pulls verified solved problem counts across Easy, Medium, Hard, and competitive contest ratings.',
        placeholder: 'e.g. your_leetcode_handle',
    },
    {
        id: 'codeforces',
        name: 'Codeforces',
        tag: 'CF',
        iconComp: TargetIcon,
        accentColor: '#ef4444',
        description: 'Extracts contest performance, maximum rating, and algorithmic problem-solving tier verification.',
        placeholder: 'e.g. tourist or your_handle',
    },
    {
        id: 'codechef',
        name: 'CodeChef',
        tag: 'CC',
        iconComp: TerminalIcon,
        accentColor: '#06b6d4',
        description: 'Maps global star ratings, division rank, and verified competitive contest participations.',
        placeholder: 'e.g. your_codechef_username',
    },
];

export default function Profiles() {
    const { token } = useAuth();
    const [profiles, setProfiles] = useState([]);
    const [usernames, setUsernames] = useState({});
    const [syncing, setSyncing] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        let isMounted = true;

        const loadProfiles = async () => {
            const response = await fetch(`${API_URL}/api/profiles`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await response.json();
            if (isMounted && data.success) setProfiles(data.profiles);
        };

        loadProfiles().catch(() => {
            if (isMounted) setError('Unable to load profile connections.');
        });

        return () => {
            isMounted = false;
        };
    }, [token]);

    const showSuccess = (msg) => {
        setSuccessMessage(msg);
        setTimeout(() => setSuccessMessage(''), 3500);
    };

    const sync = async (provider) => {
        setError('');
        const handle = usernames[provider];
        if (!handle || !handle.trim()) {
            setError(`Please enter a valid ${provider} username.`);
            return;
        }

        setSyncing(provider);

        try {
            const response = await fetch(`${API_URL}/api/profiles/${provider}/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ username: handle.trim() }),
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || `Unable to sync ${provider}`);

            const profilesResponse = await fetch(`${API_URL}/api/profiles`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const profilesData = await profilesResponse.json();
            if (profilesData.success) setProfiles(profilesData.profiles);

            showSuccess(`Successfully connected & synced ${provider.toUpperCase()} profile!`);
        } catch (syncError) {
            setError(syncError.message);
        } finally {
            setSyncing('');
        }
    };

    return (
        <div className="app-canvas">
            <div className="ambient-glow glow-top-left" />
            <div className="ambient-glow glow-top-right" />

            {successMessage && <div className="floating-toast">{successMessage}</div>}

            <div className="home-shell">
                <nav className="glass-nav" aria-label="Profile navigation">
                    <Link className="brand-logo" to="/dashboard">
                        <span className="brand-icon">
                            <SignalLogo size={18} />
                        </span>
                        career<span className="brand-highlight">signal</span>
                    </Link>
                    <div className="nav-right-cluster">
                        <Link className="nav-link" to="/analyze">Run Match</Link>
                        <Link className="nav-link" to="/dashboard">Dashboard</Link>
                    </div>
                </nav>

                <header className="page-header-center">
                    <div className="hero-announcement-chip">
                        <span className="chip-pulsar" />
                        <span className="chip-text">Demonstrated Proof Engine</span>
                    </div>
                    <h1>Connect The Work Behind Your Resume</h1>
                    <p>
                        Sync public developer platforms so the analysis engine can back up your resume claims with verifiable code repositories, deployment proof, and competitive problem-solving milestones.
                    </p>
                </header>

                {error && (
                    <div className="form-error-banner" role="alert">
                        <span>Alert:</span>
                        <p>{error}</p>
                    </div>
                )}

                <div className="profiles-showcase-grid">
                    {providers.map((provider) => {
                        const profile = profiles.find((item) => item.provider === provider.id);
                        const isConnected = profile?.syncStatus === 'ready';
                        const IconComponent = provider.iconComp;

                        return (
                            <div key={provider.id} className="provider-glass-card">
                                <div className="provider-card-top">
                                    <div className="provider-name-cluster">
                                        <div className="provider-avatar-box">
                                            <IconComponent size={20} />
                                        </div>
                                        <div>
                                            <h3>{provider.name}</h3>
                                            <span className="provider-category">Evidence Pipeline</span>
                                        </div>
                                    </div>

                                    <span className={`connection-pill ${isConnected ? 'connected' : 'unconnected'}`}>
                                        <span className="pill-dot" />
                                        {isConnected ? 'Verified' : 'Not Connected'}
                                    </span>
                                </div>

                                <p className="provider-desc">{provider.description}</p>

                                <div className="provider-sync-row">
                                    <input
                                        className="glass-input"
                                        value={usernames[provider.id] ?? profile?.username ?? ''}
                                        onChange={(event) =>
                                            setUsernames({ ...usernames, [provider.id]: event.target.value })
                                        }
                                        placeholder={provider.placeholder}
                                        aria-label={`${provider.name} username`}
                                    />
                                    <button
                                        className="btn-glow-primary btn-sm"
                                        type="button"
                                        onClick={() => sync(provider.id)}
                                        disabled={syncing === provider.id}
                                    >
                                        {syncing === provider.id ? 'Syncing...' : isConnected ? 'Re-sync' : 'Connect'}
                                    </button>
                                </div>

                                {isConnected && (
                                    <div className="provider-footer-meta">
                                        <span>Verified handle: <strong>@{profile.username}</strong></span>
                                        <small>{new Date(profile.lastSyncedAt).toLocaleDateString()}</small>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
