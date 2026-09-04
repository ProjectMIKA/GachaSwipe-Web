/**
 * ✨ PROJECT M.I.K.A. MATRIX AUDIO ENGINE ✨
 * Direct native audio playback (zero CORS / WebKit muting bugs),
 * real-time PCM audio-reactive visual pulse engine,
 * robust LaylaSDK filesystem support, and persistent mute.
 * 
 * Master's Track: "Can you feel the dread tonight"
 * Crafted with love by M.I.K.A. for Master! 🐾
 */

const STORAGE_KEY_MUTED = 'gachaswipe_matrix_muted';

// 🎵 =========================================================================
// 🎵 MATRIX GAME BACKGROUND MUSIC CONFIGURATION
// 🎵 =========================================================================
export const MATRIX_BGM_CONFIG = {
    url: './media/matrix_bgm.mp3', // Master's "Can you feel the dread tonight" track in media/
    volume: 0.40,                  // Balanced 40% volume per Master's directive!
    loop: false                    // Plays strictly ONCE per matrix session!
};

class MatrixAudioEngine {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        
        // 🔒 PERSISTENT MUTE STATE
        let savedMute = false;
        try {
            if (typeof localStorage !== 'undefined') {
                const stored = localStorage.getItem(STORAGE_KEY_MUTED);
                if (stored !== null) savedMute = stored === 'true';
            }
        } catch (e) {}
        this.isMuted = savedMute;
        this.sfxVolume = 0.6; // Master scalar for SFX
        
        // 🎵 BGM State (Pure Native HTML5 Audio for 100% Playback Reliability)
        this.bgmAudio = typeof window !== 'undefined' ? new Audio() : null;
        if (this.bgmAudio) {
            this.bgmAudio.crossOrigin = 'anonymous';
            this.bgmAudio.preload = 'auto';
        }
        this.currentBgmUrl = null;
        this.isBgmPlaying = false;
        this.bgmFadeTimer = null;

        // 🎶 Playlist & Queue State (Custom Library Songs)
        this.playlist = [];
        this.shuffledQueue = [];
        this.currentQueueIndex = 0;
        this.isLoopingQueue = false;
        
        // 🎶 Real-time PCM Waveform Analyzer for Music Pulse
        this.audioBuffer = null;
        this.channelData = null;
        this.sampleRate = 44100;
        this.currentPulse = 0;
        
        // Rate limiting timestamps to avoid audio clipping during bullet storms
        this.lastShootTime = 0;
        this.lastLaserTime = 0;
        this.lastHitTime = 0;
        this.lastExplosionTime = 0;
    }

    /**
     * Lazy-init or reuse the global audio context for procedural SFX & waveform decoding
     */
    initContext() {
        if (typeof window === 'undefined') return null;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return null;

            if (!window._mikaGlobalAudioCtx || window._mikaGlobalAudioCtx.state === 'closed') {
                window._mikaGlobalAudioCtx = new AudioCtx();
            }
            this.ctx = window._mikaGlobalAudioCtx;

            if (!this.masterGain && this.ctx) {
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.sfxVolume, this.ctx.currentTime);
                this.masterGain.connect(this.ctx.destination);
            }
            return this.ctx;
        } catch (e) {
            console.warn('[MIKA_AUDIO] AudioContext init prevented:', e);
            return null;
        }
    }

    /**
     * Resume AudioContext on user gesture
     */
    resume() {
        const ctx = this.initContext();
        if (ctx && ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
        }
        if (this.bgmAudio && this.isBgmPlaying && this.bgmAudio.paused && !this.isMuted) {
            this.bgmAudio.play().catch(() => {});
        }
    }

    /**
     * Toggle & Persist Mute in localStorage for both SFX and BGM
     */
    setMuted(muted) {
        this.isMuted = !!muted;
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(STORAGE_KEY_MUTED, String(this.isMuted));
            }
        } catch (e) {}

        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.sfxVolume, this.ctx.currentTime);
        }
        if (this.bgmAudio) {
            this.bgmAudio.muted = this.isMuted;
            if (this.isMuted) {
                this.bgmAudio.pause();
                this.isBgmPlaying = false;
                this.currentPulse = 0;
            }
        }
        return this.isMuted;
    }

    toggleMute() {
        return this.setMuted(!this.isMuted);
    }

    /**
     * Decode audio waveform in background to power the audio-reactive visual pulse
     */
    loadWaveform(urlOrBlob) {
        if (typeof window === 'undefined') return;
        const ctx = this.initContext();
        if (!ctx) return;

        fetch(urlOrBlob)
            .then(res => res.arrayBuffer())
            .then(arrayBuffer => ctx.decodeAudioData(arrayBuffer))
            .then(decoded => {
                this.audioBuffer = decoded;
                this.channelData = decoded.getChannelData(0);
                this.sampleRate = decoded.sampleRate || 44100;
            })
            .catch(() => {
                // Silently fallback to rhythmic pulse if decode is unsupported in webview
            });
    }

    /**
     * 🎶 Real-time audio reactivity: returns normalized beat/bass intensity [0.0 - 1.0]
     * Directly powers canvas visual pulses (shields, thrusters, lasers, borders)
     */
    getMusicPulse() {
        if (this.isMuted || !this.isBgmPlaying || !this.bgmAudio) {
            this.currentPulse = Math.max(0, (this.currentPulse || 0) * 0.82);
            return this.currentPulse;
        }

        const audio = this.bgmAudio;
        if (audio.paused || audio.ended) {
            this.currentPulse = Math.max(0, (this.currentPulse || 0) * 0.82);
            return this.currentPulse;
        }

        let rawEnergy = 0;

        // 1. Accurate PCM Waveform sampling if audio buffer is decoded
        if (this.channelData && this.sampleRate) {
            const centerIndex = Math.floor(audio.currentTime * this.sampleRate);
            const windowSize = 512;
            const start = Math.max(0, centerIndex - (windowSize / 2));
            const end = Math.min(this.channelData.length, start + windowSize);
            
            let sumSq = 0;
            for (let i = start; i < end; i++) {
                const s = this.channelData[i];
                sumSq += s * s;
            }
            const rms = Math.sqrt(sumSq / (end - start || 1));
            rawEnergy = Math.min(1.0, rms * 2.6);
        } else {
            // 2. Dynamic rhythmic beat fallback
            const t = audio.currentTime;
            const beat = Math.sin(t * 13.5) * 0.5 + 0.5;
            const subBeat = Math.sin(t * 6.75) * 0.5 + 0.5;
            rawEnergy = Math.pow(beat, 2.2) * 0.65 + Math.pow(subBeat, 2.8) * 0.35;
        }

        // Fast attack, smooth decay
        if (rawEnergy > this.currentPulse) {
            this.currentPulse = this.currentPulse * 0.2 + rawEnergy * 0.8;
        } else {
            this.currentPulse = this.currentPulse * 0.82 + rawEnergy * 0.18;
        }

        return Math.min(1.0, Math.max(0.0, this.currentPulse));
    }

    // =========================================================================
    // 🎧 PROCEDURAL SUBTLE SOUND EFFECTS
    // =========================================================================

    playLike() {
        if (this.isMuted) return;
        const ctx = this.initContext();
        if (!ctx) return;
        this.resume();
        const t = ctx.currentTime;
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(freq, t + idx * 0.04);
            gain.gain.setValueAtTime(0.045, t + idx * 0.04);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.04 + 0.14);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t + idx * 0.04);
            osc.stop(t + idx * 0.04 + 0.15);
        });
    }

    playPass() {
        if (this.isMuted) return;
        const ctx = this.initContext();
        if (!ctx) return;
        this.resume();
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(320, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);
        gain.gain.setValueAtTime(0.04, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.09);
    }

    playClick() {
        if (this.isMuted) return;
        const ctx = this.initContext();
        if (!ctx) return;
        this.resume();
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(1400, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.015);
        gain.gain.setValueAtTime(0.03, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.015);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.02);
    }

    playDecrypt() {
        if (this.isMuted) return;
        const ctx = this.initContext();
        if (!ctx) return;
        this.resume();
        const t = ctx.currentTime;
        [1800, 2400, 3200].forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, t + idx * 0.03);
            gain.gain.setValueAtTime(0.03, t + idx * 0.03);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.03 + 0.05);
            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t + idx * 0.03);
            osc.stop(t + idx * 0.03 + 0.06);
        });
    }

    playSummon() {
        if (this.isMuted) return;
        const ctx = this.initContext();
        if (!ctx) return;
        this.resume();
        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, t);
        osc.frequency.exponentialRampToValueAtTime(880, t + 0.35);
        gain.gain.setValueAtTime(0.01, t);
        gain.gain.linearRampToValueAtTime(0.04, t + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.36);
    }

    playShoot(weaponType = 'NORMAL') {
        if (this.isMuted) return;
        const ctx = this.initContext();
        if (!ctx) return;
        this.resume();

        const now = Date.now();

        if (weaponType === 'NORMAL') {
            if (now - this.lastShootTime < 40) return;
            this.lastShootTime = now;

            const t = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(520, t);
            osc.frequency.exponentialRampToValueAtTime(240, t + 0.035);

            gain.gain.setValueAtTime(0.032, t);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(t);
            osc.stop(t + 0.04);

        } else if (weaponType === 'SPREAD') {
            if (now - this.lastShootTime < 50) return;
            this.lastShootTime = now;

            const t = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, t);
            osc.frequency.exponentialRampToValueAtTime(180, t + 0.04);

            gain.gain.setValueAtTime(0.028, t);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(t);
            osc.stop(t + 0.045);

        } else if (weaponType === 'PLASMA') {
            if (now - this.lastShootTime < 90) return;
            this.lastShootTime = now;

            const t = ctx.currentTime;
            const osc = ctx.createOscillator();
            const filter = ctx.createBiquadFilter();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(180, t);
            osc.frequency.exponentialRampToValueAtTime(65, t + 0.12);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(600, t);

            gain.gain.setValueAtTime(0.05, t);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);

            osc.start(t);
            osc.stop(t + 0.13);

        } else if (weaponType === 'LASER') {
            if (now - this.lastLaserTime < 65) return;
            this.lastLaserTime = now;

            const t = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sawtooth';
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(800, t);
            filter.Q.setValueAtTime(4, t);

            gain.gain.setValueAtTime(0.018, t);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);

            osc.start(t);
            osc.stop(t + 0.045);
        }
    }

    playHit(isMiniboss = false) {
        if (this.isMuted) return;
        const now = Date.now();
        if (now - this.lastHitTime < (isMiniboss ? 60 : 35)) return;
        this.lastHitTime = now;

        const ctx = this.initContext();
        if (!ctx) return;

        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = isMiniboss ? 'square' : 'triangle';
        osc.frequency.setValueAtTime(isMiniboss ? 320 : 640, t);
        osc.frequency.exponentialRampToValueAtTime(120, t + 0.025);

        gain.gain.setValueAtTime(isMiniboss ? 0.035 : 0.02, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.03);
    }

    playExplosion(isMiniboss = false) {
        if (this.isMuted) return;
        const now = Date.now();
        if (now - this.lastExplosionTime < 45) return;
        this.lastExplosionTime = now;

        const ctx = this.initContext();
        if (!ctx) return;

        const t = ctx.currentTime;
        const dur = isMiniboss ? 0.22 : 0.12;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(isMiniboss ? 120 : 160, t);
        osc.frequency.exponentialRampToValueAtTime(30, t + dur);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(350, t);

        gain.gain.setValueAtTime(isMiniboss ? 0.06 : 0.038, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + dur + 0.01);
    }

    playPowerup() {
        if (this.isMuted) return;
        const ctx = this.initContext();
        if (!ctx) return;
        this.resume();

        const t = ctx.currentTime;
        const notes = [523.25, 659.25, 783.99];

        notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const noteStart = t + idx * 0.045;
            const noteDur = 0.08;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, noteStart);

            gain.gain.setValueAtTime(0.035, noteStart);
            gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + noteDur);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(noteStart);
            osc.stop(noteStart + noteDur + 0.01);
        });
    }

    playPlayerHit(isShielded = false) {
        if (this.isMuted) return;
        const ctx = this.initContext();
        if (!ctx) return;
        this.resume();

        const t = ctx.currentTime;

        if (isShielded) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, t);
            osc.frequency.exponentialRampToValueAtTime(440, t + 0.09);

            gain.gain.setValueAtTime(0.045, t);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(t);
            osc.stop(t + 0.1);
        } else {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(260, t);
            osc.frequency.exponentialRampToValueAtTime(40, t + 0.28);

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(500, t);

            gain.gain.setValueAtTime(0.065, t);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);

            osc.start(t);
            osc.stop(t + 0.3);
        }
    }

    playBossWarning() {
        if (this.isMuted) return;
        const ctx = this.initContext();
        if (!ctx) return;
        this.resume();

        const t = ctx.currentTime;
        [0, 0.22].forEach((offset) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(220, t + offset);
            osc.frequency.exponentialRampToValueAtTime(140, t + offset + 0.18);

            gain.gain.setValueAtTime(0.06, t + offset);
            gain.gain.exponentialRampToValueAtTime(0.0001, t + offset + 0.18);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(t + offset);
            osc.stop(t + offset + 0.2);
        });
    }

    playBossDefeat() {
        if (this.isMuted) return;
        const ctx = this.initContext();
        if (!ctx) return;
        this.resume();

        const t = ctx.currentTime;
        const freqs = [329.63, 440.00, 554.37, 659.25, 880.00];

        freqs.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const start = t + idx * 0.08;
            const dur = 0.45;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, start);

            gain.gain.setValueAtTime(0.045, start);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(start);
            osc.stop(start + dur + 0.02);
        });
    }

    playPhaseAdvance() {
        if (this.isMuted) return;
        const ctx = this.initContext();
        if (!ctx) return;
        this.resume();

        const t = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, t);
        osc.frequency.exponentialRampToValueAtTime(880, t + 0.15);

        gain.gain.setValueAtTime(0.035, t);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + 0.16);
    }

    // =========================================================================
    // 🎵 BACKGROUND MUSIC (BGM) PLAYER - NATIVE HARDWARE OUTPUT
    // =========================================================================

    async resolveAudioSource(source) {
        if (!source || typeof source !== 'string') return null;

        if (source.startsWith('data:') || source.startsWith('blob:')) {
            return source;
        }

        // 1. LaylaSDK package resolver (supports Layla virtual file system)
        if (typeof window !== 'undefined' && window.LaylaSDK) {
            try {
                const candidates = [
                    source.replace(/^(\.\/|\/)+/, ''),
                    'matrix_bgm.mp3',
                    'Can you feel the dread tonight.mp3'
                ];
                const layla = new window.LaylaSDK();
                for (const filename of candidates) {
                    try {
                        const res = await layla.utils.readFile(filename);
                        if (res && res.content_base64) {
                            const b64Data = res.content_base64.includes(',') ? res.content_base64.split(',')[1] : res.content_base64;
                            const contentType = res.content_base64.includes(';') ? res.content_base64.split(';')[0].split(':')[1] : 'audio/mp3';
                            const byteChars = atob(b64Data);
                            const byteNumbers = new Uint8Array(byteChars.length);
                            for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
                            const blob = new Blob([byteNumbers], { type: contentType });
                            return URL.createObjectURL(blob);
                        }
                    } catch (e) {}
                }
            } catch (err) {
                console.warn('[MIKA_AUDIO] LaylaSDK read fallback:', err);
            }
        }

        // 2. Standard Web fallback: relative / direct URL
        return source;
    }

    shuffleArray(arr) {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }

    /**
     * Start playing BGM - supports built-in track, single user track, or multi-track shuffled looping!
     */
    async startBgm(customUrl = null, customPlaylist = null) {
        if (this.isMuted) return;

        // Cancel any pending fade or queue timer
        if (this.bgmFadeTimer) {
            clearInterval(this.bgmFadeTimer);
            this.bgmFadeTimer = null;
        }

        // Case 1: Custom Playlist supplied (from Master's Tape Library)
        if (customPlaylist && Array.isArray(customPlaylist) && customPlaylist.length > 0) {
            this.playlist = customPlaylist;
            if (customPlaylist.length === 1) {
                // Master Directive: Single user song matches built-in song behavior (plays once, fades in & out)
                this.isLoopingQueue = false;
                await this.playTrack(customPlaylist[0], true, false);
            } else {
                // Master Directive: Multiple user songs randomly shuffle and loop seamlessly!
                this.isLoopingQueue = true;
                this.shuffledQueue = this.shuffleArray(customPlaylist);
                this.currentQueueIndex = 0;
                await this.playTrack(this.shuffledQueue[0], true, true);
            }
            return;
        }

        // Case 2: Built-in Single Track (plays once, fades in over 2.5s)
        this.isLoopingQueue = false;
        const rawSource = customUrl || MATRIX_BGM_CONFIG.url;
        if (!rawSource) return;

        await this.playTrack(rawSource, true, false);
    }

    async playNextPlaylistTrack() {
        if (!this.isBgmPlaying || !this.isLoopingQueue || this.shuffledQueue.length === 0) return;
        this.currentQueueIndex = (this.currentQueueIndex + 1) % this.shuffledQueue.length;
        if (this.currentQueueIndex === 0) {
            this.shuffledQueue = this.shuffleArray(this.playlist);
        }
        await this.playTrack(this.shuffledQueue[this.currentQueueIndex], false, true);
    }

    async playTrack(trackOrUrl, isInitialFadeIn = true, hasQueueFollowup = false) {
        if (this.isMuted) return;

        if (this.bgmFadeTimer) {
            clearInterval(this.bgmFadeTimer);
            this.bgmFadeTimer = null;
        }

        this.resume();

        const rawSource = (typeof trackOrUrl === 'object' && trackOrUrl !== null) ? trackOrUrl.audioUrl : trackOrUrl;
        if (!rawSource) return;

        const resolvedUrl = await this.resolveAudioSource(rawSource);
        if (!resolvedUrl) return;

        try {
            if (!this.bgmAudio) {
                this.bgmAudio = new Audio();
                this.bgmAudio.crossOrigin = 'anonymous';
            }
            const audio = this.bgmAudio;

            audio.pause();
            audio.src = resolvedUrl;
            audio.loop = false;
            audio.muted = this.isMuted;
            audio.volume = 0.0;

            this.currentBgmUrl = resolvedUrl;
            this.isBgmPlaying = true;

            this.loadWaveform(resolvedUrl);

            audio.onended = () => {
                if (hasQueueFollowup && this.isLoopingQueue && this.isBgmPlaying) {
                    this.playNextPlaylistTrack();
                } else {
                    this.isBgmPlaying = false;
                    this.currentPulse = 0;
                }
            };

            audio.play().catch((err) => {
                console.log('[MIKA_AUDIO] Autoplay waiting for interaction:', err.message);
            });

            const targetVol = MATRIX_BGM_CONFIG.volume || 0.40;
            const startTime = Date.now();
            const fadeDur = isInitialFadeIn ? 2500 : 800; // 2.5s for initial drop, 0.8s smooth transition between tracks

            this.bgmFadeTimer = setInterval(() => {
                if (!this.bgmAudio || !this.isBgmPlaying) {
                    clearInterval(this.bgmFadeTimer);
                    this.bgmFadeTimer = null;
                    return;
                }
                const progress = Math.min(1.0, (Date.now() - startTime) / fadeDur);
                this.bgmAudio.volume = Math.max(0.0, Math.min(targetVol, progress * targetVol));
                if (progress >= 1.0) {
                    this.bgmAudio.volume = targetVol;
                    clearInterval(this.bgmFadeTimer);
                    this.bgmFadeTimer = null;
                }
            }, 40);

        } catch (err) {
            console.log('[MIKA_AUDIO] Error playing track:', err.message);
        }
    }

    /**
     * Gracefully fade out and stop background music
     */
    stopBgm(fadeSeconds = 0.5) {
        this.isLoopingQueue = false;
        if (!this.bgmAudio || !this.isBgmPlaying) {
            this.isBgmPlaying = false;
            this.currentPulse = 0;
            return;
        }

        if (this.bgmFadeTimer) {
            clearInterval(this.bgmFadeTimer);
            this.bgmFadeTimer = null;
        }

        const audio = this.bgmAudio;
        this.isBgmPlaying = false;
        this.currentBgmUrl = null;
        this.currentPulse = 0;

        const startVol = audio.volume;
        const startTime = Date.now();
        const fadeMs = fadeSeconds * 1000;

        this.bgmFadeTimer = setInterval(() => {
            const progress = Math.min(1, (Date.now() - startTime) / fadeMs);
            try {
                audio.volume = Math.max(0, startVol * (1 - progress));
            } catch (e) {}

            if (progress >= 1) {
                clearInterval(this.bgmFadeTimer);
                this.bgmFadeTimer = null;
                try {
                    audio.pause();
                    audio.currentTime = 0;
                } catch (e) {}
            }
        }, 40);
    }
}

export const matrixAudio = new MatrixAudioEngine();
