import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as Constants from '../data/constants.js';

export const DawTagCategory = ({ title, selectedTags, suggestedTags, onToggleTag, onAddCustom, isOpen, onToggleOpen, themeColor, onAiReroll, onAiMore, isAiBusy }) => {
            const [inputVal, setInputVal] = useState('');
            return (
                <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '6px', border: `1px solid ${themeColor}30`, marginBottom: '8px', overflow: 'hidden' }}>
                    <div onClick={onToggleOpen} style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: isOpen ? `${themeColor}10` : 'transparent', transition: 'background 0.2s' }}>
                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: themeColor, fontFamily: "monospace", letterSpacing: '0.05em', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minWidth: 0, paddingRight: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>&gt; {title}</div>
                            {!isOpen && selectedTags.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                    {selectedTags.map((t, i) => <span key={i} style={{ padding: '2px 8px', background: `${themeColor}20`, border: `1px solid ${themeColor}40`, borderRadius: '4px', fontSize: '9px', color: themeColor, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{t}</span>)}
                                </div>
                            )}
                        </div>
                        <span style={{ fontSize: '10px', color: themeColor, opacity: 0.8 }}>{isOpen ? '▼' : '▶'}</span>
                    </div>
                    {isOpen && (
                        <div style={{ padding: '16px', borderTop: `1px solid ${themeColor}20`, background: 'rgba(5,3,8,0.6)' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
                                {[...new Set([...selectedTags, ...suggestedTags])].map(tag => {
                                    const isActive = selectedTags.includes(tag);
                                    return (
                                        <button key={tag} onClick={() => onToggleTag(tag)} style={{ padding: '6px 12px', borderRadius: '4px', fontSize: '10px', fontFamily: "monospace", background: isActive ? `${themeColor}25` : 'rgba(255,255,255,0.03)', color: isActive ? themeColor : 'rgba(255,255,255,0.5)', border: `1px solid ${isActive ? themeColor : 'rgba(255,255,255,0.1)'}`, cursor: 'pointer', transition: 'all 0.2s', boxShadow: isActive ? `0 0 10px ${themeColor}30` : 'none' }}>
                                            {tag}
                                        </button>
                                    );
                                })}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                                <input type="text" value={inputVal} onChange={e => setInputVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && inputVal.trim()) { onAddCustom(inputVal.trim()); setInputVal(''); } }} placeholder={`add_custom_${title.toLowerCase()}...`} style={{ flex: 1, padding: '10px 12px', background: '#0B0914', border: `1px solid ${themeColor}40`, borderRadius: '4px', color: '#fff', fontSize: '11px', fontFamily: "monospace" }} />
                                <button onClick={() => { if(inputVal.trim()) { onAddCustom(inputVal.trim()); setInputVal(''); } }} style={{ padding: '0 16px', background: `${themeColor}20`, border: `1px solid ${themeColor}`, color: themeColor, borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>+</button>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button onClick={onAiReroll} disabled={isAiBusy} style={{ flex: 1, background: 'transparent', border: `1px dashed ${themeColor}`, color: themeColor, padding: '10px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', fontFamily: "monospace", cursor: isAiBusy ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }} onMouseOver={e=>e.currentTarget.style.background=`${themeColor}15`} onMouseOut={e=>e.currentTarget.style.background='transparent'}>{isAiBusy ? '...' : '> REROLL_AI'}</button>
                                <button onClick={onAiMore} disabled={isAiBusy} style={{ flex: 1, background: 'transparent', border: `1px dashed ${themeColor}`, color: themeColor, padding: '10px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', fontFamily: "monospace", cursor: isAiBusy ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }} onMouseOver={e=>e.currentTarget.style.background=`${themeColor}15`} onMouseOut={e=>e.currentTarget.style.background='transparent'}>{isAiBusy ? '...' : '> AI_GIMME_MORE'}</button>
                            </div>
                        </div>
                    )}
                </div>
            );
        };

        // ✨ MIKA'S MINI TAPE DECK (ADAPTIVE CONTROL) ✨
        