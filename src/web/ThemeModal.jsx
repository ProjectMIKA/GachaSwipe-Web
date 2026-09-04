import React from 'react';

const THEMES = [
    { id: 'default', label: 'ANIME TROPES', desc: 'Classic Tsundere, Yandere, Kuudere, and Gyaru archetypes', icon: '💖' },
    { id: 'scifi', label: 'CYBERPUNK MATRIX', desc: 'Netrunners, android engineers, AI proxies, and neon outlaws', icon: '⚡' },
    { id: 'fantasy', label: 'FANTASY REALM', desc: 'Elven mages, demon princesses, sky valkyries, and knights', icon: '🗡️' },
    { id: 'horror', label: 'OBSESSIVE YANDERE', desc: 'Fiercely possessive stalkers, dark spirits, and gothic vampires', icon: '🩸' },
    { id: 'idol', label: 'CYBER IDOLS', desc: 'J-Pop center divas, VTuber stars, and breakcore producers', icon: '🎤' },
    { id: 'mecha', label: 'TACTICAL MECHA', desc: 'Combat gynoids, mech pilots, and orbital drop defenders', icon: '🤖' }
];

export function ThemeModal({ isOpen, onClose, selectedTheme, onSelectTheme }) {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            backgroundColor: 'rgba(5, 3, 10, 0.85)', backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)', display: 'flex', justifyContent: 'center', alignItems: 'center',
            padding: '16px'
        }}>
            <div style={{
                width: '100%', maxWidth: '480px', maxHeight: '80vh',
                background: 'linear-gradient(180deg, #130d24 0%, #080511 100%)',
                border: '1px solid rgba(0, 229, 255, 0.3)', borderRadius: '20px',
                boxShadow: '0 0 45px rgba(0, 229, 255, 0.2)', padding: '24px',
                display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto',
                fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace"
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '20px' }}>🎯</span>
                        <h2 style={{ margin: 0, fontSize: '15px', color: '#00E5FF', letterSpacing: '0.05em' }}>
                            &gt; SELECT_TARGET_MATRIX
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent', border: 'none', color: '#aaa',
                            fontSize: '20px', cursor: 'pointer', padding: '4px'
                        }}
                    >
                        ✕
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {THEMES.map(t => {
                        const isSelected = selectedTheme === t.id;
                        return (
                            <div
                                key={t.id}
                                onClick={() => { onSelectTheme(t.id); onClose(); }}
                                style={{
                                    padding: '14px 18px', borderRadius: '12px',
                                    background: isSelected ? 'rgba(0, 229, 255, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                                    border: `1px solid ${isSelected ? '#00E5FF' : 'rgba(255, 255, 255, 0.08)'}`,
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px',
                                    boxShadow: isSelected ? '0 0 15px rgba(0, 229, 255, 0.2)' : 'none',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <span style={{ fontSize: '24px' }}>{t.icon}</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ color: isSelected ? '#00E5FF' : '#fff', fontWeight: 800, fontSize: '13px' }}>
                                        {t.label}
                                    </div>
                                    <div style={{ color: '#888', fontSize: '11px', marginTop: '2px' }}>
                                        {t.desc}
                                    </div>
                                </div>
                                {isSelected && <span style={{ color: '#00E5FF', fontSize: '16px' }}>●</span>}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
