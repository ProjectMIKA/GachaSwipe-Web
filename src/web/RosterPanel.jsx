import React, { useState } from 'react';
import { useCards } from './db.js';
import { matrixAudio } from '../core/utils/matrixAudio.js';
import { LockIcon } from '../core/components/Icons.jsx';

export function RosterPanel({
    activeCard,
    onSelectCard,
    onOpenChat,
    onOpenGachaFans,
    onOpenSettings,
    onOpenCloudVault,
    isEmbedded = false,
    onClose
}) {
    const dbCards = useCards();
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('ALL');

    // Combine db cards or fallback
    const allCards = dbCards.length > 0 ? dbCards : [];

    const filtered = allCards.filter(c => {
        const name = (c.characterName || c.metadata?.name || '').toLowerCase();
        const arch = (c.metadata?.archetype || '').toLowerCase();
        const matchesSearch = name.includes(search.toLowerCase()) || arch.includes(search.toLowerCase());
        if (!matchesSearch) return false;
        if (filter === 'SSR') return Boolean(c.metadata?.isSSR);
        return true;
    });

    const panelStyle = isEmbedded ? {
        height: '100%', display: 'flex', flexDirection: 'column', background: 'rgba(5, 3, 8, 0.95)',
        borderRight: '1px solid rgba(0, 229, 255, 0.15)', overflow: 'hidden', position: 'relative',
        fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace"
    } : {
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(5, 3, 10, 0.85)', backdropFilter: 'blur(12px)',
        display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px'
    };

    const contentStyle = isEmbedded ? {
        height: '100%', width: '100%', display: 'flex', flexDirection: 'column'
    } : {
        width: '100%', maxWidth: '480px', height: '90vh', maxHeight: '720px',
        background: '#0B0914', border: '1px solid rgba(0, 229, 255, 0.3)', borderRadius: '16px',
        boxShadow: '0 0 40px rgba(0, 229, 255, 0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden'
    };

    return (
        <div style={panelStyle}>
            <div style={contentStyle}>
                {/* Header */}
                <div style={{
                    padding: '12px 16px', borderBottom: '1px solid rgba(0, 229, 255, 0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'rgba(0, 229, 255, 0.05)', flexShrink: 0
                }}>
                    <div>
                        <div style={{ color: '#00E5FF', fontWeight: 800, fontSize: '13px', letterSpacing: '0.04em' }}>
                            &gt; COMPANION_ROSTER ({allCards.length})
                        </div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>
                            Active Neural Synchronizations
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                            onClick={onOpenCloudVault}
                            title="Cloud Vault Sync"
                            style={{
                                background: 'rgba(245, 166, 35, 0.15)', border: '1px solid #f5a623',
                                color: '#f5a623', borderRadius: '4px', fontSize: '11px', padding: '3px 8px', cursor: 'pointer'
                            }}
                        >
                            ⚡ VAULT
                        </button>
                        {!isEmbedded && onClose && (
                            <button
                                onClick={onClose}
                                style={{
                                    background: 'transparent', border: 'none', color: '#aaa',
                                    fontSize: '18px', cursor: 'pointer', padding: '2px 6px'
                                }}
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter & Search Ribbon */}
                <div style={{
                    padding: '8px 12px', background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(0, 229, 255, 0.1)',
                    display: 'flex', gap: '6px', flexShrink: 0
                }}>
                    <input
                        type="text"
                        placeholder="Search companions..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        style={{
                            flex: 1, padding: '5px 8px', borderRadius: '4px',
                            background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(0, 229, 255, 0.2)',
                            color: '#fff', fontSize: '11px', outline: 'none'
                        }}
                    />
                    <button
                        onClick={() => setFilter(filter === 'ALL' ? 'SSR' : 'ALL')}
                        style={{
                            padding: '4px 8px', borderRadius: '4px',
                            border: `1px solid ${filter === 'SSR' ? '#FFD700' : 'rgba(255,255,255,0.2)'}`,
                            background: filter === 'SSR' ? 'rgba(255, 215, 0, 0.2)' : 'transparent',
                            color: filter === 'SSR' ? '#FFD700' : '#888',
                            fontSize: '10px', fontWeight: 'bold', cursor: 'pointer'
                        }}
                    >
                        {filter === 'SSR' ? '★ SSR' : 'ALL'}
                    </button>
                </div>

                {/* Companion Cards List */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '30px 10px', color: 'rgba(0, 229, 255, 0.4)', fontSize: '11px' }}>
                            &gt; NO_SAVED_COMPANIONS_FOUND
                            <div style={{ marginTop: '4px', fontSize: '9px' }}>Swipe right on cards to bond and archive them here!</div>
                        </div>
                    ) : (
                        filtered.map(card => {
                            const isCurrent = activeCard?.id === card.id || activeCard?.uuid === card.uuid;
                            const isSSR = Boolean(card.metadata?.isSSR);
                            const name = card.characterName || card.metadata?.name || 'Companion';
                            const img = card.imageBlobOrUrl || card.metadata?.imageUrl || card.metadata?.image;
                            const hasGachaFans = Boolean(card.metadata?.hasGachaFans);

                            return (
                                <div
                                    key={card.id || card.uuid}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                        padding: '8px 10px', borderRadius: '8px',
                                        background: isCurrent ? 'rgba(0, 229, 255, 0.12)' : 'rgba(255,255,255,0.03)',
                                        border: `1px solid ${isCurrent ? '#00E5FF' : isSSR ? 'rgba(255, 215, 0, 0.4)' : 'rgba(255,255,255,0.08)'}`,
                                        boxShadow: isCurrent ? '0 0 12px rgba(0, 229, 255, 0.2)' : 'none',
                                        transition: 'all 0.15s'
                                    }}
                                >
                                    <img
                                        src={img}
                                        alt=""
                                        style={{
                                            width: '42px', height: '42px', borderRadius: '8px', objectFit: 'cover',
                                            border: `1.5px solid ${isSSR ? '#FFD700' : '#00E5FF'}`
                                        }}
                                    />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 800, color: '#EBE3D6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {name}
                                            </span>
                                            {isSSR && (
                                                <span style={{ fontSize: '8px', color: '#FFD700', fontWeight: 900, background: 'rgba(255,215,0,0.2)', padding: '1px 4px', borderRadius: '2px' }}>
                                                    SSR
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {card.metadata?.archetype || card.metadata?.personality || 'Devoted Companion'}
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <button
                                            onClick={() => { matrixAudio.playClick(); onSelectCard(card); }}
                                            title="Load to Swipe Deck"
                                            style={{
                                                padding: '4px 6px', borderRadius: '3px',
                                                border: '1px solid rgba(0, 229, 255, 0.3)', background: 'rgba(0, 229, 255, 0.1)',
                                                color: '#00E5FF', fontSize: '9px', fontWeight: 'bold', cursor: 'pointer'
                                            }}
                                        >
                                            LOAD
                                        </button>
                                        <button
                                            onClick={() => { matrixAudio.playClick(); onOpenChat(card); }}
                                            title="Open Chat"
                                            style={{
                                                padding: '4px 6px', borderRadius: '3px',
                                                border: '1px solid rgba(255, 16, 122, 0.3)', background: 'rgba(255, 16, 122, 0.1)',
                                                color: '#FF107A', fontSize: '9px', fontWeight: 'bold', cursor: 'pointer'
                                            }}
                                        >
                                            CHAT
                                        </button>
                                        {hasGachaFans && (
                                            <button
                                                onClick={() => { matrixAudio.playClick(); onOpenGachaFans(card); }}
                                                title="Open GachaFans VIP"
                                                style={{
                                                    padding: '4px 5px', borderRadius: '3px',
                                                    border: '1px solid rgba(255, 215, 0, 0.4)', background: 'rgba(255, 215, 0, 0.1)',
                                                    color: '#FFD700', fontSize: '9px', cursor: 'pointer'
                                                }}
                                            >
                                                ⭐
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer Controls */}
                <div style={{
                    padding: '8px 12px', borderTop: '1px solid rgba(0, 229, 255, 0.15)',
                    background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', flexShrink: 0
                }}>
                    <button
                        onClick={onOpenSettings}
                        style={{
                            background: 'transparent', border: 'none', color: '#aaa',
                            fontSize: '11px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                    >
                        ⚙️ SETTINGS
                    </button>
                    <div style={{ fontSize: '9px', color: '#00FF41' }}>
                        ● MATRIX_LINK_ONLINE
                    </div>
                </div>
            </div>
        </div>
    );
}
