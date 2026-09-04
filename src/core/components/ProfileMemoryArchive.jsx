import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as Constants from '../data/constants.js';

export const ProfileMemoryArchive = ({ waifuId, isFriend }) => {
        const [memories, setMemories] = useState(null);
        const [loading, setLoading] = useState(true);

        useEffect(() => {
            let isActive = true;
            if (!isFriend) {
                setMemories([]);
                setLoading(false);
                return;
            }
            const fetchMems = async () => {
                if (window.LaylaSDK) {
                    try {
                        const layla = new window.LaylaSDK();
                        const mems = await layla.memories.list(waifuId, 0, 5);
                        if (isActive) {
                            setMemories(mems || []);
                            setLoading(false);
                        }
                    } catch (e) {
                        if (isActive) {
                            setMemories([]);
                            setLoading(false);
                        }
                    }
                }
            };
            fetchMems();
            return () => { isActive = false; };
        }, [waifuId, isFriend]);

        if (!isFriend) return null;

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start', marginTop: '16px', width: '100%' }}>
                <span style={{ fontSize: 10, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#B533FF' }}>&gt; EXTRACTED_CORE_MEMORIES</span>
                
                <div style={{ width: '100%', background: 'rgba(181, 51, 255, 0.05)', border: '1px solid rgba(181, 51, 255, 0.3)', borderRadius: '8px', padding: '12px', maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: 'inset 0 0 10px rgba(181,51,255,0.05)' }}>
                    {loading ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', justifyContent: 'center' }}>
                            <div className="resume-spinner" style={{ width: '14px', height: '14px', borderWidth: '2px', borderColor: 'rgba(181,51,255,0.2)', borderTopColor: '#B533FF' }}></div>
                            <span style={{ color: '#B533FF', fontSize: '10px', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", animation: 'csd-pulse 1.5s infinite', fontWeight: 'bold' }}>[ DECRYPTING_MEMORY_BANKS... ]</span>
                        </div>
                    ) : memories && memories.length > 0 ? (
                        memories.map((m, i) => (
                            <div key={m.id || i} style={{ fontSize: '11px', color: '#EBE3D6', lineHeight: 1.4, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", padding: '8px', background: 'rgba(0,0,0,0.4)', borderRadius: '4px', borderLeft: '2px solid #B533FF' }}>
                                <div style={{ color: '#B533FF', fontSize: '9px', marginBottom: '4px', opacity: 0.8, fontWeight: 'bold', letterSpacing: '0.05em' }}>🧠 LOG_{new Date(m.timestamp || Date.now()).toLocaleDateString().replace(/\//g, '.')}</div>
                                <div style={{ fontStyle: 'italic', opacity: 0.9 }}>"{m.summary || m.rawText}"</div>
                            </div>
                        ))
                    ) : (
                        <div style={{ fontSize: '10px', color: 'rgba(181, 51, 255, 0.5)', fontStyle: 'italic', textAlign: 'center', padding: '10px', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontWeight: 'bold' }}>
                            [ NO_NEURAL_DATA_FOUND ]
                        </div>
                    )}
                </div>
            </div>
        );
    };

