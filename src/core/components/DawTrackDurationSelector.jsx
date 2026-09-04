import React from 'react';

export const DawTrackDurationSelector = ({ dawState, setDawState, tColor }) => {
    return (
        <div style={{ background: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: '8px', border: `1px solid ${tColor}40`, boxShadow: `inset 0 0 10px ${tColor}10` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: tColor, fontFamily: "monospace", letterSpacing: '0.05em' }}>&gt; TRACK_DURATION [{dawState.isSmartLength ? 'AUTO' : `${dawState.duration}s`}]</div>
                <button
                    onClick={() => setDawState(p => ({ ...p, isSmartLength: !p.isSmartLength }))}
                    style={{ background: dawState.isSmartLength ? `${tColor}25` : 'transparent', border: dawState.isSmartLength ? `1px solid ${tColor}` : `1px dashed ${tColor}60`, color: tColor, padding: '4px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold', fontFamily: "monospace", letterSpacing: '0.05em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: dawState.isSmartLength ? `0 0 12px ${tColor}40` : 'none', transition: 'all 0.2s' }}
                >
                    <span style={{ animation: dawState.isSmartLength ? 'csd-pulse 2s infinite' : 'none', filter: dawState.isSmartLength ? 'grayscale(0)' : 'grayscale(100%)' }}>🧠</span> SMART_LENGTH
                </button>
            </div>
            <div style={{ position: 'relative' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', width: '100%', marginBottom: '12px', opacity: dawState.isSmartLength ? 0.3 : 1, transition: 'opacity 0.3s' }}>
                    {[30, 60, 90, 120, 150, 180, 210, 240].map(sec => {
                        const closestBtn = [30, 60, 90, 120, 150, 180, 210, 240].reduce((prev, curr) => Math.abs(curr - (dawState.duration || 60)) < Math.abs(prev - (dawState.duration || 60)) ? curr : prev);
                        const isSel = sec === closestBtn && !dawState.isSmartLength;
                        return (
                            <button key={'dur_' + sec} disabled={dawState.isGenerating || dawState.isSmartLength} onClick={() => setDawState(p => ({ ...p, duration: sec, isSmartLength: false }))} style={{ padding: '8px 2px', borderRadius: '4px', fontFamily: "monospace", fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.03em', transition: 'all 0.2s', margin: 0, borderColor: isSel ? tColor : `${tColor}30`, color: isSel ? '#000' : `${tColor}80`, background: isSel ? tColor : 'transparent', boxShadow: isSel ? `0 0 10px ${tColor}60` : 'none', cursor: dawState.isGenerating || dawState.isSmartLength ? 'default' : 'pointer', border: '1px solid' }}>{sec}s</button>
                        );
                    })}
                </div>
                
                {/* ✨ CUSTOM DURATION SLIDER ✨ */}
                <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${tColor}30`, borderRadius: '8px', boxShadow: `inset 0 0 10px rgba(0,0,0,0.5)`, opacity: dawState.isSmartLength ? 0.3 : 1, transition: 'opacity 0.3s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '10px', color: tColor, fontWeight: 'bold', fontFamily: "monospace", letterSpacing: '0.05em' }}>CUSTOM SECONDS</span>
                        <span style={{ fontSize: '12px', color: '#fff', fontWeight: 'bold', textShadow: `0 0 8px ${tColor}` }}>{dawState.duration || 60}s</span>
                    </div>
                    <input type="range" min="15" max="480" step="5" value={dawState.duration || 60} onChange={e => {
                        const newDur = parseInt(e.target.value, 10);
                        setDawState(p => ({ ...p, duration: newDur, isSmartLength: false }));
                    }} style={{ width: '100%', accentColor: tColor, cursor: dawState.isGenerating || dawState.isSmartLength ? 'default' : 'pointer', height: '6px' }} disabled={dawState.isGenerating || dawState.isSmartLength} />
                </div>

                {dawState.isSmartLength && (
                    <div style={{ position: 'absolute', inset: '-10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,3,8,0.5)', backdropFilter: 'blur(2px)', zIndex: 10, borderRadius: '8px' }}>
                        <span style={{ color: tColor, fontSize: '11px', fontWeight: 'bold', animation: 'csd-pulse 2s infinite', letterSpacing: '0.1em', textShadow: `0 0 8px ${tColor}80` }}>&gt; ADAPTING_TO_LYRIC_FLOW...</span>
                    </div>
                )}
            </div>
        </div>
    );
};
