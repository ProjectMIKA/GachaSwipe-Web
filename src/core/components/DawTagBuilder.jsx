import React from 'react';
import { MUSIC_TAG_DB } from '../data/constants.js';
import { DawTagCategory } from './DawTagCategory.jsx';

export const DawTagBuilder = ({
    dawState,
    setDawState,
    tColor,
    restoreDefaults,
    handleMikaGenerateTags,
    toggleTag,
    updateStructTag,
    handleAiTagCategory
}) => {
    const tagView = dawState.tagView || (dawState.isStructuredTags === false ? 'raw' : 'builder');
    
    return (
        <div style={{ background: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: '8px', border: `1px solid ${tColor}40`, boxShadow: `inset 0 0 10px ${tColor}10` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: tColor, fontFamily: "monospace", letterSpacing: '0.05em' }}>&gt; GLOBAL_CONTROL_TAGS</div>
                <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={restoreDefaults} style={{ background: 'transparent', border: `1px dashed ${tColor}60`, color: tColor, padding: '4px 8px', borderRadius: '4px', fontSize: '9px', cursor: 'pointer', fontFamily: "monospace", fontWeight: 'bold', transition: 'all 0.2s' }}>RESTORE</button>
                    <button onClick={() => setDawState(p => ({ ...p, tagView: tagView === 'mika' ? 'builder' : 'mika' }))} style={{ background: tagView === 'mika' ? `${tColor}20` : 'transparent', border: `1px solid ${tColor}`, color: tColor, padding: '4px 8px', borderRadius: '4px', fontSize: '9px', cursor: 'pointer', fontFamily: "monospace", fontWeight: 'bold', transition: 'all 0.2s', boxShadow: tagView === 'mika' ? `0 0 8px ${tColor}40` : 'none', display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ animation: 'csd-pulse 2s infinite' }}>✨</span> M.I.K.A.</button>
                    <button onClick={() => setDawState(p => {
                        if (tagView === 'builder' || tagView === 'mika') {
                            const flattened = [...(p.structuredTags?.genre || []), ...(p.structuredTags?.instruments || []), ...(p.structuredTags?.vocals || []), `${p.bpm} BPM`, ...(p.structuredTags?.vibe || [])].filter(Boolean).join(', ');
                            return { ...p, tagView: 'raw', tags: flattened };
                        }
                        return { ...p, tagView: 'builder' };
                    })} style={{ background: tagView === 'raw' ? `${tColor}20` : 'transparent', border: `1px solid ${tColor}`, color: tColor, padding: '4px 8px', borderRadius: '4px', fontSize: '9px', cursor: 'pointer', fontFamily: "monospace", fontWeight: 'bold', transition: 'all 0.2s' }}>{tagView === 'raw' ? 'BUILDER' : 'RAW'}</button>
                </div>
            </div>
            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginBottom: '16px', fontFamily: "monospace", lineHeight: 1.3 }}>// Defines the genre, tempo, instruments, and mix.</div>

            {tagView === 'mika' ? (
                <div style={{ padding: '16px', background: `${tColor}0A`, border: `1px dashed ${tColor}50`, borderRadius: '8px', marginBottom: '8px', animation: 'expandDown 0.3s ease-out forwards', transformOrigin: 'top' }}>
                    <div style={{ fontSize: '10px', color: tColor, fontWeight: 'bold', marginBottom: '8px', fontFamily: "monospace", letterSpacing: '0.05em' }}>&gt; AI_TAG_GENERATOR</div>
                    <textarea className="search-input" rows="3" value={dawState.mikaTagPrompt || ''} onChange={e => setDawState(p => ({ ...p, mikaTagPrompt: e.target.value }))} disabled={dawState.isAiBusy} placeholder="e.g. 'I want a heavy metal track with crazy fast drums and a screaming female vocalist...'" style={{ padding: '12px', borderRadius: '6px', background: '#0B0914', border: `1px solid ${tColor}60`, color: '#fff', fontSize: '11px', resize: 'vertical', fontFamily: "monospace", width: '100%', lineHeight: 1.5, boxShadow: `inset 0 0 10px ${tColor}10`, marginBottom: '12px' }} />
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleMikaGenerateTags('reroll')} disabled={dawState.isAiBusy || !(dawState.mikaTagPrompt || '').trim()} style={{ flex: 1, background: 'transparent', border: `1px dashed ${tColor}`, color: tColor, padding: '10px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', fontFamily: "monospace", cursor: dawState.isAiBusy || !(dawState.mikaTagPrompt || '').trim() ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = `${tColor}15`} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>{dawState.isAiBusy ? '...' : '> REROLL_AI'}</button>
                        <button onClick={() => handleMikaGenerateTags('more')} disabled={dawState.isAiBusy || !(dawState.mikaTagPrompt || '').trim()} style={{ flex: 1, background: 'transparent', border: `1px dashed ${tColor}`, color: tColor, padding: '10px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', fontFamily: "monospace", cursor: dawState.isAiBusy || !(dawState.mikaTagPrompt || '').trim() ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }} onMouseOver={e => e.currentTarget.style.background = `${tColor}15`} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>{dawState.isAiBusy ? '...' : '> AI_GIMME_MORE'}</button>
                    </div>
                </div>
            ) : tagView === 'builder' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* BPM Slider */}
                    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${tColor}30`, borderRadius: '8px', marginBottom: '8px', boxShadow: `inset 0 0 10px rgba(0,0,0,0.5)`, position: 'relative', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <span style={{ fontSize: '10px', color: tColor, fontWeight: 'bold', fontFamily: "monospace", letterSpacing: '0.05em' }}>TEMPO (BPM)</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <button
                                    onClick={() => setDawState(p => ({ ...p, isSmartBpm: !p.isSmartBpm }))}
                                    style={{ background: dawState.isSmartBpm ? `${tColor}25` : 'transparent', border: dawState.isSmartBpm ? `1px solid ${tColor}` : `1px dashed ${tColor}60`, color: tColor, padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold', fontFamily: "monospace", letterSpacing: '0.05em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: dawState.isSmartBpm ? `0 0 12px ${tColor}40` : 'none', transition: 'all 0.2s' }}
                                >
                                    <span style={{ animation: dawState.isSmartBpm ? 'csd-pulse 2s infinite' : 'none', filter: dawState.isSmartBpm ? 'grayscale(0)' : 'grayscale(100%)' }}>🧠</span> SMART_BPM
                                </button>
                                <span style={{ fontSize: '14px', color: '#fff', fontWeight: 'bold', textShadow: `0 0 8px ${tColor}`, minWidth: '35px', textAlign: 'right' }}>
                                    {dawState.isSmartBpm ? 'AUTO' : dawState.bpm}
                                </span>
                            </div>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <input type="range" min="60" max="220" step="1" value={dawState.bpm} onChange={e => {
                                const newBpm = parseInt(e.target.value, 10);
                                setDawState(p => {
                                    const flattened = [...(p.structuredTags?.genre || []), ...(p.structuredTags?.instruments || []), ...(p.structuredTags?.vocals || []), `${newBpm} BPM`, ...(p.structuredTags?.vibe || [])].filter(Boolean).join(', ');
                                    return { ...p, bpm: newBpm, tags: flattened, isSmartBpm: false };
                                });
                            }} style={{ width: '100%', accentColor: tColor, cursor: dawState.isGenerating || dawState.isSmartBpm ? 'default' : 'pointer', height: '6px', opacity: dawState.isSmartBpm ? 0.3 : 1, transition: 'opacity 0.3s' }} disabled={dawState.isGenerating || dawState.isSmartBpm} />

                            {dawState.isSmartBpm && (
                                <div style={{ position: 'absolute', inset: '-10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,3,8,0.5)', backdropFilter: 'blur(2px)', zIndex: 10 }}>
                                    <span style={{ color: tColor, fontSize: '10px', fontWeight: 'bold', animation: 'csd-pulse 2s infinite', letterSpacing: '0.1em', textShadow: `0 0 8px ${tColor}80` }}>&gt; LETTING_AI_DICTATE_GROOVE...</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Pill Categories */}
                    {[{ id: 'genre', label: 'GENRES', suggestions: MUSIC_TAG_DB.genres },
                    { id: 'instruments', label: 'INSTRUMENTS', suggestions: MUSIC_TAG_DB.instruments },
                    { id: 'vocals', label: 'VOCALS', suggestions: MUSIC_TAG_DB.vocals },
                    { id: 'vibe', label: 'VIBE / ERA', suggestions: MUSIC_TAG_DB.vibes }].map(cat => (
                        <DawTagCategory
                            key={cat.id} title={cat.label}
                            selectedTags={dawState.structuredTags?.[cat.id] || []}
                            suggestedTags={cat.suggestions}
                            isOpen={dawState.expandedTagCat === cat.id}
                            onToggleOpen={() => setDawState(p => ({ ...p, expandedTagCat: p.expandedTagCat === cat.id ? null : cat.id }))}
                            onToggleTag={(tag) => toggleTag(cat.id, tag)}
                            onAddCustom={(val) => { const next = [...(dawState.structuredTags?.[cat.id] || []), val]; updateStructTag(cat.id, next); }}
                            themeColor={tColor}
                            onAiReroll={() => handleAiTagCategory(cat.id, 'reroll')}
                            onAiMore={() => handleAiTagCategory(cat.id, 'more')}
                            isAiBusy={dawState.isAiBusy}
                        />
                    ))}
                </div>
            ) : (
                <textarea className="search-input" rows="4" value={dawState.tags} onChange={e => setDawState(p => ({ ...p, tags: e.target.value }))} disabled={dawState.isGenerating} style={{ padding: '12px', borderRadius: '6px', background: '#0B0914', border: `1px solid ${tColor}60`, color: '#fff', fontSize: '11px', resize: 'vertical', fontFamily: "monospace", width: '100%', lineHeight: 1.5, boxShadow: `inset 0 0 10px ${tColor}10` }} />
            )}
        </div>
    );
};
