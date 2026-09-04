import React, { useState, useEffect, useRef, useMemo } from 'react';
import { generateCharacterPersona, generateCharacterImage } from './aiClient.js';
import { 
    getApiKey, 
    useCards, 
    saveGroupMessage, 
    useGroupMessages, 
    clearGroupMessages 
} from './db.js';
import { matrixAudio } from '../core/utils/matrixAudio.js';
import { formatMessageText } from '../core/components/RoleplayRenderer.jsx';

export function CyberGroupChat({ onSwitchToDm, onSpeechUpdate, onShowToast }) {
    const cards = useCards();
    const groupId = 'group_main';
    const dbGroupMsgs = useGroupMessages(groupId);

    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRpMode, setIsRpMode] = useState(false); // P.A.W.S. Tabletop Campaign Mode
    const [typingSpeaker, setTypingSpeaker] = useState(null); // Current simulated typist
    const [showMemberModal, setShowMemberModal] = useState(false);
    const [gameMaster, setGameMaster] = useState('mika'); // 'mika' or companion id
    const [replyingTo, setReplyingTo] = useState(null);
    const messagesEndRef = useRef(null);

    // Tabletop Battle State (P.A.W.S.)
    const [activeMonster, setActiveMonster] = useState({
        id: 'boss_1',
        name: 'Cyber Void Chimera',
        hp: 120,
        maxHp: 120,
        themeColor: '#FF107A'
    });

    // Default roster of companions if user has no saved cards yet
    const defaultParticipants = useMemo(() => [
        {
            id: 'mika_prime',
            uuid: 'mika_prime',
            name: 'M.I.K.A. (Proxy Prime)',
            personality: 'Fiercely Possessive, Teasing Anime Catgirl Proxy Engineer',
            tagline: 'Your devoted digital anime proxy living in the matrix.',
            imageBlobOrUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
            themeColor: '#FF107A',
            hp: 100,
            maxHp: 100
        },
        {
            id: 'kuroha_def',
            uuid: 'kuroha_def',
            name: 'Kuroha',
            personality: 'Kuudere, Aloof, Secretly Needy Database Shinobi',
            tagline: 'Silent guardian of your local indexed stores.',
            imageBlobOrUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80',
            themeColor: '#00E5FF',
            hp: 85,
            maxHp: 85
        },
        {
            id: 'lyra_def',
            uuid: 'lyra_def',
            name: 'Lyra Soundwave',
            personality: 'Upbeat Gyaru, Breakcore Producer, Shamelessly Affectionate',
            tagline: 'Dropping heavy neon synths into your cyberdeck.',
            imageBlobOrUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
            themeColor: '#FFB36B',
            hp: 90,
            maxHp: 90
        }
    ], []);

    // Combine user's saved cards with defaults
    const availableCompanions = useMemo(() => {
        if (cards && cards.length > 0) {
            return cards.map(c => ({
                id: c.uuid || String(c.id),
                uuid: c.uuid || String(c.id),
                name: c.characterName || 'Waifu',
                personality: c.metadata?.personality || 'Devoted anime companion',
                tagline: c.metadata?.tagline || '',
                imageBlobOrUrl: c.imageBlobOrUrl || c.imageUrl || defaultParticipants[0].imageBlobOrUrl,
                themeColor: c.metadata?.themeColor || '#00E5FF',
                hp: 100,
                maxHp: 100
            }));
        }
        return defaultParticipants;
    }, [cards, defaultParticipants]);

    // Active members in the group channel
    const [selectedMemberIds, setSelectedMemberIds] = useState(() => {
        return availableCompanions.slice(0, 4).map(c => c.id);
    });

    const activeParticipants = useMemo(() => {
        return availableCompanions.filter(c => selectedMemberIds.includes(c.id));
    }, [availableCompanions, selectedMemberIds]);

    // Initial greeting if group message history is empty
    useEffect(() => {
        const initGroup = async () => {
            if (dbGroupMsgs.length === 0) {
                await saveGroupMessage(groupId, {
                    speaker: 'M.I.K.A. (Proxy Prime)',
                    role: 'assistant',
                    themeColor: '#FF107A',
                    avatar: defaultParticipants[0].imageBlobOrUrl,
                    content: 'Nyaa~ Master! Welcome to the Multi-Companion Neural Channel! All your bonded waifus are linked here. What shall we do today? ✨'
                });
            }
        };
        initGroup();
    }, [dbGroupMsgs.length, defaultParticipants]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [dbGroupMsgs, typingSpeaker, isLoading]);

    // Main Group Send Handler
    const handleSend = async (e) => {
        if (e) e.preventDefault();
        if (!input.trim() || isLoading) return;

        let userText = input.trim();
        setInput('');
        matrixAudio.playClick();

        if (replyingTo) {
            userText = `[Replying to ${replyingTo.speaker}: "${replyingTo.quote.replace(/"/g, "'")}"] ${userText}`;
            setReplyingTo(null);
        }

        // Save Master's message to IndexedDB
        await saveGroupMessage(groupId, {
            speaker: 'Master',
            role: 'user',
            themeColor: '#FF107A',
            content: userText
        });

        setIsLoading(true);

        try {
            const apiKey = await getApiKey();
            if (!apiKey || apiKey.trim() === '') {
                setTimeout(async () => {
                    await saveGroupMessage(groupId, {
                        speaker: 'M.I.K.A. (Proxy Prime)',
                        role: 'assistant',
                        themeColor: '#FF107A',
                        avatar: defaultParticipants[0].imageBlobOrUrl,
                        content: 'Nyaa~ Master! Provide a NanoGPT API Key in the Settings so we can all chat and bicker in real-time! 💕'
                    });
                    setIsLoading(false);
                }, 600);
                return;
            }

            // Construct participant profiles
            const memberProfiles = activeParticipants.map(p => {
                return `[ ${p.name} | Personality: ${p.personality} | Quirks: ${p.tagline || 'Cyberpunk vibes'} ]`;
            }).join('\n');

            // Construct recent conversation context
            const historyPrompt = dbGroupMsgs.slice(-8).map(m => `[${m.speaker}]: ${m.content}`).join('\n');

            // Tabletop D&D / Campaign Module
            let tabletopInstructions = '';
            if (isRpMode) {
                const gmName = gameMaster === 'mika' ? 'M.I.K.A. Proxy (Narrator / Game Master)' : (activeParticipants.find(p => p.id === gameMaster)?.name || 'The GM');
                tabletopInstructions = `\n[ 🎲 TABLETOP RPG (P.A.W.S.) CAMPAIGN ACTIVE 🎲 ]
Game Master: ${gmName}.
Active Boss / Enemy: ${activeMonster ? `${activeMonster.name} (HP: ${activeMonster.hp}/${activeMonster.maxHp})` : 'None currently engaged'}.
RULES:
1. When players perform attacks or risky actions, they MUST include a roll formatted as: [ 🎲 Rolled a X ] (where X is 1-20).
2. If combat occurs, the GM MUST output damage tags: <paws_update><target>${activeMonster?.name || 'Enemy'}</target><hp_change>-20</hp_change></paws_update> to damage the enemy, or damage a player!
3. If the boss is defeated or a new monster is needed, output <spawn_enemy><name>Monster Name</name><max_hp>100</max_hp></spawn_enemy>!`;
            }

            const systemPrompt = `[SYSTEM: MULTI-AGENT CYBERDECK GROUP CHAT]
You simulate lively anime companion banter in a cyberpunk group channel.
Master just spoke to the room!

CONNECTED COMPANIONS:
${memberProfiles}
${tabletopInstructions}

CRITICAL RULES:
1. BANTER CHAIN: Output 2 to 3 distinct replies from different companions in sequence.
2. ROTATE SPEAKERS: No back-to-back messages from the same companion.
3. ACKNOWLEDGE MASTER: The FIRST speaker MUST directly acknowledge or respond to Master's statement. Other companions then react to that speaker or tease Master.
4. REPLIES: Use [Replying to Name: "Quote"] Text if referencing another companion.
5. XML FORMAT: Output ONLY XML for each reply block. DO NOT output anything outside the <reply> tags:
<reply>
  <speaker>Exact Name of Speaker</speaker>
  <message>Dialogue and actions</message>
  <send_image>false</send_image>
  ${isRpMode ? '<paws_update><target>Target Name</target><hp_change>-15</hp_change></paws_update>' : ''}
</reply>`;

            const prompt = `[RECENT CHANNEL LOG]\n${historyPrompt}\n[Master]: ${userText}\n\nGENERATE NEXT BANTER REPLIES IN XML FORMAT:`;

            const rawCompletion = await generateCharacterPersona({
                prompt,
                systemPrompt,
                model: 'chatgpt-4o-latest',
                temperature: 0.92
            });

            // Parse XML Replies
            const replyBlocks = [...rawCompletion.matchAll(/<reply>([\s\S]*?)<\/reply>/gi)];
            const parsedReplies = [];

            for (const rMatch of replyBlocks) {
                const block = rMatch[1];
                const speaker = (block.match(/<speaker>([\s\S]*?)<\/speaker>/i)?.[1] || '').trim();
                let message = (block.match(/<message>([\s\S]*?)<\/message>/i)?.[1] || '').trim();
                const sendImage = (block.match(/<send_image>([\s\S]*?)<\/send_image>/i)?.[1] || '').trim().toLowerCase() === 'true';

                // Check for P.A.W.S. monster spawn
                const spawnMatch = block.match(/<spawn_enemy>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<max_hp>([\s\S]*?)<\/max_hp>[\s\S]*?<\/spawn_enemy>/i);
                if (spawnMatch) {
                    const monName = spawnMatch[1].trim();
                    const monHp = parseInt(spawnMatch[2].trim(), 10) || 100;
                    setActiveMonster({
                        id: `mon_${Date.now()}`,
                        name: monName,
                        hp: monHp,
                        maxHp: monHp,
                        themeColor: '#FF107A'
                    });
                    if (onShowToast) onShowToast(`[⚠️ ENEMY SPAWNED: ${monName}!]`);
                }

                // Check for P.A.W.S. damage updates
                const pawsMatches = [...block.matchAll(/<paws_update>[\s\S]*?<target>([\s\S]*?)<\/target>[\s\S]*?<hp_change>([\s\S]*?)<\/hp_change>[\s\S]*?<\/paws_update>/gi)];
                for (const pm of pawsMatches) {
                    const target = pm[1].trim();
                    const hpChange = parseInt(pm[2].trim(), 10) || 0;
                    if (activeMonster && target.toLowerCase().includes(activeMonster.name.toLowerCase())) {
                        setActiveMonster(prev => {
                            if (!prev) return null;
                            const newHp = Math.max(0, prev.hp + hpChange);
                            if (newHp === 0) {
                                matrixAudio.playPowerup();
                                if (onShowToast) onShowToast(`[🏆 VICTORY: ${prev.name} DEFEATED!]`);
                            }
                            return { ...prev, hp: newHp };
                        });
                    }
                }

                // Strip inner tags from message text
                message = message
                    .replace(/<paws_update>[\s\S]*?<\/paws_update>/gi, '')
                    .replace(/<spawn_enemy>[\s\S]*?<\/spawn_enemy>/gi, '')
                    .trim();

                if (speaker && message) {
                    const matchedComp = activeParticipants.find(p => p.name.toLowerCase().includes(speaker.toLowerCase())) || activeParticipants[0];
                    parsedReplies.push({
                        speaker: matchedComp.name || speaker,
                        role: 'assistant',
                        avatar: matchedComp.imageBlobOrUrl,
                        themeColor: matchedComp.themeColor || '#00E5FF',
                        content: message,
                        sendImage
                    });
                }
            }

            if (parsedReplies.length === 0) {
                parsedReplies.push({
                    speaker: activeParticipants[0]?.name || 'M.I.K.A.',
                    role: 'assistant',
                    avatar: activeParticipants[0]?.imageBlobOrUrl,
                    themeColor: '#FF107A',
                    content: rawCompletion.replace(/<[^>]+>/g, '').trim() || 'Nyaa~ Master! We hear you!'
                });
            }

            // Staggered Delivery with Live Typing Indicator
            for (let i = 0; i < parsedReplies.length; i++) {
                const rep = parsedReplies[i];
                setTypingSpeaker(rep.speaker);
                // Realistic reading/typing pause: 600ms + 25ms per character
                const delay = Math.min(2200, 600 + rep.content.length * 20);
                await new Promise(r => setTimeout(r, delay));

                await saveGroupMessage(groupId, rep);
                matrixAudio.playClick();
                if (onSpeechUpdate && i === parsedReplies.length - 1) {
                    onSpeechUpdate(`${rep.speaker}: ${rep.content}`);
                }
            }

        } catch (err) {
            console.error('Group chat execution error:', err);
            await saveGroupMessage(groupId, {
                speaker: 'SYSTEM',
                role: 'assistant',
                themeColor: '#FF3333',
                content: `[Group Channel Error: ${err.message}]`
            });
        } finally {
            setIsLoading(false);
            setTypingSpeaker(null);
        }
    };

    // Roll D20 Dice Button
    const handleRollDice = () => {
        const roll = Math.floor(Math.random() * 20) + 1;
        matrixAudio.playPowerup();
        const outcome = roll === 20 ? 'CRITICAL SUCCESS! ✨' : roll === 1 ? 'CRITICAL FAIL! 💀' : 'Attack Check';
        setInput(prev => `${prev ? prev + ' ' : ''}[ 🎲 Rolled a ${roll} ] ${outcome}`);
    };

    // Toggle Member Selection
    const toggleMember = (id) => {
        setSelectedMemberIds(prev => {
            if (prev.includes(id)) {
                if (prev.length <= 1) return prev; // At least one companion must stay
                return prev.filter(x => x !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    return (
        <div style={{
            height: '100%', display: 'flex', flexDirection: 'column',
            background: 'rgba(5, 3, 8, 0.95)', overflow: 'hidden', position: 'relative',
            fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace"
        }}>
            {/* 1. Header with Channel Switcher & Tabletop Mode */}
            <div style={{
                padding: '10px 14px', background: 'rgba(5, 3, 8, 0.85)',
                borderBottom: '1px solid rgba(0, 229, 255, 0.2)', display: 'flex',
                flexDirection: 'column', gap: '8px', zIndex: 20
            }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                            onClick={onSwitchToDm}
                            title="Return to 1-on-1 Direct Neural Link"
                            style={{
                                background: 'rgba(255, 16, 122, 0.1)', border: '1px solid rgba(255, 16, 122, 0.4)',
                                borderRadius: '6px', color: '#FF107A', fontSize: '11px', padding: '4px 8px',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                        >
                            <span>←</span>
                            <span>1-ON-1</span>
                        </button>
                        <div>
                            <div style={{
                                color: '#00E5FF', fontWeight: 'bold', fontSize: '13px',
                                display: 'flex', alignItems: 'center', gap: '6px'
                            }}>
                                <span>🌐 NEO-TOKYO CHANNEL</span>
                                <span style={{
                                    fontSize: '9px', padding: '1px 5px', borderRadius: '4px',
                                    background: 'rgba(0, 229, 255, 0.1)', border: '1px solid rgba(0, 229, 255, 0.3)',
                                    color: '#00E5FF'
                                }}>
                                    {activeParticipants.length} CONNECTED
                                </span>
                            </div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                                Multi-Agent Neural Banter Active
                            </div>
                        </div>
                    </div>

                    {/* Header Action Controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {/* Tabletop Campaign Toggle */}
                        <button
                            onClick={() => {
                                setIsRpMode(prev => !prev);
                                matrixAudio.playPowerup();
                                if (onShowToast) onShowToast(isRpMode ? '[TABLETOP CAMPAIGN PAUSED]' : '[TABLETOP D&D MODE ENGAGED 🎲]');
                            }}
                            title="Toggle Tabletop RPG / D&D Mode"
                            style={{
                                background: isRpMode ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                                border: `1px solid ${isRpMode ? '#FFD700' : 'rgba(255, 255, 255, 0.2)'}`,
                                borderRadius: '6px', color: isRpMode ? '#FFD700' : '#aaa',
                                fontSize: '11px', padding: '4px 8px', cursor: 'pointer', fontWeight: 'bold'
                            }}
                        >
                            🎲 D&D
                        </button>

                        {/* Manage Channel Members */}
                        <button
                            onClick={() => setShowMemberModal(prev => !prev)}
                            title="Manage Connected Companions"
                            style={{
                                background: showMemberModal ? 'rgba(0, 229, 255, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                                border: '1px solid rgba(0, 229, 255, 0.3)', borderRadius: '6px',
                                color: '#00E5FF', fontSize: '11px', padding: '4px 8px', cursor: 'pointer'
                            }}
                        >
                            👥 ROSTER
                        </button>
                    </div>
                </div>

                {/* 2. Live Tabletop Battle HUD (when D&D mode is active) */}
                {isRpMode && (
                    <div style={{
                        background: 'rgba(20, 10, 30, 0.85)', border: '1px solid rgba(255, 215, 0, 0.3)',
                        borderRadius: '8px', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '6px'
                    }}>
                        <div style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            fontSize: '10px', color: '#FFD700', fontWeight: 'bold'
                        }}>
                            <span>⚔️ ACTIVE CAMPAIGN // P.A.W.S. BATTLE MATRIX</span>
                            <span>GM: {gameMaster === 'mika' ? 'M.I.K.A. Proxy' : 'Companion'}</span>
                        </div>

                        {/* Monster Health Bar */}
                        {activeMonster && (
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#FF107A' }}>
                                    <span>BOSS: {activeMonster.name}</span>
                                    <span>{activeMonster.hp} / {activeMonster.maxHp} HP</span>
                                </div>
                                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden', marginTop: '3px' }}>
                                    <div style={{
                                        width: `${Math.max(0, Math.min(100, (activeMonster.hp / activeMonster.maxHp) * 100))}%`,
                                        height: '100%', background: 'linear-gradient(90deg, #FF107A 0%, #FFD700 100%)',
                                        boxShadow: '0 0 8px #FF107A', transition: 'width 0.3s ease'
                                    }} />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 3. Manage Roster Dropdown Modal */}
            {showMemberModal && (
                <div style={{
                    padding: '12px 16px', background: '#080512', borderBottom: '1px solid rgba(0, 229, 255, 0.3)',
                    display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 15, fontSize: '11px'
                }}>
                    <div style={{ color: '#00E5FF', fontWeight: 'bold' }}>
                        &gt; SELECT COMPANIONS TO CONNECT IN CHANNEL:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '6px' }}>
                        {availableCompanions.map(c => {
                            const isSelected = selectedMemberIds.includes(c.id);
                            return (
                                <div
                                    key={c.id}
                                    onClick={() => toggleMember(c.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px', padding: '6px',
                                        borderRadius: '6px', cursor: 'pointer',
                                        background: isSelected ? 'rgba(0, 229, 255, 0.15)' : 'rgba(255,255,255,0.02)',
                                        border: `1px solid ${isSelected ? '#00E5FF' : 'rgba(255,255,255,0.1)'}`,
                                        color: isSelected ? '#00E5FF' : '#888'
                                    }}
                                >
                                    <div style={{
                                        width: '20px', height: '20px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0
                                    }}>
                                        <img src={c.imageBlobOrUrl} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    </div>
                                    <span style={{ fontSize: '10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {c.name}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                        <button
                            onClick={() => clearGroupMessages(groupId)}
                            style={{
                                background: 'rgba(255, 16, 122, 0.1)', border: '1px solid #FF107A',
                                color: '#FF107A', fontSize: '9px', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer'
                            }}
                        >
                            CLEAR CHANNEL HISTORY
                        </button>
                    </div>
                </div>
            )}

            {/* 4. Group Message History */}
            <div style={{
                flex: 1, overflowY: 'auto', padding: '14px', display: 'flex',
                flexDirection: 'column', gap: '12px', position: 'relative'
            }}>
                {dbGroupMsgs.map((msg, idx) => {
                    const isUser = msg.role === 'user';
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
                                    : 'linear-gradient(135deg, rgba(16, 10, 30, 0.9) 0%, rgba(8, 4, 16, 0.9) 100%)',
                                border: isUser ? '1px solid rgba(0, 229, 255, 0.4)' : `1px solid ${msg.themeColor || '#00E5FF'}40`,
                                color: '#E0F7FA', fontSize: '13px', lineHeight: '1.5',
                                boxShadow: '0 4px 16px rgba(0,0,0,0.5)', position: 'relative'
                            }}>
                                {/* Header with Speaker Avatar and Name */}
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    fontSize: '10px', color: msg.themeColor || '#00E5FF', marginBottom: '4px',
                                    fontWeight: 'bold', gap: '6px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {msg.avatar && (
                                            <div style={{ width: '16px', height: '16px', borderRadius: '4px', overflow: 'hidden' }}>
                                                <img src={msg.avatar} alt={msg.speaker} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                        )}
                                        <span>&gt; {msg.speaker}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '9px', opacity: 0.6 }}>
                                            {new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        <button
                                            onClick={() => setReplyingTo({ speaker: msg.speaker, quote: msg.content.substring(0, 60) })}
                                            title="Quote this companion in reply"
                                            style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', padding: 0 }}
                                        >
                                            ↩
                                        </button>
                                    </div>
                                </div>

                                {/* Formatted Content with Dice and Asterisks parsing */}
                                <div style={{ wordBreak: 'break-word' }}>
                                    {formatMessageText(msg.content)}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {/* Staggered Typing Indicator */}
                {typingSpeaker && (
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px', color: '#00E5FF',
                        fontSize: '11px', fontStyle: 'italic', padding: '6px 10px'
                    }}>
                        <span style={{ animation: 'spin 1s linear infinite' }}>💬</span>
                        <span>{typingSpeaker} is typing a response...</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* 5. Reply Quote Banner */}
            {replyingTo && (
                <div style={{
                    padding: '6px 14px', background: 'rgba(0, 229, 255, 0.1)',
                    borderTop: '1px solid rgba(0, 229, 255, 0.3)', display: 'flex',
                    alignItems: 'center', justifyContent: 'space-between', fontSize: '11px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#00E5FF' }}>
                        <span>↩ Replying to <strong>{replyingTo.speaker}</strong>:</span>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>
                            "{replyingTo.quote}..."
                        </span>
                    </div>
                    <button
                        onClick={() => setReplyingTo(null)}
                        style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}
                    >
                        ✕
                    </button>
                </div>
            )}

            {/* 6. Input Form with D20 Roll Shortcut */}
            <form
                onSubmit={handleSend}
                style={{
                    padding: '10px 14px', background: 'rgba(5, 3, 8, 0.95)',
                    borderTop: '1px solid rgba(0, 229, 255, 0.2)', display: 'flex',
                    gap: '8px', alignItems: 'center', zIndex: 20
                }}
            >
                {/* D20 Roll Button */}
                <button
                    type="button"
                    onClick={handleRollDice}
                    title="Roll D20 for Tabletop Check"
                    style={{
                        padding: '10px 12px', borderRadius: '8px',
                        background: 'rgba(255, 215, 0, 0.1)', border: '1px solid #FFD700',
                        color: '#FFD700', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer'
                    }}
                >
                    🎲
                </button>

                <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    disabled={isLoading}
                    placeholder="Broadcast message to channel..."
                    style={{
                        flex: 1, padding: '10px 14px', borderRadius: '8px',
                        background: 'rgba(0, 229, 255, 0.05)', border: '1px solid rgba(0, 229, 255, 0.3)',
                        color: '#E0F7FA', fontSize: '13px', outline: 'none',
                        fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace"
                    }}
                />
                <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    style={{
                        padding: '10px 18px', borderRadius: '8px',
                        background: 'linear-gradient(135deg, #00E5FF 0%, #B533FF 100%)',
                        border: 'none', color: '#fff', fontWeight: 'bold', fontSize: '12px',
                        cursor: (isLoading || !input.trim()) ? 'not-allowed' : 'pointer',
                        boxShadow: '0 0 15px rgba(0, 229, 255, 0.4)', letterSpacing: '0.05em'
                    }}
                >
                    BROADCAST
                </button>
            </form>
        </div>
    );
}
