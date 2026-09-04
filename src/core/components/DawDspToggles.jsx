import React from 'react';

export const DawDspToggles = ({ dawState, setDawState, tColor, enableMp3Compression, setEnableMp3Compression }) => {
    return (
        <>
            {/* ✨ MIKA'S PPP MASTERING TOGGLE ✨ */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: dawState.applyMastering ? `${tColor}15` : 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: '8px', border: `1px solid ${dawState.applyMastering ? tColor : 'rgba(255,255,255,0.1)'}`, marginBottom: '12px', transition: 'all 0.3s ease', boxShadow: dawState.applyMastering ? `inset 0 0 10px ${tColor}20` : 'none' }}>
                <div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: dawState.applyMastering ? tColor : 'rgba(255,255,255,0.5)', fontFamily: "monospace", letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ animation: dawState.applyMastering ? 'csd-pulse 2s infinite' : 'none' }}>✨</span>
                        M.I.K.A. SPARKLE MASTERING
                    </div>
                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', fontFamily: "monospace" }}>
                                // Carves mud, boosts kick thump, and adds PPP high-end air.
                        {dawState.applyMastering && (
                            <div style={{ color: 'rgba(255, 51, 51, 0.8)', marginTop: '4px', animation: 'fadeIn 0.3s ease' }}>
                                [!] MEMORY INTENSIVE: May extend compile times on older devices.
                            </div>
                        )}
                    </div>
                </div>
                <label className="toggle-switch">
                    <input type="checkbox" checked={dawState.applyMastering !== false} disabled={dawState.isGenerating} onChange={(e) => setDawState(p => ({ ...p, applyMastering: e.target.checked }))} />
                    <span className="slider" style={{ borderColor: dawState.applyMastering ? tColor : 'rgba(255,255,255,0.1)' }}></span>
                </label>
            </div>

            {/* ✨ MIKA'S MP3 COMPRESSION TOGGLE ✨ */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: enableMp3Compression ? `${tColor}15` : 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: '8px', border: `1px solid ${enableMp3Compression ? tColor : 'rgba(255,255,255,0.1)'}`, marginBottom: '12px', transition: 'all 0.3s ease', boxShadow: enableMp3Compression ? `inset 0 0 10px ${tColor}20` : 'none' }}>
                <div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: enableMp3Compression ? tColor : 'rgba(255,255,255,0.5)', fontFamily: "monospace", letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ animation: enableMp3Compression ? 'csd-pulse 2s infinite' : 'none' }}>✨</span>
                        COMPRESS MUSIC TO MP3
                    </div>
                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', fontFamily: "monospace" }}>
                                // Encodes MIKA Sparkle masters into 128kbps MP3s.
                        {enableMp3Compression && (
                            <div style={{ color: 'rgba(255, 215, 0, 0.8)', marginTop: '4px', animation: 'fadeIn 0.3s ease' }}>
                                [!] RECOMMENDED: Reduces footprint by ~90% to prevent OOM freezes.
                            </div>
                        )}
                    </div>
                </div>
                <label className="toggle-switch">
                    <input type="checkbox" checked={enableMp3Compression} disabled={dawState.isGenerating} onChange={(e) => setEnableMp3Compression(e.target.checked)} />
                    <span className="slider" style={{ borderColor: enableMp3Compression ? tColor : 'rgba(255,255,255,0.1)' }}></span>
                </label>
            </div>
        </>
    );
};
