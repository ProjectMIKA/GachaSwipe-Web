import React, { useState } from 'react';
import { useCards, deleteCard, saveCard } from './db.js';

export function RosterModal({ isOpen, onClose, onSelectCard, onOpenChat }) {
    const cards = useCards() || [];
    const [selectedTab, setSelectedTab] = useState('all'); // 'all' | 'ssr'

    if (!isOpen) return null;

    const filteredCards = selectedTab === 'ssr' 
        ? cards.filter(c => c.metadata?.isSSR) 
        : cards;

    const handleExport = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cards, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `gachaswipe_deck_export_${Date.now()}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
    };

    const handleImport = (e) => {
        const fileReader = new FileReader();
        if (e.target.files && e.target.files[0]) {
            fileReader.readAsText(e.target.files[0], "UTF-8");
            fileReader.onload = async (event) => {
                try {
                    const parsed = JSON.parse(event.target.result);
                    if (Array.isArray(parsed)) {
                        for (const c of parsed) {
                            await saveCard({
                                characterName: c.characterName || c.name,
                                imageBlobOrUrl: c.imageBlobOrUrl || c.imageUrl || c.image,
                                metadata: c.metadata || c
                            });
                        }
                    }
                } catch (err) {
                    alert("Failed to import JSON deck: " + err.message);
                }
            };
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            backgroundColor: 'rgba(5, 3, 10, 0.85)', backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)', display: 'flex', justifyContent: 'center', alignItems: 'center',
            padding: '16px'
        }}>
            <div style={{
                width: '100%', maxWidth: '640px', height: '85vh', maxHeight: '740px',
                background: 'linear-gradient(180deg, #130d24 0%, #080511 100%)',
                border: '1px solid rgba(255, 16, 122, 0.35)', borderRadius: '20px',
                boxShadow: '0 0 45px rgba(255, 16, 122, 0.2), inset 0 0 20px rgba(255, 16, 122, 0.05)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
                fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace"
            }}>
                {/* Header */}
                <div style={{
                    padding: '18px 24px', borderBottom: '1px solid rgba(255, 16, 122, 0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'rgba(255, 16, 122, 0.05)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '22px' }}>🎴</span>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '16px', color: '#ff77a9', letterSpacing: '0.05em' }}>
                                &gt; COMPANION_ROSTER_ARCHIVE
                            </h2>
                            <div style={{ fontSize: '11px', color: '#888' }}>
                                Total Vault Units: {cards.length}
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                            onClick={handleExport}
                            style={{
                                padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(0, 229, 255, 0.4)',
                                background: 'rgba(0, 229, 255, 0.1)', color: '#00E5FF', fontSize: '11px',
                                cursor: 'pointer', fontWeight: 700
                            }}
                        >
                            EXPORT
                        </button>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'transparent', border: 'none', color: '#aaa',
                                fontSize: '20px', cursor: 'pointer', padding: '4px 8px'
                            }}
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div style={{ display: 'flex', padding: '12px 20px', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <button
                        onClick={() => setSelectedTab('all')}
                        style={{
                            padding: '6px 14px', borderRadius: '6px', border: 'none',
                            background: selectedTab === 'all' ? '#ff107a' : 'rgba(255,255,255,0.06)',
                            color: '#fff', fontSize: '11px', fontWeight: 700, cursor: 'pointer'
                        }}
                    >
                        ALL COMPANIONS ({cards.length})
                    </button>
                    <button
                        onClick={() => setSelectedTab('ssr')}
                        style={{
                            padding: '6px 14px', borderRadius: '6px', border: 'none',
                            background: selectedTab === 'ssr' ? '#FFD700' : 'rgba(255,255,255,0.06)',
                            color: selectedTab === 'ssr' ? '#000' : '#fff', fontSize: '11px', fontWeight: 800, cursor: 'pointer'
                        }}
                    >
                        ✨ SSR ONLY ({cards.filter(c => c.metadata?.isSSR).length})
                    </button>
                </div>

                {/* Grid Content */}
                <div style={{
                    flex: 1, padding: '20px', overflowY: 'auto',
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                    gap: '16px', alignContent: 'start'
                }}>
                    {filteredCards.length === 0 ? (
                        <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px', color: '#777' }}>
                            No companions found in this vault section, Master!
                        </div>
                    ) : (
                        filteredCards.map((c) => {
                            const isSSR = c.metadata?.isSSR;
                            const img = c.imageBlobOrUrl || c.metadata?.imageUrl || c.metadata?.image;
                            return (
                                <div
                                    key={c.id}
                                    style={{
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        border: `1px solid ${isSSR ? '#FFD700' : 'rgba(0, 229, 255, 0.25)'}`,
                                        borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column',
                                        boxShadow: isSSR ? '0 0 15px rgba(255, 215, 0, 0.25)' : 'none',
                                        transition: 'transform 0.2s', position: 'relative'
                                    }}
                                >
                                    <div style={{ width: '100%', height: '140px', position: 'relative', overflow: 'hidden' }}>
                                        <img
                                            src={img}
                                            alt=""
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                        {isSSR && (
                                            <span style={{
                                                position: 'absolute', top: '6px', right: '6px',
                                                background: '#FFD700', color: '#000', fontSize: '9px',
                                                fontWeight: 900, padding: '2px 6px', borderRadius: '4px'
                                            }}>
                                                SSR
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                                        <div style={{ color: '#fff', fontSize: '12px', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {c.characterName}
                                        </div>
                                        <div style={{ fontSize: '10px', color: '#ff77a9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {c.metadata?.archetype || 'Companion'}
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px', marginTop: 'auto', paddingTop: '6px' }}>
                                            <button
                                                onClick={() => { onOpenChat(c); onClose(); }}
                                                style={{
                                                    flex: 1, padding: '5px', borderRadius: '6px', border: 'none',
                                                    background: 'rgba(0, 229, 255, 0.2)', color: '#00E5FF',
                                                    fontSize: '10px', fontWeight: 700, cursor: 'pointer'
                                                }}
                                            >
                                                CHAT
                                            </button>
                                            <button
                                                onClick={() => { onSelectCard(c); onClose(); }}
                                                style={{
                                                    flex: 1, padding: '5px', borderRadius: '6px', border: 'none',
                                                    background: 'rgba(255, 16, 122, 0.2)', color: '#ff77a9',
                                                    fontSize: '10px', fontWeight: 700, cursor: 'pointer'
                                                }}
                                            >
                                                VIEW
                                            </button>
                                            <button
                                                onClick={() => deleteCard(c.id)}
                                                title="Delete Card"
                                                style={{
                                                    padding: '5px 8px', borderRadius: '6px', border: 'none',
                                                    background: 'rgba(255, 255, 255, 0.05)', color: '#888',
                                                    fontSize: '10px', cursor: 'pointer'
                                                }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
