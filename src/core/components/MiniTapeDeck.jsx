import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as Constants from '../data/constants.js';
import { PlayIcon, PauseIcon } from './Icons.jsx';

export const STORAGE_KEY_MINIGAME_TRACKS = 'gachaswipe_minigame_custom_tracks';

export const getStoredMinigameTracks = () => {
    try {
        if (typeof localStorage !== 'undefined') {
            const raw = localStorage.getItem(STORAGE_KEY_MINIGAME_TRACKS);
            return raw ? JSON.parse(raw) : [];
        }
    } catch (e) {}
    return [];
};

export const setStoredMinigameTracks = (tracks) => {
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(STORAGE_KEY_MINIGAME_TRACKS, JSON.stringify(tracks));
        }
    } catch (e) {}
};

export const MiniTapeDeck = ({ tape, onRename, onDelete, themeColor = '#00E5FF', onExportMsg, onPlayGlobal, useNativeAudio = false }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const tColor = themeColor || '#00E5FF';

    // 🎮 Minigame Playlist Selection State
    const [isMinigameTrack, setIsMinigameTrack] = useState(() => {
        const list = getStoredMinigameTracks();
        return list.some(t => t.id === tape.id);
    });

    useEffect(() => {
        const handleSyncTracks = () => {
            const list = getStoredMinigameTracks();
            setIsMinigameTrack(list.some(t => t.id === tape.id));
        };
        window.addEventListener('mika-minigame-tracks-changed', handleSyncTracks);
        return () => window.removeEventListener('mika-minigame-tracks-changed', handleSyncTracks);
    }, [tape.id]);

    const toggleMinigameTrack = (e) => {
        if (e) e.stopPropagation();
        const list = getStoredMinigameTracks();
        const exists = list.some(t => t.id === tape.id);
        let updated;
        if (exists) {
            updated = list.filter(t => t.id !== tape.id);
            setIsMinigameTrack(false);
            if (onExportMsg) onExportMsg("Removed from minigame playlist! ⏹️");
        } else {
            updated = [...list, {
                id: tape.id,
                name: tape.name || 'Custom Track',
                audioUrl: tape.audioUrl,
                genre: tape.genre
            }];
            setIsMinigameTrack(true);
            if (onExportMsg) onExportMsg("Song will be used in the minigame! 🎮");
        }
        setStoredMinigameTracks(updated);
        window.dispatchEvent(new CustomEvent('mika-minigame-tracks-changed'));
    };

    // Sync with the global player!
    useEffect(() => {
        const handleSync = (e) => {
            if (e.detail.id === tape.id) {
                setCurrentTime(e.detail.currentTime);
                setDuration(e.detail.duration);
                setIsPlaying(e.detail.isPlaying);
            } else {
                setIsPlaying(false);
            }
        };
        window.addEventListener('mika-music-sync', handleSync);
        window.dispatchEvent(new CustomEvent('mika-music-request-sync'));
        return () => window.removeEventListener('mika-music-sync', handleSync);
    }, [tape.id]);

    const togglePlay = (e) => {
        if (e) e.stopPropagation();
        if (onPlayGlobal) onPlayGlobal(tape);
        window.dispatchEvent(new CustomEvent('mika-music-command', { detail: { id: tape.id, action: 'togglePlay' } }));
    };

    const handleExport = async (e) => {
        if (e) e.stopPropagation();
        if (!window.LaylaSDK || !tape.audioUrl) return;
        try {
            const layla = new window.LaylaSDK();
            let b64ToSave = tape.audioUrl;
            if (tape.audioUrl.startsWith('data:') || tape.audioUrl.startsWith('blob:')) {
                if (tape.audioUrl.startsWith('blob:')) {
                    const res = await fetch(tape.audioUrl);
                    const blob = await res.blob();
                    const reader = new FileReader();
                    await new Promise(r => { reader.onloadend = () => { b64ToSave = reader.result; r(); }; reader.readAsDataURL(blob); });
                }
                b64ToSave = b64ToSave.split(',')[1];
            } else {
                const res = await layla.utils.readFile(tape.audioUrl);
                if (res && res.content_base64) {
                    b64ToSave = res.content_base64.includes(',') ? res.content_base64.split(',')[1] : res.content_base64;
                }
            }
            const safeName = (tape.name || 'Master_Track').replace(/[^a-zA-Z0-9]/g, '_');
            const isMp3 = tape.audioUrl.includes('audio/mp3') || tape.audioUrl.endsWith('.mp3');
            const fileExt = isMp3 ? 'mp3' : 'wav';
            await layla.utils.saveFile(`${safeName}.${fileExt}`, b64ToSave, true);
            if (onExportMsg) onExportMsg("Track routed to Share Sheet! 💽");
        } catch(err) { if (onExportMsg) onExportMsg("Failed to export track! 🚫"); }
    };

    const formatTime = (t) => { if (isNaN(t) || !isFinite(t)) return "0:00"; return `${Math.floor(t / 60)}:${Math.floor(t % 60).toString().padStart(2, '0')}`; };

    return (
        <div style={{ background: 'linear-gradient(180deg, #110E1A 0%, #050308 100%)', border: `1px solid ${tColor}50`, borderRadius: '12px', padding: '16px', boxShadow: `0 8px 24px rgba(0,0,0,0.8), inset 0 0 20px ${tColor}15`, marginBottom: '16px', animation: 'expandDown 0.3s ease-out forwards', transformOrigin: 'top' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div style={{ flex: 1, minWidth: 0, paddingRight: '12px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: '9px', color: tColor, fontWeight: 'bold', letterSpacing: '0.1em', marginBottom: '4px', fontFamily: "monospace" }}>[ TAPE: {(tape.genre || 'UNKNOWN').toUpperCase()} ]</div>
                    <div className="smart-scroll-box" style={{ width: '100%', justifyContent: 'flex-start' }}>
                        <h3 className="smart-scroll-content" style={{ margin: 0, color: '#fff', fontSize: '18px', textShadow: `0 0 8px ${tColor}80` }}>
                            {tape.name || 'Untitled'}
                        </h3>
                    </div>
                </div>
                {onRename && onDelete && (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {/* 🎮 1. MINIGAME AUDIO SELECT BUTTON */}
                        <button 
                            onClick={toggleMinigameTrack} 
                            title={isMinigameTrack ? "Selected for Matrix Minigame! (Click to remove)" : "Use this song in Matrix Minigame!"}
                            style={{ 
                                background: isMinigameTrack ? 'rgba(0, 255, 153, 0.18)' : 'rgba(255, 255, 255, 0.04)', 
                                border: `1px solid ${isMinigameTrack ? '#00FF99' : 'rgba(255, 255, 255, 0.15)'}`, 
                                color: isMinigameTrack ? '#00FF99' : 'rgba(255, 255, 255, 0.45)', 
                                borderRadius: '6px', 
                                width: '30px', 
                                height: '30px', 
                                cursor: 'pointer', 
                                display: 'grid', 
                                placeItems: 'center',
                                boxShadow: isMinigameTrack ? '0 0 10px rgba(0, 255, 153, 0.5)' : 'none',
                                transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                backdropFilter: 'blur(4px)',
                                WebkitBackdropFilter: 'blur(4px)'
                            }}
                            onMouseOver={e => {
                                e.currentTarget.style.transform = 'scale(1.08)';
                                if (!isMinigameTrack) {
                                    e.currentTarget.style.borderColor = 'rgba(0, 255, 153, 0.5)';
                                    e.currentTarget.style.color = '#00FF99';
                                }
                            }}
                            onMouseOut={e => {
                                e.currentTarget.style.transform = 'scale(1)';
                                if (!isMinigameTrack) {
                                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.45)';
                                }
                            }}
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="6" width="20" height="12" rx="4"></rect>
                                <line x1="6" y1="12" x2="10" y2="12"></line>
                                <line x1="8" y1="10" x2="8" y2="14"></line>
                                <circle cx="17" cy="10" r="1" fill="currentColor"></circle>
                                <circle cx="15" cy="13" r="1" fill="currentColor"></circle>
                            </svg>
                        </button>

                        {/* ✏️ 2. EDIT / RENAME BUTTON */}
                        <button 
                            onClick={(e) => { e.stopPropagation(); onRename(tape.id); }} 
                            title="Rename Tape"
                            style={{ 
                                background: 'rgba(0, 229, 255, 0.08)', 
                                border: `1px solid ${tColor}60`, 
                                color: tColor, 
                                borderRadius: '6px', 
                                width: '30px', 
                                height: '30px', 
                                cursor: 'pointer', 
                                display: 'grid', 
                                placeItems: 'center',
                                boxShadow: `0 0 8px ${tColor}20`,
                                transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                backdropFilter: 'blur(4px)',
                                WebkitBackdropFilter: 'blur(4px)'
                            }}
                            onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = `0 0 12px ${tColor}60`; }}
                            onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = `0 0 8px ${tColor}20`; }}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 20h9"></path>
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                            </svg>
                        </button>

                        {/* 💾 3. SAVE / EXPORT BUTTON */}
                        <button 
                            onClick={handleExport} 
                            title="Export Track to Device"
                            style={{ 
                                background: 'rgba(255, 215, 0, 0.08)', 
                                border: '1px solid rgba(255, 215, 0, 0.45)', 
                                color: '#FFD700', 
                                borderRadius: '6px', 
                                width: '30px', 
                                height: '30px', 
                                cursor: 'pointer', 
                                display: 'grid', 
                                placeItems: 'center',
                                boxShadow: '0 0 8px rgba(255, 215, 0, 0.20)',
                                transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                backdropFilter: 'blur(4px)',
                                WebkitBackdropFilter: 'blur(4px)'
                            }}
                            onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(255, 215, 0, 0.60)'; }}
                            onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 0 8px rgba(255, 215, 0, 0.20)'; }}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                <polyline points="7 3 7 8 15 8"></polyline>
                            </svg>
                        </button>

                        {/* 🗑️ 4. DELETE BUTTON */}
                        <button 
                            onClick={(e) => { 
                                e.stopPropagation(); 
                                // Clean up from minigame playlist if deleted
                                const list = getStoredMinigameTracks();
                                if (list.some(t => t.id === tape.id)) {
                                    setStoredMinigameTracks(list.filter(t => t.id !== tape.id));
                                    window.dispatchEvent(new CustomEvent('mika-minigame-tracks-changed'));
                                }
                                onDelete(tape.id); 
                            }} 
                            title="Delete Tape"
                            style={{ 
                                background: 'rgba(255, 51, 51, 0.08)', 
                                border: '1px solid rgba(255, 51, 51, 0.45)', 
                                color: '#FF4444', 
                                borderRadius: '6px', 
                                width: '30px', 
                                height: '30px', 
                                cursor: 'pointer', 
                                display: 'grid', 
                                placeItems: 'center',
                                boxShadow: '0 0 8px rgba(255, 51, 51, 0.20)',
                                transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                backdropFilter: 'blur(4px)',
                                WebkitBackdropFilter: 'blur(4px)'
                            }}
                            onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.08)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(255, 51, 51, 0.60)'; }}
                            onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 0 8px rgba(255, 51, 51, 0.20)'; }}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                        </button>
                    </div>
                )}
            </div>
            
            <div 
                onClick={(e) => {
                    e.stopPropagation();
                    if (onPlayGlobal) {
                        onPlayGlobal(tape);
                        setTimeout(() => window.dispatchEvent(new CustomEvent('mika-music-command', { detail: { id: tape.id, action: 'openFullscreen' } })), 50);
                    }
                }}
                style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px 0', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', border: `1px solid ${tColor}30`, marginBottom: '16px', cursor: onPlayGlobal ? 'pointer' : 'default' }}
                title={onPlayGlobal ? "Open Fullscreen Player" : ""}
            >
                <div className={`tape-reel ${isPlaying ? 'spinning' : ''}`} style={{ width: '48px', height: '48px', borderColor: tColor, boxShadow: `0 0 10px ${tColor}40` }}><div className="tape-spoke" style={{ background: tColor }}></div><div className="tape-spoke" style={{ background: tColor, transform: 'rotate(60deg)' }}></div><div className="tape-spoke" style={{ background: tColor, transform: 'rotate(120deg)' }}></div><div className="tape-hub" style={{borderColor: tColor}}></div></div>
                <div style={{ width: '120px', height: '16px', background: '#000', margin: '0 20px', borderRadius: '2px', border: '1px solid rgba(255,255,255,0.1)', position: 'relative' }}><div style={{ position: 'absolute', top: '50%', left: '0', right: '0', height: '1px', background: 'rgba(255,255,255,0.2)', transform: 'translateY(-50%)' }}></div></div>
                <div className={`tape-reel ${isPlaying ? 'spinning' : ''}`} style={{ width: '48px', height: '48px', borderColor: tColor, boxShadow: `0 0 10px ${tColor}40` }}><div className="tape-spoke" style={{ background: tColor }}></div><div className="tape-spoke" style={{ background: tColor, transform: 'rotate(60deg)' }}></div><div className="tape-spoke" style={{ background: tColor, transform: 'rotate(120deg)' }}></div><div className="tape-hub" style={{borderColor: tColor}}></div></div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button onClick={togglePlay} style={{ width: '40px', height: '40px', borderRadius: '50%', border: 'none', background: tColor, color: '#000', display: 'grid', placeItems: 'center', cursor: 'pointer', boxShadow: `0 0 15px ${tColor}80`, flexShrink: 0 }}>
                    {isPlaying ? <PauseIcon size={18}/> : <PlayIcon size={18}/>}
                </button>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontFamily: "monospace" }}>
                        <span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span>
                    </div>
                    <input 
                        type="range" 
                        min="0" 
                        max={duration || 100} 
                        value={currentTime} 
                        readOnly={useNativeAudio}
                        onChange={e => { 
                            if (useNativeAudio) return;
                            e.stopPropagation(); 
                            window.dispatchEvent(new CustomEvent('mika-music-command', { detail: { id: tape.id, action: 'seek', time: parseFloat(e.target.value) } }));
                        }} 
                        style={{ width: '100%', accentColor: tColor, cursor: useNativeAudio ? 'default' : 'pointer', height: '4px', pointerEvents: useNativeAudio ? 'none' : 'auto', background: 'rgba(255,255,255,0.2)' }} 
                        onClick={e => e.stopPropagation()} 
                    />
                </div>
            </div>
        </div>
    );
};