import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as Constants from '../data/constants.js';
import { PlayIcon, PauseIcon, XIcon } from './Icons.jsx';

export const GlobalMusicPlayer = ({ tape, archive, onSelectTape, onClose, useNativeAudio = false, themeColor = '#00E5FF' }) => {
            const audioRef = useRef(null);
            const pillRef = useRef(null);
            const [isPlaying, setIsPlaying] = useState(false);
            const [currentTime, setCurrentTime] = useState(0);
            const [duration, setDuration] = useState(0);
            const [showLyrics, setShowLyrics] = useState(false);
            const [isMinimized, setIsMinimized] = useState(true);
            const [isMicro, setIsMicro] = useState(true);
            const [blobUrl, setBlobUrl] = useState(null);

            // ✨ DRAG PHYSICS & BOUNDING BOX ✨
            const pos = useRef({ x: 20, y: 80 });
            const dragInfo = useRef({ isDragging: false, startX: 0, startY: 0, initialX: 0, initialY: 0, hasMoved: false });

            const clampPosition = (x, y, microState) => {
                const pillWidth = microState ? 52 : 220; 
                const pillHeight = 52;
                const maxX = window.innerWidth - pillWidth - 10;
                const maxY = window.innerHeight - pillHeight - 10;
                return { x: Math.max(10, Math.min(x, maxX)), y: Math.max(30, Math.min(y, maxY)) };
            };

            const handlePointerDown = (e) => {
                dragInfo.current.isDragging = true;
                dragInfo.current.hasMoved = false;
                dragInfo.current.startX = e.clientX;
                dragInfo.current.startY = e.clientY;
                dragInfo.current.initialX = pos.current.x;
                dragInfo.current.initialY = pos.current.y;
                try { e.currentTarget.setPointerCapture(e.pointerId); } catch(err){}
                if (pillRef.current) pillRef.current.style.transition = 'none';
            };

            const handlePointerMove = (e) => {
                if (!dragInfo.current.isDragging) return;
                const dx = e.clientX - dragInfo.current.startX;
                const dy = e.clientY - dragInfo.current.startY;
                if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragInfo.current.hasMoved = true;
                const clamped = clampPosition(dragInfo.current.initialX + dx, dragInfo.current.initialY + dy, isMicro);
                pos.current.x = clamped.x;
                pos.current.y = clamped.y;
                if (pillRef.current) pillRef.current.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;
            };

            const handlePointerUp = () => { 
                dragInfo.current.isDragging = false; 
                if (pillRef.current) pillRef.current.style.transition = 'width 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), background 0.4s ease, padding 0.4s ease, transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            };
            
            const handleReelClick = (e) => {
                if (dragInfo.current.hasMoved) return;
                e.stopPropagation();
                const nextMicro = !isMicro;
                setIsMicro(nextMicro);
                
                const clamped = clampPosition(pos.current.x, pos.current.y, nextMicro);
                pos.current.x = clamped.x;
                pos.current.y = clamped.y;
                if (pillRef.current) {
                    pillRef.current.style.transition = 'width 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), background 0.4s ease, padding 0.4s ease, transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                    pillRef.current.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;
                }
            };

            const handleTextClick = (e) => {
                if (dragInfo.current.hasMoved) return;
                e.stopPropagation();
                setIsMinimized(false);
            };

            // Audio Blob Loader for Internal Player
            useEffect(() => {
                let isActive = true;
                const loadAudio = async () => {
                    if (!tape.audioUrl) return;
                    if (tape.audioUrl.startsWith('data:') || tape.audioUrl.startsWith('blob:')) {
                        setBlobUrl(tape.audioUrl);
                        return;
                    }
                    try {
                        const layla = new window.LaylaSDK();
                        const res = await layla.utils.readFile(tape.audioUrl);
                        if (res && res.content_base64 && isActive) {
                            const b64Data = res.content_base64.includes(',') ? res.content_base64.split(',')[1] : res.content_base64;
                            const contentType = res.content_base64.includes(';') ? res.content_base64.split(';')[0].split(':')[1] : 'audio/wav';
                            const byteCharacters = atob(b64Data);
                            const byteNumbers = new Array(byteCharacters.length);
                            for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
                            const byteArray = new Uint8Array(byteNumbers);
                            const blob = new Blob([byteArray], { type: contentType });
                            setBlobUrl(URL.createObjectURL(blob));
                        }
                    } catch (e) {
                        console.error("Failed to load global audio", e);
                    }
                };
                loadAudio();
                return () => {
                    isActive = false;
                    if (blobUrl && blobUrl.startsWith('blob:')) URL.revokeObjectURL(blobUrl);
                };
            }, [tape.audioUrl]);

            // ==========================================
            // 1. NATIVE ANDROID BACKGROUND ENGINE BRANCH
            // ==========================================
            const isNativeAdvanceRef = useRef(false);
            const queueRef = useRef([]);

            useEffect(() => {
                if (!useNativeAudio || !window.LaylaSDK || !tape.audioUrl) return;

                if (isNativeAdvanceRef.current) {
                    isNativeAdvanceRef.current = false;
                    return;
                }

                const layla = new window.LaylaSDK();
                const startIndex = archive.findIndex(t => t.id === tape.id || (t.audioUrl && t.audioUrl === tape.audioUrl));
                const isSample = !!tape.isSample || startIndex === -1;
                const activeQueue = isSample ? [tape] : (startIndex > -1 ? archive.slice(startIndex) : [tape]);
                queueRef.current = activeQueue; 
                
                const audioFiles = activeQueue.map(t => t.audioUrl);

                layla.backgroundAudio.start(audioFiles, {
                    title: tape.name || 'Untitled Track',
                    artist: `Ace-Step // ${tape.genre || 'CyberDeck'}`
                });

                setIsPlaying(true);
            }, [tape.id, tape.audioUrl, archive, useNativeAudio]);

            useEffect(() => {
                if (!useNativeAudio || !window.LaylaSDK) return;
                const layla = new window.LaylaSDK();

                const onTrackChanged = ({ currentIndex }) => {
                    const nextTape = queueRef.current[currentIndex];
                    if (nextTape && nextTape.id !== tape.id) {
                        isNativeAdvanceRef.current = true;
                        onSelectTape(nextTape);
                    }
                };

                const onStatus = (status) => {
                    setCurrentTime(status.currentTime || 0);
                    setDuration(status.duration || 0);
                    setIsPlaying(status.playing);
                };

                const onFinished = () => {
                    setIsPlaying(false);
                    setCurrentTime(0);
                };

                layla.backgroundAudio.on('trackChanged', onTrackChanged);
                layla.backgroundAudio.on('status', onStatus);
                layla.backgroundAudio.on('finished', onFinished);

                return () => {
                    layla.backgroundAudio.off('trackChanged', onTrackChanged);
                    layla.backgroundAudio.off('status', onStatus);
                    layla.backgroundAudio.off('finished', onFinished);
                };
            }, [tape.id, onSelectTape, useNativeAudio]);

            // Clean up native engine on unmount / switch
            useEffect(() => {
                return () => {
                    if (useNativeAudio && window.LaylaSDK) new window.LaylaSDK().backgroundAudio.stop();
                };
            }, [useNativeAudio]);

            // ==========================================
            // 2. INTERNAL WEB PLAYER BRANCH (SEEK SUPPORT)
            // ==========================================
            useEffect(() => {
                if (useNativeAudio) return;
                if ('mediaSession' in navigator && tape) {
                    navigator.mediaSession.metadata = new MediaMetadata({
                        title: tape.name || 'Untitled Track',
                        artist: `Ace-Step // ${tape.genre || 'CyberDeck'}`,
                        album: 'Tape Archive'
                    });

                    navigator.mediaSession.setActionHandler('play', () => { audioRef.current?.play(); setIsPlaying(true); });
                    navigator.mediaSession.setActionHandler('pause', () => { audioRef.current?.pause(); setIsPlaying(false); });
                    navigator.mediaSession.setActionHandler('previoustrack', () => handlePrevTrack());
                    navigator.mediaSession.setActionHandler('nexttrack', () => handleNextTrack());
                    navigator.mediaSession.setActionHandler('seekto', (details) => {
                        if (details.seekTime && audioRef.current) {
                            audioRef.current.currentTime = details.seekTime;
                            setCurrentTime(details.seekTime);
                        }
                    });
                }
            }, [tape, archive, useNativeAudio]);

            // ==========================================
            // 3. SHARED SYNC & REMOTE COMMAND CONTROLLER
            // ==========================================
            useEffect(() => {
                const sync = () => {
                    window.dispatchEvent(new CustomEvent('mika-music-sync', {
                        detail: { id: tape.id, currentTime, duration, isPlaying }
                    }));
                };
                sync();
                window.addEventListener('mika-music-request-sync', sync);
                return () => window.removeEventListener('mika-music-request-sync', sync);
            }, [tape.id, currentTime, duration, isPlaying]);

            useEffect(() => {
                const handleCommand = async (e) => {
                    if (e.detail?.action === 'stopAll' || e.detail?.action === 'stop') {
                        if (useNativeAudio && window.LaylaSDK) {
                            try { await new window.LaylaSDK().backgroundAudio.stop(); } catch(err){}
                        } else if (audioRef.current) {
                            audioRef.current.pause();
                            audioRef.current.currentTime = 0;
                        }
                        setIsPlaying(false);
                        return;
                    }

                    if (e.detail?.id && e.detail.id !== tape.id) return;
                    
                    if (e.detail.action === 'togglePlay') {
                        if (useNativeAudio && window.LaylaSDK) {
                            const layla = new window.LaylaSDK();
                            if (isPlaying) { await layla.backgroundAudio.pause(); setIsPlaying(false); }
                            else { await layla.backgroundAudio.resume(); setIsPlaying(true); }
                        } else {
                            if (isPlaying) { audioRef.current?.pause(); setIsPlaying(false); }
                            else { audioRef.current?.play().then(()=>setIsPlaying(true)).catch(()=>{}); }
                        }
                    }
                    if (e.detail.action === 'seek' && !useNativeAudio && audioRef.current) {
                        audioRef.current.currentTime = e.detail.time;
                        setCurrentTime(e.detail.time);
                    }
                    if (e.detail.action === 'openFullscreen') {
                        setIsMinimized(false);
                        setIsMicro(false);
                    }
                };
                window.addEventListener('mika-music-command', handleCommand);
                return () => window.removeEventListener('mika-music-command', handleCommand);
            }, [tape.id, isPlaying, useNativeAudio]);

            const togglePlay = async (e) => {
                if (e) e.stopPropagation();
                if (useNativeAudio && window.LaylaSDK) {
                    const layla = new window.LaylaSDK();
                    if (isPlaying) { await layla.backgroundAudio.pause(); setIsPlaying(false); }
                    else { await layla.backgroundAudio.resume(); setIsPlaying(true); }
                } else {
                    if (!audioRef.current || !blobUrl) return;
                    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
                    else audioRef.current.play().then(() => setIsPlaying(true)).catch(err => setIsPlaying(false));
                }
            };

            const handleNextTrack = async (e) => {
                if (e) e.stopPropagation();
                if (tape.isSample) {
                    // Samples loop back to the start!
                    if (useNativeAudio && window.LaylaSDK) {
                        try {
                            const layla = new window.LaylaSDK();
                            await layla.backgroundAudio.start([tape.audioUrl], {
                                title: tape.name || 'Untitled Sample',
                                artist: `Ace-Step // ${tape.genre || 'CyberDeck'}`
                            });
                        } catch(err){}
                        return;
                    }
                    if (audioRef.current) {
                        audioRef.current.currentTime = 0;
                        audioRef.current.play().catch(() => {});
                    }
                    return;
                }

                if (useNativeAudio && window.LaylaSDK) {
                    await new window.LaylaSDK().backgroundAudio.skip();
                    return;
                }
                if (!archive || archive.length <= 1) {
                    if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => {}); }
                    return;
                }
                const currentIndex = archive.findIndex(t => t.id === tape.id || (t.audioUrl && t.audioUrl === tape.audioUrl));
                if (currentIndex === -1) {
                    if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => {}); }
                    return;
                }
                const nextIndex = (currentIndex + 1) % archive.length;
                onSelectTape(archive[nextIndex]);
            };

            const handlePrevTrack = async (e) => {
                if (e) e.stopPropagation();
                if (useNativeAudio && window.LaylaSDK) {
                    if (currentTime > 3) {
                        const layla = new window.LaylaSDK();
                        const audioFiles = queueRef.current.map(t => t.audioUrl);
                        await layla.backgroundAudio.start(audioFiles, { title: tape.name, artist: `Ace-Step // ${tape.genre}` });
                        return;
                    }
                    if (!archive || archive.length <= 1) return;
                    const currentIndex = archive.findIndex(t => t.id === tape.id);
                    const prevIndex = (currentIndex - 1 + archive.length) % archive.length;
                    onSelectTape(archive[prevIndex]);
                    return;
                }
                
                if (audioRef.current && audioRef.current.currentTime > 3) {
                    audioRef.current.currentTime = 0;
                    return;
                }
                if (!archive || archive.length <= 1) return;
                const currentIndex = archive.findIndex(t => t.id === tape.id);
                const prevIndex = (currentIndex - 1 + archive.length) % archive.length;
                onSelectTape(archive[prevIndex]);
            };

            const handleSeek = (val) => {
                if (useNativeAudio) return;
                if (audioRef.current) {
                    audioRef.current.currentTime = val;
                    setCurrentTime(val);
                }
            };

            const formatTime = (t) => { if (isNaN(t) || !isFinite(t)) return "0:00"; return `${Math.floor(t / 60)}:${Math.floor(t % 60).toString().padStart(2, '0')}`; };

            return (
                <React.Fragment>
                    <style>{`
                        @keyframes textMarquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
                        @keyframes pulseRing { 0% { transform: scale(0.8); opacity: 0.8; } 100% { transform: scale(1.5); opacity: 0; } }
                    `}</style>

                    {/* Internal HTML5 Audio Element (Only active when Native Player is OFF) */}
                    {!useNativeAudio && blobUrl && (
                        <audio 
                            ref={audioRef} 
                            src={blobUrl} 
                            onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)} 
                            onLoadedMetadata={(e) => setDuration(e.target.duration)} 
                            onEnded={handleNextTrack} 
                            autoPlay 
                            onPlay={() => setIsPlaying(true)} 
                            onPause={() => setIsPlaying(false)} 
                        />
                    )}

                    {/* Draggable Pill / Micro Wheel Player */}
                    <div 
                        ref={pillRef}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                        style={{
                            display: isMinimized ? 'flex' : 'none',
                            position: 'fixed', top: 0, left: 0, zIndex: 999999,
                            width: isMicro ? '52px' : '220px', 
                            height: '52px', borderRadius: '26px',
                            background: isMicro 
                                ? 'rgba(5,4,10,0.85)' 
                                : `linear-gradient(90deg, rgba(5,4,10,0.65) 0%, ${tape.themeColor || themeColor}25 100%)`,
                            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                            border: `1px solid ${tape.themeColor || themeColor}50`,
                            boxShadow: `0 12px 30px rgba(0,0,0,0.8), inset 0 0 15px ${tape.themeColor || themeColor}30`,
                            alignItems: 'center', padding: isMicro ? '0 6px' : '0 10px 0 6px',
                            cursor: 'grab', touchAction: 'none',
                            transform: `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`,
                            transition: 'width 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), background 0.4s ease, padding 0.4s ease, transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        {/* Reel (Micro Toggle) */}
                        <div 
                            onClick={handleReelClick}
                            style={{ flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            title="Expand / Collapse Player"
                        >
                            <div className={`tape-reel ${isPlaying ? 'spinning' : ''}`} style={{ width: '38px', height: '38px', borderColor: tape.themeColor || themeColor, borderWidth: '2px', boxShadow: `0 0 10px ${tape.themeColor || themeColor}60` }}>
                                <div className="tape-spoke" style={{ background: tape.themeColor || themeColor, width: '2px' }}></div>
                                <div className="tape-spoke" style={{ background: tape.themeColor || themeColor, transform: 'rotate(60deg)', width: '2px' }}></div>
                                <div className="tape-spoke" style={{ background: tape.themeColor || themeColor, transform: 'rotate(120deg)', width: '2px' }}></div>
                                <div className="tape-hub" style={{borderColor: tape.themeColor || themeColor, width: '12px', height: '12px', borderWidth: '2px'}}></div>
                            </div>
                        </div>

                        {/* Track Info (Opens Fullscreen) */}
                        <div 
                            onClick={handleTextClick}
                            style={{ 
                                width: '100px', flexShrink: 0, overflow: 'hidden', marginLeft: '12px', marginRight: '8px', 
                                maskImage: 'linear-gradient(90deg, transparent 0%, black 10%, black 90%, transparent 100%)', 
                                WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 10%, black 90%, transparent 100%)',
                                opacity: isMicro ? 0 : 1, transition: 'opacity 0.2s', cursor: 'pointer'
                            }}
                            title="Open Fullscreen Player"
                        >
                            <div style={{ whiteSpace: 'nowrap', color: '#fff', fontSize: '12px', fontWeight: 'bold', fontFamily: "monospace", display: 'inline-block', animation: 'textMarquee 8s linear infinite' }}>
                                <span style={{ paddingRight: '30px' }}>{tape.name}</span>
                                <span style={{ paddingRight: '30px' }}>{tape.name}</span>
                            </div>
                        </div>

                        {/* Controls */}
                        <div style={{ display: 'flex', gap: '6px', flexShrink: 0, opacity: isMicro ? 0 : 1, transition: 'opacity 0.2s' }}>
                            <button onClick={togglePlay} style={{ background: 'transparent', border: 'none', color: tape.themeColor || themeColor, cursor: 'pointer', padding: '4px', display: 'grid', placeItems: 'center' }}>
                                {isPlaying ? <PauseIcon size={16}/> : <PlayIcon size={16}/>}
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); onClose(); }} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '4px', display: 'grid', placeItems: 'center' }}>
                                <XIcon size={16}/>
                            </button>
                        </div>
                    </div>

                    {/* Fullscreen Player Modal */}
                    {!isMinimized && (
                        <div style={{ position: 'fixed', inset: 0, zIndex: 1000000, background: '#000', display: 'flex', flexDirection: 'column', animation: 'fadeIn 0.3s ease-out' }}>
                            <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, ${tape.themeColor || themeColor}30 0%, #000 60%)`, opacity: 0.5, pointerEvents: 'none' }}></div>
                            <div className="swipe-vignette" style={{ zIndex: 1, pointerEvents: 'none' }}></div>

                            <div style={{ padding: '24px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
                                <div style={{ color: '#fff', fontSize: '12px', fontWeight: 'bold', fontFamily: "monospace", letterSpacing: '0.05em', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                                    Now Playing {useNativeAudio ? '(Android OS)' : '(Internal Player)'}<br/><span style={{color: 'rgba(255,255,255,0.5)', fontSize: '10px'}}>{tape.genre}</span>
                                </div>
                                <button className="icon-btn" onClick={() => setIsMinimized(true)} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '50%', width: '36px', height: '36px', display: 'grid', placeItems: 'center', color: '#fff', backdropFilter: 'blur(4px)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                </button>
                            </div>

                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, padding: '0 30px', position: 'relative', width: '100%', minHeight: 0 }}>
                                {showLyrics ? (
                                    <div className="stat-page-content" style={{ width: '100%', flex: 1, minHeight: 0, position: 'relative', animation: 'fadeIn 0.4s ease-out', display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40px', background: 'linear-gradient(180deg, #000 0%, transparent 100%)', zIndex: 5, pointerEvents: 'none' }}></div>
                                        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px', background: 'linear-gradient(0deg, #000 0%, transparent 100%)', zIndex: 5, pointerEvents: 'none' }}></div>
                                        
                                        <div style={{ height: '100%', overflowY: 'auto', padding: '40px 0 60px 0', scrollbarWidth: 'none' }}>
                                            <div style={{ whiteSpace: 'pre-wrap', color: '#fff', fontSize: '18px', lineHeight: 2.0, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontWeight: '900', textShadow: `0 0 15px ${tape.themeColor || themeColor}80, 0 2px 4px #000`, textAlign: 'center', padding: '0 10px' }}>
                                                {(tape.fullLyrics || tape.lyrics || 'Instrumental Track').split('\n').map((line, idx) => {
                                                    if (line.startsWith('[') && line.endsWith(']')) {
                                                        return <div key={idx} style={{ color: tape.themeColor || themeColor, fontSize: '12px', letterSpacing: '0.1em', marginTop: '16px', marginBottom: '8px', opacity: 0.8, textShadow: 'none' }}>{line}</div>;
                                                    }
                                                    return <div key={idx} style={{ minHeight: '1.8em' }}>{line}</div>;
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div style={{ width: '100%', aspectRatio: '1/1', maxWidth: '320px', position: 'relative', display: 'grid', placeItems: 'center' }}>
                                        <div style={{ position: 'absolute', inset: '10%', borderRadius: '50%', border: `2px solid ${tape.themeColor || themeColor}`, animation: isPlaying ? 'pulseRing 2s cubic-bezier(0.2, 0.8, 0.2, 1) infinite' : 'none', opacity: 0 }}></div>
                                        <div style={{ position: 'absolute', inset: '20%', borderRadius: '50%', border: `2px solid ${tape.themeColor || themeColor}`, animation: isPlaying ? 'pulseRing 2s cubic-bezier(0.2, 0.8, 0.2, 1) infinite 0.5s' : 'none', opacity: 0 }}></div>
                                        
                                        <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${tape.themeColor || themeColor}40, #111)`, borderRadius: '16px', boxShadow: `0 20px 40px rgba(0,0,0,0.8), 0 0 30px ${tape.themeColor || themeColor}30`, display: 'grid', placeItems: 'center', border: `1px solid ${tape.themeColor || themeColor}50`, position: 'relative', overflow: 'hidden' }}>
                                            <div className={`tape-reel ${isPlaying ? 'spinning' : ''}`} style={{ width: '140px', height: '140px', borderColor: tape.themeColor || themeColor, borderWidth: '4px', boxShadow: `0 0 30px ${tape.themeColor || themeColor}60` }}><div className="tape-spoke" style={{ background: tape.themeColor || themeColor, width: '8px' }}></div><div className="tape-spoke" style={{ background: tape.themeColor || themeColor, transform: 'rotate(60deg)', width: '8px' }}></div><div className="tape-spoke" style={{ background: tape.themeColor || themeColor, transform: 'rotate(120deg)', width: '8px' }}></div><div className="tape-hub" style={{borderColor: tape.themeColor || themeColor, width: '40px', height: '40px', borderWidth: '4px'}}></div></div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div style={{ padding: '20px 30px 40px', zIndex: 10 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
                                    <div style={{ flex: 1, minWidth: 0, paddingRight: '16px' }}>
                                        <h2 className="smart-scroll-content" style={{ margin: '0 0 6px 0', color: '#fff', fontSize: '24px', fontWeight: 'bold', whiteSpace: 'nowrap', textShadow: '0 2px 4px #000' }}>{tape.name}</h2>
                                        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontFamily: "monospace" }}>Ace-Step Studio // {tape.bpm}</div>
                                    </div>
                                    <button onClick={() => setShowLyrics(!showLyrics)} style={{ background: showLyrics ? (tape.themeColor || themeColor) : 'rgba(255,255,255,0.1)', color: showLyrics ? '#000' : '#fff', border: 'none', borderRadius: '50%', width: '44px', height: '44px', display: 'grid', placeItems: 'center', cursor: 'pointer', transition: 'all 0.2s', boxShadow: showLyrics ? `0 0 15px ${tape.themeColor || themeColor}` : '0 4px 12px rgba(0,0,0,0.4)' }}>
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                                    </button>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '32px' }}>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max={duration || 100} 
                                        value={currentTime} 
                                        readOnly={useNativeAudio}
                                        onChange={(e) => handleSeek(parseFloat(e.target.value))} 
                                        style={{ width: '100%', accentColor: tape.themeColor || themeColor, cursor: useNativeAudio ? 'default' : 'pointer', height: '4px', background: 'rgba(255,255,255,0.2)', pointerEvents: useNativeAudio ? 'none' : 'auto' }} 
                                    />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.5)', fontFamily: "monospace", fontWeight: 'bold' }}>
                                        <span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '30px' }}>
                                    <button onClick={handlePrevTrack} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer', opacity: 0.7, transition: 'transform 0.1s' }} onMouseDown={e=>e.currentTarget.style.transform='scale(0.8)'} onMouseUp={e=>e.currentTarget.style.transform='none'}>
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" strokeWidth="2"></line></svg>
                                    </button>
                                    <button onClick={togglePlay} style={{ width: '75px', height: '75px', borderRadius: '50%', border: 'none', background: '#fff', color: '#000', display: 'grid', placeItems: 'center', cursor: 'pointer', boxShadow: `0 8px 25px ${tape.themeColor || themeColor}50`, transition: 'transform 0.1s' }} onMouseDown={e => e.currentTarget.style.transform='scale(0.95)'} onMouseUp={e => e.currentTarget.style.transform='none'}>
                                        {isPlaying ? <PauseIcon size={32}/> : <PlayIcon size={32}/>}
                                    </button>
                                    <button onClick={handleNextTrack} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer', opacity: 0.7, transition: 'transform 0.1s' }} onMouseDown={e=>e.currentTarget.style.transform='scale(0.8)'} onMouseUp={e=>e.currentTarget.style.transform='none'}>
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" strokeWidth="2"></line></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </React.Fragment>
            );
        };
        
      
        // ✨ MIKA'S SENTENCE-BY-SENTENCE MANGA BUBBLE ✨
        const JrpgSpeechBubble = React.memo(({ text, pColor, isBattleActive, formatMessageText, isLeft, isRight, isCenter, isHidden }) => {
            if (!text) return null;

            // ✨ MIKA'S ADAPTIVE OPACITY ✨
            const bubbleOpacity = isHidden ? 0.25 : (isBattleActive ? 1 : 0.9);

            // ✨ MIKA'S DYNAMIC DIRECTIONAL ROUTER ✨
            let alignmentStyles = {};
            let tailStyles = {};

            if (isLeft) {
                alignmentStyles = { left: '15%', transform: 'none', alignItems: 'flex-start' };
                tailStyles = { bottom: '-5px', left: '20px', transform: 'rotate(45deg)', borderBottom: `1px solid ${pColor}80`, borderRight: `1px solid ${pColor}80` };
            } else if (isRight) {
                alignmentStyles = { right: '15%', left: 'auto', transform: 'none', alignItems: 'flex-end' };
                tailStyles = { bottom: '-5px', right: '20px', left: 'auto', transform: 'rotate(45deg)', borderBottom: `1px solid ${pColor}80`, borderRight: `1px solid ${pColor}80` };
            } else {
                alignmentStyles = { left: '50%', transform: 'translateX(-50%)', alignItems: 'center' };
                tailStyles = { bottom: '-5px', left: '50%', transform: 'translateX(-50%) rotate(45deg)', borderBottom: `1px solid ${pColor}80`, borderRight: `1px solid ${pColor}80` };
            }

            return (
                <div style={{ 
                    position: 'absolute', bottom: '100%', width: 'max-content', maxWidth: '240px', zIndex: 100,
                    pointerEvents: 'none', opacity: bubbleOpacity, transition: 'opacity 0.4s ease',
                    marginBottom: '16px', display: 'flex', flexDirection: 'column',
                    ...alignmentStyles
                }}>
                    <div style={{ animation: 'jrpgSpeechPhase 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) forwards' }}>
                        <div style={{
                            background: 'rgba(5, 4, 10, 0.85)', 
                            backdropFilter: 'blur(16px) saturate(1.2)', 
                            WebkitBackdropFilter: 'blur(16px) saturate(1.2)',
                            border: `1px solid ${pColor}80`, 
                            borderRadius: '12px', 
                            padding: '10px 14px',
                            color: '#EBE3D6', 
                            fontSize: '11.5px', 
                            fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                            boxShadow: `0 12px 30px rgba(0,0,0,0.8), inset 0 0 15px ${pColor}30`,
                            position: 'relative', 
                            lineHeight: 1.45, 
                            wordWrap: 'break-word', 
                            whiteSpace: 'pre-wrap', 
                            textAlign: 'left'
                        }}>
                            <div style={{
                                position: 'absolute', width: '10px', height: '10px', background: 'rgba(5, 4, 10, 0.95)', ...tailStyles
                            }}></div>
                             {formatMessageText(text)}
                        </div>
                    </div>
                </div>
            );
        });

        