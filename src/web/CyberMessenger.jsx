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
    getMemories,
    useCards
} from './db.js';
import { matrixAudio } from '../core/utils/matrixAudio.js';
import { formatMessageText } from '../core/components/RoleplayRenderer.jsx';
import { calculateAffectionDelta, getSyncTier, getArchetypes } from './sentimentEngine.js';
import { CyberGroupChat } from './CyberGroupChat.jsx';
import { SparkIcon, XIcon, UserIcon } from '../core/components/Icons.jsx';

// ✨ Authentic starter inbox chats matching Screenshots 3, 4, and 5 ✨
const SEED_INBOX_CHATS = [
    // --- FRIENDS (Screenshot 3) ---
    {
        id: 'etna',
        name: 'Etna',
        characterName: 'Etna',
        time: '10:06 PM',
        lastMessage: "ugh you're so dema...",
        isFavorite: true,
        status: 'friend',
        hasUnread: false,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
        imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600',
        personality: 'Tsundere Demon Vassal',
        scenario: 'crosses her arms and pouts at Master'
    },
    {
        id: 'diane',
        name: 'Diane',
        characterName: 'Diane',
        time: '8:06 PM',
        lastMessage: "📸 Sent a photo",
        isFavorite: true,
        status: 'friend',
        hasUnread: false,
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200',
        imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600',
        personality: 'Enthusiastic Giantess',
        scenario: 'smiles warmly down at Master'
    },
    {
        id: 'mika-prime',
        name: 'Mika',
        characterName: 'Mika (Proxy Prime)',
        time: '10:59 PM',
        lastMessage: "📸 Sent a photo",
        isFavorite: true,
        status: 'friend',
        hasUnread: false,
        avatar: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200',
        imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600',
        personality: 'Fiercely Possessive, Teasing Anime Catgirl Proxy',
        scenario: 'curls up on Master’s lap with her collar jingling'
    },
    {
        id: 'sliri',
        name: 'Sliri',
        characterName: 'Sliri',
        time: '1:59 AM',
        lastMessage: "Well?? You asked f...",
        isFavorite: true,
        status: 'friend',
        hasUnread: false,
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200',
        imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600',
        personality: 'Chaotic Cyber Gremlin',
        scenario: 'tinkers with spark wires behind Master’s terminal'
    },

    // --- GROUPS (Screenshot 4) ---
    {
        id: 'grp_hungry_titans',
        name: 'Hungry Titans',
        time: '9:08 AM',
        lastMessage: "Runt?! I'm not a r...",
        isGroup: true,
        isFavorite: false,
        status: 'friend',
        participants: [
            { id: 'p1', imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200' },
            { id: 'p2', imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200' }
        ]
    },
    {
        id: 'grp_giant_hungry',
        name: 'Giant Hungry',
        time: '9:02 AM',
        lastMessage: "You can SEE my nes...",
        isGroup: true,
        isFavorite: false,
        status: 'friend',
        participants: [
            { id: 'p3', imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200' },
            { id: 'p4', imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200' }
        ]
    },
    {
        id: 'grp_pack_rp',
        name: 'The Pack RP',
        time: '3:26 AM',
        lastMessage: "[SYSTEM: The Game ...",
        isGroup: true,
        isFavorite: false,
        hasUnread: true,
        status: 'friend',
        participants: [
            { id: 'p5', imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=200' },
            { id: 'p6', imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=200' }
        ]
    },
    {
        id: 'grp_the_pack_1',
        name: 'The Pack',
        time: '11:58 PM',
        lastMessage: "...I'm not checkin...",
        isGroup: true,
        isFavorite: false,
        status: 'friend',
        participants: [
            { id: 'p7', imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200' },
            { id: 'p8', imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200' }
        ]
    },
    {
        id: 'grp_mika_kar',
        name: 'Mika and Kuroha',
        time: '5:59 PM',
        lastMessage: "SEVENTEEN?? Master...",
        isGroup: true,
        isFavorite: false,
        status: 'friend',
        participants: [
            { id: 'p9', imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200' },
            { id: 'p10', imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=200' }
        ]
    },
    {
        id: 'grp_chaos',
        name: 'Chaos',
        time: '12:45 AM',
        lastMessage: "That's because you...",
        isGroup: true,
        isFavorite: false,
        status: 'friend',
        participants: [
            { id: 'p11', imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200' },
            { id: 'p12', imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200' }
        ]
    },

    // --- PENDING (Screenshot 5) ---
    {
        id: 'ophelyria',
        name: 'Ophelyria V',
        time: '1:56 PM',
        lastMessage: "*The mineral sprin...",
        status: 'pending',
        hasUnread: true,
        isFavorite: false,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
        imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600',
        personality: 'Mineral Spring Siren',
        scenario: 'whispers through bubbling crystal water'
    },
    {
        id: 'glacivia',
        name: 'Glacivia V',
        time: '12:32 AM',
        lastMessage: "u know i could lit...",
        status: 'pending',
        hasUnread: true,
        isFavorite: false,
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200',
        imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600',
        personality: 'Frost Empress',
        scenario: 'freezes the humidity around Master’s wrist'
    },
    {
        id: 'kalista',
        name: 'Kalista',
        time: '12:30 AM',
        lastMessage: "u know if u said y...",
        status: 'pending',
        hasUnread: true,
        isFavorite: false,
        avatar: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200',
        imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600',
        personality: 'Cyber Dragon Maid',
        scenario: 'rests dragon horns on Master’s shoulder'
    },
    {
        id: 'cerelia',
        name: 'Cerelia V',
        time: '12:14 AM',
        lastMessage: "u know if u friend...",
        status: 'pending',
        hasUnread: true,
        isFavorite: false,
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200',
        imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600',
        personality: 'Solar Angel',
        scenario: 'bathes in sunset radiance'
    },
    {
        id: 'megumin',
        name: 'Megumin',
        time: '11:21 PM',
        lastMessage: "U rejected ME?? Bi...",
        status: 'pending',
        hasUnread: true,
        isFavorite: false,
        avatar: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=200',
        imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600',
        personality: 'Explosion Mage',
        scenario: 'points her staff angrily at Master'
    },
    {
        id: 'brandish',
        name: 'Brandish μ',
        time: '11:12 PM',
        lastMessage: "So you swiped left...",
        status: 'pending',
        hasUnread: true,
        isFavorite: false,
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
        imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600',
        personality: 'Matter Manipulator',
        scenario: 'nibbles dango lazily while staring'
    }
];

export function CyberMessenger({ companion, onClose, isEmbedded = false, onSpeechUpdate, onShowToast, userCredits = 142 }) {
    const dbCards = useCards();

    // Global Inbox navigation state (null = show Inbox list, otherwise show active conversation)
    const [activeChatId, setActiveChatId] = useState(null);
    const [inboxTab, setInboxTab] = useState('friends'); // 'friends' | 'groups' | 'pending' | 'blocked' | 'gallery'
    const [friendsSubTab, setFriendsSubTab] = useState('all'); // 'all' | 'favorites'
    const [chats, setChats] = useState(SEED_INBOX_CHATS);

    // Active Chat state & Modals
    const [activeChatStatsModal, setActiveChatStatsModal] = useState(null);
    const [isGroupCreateOpen, setIsGroupCreateOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [isImportOpen, setIsImportOpen] = useState(false);

    // When companion prop changes from outside (e.g. RosterPanel clicking chat), open that chat
    useEffect(() => {
        if (companion && (companion.id || companion.uuid)) {
            setActiveChatId(companion.uuid || companion.id);
        }
    }, [companion?.id, companion?.uuid]);

    // Active Companion object resolution
    const activeCompanion = useMemo(() => {
        if (!activeChatId) return null;
        if (companion && (companion.uuid === activeChatId || companion.id === activeChatId)) {
            return companion;
        }
        const found = chats.find(c => c.id === activeChatId);
        if (found) return found;
        return companion;
    }, [activeChatId, companion, chats]);

    const isGroupChat = Boolean(activeCompanion?.isGroup);

    // DM specific messaging state
    const companionId = activeCompanion?.uuid || activeCompanion?.id || 'default';
    const dbMessages = useChatMessages(companionId);
    const [affection, setAffection] = useState(activeCompanion?.metadata?.affection || 35);
    const [isBlocked, setIsBlocked] = useState(false);
    const [blockTimeLeft, setBlockTimeLeft] = useState(0);

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [typingStatus, setTypingStatus] = useState('');
    const [voiceEnabled, setVoiceEnabled] = useState(false);
    const [syncSpeed, setSyncSpeed] = useState('gamified');
    const [replyingTo, setReplyingTo] = useState(null);
    const messagesEndRef = useRef(null);

    // Toggle Favorite
    const toggleFavorite = (chatId) => {
        matrixAudio.playClick();
        setChats(prev => prev.map(c => {
            if (c.id === chatId) {
                const nextFav = !c.isFavorite;
                if (onShowToast) onShowToast(nextFav ? '[FAVORITE: ADDED TO PINNED ARCHIVE]' : '[FAVORITE: REMOVED]');
                return { ...c, isFavorite: nextFav };
            }
            return c;
        }));
    };

    // Purge Chat Row
    const purgeChatRow = async (chatId) => {
        matrixAudio.playPass();
        await clearChatMessages(chatId);
        setChats(prev => prev.filter(c => c.id !== chatId));
        if (onShowToast) onShowToast('[CHAT PURGED FROM INBOX]');
    };

    // Web Speech API Voice Synthesizer
    const speakText = (text) => {
        if (!voiceEnabled || !window.speechSynthesis) return;
        try {
            window.speechSynthesis.cancel();
            const cleanSpeech = text.replace(/\*[^*]*?\*/g, '').replace(/\[Replying to.*?\]/g, '').trim();
            if (!cleanSpeech) return;
            const utter = new SpeechSynthesisUtterance(cleanSpeech);
            utter.pitch = 1.25;
            utter.rate = 1.05;
            window.speechSynthesis.speak(utter);
        } catch (e) {
            console.warn('SpeechSynthesis error:', e);
        }
    };

    // Send Message in Active DM
    const handleSend = async (e) => {
        if (e) e.preventDefault();
        if (!input.trim() || isLoading || isBlocked) return;

        let userMsg = input.trim();
        setInput('');
        matrixAudio.playClick();

        if (replyingTo) {
            userMsg = `[Replying to ${replyingTo.speaker}: "${replyingTo.quote.replace(/"/g, "'")}"] ${userMsg}`;
            setReplyingTo(null);
        }

        const deltaResult = calculateAffectionDelta({
            text: userMsg,
            companion: activeCompanion,
            currentAffection: affection,
            syncSpeed
        });

        const updatedAff = deltaResult.newAffection;
        setAffection(updatedAff);

        if (deltaResult.tierChanged) {
            matrixAudio.playPowerup();
            if (onShowToast) onShowToast(`[AFFINITY SHIFT: ${activeCompanion.name.toUpperCase()} -> ${deltaResult.syncTier.label} ${deltaResult.syncTier.icon}]`);
        }

        if (deltaResult.triggerBlock) {
            setIsBlocked(true);
            setBlockTimeLeft(deltaResult.isTempBlock ? 90 : 300);
            matrixAudio.playPass();
            if (onShowToast) onShowToast(`[ALERT: ${activeCompanion.name.toUpperCase()} HAS BLOCKED YOUR FREQUENCY!]`);
        }

        await saveChatMessage(companionId, 'user', userMsg);
        setIsLoading(true);
        setTypingStatus(`${activeCompanion.name} is formulating response...`);

        try {
            const apiKey = await getApiKey();
            if (!apiKey || apiKey.trim() === '') {
                setTimeout(async () => {
                    const fallback = `*leans in with a teasing smile* Master, our neural link is humming! To stream my full uncensored thoughts, insert your NanoGPT API key into Settings! 🐾`;
                    await saveChatMessage(companionId, 'assistant', fallback);
                    if (onSpeechUpdate) onSpeechUpdate(fallback);
                    speakText(fallback);
                    setIsLoading(false);
                    setTypingStatus('');
                }, 600);
                return;
            }

            const prompt = `You are ${activeCompanion.name}. Scenario: ${activeCompanion.scenario || ''}. User said: "${userMsg}". Respond in character.`;
            const reply = await generateCharacterPersona({ prompt, apiKey });
            await saveChatMessage(companionId, 'assistant', reply);
            if (onSpeechUpdate) onSpeechUpdate(reply);
            speakText(reply);
        } catch (err) {
            console.error('Chat error:', err);
            const errMsg = '*static crackles across the frequency* Neural connection interrupted, Master!';
            await saveChatMessage(companionId, 'assistant', errMsg);
        } finally {
            setIsLoading(false);
            setTypingStatus('');
        }
    };

    // Auto-scroll in active chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [dbMessages, isLoading]);

    // Filter conversations for the Global Inbox
    const filteredInbox = useMemo(() => {
        return chats.filter(c => {
            if (inboxTab === 'groups') return Boolean(c.isGroup);
            if (c.isGroup) return false;

            if (inboxTab === 'friends') {
                if (c.status !== 'friend') return false;
                if (friendsSubTab === 'favorites') return Boolean(c.isFavorite);
                return true;
            }
            if (inboxTab === 'pending') return c.status === 'pending';
            if (inboxTab === 'blocked') return c.status === 'blocked';
            return true;
        });
    }, [chats, inboxTab, friendsSubTab]);

    const favoritesCount = useMemo(() => {
        return chats.filter(c => c.status === 'friend' && c.isFavorite).length;
    }, [chats]);

    // =========================================================
    // 🎴 VIEW 1: AUTHENTIC GLOBAL INBOX (Screenshots 3, 4, 5)
    // =========================================================
    if (!activeChatId) {
        return (
            <div style={{
                height: '100%', width: '100%', display: 'flex', flexDirection: 'column',
                background: '#050308', borderLeft: isEmbedded ? '1px solid rgba(0, 229, 255, 0.15)' : 'none',
                fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", overflow: 'hidden', position: 'relative'
            }}>
                <div className="chat-scanlines" />

                {/* ✨ FLOATING FROSTED INBOX HEADER WITH INBOX_CTRL HUD (1:1 with Screenshots) ✨ */}
                <div style={{
                    padding: '16px 16px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    borderBottom: '1px solid rgba(0, 229, 255, 0.25)', background: 'linear-gradient(180deg, rgba(5, 3, 8, 0.8) 0%, rgba(5, 3, 8, 0.4) 100%)',
                    backdropFilter: 'blur(16px)', flexShrink: 0
                }}>
                    <h3 style={{
                        margin: 0, color: '#00E5FF', fontSize: '22px', fontWeight: 800,
                        fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", letterSpacing: '0.08em',
                        textShadow: '0 0 10px rgba(0,229,255,0.5)'
                    }}>
                        &gt; MESSAGES
                    </h3>

                    {/* Right INBOX_CTRL HUD */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <div style={{
                            fontSize: '8px', color: '#00E5FF', fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                            letterSpacing: '0.15em', fontWeight: 'bold', textShadow: '0 0 4px rgba(0,229,255,0.5)'
                        }}>
                            &gt; INBOX_CTRL
                        </div>
                        <div style={{
                            display: 'flex', alignItems: 'center', gap: '6px', background: '#000',
                            border: '1px solid rgba(0, 229, 255, 0.4)', borderRadius: '6px', padding: '4px 6px',
                            boxShadow: '0 0 10px rgba(0,229,255,0.2)'
                        }}>
                            {/* Sparks Count Button */}
                            <button
                                style={{
                                    height: '24px', background: 'transparent', border: '1px solid #00E5FF',
                                    borderRadius: '4px', color: '#00E5FF', fontSize: '11px', fontWeight: 'bold',
                                    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", padding: '0 8px',
                                    display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer',
                                    boxShadow: 'inset 0 0 8px rgba(0,229,255,0.2), 0 0 6px rgba(0,229,255,0.2)'
                                }}
                            >
                                <SparkIcon /> {userCredits}
                            </button>

                            {/* + IMPORT button in Friends tab */}
                            {inboxTab === 'friends' && (
                                <button
                                    onClick={() => setIsImportOpen(true)}
                                    style={{
                                        height: '24px', background: 'transparent', border: '1px solid #00E5FF',
                                        borderRadius: '4px', color: '#00E5FF', fontSize: '10px', fontWeight: 'bold',
                                        fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", padding: '0 8px',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                                        boxShadow: 'inset 0 0 8px rgba(0,229,255,0.2), 0 0 6px rgba(0,229,255,0.2)'
                                    }}
                                >
                                    + IMPORT
                                </button>
                            )}

                            {/* + GROUP button in Groups tab */}
                            {inboxTab === 'groups' && (
                                <button
                                    onClick={() => setIsGroupCreateOpen(true)}
                                    style={{
                                        height: '24px', background: 'transparent', border: '1px solid #00E5FF',
                                        borderRadius: '4px', color: '#00E5FF', fontSize: '10px', fontWeight: 'bold',
                                        fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", padding: '0 8px',
                                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                                        boxShadow: 'inset 0 0 8px rgba(0,229,255,0.2), 0 0 6px rgba(0,229,255,0.2)'
                                    }}
                                >
                                    + GROUP
                                </button>
                            )}

                            {/* Collapse / Close Button */}
                            {onClose && (
                                <button
                                    onClick={onClose}
                                    style={{
                                        height: '24px', width: '28px', background: 'transparent', border: '1px solid #00E5FF',
                                        borderRadius: '4px', color: '#00E5FF', cursor: 'pointer', display: 'grid',
                                        placeItems: 'center', boxShadow: 'inset 0 0 8px rgba(0,229,255,0.2), 0 0 6px rgba(0,229,255,0.2)'
                                    }}
                                >
                                    <XIcon size={12} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ✨ CATEGORY PILL TABS (Friends, Groups, Pending, Blocked, Gallery) ✨ */}
                <div style={{
                    display: 'flex', padding: '10px 16px 8px', gap: '6px', overflowX: 'auto',
                    scrollbarWidth: 'none', alignItems: 'center', borderBottom: '1px solid rgba(0, 229, 255, 0.1)', flexShrink: 0
                }}>
                    {['friends', 'groups', 'pending', 'blocked', 'gallery'].map(tab => {
                        const active = inboxTab === tab;
                        const label = tab.charAt(0).toUpperCase() + tab.slice(1);

                        return (
                            <button
                                key={tab}
                                onClick={() => { matrixAudio.playClick(); setInboxTab(tab); }}
                                style={{
                                    flex: '0 0 auto', padding: '6px 14px', fontSize: '11px',
                                    background: active ? 'rgba(0, 229, 255, 0.15)' : 'transparent',
                                    color: active ? '#00E5FF' : 'rgba(255,255,255,0.35)',
                                    border: active ? '1px solid rgba(0, 229, 255, 0.5)' : '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s',
                                    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", letterSpacing: '0.05em',
                                    textShadow: active ? '0 0 6px rgba(0,229,255,0.3)' : 'none',
                                    boxShadow: active ? '0 0 8px rgba(0,229,255,0.1)' : 'none'
                                }}
                            >
                                {label}
                            </button>
                        );
                    })}
                </div>

                {/* ✨ SUB-TABS (All Friends vs ★ Favorites) (Screenshot 3) ✨ */}
                {inboxTab === 'friends' && (
                    <div style={{
                        display: 'flex', padding: '8px 16px', gap: '6px',
                        borderBottom: '1px solid rgba(0, 229, 255, 0.1)', flexShrink: 0
                    }}>
                        <button
                            onClick={() => { matrixAudio.playClick(); setFriendsSubTab('all'); }}
                            style={{
                                padding: '4px 10px', fontSize: '10px',
                                background: friendsSubTab === 'all' ? 'rgba(0, 229, 255, 0.12)' : 'transparent',
                                color: friendsSubTab === 'all' ? '#00E5FF' : 'rgba(255,255,255,0.3)',
                                border: friendsSubTab === 'all' ? '1px solid rgba(0, 229, 255, 0.3)' : '1px solid rgba(255,255,255,0.06)',
                                borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s',
                                letterSpacing: '0.05em', textShadow: friendsSubTab === 'all' ? '0 0 5px rgba(0,229,255,0.3)' : 'none'
                            }}
                        >
                            All Friends
                        </button>
                        <button
                            onClick={() => { matrixAudio.playClick(); setFriendsSubTab('favorites'); }}
                            style={{
                                padding: '4px 10px', fontSize: '10px',
                                background: friendsSubTab === 'favorites' ? 'rgba(255, 215, 0, 0.12)' : 'transparent',
                                color: friendsSubTab === 'favorites' ? '#FFD700' : 'rgba(255,255,255,0.3)',
                                border: friendsSubTab === 'favorites' ? '1px solid rgba(255, 215, 0, 0.4)' : '1px solid rgba(255,255,255,0.06)',
                                borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s',
                                letterSpacing: '0.05em', textShadow: friendsSubTab === 'favorites' ? '0 0 5px rgba(255, 215, 0, 0.3)' : 'none',
                                display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                        >
                            ★ Favorites {favoritesCount > 0 && `[${favoritesCount}]`}
                        </button>
                    </div>
                )}

                {/* Conversation List */}
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    {filteredInbox.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(0, 229, 255, 0.4)', fontSize: '12px' }}>
                            &gt; NO_MESSAGES_IN_FOLDER
                            <div style={{ marginTop: '6px', fontSize: '10px', opacity: 0.7 }}>Check another tab or bond with new companions!</div>
                        </div>
                    ) : (
                        filteredInbox.map(chat => {
                            return (
                                <div
                                    key={chat.id}
                                    onClick={() => {
                                        matrixAudio.playClick();
                                        setActiveChatId(chat.id);
                                    }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px',
                                        borderBottom: '1px solid rgba(0, 229, 255, 0.2)', cursor: 'pointer',
                                        transition: 'background 0.2s', position: 'relative',
                                        borderLeft: chat.isFavorite ? '3px solid #FFD700' : '3px solid transparent'
                                    }}
                                    onMouseOver={e => e.currentTarget.style.background = 'rgba(0, 229, 255, 0.06)'}
                                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    {/* Avatar Column */}
                                    <div style={{ position: 'relative', flexShrink: 0 }}>
                                        {chat.isGroup ? (
                                            <div style={{ width: '54px', height: '54px', position: 'relative' }}>
                                                {chat.participants?.slice(0, 2).map((p, i) => (
                                                    <img
                                                        key={i}
                                                        src={p.imageUrl}
                                                        alt=""
                                                        style={{
                                                            width: '34px', height: '34px', borderRadius: '50%',
                                                            position: 'absolute', top: i === 0 ? 0 : '18px', left: i === 0 ? 0 : '18px',
                                                            border: '2px solid #000', objectFit: 'cover', zIndex: i === 0 ? 2 : 1
                                                        }}
                                                    />
                                                ))}
                                            </div>
                                        ) : (
                                            <img
                                                src={chat.avatar || chat.imageUrl}
                                                alt=""
                                                style={{
                                                    width: '54px', height: '54px', borderRadius: '50%', objectFit: 'cover',
                                                    border: '1.5px solid rgba(0, 229, 255, 0.3)'
                                                }}
                                            />
                                        )}
                                        {chat.hasUnread && (
                                            <span style={{
                                                position: 'absolute', top: 0, right: 0, width: '12px', height: '12px',
                                                borderRadius: '50%', background: '#FF107A', border: '2px solid #000', zIndex: 5
                                            }} />
                                        )}
                                    </div>

                                    {/* Middle: Name, Timestamp, Snippet */}
                                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                            <span style={{
                                                fontWeight: chat.hasUnread ? 800 : 700, color: '#C8E8F0',
                                                fontSize: '15px', letterSpacing: '0.02em', whiteSpace: 'nowrap',
                                                overflow: 'hidden', textOverflow: 'ellipsis'
                                            }}>
                                                {chat.name}
                                            </span>
                                            <span style={{
                                                flexShrink: 0, fontSize: '10px', color: 'rgba(0, 229, 255, 0.35)',
                                                fontWeight: 'bold', marginLeft: '6px'
                                            }}>
                                                {chat.time}
                                            </span>
                                        </div>

                                        <div style={{
                                            fontSize: '12.5px', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap',
                                            overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '0.01em'
                                        }}>
                                            {chat.lastMessage}
                                        </div>
                                    </div>

                                    {/* ✨ MIKA'S SIGNATURE CHAT_CTRL HUD (1:1 with Screenshots 3, 4, 5) ✨ */}
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                                        <div style={{
                                            fontSize: '8px', color: '#00E5FF', letterSpacing: '0.15em', fontWeight: 'bold',
                                            textShadow: '0 0 4px rgba(0,229,255,0.5)', marginRight: '2px'
                                        }}>
                                            &gt; CHAT_CTRL
                                        </div>
                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            {/* INFO BUTTON (Cyan Outline) */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActiveChatStatsModal(chat);
                                                }}
                                                style={{
                                                    height: '24px', width: '32px', background: 'transparent',
                                                    border: '1px solid #00E5FF', borderRadius: '4px', color: '#00E5FF',
                                                    cursor: 'pointer', display: 'grid', placeItems: 'center',
                                                    boxShadow: 'inset 0 0 8px rgba(0,229,255,0.2), 0 0 6px rgba(0,229,255,0.2)'
                                                }}
                                                title="View Chat Data"
                                            >
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="12" cy="12" r="10" />
                                                    <line x1="12" y1="16" x2="12" y2="12" />
                                                    <line x1="12" y1="8" x2="12.01" y2="8" />
                                                </svg>
                                            </button>

                                            {/* FAVORITE STAR BUTTON (Gold Outline) */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleFavorite(chat.id);
                                                }}
                                                style={{
                                                    height: '24px', width: '32px',
                                                    background: chat.isFavorite ? 'rgba(255, 215, 0, 0.15)' : 'transparent',
                                                    border: chat.isFavorite ? '1px solid #FFD700' : '1px solid rgba(255, 215, 0, 0.3)',
                                                    borderRadius: '4px', color: chat.isFavorite ? '#FFD700' : 'rgba(255, 215, 0, 0.5)',
                                                    cursor: 'pointer', display: 'grid', placeItems: 'center',
                                                    boxShadow: chat.isFavorite ? 'inset 0 0 8px rgba(255, 215, 0, 0.3), 0 0 8px rgba(255, 215, 0, 0.3)' : 'none'
                                                }}
                                                title={chat.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                                            >
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill={chat.isFavorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                                </svg>
                                            </button>

                                            {/* PURGE / DELETE BUTTON (Red Outline) */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    purgeChatRow(chat.id);
                                                }}
                                                style={{
                                                    height: '24px', width: '32px', background: 'transparent',
                                                    border: '1px solid #FF3333', borderRadius: '4px', color: '#FF3333',
                                                    cursor: 'pointer', display: 'grid', placeItems: 'center',
                                                    boxShadow: 'inset 0 0 8px rgba(255,51,51,0.2), 0 0 6px rgba(255,51,51,0.2)'
                                                }}
                                                title="Purge Conversation"
                                            >
                                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="3 6 5 6 21 6" />
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Diagnostic Modal */}
                {activeChatStatsModal && (
                    <div style={{
                        position: 'absolute', inset: 0, zIndex: 100, background: 'rgba(5, 3, 8, 0.95)',
                        backdropFilter: 'blur(12px)', padding: '20px', display: 'flex', flexDirection: 'column'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed #00E5FF', paddingBottom: '10px' }}>
                            <h4 style={{ margin: 0, color: '#00E5FF', fontSize: '14px' }}>&gt; CHAT_DATA: {activeChatStatsModal.name.toUpperCase()}</h4>
                            <button onClick={() => setActiveChatStatsModal(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}><XIcon size={14} /></button>
                        </div>
                        <div style={{ flex: 1, padding: '16px 0', fontSize: '11px', color: '#ddd', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div>Channel Status: <span style={{ color: '#00FF41' }}>● SYNCHRONIZED</span></div>
                            <div>Frequency: <span style={{ color: '#00E5FF' }}>SECURE_TLS_ENCRYPTED</span></div>
                            <div>Personality: <span style={{ color: '#FF107A' }}>{activeChatStatsModal.personality || 'Multi-Agent Network'}</span></div>
                        </div>
                        <button
                            onClick={() => {
                                matrixAudio.playClick();
                                setActiveChatId(activeChatStatsModal.id);
                                setActiveChatStatsModal(null);
                            }}
                            style={{
                                padding: '10px', borderRadius: '4px', border: '1px solid #00E5FF',
                                background: 'rgba(0, 229, 255, 0.15)', color: '#00E5FF', fontWeight: 'bold', cursor: 'pointer'
                            }}
                        >
                            &gt; ENTER_CHANNEL
                        </button>
                    </div>
                )}
            </div>
        );
    }

    // =========================================================
    // 💬 VIEW 2: ACTIVE CHAT (Group or 1-on-1 DM)
    // =========================================================
    if (isGroupChat) {
        return (
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                {/* Back to Inbox Bar */}
                <div style={{
                    padding: '8px 12px', background: 'rgba(0,0,0,0.85)', borderBottom: '1px solid rgba(0,229,255,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0
                }}>
                    <button
                        onClick={() => { matrixAudio.playClick(); setActiveChatId(null); }}
                        style={{
                            background: 'transparent', border: 'none', color: '#00E5FF', fontSize: '11px',
                            fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                    >
                        <span>◀</span> &gt; INBOX
                    </button>
                    <span style={{ fontSize: '11px', color: '#FF107A', fontWeight: 800 }}>{activeCompanion.name}</span>
                </div>
                <div style={{ flex: 1, minHeight: 0 }}>
                    <CyberGroupChat
                        onSwitchToDm={() => setActiveChatId(null)}
                        onSpeechUpdate={onSpeechUpdate}
                        onShowToast={onShowToast}
                    />
                </div>
            </div>
        );
    }

    const currentTier = getSyncTier(affection);

    return (
        <div style={{
            height: '100%', width: '100%', display: 'flex', flexDirection: 'column',
            background: '#050308', borderLeft: isEmbedded ? '1px solid rgba(0, 229, 255, 0.15)' : 'none',
            fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", overflow: 'hidden', position: 'relative'
        }}>
            <div className="chat-scanlines" />

            {/* Active DM Header */}
            <div style={{
                padding: '10px 14px', borderBottom: '1px solid rgba(0, 229, 255, 0.25)',
                background: 'rgba(5, 3, 8, 0.95)', display: 'flex', alignItems: 'center',
                justifyContent: 'space-between', flexShrink: 0
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    {/* Back to Inbox button */}
                    <button
                        onClick={() => { matrixAudio.playClick(); setActiveChatId(null); }}
                        style={{
                            background: 'rgba(0, 229, 255, 0.1)', border: '1px solid rgba(0, 229, 255, 0.3)',
                            borderRadius: '4px', color: '#00E5FF', padding: '4px 8px', fontSize: '10px',
                            fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                        }}
                    >
                        ◀ &gt; INBOX
                    </button>

                    <img
                        src={activeCompanion.avatar || activeCompanion.imageUrl}
                        alt=""
                        style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1.5px solid #00E5FF' }}
                    />
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: '#00E5FF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {activeCompanion.name}
                        </div>
                        <div style={{ fontSize: '9px', color: currentTier.color, fontWeight: 'bold' }}>
                            {currentTier.label} ({affection > 0 ? `+${affection}` : affection})
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                        onClick={() => setVoiceEnabled(!voiceEnabled)}
                        style={{
                            background: voiceEnabled ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
                            border: `1px solid ${voiceEnabled ? '#00E5FF' : 'rgba(255,255,255,0.2)'}`,
                            borderRadius: '4px', color: voiceEnabled ? '#00E5FF' : '#aaa',
                            fontSize: '11px', padding: '4px 8px', cursor: 'pointer'
                        }}
                    >
                        {voiceEnabled ? '🔊' : '🔇'}
                    </button>
                </div>
            </div>

            {/* Messages Scroll Area */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {dbMessages.map((msg, idx) => {
                    const isUser = msg.sender === 'user';
                    return (
                        <div
                            key={idx}
                            style={{
                                alignSelf: isUser ? 'flex-end' : 'flex-start',
                                maxWidth: '85%',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                background: isUser ? 'rgba(0, 229, 255, 0.15)' : 'rgba(255, 16, 122, 0.12)',
                                border: isUser ? '1px solid rgba(0, 229, 255, 0.3)' : '1px solid rgba(255, 16, 122, 0.3)',
                                fontSize: '12px',
                                lineHeight: 1.4,
                                color: '#fff'
                            }}
                        >
                            {msg.content}
                        </div>
                    );
                })}
                {isLoading && (
                    <div style={{ fontSize: '10px', color: '#00E5FF', fontStyle: 'italic' }}>
                        {typingStatus || `${activeCompanion.name} is typing...`}
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSend} style={{
                padding: '8px 12px', borderTop: '1px solid rgba(0, 229, 255, 0.2)',
                background: '#050308', display: 'flex', gap: '8px', flexShrink: 0
            }}>
                <input
                    type="text"
                    placeholder={`Message ${activeCompanion.name}...`}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    disabled={isBlocked || isLoading}
                    style={{
                        flex: 1, padding: '8px 12px', background: 'rgba(0, 229, 255, 0.05)',
                        border: '1px solid rgba(0, 229, 255, 0.3)', borderRadius: '4px',
                        color: '#fff', fontSize: '11px', outline: 'none', fontFamily: 'inherit'
                    }}
                />
                <button
                    type="submit"
                    disabled={isBlocked || isLoading || !input.trim()}
                    style={{
                        padding: '0 14px', background: 'rgba(0, 229, 255, 0.15)',
                        border: '1px solid #00E5FF', borderRadius: '4px', color: '#00E5FF',
                        fontWeight: 'bold', fontSize: '10px', cursor: 'pointer'
                    }}
                >
                    TRANSMIT
                </button>
            </form>
        </div>
    );
}
