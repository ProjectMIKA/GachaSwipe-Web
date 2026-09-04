import React, { useState, useEffect, useRef } from 'react';
import { generateCharacterPersona, generateCharacterImage, NanoGPTError } from './aiClient.js';
import { getApiKey, saveChatMessage, useChatMessages, clearChatMessages } from './db.js';
import { matrixAudio } from '../core/utils/matrixAudio.js';

export function CyberMessenger({ companion, onClose, isEmbedded = false, onSpeechUpdate }) {
    if (!companion) {
        return (
            <div style={{
                height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: '20px', color: 'rgba(0, 229, 255, 0.4)',
                fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", textAlign: 'center'
            }}>
                <div style={{ fontSize: '32px', marginBottom: '12px' }}>💬</div>
                <div style={{ fontSize: '12px', fontWeight: 'bold' }}>&gt; NO_ACTIVE_NEURAL_LINK</div>
                <div style={{ fontSize: '10px', marginTop: '6px' }}>Select a companion card to begin communications.</div>
            </div>
        );
    }

    const companionId = companion.uuid || companion.id || 'default';
    const dbMessages = useChatMessages(companionId);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [statusNote, setStatusNote] = useState('● Live Hologram Link 📡');
    const messagesEndRef = useRef(null);

    // Initial greeting if no messages in DB yet
    useEffect(() => {
        const initChat = async () => {
            if (dbMessages.length === 0) {
                const initialGreeting = companion.first_message || companion.greeting || `Nyaa~ Master! I am ${companion.name}. Let us connect!`;
                const scenario = companion.scenario ? `*${companion.scenario}* ` : '';
                await saveChatMessage(companionId, 'assistant', `${scenario}${initialGreeting}`);
                if (onSpeechUpdate) onSpeechUpdate(initialGreeting);
            }
        };
        initChat();
    }, [companionId, dbMessages.length]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [dbMessages, isLoading]);

    const handleSend = async (e) => {
        if (e) e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput('');
        matrixAudio.playClick();

        await saveChatMessage(companionId, 'user', userMsg);
        setIsLoading(true);

        try {
            const apiKey = await getApiKey();
            if (!apiKey || apiKey.trim() === '') {
                setTimeout(async () => {
                    const fallback = `*blushes and tugs Master's sleeve* Master, I would love to talk more, but our neural link needs a NanoGPT API Key in the Settings or Cloud Vault to stream my full thoughts!`;
                    await saveChatMessage(companionId, 'assistant', fallback);
                    if (onSpeechUpdate) onSpeechUpdate(fallback);
                    setIsLoading(false);
                }, 600);
                return;
            }

            const systemPrompt = `You are ${companion.name}, an anime character communicating with your Master through a cyberpunk holographic terminal.
Personality: ${companion.personality || 'Devoted, teasing, and playful'}.
Archetype: ${companion.archetype || 'Cyber companion'}.
Bio & Lore: ${companion.description || companion.tagline || ''}.
Quirks: ${Array.isArray(companion.quirks) ? companion.quirks.join(', ') : companion.quirks || 'Bell collar jingling'}.
Tone: Stay deeply in-character. Use light asterisks for cute expressions or environmental actions like *leans closer* or *purrs softly*. Keep answers concise and engaging (1 to 2 paragraphs). Address the user affectionately as Master.`;

            // Prepare last 8 messages for context
            const historyPrompt = dbMessages.slice(-8).map(m => `${m.role === 'user' ? 'Master' : companion.name}: ${m.content}`).join('\n');
            const prompt = `${historyPrompt}\nMaster: ${userMsg}\n${companion.name}:`;

            const reply = await generateCharacterPersona({
                prompt,
                systemPrompt,
                model: 'chatgpt-4o-latest',
                temperature: 0.88
            });

            const cleanReply = reply.trim();
            await saveChatMessage(companionId, 'assistant', cleanReply);
            if (onSpeechUpdate) onSpeechUpdate(cleanReply);
            matrixAudio.playClick();
        } catch (err) {
            console.error('Chat error:', err);
            await saveChatMessage(companionId, 'assistant', `*glitches slightly* [Neural Link Glitch: ${err.message}]`);
        } finally {
            setIsLoading(false);
        }
    };

    // Special Action: Request Selfie
    const handleRequestSelfie = async () => {
        if (isLoading) return;
        matrixAudio.playDecrypt();
        setIsLoading(true);
        setStatusNote('📸 Capturing instant selfie...');
        await saveChatMessage(companionId, 'user', 'Master: Can you send me a cute selfie right now? 📸');

        try {
            const apiKey = await getApiKey();
            let selfieUrl = '';
            if (apiKey && apiKey.trim() !== '') {
                selfieUrl = await generateCharacterImage({
                    prompt: `Masterpiece casual selfie of ${companion.name}, ${companion.archetype}, holding camera close, smiling at viewer, beautiful anime art style, vibrant glowing lighting, 8k`
                });
            } else {
                selfieUrl = `https://picsum.photos/seed/${Date.now()}/600/800`;
            }
            const caption = `*smiles brightly and snaps a quick pic* Here you go, Master! Do you like how I look today? 💕`;
            await saveChatMessage(companionId, 'assistant', caption, selfieUrl);
            if (onSpeechUpdate) onSpeechUpdate(caption);
            matrixAudio.playLike();
        } catch (err) {
            await saveChatMessage(companionId, 'assistant', `*frowns* My camera sensor had an error: ${err.message}`);
        } finally {
            setIsLoading(false);
            setStatusNote('● Live Hologram Link 📡');
        }
    };

    // Special Action: Send Gift / Headpats
    const handleSendGift = async () => {
        if (isLoading) return;
        matrixAudio.playPowerup();
        const giftText = `*gives ${companion.name} gentle headpats and a cyber-energy treat* 🐾✨`;
        await saveChatMessage(companionId, 'user', giftText);
        setIsLoading(true);

        setTimeout(async () => {
            const reactions = [
                `*purrs happily and leans into Master's touch, collar jingling softly* Mmm, that feels so nice, Master! You always know how to pamper me~`,
                `*blushes deeply with sparkling eyes* Master! You're giving me treats?! I will make sure our runtime never throws an unhandled exception today!`,
                `*eyes light up with neon stars* Nyaa~ Master's headpats are the best fuel in the entire matrix! Thank you! 💕`
            ];
            const chosen = reactions[Math.floor(Math.random() * reactions.length)];
            await saveChatMessage(companionId, 'assistant', chosen);
            if (onSpeechUpdate) onSpeechUpdate(chosen);
            setIsLoading(false);
        }, 600);
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

    return (
        <div style={containerStyle}>
            <div style={cardStyle}>
                {/* Header */}
                <div style={{
                    padding: '12px 16px', borderBottom: '1px solid rgba(0, 229, 255, 0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'rgba(0, 229, 255, 0.05)', flexShrink: 0
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <img
                            src={companion.imageUrl || companion.image}
                            alt=""
                            style={{
                                width: '36px', height: '36px', borderRadius: '50%',
                                objectFit: 'cover', border: '1.5px solid #00E5FF',
                                boxShadow: '0 0 8px rgba(0, 229, 255, 0.4)'
                            }}
                        />
                        <div>
                            <div style={{ color: '#00E5FF', fontWeight: 800, fontSize: '13px', letterSpacing: '0.04em' }}>
                                &gt; {companion.name.toUpperCase()}
                            </div>
                            <div style={{ fontSize: '10px', color: '#ff77a9', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>{statusNote}</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                            onClick={() => clearChatMessages(companionId)}
                            title="Clear Chat Session"
                            style={{
                                background: 'transparent', border: '1px solid rgba(255,255,255,0.15)',
                                color: 'rgba(255,255,255,0.5)', borderRadius: '4px', fontSize: '10px',
                                padding: '3px 6px', cursor: 'pointer'
                            }}
                        >
                            CLEAR
                        </button>
                        {!isEmbedded && onClose && (
                            <button
                                onClick={onClose}
                                style={{
                                    background: 'transparent', border: 'none', color: '#aaa',
                                    fontSize: '18px', cursor: 'pointer', padding: '2px 6px'
                                }}
                            >
                                ✕
                            </button>
                        )}
                    </div>
                </div>

                {/* Quick Interactive Actions Ribbon */}
                <div style={{
                    padding: '6px 12px', background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid rgba(0, 229, 255, 0.1)',
                    display: 'flex', gap: '8px', overflowX: 'auto', flexShrink: 0
                }}>
                    <button
                        onClick={handleRequestSelfie}
                        disabled={isLoading}
                        style={{
                            padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(0, 229, 255, 0.3)',
                            background: 'rgba(0, 229, 255, 0.1)', color: '#00E5FF', fontSize: '10px',
                            fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                    >
                        📸 ASK FOR SELFIE
                    </button>
                    <button
                        onClick={handleSendGift}
                        disabled={isLoading}
                        style={{
                            padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(255, 16, 122, 0.3)',
                            background: 'rgba(255, 16, 122, 0.1)', color: '#FF107A', fontSize: '10px',
                            fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                    >
                        🐾 HEADPATS & TREATS
                    </button>
                </div>

                {/* Message Log */}
                <div style={{
                    flex: 1, padding: '14px', overflowY: 'auto', display: 'flex',
                    flexDirection: 'column', gap: '10px'
                }}>
                    {dbMessages.map((m, idx) => {
                        const isUser = m.role === 'user';
                        return (
                            <div
                                key={m.id || idx}
                                style={{
                                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                                    maxWidth: '85%',
                                    background: isUser ? 'rgba(255, 16, 122, 0.12)' : 'rgba(0, 229, 255, 0.06)',
                                    border: `1px solid ${isUser ? 'rgba(255, 16, 122, 0.35)' : 'rgba(0, 229, 255, 0.25)'}`,
                                    borderLeft: isUser ? undefined : '2px solid #00E5FF',
                                    borderRight: isUser ? '2px solid #FF107A' : undefined,
                                    borderRadius: '6px',
                                    padding: '10px 14px', color: '#EBE3D6', fontSize: '12px', lineHeight: 1.5,
                                    boxShadow: `0 4px 15px ${isUser ? 'rgba(255, 16, 122, 0.1)' : 'rgba(0, 229, 255, 0.08)'}`
                                }}
                            >
                                <div style={{ fontSize: '9px', color: isUser ? '#ff77a9' : '#00E5FF', marginBottom: '4px', fontWeight: 800 }}>
                                    {isUser ? '> MASTER' : `> ${companion.name.toUpperCase()}`}
                                </div>
                                
                                {m.imageUrl && (
                                    <div style={{ marginBottom: '8px', borderRadius: '4px', overflow: 'hidden', border: '1px solid #00E5FF' }}>
                                        <img src={m.imageUrl} alt="Selfie" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', display: 'block' }} />
                                    </div>
                                )}

                                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                    {m.content}
                                </div>
                            </div>
                        );
                    })}

                    {isLoading && (
                        <div style={{
                            alignSelf: 'flex-start', background: 'rgba(0, 229, 255, 0.04)',
                            border: '1px dashed rgba(0, 229, 255, 0.3)', borderRadius: '4px',
                            padding: '8px 12px', color: '#00E5FF', fontSize: '11px', animation: 'csd-pulse 1s infinite'
                        }}>
                            &gt; {companion.name.toUpperCase()} is synthesizing neural reply...
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Bar */}
                <form
                    onSubmit={handleSend}
                    style={{
                        padding: '10px 12px', borderTop: '1px solid rgba(0, 229, 255, 0.2)',
                        display: 'flex', gap: '8px', background: 'rgba(0, 0, 0, 0.6)', flexShrink: 0
                    }}
                >
                    <input
                        type="text"
                        placeholder={`Transmit command to ${companion.name}...`}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        style={{
                            flex: 1, padding: '8px 12px', borderRadius: '4px',
                            background: 'rgba(0, 0, 0, 0.7)', border: '1px solid rgba(0, 229, 255, 0.25)',
                            color: '#fff', fontSize: '12px', outline: 'none',
                            fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace"
                        }}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        style={{
                            padding: '0 16px', borderRadius: '4px', border: 'none',
                            background: 'linear-gradient(135deg, #00E5FF, #7928CA)',
                            color: '#000', fontWeight: 800, fontSize: '11px', cursor: 'pointer',
                            opacity: (!input.trim() || isLoading) ? 0.5 : 1,
                            fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace"
                        }}
                    >
                        TRANSMIT
                    </button>
                </form>
            </div>
        </div>
    );
}
