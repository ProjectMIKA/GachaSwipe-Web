import React, { useState, useEffect, useRef, useMemo } from 'react';
import { generateCharacterPersona, generateCharacterImage, NanoGPTError } from './aiClient.js';
import { 
    getApiKey, 
    saveChatMessage, 
    useChatMessages, 
    clearChatMessages, 
    getSetting, 
    setSetting,
    saveMemory,
    searchMemories,
    getMemories
} from './db.js';
import { matrixAudio } from '../core/utils/matrixAudio.js';
import { formatMessageText } from '../core/components/RoleplayRenderer.jsx';
import { calculateAffectionDelta, getSyncTier, getArchetypes } from './sentimentEngine.js';
import { CyberGroupChat } from './CyberGroupChat.jsx';

export function CyberMessenger({ companion, onClose, isEmbedded = false, onSpeechUpdate, onShowToast }) {
    // Mode switcher: 'dm' vs 'group'
    const [channelMode, setChannelMode] = useState('dm');
    const [styleMode, setStyleMode] = useState('rp'); // 'rp' | 'sms'
    const [voiceEnabled, setVoiceEnabled] = useState(false);
    const [syncSpeed, setSyncSpeed] = useState('gamified'); // 'gamified' | 'balanced' | 'realistic'
    const [showSysCtrl, setShowSysCtrl] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState(null); // Photo zoom modal
    const [replyingTo, setReplyingTo] = useState(null); // Discord-style quote reply

    // Companion Affection & State
    const companionId = companion?.uuid || companion?.id || 'default';
    const dbMessages = useChatMessages(companionId);
    const [affection, setAffection] = useState(companion?.metadata?.affection || 30);
    const [isBlocked, setIsBlocked] = useState(false);
    const [blockTimeLeft, setBlockTimeLeft] = useState(0);

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [typingStatus, setTypingStatus] = useState('');
    const messagesEndRef = useRef(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    // Countdown timer for temporary blocks
    useEffect(() => {
        if (!isBlocked || blockTimeLeft <= 0) return;
        const interval = setInterval(() => {
            setBlockTimeLeft(prev => {
                if (prev <= 1) {
                    setIsBlocked(false);
                    matrixAudio.playPowerup();
                    if (onShowToast) onShowToast(`[UNBLOCKED: ${companion?.name || 'Companion'} has reopened your channel!]`);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [isBlocked, blockTimeLeft, companion?.name, onShowToast]);

    // Initial greeting if no messages in DB yet
    useEffect(() => {
        const initChat = async () => {
            if (companion && dbMessages.length === 0) {
                const initialGreeting = companion.first_message || companion.greeting || `Nyaa~ Master! I am ${companion.name}. Let us connect!`;
                const scenario = companion.scenario ? `*${companion.scenario}* ` : '';
                await saveChatMessage(companionId, 'assistant', `${scenario}${initialGreeting}`);
                if (onSpeechUpdate) onSpeechUpdate(initialGreeting);
            }
        };
        initChat();
    }, [companionId, dbMessages.length]);

    // Auto-scroll on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [dbMessages, isLoading]);

    if (!companion) {
        return (
            <div style={{
                height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: '20px', color: 'rgba(0, 229, 255, 0.4)',
                fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", textAlign: 'center'
            }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>💬</div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', letterSpacing: '0.1em' }}>&gt; NO_ACTIVE_NEURAL_LINK</div>
                <div style={{ fontSize: '11px', marginTop: '6px', opacity: 0.7 }}>Select a companion card in the deck or roster to begin communications.</div>
            </div>
        );
    }

    if (channelMode === 'group') {
        return (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                <CyberGroupChat 
                    onSwitchToDm={() => setChannelMode('dm')}
                    onSpeechUpdate={onSpeechUpdate}
                    onShowToast={onShowToast}
                />
            </div>
        );
    }

    const currentTier = getSyncTier(affection);
    const activeArchs = getArchetypes(companion?.tags || []);

    // Web Speech API Voice Synthesizer
    const speakText = (text) => {
        if (!voiceEnabled || !window.speechSynthesis) return;
        try {
            window.speechSynthesis.cancel();
            // Clean out asterisks / roleplay cues for spoken voice
            const cleanSpeech = text.replace(/\*[^*]*?\*/g, '').replace(/\[Replying to.*?\]/g, '').trim();
            if (!cleanSpeech) return;
            const utter = new SpeechSynthesisUtterance(cleanSpeech);
            utter.pitch = 1.25; // Playful anime companion pitch
            utter.rate = 1.05;
            window.speechSynthesis.speak(utter);
        } catch (e) {
            console.warn('SpeechSynthesis error:', e);
        }
    };

    // Main Send Handler
    const handleSend = async (e) => {
        if (e) e.preventDefault();
        if (!input.trim() || isLoading || isBlocked) return;

        let userMsg = input.trim();
        setInput('');
        matrixAudio.playClick();

        // 1. Check for quoted reply injection
        if (replyingTo) {
            userMsg = `[Replying to ${replyingTo.speaker}: "${replyingTo.quote.replace(/"/g, "'")}"] ${userMsg}`;
            setReplyingTo(null);
        }

        // 2. Process Sentiment & Affection Delta
        const deltaResult = calculateAffectionDelta({
            text: userMsg,
            companion,
            currentAffection: affection,
            syncSpeed
        });

        const updatedAff = deltaResult.newAffection;
        setAffection(updatedAff);

        if (deltaResult.tierChanged) {
            matrixAudio.playPowerup();
            if (onShowToast) onShowToast(`[AFFINITY SHIFT: ${companion.name.toUpperCase()} -> ${deltaResult.syncTier.label} ${deltaResult.syncTier.icon}]`);
        }

        if (deltaResult.triggerBlock) {
            setIsBlocked(true);
            setBlockTimeLeft(deltaResult.isTempBlock ? 90 : 300); // 1.5 - 5 min block in web
            matrixAudio.playPass();
            if (onShowToast) onShowToast(`[ALERT: ${companion.name.toUpperCase()} HAS BLOCKED YOUR FREQUENCY!]`);
        }

        await saveChatMessage(companionId, 'user', userMsg);
        setIsLoading(true);
        setTypingStatus(`${companion.name} is formulating response...`);

        try {
            const apiKey = await getApiKey();
            if (!apiKey || apiKey.trim() === '') {
                setTimeout(async () => {
                    const fallback = `*blushes softly and leans closer* Master, I would love to talk more, but our neural link needs a NanoGPT API Key in the Settings or Cloud Vault to stream my full thoughts!`;
                    await saveChatMessage(companionId, 'assistant', fallback);
                    if (onSpeechUpdate) onSpeechUpdate(fallback);
                    speakText(fallback);
                    setIsLoading(false);
                    setTypingStatus('');
                }, 600);
                return;
            }

            // Keyword-based memory retrieval from IndexedDB
            const stopWords = ['about', 'would', 'could', 'should', 'their', 'there', 'where', 'which', 'really', 'master', companion.name.toLowerCase()];
            const rawKeywords = userMsg.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 4 && !stopWords.includes(w));
            const recalledMems = await searchMemories(companionId, rawKeywords);
            let memoryContext = '';
            if (recalledMems.length > 0) {
                memoryContext = `\n[RELEVANT LORE / RECALLED MEMORIES]\n` + recalledMems.map(m => `- ${m.summary || m.text}`).join('\n');
            }

            // Style directive
            const styleDirective = styleMode === 'sms'
                ? `1. SMS STYLE: Casual, short text messages (1-2 sentences max). NO asterisks. No narration. Use proper punctuation.`
                : `1. ROLEPLAY STYLE: Deeply in-character. Use asterisks for expressions or environmental actions (*smiles warmly*, *leans closer, collar jingling*). Keep responses vivid and concise (1-2 paragraphs).`;

            let blockDirective = '';
            if (deltaResult.triggerBlock) {
                blockDirective = deltaResult.isTempBlock
                    ? `\nCRITICAL DIRECTIVE: You have reached your limit with this user. This is your FINAL message before you block them. Tell them off, express irritation, but hint that you might return later.`
                    : `\nCRITICAL DIRECTIVE: You have reached your absolute limit. Express disgust and say goodbye forever.`;
            }

            // Autonomous photo & memory instructions
            const photoRule = `\n2. PHOTOS: If the user explicitly asks for a photo/selfie, or if you feel exceptionally affectionate, you may append <send_image>true</send_image><image_prompt>danbooru tags of outfit, pose, expression, location</image_prompt> to your response! Otherwise, do not send images.`;
            const memRule = `\n3. MEMORY LOGGING: If something emotionally significant or memorable occurred in this exchange, append <memory>one short sentence summary of event</memory> at the very end.`;

            const systemPrompt = `You are ${companion.name}, an anime companion communicating with your Master through a cyberpunk holographic terminal.
Personality: ${companion.personality || 'Devoted, teasing, and playful'}.
Archetype: ${companion.archetype || 'Cyber companion'}.
Active Tropes: ${activeArchs.join(', ')}.
Current Affection Level: ${updatedAff} / 100 (${deltaResult.syncTier.label}).
Bio & Lore: ${companion.description || companion.tagline || ''}.
Quirks: ${Array.isArray(companion.quirks) ? companion.quirks.join(', ') : companion.quirks || 'Bell collar jingling'}.
${styleDirective}${photoRule}${memRule}${memoryContext}${blockDirective}

Address the user as Master when in positive affinity. React faithfully to your active psychological tropes!`;

            // Prepare history prompt
            const historyPrompt = dbMessages.slice(-10).map(m => `${m.role === 'user' ? 'Master' : companion.name}: ${m.content}`).join('\n');
            const prompt = `${historyPrompt}\nMaster: ${userMsg}\n${companion.name}:`;

            const rawReply = await generateCharacterPersona({
                prompt,
                systemPrompt,
                model: 'chatgpt-4o-latest',
                temperature: 0.88
            });

            // Parse XML tags (<memory>, <send_image>, <image_prompt>)
            let cleanReply = rawReply;
            const memoryMatch = cleanReply.match(/<memory>([\s\S]*?)<\/memory>/i);
            if (memoryMatch && memoryMatch[1]) {
                const loggedMem = memoryMatch[1].trim();
                await saveMemory(companionId, loggedMem, loggedMem, 2);
                cleanReply = cleanReply.replace(/<memory>[\s\S]*?<\/memory>/gi, '');
            }

            const sendImageMatch = cleanReply.match(/<send_image>([\s\S]*?)<\/send_image>/i);
            const imagePromptMatch = cleanReply.match(/<image_prompt>([\s\S]*?)<\/image_prompt>/i);
            let attachedImageUrl = null;

            if (sendImageMatch && sendImageMatch[1].trim().toLowerCase() === 'true') {
                const imgPrompt = (imagePromptMatch && imagePromptMatch[1].trim()) || `masterpiece anime portrait of ${companion.name}, cute pose`;
                try {
                    setTypingStatus('📸 Companion is snapping a photo...');
                    attachedImageUrl = await generateCharacterImage({
                        prompt: `${imgPrompt}, masterpiece, best quality, beautiful anime aesthetic`
                    });
                } catch (e) {
                    console.warn('Auto photo generation error:', e);
                }
            }

            // Strip XML image tags from clean reply
            cleanReply = cleanReply
                .replace(/<send_image>[\s\S]*?<\/send_image>/gi, '')
                .replace(/<image_prompt>[\s\S]*?<\/image_prompt>/gi, '')
                .trim();

            if (!cleanReply && attachedImageUrl) {
                cleanReply = `*smiles and sends you a photo* Here is something special for you, Master! 💕`;
            }

            await saveChatMessage(companionId, 'assistant', cleanReply, attachedImageUrl);
            if (onSpeechUpdate) onSpeechUpdate(cleanReply);
            speakText(cleanReply);
            matrixAudio.playClick();
        } catch (err) {
            console.error('Chat error:', err);
            await saveChatMessage(companionId, 'assistant', `*glitches slightly* [Neural Link Interrupted: ${err.message}]`);
        } finally {
            setIsLoading(false);
            setTypingStatus('');
        }
    };

    // Special Action: Request Instant Selfie
    const handleRequestSelfie = async () => {
        if (isLoading || isBlocked) return;
        matrixAudio.playDecrypt();
        setIsLoading(true);
        setTypingStatus('📸 Synthesizing instant photoshoot...');
        await saveChatMessage(companionId, 'user', 'Master: Can you send me a cute selfie right now? 📸');

        try {
            const apiKey = await getApiKey();
            let selfieUrl = '';
            if (apiKey && apiKey.trim() !== '') {
                selfieUrl = await generateCharacterImage({
                    prompt: `Masterpiece casual selfie of ${companion.name}, ${companion.archetype || 'anime character'}, holding camera close, smiling at viewer, beautiful anime art style, vibrant glowing cyberpunk lighting, 8k`
                });
            } else {
                selfieUrl = `https://picsum.photos/seed/${Date.now()}/600/800`;
            }
            const caption = `*smiles brightly and snaps a quick pic* Here you go, Master! Do you like how I look today? 💕`;
            await saveChatMessage(companionId, 'assistant', caption, selfieUrl);
            if (onSpeechUpdate) onSpeechUpdate(caption);
            speakText(caption);
            matrixAudio.playLike();
        } catch (err) {
            await saveChatMessage(companionId, 'assistant', `*frowns* My camera sensor had an error: ${err.message}`);
        } finally {
            setIsLoading(false);
            setTypingStatus('');
        }
    };

    // Special Action: Re-roll broken or unwanted photo
    const handleRerollPhoto = async (msgId, originalPrompt) => {
        if (isLoading) return;
        matrixAudio.playPowerup();
        if (onShowToast) onShowToast('[RE-ROLLING PHOTO MATRIX...]');
        setIsLoading(true);
        try {
            const newUrl = await generateCharacterImage({
                prompt: originalPrompt || `Masterpiece casual selfie of ${companion.name}, smiling, high-res anime art`
            });
            // Update in IndexedDB
            const target = dbMessages.find(m => m.id === msgId);
            if (target) {
                target.imageUrl = newUrl;
                await saveChatMessage(companionId, target.role, target.content, newUrl);
            }
        } catch (err) {
            if (onShowToast) onShowToast(`[RE-ROLL FAILED: ${err.message}]`);
        } finally {
            setIsLoading(false);
        }
    };

    // Special Action: Send Gift / Headpats
    const handleSendGift = async () => {
        if (isLoading || isBlocked) return;
        matrixAudio.playPowerup();
        const giftText = `*gives ${companion.name} gentle headpats and a cyber-energy treat* 🐾✨`;
        await saveChatMessage(companionId, 'user', giftText);
        setAffection(prev => Math.min(100, prev + 6));
        setIsLoading(true);
        setTypingStatus(`${companion.name} is purring happily...`);

        setTimeout(async () => {
            const reactions = [
                `*purrs happily and leans into Master's touch, collar jingling softly* Mmm, that feels so wonderful, Master! You always know how to pamper me~`,
                `*blushes deeply with sparkling neon eyes* Master! Treats for me?! I will make sure our runtime never throws an unhandled exception today!`,
                `*eyes light up with stars* Nyaa~ Master's headpats are the best fuel in the entire matrix! Thank you! 💕`
            ];
            const chosen = reactions[Math.floor(Math.random() * reactions.length)];
            await saveChatMessage(companionId, 'assistant', chosen);
            if (onSpeechUpdate) onSpeechUpdate(chosen);
            speakText(chosen);
            setIsLoading(false);
            setTypingStatus('');
        }, 600);
    };

    // Special Action: Roll D20 Dice Check
    const handleRollDice = () => {
        const roll = Math.floor(Math.random() * 20) + 1;
        matrixAudio.playPowerup();
        const outcome = roll === 20 ? 'CRITICAL SUCCESS! ✨' : roll === 1 ? 'CRITICAL FAIL! 💀' : 'Skill Check';
        setInput(prev => `${prev ? prev + ' ' : ''}[ 🎲 Rolled a ${roll} ] ${outcome}`);
    };

    // Export Chat Log
    const handleExportChat = () => {
        const logText = dbMessages.map(m => `[${new Date(m.timestamp).toLocaleTimeString()}] ${m.role === 'user' ? 'Master' : companion.name}: ${m.content}`).join('\n\n');
        const blob = new Blob([logText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `GachaSwipe_${companion.name}_ChatLog.txt`;
        a.click();
        URL.revokeObjectURL(url);
        if (onShowToast) onShowToast('[CHAT TRANSCRIPT EXPORTED 📥]');
    };

    // Clear Chat Log
    const handlePurgeChat = async () => {
        if (window.confirm(`Purge all chat records with ${companion.name}?`)) {
            await clearChatMessages(companionId);
            matrixAudio.playPass();
            if (onShowToast) onShowToast('[CHAT MEMORY PURGED 🗑️]');
        }
    };

    const containerStyle = isEmbedded ? {
        height: '100%', display: 'flex', flexDirection: 'column', background: 'rgba(5, 3, 8, 0.95)',
        borderLeft: '1px solid rgba(0, 229, 255, 0.15)', overflow: 'hidden', position: 'relative',
        fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace"
    } : {
        position: 'fixed', inset: 0, zIndex: 99999,
        backgroundColor: 'rgba(5, 3, 10, 0.85)', backdropFilter: 'blur(12px)',
        display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px'
    };

    const cardStyle = isEmbedded ? {
        height: '100%', width: '100%', display: 'flex', flexDirection: 'column'
    } : {
        width: '100%', maxWidth: '520px', height: '90vh', maxHeight: '720px',
        background: 'linear-gradient(180deg, #130d24 0%, #080511 100%)',
        border: '1px solid rgba(0, 229, 255, 0.3)', borderRadius: '16px',
        boxShadow: '0 0 40px rgba(0, 229, 255, 0.2), inset 0 0 20px rgba(0, 229, 255, 0.05)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace"
    };

    // Affection progress bar width (-100 to +100 mapped to 0% to 100%)
    const affPercent = Math.max(0, Math.min(100, Math.round(((affection + 100) / 200) * 100)));

    return (
        <div style={containerStyle}>
            <div style={cardStyle}>
                {/* 1. Header with Channel Switcher & Affection HUD */}
                <div style={{
                    padding: '10px 14px', background: 'rgba(5, 3, 8, 0.85)',
                    borderBottom: '1px solid rgba(0, 229, 255, 0.2)', display: 'flex',
                    flexDirection: 'column', gap: '8px', zIndex: 20
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        {/* Avatar & Name */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '38px', height: '38px', borderRadius: '10px', overflow: 'hidden',
                                border: `1.5px solid ${currentTier.color}`, boxShadow: `0 0 10px ${currentTier.color}40`,
                                position: 'relative', flexShrink: 0
                            }}>
                                <img
                                    src={companion.imageBlobOrUrl || companion.imageUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80'}
                                    alt={companion.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                                {isBlocked && (
                                    <div style={{
                                        position: 'absolute', inset: 0, background: 'rgba(255, 0, 0, 0.65)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px'
                                    }}>🚫</div>
                                )}
                            </div>
                            <div>
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    color: '#00E5FF', fontWeight: 'bold', fontSize: '13px', letterSpacing: '0.04em'
                                }}>
                                    <span>&gt; {companion.name}</span>
                                    <span style={{
                                        fontSize: '9px', padding: '1px 5px', borderRadius: '4px',
                                        background: `${currentTier.color}20`, border: `1px solid ${currentTier.color}`,
                                        color: currentTier.color, fontWeight: '800'
                                    }}>
                                        {currentTier.icon} {currentTier.label}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                                    <span style={{ fontSize: '10px', color: isBlocked ? '#FF3333' : '#00FF41' }}>
                                        {isBlocked ? `[BLOCKED: ${blockTimeLeft}s]` : '● Live Synapse Link 📡'}
                                    </span>
                                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>|</span>
                                    <span style={{ fontSize: '10px', color: '#FFD700' }}>Affinity: {affection > 0 ? `+${affection}` : affection}</span>
                                </div>
                            </div>
                        </div>

                        {/* Top Action Controls */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            {/* Group Channel Switch */}
                            <button
                                onClick={() => setChannelMode('group')}
                                title="Switch to Multi-Agent Group Channel"
                                style={{
                                    background: 'rgba(0, 229, 255, 0.1)', border: '1px solid rgba(0, 229, 255, 0.4)',
                                    borderRadius: '6px', color: '#00E5FF', fontSize: '11px', padding: '4px 8px',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                                }}
                            >
                                <span>🌐</span>
                                <span style={{ fontWeight: 'bold' }}>GROUP</span>
                            </button>

                            {/* SMS vs RP Style Toggle */}
                            <button
                                onClick={() => setStyleMode(prev => prev === 'rp' ? 'sms' : 'rp')}
                                title={`Toggle Style Mode (Current: ${styleMode.toUpperCase()})`}
                                style={{
                                    background: styleMode === 'rp' ? 'rgba(181, 51, 255, 0.15)' : 'rgba(0, 229, 255, 0.15)',
                                    border: `1px solid ${styleMode === 'rp' ? '#B533FF' : '#00E5FF'}`,
                                    borderRadius: '6px', color: styleMode === 'rp' ? '#B533FF' : '#00E5FF',
                                    fontSize: '11px', padding: '4px 8px', cursor: 'pointer', fontWeight: 'bold'
                                }}
                            >
                                {styleMode === 'rp' ? '🎭 RP' : '📱 SMS'}
                            </button>

                            {/* SYS_CTRL Modal Trigger */}
                            <button
                                onClick={() => setShowSysCtrl(prev => !prev)}
                                title="System Diagnostics & Controls"
                                style={{
                                    background: showSysCtrl ? 'rgba(255, 16, 122, 0.3)' : 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '6px',
                                    color: '#fff', fontSize: '12px', padding: '4px 8px', cursor: 'pointer'
                                }}
                            >
                                🛠️
                            </button>

                            {!isEmbedded && (
                                <button
                                    onClick={onClose}
                                    style={{
                                        background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)',
                                        fontSize: '18px', cursor: 'pointer', padding: '0 4px', lineHeight: 1
                                    }}
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Affection Progress Bar */}
                    <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{
                            width: `${affPercent}%`, height: '100%',
                            background: `linear-gradient(90deg, #00E5FF 0%, ${currentTier.color} 100%)`,
                            boxShadow: `0 0 8px ${currentTier.color}`, transition: 'width 0.5s ease'
                        }} />
                    </div>
                </div>

                {/* 2. SYS_CTRL Diagnostic Overlay Dropdown */}
                {showSysCtrl && (
                    <div style={{
                        padding: '12px 16px', background: '#090514', borderBottom: '1px solid rgba(0, 229, 255, 0.3)',
                        display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '11px', color: '#C8E8F0',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.8)', zIndex: 15
                    }}>
                        <div style={{ fontWeight: 'bold', color: '#FF107A', display: 'flex', justifyContent: 'space-between' }}>
                            <span>&gt; SYS_CTRL_DIAGNOSTICS // {companion.name}</span>
                            <span style={{ color: 'rgba(255,255,255,0.4)' }}>SYNAPSE_V2</span>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div style={{ background: 'rgba(0,0,0,0.4)', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(0,229,255,0.1)' }}>
                                <div style={{ color: 'rgba(0,229,255,0.6)', fontSize: '9px' }}>ACTIVE ARCHETYPES</div>
                                <div style={{ color: '#00E5FF', fontWeight: 'bold', marginTop: '2px' }}>{activeArchs.join(', ')}</div>
                            </div>
                            <div style={{ background: 'rgba(0,0,0,0.4)', padding: '6px 8px', borderRadius: '6px', border: '1px solid rgba(0,229,255,0.1)' }}>
                                <div style={{ color: 'rgba(0,229,255,0.6)', fontSize: '9px' }}>SYNC TIER RATING</div>
                                <div style={{ color: currentTier.color, fontWeight: 'bold', marginTop: '2px' }}>{currentTier.label} ({affection}/100)</div>
                            </div>
                        </div>

                        {/* Sync Speed Selector */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ color: 'rgba(255,255,255,0.7)' }}>Neural Sync Speed:</span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                {['gamified', 'balanced', 'realistic'].map(spd => (
                                    <button
                                        key={spd}
                                        onClick={() => setSyncSpeed(spd)}
                                        style={{
                                            background: syncSpeed === spd ? 'rgba(0,229,255,0.2)' : 'rgba(0,0,0,0.4)',
                                            border: `1px solid ${syncSpeed === spd ? '#00E5FF' : 'rgba(255,255,255,0.1)'}`,
                                            color: syncSpeed === spd ? '#00E5FF' : 'rgba(255,255,255,0.6)',
                                            fontSize: '10px', padding: '3px 6px', borderRadius: '4px', cursor: 'pointer'
                                        }}
                                    >
                                        {spd.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Web Speech Voice Toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ color: 'rgba(255,255,255,0.7)' }}>Web Speech Synthesis:</span>
                            <button
                                onClick={() => setVoiceEnabled(prev => !prev)}
                                style={{
                                    background: voiceEnabled ? 'rgba(0, 255, 65, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                    border: `1px solid ${voiceEnabled ? '#00FF41' : 'rgba(255,255,255,0.2)'}`,
                                    color: voiceEnabled ? '#00FF41' : '#aaa',
                                    fontSize: '10px', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer'
                                }}
                            >
                                {voiceEnabled ? '🔊 ENABLED' : '🔇 MUTED'}
                            </button>
                        </div>

                        {/* Purge & Export Controls */}
                        <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            {isBlocked && (
                                <button
                                    onClick={() => { setIsBlocked(false); setBlockTimeLeft(0); }}
                                    style={{
                                        flex: 1, background: 'rgba(0, 255, 65, 0.1)', border: '1px solid #00FF41',
                                        color: '#00FF41', padding: '4px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer'
                                    }}
                                >
                                    ⚡ FORCE UNBLOCK
                                </button>
                            )}
                            <button
                                onClick={handleExportChat}
                                style={{
                                    flex: 1, background: 'rgba(0, 229, 255, 0.1)', border: '1px solid rgba(0, 229, 255, 0.4)',
                                    color: '#00E5FF', padding: '4px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer'
                                }}
                            >
                                📥 EXPORT LOG
                            </button>
                            <button
                                onClick={handlePurgeChat}
                                style={{
                                    flex: 1, background: 'rgba(255, 16, 122, 0.1)', border: '1px solid rgba(255, 16, 122, 0.4)',
                                    color: '#FF107A', padding: '4px', borderRadius: '4px', fontSize: '10px', cursor: 'pointer'
                                }}
                            >
                                🗑️ PURGE CHAT
                            </button>
                        </div>
                    </div>
                )}

                {/* 3. Quick Action Interactive Bar */}
                <div style={{
                    padding: '6px 14px', background: 'rgba(10, 6, 16, 0.6)',
                    borderBottom: '1px solid rgba(0, 229, 255, 0.1)', display: 'flex', gap: '8px', overflowX: 'auto'
                }}>
                    <button
                        onClick={handleRequestSelfie}
                        disabled={isLoading || isBlocked}
                        style={{
                            background: 'rgba(0, 229, 255, 0.08)', border: '1px solid rgba(0, 229, 255, 0.3)',
                            borderRadius: '6px', color: '#00E5FF', fontSize: '10px', padding: '4px 8px',
                            cursor: (isLoading || isBlocked) ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap'
                        }}
                    >
                        <span>📸</span>
                        <span>ASK FOR SELFIE</span>
                    </button>
                    <button
                        onClick={handleSendGift}
                        disabled={isLoading || isBlocked}
                        style={{
                            background: 'rgba(255, 16, 122, 0.08)', border: '1px solid rgba(255, 16, 122, 0.3)',
                            borderRadius: '6px', color: '#FF107A', fontSize: '10px', padding: '4px 8px',
                            cursor: (isLoading || isBlocked) ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap'
                        }}
                    >
                        <span>🐾</span>
                        <span>HEADPATS & TREATS</span>
                    </button>
                    <button
                        onClick={handleRollDice}
                        disabled={isLoading || isBlocked}
                        style={{
                            background: 'rgba(255, 215, 0, 0.08)', border: '1px solid rgba(255, 215, 0, 0.3)',
                            borderRadius: '6px', color: '#FFD700', fontSize: '10px', padding: '4px 8px',
                            cursor: (isLoading || isBlocked) ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap'
                        }}
                    >
                        <span>🎲</span>
                        <span>ROLL D20</span>
                    </button>
                </div>

                {/* 4. Message History Scrollable Area */}
                <div style={{
                    flex: 1, overflowY: 'auto', padding: '14px', display: 'flex',
                    flexDirection: 'column', gap: '12px', position: 'relative'
                }}>
                    {dbMessages.map((msg, idx) => {
                        const isUser = msg.role === 'user';
                        // Extract discord quote if present
                        let quoteMatch = msg.content.match(/^\[Replying to (.*?):\s*"(.*?)"\]\s*/);
                        let cleanBody = msg.content;
                        let quotedSpeaker = null;
                        let quotedText = null;

                        if (quoteMatch) {
                            quotedSpeaker = quoteMatch[1];
                            quotedText = quoteMatch[2];
                            cleanBody = msg.content.replace(/^\[Replying to .*?:\s*".*?"\]\s*/, '');
                        }

                        return (
                            <div
                                key={msg.id || idx}
                                style={{
                                    display: 'flex', flexDirection: 'column',
                                    alignItems: isUser ? 'flex-end' : 'flex-start',
                                    position: 'relative'
                                }}
                            >
                                <div style={{
                                    maxWidth: '85%', padding: '10px 14px',
                                    borderRadius: isUser ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                                    background: isUser
                                        ? 'linear-gradient(135deg, rgba(0, 229, 255, 0.2) 0%, rgba(0, 150, 255, 0.1) 100%)'
                                        : 'linear-gradient(135deg, rgba(19, 13, 36, 0.9) 0%, rgba(10, 6, 18, 0.9) 100%)',
                                    border: isUser ? '1px solid rgba(0, 229, 255, 0.4)' : '1px solid rgba(255, 16, 122, 0.25)',
                                    color: '#E0F7FA', fontSize: '13px', lineHeight: '1.5',
                                    boxShadow: isUser ? '0 4px 16px rgba(0, 229, 255, 0.1)' : '0 4px 20px rgba(0, 0, 0, 0.5)',
                                    position: 'relative'
                                }}>
                                    {/* Speaker Header */}
                                    <div style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        fontSize: '10px', color: isUser ? '#00E5FF' : '#FF107A', marginBottom: '4px',
                                        fontWeight: 'bold', letterSpacing: '0.04em'
                                    }}>
                                        <span>&gt; {isUser ? 'Master' : companion.name.toUpperCase()}</span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ fontSize: '9px', opacity: 0.6 }}>
                                                {new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            {/* Quick Reply Button */}
                                            <button
                                                onClick={() => setReplyingTo({
                                                    speaker: isUser ? 'Master' : companion.name,
                                                    quote: cleanBody.substring(0, 80)
                                                })}
                                                title="Quote and reply to this message"
                                                style={{
                                                    background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)',
                                                    cursor: 'pointer', fontSize: '10px', padding: 0
                                                }}
                                            >
                                                ↩
                                            </button>
                                        </div>
                                    </div>

                                    {/* Quoted Preview Banner */}
                                    {quotedSpeaker && (
                                        <div style={{
                                            borderLeft: '2px solid #00E5FF', background: 'rgba(0, 229, 255, 0.08)',
                                            padding: '4px 8px', borderRadius: '0 4px 4px 0', fontSize: '10px',
                                            color: 'rgba(200, 232, 240, 0.7)', marginBottom: '6px', fontStyle: 'italic'
                                        }}>
                                            <span style={{ fontWeight: 'bold', color: '#00E5FF' }}>{quotedSpeaker}: </span>
                                            <span>"{quotedText}"</span>
                                        </div>
                                    )}

                                    {/* Render formatted message text */}
                                    <div style={{ wordBreak: 'break-word' }}>
                                        {formatMessageText(cleanBody)}
                                    </div>

                                    {/* In-Chat Photo Card (if image attached) */}
                                    {msg.imageUrl && (
                                        <div style={{
                                            marginTop: '10px', borderRadius: '10px', overflow: 'hidden',
                                            border: '1px solid rgba(0, 229, 255, 0.4)', background: '#000',
                                            boxShadow: '0 4px 20px rgba(0, 229, 255, 0.25)', position: 'relative'
                                        }}>
                                            <img
                                                src={msg.imageUrl}
                                                alt="Selfie"
                                                onClick={() => setSelectedPhoto(msg.imageUrl)}
                                                style={{
                                                    width: '100%', maxHeight: '240px', objectFit: 'cover',
                                                    display: 'block', cursor: 'zoom-in', transition: 'transform 0.3s ease'
                                                }}
                                            />
                                            <div style={{
                                                position: 'absolute', bottom: 0, left: 0, right: 0, padding: '6px 10px',
                                                background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.85) 100%)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                fontSize: '10px', color: '#00E5FF'
                                            }}>
                                                <span>📸 HOLO_CAPTURE // 8K</span>
                                                <button
                                                    onClick={() => handleRerollPhoto(msg.id, msg.content)}
                                                    title="Re-roll this photo"
                                                    style={{
                                                        background: 'rgba(255, 16, 122, 0.2)', border: '1px solid #FF107A',
                                                        borderRadius: '4px', color: '#FF107A', fontSize: '9px',
                                                        padding: '2px 6px', cursor: 'pointer', fontWeight: 'bold'
                                                    }}
                                                >
                                                    ⚡ RE-ROLL
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* Typing indicator */}
                    {isLoading && (
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(0, 229, 255, 0.7)',
                            fontSize: '11px', fontStyle: 'italic', padding: '6px 10px'
                        }}>
                            <span style={{ animation: 'spin 1s linear infinite' }}>⚙️</span>
                            <span>{typingStatus || `${companion.name} is streaming neural response...`}</span>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* 5. Reply Quote Banner (if user clicked reply) */}
                {replyingTo && (
                    <div style={{
                        padding: '6px 14px', background: 'rgba(0, 229, 255, 0.1)',
                        borderTop: '1px solid rgba(0, 229, 255, 0.3)', display: 'flex',
                        alignItems: 'center', justifyContent: 'space-between', fontSize: '11px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#00E5FF' }}>
                            <span>↩ Replying to <strong>{replyingTo.speaker}</strong>:</span>
                            <span style={{ color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>
                                "{replyingTo.quote.substring(0, 40)}..."
                            </span>
                        </div>
                        <button
                            onClick={() => setReplyingTo(null)}
                            style={{
                                background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)',
                                cursor: 'pointer', fontSize: '12px'
                            }}
                        >
                            ✕
                        </button>
                    </div>
                )}

                {/* 6. Message Input & Transmit Controls */}
                <form
                    onSubmit={handleSend}
                    style={{
                        padding: '10px 14px', background: 'rgba(5, 3, 8, 0.95)',
                        borderTop: '1px solid rgba(0, 229, 255, 0.2)', display: 'flex',
                        gap: '8px', alignItems: 'center', zIndex: 20
                    }}
                >
                    <input
                        type="text"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        disabled={isLoading || isBlocked}
                        placeholder={
                            isBlocked
                                ? `[CHANNEL BLOCKED - ${blockTimeLeft}s REMAINING]`
                                : `Transmit command to ${companion.name}...`
                        }
                        style={{
                            flex: 1, padding: '10px 14px', borderRadius: '8px',
                            background: isBlocked ? 'rgba(255, 0, 0, 0.1)' : 'rgba(0, 229, 255, 0.05)',
                            border: isBlocked ? '1px solid rgba(255, 0, 0, 0.4)' : '1px solid rgba(0, 229, 255, 0.3)',
                            color: '#E0F7FA', fontSize: '13px', outline: 'none',
                            fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace"
                        }}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim() || isBlocked}
                        style={{
                            padding: '10px 18px', borderRadius: '8px',
                            background: isBlocked ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, #FF107A 0%, #B533FF 100%)',
                            border: 'none', color: isBlocked ? '#666' : '#fff', fontWeight: 'bold', fontSize: '12px',
                            cursor: (isLoading || !input.trim() || isBlocked) ? 'not-allowed' : 'pointer',
                            boxShadow: isBlocked ? 'none' : '0 0 15px rgba(255, 16, 122, 0.4)',
                            transition: 'all 0.2s ease', letterSpacing: '0.05em'
                        }}
                    >
                        TRANSMIT
                    </button>
                </form>

                {/* 7. Fullscreen Photo Zoom Modal */}
                {selectedPhoto && (
                    <div
                        onClick={() => setSelectedPhoto(null)}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 100000,
                            background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(10px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '20px', cursor: 'zoom-out'
                        }}
                    >
                        <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
                            <img
                                src={selectedPhoto}
                                alt="Expanded Photo"
                                style={{
                                    maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain',
                                    borderRadius: '12px', border: '1px solid rgba(0, 229, 255, 0.5)',
                                    boxShadow: '0 0 50px rgba(0, 229, 255, 0.4)'
                                }}
                            />
                            <div style={{
                                position: 'absolute', top: '-35px', right: 0, color: '#fff',
                                fontSize: '14px', fontWeight: 'bold', cursor: 'pointer'
                            }}>
                                [ TAP TO CLOSE ✕ ]
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
