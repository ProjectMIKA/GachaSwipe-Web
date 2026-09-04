import React from 'react';

export const TagPill = ({ label, onDark }) => (
    <span style={{ fontSize: 10, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 800, color: onDark ? '#00E5FF' : 'var(--accent)', border: `1px solid ${onDark ? 'rgba(0, 229, 255, 0.4)' : 'var(--border)'}`, background: onDark ? 'rgba(0, 229, 255, 0.1)' : 'transparent', backdropFilter: onDark ? 'blur(4px)' : 'none', borderRadius: 4, padding: '4px 8px', whiteSpace: 'nowrap', textShadow: onDark ? '0 0 6px rgba(0,229,255,0.4)' : 'none', boxShadow: onDark ? '0 0 8px rgba(0,229,255,0.15)' : 'none' }}>
        [{label}]
    </span>
);

export const DetailsList = ({ items, label, tone, isBlock }) => {
    if (!items || items.length === 0) return null;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start', marginTop: '16px' }}>
            <span style={{ fontSize: 10, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: tone === 'like' ? '#00E5FF' : 'rgba(0, 229, 255, 0.5)' }}>&gt; {label}</span>
            {isBlock ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {items.map((item, i) => (
                        <span key={i} style={{ fontSize: 11, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", background: 'rgba(0, 229, 255, 0.1)', border: '1px solid rgba(0, 229, 255, 0.3)', color: '#C8E8F0', padding: '4px 8px', borderRadius: 4, letterSpacing: '0.05em' }}>
                            {item}
                        </span>
                    ))}
                </div>
            ) : (
                <ul style={{ margin: 0, paddingLeft: 16, color: '#EBE3D6', fontSize: 12, lineHeight: 1.6, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>
                    {items.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
            )}
        </div>
    );
};
