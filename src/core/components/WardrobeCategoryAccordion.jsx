import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as Constants from '../data/constants.js';

export const WardrobeCategoryAccordion = ({ title, items = [], isExpanded, onToggle, onRemoveItem, onAddItem, onAiReroll, onAiMore, placeholder = "Add item...", isAiBusy }) => {
    const [inputVal, setInputVal] = React.useState("");

    const handleAdd = () => {
        if (inputVal.trim()) {
            // ✨ MIKA'S AUTO-UNDERSCORE SANITIZER ✨
            onAddItem(inputVal.trim().toLowerCase().replace(/\s+/g, '_'));
            setInputVal("");
        }
    };

    return (
        <div className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', padding: 0, overflow: 'hidden', marginBottom: '8px', border: isExpanded ? '1px solid #00E5FF' : '1px solid rgba(0, 229, 255, 0.15)', background: 'rgba(0, 229, 255, 0.03)' }}>
            <button 
                onClick={onToggle}
                style={{ display: 'flex', alignItems: 'center', background: isExpanded ? 'rgba(0, 229, 255, 0.1)' : 'transparent', border: 'none', color: 'inherit', padding: '12px 14px', cursor: 'pointer', outline: 'none', font: 'inherit', textAlign: 'left', minWidth: 0, width: '100%', transition: 'background 0.2s' }}
            >
                <span style={{ flexShrink: 0, fontWeight: 800, fontSize: '11px', color: '#00E5FF', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", letterSpacing: '0.05em' }}>&gt; {title}</span>
                
                {!isExpanded && items.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, flex: 1, justifyContent: 'flex-end', marginRight: '8px', marginLeft: '12px' }}>
                        {items.slice(0, 3).map((item, idx) => (
                            <span key={idx} style={{ padding: '2px 6px', fontSize: '9px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: '75px', color: '#00E5FF', background: 'rgba(0, 229, 255, 0.1)', border: '1px solid rgba(0, 229, 255, 0.3)', borderRadius: '2px', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>
                                {item.replace(/_/g, ' ')}
                            </span>
                        ))}
                        {items.length > 3 && (
                            <span style={{ fontSize: '9px', color: '#00E5FF', fontWeight: 'bold', flexShrink: 0, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>
                                +{items.length - 3}
                            </span>
                        )}
                    </div>
                )}
                
                <span style={{ marginLeft: !isExpanded && items.length > 0 ? '0' : 'auto', flexShrink: 0, fontSize: '10px', color: '#00E5FF' }}>
                    {isExpanded ? '▲' : '▼'}
                </span>
            </button>

            {isExpanded && (
                <div style={{ padding: '14px', background: 'rgba(5, 3, 8, 0.6)', borderTop: '1px solid rgba(0, 229, 255, 0.2)' }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                        <button 
                            className="btn btn-outline" 
                            disabled={isAiBusy}
                            onClick={onAiReroll}
                            style={{ flex: 1, padding: '6px', fontSize: '9px', borderRadius: '4px', margin: 0, borderColor: 'rgba(0, 229, 255, 0.4)', color: '#00E5FF', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", letterSpacing: '0.05em', background: 'transparent' }}
                        >
                            {isAiBusy ? '...' : '> REROLL_AI'}
                        </button>
                        <button 
                            className="btn btn-outline" 
                            disabled={isAiBusy}
                            onClick={onAiMore}
                            style={{ flex: 1, padding: '6px', fontSize: '9px', borderRadius: '4px', margin: 0, borderColor: 'rgba(0, 229, 255, 0.4)', color: '#00E5FF', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", letterSpacing: '0.05em', background: 'transparent' }}
                        >
                            {isAiBusy ? '...' : '> AI_GIMME_MORE'}
                        </button>
                    </div>

                    <div className="tags-container" style={{ marginBottom: items.length > 0 ? '12px' : '0', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                        {items.length === 0 || (items.length === 1 && items[0].toUpperCase() === 'NONE') ? (
                            <div style={{ fontSize: '10px', color: 'rgba(0, 229, 255, 0.4)', fontStyle: 'italic', padding: '4px 0', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>[ EMPTY_CLOSET ] Let AI generate some or type below~</div>
                        ) : (
                            items.map((item, idx) => (
                                <span key={idx} style={{ padding: '4px 8px', fontSize: '10px', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#00E5FF', background: 'rgba(0, 229, 255, 0.1)', border: '1px solid rgba(0, 229, 255, 0.3)', borderRadius: '4px', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", cursor: 'pointer', transition: 'all 0.2s', maxWidth: '100%' }} onClick={() => onRemoveItem(idx)} title="Click to remove" onMouseOver={e => { e.currentTarget.style.background = 'rgba(255, 51, 51, 0.15)'; e.currentTarget.style.borderColor = '#FF3333'; e.currentTarget.style.color = '#FF3333'; }} onMouseOut={e => { e.currentTarget.style.background = 'rgba(0, 229, 255, 0.1)'; e.currentTarget.style.borderColor = 'rgba(0, 229, 255, 0.3)'; e.currentTarget.style.color = '#00E5FF'; }}>
                                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.replace(/_/g, ' ')}</span> <span style={{ fontSize: '10px', opacity: 0.8, flexShrink: 0 }}>✕</span>
                                </span>
                            ))
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input 
                            type="text" 
                            className="search-input" 
                            style={{ padding: '8px 12px', borderRadius: '4px', flex: 1, fontSize: '11px', background: '#0B0914', border: '1px solid rgba(0, 229, 255, 0.3)', color: '#00E5FF', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}
                            placeholder={placeholder}
                            value={inputVal}
                            onChange={e => setInputVal(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                        />
                        <button 
                            className="btn btn-solid" 
                            style={{ padding: '0 16px', margin: 0, borderRadius: '4px', background: 'rgba(0, 229, 255, 0.15)', border: '1px solid #00E5FF', color: '#00E5FF', fontSize: '14px', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}
                            onClick={handleAdd}
                            disabled={!inputVal.trim()}
                        >
                            +
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ✨ MIKA'S NEURAL BREACH MINIGAME ✨
// =========================================================
