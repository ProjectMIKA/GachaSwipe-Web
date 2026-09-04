import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as Constants from '../data/constants.js';

export const TerminalToast = ({ message, onComplete }) => {
            const [typedText, setTypedText] = useState('');
            const [isFading, setIsFading] = useState(false);

            useEffect(() => {
                let i = 0;
                setTypedText('');
                setIsFading(false);
                const intv = setInterval(() => {
                    i += 1;
                    setTypedText(message.substring(0, i));
                    if (i >= message.length) clearInterval(intv);
                }, 15);
                
                const fadeTimeout = setTimeout(() => { setIsFading(true); }, 2500);
                const completeTimeout = setTimeout(() => { if(onComplete) onComplete(); }, 3000);

                return () => { clearInterval(intv); clearTimeout(fadeTimeout); clearTimeout(completeTimeout); };
            }, [message]); // ✨ MIKA'S FIX: Removed onComplete to prevent infinite re-render loops!

            return (
                <div style={{ position: 'fixed', top: '20px', left: 0, right: 0, zIndex: 99999, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
                    <div style={{ transform: 'translateZ(0)', background: 'rgba(5, 3, 8, 0.9)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(0, 229, 255, 0.4)', borderRadius: '4px', padding: '12px 20px', color: '#00E5FF', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.8), 0 0 15px rgba(0,229,255,0.2), inset 0 0 10px rgba(0,229,255,0.1)', animation: isFading ? 'gfPhaseOut 0.5s ease forwards' : 'gfPhaseIn 0.3s ease forwards', whiteSpace: 'nowrap' }}>
                        <span style={{ color: '#FF107A', animation: 'csd-pulse 1s infinite' }}>&gt;</span>
                        <span>{typedText}{typedText.length < message.length ? <span style={{animation: 'cursorBlink 0.5s infinite'}}>_</span> : ''}</span>
                    </div>
                </div>
            );
        };
        // ✨ MIKA'S DUPLICATE REMOVED - Using the first definition with autoPlay support ✨
        const _CyberAudioNoteOld = ({ filename, themeColor = '#00E5FF' }) => {
            const audioRef = useRef(null);
            const [isPlaying, setIsPlaying] = useState(false);
            const [blobUrl, setBlobUrl] = useState(null);
            const [isLoading, setIsLoading] = useState(true);

            // ✨ MIKA'S FETCH-FREE BLOB PARSER ✨
            useEffect(() => {
                let isActive = true;
                const loadAudioFile = async () => {
                    if (!filename || !window.LaylaSDK) return;
                    try {
                        const layla = new window.LaylaSDK();
                        const res = await layla.utils.readFile(filename);
                        if (res && res.content_base64 && isActive) {
                            const b64Data = res.content_base64.includes(',') ? res.content_base64.split(',')[1] : res.content_base64;
                            const contentType = res.content_base64.includes(';') ? res.content_base64.split(';')[0].split(':')[1] : 'audio/mpeg';
                            
                            const byteCharacters = atob(b64Data);
                            const byteNumbers = new Array(byteCharacters.length);
                            for (let i = 0; i < byteCharacters.length; i++) {
                                byteNumbers[i] = byteCharacters.charCodeAt(i);
                            }
                            const byteArray = new Uint8Array(byteNumbers);
                            const blob = new Blob([byteArray], { type: contentType });
                            
                            if (isActive) {
                                setBlobUrl(URL.createObjectURL(blob));
                                setIsLoading(false);
                            }
                        }
                    } catch (e) {
                        console.error("[P.U.R.R.] Failed to read audio file from disk:", e);
                        if (isActive) setIsLoading(false);
                    }
                };
                loadAudioFile();

                return () => {
                    isActive = false;
                    if (blobUrl) URL.revokeObjectURL(blobUrl);
                };
            }, [filename]);

            useEffect(() => {
                const audio = audioRef.current;
                if (!audio || !blobUrl) return;
                
                const onEnded = () => setIsPlaying(false);
                audio.load();
                audio.addEventListener('ended', onEnded);
                
                return () => {
                    audio.removeEventListener('ended', onEnded);
                };
            }, [blobUrl]);

            const togglePlay = (e) => {
                e.stopPropagation();
                const audio = audioRef.current;
                if (!audio) return;
                if (isPlaying) {
                    audio.pause();
                    setIsPlaying(false);
                } else {
                    audio.play().then(() => setIsPlaying(true)).catch(() => {});
                }
            };

            return (
                <div style={{ 
                    position: 'absolute', 
                    bottom: '8px', 
                    right: '-38px', // ✨ Pushes exactly out the right side of the bubble!
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    animation: 'gfPhaseIn 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) forwards'
                }}>
                    {/* ✨ The Hardware Connector Pin ✨ */}
                    <div style={{ 
                        width: '6px', 
                        height: '3px', 
                        background: themeColor, 
                        boxShadow: `0 0 8px ${themeColor}`,
                        opacity: 0.8,
                        borderRadius: '2px 0 0 2px'
                    }}></div>

                    {/* ✨ The Glassmorphic Hologram Button ✨ */}
                    <button 
                        onClick={togglePlay}
                        disabled={isLoading || !blobUrl}
                        style={{ 
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                            background: isLoading ? 'rgba(0,0,0,0.5)' : `rgba(5, 3, 8, 0.45)`,
                            backdropFilter: 'blur(16px) saturate(2)', WebkitBackdropFilter: 'blur(16px) saturate(2)',
                            border: `1px solid ${themeColor}60`,
                            borderLeft: `2px solid ${themeColor}`, // Thicker on the attach point!
                            boxShadow: `0 4px 12px rgba(0,0,0,0.6), inset 0 0 20px ${themeColor}20`,
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                            color: themeColor, padding: 0
                        }}
                        onMouseOver={e => { if(!isLoading) { e.currentTarget.style.transform = 'scale(1.15)'; e.currentTarget.style.background = `rgba(15, 10, 20, 0.8)`; e.currentTarget.style.boxShadow = `0 6px 16px rgba(0,0,0,0.8), 0 0 15px ${themeColor}40, inset 0 0 25px ${themeColor}40`; } }}
                        onMouseOut={e => { if(!isLoading) { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = `rgba(5, 3, 8, 0.45)`; e.currentTarget.style.boxShadow = `0 4px 12px rgba(0,0,0,0.6), inset 0 0 20px ${themeColor}20`; } }}
                        title="Play Neural Audio"
                    >
                        {blobUrl && <audio ref={audioRef} src={blobUrl} preload="metadata" />}
                        
                        {isLoading ? (
                            <div className="resume-spinner" style={{ width: '12px', height: '12px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.1)', borderTopColor: themeColor }}></div>
                        ) : isPlaying ? (
                            /* ✨ CUSTOM SCIFI PAUSE SVG ✨ */
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ filter: `drop-shadow(0 0 6px ${themeColor})` }}>
                                <rect x="5" y="4" width="4" height="16" rx="2" />
                                <rect x="15" y="4" width="4" height="16" rx="2" />
                            </svg>
                        ) : (
                            /* ✨ CUSTOM SCIFI PLAY SVG ✨ */
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ filter: `drop-shadow(0 0 6px ${themeColor})`, transform: 'translateX(1px)' }}>
                                <path d="M5 3.868v16.264c0 1.54 1.688 2.49 3.013 1.696l13.553-8.132c1.282-.77 1.282-2.622 0-3.392L8.013 2.172C6.688 1.378 5 2.328 5 3.868z" />
                            </svg>
                        )}
                    </button>
                </div>
            );
        };


        