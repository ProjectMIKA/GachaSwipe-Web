import React, { useState, useEffect, useRef } from 'react';
import { generateCharacterPersona, NanoGPTError } from './aiClient.js';
import { getApiKey } from './db.js';

export function RoleplayModal({ isOpen, onClose, character }) {
    if (!isOpen || !character) return null;

    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        // Initialize chat with character's greeting and scenario
        const initialGreeting = character.first_message || character.greeting || `Hello Master, I am ${character.name}.`;
        const scenario = character.scenario ? `*${character.scenario}* ` : '';
        setMessages([
            {
                role: 'assistant',
                content: `${scenario}${initialGreeting}`,
                timestamp: Date.now()
            }
        ]);
    }, [character.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput('');
        const updatedMessages = [...messages, { role: 'user', content: userMsg, timestamp: Date.now() }];
        setMessages(updatedMessages);
        setIsLoading(true);

        try {
            const apiKey = await getApiKey();
            if (!apiKey || apiKey.trim() === '') {
                setTimeout(() => {
                    setMessages(prev => [
                        ...prev,
                        {
                            role: 'assistant',
                            content: `*fidgets shyly* Master, I'd love to chat more, but you need to paste your NanoGPT API Key into the Cloud Vault so the AI neural bridge can link us!`,
                            timestamp: Date.now()
                        }
                    ]);
                    setIsLoading(false);
                }, 600);
                return;
            }

            const systemPrompt = `You are ${character.name}, an anime character in a visual novel / cyberdeck roleplay with the user (Master).
Personality: ${character.personality || 'Affectionate and devoted'}.
Archetype: ${character.archetype || 'Cyber companion'}.
Bio & Lore: ${character.description || character.bio || ''}.
Quirks: ${Array.isArray(character.quirks) ? character.quirks.join(', ') : character.quirks || ''}.
Tone: Deeply in-character, using light asterisks for actions like *tilts head playfully* or *smiles warmly*. Keep responses concise, vivid, and engaging (1 to 3 paragraphs max). Address user affectionately as Master when appropriate.`;

            // Prepare history for chat completion
            const historyPrompt = updatedMessages.map(m => `${m.role === 'user' ? 'Master' : character.name}: ${m.content}`).join('\n');
            const prompt = `${historyPrompt}\n${character.name}:`;

            const reply = await generateCharacterPersona({
                prompt,
                systemPrompt,
                model: 'chatgpt-4o-latest',
                temperature: 0.88
            });

            setMessages(prev => [
                ...prev,
                {
                    role: 'assistant',
                    content: reply.trim(),
                    timestamp: Date.now()
                }
            ]);
        } catch (err) {
            console.error('Chat error:', err);
            setMessages(prev => [
                ...prev,
                {
                    role: 'assistant',
                    content: `*glitches slightly* [Terminal Link Hiccup: ${err.message}]`,
                    timestamp: Date.now()
                }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            backgroundColor: 'rgba(5, 3, 10, 0.85)', backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)', display: 'flex', justifyContent: 'center', alignItems: 'center',
            padding: '16px'
        }}>
            <div style={{
                width: '100%', maxWidth: '520px', height: '90vh', maxHeight: '720px',
                background: 'linear-gradient(180deg, #130d24 0%, #080511 100%)',
                border: '1px solid rgba(0, 229, 255, 0.3)', borderRadius: '20px',
                boxShadow: '0 0 40px rgba(0, 229, 255, 0.2), inset 0 0 20px rgba(0, 229, 255, 0.05)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
                fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace"
            }}>
                {/* Header */}
                <div style={{
                    padding: '16px 20px', borderBottom: '1px solid rgba(0, 229, 255, 0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'rgba(0, 229, 255, 0.04)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img
                            src={character.imageUrl || character.image}
                            alt=""
                            style={{
                                width: '40px', height: '40px', borderRadius: '50%',
                                objectFit: 'cover', border: '2px solid #00E5FF',
                                boxShadow: '0 0 10px rgba(0, 229, 255, 0.5)'
                            }}
                        />
                        <div>
                            <div style={{ color: '#00E5FF', fontWeight: 800, fontSize: '14px', letterSpacing: '0.05em' }}>
                                &gt; {character.name.toUpperCase()}
                            </div>
                            <div style={{ fontSize: '11px', color: '#ff77a9' }}>
                                ● Live Hologram Link
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent', border: 'none', color: '#aaa',
                            fontSize: '20px', cursor: 'pointer', padding: '4px 8px'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Message Log */}
                <div style={{
                    flex: 1, padding: '20px', overflowY: 'auto', display: 'flex',
                    flexDirection: 'column', gap: '14px'
                }}>
                    {messages.map((m, idx) => {
                        const isUser = m.role === 'user';
                        return (
                            <div
                                key={idx}
                                style={{
                                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                                    maxWidth: '85%',
                                    background: isUser ? 'rgba(255, 16, 122, 0.15)' : 'rgba(0, 229, 255, 0.08)',
                                    border: `1px solid ${isUser ? 'rgba(255, 16, 122, 0.4)' : 'rgba(0, 229, 255, 0.3)'}`,
                                    borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                    padding: '12px 16px', color: '#EBE3D6', fontSize: '13px', lineHeight: 1.5,
                                    boxShadow: `0 4px 15px ${isUser ? 'rgba(255, 16, 122, 0.15)' : 'rgba(0, 229, 255, 0.1)'}`
                                }}
                            >
                                <div style={{ fontSize: '10px', color: isUser ? '#ff77a9' : '#00E5FF', marginBottom: '4px', fontWeight: 700 }}>
                                    {isUser ? 'MASTER' : character.name.toUpperCase()}
                                </div>
                                <div style={{ whiteSpace: 'pre-wrap' }}>
                                    {m.content}
                                </div>
                            </div>
                        );
                    })}
                    {isLoading && (
                        <div style={{
                            alignSelf: 'flex-start', background: 'rgba(0, 229, 255, 0.05)',
                            border: '1px dashed rgba(0, 229, 255, 0.3)', borderRadius: '12px',
                            padding: '10px 16px', color: '#00E5FF', fontSize: '12px', animation: 'csd-pulse 1s infinite'
                        }}>
                            &gt; {character.name.toUpperCase()} is typing response...
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Bar */}
                <form
                    onSubmit={handleSend}
                    style={{
                        padding: '16px', borderTop: '1px solid rgba(0, 229, 255, 0.2)',
                        display: 'flex', gap: '10px', background: 'rgba(0, 0, 0, 0.5)'
                    }}
                >
                    <input
                        type="text"
                        placeholder={`Message ${character.name}...`}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        style={{
                            flex: 1, padding: '12px 16px', borderRadius: '10px',
                            background: 'rgba(0, 0, 0, 0.6)', border: '1px solid rgba(0, 229, 255, 0.3)',
                            color: '#fff', fontSize: '13px', outline: 'none',
                            fontFamily: 'inherit'
                        }}
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        style={{
                            padding: '0 20px', borderRadius: '10px', border: 'none',
                            background: 'linear-gradient(135deg, #00E5FF, #7928CA)',
                            color: '#000', fontWeight: 800, fontSize: '12px', cursor: 'pointer',
                            opacity: (!input.trim() || isLoading) ? 0.5 : 1
                        }}
                    >
                        SEND
                    </button>
                </form>
            </div>
        </div>
    );
}
