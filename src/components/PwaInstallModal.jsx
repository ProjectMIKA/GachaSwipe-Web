import React, { useState, useEffect } from 'react';

export const PwaInstallModal = ({ isOpen, onClose, deferredPrompt, onInstalled }) => {
    const [isIos, setIsIos] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && typeof navigator !== 'undefined') {
            const userAgent = navigator.userAgent || navigator.vendor || window.opera;
            const isIosDevice = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;
            setIsIos(isIosDevice);
        }
    }, []);

    if (!isOpen) return null;

    const handleInstallClick = async () => {
        if (!deferredPrompt) {
            // If no native prompt event, show instructions
            return;
        }

        setIsInstalling(true);
        try {
            deferredPrompt.prompt();
            const choiceResult = await deferredPrompt.userChoice;
            if (choiceResult?.outcome === 'accepted') {
                if (onInstalled) onInstalled();
                onClose(true);
            }
        } catch (err) {
            console.warn('[PWA] Install prompt error:', err);
        } finally {
            setIsInstalling(false);
        }
    };

    const handleDismiss = () => {
        onClose(true); // true = mark as dismissed in localStorage
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(5, 3, 8, 0.85)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 99999,
                padding: '20px',
                animation: 'fadeIn 0.25s ease-out'
            }}
            onClick={handleDismiss}
        >
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    maxWidth: '420px',
                    background: 'linear-gradient(160deg, #150d22 0%, #08040f 100%)',
                    border: '1px solid rgba(0, 229, 255, 0.4)',
                    boxShadow: '0 0 30px rgba(0, 229, 255, 0.25), inset 0 0 20px rgba(255, 16, 122, 0.1)',
                    borderRadius: '16px',
                    padding: '28px 24px',
                    color: '#EBE3D6',
                    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    onClick={handleDismiss}
                    style={{
                        position: 'absolute',
                        top: '14px',
                        right: '14px',
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(235, 227, 214, 0.6)',
                        cursor: 'pointer',
                        fontSize: '18px',
                        lineHeight: '1',
                        padding: '6px'
                    }}
                    title="Dismiss"
                >
                    ✕
                </button>

                {/* App Icon with Cyber Glow */}
                <div
                    style={{
                        width: '84px',
                        height: '84px',
                        borderRadius: '20px',
                        overflow: 'hidden',
                        marginBottom: '18px',
                        boxShadow: '0 0 20px rgba(0, 229, 255, 0.4), 0 0 35px rgba(255, 16, 122, 0.25)',
                        border: '2px solid #00E5FF'
                    }}
                >
                    <img
                        src="/icon.svg"
                        alt="GachaSwipe App Icon"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                </div>

                {/* Cyberpunk Title */}
                <div
                    style={{
                        fontSize: '10px',
                        letterSpacing: '0.25em',
                        color: '#FF107A',
                        textTransform: 'uppercase',
                        fontWeight: '800',
                        marginBottom: '6px'
                    }}
                >
                    &gt; NEURAL_APP_PROTOCOL
                </div>
                <h3
                    style={{
                        margin: '0 0 10px 0',
                        fontSize: '20px',
                        fontWeight: '800',
                        color: '#00E5FF',
                        letterSpacing: '0.05em',
                        textShadow: '0 0 12px rgba(0, 229, 255, 0.4)'
                    }}
                >
                    INSTALL GACHASWIPE
                </h3>

                <p
                    style={{
                        fontSize: '12px',
                        lineHeight: '1.6',
                        color: 'rgba(235, 227, 214, 0.8)',
                        margin: '0 0 20px 0',
                        maxWidth: '340px'
                    }}
                >
                    Add GachaSwipe to your home screen for full-screen matrix immersion, instant launches, and zero browser bars!
                </p>

                {/* Instructions for iOS vs Direct Install for Android/Desktop */}
                {isIos ? (
                    <div
                        style={{
                            width: '100%',
                            background: 'rgba(0, 229, 255, 0.06)',
                            border: '1px solid rgba(0, 229, 255, 0.25)',
                            borderRadius: '10px',
                            padding: '14px',
                            fontSize: '11px',
                            lineHeight: '1.6',
                            textAlign: 'left',
                            marginBottom: '20px',
                            color: '#EBE3D6'
                        }}
                    >
                        <div style={{ color: '#00E5FF', fontWeight: 'bold', marginBottom: '6px' }}>
                            📱 iOS Safari Install Steps:
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span>1. Tap Safari's</span>
                            <span style={{ color: '#00E5FF', fontWeight: 'bold', background: 'rgba(0,229,255,0.15)', padding: '2px 6px', borderRadius: '4px' }}>Share [ ⎋ ]</span>
                            <span>button below</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>2. Scroll down & select</span>
                            <span style={{ color: '#FF107A', fontWeight: 'bold', background: 'rgba(255,16,122,0.15)', padding: '2px 6px', borderRadius: '4px' }}>Add to Home Screen [ ⊞ ]</span>
                        </div>
                    </div>
                ) : (
                    deferredPrompt && (
                        <button
                            onClick={handleInstallClick}
                            disabled={isInstalling}
                            style={{
                                width: '100%',
                                padding: '14px',
                                borderRadius: '6px',
                                border: '1px solid #00E5FF',
                                background: 'linear-gradient(90deg, rgba(0, 229, 255, 0.2) 0%, rgba(255, 16, 122, 0.2) 100%)',
                                color: '#00E5FF',
                                fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                                fontSize: '13px',
                                fontWeight: 'bold',
                                letterSpacing: '0.1em',
                                cursor: isInstalling ? 'wait' : 'pointer',
                                boxShadow: '0 0 15px rgba(0, 229, 255, 0.3)',
                                marginBottom: '10px',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {isInstalling ? '&gt; CONNECTING_MATRIX...' : '&gt; INSTALL_WEB_APP'}
                        </button>
                    )
                )}

                {/* Secondary Dismiss Button */}
                <button
                    onClick={handleDismiss}
                    style={{
                        width: '100%',
                        padding: '10px',
                        background: 'transparent',
                        border: '1px solid rgba(235, 227, 214, 0.2)',
                        borderRadius: '6px',
                        color: 'rgba(235, 227, 214, 0.7)',
                        fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                        fontSize: '11px',
                        cursor: 'pointer',
                        letterSpacing: '0.08em',
                        transition: 'border-color 0.2s, color 0.2s'
                    }}
                >
                    [ MAYBE LATER ]
                </button>
            </div>
        </div>
    );
};
