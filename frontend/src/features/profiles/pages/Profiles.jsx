import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/hooks/useAuth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const providers = [
    { id: 'github', name: 'GitHub', description: 'Repositories, languages, topics, and activity.' },
    { id: 'leetcode', name: 'LeetCode', description: 'Solved problems, difficulty split, and contests.' },
    { id: 'codeforces', name: 'Codeforces', description: 'Rating, solved problems, and contest activity.' },
    { id: 'codechef', name: 'CodeChef', description: 'Rating, solved problems, and participation.' },
];

export default function Profiles() {
    const { token } = useAuth();
    const [profiles, setProfiles] = useState([]);
    const [usernames, setUsernames] = useState({});
    const [syncing, setSyncing] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        let isMounted = true;

        const loadProfiles = async () => {
            const response = await fetch(`${API_URL}/api/profiles`, { headers: { Authorization: `Bearer ${token}` } });
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

    const sync = async (provider) => {
        setError('');
        setSyncing(provider);

        try {
            const response = await fetch(`${API_URL}/api/profiles/${provider}/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ username: usernames[provider] }),
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || `Unable to sync ${provider}`);
            const profilesResponse = await fetch(`${API_URL}/api/profiles`, { headers: { Authorization: `Bearer ${token}` } });
            const profilesData = await profilesResponse.json();
            if (profilesData.success) setProfiles(profilesData.profiles);
        } catch (syncError) {
            setError(syncError.message);
        } finally {
            setSyncing('');
        }
    };

    return (
        <main className="analysis-shell">
            <nav className="home-nav" aria-label="Profile navigation">
                <Link className="brand-mark" to="/dashboard">career<span>signal</span></Link>
                <Link className="text-button" to="/dashboard">Back to dashboard</Link>
            </nav>
            <header className="analysis-header">
                <p className="eyebrow">Evidence sources</p>
                <h1>Connect the work behind your resume.</h1>
                <p>Sync public profile snapshots so job matches can distinguish claimed skills from demonstrated activity.</p>
            </header>
            {error && <p className="form-error" role="alert">{error}</p>}
            <section className="profile-grid">
                {providers.map((provider) => {
                    const profile = profiles.find((item) => item.provider === provider.id);
                    return (
                        <article className="profile-card" key={provider.id}>
                            <div className="profile-card-heading">
                                <div>
                                    <p className="eyebrow">{provider.id}</p>
                                    <h2>{provider.name}</h2>
                                </div>
                                <span className={`sync-status ${profile?.syncStatus || 'pending'}`}>{profile?.syncStatus || 'not connected'}</span>
                            </div>
                            <p>{provider.description}</p>
                            <div className="profile-sync-form">
                                <input value={usernames[provider.id] ?? profile?.username ?? ''} onChange={(event) => setUsernames({ ...usernames, [provider.id]: event.target.value })} placeholder={`${provider.name} username`} aria-label={`${provider.name} username`} />
                                <button className="primary-button" type="button" onClick={() => sync(provider.id)} disabled={syncing === provider.id}>{syncing === provider.id ? 'Syncing...' : 'Sync profile'}</button>
                            </div>
                            {profile?.syncStatus === 'ready' && <p className="profile-meta">Last synced {new Date(profile.lastSyncedAt).toLocaleDateString()}</p>}
                        </article>
                    );
                })}
            </section>
        </main>
    );
}
