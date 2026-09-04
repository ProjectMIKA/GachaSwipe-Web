import React, { useState, useEffect } from 'react';
import { getApiKey, setApiKey, useCardCount } from './db.js';
import { testConnection } from './aiClient.js';
import { supabase, isSupabaseConfigured } from './supabaseClient.js';

export function CloudVault({ isOpen, onClose }) {
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [isTestingKey, setIsTestingKey] = useState(false);
    const [testStatus, setTestStatus] = useState(null);
    const [user, setUser] = useState(null);
    const [authEmail, setAuthEmail] = useState('');
    const [authPassword, setAuthPassword] = useState('');
    const [authMode, setAuthMode] = useState('login');
    const [authLoading, setAuthLoading] = useState(false);
    const [authError, setAuthError] = useState('');

    const cardCount = useCardCount();
    const CLOUD_TIER_LIMIT = 200; // Web free tier storage quota

    useEffect(() => {
        getApiKey().then(k => { if (k) setApiKeyInput(k); });
        if (supabase) {
            supabase.auth.getUser().then(({ data }) => setUser(data?.user || null));
            const { data: listener } = supabase.auth.onAuthStateChange((_, session) => {
                setUser(session?.user || null);
            });
            return () => listener?.subscription?.unsubscribe();
        }
    }, []);

    const handleSaveKey = async () => {
        await setApiKey(apiKeyInput);
        setTestStatus({ type: 'success', text: 'BYOK key saved locally in Dexie!' });
    };

    const handleTestKey = async () => {
        setIsTestingKey(true);
        setTestStatus(null);
        try {
            await handleSaveKey();
            const res = await testConnection(apiKeyInput);
            setTestStatus({ type: 'success', text: res.message });
        } catch (err) {
            setTestStatus({ type: 'error', text: err.message });
        } finally {
            setIsTestingKey(false);
        }
    };

    const handleAuth = async (e) => {
        e.preventDefault();
        if (!supabase) return;
        setAuthLoading(true);
        setAuthError('');
        try {
            if (authMode === 'login') {
                const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.signUp({ email: authEmail, password: authPassword });
                if (error) throw error;
            }
        } catch (err) {
            setAuthError(err.message);
        } finally {
            setAuthLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            backgroundColor: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex', justifyContent: 'flex-end', transition: 'opacity 0.3s ease'
        }}>
            <div style={{
                width: '100%', maxWidth: '440px', height: '100%',
                background: 'linear-gradient(180deg, #130f24 0%, #090710 100%)',
                borderLeft: '1px solid rgba(255, 107, 181, 0.35)',
                padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '22px',
                boxShadow: '-12px 0 40px rgba(255, 107, 181, 0.2)', overflowY: 'auto',
                color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif'
            }}>
                {/* Drawer Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '24px' }}>⚡</span>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#ff77a9', letterSpacing: '0.04em' }}>
                                M.I.K.A. Cloud Vault
                            </h2>
                            <div style={{ fontSize: '0.75rem', color: '#a09ab8' }}>Web Companion Matrix Hub</div>
                        </div>
                    </div>
                    <button onClick={onClose} style={{
                        background: 'rgba(255,255,255,0.08)', border: 'none', color: '#aaa',
                        borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px'
                    }}>✕</button>
                </div>

                {/* Storage Quota Indicator */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.04)', borderRadius: '14px',
                    padding: '16px', border: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '8px' }}>
                        <span style={{ color: '#bbb' }}>Local Deck Storage</span>
                        <span style={{ color: cardCount >= CLOUD_TIER_LIMIT ? '#ff4d6d' : '#00f5d4', fontWeight: 700 }}>
                            {cardCount} / {CLOUD_TIER_LIMIT} Cards
                        </span>
                    </div>
                    <div style={{ height: '7px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                            height: '100%',
                            width: `${Math.min(100, (cardCount / CLOUD_TIER_LIMIT) * 100)}%`,
                            background: cardCount >= CLOUD_TIER_LIMIT ? '#ff4d6d' : 'linear-gradient(90deg, #ff77a9, #00f5d4)',
                            transition: 'width 0.4s ease'
                        }} />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#7a7590', marginTop: '6px' }}>
                        Offline-first IndexedDB cache. Unlimited card decks stored in your browser!
                    </div>
                </div>

                {/* BYOK AI Configuration */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.04)', borderRadius: '14px',
                    padding: '16px', border: '1px solid rgba(255, 119, 169, 0.25)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <span>🔑</span>
                        <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#ffb3c6' }}>NanoGPT BYOK Key</h3>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#aaa', margin: '0 0 10px 0' }}>
                        Bring Your Own Key for zero-latency card persona & image synthesis.
                    </p>
                    <input
                        type="password"
                        placeholder="nano-gpt-..."
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        style={{
                            width: '100%', padding: '10px 12px', borderRadius: '8px',
                            background: 'rgba(0, 0, 0, 0.45)', border: '1px solid rgba(255, 255, 255, 0.15)',
                            color: '#fff', fontSize: '0.9rem', marginBottom: '10px', boxSizing: 'border-box'
                        }}
                    />
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={handleTestKey}
                            disabled={isTestingKey || !apiKeyInput}
                            style={{
                                flex: 1, padding: '10px', borderRadius: '8px', border: 'none',
                                background: 'linear-gradient(135deg, #ff77a9, #a370f7)',
                                color: '#fff', fontWeight: 600, cursor: isTestingKey ? 'wait' : 'pointer',
                                opacity: (!apiKeyInput || isTestingKey) ? 0.6 : 1
                            }}
                        >
                            {isTestingKey ? 'Pinging Matrix...' : 'Test Connection'}
                        </button>
                    </div>
                    {testStatus && (
                        <div style={{
                            marginTop: '10px', padding: '8px 12px', borderRadius: '6px', fontSize: '0.82rem',
                            background: testStatus.type === 'success' ? 'rgba(0, 245, 212, 0.1)' : 'rgba(255, 77, 109, 0.1)',
                            border: `1px solid ${testStatus.type === 'success' ? 'rgba(0, 245, 212, 0.3)' : 'rgba(255, 77, 109, 0.3)'}`,
                            color: testStatus.type === 'success' ? '#00f5d4' : '#ff4d6d'
                        }}>
                            {testStatus.text}
                        </div>
                    )}
                </div>

                {/* Supabase Cloud Sync Section */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.04)', borderRadius: '14px',
                    padding: '16px', border: '1px solid rgba(255, 255, 255, 0.08)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                        <span>☁️</span>
                        <h3 style={{ margin: 0, fontSize: '0.95rem', color: '#a370f7' }}>Cloud Sync & Account</h3>
                    </div>
                    {!isSupabaseConfigured ? (
                        <div style={{ fontSize: '0.82rem', color: '#999', lineHeight: 1.5 }}>
                            <p style={{ margin: '0 0 6px 0' }}>Supabase credentials not configured in <code style={{ color: '#ff77a9' }}>.env</code>.</p>
                            <span style={{ color: '#00f5d4' }}>● Local Offline Mode Active</span> — All your card pulls and audio will be saved directly into IndexedDB!
                        </div>
                    ) : user ? (
                        <div>
                            <p style={{ fontSize: '0.85rem', color: '#aaa', margin: '0 0 12px 0' }}>
                                Cloud Operator: <strong style={{ color: '#fff' }}>{user.email}</strong>
                            </p>
                            <button
                                onClick={() => supabase.auth.signOut()}
                                style={{
                                    padding: '8px 14px', borderRadius: '6px', border: '1px solid #ff4d6d',
                                    background: 'transparent', color: '#ff4d6d', cursor: 'pointer', fontWeight: 600
                                }}
                            >
                                Sign Out
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <input
                                type="email" placeholder="Operator Email" value={authEmail}
                                onChange={e => setAuthEmail(e.target.value)} required
                                style={{
                                    padding: '9px 12px', borderRadius: '6px', background: 'rgba(0,0,0,0.4)',
                                    border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.85rem'
                                }}
                            />
                            <input
                                type="password" placeholder="Password" value={authPassword}
                                onChange={e => setAuthPassword(e.target.value)} required
                                style={{
                                    padding: '9px 12px', borderRadius: '6px', background: 'rgba(0,0,0,0.4)',
                                    border: '1px solid rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.85rem'
                                }}
                            />
                            {authError && <div style={{ color: '#ff4d6d', fontSize: '0.8rem' }}>{authError}</div>}
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    type="submit" disabled={authLoading}
                                    style={{
                                        flex: 1, padding: '9px', borderRadius: '6px', border: 'none',
                                        background: 'linear-gradient(135deg, #a370f7, #6e40c9)',
                                        color: '#fff', fontWeight: 600, cursor: 'pointer'
                                    }}
                                >
                                    {authLoading ? 'Verifying...' : (authMode === 'login' ? 'Sign In' : 'Create Account')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAuthMode(m => m === 'login' ? 'signup' : 'login')}
                                    style={{
                                        padding: '9px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)',
                                        background: 'transparent', color: '#aaa', cursor: 'pointer', fontSize: '0.82rem'
                                    }}
                                >
                                    {authMode === 'login' ? 'Register' : 'Login'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
