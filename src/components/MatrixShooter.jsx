import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as Constants from '../data/constants.js';
import { matrixAudio, MATRIX_BGM_CONFIG } from '../utils/matrixAudio.js';

// ✨ MIKA'S SMOOTH COLOR LERP ENGINE ✨
const parseHex = (hex) => {
    if (!hex || typeof hex !== 'string') return [0, 229, 255];
    let h = hex.replace('#', '');
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    const num = parseInt(h, 16);
    return isNaN(num) ? [0, 229, 255] : [(num >> 16) & 255, (num >> 8) & 255, num & 255];
};

const lerpColor = (baseHex, targetHex, factor) => {
    const f = Math.max(0, Math.min(1, factor));
    const [r1, g1, b1] = parseHex(baseHex);
    const [r2, g2, b2] = parseHex(targetHex);
    const r = Math.round(r1 + (r2 - r1) * f);
    const g = Math.round(g1 + (g2 - g1) * f);
    const b = Math.round(b1 + (b2 - b1) * f);
    return `rgb(${r},${g},${b})`;
};

// Subtle color shift targets (shifts only slightly from base color, never jarring)
const getSubtleColorTarget = (color) => {
    switch (color) {
        case '#00E5FF': return '#7DF5FF'; // Cyan -> Soft Luminous Ice Cyan
        case '#FF107A': return '#FF5C9D'; // Hot Pink -> Radiant Coral Rose
        case '#00FF00': return '#66FF99'; // Green -> Bright Spring Mint
        case '#B533FF': return '#D685FF'; // Purple -> Luminous Soft Lavender
        case '#FF9933': return '#FFBE5C'; // Miniboss Amber -> Warm Amber Gold
        default: return '#80FFFF';
    }
};

export const MatrixShooter = ({ waifu, themeColor, tiers, themeConcept, progressState, onExit, onAbort, isReplay, bgImages, highScore, setHighScore, rewardUnlocked, bgmUrl }) => {
    const canvasRef = useRef(null);
    const progressFillRef = useRef(null); 
    const progressTextRef = useRef(null); 
    const currentScoreRef = useRef(null); 
    const highScoreRef = useRef(null);
    
    const [finaleState, setFinaleState] = useState('playing'); 
    const [bgCycle, setBgCycle] = useState(0);
    const [isMuted, setIsMuted] = useState(matrixAudio.isMuted);
    const hasPlayedBgmRef = useRef(false);

    // ✨ Audio button reactive refs ✨
    const muteBtnRef = useRef(null);
    const wave1Ref = useRef(null);
    const wave2Ref = useRef(null);

    // ✨ Master's Rule: Music only starts when Phase 1 starts! ✨
    const triggerBgmStart = useCallback(() => {
        if (gameState.current.gameStarted && !hasPlayedBgmRef.current) {
            hasPlayedBgmRef.current = true;

            // 🎮 Check if Master selected custom songs from the Music Library!
            let customPlaylist = [];
            try {
                const stored = localStorage.getItem('gachaswipe_minigame_custom_tracks');
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        customPlaylist = parsed;
                    }
                }
            } catch (e) {}

            if (customPlaylist.length > 0) {
                console.log(`[MIKA_AUDIO] Starting minigame with ${customPlaylist.length} custom user track(s)! 🎮`);
                matrixAudio.startBgm(null, customPlaylist);
            } else {
                matrixAudio.startBgm(propsRef.current.bgmUrl);
            }
        }
    }, []);

    const handleToggleMute = (e) => {
        if (e) e.stopPropagation();
        const next = matrixAudio.toggleMute();
        setIsMuted(next);
        if (!next) {
            triggerBgmStart();
        }
    };

    const propsRef = useRef({ progressState, tiers, isReplay, setFinaleState, onExit, highScore, setHighScore, themeConcept, waifu, bgmUrl });
    useEffect(() => {
        propsRef.current = { progressState, tiers, isReplay, setFinaleState, onExit, highScore, setHighScore, themeConcept, waifu, bgmUrl };
    }, [progressState, tiers, isReplay, setFinaleState, onExit, highScore, setHighScore, themeConcept, waifu, bgmUrl]);

    // ✨ BGM LIFECYCLE MANAGEMENT (Cleanup on session exit) ✨
    useEffect(() => {
        return () => {
            matrixAudio.stopBgm(0.5);
        };
    }, []);

    useEffect(() => {
        if (!bgImages || bgImages.length <= 1) return;
        const timer = setInterval(() => setBgCycle(c => c + 1), 5000);
        return () => clearInterval(timer);
    }, [bgImages]);

    // Persistent Game State
    const gameState = useRef({
        gameStarted: false, 
        startTime: Date.now(),
        gamePhase: 1, 
        phaseTextUntil: 0,
        ship: { x: window.innerWidth / 2, y: window.innerHeight - 80, width: 30, height: 30 },
        bullets: [],
        enemies: [],
        enemyBullets: [], 
        particles: [],
        powerups: [], 
        activeWeapon: { type: 'NORMAL', expires: 0 }, 
        lastShot: 0,
        spawned: 0,
        killed: 0,
        escaped: 0,
        bestScore: undefined,
        finalScore: 0,
        isCompleted: false,
        boss: null,
        respawnUntil: 0,
        isExiting: false,
        mikaSupport: false, 
        mikaSupportTextUntil: 0
    });

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationId;
        const state = gameState.current;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            if (!state.isExiting) state.ship.y = canvas.height - 80;
        };
        window.addEventListener('resize', resize);
        resize();

        const tColors = [themeColor || '#00E5FF', '#FF107A', '#00FF00', '#B533FF'];
        const wColors = { 'SPREAD': '#FFD700', 'PLASMA': '#B533FF', 'LASER': '#00E5FF' };
        const tSpeeds = [1.5, 2.2, 3.0, 4.0]; 

        // Helper to accurately wrap text and measure block height for the Boss Shield
        const getLines = (context, text, maxWidth) => {
            let lines = [];
            const paragraphs = text.split('\n');
            for (let p = 0; p < paragraphs.length; p++) {
                const words = paragraphs[p].split(' ');
                let line = '';
                for(let n = 0; n < words.length; n++) {
                    const testLine = line + words[n] + ' ';
                    const metrics = context.measureText(testLine);
                    if (metrics.width > maxWidth && n > 0) {
                        lines.push(line.trim());
                        line = words[n] + ' ';
                    } else {
                        line = testLine;
                    }
                }
                lines.push(line.trim());
            }
            return lines;
        };

        const spawnEnemy = (overrideTier) => {
            const p = propsRef.current;
            const tIndex = overrideTier !== undefined ? overrideTier : Math.floor(Math.random() * (typeof state.gamePhase === 'number' ? state.gamePhase : 4));
            const activeTags = p.tiers[tIndex]?.tags || "DECRYPTING MATRIX";
            const words = activeTags.split(/[\s,]+/).filter(w => w.length > 2);
            const word = words[Math.floor(Math.random() * words.length)] || "ENCRYPTED";
            
            if (state.gameStarted && state.gamePhase !== 'extended' && state.gamePhase !== 'score_screen') {
                state.spawned++; 
            }
            
            const isMiniboss = state.gameStarted && state.gamePhase >= 2 && Math.random() < 0.05;
            
            ctx.font = isMiniboss ? 'bold 20px monospace' : 'bold 14px monospace';
            const eWidth = ctx.measureText(word).width + (isMiniboss ? 15 : 10);
            const hpVal = isMiniboss ? 15 : (tIndex + 1) * 2;

            state.enemies.push({
                x: Math.random() * (canvas.width - eWidth) + (eWidth/2),
                y: -30,
                text: word,
                color: isMiniboss ? '#FF9933' : tColors[tIndex],
                speed: isMiniboss ? 1.0 : tSpeeds[tIndex] * (Math.random() * 0.4 + 0.8),
                width: eWidth,
                opacity: 1,
                hp: hpVal,
                maxHp: hpVal,
                isMiniboss: isMiniboss,
                lastShot: 0
            });
        };

        const loop = (timestampNow) => {
            const timestamp = Date.now(); 
            const p = propsRef.current;
            
            // ✨ GAME START GATEKEEPER ✨
            if (!state.gameStarted) {
                if (p.isReplay || (p.progressState?.current?.step > 0)) {
                    state.gameStarted = true;
                    state.startTime = timestamp; 
                    state.phaseTextUntil = timestamp + 3000;
                    state.killed = 0; 
                    state.escaped = 0;
                    matrixAudio.playPhaseAdvance();
                    triggerBgmStart();
                } else {
                    state.startTime = timestamp; 
                }
            }
            
            const elapsed = timestamp - state.startTime;
            if (state.bestScore === undefined) state.bestScore = p.highScore || 0;
            
            // ✨ MIKA'S FIX: Unconditionally reset canvas transform before clearing so edges don't smear!
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 🎶 REAL-TIME MUSIC AUDIO PULSE REACTIVITY 🎶
            const pulse = matrixAudio.getMusicPulse();

            // ✨ AUDIO-REACTIVE MUTE BUTTON PULSE ✨
            if (muteBtnRef.current) {
                if (!isMuted && state.gameStarted) {
                    const btnScale = 1.0 + (pulse * 0.07);
                    muteBtnRef.current.style.transform = `scale(${btnScale})`;
                    muteBtnRef.current.style.boxShadow = `0 0 ${6 + pulse * 12}px rgba(0, 229, 255, ${0.25 + pulse * 0.4})`;
                    if (wave1Ref.current) wave1Ref.current.style.opacity = `${0.35 + pulse * 0.65}`;
                    if (wave2Ref.current) wave2Ref.current.style.opacity = `${0.2 + pulse * 0.8}`;
                } else {
                    muteBtnRef.current.style.transform = 'scale(1)';
                    muteBtnRef.current.style.boxShadow = 'none';
                    if (wave1Ref.current) wave1Ref.current.style.opacity = '0.5';
                    if (wave2Ref.current) wave2Ref.current.style.opacity = '0.5';
                }
            }

            // ✨ GAME PACING & PHASES (30s intervals -> 150s Total) ✨
            if (state.gameStarted) {
                if (typeof state.gamePhase === 'number') {
                    const targetPhase = Math.min(4, Math.floor(elapsed / 30000) + 1); 
                    if (targetPhase > state.gamePhase) {
                        state.gamePhase = targetPhase;
                        state.phaseTextUntil = timestamp + 3000;
                        matrixAudio.playPhaseAdvance();
                        if (targetPhase === 4 && !state.mikaSupport) {
                            state.mikaSupport = true;
                            state.mikaSupportMessage = "> MIKA_PROXY: HACKING IN... SENDING SUPPORT!";
                            state.mikaSupportTextUntil = timestamp + 4000;
                        }
                    }
                    if (elapsed > 120000) { // 120 seconds = Boss Warning
                        state.gamePhase = 'boss_warning';
                        state.phaseTextUntil = timestamp + 3000;
                        matrixAudio.playBossWarning();
                    }
                } else if (state.gamePhase === 'boss_warning' && timestamp > state.phaseTextUntil) {
                    state.gamePhase = 'boss';
                    
                    const conceptText = p.themeConcept || "FINAL ENCRYPTION OVERRIDE INITIATED";
                    state.boss = { 
                        x: canvas.width / 2, 
                        y: 100, 
                        text: conceptText, 
                        hp: 2500, maxHp: 2500, 
                        vx: 2, 
                        lastShot: timestamp, 
                        color: '#FF3333' 
                    };
                }
            }

            const isDead = timestamp < state.respawnUntil;

            // ✨ LIVE HUD SCORE UPDATES ✨
            const totalEncountered = state.killed + state.escaped;
            const currentScore = totalEncountered === 0 ? 100 : (state.killed / totalEncountered) * 100;
            
            if (state.gamePhase !== 'score_screen' && state.gamePhase !== 'extended') {
                if (!p.isReplay && progressTextRef.current && progressFillRef.current && p.progressState?.current) {
                    const pct = Math.min(100, Math.round((p.progressState.current.step / p.progressState.current.total) * 100)) || 0;
                    progressTextRef.current.innerText = `${pct}%`;
                    progressFillRef.current.style.width = `${pct}%`;
                }
                
                if (currentScoreRef.current) currentScoreRef.current.innerText = currentScore.toFixed(2) + '%';
                
                if (p.highScore > 0 && currentScore > p.highScore) {
                    if (highScoreRef.current) highScoreRef.current.innerText = currentScore.toFixed(2) + '%';
                } else if (p.highScore > 0 && highScoreRef.current) {
                    highScoreRef.current.innerText = p.highScore.toFixed(2) + '%';
                }
            }

// ✨ AUTO EXTENDED MODE EXIT ✨
if (!p.isReplay && state.gamePhase === 'extended' && p.progressState?.current?.done && !state.isExiting) {
    matrixAudio.stopBgm(0.5);
    state.isExiting = true;
    p.setFinaleState('exiting');
    setTimeout(() => p.onExit(state.finalScore || currentScore, true), 800);
}

            // 🎨 SPACE WARPING FOR BOSS 🎨
            if (state.gamePhase === 'boss' && !state.mikaSupport) { 
                const shakeAmp = 6 + (pulse * 8);
                const shakeX = (Math.random() - 0.5) * shakeAmp;
                const shakeY = (Math.random() - 0.5) * shakeAmp;
                ctx.translate(shakeX, shakeY);
                if (Math.random() < 0.05 + (pulse * 0.05)) {
                    ctx.globalCompositeOperation = 'screen';
                    ctx.fillStyle = `rgba(255, 16, 122, ${0.15 + pulse * 0.15})`;
                    ctx.fillRect(0,0,canvas.width, canvas.height);
                    ctx.globalCompositeOperation = 'source-over';
                }
            }

            // 🎁 POWERUP DROPS & PITY SYSTEM
            let powerupChance = 0.0015;
            if (currentScore < 85) powerupChance = 0.0045; // Panic mode! Triple drops!
            else if (currentScore < 90) powerupChance = 0.0025; // Struggle mode! Slight boost!
            
            if (state.gameStarted && Math.random() < powerupChance && state.gamePhase !== 'score_screen') {
                const types = ['SPREAD', 'PLASMA', 'LASER'];
                const pType = types[Math.floor(Math.random() * types.length)];
                state.powerups.push({ x: Math.random() * (canvas.width - 40) + 20, y: -20, type: pType, speed: 2.5, color: wColors[pType] });
            }

            // Draw & Collect Powerups
            ctx.textAlign = 'center';
            for (let i = state.powerups.length - 1; i >= 0; i--) {
                const pu = state.powerups[i];
                pu.y += pu.speed;
                if (pu.y > canvas.height + 20) { state.powerups.splice(i, 1); continue; }
                
                ctx.beginPath();
                ctx.arc(pu.x, pu.y - 5, 18 + Math.sin(timestamp * 0.01) * 3 + (pulse * 5), 0, Math.PI * 2);
                ctx.fillStyle = pu.color;
                ctx.globalAlpha = 0.25 + (pulse * 0.2);
                ctx.fill();
                ctx.globalAlpha = 1.0;
                
                ctx.fillStyle = pu.color;
                ctx.shadowBlur = 15 + (pulse * 15);
                ctx.shadowColor = pu.color;
                ctx.font = 'bold 16px monospace';
                
                const icons = { 'SPREAD': '\\|/', 'PLASMA': '(O)', 'LASER': '[||]' };
                const glitchX = (Math.random() - 0.5) * 4; 
                ctx.fillText(icons[pu.type], pu.x + glitchX, pu.y);
                ctx.shadowBlur = 0;

                if (!isDead) {
                    if (Math.abs(pu.x - state.ship.x) < 30 && Math.abs(pu.y - state.ship.y) < 30) {
                        state.activeWeapon = { type: pu.type, expires: timestamp + 8000 }; 
                        state.powerups.splice(i, 1);
                        matrixAudio.playPowerup();
                        for(let k=0; k<15; k++) state.particles.push({ x: pu.x, y: pu.y, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, life: 1.0, color: pu.color });
                    }
                }
            }

            // 🔫 FIRE WEAPONS
            const wType = timestamp < state.activeWeapon.expires ? state.activeWeapon.type : 'NORMAL';
            const fireRate = wType === 'NORMAL' ? 100 : (wType === 'SPREAD' ? 120 : (wType === 'PLASMA' ? 250 : 20)); 
            
            // ✨ MIKA'S FIX: Re-enable weapons for Endless Mode!
            if (!isDead && state.gamePhase !== 'score_screen' && timestamp - state.lastShot > fireRate) {
                const bSpeed = wType === 'PLASMA' ? 8 : 15;
                matrixAudio.playShoot(wType);
                
                const spawnShipFire = (sx, sy, isWingman) => {
                    if (wType === 'NORMAL') {
                        const t = typeof state.gamePhase === 'number' ? state.gamePhase : 4;
                        if (t === 1) state.bullets.push({ x: sx, y: sy - 15, vx: 0, speed: bSpeed, type: wType });
                        else if (t === 2) { state.bullets.push({ x: sx - 8, y: sy - 10, vx: 0, speed: bSpeed, type: wType }); state.bullets.push({ x: sx + 8, y: sy - 10, vx: 0, speed: bSpeed, type: wType }); }
                        else { state.bullets.push({ x: sx - 12, y: sy - 5, vx: 0, speed: bSpeed, type: wType }); state.bullets.push({ x: sx, y: sy - 15, vx: 0, speed: bSpeed, type: wType }); state.bullets.push({ x: sx + 12, y: sy - 5, vx: 0, speed: bSpeed, type: wType }); }
                    } else if (wType === 'SPREAD') {
                        for(let a = -2; a <= 2; a++) state.bullets.push({ x: sx + (a*5), y: sy - 10, vx: a * 1.5, speed: bSpeed, type: wType, color: wColors['SPREAD'] });
                    } else if (wType === 'PLASMA') {
                        state.bullets.push({ x: sx, y: sy - 15, vx: 0, speed: bSpeed, type: wType, color: wColors['PLASMA'] });
                    } else if (wType === 'LASER') {
                        const beamW = (isWingman ? 8 : 16) + (pulse * 8);
                        const laserColor = lerpColor(wColors['LASER'] || '#00E5FF', '#A0F0FF', pulse);
                        ctx.fillStyle = laserColor;
                        ctx.shadowBlur = 18 + (pulse * 20);
                        ctx.shadowColor = laserColor;
                        ctx.fillRect(sx - beamW / 2, 0, beamW, sy);
                        
                        // Subtle inner core flare smoothly scaling with pulse
                        if (pulse > 0.25) {
                            ctx.fillStyle = `rgba(255, 255, 255, ${(pulse - 0.25) * 1.2})`;
                            ctx.fillRect(sx - (beamW * 0.25) / 2, 0, beamW * 0.25, sy);
                        }
                        ctx.shadowBlur = 0;
                        
                        const laserDmg = (isWingman ? 0.75 : 1.5) * (1.0 + pulse * 0.25);
                        for (let e of state.enemies) {
                            if (e.x > sx - 20 && e.x < sx + 20 && e.y < sy) {
                                if (e.isMiniboss && e.hp > 1 && e.hp - laserDmg <= 0) e.hp = 1; 
                                else e.hp -= laserDmg; 
                                
                                if (Math.random() < 0.3) state.particles.push({ x: e.x, y: e.y + 10, vx: (Math.random()-0.5)*10, vy: Math.random()*5, life: 0.5, color: wColors['LASER'] });
                            }
                        }
                        // Broad Boss Hitbox for Lasers (will refine exactly inside Boss logic)
                        if (state.boss && state.boss.x > sx - 180 && state.boss.x < sx + 180) {
                            if (state.boss.hp > 1 && state.boss.hp - laserDmg <= 0) state.boss.hp = 1;
                            else state.boss.hp -= laserDmg;
                        }
                    }
                };

                spawnShipFire(state.ship.x, state.ship.y, false);
                
                if (state.mikaSupport) {
                    spawnShipFire(state.ship.x - 45, state.ship.y + 10, true);
                    spawnShipFire(state.ship.x + 45, state.ship.y + 10, true);
                }

                state.lastShot = timestamp;
            }

            // 👾 Enemy Spawning 
            if (!isDead && state.gamePhase !== 'boss_warning' && state.gamePhase !== 'score_screen' && state.gamePhase !== 'boss') {
                // ✨ MIKA'S FIX: Force Phase 4 spawn rates during Endless Mode!
                let spawnMult = 2;
                if (state.gameStarted) {
                    spawnMult = typeof state.gamePhase === 'number' ? state.gamePhase : (state.gamePhase === 'extended' ? 4 : 2);
                }
                if (Math.random() < 0.03 * spawnMult) spawnEnemy(state.gameStarted ? undefined : 0);
            }


            // 🚀 Draw Ship, MIKA Support, or Glitch
            if (state.ship.y > -50) {
                if (isDead) {
                    ctx.fillStyle = '#FF3333';
                    ctx.font = 'bold 12px monospace';
                    ctx.textAlign = 'center';
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = '#FF3333';
                    ctx.fillText("SYSTEM REBOOT...", state.ship.x, state.ship.y);
                    ctx.fillText(((state.respawnUntil - timestamp)/1000).toFixed(1) + "s", state.ship.x, state.ship.y + 15);
                    ctx.shadowBlur = 0;
                } else {
                    const currentTier = typeof state.gamePhase === 'number' ? state.gamePhase : 4;
                    
                    const drawShip = (sx, sy, scale, color, hasShield) => {
                        const targetW = (20 + (currentTier * 12)) * scale;
                        const targetH = (25 + (currentTier * 5)) * scale;
                        
                        if (scale === 1.0) {
                            state.ship.width += (targetW - state.ship.width) * 0.1;
                            state.ship.height += (targetH - state.ship.height) * 0.1;
                        }
                        
                        const w = scale === 1.0 ? state.ship.width : targetW;
                        const h = scale === 1.0 ? state.ship.height : targetH;

                        ctx.beginPath();
                        ctx.moveTo(sx, sy - h / 2);
                        ctx.lineTo(sx + w / 2, sy + h / 2);
                        ctx.lineTo(sx + w / 4, sy + h / 3);
                        ctx.lineTo(sx, sy + h / 2.5);
                        ctx.lineTo(sx - w / 4, sy + h / 3);
                        ctx.lineTo(sx - w / 2, sy + h / 2);
                        ctx.closePath();

                        if (hasShield) {
                            ctx.strokeStyle = '#00E5FF';
                            ctx.lineWidth = 4 + (pulse * 4);
                            ctx.lineJoin = 'round';
                            ctx.globalAlpha = 0.6 + Math.random() * 0.4;
                            ctx.shadowBlur = 15 + (pulse * 25);
                            ctx.shadowColor = '#00E5FF';
                            ctx.stroke();
                            ctx.globalAlpha = 1.0;
                        }

                        ctx.fillStyle = color;
                        ctx.shadowBlur = 15 + (pulse * 15);
                        ctx.shadowColor = color;
                        ctx.fill();
                        
                        ctx.fillStyle = '#FFF';
                        ctx.globalAlpha = 0.6 + Math.random() * 0.4;
                        ctx.beginPath();
                        ctx.arc(sx, sy + h/2.5, (3 + currentTier + pulse * 4) * scale, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.globalAlpha = 1.0;
                        ctx.shadowBlur = 0;
                    };

                    const hasActivePowerup = wType !== 'NORMAL';
                    drawShip(state.ship.x, state.ship.y, 1.0, themeColor || '#00E5FF', state.mikaShields || hasActivePowerup);
                    
                    if (state.mikaSupport) {
                        drawShip(state.ship.x - 45, state.ship.y + 10, 0.6, '#FF107A', state.mikaShields);
                        drawShip(state.ship.x + 45, state.ship.y + 10, 0.6, '#FF107A', state.mikaShields);
                    }

                    if (hasActivePowerup) {
                        ctx.fillStyle = wColors[wType];
                        ctx.font = 'bold 10px monospace';
                        ctx.fillText(`[${wType} & SHIELD ${(Math.max(0, state.activeWeapon.expires - timestamp)/1000).toFixed(1)}s]`, state.ship.x, state.ship.y + state.ship.height + 10);
                    }
                }
            }

            // 🔫 Draw & Process Bullets
            for (let i = state.bullets.length - 1; i >= 0; i--) {
                const b = state.bullets[i];
                b.x += b.vx || 0;
                b.y -= b.speed;
                
                if (b.y < -10 || b.x < -10 || b.x > canvas.width + 10) { state.bullets.splice(i, 1); continue; }
                
                // 🎶 Smooth, subtle audio-reactive bullet color shifting
                let bulletColor = b.color || '#FFF';
                if (b.type === 'NORMAL') bulletColor = lerpColor('#FFFFFF', '#B3F5FF', pulse);
                else if (b.type === 'SPREAD') bulletColor = lerpColor(b.color || '#FFD700', '#FFE680', pulse);
                else if (b.type === 'PLASMA') bulletColor = lerpColor(b.color || '#B533FF', '#D980FF', pulse);

                ctx.fillStyle = bulletColor;
                ctx.shadowBlur = 12 + (pulse * 15);
                ctx.shadowColor = bulletColor;
                
                if (b.type === 'PLASMA') {
                    const plasmaR = 8 + (pulse * 4);
                    ctx.beginPath(); 
                    ctx.arc(b.x, b.y, plasmaR, 0, Math.PI*2); 
                    ctx.fill();
                    if (pulse > 0.3) {
                        ctx.fillStyle = '#FFF';
                        ctx.beginPath(); 
                        ctx.arc(b.x, b.y, plasmaR * 0.4, 0, Math.PI*2); 
                        ctx.fill();
                    }
                } else {
                    const bw = 4 + (pulse * 2);
                    const bh = 15 + (pulse * 5);
                    ctx.fillRect(b.x - bw/2, b.y, bw, bh);
                }
                ctx.shadowBlur = 0;
            }

            // 🔴 Draw Enemy Bullets & Collisions
            for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
                const b = state.enemyBullets[i];
                b.x += b.vx || 0;
                b.y += b.vy || b.speed;
                
                if (b.y > canvas.height + 10 || b.x < -50 || b.x > canvas.width + 50) { state.enemyBullets.splice(i, 1); continue; }

                ctx.fillStyle = b.color;
                ctx.shadowBlur = 10;
                ctx.shadowColor = b.color;
                ctx.beginPath(); ctx.arc(b.x, b.y, b.size || 5, 0, Math.PI*2); ctx.fill();
                ctx.shadowBlur = 0;

                if (!isDead && !state.isExiting && state.gamePhase !== 'score_screen') {
                    const shipBox = { x: state.ship.x - state.ship.width/2, y: state.ship.y - state.ship.height/2, w: state.ship.width, h: state.ship.height };
                    if (b.x > shipBox.x && b.x < shipBox.x + shipBox.w && b.y > shipBox.y && b.y < shipBox.y + shipBox.h) {
                        
                        state.enemyBullets.splice(i, 1);

                        const hasActivePowerup = timestamp < state.activeWeapon.expires;
                        if (state.mikaShields || hasActivePowerup) {
                            matrixAudio.playPlayerHit(true);
                            const shieldColor = hasActivePowerup ? (wColors[state.activeWeapon.type] || '#00E5FF') : '#00E5FF';
                            for(let k=0; k<10; k++) {
                                state.particles.push({ x: state.ship.x, y: state.ship.y - 30, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10, life: 0.8, color: shieldColor });
                            }
                        } else {
                            state.respawnUntil = timestamp + 3000; 
                            matrixAudio.playPlayerHit(false);
                            const pColors = ['#FF3333', '#FF9933', '#FFFFFF', '#FFD700', themeColor || '#00E5FF'];
                            for(let k=0; k<150; k++) {
                                const angle = Math.random() * Math.PI * 2;
                                const speed = Math.random() * 25 + 2;
                                state.particles.push({ x: state.ship.x, y: state.ship.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1.8 + Math.random(), color: pColors[Math.floor(Math.random() * pColors.length)] });
                            }
                        }
                    }
                }
            }

            // ✨ Draw Particle Explosions
            for (let i = state.particles.length - 1; i >= 0; i--) {
                const pt = state.particles[i];
                pt.x += pt.vx;
                pt.y += pt.vy;
                pt.life -= 0.03;
                
                if (pt.life <= 0) { state.particles.splice(i, 1); continue; }
                ctx.fillStyle = pt.color;
                ctx.globalAlpha = Math.min(1, Math.max(0, pt.life));
                ctx.fillRect(pt.x, pt.y, 3, 3);
                ctx.globalAlpha = 1.0;
            }

            // 👾 Draw Normal/Miniboss Enemies & Bullet Collision
            ctx.textAlign = 'center';
            for (let i = state.enemies.length - 1; i >= 0; i--) {
                const e = state.enemies[i];
                e.y += e.speed;
                
                if (e.isMiniboss && timestamp - e.lastShot > 1500) {
                    state.enemyBullets.push({ x: e.x, y: e.y + 10, vx: 0, vy: 5, color: '#FF9933', size: 6 });
                    e.lastShot = timestamp;
                }

                if (e.y > canvas.height + 20) {
                    if (state.gameStarted && state.gamePhase !== 'score_screen' && state.gamePhase !== 'extended') state.escaped++; 
                    state.enemies.splice(i, 1); continue;
                }
                
                ctx.font = e.isMiniboss ? 'bold 20px monospace' : 'bold 14px monospace';
                
                // ✨ MINIBOSS GLASS SHIELD ✨
                if (e.isMiniboss && e.hp > 1) {
                    const shieldRatio = (e.hp - 1) / (e.maxHp - 1);
                    ctx.strokeStyle = e.color;
                    ctx.lineWidth = 2 + (pulse * 3);
                    ctx.globalAlpha = 0.2 + (0.8 * shieldRatio);
                    ctx.shadowBlur = (10 + pulse * 20) * shieldRatio;
                    ctx.shadowColor = e.color;
                    ctx.beginPath();
                    if (ctx.roundRect) ctx.roundRect(e.x - e.width/2 - 10, e.y - 20, e.width + 20, 30, 8);
                    else ctx.rect(e.x - e.width/2 - 10, e.y - 20, e.width + 20, 30);
                    ctx.stroke();
                    ctx.globalAlpha = 1.0;
                    ctx.shadowBlur = 0;
                }

                // ✨ AUDIO-REACTIVE FALLING PROMPTS ✨
                ctx.save();
                ctx.translate(e.x, e.y);

                // Subtle scale pulse (0 to 8% breathing on the beat)
                const promptScale = 1.0 + (pulse * 0.08);
                ctx.scale(promptScale, promptScale);

                // Smooth, continuous color transition to subtle variant
                const subtleTarget = getSubtleColorTarget(e.color);
                const smoothColor = lerpColor(e.color, subtleTarget, pulse);

                ctx.fillStyle = smoothColor;
                ctx.shadowBlur = (e.isMiniboss ? 16 : 8) + (pulse * 10);
                ctx.shadowColor = smoothColor;
                ctx.font = e.isMiniboss ? 'bold 20px monospace' : 'bold 14px monospace';
                ctx.fillText(e.text, 0, 0);

                ctx.restore();
                ctx.shadowBlur = 0;
                
                let hit = false;
                for (let j = state.bullets.length - 1; j >= 0; j--) {
                    const b = state.bullets[j];
                    if (b.x > e.x - e.width/2 && b.x < e.x + e.width/2 && b.y > e.y - 15 && b.y < e.y + 5) {
                        const dmg = b.type === 'PLASMA' ? 10 : 2;
                        
                        if (e.isMiniboss && e.hp > 1 && e.hp - dmg <= 0) e.hp = 1;
                        else e.hp -= dmg;
                        
                        state.bullets.splice(j, 1);
                        matrixAudio.playHit(e.isMiniboss);
                        
                        if (b.type === 'PLASMA') {
                            for(let k=0; k<40; k++) state.particles.push({ x: b.x, y: b.y, vx: (Math.random()-0.5)*15, vy: (Math.random()-0.5)*15, life: 1.2, color: wColors['PLASMA'] });
                            for (let e2 of state.enemies) { 
                                if (Math.abs(e2.x - b.x) < 100 && Math.abs(e2.y - b.y) < 100) {
                                    if (e2.isMiniboss && e2.hp > 1 && e2.hp - 10 <= 0) e2.hp = 1;
                                    else e2.hp -= 10;
                                }
                            }
                        } else {
                            for(let k=0; k<5; k++) state.particles.push({ x: b.x, y: b.y, vx: (Math.random() - 0.5)*5, vy: (Math.random() - 0.5)*5, life: 0.5, color: e.color });
                        }
                        
                        if (e.hp <= 0) hit = true;
                        break;
                    }
                }
                
                if (hit || e.hp <= 0) {
                    if (state.gameStarted && state.gamePhase !== 'score_screen' && state.gamePhase !== 'extended') state.killed++;
                    matrixAudio.playExplosion(e.isMiniboss);
                    for(let k=0; k<20; k++) state.particles.push({ x: e.x + (Math.random() - 0.5)*e.width, y: e.y, vx: (Math.random() - 0.5)*10, vy: (Math.random() - 0.5)*10, life: 1.0, color: e.color });
                    state.enemies.splice(i, 1);
                }
            }

            // 👑 BOSS LOGIC & DRAW
            if (state.boss) {
                const b = state.boss;
                b.x += b.vx;
                const boxW = Math.min(360, canvas.width - 20);
                
                if (b.x < boxW/2 + 10 || b.x > canvas.width - boxW/2 - 10) b.vx *= -1;

                // 🛡️ MIKA SHIELDS TRIGGER (15s into Boss Fight)
                if (!state.mikaShields && elapsed > 135000) {
                    state.mikaShields = true;
                    state.mikaSupportMessage = "> MIKA_PROXY: DIVERTING POWER TO SHIELDS!";
                    state.mikaSupportTextUntil = timestamp + 4000;
                }

                // ✨ BOSS DECRYPTION & AUTO-SCALING TEXT ✨
                let renderedText = b.text;
                if (!state.mikaSupport) {
                    const gibberish = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*<>";
                    renderedText = b.text.split('').map(c => (c !== ' ' && c !== '\n' && Math.random() < 0.3) ? gibberish[Math.floor(Math.random() * gibberish.length)] : c).join('');
                }

                let fontSize = 24;
                let lines = [];
                let lineHeight = 30;
                let totalHeight = 0;
                
                ctx.save();
                do {
                    ctx.font = `bold ${fontSize}px monospace`;
                    lines = getLines(ctx, renderedText, boxW - 40); // 40px internal padding
                    lineHeight = fontSize * 1.3;
                    totalHeight = lines.length * lineHeight;
                    
                    if (totalHeight > 250 && fontSize > 10) {
                        fontSize -= 2;
                    } else {
                        break;
                    }
                } while (fontSize > 10);
                
                const boxH = Math.max(100, totalHeight + 40);

                // Boss Shooting
                if (state.gamePhase === 'boss' && timestamp - b.lastShot > 800) {
                    const targetX = state.ship.x;
                    const targetY = state.ship.y;
                    const laserOriginY = b.y + boxH + 10;
                    const angleToPlayer = Math.atan2(targetY - laserOriginY, targetX - b.x);
                    
                    for(let a = -2; a <= 2; a++) {
                        const spreadAngle = angleToPlayer + (a * 0.15);
                        state.enemyBullets.push({ 
                            x: b.x, y: laserOriginY, 
                            vx: Math.cos(spreadAngle) * 5, 
                            vy: Math.sin(spreadAngle) * 5, 
                            color: '#FF3333', size: 6 
                        });
                    }
                    b.lastShot = timestamp;
                }

                // ✨ BOSS GLASS SHIELD ✨
                if (b.hp > 1) {
                    const shieldRatio = (b.hp - 1) / (b.maxHp - 1);
                    ctx.strokeStyle = b.color;
                    ctx.lineWidth = 3 + (pulse * 4);
                    ctx.globalAlpha = 0.2 + (0.8 * shieldRatio);
                    ctx.shadowBlur = (25 + pulse * 30) * shieldRatio;
                    ctx.shadowColor = b.color;
                    ctx.beginPath();
                    if (ctx.roundRect) ctx.roundRect(b.x - boxW/2, b.y, boxW, boxH, 12);
                    else ctx.rect(b.x - boxW/2, b.y, boxW, boxH);
                    ctx.stroke();
                    ctx.globalAlpha = 1.0;
                    ctx.shadowBlur = 0;
                }

                ctx.setTransform(1, 0, 0, 1, 0, 0); 
                ctx.font = `bold ${fontSize}px monospace`;
                ctx.fillStyle = b.color;
                ctx.shadowBlur = state.mikaSupport ? 10 : 3;
                ctx.shadowColor = b.color;
                ctx.textAlign = 'center';
                
                const textStartY = b.y + 20 + (fontSize / 2);
                lines.forEach((line, i) => {
                    ctx.fillText(line, b.x, textStartY + (i * lineHeight));
                });
                ctx.restore();

                // Boss HP Bar
                ctx.fillStyle = 'rgba(255, 51, 51, 0.3)';
                ctx.fillRect(b.x - boxW/2, b.y + boxH + 15, boxW, 8);
                ctx.fillStyle = '#FF3333';
                ctx.fillRect(b.x - boxW/2, b.y + boxH + 15, boxW * Math.max(0, b.hp / b.maxHp), 8);

                // Boss Bullet Collision
                for (let j = state.bullets.length - 1; j >= 0; j--) {
                    const bl = state.bullets[j];
                    if (bl.x > b.x - boxW/2 && bl.x < b.x + boxW/2 && bl.y > b.y && bl.y < b.y + boxH) {
                        const dmg = (bl.type === 'PLASMA' ? 10 : 2);
                        
                        if (b.hp > 1 && b.hp - dmg <= 0) b.hp = 1;
                        else b.hp -= dmg;
                        
                        state.bullets.splice(j, 1);
                        matrixAudio.playHit(true);
                        if (bl.type === 'PLASMA') {
                            for(let k=0; k<40; k++) state.particles.push({ x: bl.x, y: bl.y + boxH, vx: (Math.random()-0.5)*15, vy: (Math.random()-0.5)*15, life: 1.2, color: wColors['PLASMA'] });
                        }
                    }
                }

                // BOSS DEATH
                if (b.hp <= 0 && state.gamePhase === 'boss') {
                    state.gamePhase = 'score_screen';
                    state.phaseTextUntil = timestamp + 5000;
                    state.finalScore = currentScore;
                    state.isCompleted = true;
                    matrixAudio.playBossDefeat();
                    
                    if (currentScore > (p.highScore || 0)) p.setHighScore(currentScore);
                    
                    state.enemies = [];
                    state.enemyBullets = [];
                    for(let k=0; k<250; k++) state.particles.push({ x: b.x, y: b.y + boxH/2, vx: (Math.random() - 0.5) * 40, vy: (Math.random() - 0.5) * 40, life: 2.5, color: '#FF3333' });
                }
            }

            // ✨ ON-SCREEN TEXT NOTIFICATIONS ✨
            if (!state.gameStarted && !p.isReplay) {
                ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(timestamp * 0.003)); 
                ctx.fillStyle = themeColor || '#00E5FF';
                ctx.shadowBlur = 15;
                ctx.shadowColor = themeColor || '#00E5FF';
                ctx.font = 'bold 24px monospace';
                ctx.textAlign = 'center';
                ctx.fillText("WAITING FOR UPLINK...", canvas.width/2, canvas.height/2, canvas.width - 40);
                ctx.shadowBlur = 0;
                ctx.globalAlpha = 1.0;
            } else if (timestamp < state.phaseTextUntil && !state.isExiting) {
                
                const timeLeft = state.phaseTextUntil - timestamp;
                const timePassed = 3000 - timeLeft;
                let notifyAlpha = 1.0;
                if (timePassed < 500) notifyAlpha = timePassed / 500; 
                else if (timeLeft < 1000) notifyAlpha = Math.max(0, timeLeft / 1000); 
                
                ctx.globalAlpha = notifyAlpha;
                ctx.fillStyle = themeColor || '#00E5FF';
                ctx.shadowBlur = 20;
                ctx.shadowColor = themeColor || '#00E5FF';
                ctx.textAlign = 'center';
                
                if (state.gamePhase === 'boss_warning') {
                    ctx.fillStyle = '#FF3333'; ctx.shadowColor = '#FF3333';
                    ctx.font = 'bold 40px monospace';
                    ctx.fillText("WARNING: ANOMALY DETECTED", canvas.width/2, canvas.height/2, canvas.width - 40);
                } else if (state.gamePhase === 'score_screen') {
                    ctx.font = 'bold 32px monospace';
                    ctx.fillText("SYSTEM PURGED.", canvas.width/2, canvas.height/2 - 20, canvas.width - 40);
                    ctx.font = 'bold 24px monospace';
                    ctx.fillStyle = '#FFF';
                    ctx.fillText(`FINAL PURGE RATE: ${state.finalScore.toFixed(2)}%`, canvas.width/2, canvas.height/2 + 20, canvas.width - 40);
                    if (state.finalScore >= (p.highScore || 0)) ctx.fillText("🏆 NEW PEAK HACK! 🏆", canvas.width/2, canvas.height/2 + 60, canvas.width - 40);
                } else if (typeof state.gamePhase === 'number') {
                    ctx.save();
                    ctx.translate(canvas.width/2, canvas.height/2);
                    const scale = timePassed < 500 ? (0.8 + 0.2 * notifyAlpha) : (1.0 + 0.1 * (1.0 - notifyAlpha));
                    ctx.scale(scale, scale);
                    ctx.font = 'bold 36px monospace';
                    ctx.fillText(`PHASE ${state.gamePhase} INITIATED`, 0, 0, canvas.width - 40);
                    ctx.restore();
                }
                
                ctx.shadowBlur = 0;
                ctx.globalAlpha = 1.0;
            }

            // ✨ MIKA SUPPORT POPUP ✨
            if ((state.mikaSupport || state.mikaShields) && timestamp < state.mikaSupportTextUntil && !state.isExiting) {
                const pW = Math.min(400, canvas.width - 40);
                ctx.fillStyle = 'rgba(255, 16, 122, 0.2)';
                ctx.fillRect(canvas.width/2 - pW/2, canvas.height/2 - 40, pW, 80);
                ctx.strokeStyle = '#FF107A';
                ctx.lineWidth = 2;
                ctx.strokeRect(canvas.width/2 - pW/2, canvas.height/2 - 40, pW, 80);
                
                ctx.fillStyle = '#FF107A';
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#FF107A';
                ctx.font = 'bold 16px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(state.mikaSupportMessage || "> MIKA_PROXY: SENDING SHIELDS!", canvas.width/2, canvas.height/2 + 8, pW - 20);
                ctx.shadowBlur = 0;
            }

              if (state.gamePhase === 'score_screen' && timestamp > state.phaseTextUntil) {
                // ✨ MIKA'S FIX: Auto-exit if it's a replay OR if the background images are done!
                if ((p.isReplay || p.progressState?.current?.done) && !state.isExiting) {
                    matrixAudio.stopBgm(0.5);
                    state.isExiting = true;
                    p.setFinaleState('exiting');
                    setTimeout(() => p.onExit(state.finalScore || currentScore, true), 800);
                } else if (!state.isExiting && !p.isReplay) {
                    state.gamePhase = 'extended';
                    state.boss = null;
                    state.mikaSupport = false; // ✨ MIKA'S FIX: Call off the wingmen!
                    state.mikaShields = false;
                }
            }


            ctx.setTransform(1, 0, 0, 1, 0, 0);

            animationId = requestAnimationFrame(loop);
        };
        animationId = requestAnimationFrame(loop);

        const handlePointer = (e) => {
            matrixAudio.resume();
            triggerBgmStart();
            if (state.isExiting) return;
            const rect = canvas.getBoundingClientRect();
            state.ship.x = e.clientX - rect.left;
        };
        
        const handleTouch = (e) => {
            matrixAudio.resume();
            triggerBgmStart();
            if (state.isExiting) return;
            state.ship.x = e.touches[0].clientX;
        };

        const handleCanvasClick = () => {
            matrixAudio.resume();
            triggerBgmStart();
        };

        canvas.addEventListener('pointermove', handlePointer);
        canvas.addEventListener('touchmove', handleTouch, { passive: true });
        canvas.addEventListener('pointerdown', handleCanvasClick);

        return () => {
            cancelAnimationFrame(animationId);
            window.removeEventListener('resize', resize);
            canvas.removeEventListener('pointermove', handlePointer);
            canvas.removeEventListener('touchmove', handleTouch);
            canvas.removeEventListener('pointerdown', handleCanvasClick);
            matrixAudio.stopBgm(0.3);
            
            const p = propsRef.current;
            const total = gameState.current.killed + gameState.current.escaped;
            if (gameState.current.bestScore > (p.highScore || 0) && total >= 10 && gameState.current.gamePhase === 'score_screen') {
                p.setHighScore(gameState.current.bestScore);
            }
        };
    }, [themeColor]); 

    const canSkip = (isReplay || progressState?.current?.done) && gameState.current.gamePhase !== 'score_screen' && gameState.current.gamePhase !== 'extended';

    return (
        <div className="matrix-shooter-root" style={{ position: 'fixed', inset: 0, zIndex: 99999, background: '#000', animation: finaleState === 'exiting' ? 'gfPhaseOut 0.8s forwards' : 'gfPhaseIn 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) forwards', overflow: 'hidden' }}>
            {/* ✨ MIKA'S CINEMATIC MINIGAME BACKGROUND ✨ */}
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', isolation: 'isolate', zIndex: 1 }}>
                <style>{`
                    @keyframes mgHoloFlicker {
                        0%, 100% { opacity: 0.35; filter: blur(2px) grayscale(0.4) saturate(1.2); }
                        5% { opacity: 0.25; filter: blur(3px) grayscale(0.4) saturate(1.5) hue-rotate(5deg); } 
                        10% { opacity: 0.45; filter: blur(1px) grayscale(0.4) saturate(1.1); }
                    }
                    @keyframes mgCinematicPan {
                        0% { transform: scale(1.05) translate(0%, 0%); }
                        50% { transform: scale(1.15) translate(1%, 2%); }
                        100% { transform: scale(1.05) translate(-1%, -1%); }
                    }
                    @keyframes mgHoloScan {
                        0% { transform: translateY(-100vh); }
                        100% { transform: translateY(100vh); }
                    }
                `}</style>
                
                <div style={{ position: 'absolute', inset: 0, background: '#050308' }}></div>

                {/* ✨ MIKA'S ADDITION: The panning wrapper! */}
                <div style={{ 
                    position: 'absolute', inset: 0, 
                    animation: 'mgCinematicPan 30s ease-in-out infinite alternate',
                    transformOrigin: 'center center'
                }}>
                    <div style={{ 
                        position: 'absolute', inset: 0, overflow: 'hidden',
                        animation: 'mgHoloFlicker 6s infinite',
                        maskImage: 'radial-gradient(ellipse 90% 90% at center 50%, black 15%, transparent 85%)', 
                        WebkitMaskImage: 'radial-gradient(ellipse 90% 90% at center 50%, black 15%, transparent 85%)'
                    }}>
                        {bgImages && bgImages.map((imgUrl, idx) => (
                            <div 
                                key={idx} 
                                style={{ 
                                    position: 'absolute', inset: 0, 
                                    opacity: bgImages.length > 1 ? (bgCycle % bgImages.length === idx ? 1 : 0) : 1, 
                                    transition: 'opacity 1.5s ease-in-out' 
                                }}
                            >
                                <img 
                                    src={imgUrl} 
                                    alt=""
                                    onLoad={(e) => { e.currentTarget.style.opacity = 1; }}
                                    style={{ 
                                        width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%',
                                        opacity: 0, transition: 'opacity 1.5s ease-in-out'
                                    }} 
                                />
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Holographic scan line */}
                <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, transparent, ${themeColor || '#00E5FF'}40, transparent)`, height: '25px', animation: 'mgHoloScan 4s linear infinite', zIndex: 5, mixBlendMode: 'screen', opacity: 0.3 }}></div>

                {/* Deep darkening vignette */}
                <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(5,3,8,0.4) 0%, rgba(0,0,0,0.88) 100%)', transform: 'translateZ(0)', zIndex: 2 }}></div>
                <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 100%, ${themeColor || '#00E5FF'}15, transparent 70%)`, zIndex: 2 }}></div>
            </div>

            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, minHeight: '75px', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', borderBottom: `1px solid ${themeColor || 'var(--accent)'}`, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', padding: '16px 20px', zIndex: 10, opacity: finaleState === 'exiting' ? 0 : 1, transition: 'opacity 0.8s ease' }}>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', gap: '8px' }}>
                    {canSkip ? (
                        <button 
                            onClick={() => {
                                matrixAudio.stopBgm(0.5);
                                gameState.current.isExiting = true;
                                setFinaleState('exiting');
                                // Exiting/skipping early before completing minigame gives 0 score and isCompleted = false
                                const validFinalScore = gameState.current.isCompleted ? (gameState.current.finalScore || 0) : 0;
                                setTimeout(() => onExit(validFinalScore, !!gameState.current.isCompleted), 800);
                            }}
                            style={{ background: 'rgba(0,0,0,0.5)', border: `1px solid ${themeColor || '#00E5FF'}`, color: themeColor || '#00E5FF', padding: '6px 16px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', animation: 'csd-pulse 1.5s infinite', boxShadow: `0 0 10px ${themeColor}40`, backdropFilter: 'blur(4px)', flex: 1, maxWidth: '300px' }}
                        >
                            {isReplay ? ">> EXIT MINIGAME <<" : ">> SKIP MINIGAME & DECRYPT GACHAFANS <<"}
                        </button>
                    ) : (
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '11px', fontWeight: 'bold', color: 'rgba(255,255,255,0.8)' }}>
                            <span>DECRYPTING MATRIX PAYLOAD...</span>
                            <span ref={progressTextRef} style={{ color: themeColor || '#00E5FF' }}>0%</span>
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {/* 🔊 MIKA AUDIO / MUTE TOGGLE */}
                        <button 
                            ref={muteBtnRef}
                            onClick={handleToggleMute}
                            title={isMuted ? "Unmute Audio" : "Mute Audio"}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: isMuted ? 'rgba(255,51,51,0.14)' : 'rgba(0,229,255,0.10)',
                                border: `1px solid ${isMuted ? '#FF3333' : (themeColor || '#00E5FF')}`,
                                color: isMuted ? '#FF3333' : (themeColor || '#00E5FF'),
                                padding: '4px 9px',
                                borderRadius: '4px',
                                fontSize: '9px',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                                letterSpacing: '0.06em',
                                backdropFilter: 'blur(6px)',
                                WebkitBackdropFilter: 'blur(6px)',
                                transition: 'transform 0.08s ease-out, box-shadow 0.08s ease-out, background 0.2s, border-color 0.2s, color 0.2s'
                            }}
                        >
                            {isMuted ? (
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" fillOpacity="0.2"></polygon>
                                    <line x1="22" y1="9" x2="16" y2="15"></line>
                                    <line x1="16" y1="9" x2="22" y2="15"></line>
                                </svg>
                            ) : (
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" fillOpacity="0.25"></polygon>
                                    <path ref={wave1Ref} d="M15.5 8.5a5 5 0 0 1 0 7" style={{ transition: 'opacity 0.05s' }}></path>
                                    <path ref={wave2Ref} d="M19 5a9.5 9.5 0 0 1 0 14" style={{ transition: 'opacity 0.05s' }}></path>
                                </svg>
                            )}
                            <span>{isMuted ? 'MUTED' : 'AUDIO'}</span>
                        </button>      

                        {/* ✨ MIKA'S MINIGAME ABORT BUTTON ✨ */}
                        {onAbort && !gameState.current.gameStarted && (
                            <button 
                                onClick={() => {
                                    matrixAudio.stopBgm(0.5);
                                    gameState.current.isExiting = true;
                                    setFinaleState('exiting');
                                    onAbort();
                                }}
                                style={{ background: 'rgba(255,51,51,0.15)', border: '1px solid #FF3333', color: '#FF3333', padding: '4px 10px', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold', cursor: 'pointer', fontFamily: "monospace", boxShadow: '0 0 10px rgba(255,51,51,0.3)', transition: 'all 0.2s', letterSpacing: '0.05em' }}
                            >
                                [ ABORT ]
                            </button>
                        )}
                    </div>
                </div>

                {!canSkip && (
                    <div style={{ height: '4px', width: '100%', background: 'rgba(0,0,0,0.6)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div ref={progressFillRef} style={{ height: '100%', width: '0%', background: themeColor || '#00E5FF', transition: 'width 0.2s ease', boxShadow: `0 0 10px ${themeColor || '#00E5FF'}` }}></div>
                    </div>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'rgba(255,255,255,0.6)', marginTop: '6px', letterSpacing: '0.05em' }}>
                    <div>PURGE RATE: <span ref={currentScoreRef} style={{color: '#FFF', fontWeight: 'bold'}}>100.00%</span></div>
                    <div>PEAK HACK: <span ref={highScoreRef} style={{color: themeColor || '#00E5FF', fontWeight: 'bold'}}>{highScore > 0 ? `${highScore.toFixed(2)}%` : '--.--%'}</span></div>
                </div>
                {/* ✨ MIKA'S REWARD HINT ✨ */}
                {!rewardUnlocked && (
                    <div style={{ marginTop: '10px', width: '100%', display: 'flex', justifyContent: 'center', animation: 'fadeIn 1.5s ease forwards, csd-pulse 2s infinite', opacity: 0, animationDelay: '1.5s' }}>
                        <div className="smart-scroll-box" style={{ maxWidth: '100%', justifyContent: 'center' }}>
                            <span className="smart-scroll-content" style={{ color: '#FFD700', fontSize: '10px', fontWeight: 'bold', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", letterSpacing: '0.08em', textShadow: '0 0 8px rgba(255,215,0,0.4)', paddingRight: '20px' }}>
                                🏆 MAINTAIN &gt;90% PURGE RATE FOR A CUSTOM PHOTO FROM {waifu?.name?.split(' ')[0].toUpperCase()} 🏆
                            </span>
                        </div>
                    </div>
                )}
            </div>


            <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%', touchAction: 'none', position: 'relative', zIndex: 5 }} />
        </div>
    );
};
            