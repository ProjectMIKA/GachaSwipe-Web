import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as Constants from '../data/constants.js';

export const ForgeCategoryAccordion = ({ 
    title, 
    items = [], 
    isExpanded, 
    onToggle, 
    onRemoveItem, 
    onAddItem, 
    onAiReroll, 
    onAiMore, 
    onRestore,
    placeholder = "Add custom trait...",
    isAiBusy,
    themeColor = '#00E5FF'
}) => {
    const [inputVal, setInputVal] = useState("");

    const handleAdd = () => {
        if (inputVal.trim()) {
            onAddItem(inputVal.trim());
            setInputVal("");
        }
    };

    return (
        <div className="list-item" style={{ flexDirection: 'column', alignItems: 'stretch', padding: 0, overflow: 'hidden', marginBottom: '12px', border: isExpanded ? `1px solid ${themeColor}` : `1px solid ${themeColor}26`, background: `${themeColor}08` }}>
            {/* HEADER BAR */}
            <button 
                onClick={onToggle}
                style={{ display: 'flex', alignItems: 'center', background: isExpanded ? `${themeColor}1A` : 'transparent', border: 'none', color: 'inherit', padding: '14px 16px', cursor: 'pointer', outline: 'none', font: 'inherit', textAlign: 'left', minWidth: 0, width: '100%', transition: 'background 0.2s' }}
            >
                <span style={{ flexShrink: 0, fontWeight: 800, fontSize: '12px', color: themeColor, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", letterSpacing: '0.05em' }}>{title}</span>
                
                {/* PREVIEW PILLS WHEN COLLAPSED */}
                {!isExpanded && items.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, flex: 1, justifyContent: 'flex-end', marginRight: '8px', marginLeft: '12px' }}>
                        {items.slice(0, 3).map((item, idx) => (
                            <span key={idx} style={{ padding: '2px 6px', fontSize: '9px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: '75px', color: themeColor, background: `${themeColor}1A`, border: `1px solid ${themeColor}4D`, borderRadius: '2px', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>
                                {typeof item === 'object' ? `${item.neg} vs ${item.pos}` : item}
                            </span>
                        ))}
                        {items.length > 3 && (
                            <span style={{ fontSize: '10px', color: themeColor, fontWeight: 'bold', flexShrink: 0, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>
                                +{items.length - 3}
                            </span>
                        )}
                    </div>
                )}
                
                <span style={{ marginLeft: !isExpanded && items.length > 0 ? '0' : 'auto', flexShrink: 0, fontSize: '10px', color: themeColor }}>
                    {isExpanded ? '▲' : '▼'}
                </span>
            </button>

            {/* EXPANDED CONTENT AREA */}
            {isExpanded && (
                <div style={{ padding: '16px', background: 'rgba(5, 3, 8, 0.6)', borderTop: `1px solid ${themeColor}33` }}>
                    {/* AI ACTION BUTTONS */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                        <button 
                            className="btn btn-outline" 
                            disabled={isAiBusy}
                            onClick={onAiReroll}
                            style={{ flex: 1, padding: '8px', fontSize: '10px', borderRadius: '4px', margin: 0, borderColor: `${themeColor}66`, color: themeColor, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", letterSpacing: '0.05em', background: 'transparent' }}
                        >
                            {isAiBusy ? '...' : '> REROLL_AI'}
                        </button>
                        <button 
                            className="btn btn-outline" 
                            disabled={isAiBusy}
                            onClick={onAiMore}
                            style={{ flex: 1, padding: '8px', fontSize: '10px', borderRadius: '4px', margin: 0, borderColor: `${themeColor}66`, color: themeColor, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", letterSpacing: '0.05em', background: 'transparent' }}
                        >
                            {isAiBusy ? '...' : '> AI_GIMME_MORE'}
                        </button>
                    </div>

                    {/* FULL LIST OF PILLS */}
                     <div className="tags-container" style={{ marginBottom: items.length > 0 ? '12px' : '0', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                        {items.length === 0 ? (
                            <div style={{ fontSize: '10px', color: `${themeColor}66`, fontStyle: 'italic', padding: '4px 0', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>[ EMPTY_DATABASE ] Let AI generate some or type below~</div>
                        ) : (
                            items.map((item, idx) => {
                                const label = typeof item === 'object' ? `${item.neg} vs ${item.pos}` : item;
                                return (
                                    <span key={idx} style={{ padding: '4px 8px', fontSize: '10px', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '6px', color: themeColor, background: `${themeColor}1A`, border: `1px solid ${themeColor}4D`, borderRadius: '4px', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", cursor: 'pointer', transition: 'all 0.2s', maxWidth: '100%' }} onClick={() => onRemoveItem(idx)} title="Click to remove" onMouseOver={e => { e.currentTarget.style.background = 'rgba(255, 51, 51, 0.15)'; e.currentTarget.style.borderColor = '#FF3333'; e.currentTarget.style.color = '#FF3333'; }} onMouseOut={e => { e.currentTarget.style.background = `${themeColor}1A`; e.currentTarget.style.borderColor = `${themeColor}4D`; e.currentTarget.style.color = themeColor; }}>
                                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span> <span style={{ fontSize: '10px', opacity: 0.8, flexShrink: 0 }}>✕</span>
                                    </span>
                                );
                            })
                        )}
                    </div>

                    {/* MANUAL ADD INPUT */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <input 
                            type="text" 
                            className="search-input" 
                            style={{ padding: '8px 12px', borderRadius: '4px', flex: 1, fontSize: '11px', background: '#0B0914', border: `1px solid ${themeColor}40`, color: '#fff', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}
                            placeholder={placeholder}
                            value={inputVal}
                            onChange={e => setInputVal(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
                        />
                        <button 
                            className="btn btn-solid" 
                            style={{ padding: '0 16px', margin: 0, borderRadius: '4px', background: `${themeColor}20`, border: `1px solid ${themeColor}`, color: themeColor, fontSize: '14px', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", cursor: 'pointer', fontWeight: 'bold' }}
                            onClick={handleAdd}
                            disabled={!inputVal.trim()}
                        >
                            +
                        </button>
                    </div>
                    {onRestore && (
                        <button 
                            onClick={onRestore}
                            style={{ marginTop: '10px', width: '100%', padding: '6px', fontSize: '10px', borderRadius: '4px', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", letterSpacing: '0.05em', border: '1px dashed rgba(255, 51, 51, 0.4)', color: '#FF3333', background: 'rgba(255, 51, 51, 0.05)', cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseOver={e => { e.currentTarget.style.background = 'rgba(255, 51, 51, 0.15)'; e.currentTarget.style.boxShadow = '0 0 8px rgba(255,51,51,0.2)'; }}
                            onMouseOut={e => { e.currentTarget.style.background = 'rgba(255, 51, 51, 0.05)'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                            [ RESTORE_CATEGORY ]
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};
