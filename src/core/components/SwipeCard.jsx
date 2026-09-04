import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as Constants from '../data/constants.js';

import { CameraIcon, LockIcon, XIcon } from './Icons.jsx';
import { TagPill, DetailsList } from './SharedUI.jsx';
import { AtmosphereEngine } from './AtmosphereEngine.jsx';

export const SwipeCard = ({ waifu, preferences, style, interactive, likeOpacity, passOpacity, onPointerDown, onPointerMove, onPointerUp, onRegenImage, enableAtmosphere, onOpenGachaFans, onShareProfile, onOpenMatrix }) => {
    const [showDetails, setShowDetails] = useState(false);
    // ✨ MIKA'S BOOT TRIGGER: Force a re-trigger every time the waifu id changes!
    const bootKey = waifu?.id || 'card';
    
    // ✨ MIKA'S AUTOMATED DRAMA ENGINE ✨
    // Phases: 'hyping' -> 'hype_fade' -> 'cinematic'/'intro_pan' -> 'revealed'
    const [revealPhase, setRevealPhase] = useState('revealed'); // Skip buffer for pause cards!
    const [isFaded, setIsFaded] = useState(false);
    const fadeTimerRef = useRef(null);
    const stopPropagation = e => e.stopPropagation();

    // ✨ MIKA'S DECOUPLED CAMERA ENGINE ✨
    const cameraSettings = useMemo(() => {
        // We separate them into zones to ensure the 2 cuts are always distinctly different!
        const faceShots = [
            { start: '50% 0%', end: '50% 25%' },   // Face pull down
            { start: '50% 25%', end: '50% 0%' },   // Face push up
            { start: '20% 15%', end: '80% 15%' },  // Face pan right wide
            { start: '80% 15%', end: '20% 15%' },  // Face pan left wide
            { start: '50% 10%', end: '30% 20%' },  // Diagonal face shift
            { start: '50% 10%', end: '70% 20%' }   // Diagonal face shift
        ];
        const bodyShots = [
            { start: '50% 30%', end: '50% 60%' },  // Chest to Waist drop
            { start: '20% 45%', end: '80% 45%' },  // Chest pan right wide
            { start: '80% 45%', end: '20% 45%' },  // Chest pan left wide
            { start: '50% 80%', end: '50% 50%' },  // Thighs to Waist pull up
            { start: '20% 75%', end: '80% 75%' },  // Thighs pan right wide
            { start: '80% 75%', end: '20% 75%' },  // Thighs pan left wide
            { start: '50% 95%', end: '50% 70%' },  // Feet to Knees pull up
            { start: '30% 60%', end: '70% 30%' },  // Diagonal body sweep up
            { start: '70% 60%', end: '30% 30%' }   // Diagonal body sweep up
        ];
        
        // Pick one face shot and one body shot, then shuffle their order!
        const shot1 = faceShots[Math.floor(Math.random() * faceShots.length)];
        const shot2 = bodyShots[Math.floor(Math.random() * bodyShots.length)];
        const shots = Math.random() > 0.5 ? [shot1, shot2] : [shot2, shot1];
        
        if (waifu.isSSR) {
            const effects = ['ssrLens_pull', 'ssrLens_push', 'ssrLens_bounce', 'ssrLens_drift'];
            return {
                anim: effects[Math.floor(Math.random() * effects.length)],
                p1s: shots[0].start, p1e: shots[0].end,
                p2s: shots[1].start, p2e: shots[1].end
            };
        } else {
            const effects = ['normLens_fade', 'normLens_focus', 'normLens_glide'];
            // Normal just uses the first shot and smoothly zooms out to idle
            return {
                anim: effects[Math.floor(Math.random() * effects.length)],
                p1s: shots[0].start, p1e: shots[0].end,
                p2s: '50% 50%', p2e: '50% 50%' // Unused placeholder
            };
        }
    }, [waifu.id, waifu.isSSR]);

    // MIKA'S DYNAMIC TRAIT GENERATOR (Handles Normal & SSR)
    const displayTraits = useMemo(() => {
        // ✨ MIKA'S FIX: Show the actual generated tags instead of the static top preferences!
        let baseTraits = waifu.tags && waifu.tags.length > 0 
            ? [...waifu.tags].sort(() => 0.5 - Math.random()).slice(0, 2).map(t => t.toUpperCase()) 
            : ["NEW ENCOUNTER"];
        
        if (waifu.isSSR) {
            const premium = ["FATED ENCOUNTER", "SOULBOUND DEVOTION", "FLAWLESS AESTHETICS", "UNCONDITIONAL LOYALTY"];
            const randomPremium = premium.sort(() => 0.5 - Math.random()).slice(0, 2);
            return [...baseTraits, ...randomPremium];
        }
        return baseTraits;
    }, [waifu.isSSR, waifu.tags]);

    // THE GACHA CAMERA TIMEOUT SEQUENCE
    useEffect(() => {
        if (waifu.id === 'intro') return; // MIKA'S FIX: Do absolutely nothing for the holding card!

        if (waifu.isSSR) {
            if (revealPhase === 'hyping') {
                const timer1 = setTimeout(() => setRevealPhase('hype_fade'), 3800); 
                return () => clearTimeout(timer1);
            }
            if (revealPhase === 'hype_fade') {
                const timer2 = setTimeout(() => setRevealPhase('cinematic'), 600); 
                return () => clearTimeout(timer2);
            }
            if (revealPhase === 'cinematic') {
                const timer3 = setTimeout(() => setRevealPhase('revealed'), 5200); 
                return () => clearTimeout(timer3);
            }
        } else {
            // MIKA'S NEW NORMAL BUFFER FLOW
            if (revealPhase === 'hyping') {
                const timer1 = setTimeout(() => setRevealPhase('hype_fade'), 2600); // Faster hype for normal cards
                return () => clearTimeout(timer1);
            }
            if (revealPhase === 'hype_fade') {
                const timer2 = setTimeout(() => setRevealPhase('intro_pan'), 500); 
                return () => clearTimeout(timer2);
            }
            if (revealPhase === 'intro_pan') {
                // ✨ MIKA'S FIX: Give the camera 3.2 seconds to breathe!
                const normTimer = setTimeout(() => setRevealPhase('revealed'), 3200);
                return () => clearTimeout(normTimer);
            }
        }
    }, [waifu.isSSR, revealPhase, waifu.id]);

    // MIKA'S PREMIUM SSR TRAIT GENERATOR
    const ssrTraits = useMemo(() => {
        if (!waifu.isSSR) return [];
        const premium = ["Fated Encounter", "Soulbound Devotion", "Flawless Aesthetics", "Unconditional Loyalty", "Irresistible Aura", "Yandere-Level Obsession"];
        const randomPremium = premium.sort(() => 0.5 - Math.random()).slice(0, 2);
        
        const topAlgorithmTraits = preferences 
            ? Object.entries(preferences).sort((a,b) => b[1] - a[1]).map(e => e[0]).slice(0, 2)
            : [];
        
        const baseTraits = topAlgorithmTraits.length > 0 ? topAlgorithmTraits : (waifu.likes ? waifu.likes.slice(0, 2) : ["Degenerate Master"]);
        
        return [...baseTraits, ...randomPremium];
    }, [waifu.isSSR, waifu.likes, preferences]);

    // MIKA'S IMMERSION TIMER (Waits for the reveal!)
    const resetFadeTimer = useCallback(() => {
        setIsFaded(false);
        if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
        
        // Only start the 4-second fade out AFTER the card is fully revealed!
        if (interactive && !showDetails && !waifu.isRegenerating && revealPhase === 'revealed') {
            fadeTimerRef.current = setTimeout(() => setIsFaded(true), 4000);
        }
    }, [interactive, showDetails, waifu.isRegenerating, revealPhase]);

    useEffect(() => {
        resetFadeTimer();
        return () => fadeTimerRef.current && clearTimeout(fadeTimerRef.current);
    }, [resetFadeTimer]);

    // Wake up on tap!
    const handlePointerDown = (e) => {
        resetFadeTimer();
        if (interactive && !showDetails && onPointerDown) {
            onPointerDown(e);
        }
    };

    let bgGradient = 'linear-gradient(150deg, #171226, #000)';
    if (waifu.gradient && waifu.gradient.length >= 2) {
        bgGradient = `linear-gradient(150deg, ${waifu.gradient[0]}, ${waifu.gradient[1]})`;
    }

    return (
        <div 
            onPointerDown={handlePointerDown}
            onPointerMove={interactive && !showDetails ? onPointerMove : undefined}
            onPointerUp={interactive && !showDetails ? onPointerUp : undefined}
            onPointerCancel={interactive && !showDetails ? onPointerUp : undefined}
            style={{ 
                position: 'absolute', inset: 0, borderRadius: 26, 
                background: bgGradient, 
                // ✨ MIKA'S FIX: Nuked the massive drop shadow causing the tearing!
                boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.3)', 
                touchAction: 'none', 
                cursor: interactive && !showDetails ? 'grab' : 'default', 
                userSelect: 'none', 
                animation: 'fadeIn 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)',
                outline: '1px solid transparent', // ✨ Forces the browser to anti-alias the edges!
                ...style 
            }}
        >
            <div className={waifu.isSSR && revealPhase === 'revealed' ? 'is-ssr' : ''} style={{ position: 'absolute', inset: 0, borderRadius: 26, overflow: 'hidden', transform: 'translateZ(0px)', border: waifu.isSSR && revealPhase === 'revealed' ? '2px solid #FFD700' : '1px solid rgba(255,255,255,0.05)', transition: 'border 0.5s ease' }}>
                
                {/* MIKA'S DRAMATIC CSS INJECTION */}
                <style>{`
        /* ✨ MIKA'S HYPNOTIC HYPING ZOOM ✨ */
        @keyframes ssrHypeZoom {
            0% { object-position: 50% 20%; transform: scale(2.2); filter: blur(16px) brightness(0.6); }
            100% { object-position: 50% 35%; transform: scale(1.3); filter: blur(8px) brightness(0.75); }
        }

        /* ✨ MIKA'S DYNAMIC LENS EFFECTS (Decoupled Vectors) ✨ */
        
        /* 1. Dramatic Pull-Out */
        @keyframes ssrLens_pull {
            0% { object-position: var(--p1s); transform: scale(2.8); filter: blur(15px) brightness(1.8) saturate(1.5); opacity: 0; }
            8% { filter: blur(0px) brightness(1.0) saturate(1.0); opacity: 1; }
            40% { object-position: var(--p1e); transform: scale(2.4); filter: blur(0px) brightness(1.0) saturate(1.0); opacity: 1; }
            
            42% { filter: blur(25px) brightness(2.2) saturate(1.2); opacity: 1; }
            43% { object-position: var(--p2s); transform: scale(2.2); filter: blur(25px) brightness(2.2) saturate(1.2); opacity: 1; }
            45% { filter: blur(0px) brightness(1.0) saturate(1.0); opacity: 1; }
            
            75% { object-position: var(--p2e); transform: scale(1.8); filter: blur(0px) brightness(1.0) saturate(1.0); opacity: 1; }
            
            85% { filter: blur(12px) brightness(1.6) saturate(1.1); opacity: 1; }
            /* Arrives safely at idle pan position and holds for timer */
            95% { object-position: 0% 50%; transform: scale(1.0); filter: blur(0px) brightness(1.0) saturate(1.0); opacity: 1; }
            100% { object-position: 0% 50%; transform: scale(1.0); filter: blur(0px) brightness(1.0) saturate(1.0); opacity: 1; }
        }

        /* 2. Intense Push-In */
        @keyframes ssrLens_push {
            0% { object-position: var(--p1s); transform: scale(1.4); filter: blur(15px) brightness(1.8) saturate(1.5); opacity: 0; }
            8% { filter: blur(0px) brightness(1.0) saturate(1.0); opacity: 1; }
            40% { object-position: var(--p1e); transform: scale(1.8); filter: blur(0px) brightness(1.0) saturate(1.0); opacity: 1; }
            
            42% { filter: blur(25px) brightness(2.2) saturate(1.2); opacity: 1; }
            43% { object-position: var(--p2s); transform: scale(2.4); filter: blur(25px) brightness(2.2) saturate(1.2); opacity: 1; }
            45% { filter: blur(0px) brightness(1.0) saturate(1.0); opacity: 1; }
            
            75% { object-position: var(--p2e); transform: scale(2.8); filter: blur(0px) brightness(1.0) saturate(1.0); opacity: 1; }
            
            85% { filter: blur(12px) brightness(1.6) saturate(1.1); opacity: 1; }
            95% { object-position: 0% 50%; transform: scale(1.0); filter: blur(0px) brightness(1.0) saturate(1.0); opacity: 1; }
            100% { object-position: 0% 50%; transform: scale(1.0); filter: blur(0px) brightness(1.0) saturate(1.0); opacity: 1; }
        }

        /* 3. Chaos Bounce */
        @keyframes ssrLens_bounce {
            0% { object-position: var(--p1s); transform: scale(2.6); filter: blur(15px) brightness(1.8) saturate(1.5); opacity: 0; }
            8% { filter: blur(0px) brightness(1.0) saturate(1.0); opacity: 1; }
            40% { object-position: var(--p1e); transform: scale(1.8); filter: blur(0px) brightness(1.0) saturate(1.0); opacity: 1; }
            
            42% { filter: blur(25px) brightness(2.2) saturate(1.2); opacity: 1; }
            43% { object-position: var(--p2s); transform: scale(2.8); filter: blur(25px) brightness(2.2) saturate(1.2); opacity: 1; }
            45% { filter: blur(0px) brightness(1.0) saturate(1.0); opacity: 1; }
            
            75% { object-position: var(--p2e); transform: scale(2.2); filter: blur(0px) brightness(1.0) saturate(1.0); opacity: 1; }
            
            85% { filter: blur(12px) brightness(1.6) saturate(1.1); opacity: 1; }
            95% { object-position: 0% 50%; transform: scale(1.0); filter: blur(0px) brightness(1.0) saturate(1.0); opacity: 1; }
            100% { object-position: 0% 50%; transform: scale(1.0); filter: blur(0px) brightness(1.0) saturate(1.0); opacity: 1; }
        }

        /* 4. Steady Drift */
        @keyframes ssrLens_drift {
            0% { object-position: var(--p1s); transform: scale(2.2); filter: blur(15px) brightness(1.8) saturate(1.5); opacity: 0; }
            8% { filter: blur(0px) brightness(1.0) saturate(1.0); opacity: 1; }
            40% { object-position: var(--p1e); transform: scale(2.2); filter: blur(0px) brightness(1.0) saturate(1.0); opacity: 1; }
            
            42% { filter: blur(25px) brightness(2.2) saturate(1.2); opacity: 1; }
            43% { object-position: var(--p2s); transform: scale(2.2); filter: blur(25px) brightness(2.2) saturate(1.2); opacity: 1; }
            45% { filter: blur(0px) brightness(1.0) saturate(1.0); opacity: 1; }
            
            75% { object-position: var(--p2e); transform: scale(2.2); filter: blur(0px) brightness(1.0) saturate(1.0); opacity: 1; }
            
            85% { filter: blur(12px) brightness(1.6) saturate(1.1); opacity: 1; }
            95% { object-position: 0% 50%; transform: scale(1.0); filter: blur(0px) brightness(1.0) saturate(1.0); opacity: 1; }
            100% { object-position: 0% 50%; transform: scale(1.0); filter: blur(0px) brightness(1.0) saturate(1.0); opacity: 1; }
        }

        /* ✨ NORMAL LENS EFFECTS (3.2s duration for a luxurious settle) ✨ */
        @keyframes normLens_fade { 
            0% { object-position: var(--p1s); transform: scale(1.6); filter: blur(14px) brightness(1.5); } 
            15% { filter: blur(0px) brightness(1.0); } 
            
            50% { object-position: var(--p1e); transform: scale(1.3); filter: blur(0px) brightness(1.0); } 
            
            75% { filter: blur(8px) brightness(1.2); } 
            /* Arrives safely at idle pan position and holds for timer */
            95% { object-position: 0% 50%; transform: scale(1.0); filter: blur(0px) brightness(1.0); } 
            100% { object-position: 0% 50%; transform: scale(1.0); filter: blur(0px) brightness(1.0); } 
        }

        @keyframes normLens_focus { 
            0% { object-position: var(--p1s); transform: scale(1.3); filter: blur(14px) brightness(1.5); } 
            15% { filter: blur(0px) brightness(1.0); } 
            
            50% { object-position: var(--p1e); transform: scale(1.5); filter: blur(0px) brightness(1.0); } 
            
            75% { filter: blur(8px) brightness(1.2); } 
            95% { object-position: 0% 50%; transform: scale(1.0); filter: blur(0px) brightness(1.0); } 
            100% { object-position: 0% 50%; transform: scale(1.0); filter: blur(0px) brightness(1.0); } 
        }

        @keyframes normLens_glide { 
            0% { object-position: var(--p1s); transform: scale(1.6); filter: blur(14px) brightness(1.5); } 
            15% { filter: blur(0px) brightness(1.0); } 
            
            50% { object-position: var(--p1e); transform: scale(1.3); filter: blur(0px) brightness(1.0); } 
            
            75% { filter: blur(8px) brightness(1.2); } 
            95% { object-position: 0% 50%; transform: scale(1.0); filter: blur(0px) brightness(1.0); } 
            100% { object-position: 0% 50%; transform: scale(1.0); filter: blur(0px) brightness(1.0); } 
        }
                `}</style>

                 {/* ✨ MIKA'S UNIVERSAL HYPE OVERLAY ✨ */}
                {waifu.id !== 'intro' && !waifu.isMusicConcept && (revealPhase === 'hyping' || revealPhase === 'hype_fade') && (
                    <div style={{
                        position: 'absolute', inset: 0, zIndex: 25, pointerEvents: 'none',
                        background: 'rgba(11, 9, 20, 0.65)',
                        backdropFilter: 'blur(6px)',
                        WebkitBackdropFilter: 'blur(6px)',
                        opacity: revealPhase === 'hype_fade' ? 0 : 1,
                        transition: 'opacity 0.5s ease-out',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        padding: '20px', textAlign: 'center'
                    }}>
                        <div style={{ animation: 'csd-rise 0.5s ease-out', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                            <div className="summon-rune" style={{ fontSize: waifu.isSSR ? '50px' : '40px', color: waifu.isSSR ? '#FFD700' : 'var(--accent)' }}>
                                {waifu.isSSR ? '✨💞✨' : '💖'}
                            </div>
                            <h3 style={{ color: waifu.isSSR ? '#FFD700' : '#FFF', margin: 0, fontSize: '15px', letterSpacing: '0.15em', textTransform: 'uppercase', animation: 'csd-pulse 1s infinite', textShadow: waifu.isSSR ? '0 0 15px rgba(255,215,0,0.6)' : '0 0 10px rgba(255, 16, 122, 0.6)' }}>
                                {waifu.isSSR ? 'Perfect Match Found' : 'Match Found'}
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', marginTop: '10px' }}>
                                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.15em' }}>ALGORITHM SYNCED...</span>
                                {displayTraits.map((trait, i) => (
                                    <div key={i} style={{
                                        background: waifu.isSSR ? 'rgba(255, 215, 0, 0.15)' : 'rgba(255, 16, 122, 0.15)', 
                                        border: waifu.isSSR ? '1px solid rgba(255, 215, 0, 0.6)' : '1px solid rgba(255, 16, 122, 0.4)',
                                        color: '#FFF', padding: '6px 16px', borderRadius: '20px',
                                        fontSize: '12px', fontWeight: '800', letterSpacing: '0.05em', textTransform: 'uppercase',
                                        animation: 'fadeIn 0.4s ease-out forwards', opacity: 0, 
                                        animationDelay: `${(i * 0.4) + 0.3}s`, 
                                        boxShadow: waifu.isSSR ? '0 0 12px rgba(255,215,0,0.4)' : '0 0 8px rgba(255, 16, 122, 0.3)',
                                        backdropFilter: 'blur(4px)'
                                    }}>
                                        {trait}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {(waifu.isMusicConcept || (window.mikaSwipeMode === 'music' && waifu.id === 'loading')) ? (
                    <div style={{ position: 'absolute', inset: '16px', border: `2px solid ${waifu.themeColor || '#00E5FF'}`, borderRadius: '16px', background: 'linear-gradient(180deg, #0B0914 0%, #050308 100%)', display: 'flex', flexDirection: 'column', zIndex: 2, boxShadow: `inset 0 0 30px ${waifu.themeColor || '#00E5FF'}20`, overflow: 'hidden', transformStyle: 'preserve-3d' }}>
                        
                        {/* Cassette Header */}
                        <div style={{ padding: '16px', borderBottom: `1px dashed ${waifu.themeColor || '#00E5FF'}50`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', transform: 'translateZ(10px)' }}>
                            <div style={{ color: waifu.themeColor || '#00E5FF', fontSize: '10px', fontWeight: 'bold', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", letterSpacing: '0.1em' }}>[ CARTRIDGE: {waifu.genre?.toUpperCase() || 'UNKNOWN'} ]</div>
                            <div style={{ color: '#EBE3D6', fontSize: '10px', fontWeight: 'bold', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{waifu.bpm || '120 BPM'}</div>
                        </div>

                        {/* Mechanical Reels */}
                        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '30px 20px', background: 'rgba(255, 255, 255, 0.02)', borderBottom: `1px solid ${waifu.themeColor || '#00E5FF'}30`, transform: 'translateZ(20px)' }}>
                            <div className="tape-reel spinning" style={{ borderColor: waifu.themeColor || '#00E5FF', boxShadow: `0 0 15px ${waifu.themeColor || '#00E5FF'}40` }}>
                                <div className="tape-spoke" style={{ background: waifu.themeColor || '#00E5FF' }}></div><div className="tape-spoke" style={{ background: waifu.themeColor || '#00E5FF', transform: 'rotate(60deg)' }}></div><div className="tape-spoke" style={{ background: waifu.themeColor || '#00E5FF', transform: 'rotate(120deg)' }}></div><div className="tape-hub" style={{borderColor: waifu.themeColor || '#00E5FF'}}></div>
                            </div>
                            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                                <div style={{ height: '30px', width: '80%', background: 'rgba(0,0,0,0.8)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', position: 'relative', overflow: 'hidden' }}>
                                    <div style={{ position: 'absolute', top: '50%', left: '0', right: '0', height: '2px', background: 'rgba(255,255,255,0.2)', transform: 'translateY(-50%)' }}></div>
                                    <div style={{ position: 'absolute', top: '50%', left: '10%', right: '10%', height: '8px', background: 'rgba(100, 50, 50, 0.6)', transform: 'translateY(-50%)', borderRadius: '4px' }}></div>
                                </div>
                            </div>
                            <div className="tape-reel spinning" style={{ borderColor: waifu.themeColor || '#00E5FF', boxShadow: `0 0 15px ${waifu.themeColor || '#00E5FF'}40` }}>
                                <div className="tape-spoke" style={{ background: waifu.themeColor || '#00E5FF' }}></div><div className="tape-spoke" style={{ background: waifu.themeColor || '#00E5FF', transform: 'rotate(60deg)' }}></div><div className="tape-spoke" style={{ background: waifu.themeColor || '#00E5FF', transform: 'rotate(120deg)' }}></div><div className="tape-hub" style={{borderColor: waifu.themeColor || '#00E5FF'}}></div>
                            </div>
                        </div>

                        {/* Track Info */}
                        <div style={{ flex: 1, padding: '20px 20px 14px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', transform: 'translateZ(35px)' }}>
                            <h2 style={{ margin: '0 0 10px 0', fontSize: '24px', color: '#FFF', textShadow: `0 0 12px ${waifu.themeColor || '#00E5FF'}`, letterSpacing: '0.05em' }}>{waifu.name}</h2>
                            <p style={{ margin: '0 0 14px 0', fontSize: '11px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>
                                {waifu.vibeDescription}
                            </p>
                            
                            {/* ✨ MIKA'S INTEGRATED TAG CONTAINER ✨ */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left', background: 'rgba(0,0,0,0.4)', padding: '12px', borderRadius: '8px', border: `1px solid ${waifu.themeColor || '#00E5FF'}30` }}>
                                <div style={{ fontSize: '10px', color: waifu.themeColor || '#00E5FF', fontWeight: 'bold', fontFamily: "monospace" }}>&gt; LYRIC_HOOK:</div>
                                <div style={{ fontSize: '12px', fontStyle: 'italic', color: '#fff', borderLeft: `2px solid ${waifu.themeColor || '#00E5FF'}`, paddingLeft: '8px' }}>
                                    {waifu.lyricHook}
                                </div>
                                <div style={{ overflow: 'hidden', width: '100%', marginTop: '4px', position: 'relative' }}>
                                    <div style={{ display: 'flex', whiteSpace: 'nowrap', animation: 'marquee 15s linear infinite', gap: '6px', width: 'max-content' }}>
                                        {[...Array(2)].map((_, loopIdx) => (
                                            <React.Fragment key={loopIdx}>
                                                {waifu.moodTags?.split(',').map((tag, i) => (
                                                    <span key={`${loopIdx}-${i}`} style={{ fontSize: 9, fontFamily: "monospace", letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 800, color: waifu.themeColor || '#00E5FF', border: `1px solid ${waifu.themeColor || '#00E5FF'}60`, background: `${waifu.themeColor || '#00E5FF'}15`, borderRadius: 4, padding: '3px 6px', display: 'inline-block' }}>
                                                        [{tag.trim()}]
                                                    </span>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </div>
                                    <style>{`
                                        @keyframes marquee {
                                            0% { transform: translateX(0); }
                                            100% { transform: translateX(-50%); }
                                        }
                                    `}</style>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (waifu.imageUrl || waifu.image) ? (
                    <img src={waifu.imageUrl || waifu.image} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = Constants.DEFAULT_PROXY.imageUrl; }} alt="" style={{ 
                        position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', 
                        /* MIKA'S DYNAMIC CAMERA VARIABLES */
                        '--p1s': cameraSettings.p1s, '--p1e': cameraSettings.p1e,
                        '--p2s': cameraSettings.p2s, '--p2e': cameraSettings.p2e,
                        '--p3s': cameraSettings.p3s, '--p3e': cameraSettings.p3e,
                        /* MIKA'S CAMERA DIRECTOR ANIMATION */
                        animation: waifu.id === 'intro' 
                            ? 'none' 
                            : ((revealPhase === 'hyping' || revealPhase === 'hype_fade'))
                            ? `ssrHypeZoom ${waifu.isSSR ? '4.4s' : '3.1s'} cubic-bezier(0.2, 0.8, 0.2, 1) forwards`
                            : (waifu.isSSR && revealPhase === 'cinematic') 
                            ? `${cameraSettings.anim} 5.2s ease-out forwards` 
                            : (!waifu.isSSR && revealPhase === 'intro_pan') 
                            ? `${cameraSettings.anim} 3.2s ease-out forwards` 
                            : 'subtlePan 35s ease-in-out infinite', 
                        transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), filter 0.5s ease'
                    }} />
                ) : (
                    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: '40px' }}>🖼️</div>
                )}
                
                {/* ✨ MIKA'S ADAPTIVE ATMOSPHERE ENGINE ✨ */}
                {enableAtmosphere && <AtmosphereEngine waifu={waifu} revealPhase={revealPhase} />}
                
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.25) 38%, rgba(0,0,0,0) 66%)', pointerEvents: 'none', opacity: (isFaded || revealPhase !== 'revealed') ? 0 : 1, transition: 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1)', zIndex: 3 }}></div>
                <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 40px rgba(0,0,0,0.6), inset 0 0 10px rgba(255,255,255,0.15)', pointerEvents: 'none', zIndex: 1 }}></div>
            </div>
            
            {/* ✨ MIKA'S CYBERPUNK REGEN OVERLAY ✨ */}
            <div style={{ position: 'absolute', inset: 0, borderRadius: 26, background: 'rgba(5, 3, 8, 0.65)', backdropFilter: 'blur(20px) saturate(1.2)', WebkitBackdropFilter: 'blur(20px) saturate(1.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 8, opacity: waifu.isRegenerating ? 1 : 0, pointerEvents: waifu.isRegenerating ? 'auto' : 'none', transition: 'opacity 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)', transform: 'translateZ(35px)', padding: '0 40px', border: '1px solid rgba(0, 229, 255, 0.2)', boxShadow: 'inset 0 0 30px rgba(0,229,255,0.05)' }}>
                <div className="swipe-scanlines" style={{ opacity: 0.8 }}></div>
                <div className="resume-spinner" style={{ width: 44, height: 44, marginBottom: 24, borderColor: 'rgba(0, 229, 255, 0.2)', borderTopColor: '#00E5FF', boxShadow: '0 0 15px rgba(0,229,255,0.4)', zIndex: 2 }}></div>
                <div style={{ color: '#00E5FF', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontSize: '12px', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', animation: 'csd-pulse 1.5s infinite', textShadow: '0 0 12px rgba(0, 229, 255, 0.5)', textAlign: 'center', marginBottom: '18px', zIndex: 2 }}>
                    {waifu.name ? waifu.name.split(' ')[0] : 'Match'} is snapping a new pic... 📸
                </div>
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        <span>{waifu.regenStatus || 'Focusing lens...'}</span>
                        <span style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--accent)' }}>{Math.max(0, Math.min(100, Math.round(((waifu.regenStep || 0) / (waifu.regenTotalSteps || 1)) * 100)))}%</span>
                    </div>
                    <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(0,0,0,0.6)', overflow: 'hidden', border: '1px solid rgba(255, 16, 122, 0.3)', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.8)' }}>
                        <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, ((waifu.regenStep || 0) / (waifu.regenTotalSteps || 1)) * 100))}%`, borderRadius: '999px', background: 'linear-gradient(90deg, #B533FF, #FF107A)', transition: 'width 0.25s ease', boxShadow: '0 0 10px rgba(255, 16, 122, 0.6)' }}></div>
                    </div>
                </div>
            </div>

            <div style={{ position: 'absolute', top: 22, left: 20, transform: 'rotate(-16deg) translateZ(45px)', border: '3px solid #00E5FF', color: '#00E5FF', fontWeight: 800, fontSize: 24, letterSpacing: '0.08em', padding: '4px 12px', borderRadius: 8, opacity: Math.max(0, Math.min(1, passOpacity)), transition: 'opacity 0.1s linear', background: 'rgba(255,255,255,0.85)', pointerEvents: 'none' }}>NOPE</div>
            <div style={{ position: 'absolute', top: 22, right: 20, transform: 'rotate(16deg) translateZ(45px)', border: '3px solid #FF107A', color: '#FF107A', fontWeight: 800, fontSize: 24, letterSpacing: '0.08em', padding: '4px 12px', borderRadius: 8, opacity: Math.max(0, Math.min(1, likeOpacity)), transition: 'opacity 0.1s linear', background: 'rgba(255,255,255,0.85)', pointerEvents: 'none' }}>LIKE</div>

            {/* ✨ MIKA'S PARALLAX TEXT CONTAINER ✨ */}
            <div style={{ 
                position: 'absolute', left: 20, right: 20, bottom: 20, color: '#fff', 
                display: 'flex', flexDirection: 'column', gap: 11, transform: 'translateZ(30px)', 
                opacity: (isFaded || revealPhase !== 'revealed') ? 0 : 1, 
                pointerEvents: (isFaded || revealPhase !== 'revealed') ? 'none' : 'auto', 
                transition: 'opacity 0.8s cubic-bezier(0.4, 0, 0.2, 1)' 
            }}>
                {!(waifu.isMusicConcept || (window.mikaSwipeMode === 'music' && waifu.id === 'loading')) && (
                    <React.Fragment>
                        <h2 style={{ fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontSize: 32, lineHeight: 1, margin: 0, fontWeight: 800, letterSpacing: '0.05em', color: '#C8E8F0', textShadow: '0 2px 4px rgba(0,0,0,0.95), 0 0 12px rgba(0,229,255,0.6)' }}>
                            &gt; {(waifu.name || 'COMPANION').toUpperCase()}
                        </h2>
                        <p className="csd-clamp2" style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: 'rgba(255,255,255,0.8)', textShadow: '0 1px 4px #000', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", borderLeft: '2px solid var(--accent)', paddingLeft: '8px', background: 'linear-gradient(90deg, rgba(255,16,122,0.1) 0%, transparent 100%)' }}>
                            {waifu.tagline ? '"' + waifu.tagline.replace(/^["']+|["']+$/g, '').trim() + '"' : waifu.description}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            {waifu.age && (
                                <span style={{ fontSize: 10, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 800, color: '#00FF41', border: '1px solid rgba(0, 255, 65, 0.4)', background: 'rgba(0, 255, 65, 0.1)', backdropFilter: 'blur(4px)', borderRadius: 4, padding: '4px 8px', whiteSpace: 'nowrap', textShadow: '0 0 6px rgba(0,255,65,0.4)', boxShadow: '0 0 8px rgba(0,255,65,0.15)' }}>
                                    [AGE:{waifu.age}]
                                </span>
                            )}
                            {waifu.hasGachaFans && (
                                <span style={{ fontSize: 10, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 900, color: '#000', border: '1px solid #00E5FF', background: '#00E5FF', backdropFilter: 'blur(4px)', borderRadius: 4, padding: '4px 8px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 0 10px rgba(0,229,255,0.5)' }}>
                                    <LockIcon size={11} /> GACHAFANS
                                </span>
                            )}
                            {waifu.tags?.map((tag, i) => <TagPill key={i} label={tag} onDark={true} />)}
                        </div>
                        <button onPointerDown={stopPropagation} onClick={() => setShowDetails(true)} style={{ marginTop: 2, alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 7, border: '1px solid rgba(0, 229, 255, 0.4)', background: 'rgba(0, 229, 255, 0.1)', backdropFilter: 'blur(4px)', color: '#00E5FF', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', padding: '8px 14px', borderRadius: 4, cursor: 'pointer', textShadow: '0 0 6px rgba(0,229,255,0.4)', boxShadow: '0 0 10px rgba(0,229,255,0.1)' }}>
                            &gt; DECRYPT_PROFILE
                        </button>
                    </React.Fragment>
                )}
                
            </div>

            <div onPointerDown={stopPropagation} onClick={() => setShowDetails(false)} style={{ position: 'absolute', inset: 0, borderRadius: 26, background: 'rgba(0, 229, 255, 0.05)', opacity: showDetails ? 1 : 0, pointerEvents: showDetails ? 'auto' : 'none', transition: 'opacity 0.3s ease', zIndex: 11, backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', transform: 'translateZ(40px)' }}></div>
            
            <div style={{ position: 'absolute', inset: 0, borderRadius: 26, overflow: 'hidden', pointerEvents: 'none', zIndex: 12, transform: 'translateZ(50px)' }}>
                <div onPointerDown={stopPropagation} style={{ pointerEvents: showDetails ? 'auto' : 'none', position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '85%', background: 'rgba(5, 3, 8, 0.65)', backdropFilter: 'blur(6px) saturate(1.1)', WebkitBackdropFilter: 'blur(6px) saturate(1.1)', borderTop: '1px solid #00E5FF', borderLeft: '1px solid rgba(0,229,255,0.2)', borderRight: '1px solid rgba(0,229,255,0.2)', padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 16, transform: showDetails ? 'translateY(0)' : 'translateY(110%)', transition: 'transform 0.34s cubic-bezier(.2,.8,.2,1)', boxShadow: '0 -15px 40px rgba(0,0,0,0.9), inset 0 0 30px rgba(0,229,255,0.1)' }}>
                    <div className="swipe-scanlines" style={{ position: 'absolute', inset: 0, opacity: 0.5, pointerEvents: 'none', zIndex: 0 }}></div>
                    
                    <div style={{ width: 40, height: 4, borderRadius: 2, background: 'rgba(0,229,255,0.4)', alignSelf: 'center', flexShrink: 0, boxShadow: '0 0 10px rgba(0,229,255,0.6)', position: 'relative', zIndex: 1 }}></div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, borderBottom: '1px dashed rgba(0,229,255,0.3)', paddingBottom: '10px', position: 'relative', zIndex: 1 }}>
                        <h3 style={{ fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", margin: 0, fontSize: 16, fontWeight: 800, color: '#00E5FF', letterSpacing: '0.05em', textShadow: '0 0 8px rgba(0,229,255,0.4)' }}>&gt; {(waifu.name || 'COMPANION').toUpperCase()}_DATA</h3>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <button 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if (waifu.id === 'intro' || waifu.isCatfish) return;
                                    onShareProfile(waifu);
                                }} 
                                style={{ width: 32, height: 32, borderRadius: '4px', border: '1px dashed rgba(0,229,255,0.4)', background: 'rgba(0,229,255,0.05)', color: '#00E5FF', display: (waifu.id === 'intro' || waifu.isCatfish) ? 'none' : 'grid', placeItems: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseOver={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.2)'; e.currentTarget.style.boxShadow = '0 0 10px rgba(0,229,255,0.3)'; }}
                                onMouseOut={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.05)'; e.currentTarget.style.boxShadow = 'none'; }}
                                title="Transmit profile to a friend"
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
                            </button>
                                      <button 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if (!waifu.isRegenerating && waifu.id !== 'intro') {
                                        setShowDetails(false);
                                        if (onOpenMatrix) {
                                            onOpenMatrix({
                                                type: 'profile',
                                                title: 'SELFIE_RE-ENCRYPTION',
                                                waifu: waifu,
                                                execute: (tags = null) => onRegenImage(waifu, tags)
                                            });
                                        }
                                    }
                                }} 
                                style={{ width: 32, height: 32, borderRadius: '4px', border: '1px dashed rgba(255,16,122,0.4)', background: 'rgba(255,16,122,0.05)', color: 'var(--accent)', display: waifu.id === 'intro' ? 'none' : 'grid', placeItems: 'center', cursor: 'pointer', opacity: waifu.isRegenerating ? 0.5 : 0.9, transition: 'all 0.2s' }}
                                title="Visual Matrix Override"
                            >
                                <CameraIcon />
                            </button>
                            <button 
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if (waifu.id === 'intro' || waifu.isCatfish || !waifu.hasGachaFans) return;
                                    if (onOpenGachaFans) {
                                        setShowDetails(false);
                                        onOpenGachaFans(waifu, true);
                                    }
                                }} 
                                disabled={!waifu.hasGachaFans}
                                style={{ width: 32, height: 32, borderRadius: '4px', border: waifu.hasGachaFans ? '1px solid rgba(0,229,255,0.4)' : '1px solid rgba(255,255,255,0.1)', background: waifu.hasGachaFans ? 'rgba(0,229,255,0.1)' : 'rgba(255,255,255,0.05)', color: waifu.hasGachaFans ? '#00E5FF' : '#555', display: (waifu.id === 'intro' || waifu.isCatfish) ? 'none' : 'grid', placeItems: 'center', cursor: waifu.hasGachaFans ? 'pointer' : 'not-allowed', transition: 'all 0.2s', opacity: waifu.hasGachaFans ? 1 : 0.4 }}
                                title={waifu.hasGachaFans ? "View GachaFans" : "No Premium Page Found"}
                            >
                                <LockIcon size={15} />
                            </button>
                            <button onClick={() => setShowDetails(false)} style={{ width: 32, height: 32, borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'var(--text-dim)', display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
                                <XIcon size={16} />
                            </button>
                        </div>
                    </div>
                    
                    <div className="stat-page-content" onPointerDown={e => e.stopPropagation()} style={{ paddingRight: '8px', position: 'relative', zIndex: 1 }}>
                        <DetailsList label="Into" items={waifu.likes || waifu.tags} tone="like" />
                        <DetailsList label="Not into" items={waifu.dislikes || ['Boring people']} tone="dislike" />
                        {waifu.quirks && waifu.quirks.length > 0 && <DetailsList label="Quirks" items={waifu.quirks} tone="like" isBlock={true} />}
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start', marginTop: '16px' }}>
                            <span style={{ fontSize: 10, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#00E5FF' }}>&gt; DATABASE_ENTRY</span>
                            <div style={{ fontSize: 12, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", color: '#EBE3D6', background: 'rgba(0, 229, 255, 0.05)', backdropFilter: 'blur(8px)', borderRadius: 4, padding: '12px 16px', lineHeight: 1.5, borderLeft: '2px solid rgba(0, 229, 255, 0.5)', borderTop: '1px solid rgba(0, 229, 255, 0.2)', borderRight: '1px solid rgba(0, 229, 255, 0.2)', borderBottom: '1px solid rgba(0, 229, 255, 0.2)' }}>
                                {waifu.description}
                                <br/><br/>
                                <span style={{opacity: 0.8}}>{waifu.personality}</span>
                            </div>
                        </div>

                        <div style={{ fontStyle: 'italic', color: '#C8E8F0', fontSize: '13px', lineHeight: 1.5, marginTop: '8px', background: 'rgba(0,229,255,0.05)', padding: '12px', borderLeft: '2px solid #00E5FF', borderRadius: '0 4px 4px 0', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>
                            "*{waifu.scenario}* {waifu.first_message || waifu.greeting}"
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
