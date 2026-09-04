import React, { useState, useEffect } from 'react';
import { getSetting, setSetting, getApiKey, setApiKey, clearAllCards, useCards, saveCard } from './db.js';
import { matrixAudio } from '../core/utils/matrixAudio.js';
import { XIcon } from '../core/components/Icons.jsx';

export function SettingsModal({ isOpen, onClose, onShowToast, onResetDeck }) {
    if (!isOpen) return null;

    const cards = useCards();
    const [apiKey, setApiKeyState] = useState('');
    const [chatModel, setChatModel] = useState('chatgpt-4o-latest');
    const [imageModel, setImageModel] = useState('flux');
    const [activePreset, setActivePreset] = useState('MIKA');
    const [enableAtmosphere, setEnableAtmosphere] = useState(true);
    const [enableScanlines, setEnableScanlines] = useState(true);
    const [enableSpeechBubble, setEnableSpeechBubble] = useState(true);
    const [isMuted, setIsMuted] = useState(matrixAudio.isMuted);
    const [isTestingKey, setIsTestingKey] = useState(false);

    useEffect(() => {
        const load = async () => {
            const k = await getApiKey();
            if (k) setApiKeyState(k);
            const m = await getSetting('chat_model', 'chatgpt-4o-latest');
            setChatModel(m);
            const im = await getSetting('image_model', 'flux');
            setImageModel(im);
            const p = await getSetting('active_preset', 'MIKA');
            setActivePreset(p);
            const at = await getSetting('enable_atmosphere', true);
            setEnableAtmosphere(at);
            const sc = await getSetting('enable_scanlines', true);
            setEnableScanlines(sc);
            const sb = await getSetting('enable_speech_bubble', true);
            setEnableSpeechBubble(sb);
        };
        load();
    }, []);

    const handleSaveKey = async () => {
        await setApiKey(apiKey);
        matrixAudio.playClick();
        if (onShowToast) onShowToast('[SETTINGS: API KEY SAVED TO INDEXEDDB]');
    };

    const handleTestKey = async () => {
        if (!apiKey.trim()) {
            if (onShowToast) onShowToast('[ERROR: ENTER AN API KEY FIRST]');
            return;
        }
        setIsTestingKey(true);
        matrixAudio.playDecrypt();
        try {
            const res = await fetch('https://nano-gpt.com/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey.trim()}`
                },
                body: JSON.stringify({
                    model: 'chatgpt-4o-latest',
                    messages: [{ role: 'user', content: 'Reply with "PONG" if online.' }],
                    max_tokens: 10
                })
            });
            if (res.ok) {
                matrixAudio.playPowerup();
                if (onShowToast) onShowToast('[NEURAL_PING: NANOGPT CONNECTION VERIFIED! ⚡]');
            } else {
                throw new Error(`HTTP ${res.status}`);
            }
        } catch (err) {
            matrixAudio.playPass();
            if (onShowToast) onShowToast(`[PING_FAIL: ${err.message}]`);
        } finally {
            setIsTestingKey(false);
        }
    };

    const handleApplyPreset = async (presetName) => {
        setActivePreset(presetName);
        await setSetting('active_preset', presetName);
        matrixAudio.playPowerup();

        if (presetName === 'MIKA') {
            setEnableAtmosphere(true);
            setEnableScanlines(true);
            setEnableSpeechBubble(true);
            setChatModel('chatgpt-4o-latest');
            setImageModel('flux');
        } else if (presetName === 'LOCAL_ECO') {
            setEnableAtmosphere(false);
            setEnableScanlines(false);
            setEnableSpeechBubble(true);
            setChatModel('mistral-large-2407');
            setImageModel('sdxl');
        } else if (presetName === 'IMMERSIVE') {
            setEnableAtmosphere(true);
            setEnableScanlines(true);
            setEnableSpeechBubble(true);
            setChatModel('claude-3-5-sonnet');
            setImageModel('flux');
        }
        if (onShowToast) onShowToast(`[PRESET: APPLIED ${presetName} CONFIGURATION]`);
    };

    const handleExportJson = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cards, null, 2));
        const a = document.createElement('a');
        a.href = dataStr;
        a.download = `gachaswipe_deck_export_${Date.now()}.json`;
        a.click();
        matrixAudio.playClick();
        if (onShowToast) onShowToast('[EXPORT: DECK JSON DOWNLOADED]');
    };

    const handleImportJson = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const parsed = JSON.parse(event.target.result);
                if (Array.isArray(parsed)) {
                    for (const c of parsed) {
                        await saveCard({
                            uuid: c.uuid || crypto.randomUUID(),
                            characterName: c.characterName || c.name,
                            imageBlobOrUrl: c.imageBlobOrUrl || c.imageUrl || c.image,
                            metadata: c.metadata || { ...c }
                        });
                    }
                    matrixAudio.playPowerup();
                    if (onShowToast) onShowToast(`[IMPORT: ${parsed.length} CARDS INJECTED INTO VAULT]`);
                }
            } catch (err) {
                if (onShowToast) onShowToast(`[IMPORT_ERROR: ${err.message}]`);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 100060,
            background: 'rgba(5, 3, 8, 0.92)', backdropFilter: 'blur(16px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px',
            fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace"
        }}>
            <div style={{
                width: '100%', maxWidth: '540px', height: '90vh', maxHeight: '740px',
                background: '#0B0914', border: '1px solid rgba(0, 229, 255, 0.4)', borderRadius: '16px',
                boxShadow: '0 0 50px rgba(0,0,0,0.9), 0 0 25px rgba(0,229,255,0.2)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    padding: '14px 18px', borderBottom: '1px solid rgba(0, 229, 255, 0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'rgba(0, 229, 255, 0.05)', flexShrink: 0
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#00E5FF', fontWeight: 900, fontSize: '15px' }}>
                            &gt; SYSTEM_SETTINGS.EXE
                        </span>
                        <span style={{ fontSize: '10px', color: '#ff77a9' }}>[M.I.K.A. OS]</span>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent', border: 'none', color: '#aaa',
                            cursor: 'pointer', padding: '4px'
                        }}
                    >
                        <XIcon size={16} />
                    </button>
                </div>

                {/* Settings Body */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                    {/* Presets Bar */}
                    <div style={{
                        padding: '12px', background: 'rgba(0, 229, 255, 0.04)',
                        border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '8px'
                    }}>
                        <div style={{ fontSize: '11px', color: '#00E5FF', fontWeight: 'bold', marginBottom: '8px' }}>
                            &gt; CONFIGURATION_PRESETS:
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            {['MIKA', 'IMMERSIVE', 'LOCAL_ECO'].map(p => (
                                <button
                                    key={p}
                                    onClick={() => handleApplyPreset(p)}
                                    style={{
                                        flex: 1, padding: '6px', borderRadius: '4px',
                                        border: `1px solid ${activePreset === p ? '#00E5FF' : 'rgba(255,255,255,0.15)'}`,
                                        background: activePreset === p ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255,255,255,0.03)',
                                        color: activePreset === p ? '#00E5FF' : '#888',
                                        fontSize: '10px', fontWeight: 'bold', cursor: 'pointer'
                                    }}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* BYOK NanoGPT Neural Bridge */}
                    <div style={{
                        padding: '12px', background: 'rgba(255, 16, 122, 0.04)',
                        border: '1px solid rgba(255, 16, 122, 0.25)', borderRadius: '8px'
                    }}>
                        <div style={{ fontSize: '11px', color: '#FF107A', fontWeight: 'bold', marginBottom: '6px' }}>
                            &gt; NANOGPT_BYOK_KEY:
                        </div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                            <input
                                type="password"
                                placeholder="Paste NanoGPT API Key..."
                                value={apiKey}
                                onChange={e => setApiKeyState(e.target.value)}
                                style={{
                                    flex: 1, padding: '8px 10px', borderRadius: '4px',
                                    background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,16,122,0.3)',
                                    color: '#fff', fontSize: '11px', outline: 'none'
                                }}
                            />
                            <button
                                onClick={handleSaveKey}
                                style={{
                                    padding: '0 12px', borderRadius: '4px', border: 'none',
                                    background: '#FF107A', color: '#fff', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer'
                                }}
                            >
                                SAVE
                            </button>
                            <button
                                onClick={handleTestKey}
                                disabled={isTestingKey}
                                style={{
                                    padding: '0 10px', borderRadius: '4px', border: '1px solid #00E5FF',
                                    background: 'transparent', color: '#00E5FF', fontSize: '10px', fontWeight: 'bold',
                                    cursor: isTestingKey ? 'wait' : 'pointer'
                                }}
                            >
                                {isTestingKey ? 'PING...' : 'TEST'}
                            </button>
                        </div>
                        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                            Keys are stored securely in browser IndexedDB. Never transmitted to third-party backends.
                        </div>
                    </div>

                    {/* AI Model Architecture Selection */}
                    <div style={{
                        padding: '12px', background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                        display: 'flex', flexDirection: 'column', gap: '10px'
                    }}>
                        <div style={{ fontSize: '11px', color: '#00E5FF', fontWeight: 'bold' }}>
                            &gt; NEURAL_MODELS:
                        </div>

                        <div>
                            <div style={{ fontSize: '10px', color: '#aaa', marginBottom: '4px' }}>Chat LLM Engine:</div>
                            <select
                                value={chatModel}
                                onChange={async e => {
                                    setChatModel(e.target.value);
                                    await setSetting('chat_model', e.target.value);
                                }}
                                style={{
                                    width: '100%', padding: '6px 8px', borderRadius: '4px',
                                    background: '#150f24', border: '1px solid rgba(0, 229, 255, 0.3)',
                                    color: '#00E5FF', fontSize: '11px', outline: 'none'
                                }}
                            >
                                <option value="chatgpt-4o-latest">ChatGPT-4o (Deep Roleplay & Fast)</option>
                                <option value="claude-3-5-sonnet">Claude 3.5 Sonnet (Nuanced & Literary)</option>
                                <option value="mistral-large-2407">Mistral Large (High Accuracy)</option>
                            </select>
                        </div>

                        <div>
                            <div style={{ fontSize: '10px', color: '#aaa', marginBottom: '4px' }}>Image Synthesis Engine:</div>
                            <select
                                value={imageModel}
                                onChange={async e => {
                                    setImageModel(e.target.value);
                                    await setSetting('image_model', e.target.value);
                                }}
                                style={{
                                    width: '100%', padding: '6px 8px', borderRadius: '4px',
                                    background: '#150f24', border: '1px solid rgba(255, 16, 122, 0.3)',
                                    color: '#FF107A', fontSize: '11px', outline: 'none'
                                }}
                            >
                                <option value="flux">FLUX.1 (Ultra-Detailed Anime Masterpiece)</option>
                                <option value="sdxl">SDXL Anime (Fast Cyberpunk Render)</option>
                            </select>
                        </div>
                    </div>

                    {/* Immersion & Toggles */}
                    <div style={{
                        padding: '12px', background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                        display: 'flex', flexDirection: 'column', gap: '8px'
                    }}>
                        <div style={{ fontSize: '11px', color: '#00E5FF', fontWeight: 'bold' }}>
                            &gt; VISUAL_IMMERSION:
                        </div>

                        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#EBE3D6', cursor: 'pointer' }}>
                            <span>Atmosphere Weather Particles (Sakura/Rain/Embers)</span>
                            <input
                                type="checkbox"
                                checked={enableAtmosphere}
                                onChange={async e => {
                                    setEnableAtmosphere(e.target.checked);
                                    await setSetting('enable_atmosphere', e.target.checked);
                                }}
                            />
                        </label>

                        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#EBE3D6', cursor: 'pointer' }}>
                            <span>CRT Terminal Scanlines & Vignette</span>
                            <input
                                type="checkbox"
                                checked={enableScanlines}
                                onChange={async e => {
                                    setEnableScanlines(e.target.checked);
                                    await setSetting('enable_scanlines', e.target.checked);
                                }}
                            />
                        </label>

                        <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: '#EBE3D6', cursor: 'pointer' }}>
                            <span>JRPG Floating Dialogue Bubble</span>
                            <input
                                type="checkbox"
                                checked={enableSpeechBubble}
                                onChange={async e => {
                                    setEnableSpeechBubble(e.target.checked);
                                    await setSetting('enable_speech_bubble', e.target.checked);
                                }}
                            />
                        </label>
                    </div>

                    {/* Data Backup & Restore */}
                    <div style={{
                        padding: '12px', background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                        display: 'flex', flexDirection: 'column', gap: '8px'
                    }}>
                        <div style={{ fontSize: '11px', color: '#f5a623', fontWeight: 'bold' }}>
                            &gt; DATABASE_MANAGEMENT:
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                                onClick={handleExportJson}
                                style={{
                                    flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #f5a623',
                                    background: 'rgba(245, 166, 35, 0.15)', color: '#f5a623', fontSize: '10px',
                                    fontWeight: 'bold', cursor: 'pointer'
                                }}
                            >
                                💾 EXPORT DECK JSON
                            </button>

                            <label style={{
                                flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #00E5FF',
                                background: 'rgba(0, 229, 255, 0.15)', color: '#00E5FF', fontSize: '10px',
                                fontWeight: 'bold', cursor: 'pointer', textAlign: 'center', display: 'block'
                            }}>
                                📂 IMPORT FILE
                                <input type="file" accept=".json" onChange={handleImportJson} style={{ display: 'none' }} />
                            </label>
                        </div>

                        <button
                            onClick={() => {
                                if (window.confirm("Reset deck to original factory starters? Saved companions will be cleared.")) {
                                    clearAllCards().then(() => {
                                        if (onResetDeck) onResetDeck();
                                        if (onShowToast) onShowToast('[SYSTEM: DECK FACTORY RESET]');
                                    });
                                }
                            }}
                            style={{
                                marginTop: '4px', padding: '6px', borderRadius: '4px', border: '1px dashed #ff4d6d',
                                background: 'transparent', color: '#ff4d6d', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer'
                            }}
                        >
                            ⚠️ RESET TO FACTORY STARTERS
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
