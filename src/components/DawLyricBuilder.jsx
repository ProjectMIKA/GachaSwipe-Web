import React from 'react';

export const DawLyricBuilder = ({
    dawState,
    setDawState,
    tColor,
    restoreLyricsDefaults,
    handleMikaGenerateLyrics,
    updateStructLyric,
    handleAiRewriteLyric
}) => {
    const lyricView = dawState.lyricView || (dawState.isStructuredLyrics === false ? 'raw' : 'builder');

    return (
        <div style={{ background: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: '8px', border: `1px solid ${tColor}40`, boxShadow: `inset 0 0 10px ${tColor}10`, marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: tColor, fontFamily: "monospace", letterSpacing: '0.05em' }}>&gt; STRUCTURED_LYRICS</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={restoreLyricsDefaults} style={{ background: 'transparent', border: `1px dashed ${tColor}60`, color: tColor, padding: '4px 8px', borderRadius: '4px', fontSize: '9px', cursor: 'pointer', fontFamily: "monospace", fontWeight: 'bold', transition: 'all 0.2s' }}>RESTORE</button>
                    <button onClick={() => setDawState(p => ({ ...p, lyricView: lyricView === 'mika' ? 'builder' : 'mika' }))} style={{ background: lyricView === 'mika' ? `${tColor}20` : 'transparent', border: `1px solid ${tColor}`, color: tColor, padding: '4px 8px', borderRadius: '4px', fontSize: '9px', cursor: 'pointer', fontFamily: "monospace", fontWeight: 'bold', transition: 'all 0.2s', boxShadow: lyricView === 'mika' ? `0 0 8px ${tColor}40` : 'none', display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ animation: 'csd-pulse 2s infinite' }}>✨</span> M.I.K.A.</button>
                    <button onClick={() => setDawState(p => {
                        if (lyricView === 'builder' || lyricView === 'mika') {
                            const raw = (p.structuredLyrics || []).map(b => {
                                const t = (b.type || 'VERSE').toUpperCase();
                                const instStr = b.instruction ? `: ${b.instruction}` : '';
                                return `[${t}${instStr}]\n${b.text || ''}`;
                            }).join('\n\n');
                            return { ...p, lyricView: 'raw', lyrics: raw };
                        }
                        // ✨ MIKA'S SUPER SMART FOLDING PARSER ✨
                        const blocks = [];
                        const sections = (p.lyrics || '').split(/(?=\[.*?\])/g);
                        const validTypes = ['INTRO', 'VERSE', 'PRE-CHORUS', 'CHORUS', 'DROP', 'BRIDGE', 'OUTRO', 'SOLO', 'INSTRUMENTAL BREAK', 'GUITAR SOLO'];
                        let currentBlock = null;

                        sections.forEach((sec, i) => {
                            const match = sec.match(/^\[(.*?)\]/);
                            if (match) {
                                let fullTag = match[1].trim();
                                let typePart = fullTag;
                                let instruction = '';
                                if (fullTag.includes(':')) {
                                    const parts = fullTag.split(':');
                                    typePart = parts[0].trim();
                                    instruction = parts.slice(1).join(':').trim();
                                }
                                let baseType = typePart.replace(/\s*\d+$/, '').trim().toUpperCase();

                                if (validTypes.includes(baseType)) {
                                    currentBlock = { id: 'sec_' + Date.now() + '_' + i, type: baseType, instruction: instruction, text: sec.replace(/^\[.*?\]/, '').trim() };
                                    blocks.push(currentBlock);
                                } else {
                                    if (currentBlock) {
                                        currentBlock.text += (currentBlock.text ? '\n\n' : '') + sec.trim();
                                    } else {
                                        currentBlock = { id: 'sec_' + Date.now() + '_' + i, type: 'VERSE', instruction: '', text: sec.trim() };
                                        blocks.push(currentBlock);
                                    }
                                }
                            } else {
                                if (currentBlock) {
                                    currentBlock.text += (currentBlock.text ? '\n\n' : '') + sec.trim();
                                } else {
                                    currentBlock = { id: 'sec_' + Date.now() + '_' + i, type: 'VERSE', instruction: '', text: sec.trim() };
                                    blocks.push(currentBlock);
                                }
                            }
                        });
                        return { ...p, lyricView: 'builder', structuredLyrics: blocks.length > 0 ? blocks : p.structuredLyrics };
                    })} style={{ background: lyricView === 'raw' ? `${tColor}20` : 'transparent', border: `1px solid ${tColor}`, color: tColor, padding: '4px 8px', borderRadius: '4px', fontSize: '9px', cursor: 'pointer', fontFamily: "monospace", fontWeight: 'bold', transition: 'all 0.2s' }}>{lyricView === 'raw' ? 'BUILDER' : 'RAW'}</button>
                </div>
            </div>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginBottom: '16px', fontFamily: "monospace", lineHeight: 1.3 }}>// Guide the AI's song structure!</div>

            {lyricView === 'mika' ? (
                <div style={{ padding: '16px', background: `${tColor}0A`, border: `1px dashed ${tColor}50`, borderRadius: '8px', marginBottom: '8px', animation: 'expandDown 0.3s ease-out forwards', transformOrigin: 'top' }}>
                    <div style={{ fontSize: '10px', color: tColor, fontWeight: 'bold', marginBottom: '8px', fontFamily: "monospace", letterSpacing: '0.05em' }}>&gt; AI_SONGWRITER</div>
                    <textarea className="search-input" rows="3" value={dawState.mikaLyricPrompt || ''} onChange={e => setDawState(p => ({ ...p, mikaLyricPrompt: e.target.value }))} disabled={dawState.isAiBusy} placeholder="e.g. 'Write a sad break-up song about leaving a cyberpunk city in the rain...'" style={{ padding: '12px', borderRadius: '6px', background: '#0B0914', border: `1px solid ${tColor}60`, color: '#fff', fontSize: '11px', resize: 'vertical', fontFamily: "monospace", width: '100%', lineHeight: 1.5, boxShadow: `inset 0 0 10px ${tColor}10`, marginBottom: '12px' }} />
                    <button onClick={handleMikaGenerateLyrics} disabled={dawState.isAiBusy || !(dawState.mikaLyricPrompt || '').trim()} style={{ width: '100%', background: `${tColor}20`, border: `1px solid ${tColor}`, color: tColor, padding: '10px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', fontFamily: "monospace", cursor: dawState.isAiBusy || !(dawState.mikaLyricPrompt || '').trim() ? 'not-allowed' : 'pointer', transition: 'all 0.2s', boxShadow: `0 0 10px ${tColor}30` }}>
                        {dawState.isAiBusy ? '[ FORGING_LYRICS... ]' : '> GENERATE_FULL_SONG'}
                    </button>
                </div>
            ) : lyricView === 'builder' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(dawState.structuredLyrics || []).map((block, idx) => {
                        const isExpanded = dawState.expandedLyricId === block.id;
                        const t = (block.type || 'VERSE').toUpperCase();

                        return (
                            <div key={block.id} style={{ border: isExpanded ? `1px solid ${tColor}` : `1px solid ${tColor}40`, background: isExpanded ? 'rgba(5,3,8,0.9)' : 'transparent', borderRadius: '6px', overflow: 'hidden', transition: 'all 0.2s' }}>
                                {/* ✨ COLLAPSED / HEADER ROW ✨ */}
                                <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', cursor: 'pointer', borderBottom: isExpanded ? `1px solid ${tColor}40` : 'none', background: isExpanded ? 'transparent' : 'rgba(255,255,255,0.02)', gap: '10px' }} onClick={() => setDawState(p => ({ ...p, expandedLyricId: isExpanded ? null : block.id }))}>

                                    {/* Fixed-Width Section Title Badge */}
                                    <div style={{ color: tColor, fontSize: '10px', fontWeight: 'bold', fontFamily: "monospace", width: '90px', flexShrink: 0, letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        [{t}]
                                    </div>

                                    {/* Truncated Cue & Lyric Preview with No Button Overlap */}
                                    {!isExpanded ? (
                                        <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: '8px', alignItems: 'center', overflow: 'hidden' }}>
                                            {block.instruction && (
                                                <span style={{ color: '#FFD700', fontSize: '9px', fontStyle: 'italic', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 1 }}>
                                                    {block.instruction}
                                                </span>
                                            )}
                                            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', fontFamily: "monospace", whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 2 }}>
                                                {(block.text || '').split('\n').filter(Boolean)[0] || 'Empty section...'}
                                            </span>
                                        </div>
                                    ) : (
                                        <div style={{ flex: 1 }}></div>
                                    )}

                                    {/* Toggle & Delete Buttons */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                                        <span style={{ fontSize: '10px', color: tColor, opacity: 0.8 }}>{isExpanded ? '▼' : '▶'}</span>
                                        <button onClick={(e) => { e.stopPropagation(); setDawState(p => { const next = p.structuredLyrics.filter(b => b.id !== block.id); const raw = next.map(b => { const bt = (b.type || '').toUpperCase(); return `[${bt}${b.instruction ? ': ' + b.instruction : ''}]\n${b.text || ''}`; }).join('\n\n'); return { ...p, structuredLyrics: next, lyrics: raw }; }); }} style={{ background: 'transparent', border: 'none', color: '#FF3333', fontSize: '14px', cursor: 'pointer', padding: '0 4px', opacity: 0.7, transition: '0.2s' }} onMouseOver={e => e.currentTarget.style.opacity = 1} onMouseOut={e => e.currentTarget.style.opacity = 0.7}>✕</button>
                                    </div>
                                </div>

                                {/* ✨ EXPANDED EDITOR BODY ✨ */}
                                {isExpanded && (
                                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(0,0,0,0.5)' }}>
                                        {/* ✨ MIKA'S CUSTOM SELECT DROPDOWN & INPUT BOX ✨ */}
                                        <div style={{ display: 'flex', gap: '8px', width: '100%', alignItems: 'center' }}>
                                            <div style={{ position: 'relative', width: '130px', flexShrink: 0 }}>
                                                <div
                                                    className="search-input"
                                                    style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0B0914', color: tColor, border: `1px solid ${tColor}50`, padding: '10px 12px', borderRadius: '4px', fontFamily: "monospace", fontSize: '10px', fontWeight: 'bold' }}
                                                    onClick={() => setDawState(p => ({ ...p, activeLyricDropdown: p.activeLyricDropdown === block.id ? null : block.id }))}
                                                >
                                                    <span>[{t}]</span>
                                                    <span style={{ fontSize: '8px' }}>{dawState.activeLyricDropdown === block.id ? '▲' : '▼'}</span>
                                                </div>
                                                {dawState.activeLyricDropdown === block.id && (
                                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 101, background: '#0C0912', border: `1px solid ${tColor}`, borderRadius: '4px', marginTop: '4px', padding: '4px', boxShadow: `0 8px 32px rgba(0,0,0,0.9), inset 0 0 10px ${tColor}20`, maxHeight: '200px', overflowY: 'auto', animation: 'expandDown 0.2s ease forwards', transformOrigin: 'top' }}>
                                                        {['INTRO', 'VERSE', 'PRE-CHORUS', 'CHORUS', 'DROP', 'BRIDGE', 'OUTRO', 'SOLO'].map(dt => (
                                                            <div
                                                                key={dt}
                                                                className={`dropdown-option ${t === dt ? 'selected' : ''}`}
                                                                onClick={() => { updateStructLyric(block.id, 'type', dt); setDawState(p => ({ ...p, activeLyricDropdown: null })); }}
                                                                style={{ padding: '8px 8px', color: t === dt ? tColor : '#EBE3D6', background: t === dt ? `${tColor}20` : 'transparent', borderLeft: t === dt ? `3px solid ${tColor}` : '3px solid transparent', fontFamily: "monospace", fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' }}
                                                                onMouseOver={e => { e.currentTarget.style.background = `${tColor}15`; }}
                                                                onMouseOut={e => { e.currentTarget.style.background = t === dt ? `${tColor}20` : 'transparent'; }}
                                                            >
                                                                [{dt}]
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Dedicated Cue Text Input */}
                                            <input
                                                type="text"
                                                className="search-input"
                                                placeholder="Cue... (e.g. Heavy bass)"
                                                value={block.instruction || ''}
                                                onChange={e => updateStructLyric(block.id, 'instruction', e.target.value)}
                                                style={{ flex: 1, minWidth: 0, padding: '10px 12px', background: '#0B0914', border: `1px dashed ${tColor}50`, color: '#FFD700', fontSize: '11px', fontFamily: "monospace", borderRadius: '4px' }}
                                            />
                                        </div>

                                        <textarea rows="5" value={block.text || ''} onChange={e => updateStructLyric(block.id, 'text', e.target.value)} style={{ background: '#0B0914', color: '#fff', border: `1px solid ${tColor}30`, padding: '12px', borderRadius: '4px', fontFamily: "monospace", fontSize: '11px', resize: 'vertical', lineHeight: 1.5, boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)' }} />

                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => handleAiRewriteLyric(block.id, 'reroll')} disabled={dawState.isAiBusy} style={{ flex: 1, background: 'transparent', border: `1px dashed ${tColor}`, color: tColor, padding: '10px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', fontFamily: "monospace", cursor: dawState.isAiBusy ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = `${tColor}15`} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>{dawState.isAiBusy ? '...' : '> REROLL_AI'}</button>
                                            <button onClick={() => handleAiRewriteLyric(block.id, 'more')} disabled={dawState.isAiBusy} style={{ flex: 1, background: 'transparent', border: `1px dashed ${tColor}`, color: tColor, padding: '10px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', fontFamily: "monospace", cursor: dawState.isAiBusy ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = `${tColor}15`} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>{dawState.isAiBusy ? '...' : '> AI_GIMME_MORE'}</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                    <button onClick={() => setDawState(p => { const next = [...(p.structuredLyrics || []), { id: 'lyric_' + Date.now(), type: 'VERSE', instruction: '', text: '' }]; const raw = next.map(b => { const bt = (b.type || '').toUpperCase(); return `[${bt}${b.instruction ? ': ' + b.instruction : ''}]\n${b.text || ''}`; }).join('\n\n'); return { ...p, structuredLyrics: next, lyrics: raw }; })} style={{ background: `${tColor}10`, border: `1px dashed ${tColor}50`, color: tColor, padding: '12px', borderRadius: '6px', fontSize: '10px', fontWeight: 'bold', fontFamily: "monospace", cursor: 'pointer', transition: 'all 0.2s', marginTop: '4px' }} onMouseOver={e => e.currentTarget.style.background = `${tColor}20`} onMouseOut={e => e.currentTarget.style.background = `${tColor}10`}>+ ADD_SECTION</button>
                </div>
            ) : (
                <textarea className="search-input" rows="10" value={dawState.lyrics} onChange={e => setDawState(p => ({ ...p, lyrics: e.target.value }))} disabled={dawState.isGenerating} style={{ padding: '12px', borderRadius: '6px', background: '#0B0914', border: `1px solid ${tColor}60`, color: '#fff', fontSize: '11px', resize: 'vertical', fontFamily: "monospace", width: '100%', lineHeight: 1.6, boxShadow: `inset 0 0 10px ${tColor}10` }} />
            )}
        </div>
    );
};
