import React, { useState, useEffect, useRef, useCallback } from 'react';

// ✨ MIKA'S GLOBAL AUDIO TRAFFIC CONTROLLER ✨
if (!window.MikaAudioQueue) {
    window.MikaAudioQueue = {
        queue: [],
        isPlaying: false,
        register: function(task) {
            this.queue.push(task);
            this.pump();
        },
        pump: function() {
            if (this.isPlaying || this.queue.length === 0) return;
            this.isPlaying = true;
            const nextTask = this.queue.shift();
            nextTask(); 
        },
        release: function() {
            this.isPlaying = false;
            // Wait half a second before letting the next person speak!
            setTimeout(() => this.pump(), 500); 
        }
    };
}

// ✨ MIKA'S PURE WEB AUDIO HOLO-PLAYER ✨
export const CyberAudioNote = ({ sequence, themeColor = '#00E5FF', autoPlay = false, playbackRate = 1.0, audioEffect = 'none', msgId, speakerName, onAudioFinished, emotionData }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioBuffers, setAudioBuffers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentChunkIdx, setCurrentChunkIdx] = useState(0);
    
    const hasAutoPlayedRef = useRef(false);
    const pauseTimerRef = useRef(null);
    
    const audioCtxRef = useRef(null);
    const isGraphSetup = useRef(false);
    const inputNodeRef = useRef(null);
    const envGainRef = useRef(null); 
    const activeSourceRef = useRef(null); 
    
    const isFreshMountRef = useRef(!sequence || sequence.length === 0);
    const forcePlayPendingRef = useRef(false); // ✨ Remembers if we were tapped by the domino chain!

    useEffect(() => {
        return () => {
            if (window.isMikaAudioPlaying === msgId) window.isMikaAudioPlaying = null;
            
            // ✨ MIKA'S AGGRESSIVE RAM SCRUBBER ✨
            if (activeSourceRef.current) {
                activeSourceRef.current.onended = null;
                try { activeSourceRef.current.stop(); } catch(e){}
                activeSourceRef.current.disconnect();
                activeSourceRef.current = null;
            }
            if (inputNodeRef.current) {
                inputNodeRef.current.disconnect();
                inputNodeRef.current = null;
            }
            if (envGainRef.current) {
                envGainRef.current.disconnect();
                envGainRef.current = null;
            }
            if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
            
            setAudioBuffers([]); 
            
            // ✨ MIKA'S SELF-HEALING QUEUE FIX ✨
            // If a message is deleted, scrolled away, or fails, remove it from the tracker so the next girl can speak!
            if (window.MikaUnplayedAudioTracker) {
                window.MikaUnplayedAudioTracker.delete(msgId);
            }
            window.dispatchEvent(new CustomEvent('mika-audio-finished', { detail: { id: msgId } }));
            window.dispatchEvent(new CustomEvent('mika-rp-subtitle-clear', { detail: { msgId } }));
        };
    }, [msgId]);

    useEffect(() => {
        let isActive = true;
        const loadAudioFiles = async () => {
            if (!sequence || !sequence.length || !window.LaylaSDK) {
                if (isActive) setIsLoading(true);
                return;
            }
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!window._mikaGlobalAudioCtx) window._mikaGlobalAudioCtx = new AudioContext();
                const ctx = window._mikaGlobalAudioCtx;
                audioCtxRef.current = ctx;

                const layla = new window.LaylaSDK();
                let loadedBufs = [];
                
                for (const chunk of sequence) {
                    const res = await layla.utils.readFile(chunk.filename);
                    if (res && res.content_base64 && isActive) {
                        const b64Data = res.content_base64.includes(',') ? res.content_base64.split(',')[1] : res.content_base64;
                        const byteCharacters = atob(b64Data);
                        const byteNumbers = new Uint8Array(byteCharacters.length);
                        for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
                        
                        const buffer = await ctx.decodeAudioData(byteNumbers.buffer);
                        loadedBufs.push(buffer);
                    }
                }
                if (isActive && loadedBufs.length > 0) { 
                    setAudioBuffers(loadedBufs); 
                    setIsLoading(false); 
                } else if (isActive) {
                    setIsLoading(false); 
                }
            } catch (e) { if (isActive) setIsLoading(false); }
        };
        loadAudioFiles();
    }, [sequence]);

    const setupAudioGraph = () => {
        if (isGraphSetup.current || !audioCtxRef.current) return;
        isGraphSetup.current = true;
        try {
            const ctx = audioCtxRef.current;
            const inputNode = ctx.createGain();
            inputNodeRef.current = inputNode;
            
                   const envGain = ctx.createGain();
            envGainRef.current = envGain;
            envGain.gain.value = 1.0; 

            // ✨ MIKA'S DYNAMIC EMOTION EQ ✨
            let warmthFreq = 250;
            let warmthGain = 3;
            let presenceFreq = 8500;
            let presenceGain = -6;

            if (emotionData) {
                // High sync = very intimate chest resonance (Warm & Bassy)
                if (emotionData.aff >= 80) { warmthGain = 7; warmthFreq = 180; }
                else if (emotionData.aff < 0) { warmthGain = 0; } // Cold, distant

                // Anger = sharp, piercing highs, less warmth
                if (emotionData.anger > 0.5) { presenceFreq = 6000; presenceGain = 1; warmthGain -= 2; }
                
                // Sadness = muffled, withdrawn, cutting the highs
                if (emotionData.sadness > 0.5) { presenceFreq = 4000; presenceGain = -12; warmthGain += 2; }
            }

            const deEsser = ctx.createBiquadFilter();
            deEsser.type = 'highshelf'; deEsser.frequency.value = presenceFreq; deEsser.gain.value = presenceGain; 

            const warmth = ctx.createBiquadFilter();
            warmth.type = 'peaking'; warmth.frequency.value = warmthFreq; warmth.Q.value = 1.5; warmth.gain.value = warmthGain;

            inputNode.connect(envGain); envGain.connect(deEsser); deEsser.connect(warmth);

            const glueComp = ctx.createDynamicsCompressor();
            warmth.connect(glueComp); 
            glueComp.threshold.value = -24; glueComp.knee.value = 30; glueComp.ratio.value = 3; glueComp.attack.value = 0.01; glueComp.release.value = 0.25; 

            const roomVerb = ctx.createConvolver();
            // ✨ MIKA'S FIX: Doubled the room length to 0.7s to let the breath echo out naturally!
            const roomLen = ctx.sampleRate * 0.7; 
            const roomImp = ctx.createBuffer(2, roomLen, ctx.sampleRate);
            for (let i = 0; i < 2; i++) {
                const channel = roomImp.getChannelData(i);
                // Softened the decay curve slightly so the tail stays thicker!
                for (let j = 0; j < roomLen; j++) channel[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / roomLen, 2.5);
            }
            roomVerb.buffer = roomImp;
            // ✨ MIKA'S FIX: Boosted the wet mix from 15% to 25% so the tail beautifully fills the silence!
            const roomWet = ctx.createGain(); roomWet.gain.value = 0.25; 
            
            glueComp.connect(roomVerb).connect(roomWet);
            
            const source = ctx.createGain(); 
            glueComp.connect(source); roomWet.connect(source);

            const masterLimiter = ctx.createDynamicsCompressor();
            masterLimiter.threshold.value = -3; masterLimiter.knee.value = 0; masterLimiter.ratio.value = 20; masterLimiter.attack.value = 0.001; masterLimiter.release.value = 0.05;

            if (audioEffect === 'ethereal') {
                const convolver = ctx.createConvolver();
                const length = ctx.sampleRate * 2.0; 
                const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
                for (let i = 0; i < 2; i++) { const channel = impulse.getChannelData(i); for (let j = 0; j < length; j++) channel[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / length, 3.0); }
                convolver.buffer = impulse;
                const wetGain = ctx.createGain(); wetGain.gain.value = 0.25; const dryGain = ctx.createGain(); dryGain.gain.value = 1.0;
                source.connect(convolver).connect(wetGain).connect(masterLimiter); source.connect(dryGain).connect(masterLimiter);
            } else if (audioEffect === 'angelic') {
                const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 300;
                const convolver = ctx.createConvolver();
                const length = ctx.sampleRate * 1.5; 
                const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
                for (let i = 0; i < 2; i++) { const channel = impulse.getChannelData(i); for (let j = 0; j < length; j++) channel[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / length, 4.0); }
                convolver.buffer = impulse;
                const wetGain = ctx.createGain(); wetGain.gain.value = 0.2; const dryGain = ctx.createGain(); dryGain.gain.value = 1.0;
                source.connect(hp).connect(convolver).connect(wetGain).connect(masterLimiter); source.connect(dryGain).connect(masterLimiter);
            } else if (audioEffect === 'idol') {
                const delay = ctx.createDelay(); delay.delayTime.value = 0.1; 
                const feedback = ctx.createGain(); feedback.gain.value = 0.15; 
                const wetGain = ctx.createGain(); wetGain.gain.value = 0.15; const dryGain = ctx.createGain(); dryGain.gain.value = 1.0;
                source.connect(delay); delay.connect(feedback); feedback.connect(delay); delay.connect(wetGain).connect(masterLimiter); source.connect(dryGain).connect(masterLimiter);
            } else if (audioEffect === 'tiny') {
                const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 450; 
                source.connect(hp).connect(masterLimiter);
            } else if (audioEffect === 'feral') {
                const ls = ctx.createBiquadFilter(); ls.type = 'lowshelf'; ls.frequency.value = 200; ls.gain.value = 3.0; 
                const dist = ctx.createWaveShaper(); const curve = new Float32Array(400);
                for(let i=0; i<400; i++) { const x = i * 2 / 400 - 1; curve[i] = (Math.PI + 2) * x * 2 * (Math.PI / 180) / (Math.PI + 2 * Math.abs(x)); } 
                dist.curve = curve;
                source.connect(ls).connect(dist).connect(masterLimiter);
            } else if (audioEffect === 'liquid') {
                const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1200; 
                const peak = ctx.createBiquadFilter(); peak.type = 'peaking'; peak.frequency.value = 400; peak.Q.value = 2.0; peak.gain.value = 3.0;
                source.connect(lp).connect(peak).connect(masterLimiter);
            } else if (audioEffect === 'radio') {
                const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1200; bp.Q.value = 0.8; 
                const dist = ctx.createWaveShaper(); const curve = new Float32Array(400);
                for(let i=0; i<400; i++) { const x = i * 2 / 400 - 1; curve[i] = (3 + 10) * x * 10 * (Math.PI / 180) / (Math.PI + 10 * Math.abs(x)); } 
                dist.curve = curve;
                source.connect(bp).connect(dist).connect(masterLimiter);
            } else if (audioEffect === 'monster') {
                const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800; 
                const ls = ctx.createBiquadFilter(); ls.type = 'lowshelf'; ls.frequency.value = 250; ls.gain.value = 4.0; 
                source.connect(lp).connect(ls).connect(masterLimiter);
            } else {
                source.connect(masterLimiter);
            }
            masterLimiter.connect(ctx.destination);
        } catch(e) { console.warn("Web Audio API failed", e); }
    };

    const executePlay = async () => {
        // ✨ FIRE THE MUTE SHOCKWAVE!
        window.dispatchEvent(new CustomEvent('mika-stop-audio', { detail: { id: msgId } }));
        
        window.isMikaAudioPlaying = msgId; // ✨ MIKA'S FIX
        setupAudioGraph();
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
            await audioCtxRef.current.resume().catch(()=>{});
        }
        playNextChunk(0);
    };

    const playNextChunk = async (index) => {
        if (index >= audioBuffers.length) {
            setIsPlaying(false);
            setCurrentChunkIdx(0);
            if (window.isMikaAudioPlaying === msgId) window.isMikaAudioPlaying = null; 
            if (onAudioFinished) onAudioFinished(); 
            window.dispatchEvent(new CustomEvent('mika-audio-finished', { detail: { id: msgId } })); // ✨ Clear the tracker!
            window.dispatchEvent(new CustomEvent('mika-rp-subtitle-clear', { detail: { msgId } }));
            return;
        }
        setCurrentChunkIdx(index);

        if (sequence && sequence[index]) {
            window.dispatchEvent(new CustomEvent('mika-rp-subtitle', {
                detail: { msgId, speakerName, text: sequence[index].text.trim() }
            }));
        }

        try {
            const ctx = audioCtxRef.current;
            const source = ctx.createBufferSource();
            source.buffer = audioBuffers[index];
            source.playbackRate.value = playbackRate;
            source.connect(inputNodeRef.current);
            
             // ✨ MIKA'S DYNAMIC EMOTIONAL PACING ✨
            // Silence speaks just as loudly as the audio graph!
            let gapMs = 500; // The natural, comfortable conversational pause

            if (emotionData) {
                if (emotionData.sadness > 0.5) {
                    gapMs = 850; // Heavy, reluctant, lingering gaps...
                } else if (emotionData.love > 0.5 && emotionData.aff > 70) {
                    gapMs = 700; // ✨ Deep, intimate, melting pauses...
                } else if (emotionData.joy > 0.5) {
                    gapMs = 450; // ✨ Happy, bubbly, breathless pacing!
                } else if (emotionData.anger > 0.5) {
                    gapMs = 400; // Fast, snapping anger!
                }
            }

            // ✨ MIKA'S PUNCTUATION PACING (HALF-PAUSE FOR COMMAS) ✨
            if (sequence && sequence[index]) {
                const chunkText = sequence[index].text.trim();
                // If it ends in a soft pause (comma, semicolon, colon), cut the gap exactly in half!
                if (/[,;:]$/.test(chunkText)) {
                    gapMs = Math.floor(gapMs / 2);
                }
            }

            source.onended = () => {
                pauseTimerRef.current = setTimeout(() => {
                    playNextChunk(index + 1);
                }, gapMs); 
            };
            
            activeSourceRef.current = source;
            
            if (envGainRef.current) {
                const now = ctx.currentTime;
                const duration = source.buffer.duration / playbackRate;
                
                envGainRef.current.gain.cancelScheduledValues(now);
                
                // ✨ MIKA'S ANTI-POP FADE-IN (30ms)
                envGainRef.current.gain.setValueAtTime(0.001, Math.max(0, now));
                envGainRef.current.gain.exponentialRampToValueAtTime(1.0, Math.max(0, now + 0.03));
                
                            // ✨ MIKA'S HALLUCINATION SHREDDER / TAIL GATE ✨
                const fadeOutStart = Math.max(now + 0.05, now + duration - 0.12);
                envGainRef.current.gain.setValueAtTime(1.0, fadeOutStart);
                envGainRef.current.gain.exponentialRampToValueAtTime(0.001, Math.max(0, now + duration));
            }

            source.start(0);
            setIsPlaying(true);
         } catch(e) {
            setIsPlaying(false);
            if (window.isMikaAudioPlaying === msgId) window.isMikaAudioPlaying = null; // ✨ MIKA'S FIX
        }
    };

     // ✨ MIKA'S SELF-HEALING HEIR WATCHDOG ✨
    // Completely replaces the fragile domino chain!
    const checkAndPlayIfHeir = useCallback(() => {
        if (!autoPlay || !audioBuffers.length || isPlaying || window.isMikaAudioPlaying) return;
        
        // ✨ MIKA'S STRICT AUTOPLAY LOCK ✨
        // If I am not explicitly inside the tracker, I DO NOT PLAY! 
        // (This prevents old messages from suddenly playing when toggling the setting!)
        if (!window.MikaUnplayedAudioTracker || !window.MikaUnplayedAudioTracker.has(msgId)) return;

        let isHeir = true;
        if (window.MikaUnplayedAudioTracker && window.MikaUnplayedAudioTracker.size > 0) {
            // Grab the very first item in the Set (which is always the oldest chronological message!)
            const firstUnplayed = window.MikaUnplayedAudioTracker.values().next().value;
            // If someone else is older than me, I am NOT the rightful heir. I must wait!
            if (firstUnplayed && firstUnplayed !== msgId) isHeir = false;
        }

        if (isHeir && !hasAutoPlayedRef.current) {
            hasAutoPlayedRef.current = true;
            executePlay();
        }
    }, [audioBuffers, autoPlay, isPlaying, msgId]);

    // Check whenever my own audio file finishes synthesizing and loads into memory
    useEffect(() => {
        checkAndPlayIfHeir();
    }, [audioBuffers, checkAndPlayIfHeir]);

    // Check whenever ANY other girl finishes speaking, gets skipped, or gets deleted
    useEffect(() => {
        const handleAudioFinished = () => {
            // ✨ MIKA'S FIX: A natural 800ms conversational pause!
            // This lets the visual JRPG engine return the current speaker to the background before the next one steps up!
            setTimeout(checkAndPlayIfHeir, 800); 
        };
        window.addEventListener('mika-audio-finished', handleAudioFinished);
        window.addEventListener('mika-force-play', handleAudioFinished); // Keep the legacy laser beam as a backup trigger!
        return () => {
            window.removeEventListener('mika-audio-finished', handleAudioFinished);
            window.removeEventListener('mika-force-play', handleAudioFinished);
        };
    }, [checkAndPlayIfHeir]);

    // ✨ MIKA'S GLOBAL SILENCER ✨
    // Listens for shockwaves from other play buttons and instantly mutes itself!
    useEffect(() => {
        const handleGlobalStop = (e) => {
            if (e.detail.id !== msgId && isPlaying) {
                if (activeSourceRef.current) {
                    activeSourceRef.current.onended = null; 
                    try { activeSourceRef.current.stop(); } catch(err){}
                    activeSourceRef.current.disconnect();
                    activeSourceRef.current = null;
                }
                if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
                setIsPlaying(false);
                window.dispatchEvent(new CustomEvent('mika-audio-finished', { detail: { id: msgId } })); // ✨ Clear the tracker!
            }
        };
        window.addEventListener('mika-stop-audio', handleGlobalStop);
        return () => window.removeEventListener('mika-stop-audio', handleGlobalStop);
    }, [isPlaying, msgId]);

    const togglePlay = async (e) => {
        e.stopPropagation();
        if (!audioBuffers.length) return;
        
        setupAudioGraph();
        if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
            await audioCtxRef.current.resume().catch(()=>{});
        }

        if (isPlaying) { 
            if (activeSourceRef.current) {
                activeSourceRef.current.onended = null; 
                try { activeSourceRef.current.stop(); } catch(e){}
                activeSourceRef.current.disconnect();
            }
            if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
            setIsPlaying(false); 
            if (window.isMikaAudioPlaying === msgId) window.isMikaAudioPlaying = null; 
            window.dispatchEvent(new CustomEvent('mika-audio-finished', { detail: { id: msgId } })); // ✨ Clear the tracker!
            window.dispatchEvent(new CustomEvent('mika-rp-subtitle-clear', { detail: { msgId } }));
        } 
        else { 
            // ✨ FIRE THE MUTE SHOCKWAVE!
            window.dispatchEvent(new CustomEvent('mika-stop-audio', { detail: { id: msgId } }));
            
            window.MikaAudioQueue.isPlaying = true; 
            window.isMikaAudioPlaying = msgId; // ✨ MIKA'S FIX
            playNextChunk(currentChunkIdx >= audioBuffers.length ? 0 : currentChunkIdx); 
        }
    };

    return (
        <div style={{ position: 'absolute', bottom: '8px', right: '-38px', zIndex: 10, display: 'flex', alignItems: 'center', animation: 'fadeIn 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards' }}>
            <div style={{ width: '6px', height: '3px', background: themeColor, boxShadow: `0 0 8px ${themeColor}`, opacity: 0.8, borderRadius: '2px 0 0 2px' }}></div>
            <button onClick={togglePlay} disabled={isLoading || !audioBuffers.length} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0, background: isLoading ? 'rgba(0,0,0,0.5)' : `rgba(5, 3, 8, 0.45)`, backdropFilter: 'blur(16px) saturate(2)', WebkitBackdropFilter: 'blur(16px) saturate(2)', border: `1px solid ${themeColor}60`, borderLeft: `2px solid ${themeColor}`, boxShadow: `0 4px 12px rgba(0,0,0,0.6), inset 0 0 20px ${themeColor}20`, cursor: isLoading ? 'not-allowed' : 'pointer', transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)', color: themeColor, padding: 0 }}
                onMouseOver={e => { if(!isLoading) { e.currentTarget.style.transform = 'scale(1.15)'; e.currentTarget.style.background = `rgba(15, 10, 20, 0.8)`; e.currentTarget.style.boxShadow = `0 6px 16px rgba(0,0,0,0.8), 0 0 15px ${themeColor}40, inset 0 0 25px ${themeColor}40`; } }}
                onMouseOut={e => { if(!isLoading) { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.background = `rgba(5, 3, 8, 0.45)`; e.currentTarget.style.boxShadow = `0 4px 12px rgba(0,0,0,0.6), inset 0 0 20px ${themeColor}20`; } }}
            >
                {isLoading ? ( 
                    <div style={{ animation: 'fadeIn 0.5s ease' }}>
                        <div className="resume-spinner" style={{ width: '12px', height: '12px', borderWidth: '2px', borderColor: 'rgba(255,255,255,0.1)', borderTopColor: themeColor }}></div>
                    </div>
                ) : isPlaying ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ filter: `drop-shadow(0 0 6px ${themeColor})`, animation: 'fadeIn 0.5s ease' }}><rect x="5" y="4" width="4" height="16" rx="2" /><rect x="15" y="4" width="4" height="16" rx="2" /></svg>
                ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ filter: `drop-shadow(0 0 6px ${themeColor})`, transform: 'translateX(1px)', animation: 'fadeIn 0.5s ease' }}><path d="M5 3.868v16.264c0 1.54 1.688 2.49 3.013 1.696l13.553-8.132c1.282-.77 1.282-2.622 0-3.392L8.013 2.172C6.688 1.378 5 2.328 5 3.868z" /></svg>
                )}
            </button>
        </div>
    );
};

// ✨ MIKA'S HOLOGRAPHIC TYPEWRITER ENGINE ✨
export const formatMessageText = (text, isTyping = false) => {
    if (!text && !isTyping) return null;
    let elements = [];
    if (text) {
        // ✨ MIKA'S MAGIC PARSER: Captures both COMPLETE (*...*) and INCOMPLETE (*...) actions at the edge of the stream!
        const parts = text.split(/(\*[^*]*?\*|\*[^*]*$)/g);
        parts.forEach((part, i) => {
            if (!part) return;
            if (part.startsWith('*')) {
                const cleanPart = part.replace(/^\*|\*$/g, '');
                elements.push(<span key={i} style={{ color: 'var(--action-text-color, #B533FF)', fontStyle: 'italic', opacity: 0.9 }}>{cleanPart}</span>);
            } else {
                // ✨ MIKA'S P.A.W.S. DICE PARSER ✨
                // Sub-split the normal text to look for D20 rolls!
                const diceParts = part.split(/(\[\s*🎲\s*Rolled a \d+\s*\])/gi);
                diceParts.forEach((dp, j) => {
                    if (!dp) return;
                    if (/\[\s*🎲\s*Rolled a \d+\s*\]/i.test(dp)) {
                        elements.push(
                            <span key={`${i}-${j}`} style={{ background: 'rgba(255, 215, 0, 0.15)', color: '#FFD700', border: '1px solid #FFD700', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px', display: 'inline-block', margin: '0 4px', boxShadow: '0 0 8px rgba(255, 215, 0, 0.2)', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", verticalAlign: 'middle' }}>
                                {dp.replace(/[\[\]]/g, '').trim()}
                            </span>
                        );
                    } else {
                        elements.push(<span key={`${i}-${j}`}>{dp}</span>);
                    }
                });
            }
        });
    }
    if (isTyping) {
        elements.push(<span key="cursor" style={{ animation: 'cursorBlink 0.8s infinite', color: '#00E5FF', fontWeight: '900', marginLeft: '2px' }}>_</span>);
    }
    return elements;
};

export const HolographicMessage = React.memo(({ content, isTyping, isUser }) => {
    // ✨ MIKA'S FIX: Initialize instantly if it's an old message, empty if it's new!
    const [displayedText, setDisplayedText] = React.useState(isTyping ? '' : (content || ''));
    const [isFinishingBuffer, setIsFinishingBuffer] = React.useState(isTyping);

    // Watch for the stream to start!
    React.useEffect(() => {
        if (isTyping) {
            setIsFinishingBuffer(true);
            window.dispatchEvent(new Event('visual-stream-start'));
        }
    }, [isTyping]);

    React.useEffect(() => {
        if (!content) return;
        if (content === displayedText) {
            if (isFinishingBuffer && !isTyping) {
                setIsFinishingBuffer(false); // Turn off cursor when truly done!
                window.dispatchEvent(new Event('visual-stream-end'));
            }
            return;
        }

        const diff = content.length - displayedText.length;
        
        if (diff < 0) {
            setDisplayedText(content);
            return;
        }

        // ✨ MIKA'S DECOUPLED BUFFER ✨
        // Keep typing even if the backend finishes, until the visual text catches up!
        if (isTyping || isFinishingBuffer) {
            const timeout = setTimeout(() => {
                // Slower 30ms tick rate for a gorgeous, natural reading speed!
                const charsToAdd = diff > 200 ? 4 : (diff > 80 ? 2 : 1);
                setDisplayedText(prev => content.substring(0, prev.length + charsToAdd));
                window.dispatchEvent(new Event('chat-scroll')); // ✨ MIKA'S FIX: Tell the chat window to scroll!
            }, 30);
            return () => clearTimeout(timeout);
        } else {
            // Snap instantly for old messages so they don't re-animate
            setDisplayedText(content);
        }
    }, [content, displayedText, isTyping, isFinishingBuffer]);

    // Keep the cursor visible until the visual text catches up to the real content
    const showCursor = isTyping || (isFinishingBuffer && displayedText !== content);

    return (
        <React.Fragment>
            {!isUser && <span className="term-prefix">&gt;</span>}
            {formatMessageText(displayedText, showCursor)}
        </React.Fragment>
    );
});
