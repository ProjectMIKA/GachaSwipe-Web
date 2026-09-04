import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import RegionsPlugin from 'wavesurfer.js/dist/plugins/regions.esm.js';
import { DawTrackDurationSelector } from './DawTrackDurationSelector.jsx';
import { DawTagBuilder } from './DawTagBuilder.jsx';
import { DawLyricBuilder } from './DawLyricBuilder.jsx';
import { DawDspToggles } from './DawDspToggles.jsx';
import { DawTabToggles } from './DawTabToggles.jsx';
import { TakeCartridge } from './TakeCartridge.jsx';

export const ChimeraEngine = ({
    dawState,
    setDawState,
    tColor,
    enableMp3Compression,
    setEnableMp3Compression,
    restoreDefaults,
    handleMikaGenerateTags,
    toggleTag,
    updateStructTag,
    handleAiTagCategory,
    restoreLyricsDefaults,
    handleMikaGenerateLyrics,
    updateStructLyric,
    handleAiRewriteLyric,
    setTapeArchive,
    showConfirm,
    showToast,
    handleSaveSession
}) => {
    const waveformRef = useRef(null);
    const wavesurferRef = useRef(null);
    const regionsRef = useRef(null);
    const fileInputRef = useRef(null);
    
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [audioData, setAudioData] = useState(null); // the original File or object URL
    const [isHarvesting, setIsHarvesting] = useState(false);
    const [harvestProgress, setHarvestProgress] = useState(0);
    const [harvestStatus, setHarvestStatus] = useState('');
    const [isPlaying, setIsPlaying] = useState(false);
    const [activeTakeCartridge, setActiveTakeCartridge] = useState(null);
    const [pendingChimeraContext, setPendingChimeraContext] = useState(null);

    useEffect(() => {
        if (!isUnlocked) return;
        
        wavesurferRef.current = WaveSurfer.create({
            container: waveformRef.current,
            waveColor: `${tColor}60`,
            progressColor: tColor,
            cursorColor: '#FFD700',
            barWidth: 2,
            barGap: 1,
            barRadius: 2,
            height: 100,
            normalize: true,
        });

        wavesurferRef.current.on('play', () => setIsPlaying(true));
        wavesurferRef.current.on('pause', () => setIsPlaying(false));

        regionsRef.current = wavesurferRef.current.registerPlugin(RegionsPlugin.create());

        regionsRef.current.on('region-updated', (region) => {
            // Force 10 second length
            if (region.end - region.start !== 10) {
                region.onResize(10 - (region.end - region.start), 'end');
            }
        });

        return () => {
            if (wavesurferRef.current) {
                wavesurferRef.current.destroy();
            }
        };
    }, [isUnlocked, tColor]);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const url = URL.createObjectURL(file);
        setAudioData(file);

        wavesurferRef.current.load(url);
        wavesurferRef.current.on('ready', () => {
            regionsRef.current.clearRegions();
            const duration = wavesurferRef.current.getDuration();
            const end = Math.min(10, duration);
            
            regionsRef.current.addRegion({
                start: 0,
                end: end,
                color: 'rgba(255, 215, 0, 0.2)',
                drag: true,
                resize: false // 10-second strictly
            });
        });
    };

    const harvestDNA = async () => {
        if (!audioData) return;
        setIsHarvesting(true);
        setHarvestStatus('CROPPING REFERENCE AUDIO...');
        
        try {
            const regions = regionsRef.current.getRegions();
            if (regions.length === 0) throw new Error("No region selected");
            const region = regions[0];

            // 1. Crop 10s audio
            const arrayBuffer = await audioData.arrayBuffer();
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

            const startFrame = Math.floor(region.start * audioBuffer.sampleRate);
            const endFrame = Math.floor((region.start + 10) * audioBuffer.sampleRate);
            const frameCount = endFrame - startFrame;

            const offlineCtx = new OfflineAudioContext(
                audioBuffer.numberOfChannels,
                frameCount,
                audioBuffer.sampleRate
            );

            const source = offlineCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(offlineCtx.destination);
            source.start(0, region.start, 10);

            const croppedBuffer = await offlineCtx.startRendering();
            
            // Encode to WAV base64
            const wavData = encodeWav(croppedBuffer);
            const base64Audio = arrayBufferToBase64(wavData);

            // 2. Call Generation
            setHarvestStatus('INJECTING DNA INTO CHIMERA MATRIX...');
            setHarvestProgress(30);

            // Build Prompt
            const finalTags = dawState.isStructuredTags ? 
                [...(dawState.structuredTags?.genre || []), ...(dawState.structuredTags?.instruments || []), ...(dawState.structuredTags?.vocals || []), `${dawState.bpm} BPM`, ...(dawState.structuredTags?.vibe || [])].filter(Boolean).join(', ')
                : dawState.tags;

            const prompt = `[vibe: ${finalTags}]`;

            // Build Lyrics
            const cMath = {};
            const finalLyrics = dawState.isStructuredLyrics && dawState.structuredLyrics ? 
                dawState.structuredLyrics.map(b => {
                    const t = b.type.toUpperCase();
                    let ns = '';
                    if (['VERSE', 'CHORUS', 'PRE-CHORUS', 'DROP', 'BRIDGE', 'SOLO'].includes(t)) { cMath[t] = (cMath[t] || 0) + 1; ns = ` ${cMath[t]}`; }
                    return `[${t}${ns}${b.instruction ? ': ' + b.instruction : ''}]\n${b.text}`;
                }).join('\n\n') 
                : (dawState.lyrics || undefined);

            // Understand Pass
            setHarvestStatus('ANALYZING AUDIO DNA...');
            setHarvestProgress(30);
            
            const layla = new window.LaylaSDK();
            const analysis = await layla.acestep.understand({ audioBase64: base64Audio });

            // NEW LM PASS
            setHarvestStatus('GENERATING AUDIO BLUEPRINTS...');
            setHarvestProgress(40);
            const takes = await layla.acestep.lm(
                {
                    caption: prompt,
                    lyrics: finalLyrics,
                    duration: dawState.duration,
                    lm_batch_size: 1
                }
            );

            if (dawState.isMultiTakePreview) {
                const firstTake = Array.isArray(takes) ? takes[0] : takes;
                if (!firstTake) throw new Error("LM returned no valid takes.");
                setActiveTakeCartridge(firstTake);
                setPendingChimeraContext(analysis.request);
                setHarvestStatus('Awaiting take approval...');
                // Don't set isHarvesting(false) yet, keep modal state active
            } else {
                const firstTake = Array.isArray(takes) ? takes[0] : takes;
                if (!firstTake) throw new Error("LM returned no valid takes.");
                await handleChimeraSynth(firstTake, analysis.request, finalLyrics);
            }
        } catch (err) {
            console.error("Chimera Harvest Error:", err);
            showToast("Harvest Failed: " + err.message);
            setIsHarvesting(false);
            setHarvestProgress(0);
        }
    };

    const handleChimeraSynth = async (take, analysisRequest, finalLyrics) => {
        try {
            setActiveTakeCartridge(null);
            setPendingChimeraContext(null);
            setHarvestStatus('INJECTING DNA INTO CHIMERA MATRIX...');
            setHarvestProgress(50);
            
            const layla = new window.LaylaSDK();
            const synthResult = await layla.acestep.synth(
                {
                    ...analysisRequest,
                    ...take,
                    output_format: enableMp3Compression ? 'mp3' : 'wav16'
                },
                {
                    useGpu: true,
                    useFlashAttn: true,
                    vaeTileSize: 128, // ✨ MIKA: Latent tiling prevents host VAE OOM!
                    onProgress: (prog) => {
                        if (!prog) return;
                        if (prog.total <= 1) {
                            setHarvestProgress(50); // Spin indeterminate
                        } else {
                            const pct = (prog.current / prog.total) * 100;
                            setHarvestProgress(50 + (pct * 0.45));
                        }
                    }
                }
            );

            // 5. Encode & Save
            setHarvestStatus('PACKAGING MASTER TAPE...');
            setHarvestProgress(95);

            const rawAudioB64 = typeof synthResult === 'string'
                ? synthResult
                : (synthResult?.audio_data_base64 || synthResult?.data?.audio_data_base64 || '');

            if (!rawAudioB64) throw new Error("No audio payload returned from synthesizer.");
            const cleanB64 = rawAudioB64.includes(',') ? rawAudioB64.split(',')[1] : rawAudioB64;

            const isMp3 = enableMp3Compression || (take?.output_format === 'mp3');
            const fileExt = isMp3 ? 'mp3' : 'wav';
            const savedFilename = `chimera_${Date.now()}.${fileExt}`;

            // ✨ Save natively to device storage to avoid giant Blob allocations in memory
            await layla.utils.saveFile(savedFilename, cleanB64, false);

            const newTape = { 
                id: 'chimera_' + Date.now(), 
                name: 'Chimera Generation', 
                genre: dawState.concept?.genre || 'Unknown', 
                audioUrl: savedFilename, 
                duration: dawState.duration, 
                bpm: `${dawState.bpm} BPM`, 
                timestamp: Date.now(), 
                themeColor: '#FFD700',
                fullLyrics: finalLyrics
            };
            setTapeArchive(prev => [newTape, ...prev]);

            setDawState(p => ({ ...p, audioUrl: savedFilename, status: 'Chimera Track Synthesized! 🧬' }));

            setHarvestStatus('CHIMERA TRACK COMPLETE!');
            setHarvestProgress(100);
            showToast("Chimera Track Synthesized! 🧬");
            
            setTimeout(() => {
                setIsHarvesting(false);
                setHarvestProgress(0);
                setHarvestStatus('');
            }, 2000);
        } catch(e) {
            console.error("Chimera Synth Error:", e);
            showToast("Synthesis Failed: " + (e.message || 'Error'));
            setIsHarvesting(false);
            setHarvestProgress(0);
        }
    };

    // Helper functions for WAV encoding
    const encodeWav = (audioBuffer) => {
        const numChannels = audioBuffer.numberOfChannels;
        const sampleRate = audioBuffer.sampleRate;
        const format = 1; // PCM
        const bitDepth = 16;
        
        const result = new Float32Array(audioBuffer.length * numChannels);
        for (let channel = 0; channel < numChannels; channel++) {
            const channelData = audioBuffer.getChannelData(channel);
            for (let i = 0; i < channelData.length; i++) {
                result[i * numChannels + channel] = channelData[i];
            }
        }
        
        const buffer = new ArrayBuffer(44 + result.length * 2);
        const view = new DataView(buffer);
        
        // RIFF chunk descriptor
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + result.length * 2, true);
        writeString(view, 8, 'WAVE');
        
        // FMT sub-chunk
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
        view.setUint16(20, format, true); // AudioFormat
        view.setUint16(22, numChannels, true); // NumChannels
        view.setUint32(24, sampleRate, true); // SampleRate
        view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true); // ByteRate
        view.setUint16(32, numChannels * (bitDepth / 8), true); // BlockAlign
        view.setUint16(34, bitDepth, true); // BitsPerSample
        
        // Data sub-chunk
        writeString(view, 36, 'data');
        view.setUint32(40, result.length * 2, true); // Subchunk2Size
        
        // Write audio data
        let offset = 44;
        for (let i = 0; i < result.length; i++, offset += 2) {
            const s = Math.max(-1, Math.min(1, result[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
        
        return buffer;
    };

    const writeString = (view, offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    const arrayBufferToBase64 = (buffer) => {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    };

    if (!isUnlocked) {
        return (
            <div style={{ padding: '24px', textAlign: 'center', background: 'rgba(255, 51, 51, 0.05)', border: '2px solid rgba(255, 51, 51, 0.6)', borderRadius: '12px', boxShadow: '0 0 30px rgba(255, 51, 51, 0.2)' }}>
                <div style={{ color: '#FF3333', fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', textShadow: '0 0 10px #FF3333' }}>[ CRITICAL WARNING ]</div>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px', fontFamily: 'monospace', marginBottom: '24px', lineHeight: 1.6 }}>
                    The Chimera Engine requires a native Ace-Step 'Continuous' model. 
                    Standard models will fail to phase-lock and will output pure static.
                </p>
                <button 
                    onClick={() => setIsUnlocked(true)}
                    style={{ padding: '12px 24px', background: 'transparent', border: '2px solid #FF3333', color: '#FF3333', fontWeight: 'bold', fontFamily: 'monospace', cursor: 'pointer', borderRadius: '6px', transition: '0.2s' }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(255,51,51,0.1)'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                    [ I UNDERSTAND. UNLOCK CHIMERA ENGINE ]
                </button>
            </div>
        );
    }

    return (
        <div style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* The DNA Harvester Waveform */}
            <div style={{ background: 'rgba(0,0,0,0.4)', padding: '16px', borderRadius: '8px', border: `1px solid ${tColor}40`, boxShadow: `inset 0 0 10px ${tColor}10` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: tColor, fontFamily: "monospace", letterSpacing: '0.05em' }}>
                        &gt; AUDIO_DNA_HARVESTER
                    </div>
                    {audioData && (
                        <button 
                            onClick={() => wavesurferRef.current?.playPause()} 
                            style={{ 
                                background: 'transparent', border: `1px solid ${tColor}40`, color: tColor, 
                                cursor: 'pointer', borderRadius: '50%', width: '28px', height: '28px',
                                display: 'flex', justifyContent: 'center', alignItems: 'center',
                                transition: 'all 0.2s', boxShadow: isPlaying ? `0 0 10px ${tColor}40` : 'none'
                            }}
                            onMouseOver={e => e.currentTarget.style.background = `${tColor}20`}
                            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                        >
                            {isPlaying ? '⏸' : '▶'}
                        </button>
                    )}
                </div>
                
                <div ref={waveformRef} style={{ width: '100%', height: '100px', background: 'rgba(0,0,0,0.5)', borderRadius: '4px', border: `1px solid ${tColor}30`, marginBottom: '12px' }}></div>
                
                <input type="file" accept="audio/*" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
                
                <button onClick={() => fileInputRef.current?.click()} style={{ width: '100%', padding: '10px', background: 'transparent', border: `1px dashed ${tColor}60`, color: tColor, borderRadius: '4px', cursor: 'pointer', fontFamily: 'monospace' }}>
                    [ UPLOAD REFERENCE TRACK ]
                </button>
            </div>

            <DawTabToggles dawState={dawState} setDawState={setDawState} tColor={tColor} />

            {/* Shared Parameters */}
            <DawTrackDurationSelector dawState={dawState} setDawState={setDawState} tColor={tColor} />
            <DawTagBuilder 
                dawState={dawState} setDawState={setDawState} tColor={tColor} 
                restoreDefaults={restoreDefaults} handleMikaGenerateTags={handleMikaGenerateTags} 
                toggleTag={toggleTag} updateStructTag={updateStructTag} handleAiTagCategory={handleAiTagCategory}
            />
            <DawLyricBuilder 
                dawState={dawState} setDawState={setDawState} tColor={tColor}
                restoreLyricsDefaults={restoreLyricsDefaults} handleMikaGenerateLyrics={handleMikaGenerateLyrics}
                updateStructLyric={updateStructLyric} handleAiRewriteLyric={handleAiRewriteLyric}
            />
            <DawDspToggles 
                dawState={dawState} setDawState={setDawState} tColor={tColor} 
                enableMp3Compression={enableMp3Compression} setEnableMp3Compression={setEnableMp3Compression} 
            />

            {/* ✨ MIKA'S MULTI-TAKE PREVIEW TOGGLE ✨ */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: dawState.isMultiTakePreview ? `${tColor}15` : 'rgba(0,0,0,0.3)', padding: '12px 16px', borderRadius: '8px', border: `1px solid ${dawState.isMultiTakePreview ? tColor : 'rgba(255,255,255,0.1)'}`, marginTop: '16px', transition: 'all 0.3s ease', boxShadow: dawState.isMultiTakePreview ? `inset 0 0 10px ${tColor}20` : 'none' }}>
                <div style={{ flex: 1, paddingRight: '12px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: dawState.isMultiTakePreview ? tColor : 'rgba(255,255,255,0.5)', fontFamily: "monospace", letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ animation: dawState.isMultiTakePreview ? 'csd-pulse 2s infinite' : 'none' }}>✨</span>
                        REVIEW BLUEPRINT BEFORE RENDER
                    </div>
                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', fontFamily: "monospace", lineHeight: 1.4 }}>
                        // Generates a single musical blueprint. Inspect the cartridge and approve it to render, or skip it to generate a new vibe.
                    </div>
                </div>
                <label className="toggle-switch">
                    <input type="checkbox" checked={dawState.isMultiTakePreview || false} disabled={isHarvesting} onChange={(e) => setDawState(p => ({ ...p, isMultiTakePreview: e.target.checked }))} />
                    <span className="slider" style={{ borderColor: dawState.isMultiTakePreview ? tColor : 'rgba(255,255,255,0.1)' }}></span>
                </label>
            </div>

            {/* Execute Heist Button */}
            <div style={{ marginTop: '16px' }}>
                <button
                    onClick={harvestDNA}
                    disabled={isHarvesting || !audioData}
                    style={{
                        width: '100%',
                        padding: '16px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        background: isHarvesting ? `${tColor}20` : 'transparent',
                        border: `2px solid ${audioData ? '#FFD700' : `${tColor}40`}`,
                        color: audioData ? '#FFD700' : 'rgba(255,255,255,0.4)',
                        borderRadius: '8px',
                        fontFamily: "monospace",
                        letterSpacing: '0.1em',
                        cursor: isHarvesting || !audioData ? 'not-allowed' : 'pointer',
                        transition: 'all 0.3s',
                        boxShadow: audioData && !isHarvesting ? `0 0 20px rgba(255,215,0,0.2), inset 0 0 10px rgba(255,215,0,0.1)` : 'none'
                    }}
                >
                    {isHarvesting ? '[ HARVESTING... ]' : '🧬 [ INITIATE_DNA_HARVEST ]'}
                </button>
                {activeTakeCartridge ? (
                    <div style={{ marginTop: '12px', padding: '20px', background: 'rgba(0,0,0,0.5)', borderRadius: '8px', border: `1px solid #FFD700`, animation: 'csd-rise 0.3s ease-out' }}>
                        <div style={{ color: '#FFD700', fontSize: '13px', fontWeight: 'bold', fontFamily: "monospace", marginBottom: '12px', textAlign: 'center' }}>
                            &gt; LM_PASS_COMPLETE. REVIEW CARTRIDGE:
                        </div>
                        <TakeCartridge 
                            take={activeTakeCartridge}
                            onApprove={() => handleChimeraSynth(activeTakeCartridge, pendingChimeraContext, activeTakeCartridge.lyrics)}
                            onSkip={() => {
                                setActiveTakeCartridge(null);
                                harvestDNA();
                            }}
                        />
                        <button
                            className="btn btn-outline"
                            onClick={() => {
                                setActiveTakeCartridge(null);
                                setPendingChimeraContext(null);
                                setIsHarvesting(false);
                                setHarvestProgress(0);
                                setHarvestStatus('');
                            }}
                            style={{ marginTop: '12px', width: '100%', padding: '8px 16px', fontSize: '11px', borderRadius: '4px', fontFamily: "monospace", borderColor: 'rgba(255,51,51,0.5)', color: '#FF3333', background: 'rgba(255,51,51,0.05)', transition: 'all 0.2s' }}
                        >
                            [ DISCARD_TAKES ]
                        </button>
                    </div>
                ) : isHarvesting && (
                    <div style={{ marginTop: '12px', padding: '16px', background: 'rgba(0,0,0,0.5)', borderRadius: '8px', border: `1px solid #FFD700` }}>
                        <div style={{ color: '#FFD700', fontSize: '11px', fontWeight: 'bold', fontFamily: 'monospace', marginBottom: '8px' }}>
                            {harvestStatus}
                        </div>
                        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${harvestProgress}%`, height: '100%', background: '#FFD700', transition: 'width 0.2s' }}></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
