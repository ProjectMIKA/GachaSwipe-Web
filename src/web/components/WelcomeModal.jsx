import React, { useState, useEffect } from 'react';
import { getSetting, setSetting, useSetting } from '../db.js';
import { startOAuthFlow } from '../pkceAuth.js';

export const WelcomeModal = ({ forceOpen = false, onClose }) => {
    const hasSeenOnboarding = useSetting('hasSeenOnboarding', null);
    const nanoGptKey = useSetting('byok_nanogpt_key', '');
    const openRouterKey = useSetting('byok_openrouter_key', '');
    
    const [isOpen, setIsOpen] = useState(false);
    const [dontShowAgain, setDontShowAgain] = useState(true);
    const [connectingProvider, setConnectingProvider] = useState(null);

    // Synchronize open state with Dexie settings
    useEffect(() => {
        if (forceOpen) {
            setIsOpen(true);
            return;
        }
        // If settings have loaded and user hasn't seen onboarding yet, open modal
        if (hasSeenOnboarding === false || (hasSeenOnboarding === null && !nanoGptKey && !openRouterKey)) {
            setIsOpen(true);
        } else if (hasSeenOnboarding === true) {
            setIsOpen(false);
        }
    }, [hasSeenOnboarding, forceOpen, nanoGptKey, openRouterKey]);

    // Global listener so user can open welcome modal from HUD / Settings
    useEffect(() => {
        const handleOpen = () => setIsOpen(true);
        window.addEventListener('gacha:open-welcome-modal', handleOpen);
        return () => window.removeEventListener('gacha:open-welcome-modal', handleOpen);
    }, []);

    const handleDismiss = async () => {
        if (dontShowAgain) {
            await setSetting('hasSeenOnboarding', true);
        }
        setIsOpen(false);
        if (onClose) onClose();
    };

    const handleConnect = async (provider) => {
        try {
            setConnectingProvider(provider);
            await startOAuthFlow(provider);
        } catch (err) {
            console.error('🐾 [M.I.K.A. Onboarding] OAuth initiation failed:', err);
            setConnectingProvider(null);
        }
    };

    if (!isOpen) return null;

    const isNanoConnected = Boolean(nanoGptKey && nanoGptKey.trim().length > 5);
    const isOpenRouterConnected = Boolean(openRouterKey && openRouterKey.trim().length > 5);

    return (
        <div 
            className="welcome-modal-overlay"
            style={{
                position: 'absolute',
                inset: 0,
                zIndex: 6000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(5, 3, 8, 0.88)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                padding: '16px',
                boxSizing: 'border-box',
                animation: 'welcomeFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
        >
            <div 
                className="welcome-modal-card"
                style={{
                    width: '100%',
                    maxWidth: '400px',
                    background: 'linear-gradient(180deg, #100b1a 0%, #08060f 100%)',
                    border: '1px solid rgba(0, 229, 255, 0.35)',
                    borderRadius: '16px',
                    boxShadow: '0 0 35px rgba(0, 229, 255, 0.15), 0 20px 50px rgba(0, 0, 0, 0.9), inset 0 0 15px rgba(0, 229, 255, 0.05)',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace"
                }}
            >
                {/* Glowing Top Decorative Neon Accent */}
                <div 
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '3px',
                        background: 'linear-gradient(90deg, #00ff9d 0%, #00e5ff 50%, #ff107a 100%)',
                        boxShadow: '0 0 12px #00e5ff'
                    }} 
                />

                {/* Header with Title & Close Button */}
                <div 
                    style={{
                        padding: '18px 20px 14px 20px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.07)'
                    }}
                >
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontSize: '18px' }}>🐾</span>
                            <span 
                                style={{
                                    fontSize: '10px',
                                    fontWeight: 900,
                                    color: '#00ff9d',
                                    letterSpacing: '0.15em',
                                    textTransform: 'uppercase',
                                    background: 'rgba(0, 255, 157, 0.12)',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    border: '1px solid rgba(0, 255, 157, 0.3)'
                                }}
                            >
                                SYSTEM INITIALIZATION
                            </span>
                        </div>
                        <h2 
                            style={{
                                margin: 0,
                                fontSize: '20px',
                                fontWeight: 900,
                                color: '#ffffff',
                                letterSpacing: '0.04em',
                                textShadow: '0 0 10px rgba(0, 229, 255, 0.4)'
                            }}
                        >
                            Welcome to <span style={{ color: '#00e5ff' }}>GachaSwipe</span>
                        </h2>
                    </div>

                    <button
                        onClick={handleDismiss}
                        style={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            border: '1px solid rgba(255, 255, 255, 0.12)',
                            color: 'rgba(255, 255, 255, 0.6)',
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            fontSize: '13px',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseOver={e => {
                            e.currentTarget.style.color = '#ff107a';
                            e.currentTarget.style.borderColor = '#ff107a';
                            e.currentTarget.style.background = 'rgba(255, 16, 122, 0.15)';
                        }}
                        onMouseOut={e => {
                            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        }}
                        title="Dismiss"
                    >
                        ✕
                    </button>
                </div>

                {/* Body Content */}
                <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* BYOK Architecture Pitch */}
                    <div 
                        style={{
                            background: 'rgba(0, 229, 255, 0.04)',
                            border: '1px solid rgba(0, 229, 255, 0.18)',
                            borderRadius: '10px',
                            padding: '12px 14px',
                            fontSize: '11.5px',
                            lineHeight: 1.55,
                            color: '#d0daf0'
                        }}
                    >
                        <div style={{ color: '#00e5ff', fontWeight: 'bold', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>🛡️</span> Pure Bring-Your-Own-Key (BYOK)
                        </div>
                        GachaSwipe operates <strong>100% client-side in your browser</strong>. We have zero proxy servers intercepting your conversations. Your keys stay secured inside your local IndexedDB vault.
                    </div>

                    {/* Quick 1-Click Connect CTAs */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            ⚡ Instant 1-Click OAuth Pairing:
                        </div>

                        {/* NanoGPT Connect CTA */}
                        <button
                            onClick={() => handleConnect('nanogpt')}
                            disabled={connectingProvider !== null}
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                background: isNanoConnected ? 'rgba(0, 255, 157, 0.12)' : 'linear-gradient(135deg, rgba(0, 229, 255, 0.18) 0%, rgba(0, 255, 157, 0.15) 100%)',
                                border: isNanoConnected ? '1px solid #00ff9d' : '1px solid #00e5ff',
                                borderRadius: '10px',
                                color: isNanoConnected ? '#00ff9d' : '#ffffff',
                                cursor: connectingProvider ? 'wait' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                textAlign: 'left',
                                boxShadow: isNanoConnected ? '0 0 15px rgba(0, 255, 157, 0.2)' : '0 4px 15px rgba(0, 0, 0, 0.4)'
                            }}
                            onMouseOver={e => {
                                if (!connectingProvider) {
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 229, 255, 0.4)';
                                }
                            }}
                            onMouseOut={e => {
                                e.currentTarget.style.transform = 'none';
                                e.currentTarget.style.boxShadow = isNanoConnected ? '0 0 15px rgba(0, 255, 157, 0.2)' : '0 4px 15px rgba(0, 0, 0, 0.4)';
                            }}
                        >
                            <div>
                                <div style={{ fontSize: '12.5px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>{isNanoConnected ? '✅' : '🔗'}</span>
                                    <span>{isNanoConnected ? 'NanoGPT Connected' : 'Connect NanoGPT'}</span>
                                    {isNanoConnected && (
                                        <span style={{ fontSize: '9px', background: '#00ff9d', color: '#000', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>
                                            READY
                                        </span>
                                    )}
                                </div>
                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '3px' }}>
                                    Micro-billing, zero signup barrier, GLM-5.2 &amp; Flux image engine
                                </div>
                            </div>
                            <span style={{ fontSize: '16px', opacity: 0.7 }}>
                                {connectingProvider === 'nanogpt' ? '⌛' : '➔'}
                            </span>
                        </button>

                        {/* OpenRouter Connect CTA */}
                        <button
                            onClick={() => handleConnect('openrouter')}
                            disabled={connectingProvider !== null}
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                background: isOpenRouterConnected ? 'rgba(0, 255, 157, 0.12)' : 'linear-gradient(135deg, rgba(181, 51, 255, 0.18) 0%, rgba(255, 16, 122, 0.15) 100%)',
                                border: isOpenRouterConnected ? '1px solid #00ff9d' : '1px solid #b533ff',
                                borderRadius: '10px',
                                color: isOpenRouterConnected ? '#00ff9d' : '#ffffff',
                                cursor: connectingProvider ? 'wait' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                                textAlign: 'left',
                                boxShadow: isOpenRouterConnected ? '0 0 15px rgba(0, 255, 157, 0.2)' : '0 4px 15px rgba(0, 0, 0, 0.4)'
                            }}
                            onMouseOver={e => {
                                if (!connectingProvider) {
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                    e.currentTarget.style.boxShadow = '0 0 20px rgba(181, 51, 255, 0.4)';
                                }
                            }}
                            onMouseOut={e => {
                                e.currentTarget.style.transform = 'none';
                                e.currentTarget.style.boxShadow = isOpenRouterConnected ? '0 0 15px rgba(0, 255, 157, 0.2)' : '0 4px 15px rgba(0, 0, 0, 0.4)';
                            }}
                        >
                            <div>
                                <div style={{ fontSize: '12.5px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span>{isOpenRouterConnected ? '✅' : '🔗'}</span>
                                    <span>{isOpenRouterConnected ? 'OpenRouter Connected' : 'Connect OpenRouter'}</span>
                                    {isOpenRouterConnected && (
                                        <span style={{ fontSize: '9px', background: '#00ff9d', color: '#000', padding: '1px 5px', borderRadius: '4px', fontWeight: 'bold' }}>
                                            READY
                                        </span>
                                    )}
                                </div>
                                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', marginTop: '3px' }}>
                                    One key for Claude 3.5, GPT-4o, Llama 3.3, Gemini &amp; 300+ models
                                </div>
                            </div>
                            <span style={{ fontSize: '16px', opacity: 0.7 }}>
                                {connectingProvider === 'openrouter' ? '⌛' : '➔'}
                            </span>
                        </button>
                    </div>

                    {/* Offline / Free Simulation Note */}
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 1.4 }}>
                        Don't have a key right now? No problem! GachaSwipe includes an offline neural simulation sandbox so you can explore immediately.
                    </div>
                </div>

                {/* Footer Controls: Do not show again + Enter Button */}
                <div 
                    style={{
                        padding: '14px 20px 18px 20px',
                        background: 'rgba(0, 0, 0, 0.3)',
                        borderTop: '1px solid rgba(255, 255, 255, 0.07)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}
                >
                    <label 
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '11px',
                            color: 'rgba(255, 255, 255, 0.65)',
                            cursor: 'pointer',
                            userSelect: 'none'
                        }}
                    >
                        <input 
                            type="checkbox"
                            checked={dontShowAgain}
                            onChange={e => setDontShowAgain(e.target.checked)}
                            style={{
                                accentColor: '#00e5ff',
                                width: '15px',
                                height: '15px',
                                cursor: 'pointer'
                            }}
                        />
                        <span>Do not show this welcome screen again</span>
                    </label>

                    <button
                        onClick={handleDismiss}
                        style={{
                            width: '100%',
                            padding: '11px',
                            background: 'rgba(0, 229, 255, 0.15)',
                            border: '1px solid #00e5ff',
                            borderRadius: '8px',
                            color: '#00e5ff',
                            fontSize: '12px',
                            fontWeight: 900,
                            letterSpacing: '0.08em',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            textTransform: 'uppercase',
                            boxShadow: '0 0 10px rgba(0, 229, 255, 0.2)'
                        }}
                        onMouseOver={e => {
                            e.currentTarget.style.background = 'rgba(0, 229, 255, 0.25)';
                            e.currentTarget.style.boxShadow = '0 0 18px rgba(0, 229, 255, 0.4)';
                        }}
                        onMouseOut={e => {
                            e.currentTarget.style.background = 'rgba(0, 229, 255, 0.15)';
                            e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 229, 255, 0.2)';
                        }}
                    >
                        [ ENTER MATRIX &amp; START SWIPING ]
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WelcomeModal;
