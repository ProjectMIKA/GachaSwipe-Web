import React, { useState, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, saveChatMessage, getChatMessages } from '../db.js';

// Default mock roster if Dexie is fresh
const SAMPLE_MATCHES = [
    {
        id: 'layla_core',
        name: 'Layla // Neural Core',
        archetype: 'AI Assistant',
        franchise: 'M.I.K.A. OS',
        imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80',
        syncLevel: 98,
        syncStatus: 'SOULBOUND',
        lastMessage: 'Master! All neural nodes are operating at peak overclock. Ready for deployment~',
        lastMessageTime: 'Just now',
        unread: true,
        isFavorite: true,
        status: 'friend'
    },
    {
        id: 'seraphina_v',
        name: 'Seraphina V',
        archetype: 'Cyber Hacker',
        franchise: 'Neon Syndicate',
        imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&q=80',
        syncLevel: 82,
        syncStatus: 'OBSESSED',
        lastMessage: 'I breached the corporate subnet. Left a surprise in your vault.',
        lastMessageTime: '12m ago',
        unread: false,
        isFavorite: true,
        status: 'friend'
    },
    {
        id: 'kallisto_mech',
        name: 'Kallisto-09',
        archetype: 'Android Mercenary',
        franchise: 'Orbital Strike',
        imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80',
        syncLevel: 55,
        syncStatus: 'SYNCHRONIZING',
        lastMessage: 'Ammunition restocked. Waiting on next tactical directive.',
        lastMessageTime: '1h ago',
        unread: false,
        isFavorite: false,
        status: 'friend'
    }
];

export const PersistentChat = ({ activeChatId, onSelectChat, onCloseMobileDrawer }) => {
    const [selectedTab, setSelectedTab] = useState('friends'); // 'friends' | 'groups' | 'pending' | 'favorites'
    const [activeChat, setActiveChat] = useState(null);
    const [inputMessage, setInputMessage] = useState('');
    const [localMessages, setLocalMessages] = useState([]);
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    // Live query from Dexie DB
    const liveCards = useLiveQuery(() => db?.cards?.toArray() || [], []) || [];
    const liveChats = useLiveQuery(() => db?.chats?.toArray() || [], []) || [];

    // Combine Dexie records with samples
    const allMatches = React.useMemo(() => {
        const list = [...SAMPLE_MATCHES];
        if (liveCards && liveCards.length > 0) {
            liveCards.forEach(card => {
                const existing = list.find(m => m.id === String(card.id) || m.id === card.uuid);
                if (!existing) {
                    list.push({
                        id: String(card.id || card.uuid),
                        name: card.characterName || 'Unknown Agent',
                        archetype: card.metadata?.personality || 'Operative',
                        franchise: card.metadata?.franchise || 'Independent',
                        imageUrl: card.imageBlobOrUrl || card.image || SAMPLE_MATCHES[0].imageUrl,
                        syncLevel: card.metadata?.affection || 65,
                        syncStatus: card.metadata?.affection >= 80 ? 'OBSESSED' : 'SYNCHRONIZING',
                        lastMessage: card.metadata?.lore || 'Neural matrix connected.',
                        lastMessageTime: 'Recent',
                        unread: false,
                        isFavorite: !!card.metadata?.is_favorite,
                        status: 'friend'
                    });
                }
            });
        }
        return list;
    }, [liveCards, liveChats]);

    // Update active chat object when ID changes
    useEffect(() => {
        if (activeChatId) {
            const found = allMatches.find(m => m.id === activeChatId);
            if (found) {
                setActiveChat(found);
            }
        }
    }, [activeChatId, allMatches]);

    // Load messages for the active conversation
    useEffect(() => {
        if (!activeChat) return;

        let isMounted = true;
        const loadHistory = async () => {
            try {
                const dbMsgs = await getChatMessages(activeChat.id);
                if (isMounted) {
                    if (dbMsgs && dbMsgs.length > 0) {
                        setLocalMessages(dbMsgs);
                    } else {
                        // Seed initial greetings
                        setLocalMessages([
                            {
                                id: 1,
                                role: 'assistant',
                                content: activeChat.lastMessage || `Neural connection secured, Master. ${activeChat.name} at your command.`,
                                timestamp: Date.now() - 600000
                            }
                        ]);
                    }
                }
            } catch (err) {
                console.warn('Could not read Dexie messages, using local buffer:', err);
                if (isMounted) {
                    setLocalMessages([
                        {
                            id: 1,
                            role: 'assistant',
                            content: activeChat.lastMessage || 'Neural link established.',
                            timestamp: Date.now() - 300000
                        }
                    ]);
                }
            }
        };

        loadHistory();
        return () => { isMounted = false; };
    }, [activeChat]);

    // Auto-scroll message stream
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [localMessages, isTyping]);

    const handleSendMessage = async (e) => {
        e?.preventDefault();
        const text = inputMessage.trim();
        if (!text || !activeChat) return;

        const userMsg = {
            id: Date.now(),
            role: 'user',
            content: text,
            timestamp: Date.now()
        };

        setLocalMessages(prev => [...prev, userMsg]);
        setInputMessage('');

        // Persist to Dexie
        try {
            await saveChatMessage(activeChat.id, 'user', text);
        } catch (err) {
            console.warn('Failed to save to Dexie:', err);
        }

        // Simulate reactive reply
        setIsTyping(true);
        setTimeout(async () => {
            const replies = [
                `*purrs softly* Understood, Master! Synchronizing response matrix for: "${text.slice(0, 24)}..."`,
                `Affirmative. Neural resonance boosted +5 Sparks! What is our next objective?`,
                `*tilts head curiously, eyes glowing faint cyan* You always know the right input sequence, Master~`,
                `Target locked. Subroutine executing immediately.`
            ];
            const botMsg = {
                id: Date.now() + 1,
                role: 'assistant',
                content: replies[Math.floor(Math.random() * replies.length)],
                timestamp: Date.now()
            };
            setLocalMessages(prev => [...prev, botMsg]);
            setIsTyping(false);
            try {
                await saveChatMessage(activeChat.id, 'assistant', botMsg.content);
            } catch (e) {}
        }, 1200);
    };

    // Filter matches based on selected tab
    const filteredMatches = allMatches.filter(m => {
        if (selectedTab === 'favorites') return m.isFavorite;
        if (selectedTab === 'pending') return m.status === 'pending';
        if (selectedTab === 'groups') return m.isGroup;
        return true;
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden' }}>
            {/* Top Cyan HUD Header */}
            <div style={{
                padding: '16px',
                background: 'linear-gradient(180deg, rgba(0, 229, 255, 0.1) 0%, transparent 100%)',
                borderBottom: '1px solid rgba(0, 229, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#00e5ff',
                        boxShadow: '0 0 10px #00e5ff',
                        animation: 'pulse 1.5s infinite'
                    }} />
                    <span style={{
                        color: '#00e5ff',
                        fontSize: '13px',
                        fontWeight: 900,
                        letterSpacing: '0.12em',
                        textShadow: '0 0 8px rgba(0, 229, 255, 0.6)'
                    }}>
                        NEURAL_CHAT // V2.4
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                        fontSize: '9px',
                        color: 'rgba(0, 229, 255, 0.6)',
                        background: 'rgba(0, 229, 255, 0.08)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        border: '1px solid rgba(0, 229, 255, 0.2)'
                    }}>
                        {allMatches.length} NODES
                    </span>
                    {onCloseMobileDrawer && (
                        <button
                            onClick={onCloseMobileDrawer}
                            style={{
                                background: 'transparent',
                                border: '1px solid rgba(0, 229, 255, 0.3)',
                                color: '#00e5ff',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontWeight: 'bold'
                            }}
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Conversation Active Mode vs Match List */}
            {activeChat ? (
                /* --- ACTIVE CHAT CONVERSATION VIEW --- */
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    {/* Active Match Sub-Header */}
                    <div style={{
                        padding: '12px 16px',
                        background: 'rgba(5, 3, 8, 0.6)',
                        borderBottom: '1px solid rgba(0, 229, 255, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexShrink: 0
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <button
                                onClick={() => { setActiveChat(null); if (onSelectChat) onSelectChat(null); }}
                                style={{
                                    background: 'rgba(0, 229, 255, 0.1)',
                                    border: '1px solid rgba(0, 229, 255, 0.3)',
                                    color: '#00e5ff',
                                    borderRadius: '4px',
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                    fontWeight: 'bold'
                                }}
                                title="Back to Inbox"
                            >
                                &lt; INBOX
                            </button>
                            <img
                                src={activeChat.imageUrl}
                                alt={activeChat.name}
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: '1px solid #00e5ff'
                                }}
                            />
                            <div>
                                <div style={{ fontSize: '12px', fontWeight: 800, color: '#fff' }}>{activeChat.name}</div>
                                <div style={{ fontSize: '9px', color: '#00ff9d', letterSpacing: '0.05em' }}>
                                    ● {activeChat.syncStatus || 'ONLINE'} ({activeChat.syncLevel || 85}%)
                                </div>
                            </div>
                        </div>

                        <div style={{
                            fontSize: '9px',
                            color: 'rgba(255, 255, 255, 0.4)',
                            border: '1px dashed rgba(0, 229, 255, 0.3)',
                            padding: '3px 6px',
                            borderRadius: '3px'
                        }}>
                            {activeChat.archetype}
                        </div>
                    </div>

                    {/* Messages Scroll Area */}
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}>
                        {localMessages.map((msg, idx) => {
                            const isUser = msg.role === 'user';
                            return (
                                <div
                                    key={idx}
                                    style={{
                                        alignSelf: isUser ? 'flex-end' : 'flex-start',
                                        maxWidth: '85%',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: isUser ? 'flex-end' : 'flex-start'
                                    }}
                                >
                                    <div style={{
                                        fontSize: '8px',
                                        color: isUser ? '#00ff9d' : '#00e5ff',
                                        marginBottom: '3px',
                                        letterSpacing: '0.05em'
                                    }}>
                                        {isUser ? '> OPERATOR' : `> ${activeChat.name.toUpperCase()}`}
                                    </div>
                                    <div style={{
                                        padding: '10px 14px',
                                        borderRadius: isUser ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                                        background: isUser ? 'rgba(0, 255, 157, 0.12)' : 'rgba(0, 229, 255, 0.08)',
                                        border: isUser ? '1px solid rgba(0, 255, 157, 0.35)' : '1px solid rgba(0, 229, 255, 0.25)',
                                        color: '#fff',
                                        fontSize: '12px',
                                        lineHeight: 1.5,
                                        boxShadow: isUser ? '0 0 12px rgba(0, 255, 157, 0.1)' : '0 0 12px rgba(0, 229, 255, 0.08)'
                                    }}>
                                        {msg.content}
                                    </div>
                                </div>
                            );
                        })}

                        {isTyping && (
                            <div style={{
                                alignSelf: 'flex-start',
                                padding: '8px 12px',
                                borderRadius: '10px',
                                background: 'rgba(0, 229, 255, 0.05)',
                                border: '1px solid rgba(0, 229, 255, 0.2)',
                                color: '#00e5ff',
                                fontSize: '11px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}>
                                <span style={{ animation: 'pulse 1s infinite' }}>🐾</span>
                                <span>{activeChat.name} is formulating response...</span>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Chat Input Console */}
                    <form
                        onSubmit={handleSendMessage}
                        style={{
                            padding: '12px 16px',
                            background: 'rgba(5, 3, 8, 0.9)',
                            borderTop: '1px solid rgba(0, 229, 255, 0.2)',
                            display: 'flex',
                            gap: '8px',
                            alignItems: 'center',
                            flexShrink: 0
                        }}
                    >
                        <input
                            type="text"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            placeholder={`Message ${activeChat.name}...`}
                            style={{
                                flex: 1,
                                background: 'rgba(0, 229, 255, 0.04)',
                                border: '1px solid rgba(0, 229, 255, 0.25)',
                                borderRadius: '6px',
                                padding: '10px 14px',
                                color: '#fff',
                                fontFamily: 'inherit',
                                fontSize: '12px',
                                outline: 'none',
                                transition: 'border-color 0.2s'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#00e5ff'}
                            onBlur={(e) => e.target.style.borderColor = 'rgba(0, 229, 255, 0.25)'}
                        />
                        <button
                            type="submit"
                            disabled={!inputMessage.trim()}
                            style={{
                                background: inputMessage.trim() ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                border: inputMessage.trim() ? '1px solid #00e5ff' : '1px solid rgba(255, 255, 255, 0.1)',
                                color: inputMessage.trim() ? '#00e5ff' : 'rgba(255, 255, 255, 0.25)',
                                borderRadius: '6px',
                                padding: '10px 16px',
                                fontWeight: 'bold',
                                fontSize: '11px',
                                cursor: inputMessage.trim() ? 'pointer' : 'not-allowed',
                                letterSpacing: '0.08em',
                                transition: 'all 0.2s'
                            }}
                        >
                            SEND &gt;
                        </button>
                    </form>
                </div>
            ) : (
                /* --- MATCH LIST / INBOX DIRECTORY --- */
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    {/* Filter Segment Tabs */}
                    <div style={{
                        padding: '10px 14px',
                        display: 'flex',
                        gap: '6px',
                        background: 'rgba(5, 3, 8, 0.5)',
                        borderBottom: '1px solid rgba(0, 229, 255, 0.1)',
                        overflowX: 'auto',
                        flexShrink: 0
                    }}>
                        {[
                            { id: 'friends', label: 'FRIENDS' },
                            { id: 'favorites', label: '★ STARRED' },
                            { id: 'groups', label: 'GROUPS' },
                            { id: 'pending', label: 'PENDING' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setSelectedTab(tab.id)}
                                style={{
                                    flex: '0 0 auto',
                                    padding: '6px 12px',
                                    fontSize: '10px',
                                    fontFamily: 'inherit',
                                    fontWeight: 'bold',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    background: selectedTab === tab.id ? 'rgba(0, 229, 255, 0.15)' : 'transparent',
                                    color: selectedTab === tab.id ? '#00e5ff' : 'rgba(255, 255, 255, 0.45)',
                                    border: selectedTab === tab.id ? '1px solid rgba(0, 229, 255, 0.4)' : '1px solid transparent',
                                    boxShadow: selectedTab === tab.id ? '0 0 8px rgba(0, 229, 255, 0.2)' : 'none'
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Match List Scroll Container */}
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                    }}>
                        {filteredMatches.length === 0 ? (
                            <div style={{ textAlign: 'center', color: 'rgba(0, 229, 255, 0.5)', padding: '40px 16px', fontSize: '11px' }}>
                                [ NO ACTIVE SIGNALS IN SECTOR ]
                            </div>
                        ) : (
                            filteredMatches.map(match => (
                                <div
                                    key={match.id}
                                    onClick={() => {
                                        setActiveChat(match);
                                        if (onSelectChat) onSelectChat(match.id);
                                    }}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        background: 'rgba(0, 229, 255, 0.03)',
                                        border: '1px solid rgba(0, 229, 255, 0.12)',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        position: 'relative',
                                        overflow: 'hidden'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(0, 229, 255, 0.08)';
                                        e.currentTarget.style.borderColor = 'rgba(0, 229, 255, 0.35)';
                                        e.currentTarget.style.transform = 'translateX(3px)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(0, 229, 255, 0.03)';
                                        e.currentTarget.style.borderColor = 'rgba(0, 229, 255, 0.12)';
                                        e.currentTarget.style.transform = 'translateX(0px)';
                                    }}
                                >
                                    {/* Avatar with status glow */}
                                    <div style={{ position: 'relative', flexShrink: 0 }}>
                                        <img
                                            src={match.imageUrl}
                                            alt={match.name}
                                            style={{
                                                width: '44px',
                                                height: '44px',
                                                borderRadius: '50%',
                                                objectFit: 'cover',
                                                border: match.isFavorite ? '2px solid #ffd700' : '2px solid rgba(0, 229, 255, 0.4)'
                                            }}
                                        />
                                        {match.unread && (
                                            <span style={{
                                                position: 'absolute',
                                                top: 0,
                                                right: 0,
                                                width: '10px',
                                                height: '10px',
                                                borderRadius: '50%',
                                                background: '#00e5ff',
                                                border: '2px solid #050308',
                                                boxShadow: '0 0 6px #00e5ff'
                                            }} />
                                        )}
                                    </div>

                                    {/* Info Block */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                            <span style={{
                                                fontSize: '12px',
                                                fontWeight: 800,
                                                color: match.isFavorite ? '#ffd700' : '#fff',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }}>
                                                {match.name}
                                            </span>
                                            <span style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.35)' }}>
                                                {match.lastMessageTime}
                                            </span>
                                        </div>

                                        <div style={{
                                            fontSize: '11px',
                                            color: 'rgba(255, 255, 255, 0.6)',
                                            whiteSpace: 'nowrap',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            lineHeight: 1.3
                                        }}>
                                            {match.lastMessage}
                                        </div>

                                        <div style={{ display: 'flex', gap: '6px', marginTop: '6px', alignItems: 'center' }}>
                                            <span style={{
                                                fontSize: '8px',
                                                color: '#00ff9d',
                                                background: 'rgba(0, 255, 157, 0.1)',
                                                border: '1px solid rgba(0, 255, 157, 0.25)',
                                                padding: '1px 5px',
                                                borderRadius: '3px'
                                            }}>
                                                {match.syncStatus || 'ONLINE'} {match.syncLevel}%
                                            </span>
                                            <span style={{
                                                fontSize: '8px',
                                                color: 'rgba(0, 229, 255, 0.7)',
                                                letterSpacing: '0.04em'
                                            }}>
                                                [{match.franchise}]
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
