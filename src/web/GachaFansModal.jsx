import React, { useState, useEffect } from 'react';
import { getGachaFansData, saveGachaFansData, getApiKey } from './db.js';
import { generateCharacterImage } from './aiClient.js';
import { matrixAudio } from '../core/utils/matrixAudio.js';
import { LockIcon, XIcon, SparkIcon } from '../core/components/Icons.jsx';

export function GachaFansModal({ companion, isOpen, onClose, onLaunchHack, userCredits, setUserCredits, onShowToast }) {
    if (!isOpen || !companion) return null;

    const companionId = companion.uuid || companion.id || 'default';
    const [unlockedTiers, setUnlockedTiers] = useState([1]);
    const [tipsTotal, setTipsTotal] = useState(0);
    const [customSelfies, setCustomSelfies] = useState([]);
    const [customPrompt, setCustomPrompt] = useState('');
    const [isGeneratingVip, setIsGeneratingVip] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState(null);

    // Load GachaFans state from IndexedDB
    useEffect(() => {
        const load = async () => {
            const data = await getGachaFansData(companionId);
            if (data) {
                setUnlockedTiers(data.unlockedTiers || [1]);
                setTipsTotal(data.tips || 0);
                setCustomSelfies(data.customSelfies || []);
            }
        };
        load();
    }, [companionId]);

    // Save changes
    const persist = async (tiers, tips, selfies) => {
        await saveGachaFansData(companionId, {
            unlockedTiers: tiers,
            tips,
            customSelfies: selfies
        });
    };

    const handleUnlockTier = async (tierNum, cost) => {
        if (unlockedTiers.includes(tierNum)) return;
        if (userCredits < cost) {
            matrixAudio.playPass();
            if (onShowToast) onShowToast(`[ERROR: INSUFFICIENT CREDITS (${userCredits}/${cost}) - HACK VIA MATRIX SHOOTER TO BYPASS]`);
            return;
        }

        matrixAudio.playPowerup();
        const nextCredits = userCredits - cost;
        setUserCredits(nextCredits);
        localStorage.setItem('gachaswipe_user_credits', String(nextCredits));

        const nextTiers = [...unlockedTiers, tierNum];
        setUnlockedTiers(nextTiers);
        await persist(nextTiers, tipsTotal, customSelfies);
        if (onShowToast) onShowToast(`[GACHAFANS: TIER ${tierNum} DECRYPTED]`);
    };

    const handleSendTip = async (amount = 50) => {
        if (userCredits < amount) {
            if (onShowToast) onShowToast('[ERROR: INSUFFICIENT CREDITS FOR TIP]');
            return;
        }
        matrixAudio.playPowerup();
        const nextCredits = userCredits - amount;
        setUserCredits(nextCredits);
        localStorage.setItem('gachaswipe_user_credits', String(nextCredits));

        const nextTips = tipsTotal + amount;
        setTipsTotal(nextTips);
        await persist(unlockedTiers, nextTips, customSelfies);
        if (onShowToast) onShowToast(`[GACHAFANS: TIPPED ${amount} CREDITS TO ${companion.name.toUpperCase()}]`);
    };

    const handleGenerateVipPhoto = async () => {
        if (!unlockedTiers.includes(3)) {
            if (onShowToast) onShowToast('[GACHAFANS: TIER 3 VIP SUBSCRIPTION REQUIRED]');
            return;
        }
        setIsGeneratingVip(true);
        matrixAudio.playDecrypt();
        if (onShowToast) onShowToast('[AI_STUDIO: SYNTHESIZING CUSTOM VIP PHOTO...]');

        try {
            const apiKey = await getApiKey();
            let photoUrl = '';
            const promptStr = customPrompt.trim() || 'seductive glamorous cyberpunk evening dress, glowing neon halo, 8k masterpiece portrait';
            if (apiKey && apiKey.trim() !== '') {
                photoUrl = await generateCharacterImage({
                    prompt: `Masterpiece VIP exclusive photo of ${companion.name}, ${companion.archetype}, ${promptStr}, ultra-detailed, cinematic lighting, photorealistic anime, 8k`
                });
            } else {
                photoUrl = `https://picsum.photos/seed/${Date.now()}/800/1200`;
            }

            const newSelfie = {
                url: photoUrl,
                title: customPrompt.trim() || 'Custom VIP Request',
                date: new Date().toLocaleDateString()
            };
            const nextSelfies = [newSelfie, ...customSelfies];
            setCustomSelfies(nextSelfies);
            setCustomPrompt('');
            await persist(unlockedTiers, tipsTotal, nextSelfies);
            matrixAudio.playLike();
            if (onShowToast) onShowToast('[AI_STUDIO: NEW VIP PHOTO ADDED TO GALLERY]');
        } catch (err) {
            console.error(err);
            if (onShowToast) onShowToast(`[ERROR: ${err.message}]`);
        } finally {
            setIsGeneratingVip(false);
        }
    };

    const themeColor = companion.themeColor || '#FF107A';

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 100050,
            background: 'rgba(5, 3, 8, 0.92)', backdropFilter: 'blur(16px)',
            display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px',
            fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace"
        }}>
            <div style={{
                width: '100%', maxWidth: '580px', height: '92vh', maxHeight: '760px',
                background: '#0B0914', border: `1px solid ${themeColor}60`, borderRadius: '16px',
                boxShadow: `0 0 50px rgba(0,0,0,0.9), 0 0 25px ${themeColor}30`,
                display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative'
            }}>
                {/* Banner & Profile Header */}
                <div style={{
                    position: 'relative', height: '140px', background: `linear-gradient(135deg, ${themeColor}40, #0B0914)`,
                    overflow: 'hidden', flexShrink: 0
                }}>
                    <img
                        src={companion.imageUrl || companion.image}
                        alt=""
                        style={{
                            position: 'absolute', inset: 0, width: '100%', height: '100%',
                            objectFit: 'cover', filter: 'blur(4px) brightness(0.5)', transform: 'scale(1.1)'
                        }}
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 20%, #0B0914 100%)' }} />

                    <button
                        onClick={onClose}
                        style={{
                            position: 'absolute', top: '12px', right: '12px', zIndex: 10,
                            background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,255,255,0.2)',
                            color: '#fff', borderRadius: '4px', width: '28px', height: '28px',
                            cursor: 'pointer', display: 'grid', placeItems: 'center'
                        }}
                    >
                        <XIcon size={14} />
                    </button>

                    {/* Creator Identity Info */}
                    <div style={{
                        position: 'absolute', bottom: '10px', left: '16px', right: '16px',
                        display: 'flex', alignItems: 'flex-end', gap: '14px', zIndex: 5
                    }}>
                        <img
                            src={companion.imageUrl || companion.image}
                            alt=""
                            style={{
                                width: '64px', height: '64px', borderRadius: '12px', objectFit: 'cover',
                                border: `2px solid ${themeColor}`, boxShadow: `0 0 15px ${themeColor}60`
                            }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#fff' }}>
                                    {companion.name}
                                </h2>
                                <span style={{
                                    background: '#FF107A', color: '#fff', fontSize: '9px', fontWeight: 900,
                                    padding: '2px 6px', borderRadius: '4px', letterSpacing: '0.05em'
                                }}>
                                    VIP CREATOR
                                </span>
                            </div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>
                                <span>69.4K Subscribers</span> • <span>{(500 + tipsTotal)} Tips Sent</span>
                            </div>
                        </div>

                        {/* Credits Balance & Hack Button */}
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '10px', color: '#00FF41', fontWeight: 'bold' }}>
                                CREDITS: {userCredits} ⚡
                            </div>
                            <button
                                onClick={() => { onClose(); if (onLaunchHack) onLaunchHack(); }}
                                title="Play Matrix Shooter to bypass firewalls"
                                style={{
                                    marginTop: '4px', padding: '3px 8px', borderRadius: '4px',
                                    border: '1px solid #00E5FF', background: 'rgba(0, 229, 255, 0.15)',
                                    color: '#00E5FF', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer'
                                }}
                            >
                                🎮 HACK MATRIX
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Scrollable Feed */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* Bio & Teaser */}
                    <div style={{
                        padding: '12px 14px', background: 'rgba(255,255,255,0.02)',
                        border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px'
                    }}>
                        <div style={{ fontSize: '11px', color: '#FF107A', fontWeight: 'bold', marginBottom: '4px' }}>
                            &gt; CREATOR_DOSSIER:
                        </div>
                        <div style={{ fontSize: '12px', color: '#EBE3D6', lineHeight: 1.4 }}>
                            {companion.tagline || companion.description}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                            <button
                                onClick={() => handleSendTip(50)}
                                style={{
                                    padding: '5px 12px', borderRadius: '4px', border: '1px solid #f5a623',
                                    background: 'rgba(245, 166, 35, 0.15)', color: '#f5a623', fontSize: '11px',
                                    fontWeight: 'bold', cursor: 'pointer'
                                }}
                            >
                                💸 Send Tip (50⚡)
                            </button>
                        </div>
                    </div>

                    {/* Subscription Tiers Grid */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ fontSize: '11px', color: '#00E5FF', fontWeight: 'bold' }}>
                            &gt; EXCLUSIVE_MEMBERSHIP_TIERS:
                        </div>

                        {/* Tier 1: Free Stream */}
                        <div style={{
                            padding: '12px', borderRadius: '8px',
                            background: 'rgba(0, 229, 255, 0.05)', border: '1px solid rgba(0, 229, 255, 0.3)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#00E5FF' }}>
                                        TIER 1: PUBLIC FEED [FREE]
                                    </div>
                                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>
                                        Daily schedule updates & public candid thoughts
                                    </div>
                                </div>
                                <span style={{ color: '#00FF41', fontSize: '10px', fontWeight: 'bold' }}>
                                    ✓ UNLOCKED
                                </span>
                            </div>
                            <div style={{ marginTop: '10px', fontSize: '11px', color: '#EBE3D6', fontStyle: 'italic', background: 'rgba(0,0,0,0.4)', padding: '8px', borderRadius: '4px' }}>
                                "{companion.scenario || 'Curled up in her favorite cyber hoodie.'}"
                            </div>
                        </div>

                        {/* Tier 2: Backstage Supporter */}
                        <div style={{
                            padding: '12px', borderRadius: '8px',
                            background: unlockedTiers.includes(2) ? 'rgba(181, 51, 255, 0.08)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${unlockedTiers.includes(2) ? '#B533FF' : 'rgba(255,255,255,0.1)'}`
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: unlockedTiers.includes(2) ? '#B533FF' : '#aaa' }}>
                                        TIER 2: BACKSTAGE SUPPORTER [100⚡]
                                    </div>
                                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>
                                        High-res candid photoshoot & secret diary entries
                                    </div>
                                </div>
                                {unlockedTiers.includes(2) ? (
                                    <span style={{ color: '#00FF41', fontSize: '10px', fontWeight: 'bold' }}>✓ ACTIVE</span>
                                ) : (
                                    <button
                                        onClick={() => handleUnlockTier(2, 100)}
                                        style={{
                                            padding: '4px 10px', borderRadius: '4px', border: '1px solid #B533FF',
                                            background: 'rgba(181, 51, 255, 0.2)', color: '#fff', fontSize: '10px',
                                            fontWeight: 'bold', cursor: 'pointer'
                                        }}
                                    >
                                        UNLOCK 100⚡
                                    </button>
                                )}
                            </div>

                            {unlockedTiers.includes(2) ? (
                                <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                                    <img
                                        src={companion.imageUrl || companion.image}
                                        alt=""
                                        onClick={() => setSelectedPhoto(companion.imageUrl || companion.image)}
                                        style={{ width: '80px', height: '110px', objectFit: 'cover', borderRadius: '4px', cursor: 'pointer', border: '1px solid #B533FF' }}
                                    />
                                    <div style={{ flex: 1, fontSize: '11px', color: '#EBE3D6' }}>
                                        <div style={{ color: '#B533FF', fontWeight: 'bold', marginBottom: '4px' }}>&gt; SECRET DIARY:</div>
                                        "Master gave me the sweetest look today during our code review. My heart overclocked to 99%~"
                                    </div>
                                </div>
                            ) : (
                                <div style={{ marginTop: '8px', fontSize: '10px', color: '#777', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <LockIcon size={12} /> Encrypted behind Supporter Paywall
                                </div>
                            )}
                        </div>

                        {/* Tier 3: VIP Elite */}
                        <div style={{
                            padding: '12px', borderRadius: '8px',
                            background: unlockedTiers.includes(3) ? 'rgba(255, 16, 122, 0.08)' : 'rgba(255,255,255,0.02)',
                            border: `1px solid ${unlockedTiers.includes(3) ? '#FF107A' : 'rgba(255,255,255,0.1)'}`
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: unlockedTiers.includes(3) ? '#FF107A' : '#aaa' }}>
                                        TIER 3: VIP ELITE ACCESS [250⚡]
                                    </div>
                                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>
                                        Decrypted VIP gallery + Custom AI Photo Shoot Studio
                                    </div>
                                </div>
                                {unlockedTiers.includes(3) ? (
                                    <span style={{ color: '#00FF41', fontSize: '10px', fontWeight: 'bold' }}>✓ VIP ACTIVE</span>
                                ) : (
                                    <button
                                        onClick={() => handleUnlockTier(3, 250)}
                                        style={{
                                            padding: '4px 10px', borderRadius: '4px', border: '1px solid #FF107A',
                                            background: 'linear-gradient(135deg, #FF107A, #7928CA)', color: '#fff', fontSize: '10px',
                                            fontWeight: 'bold', cursor: 'pointer'
                                        }}
                                    >
                                        UNLOCK 250⚡
                                    </button>
                                )}
                            </div>

                            {unlockedTiers.includes(3) && (
                                <div style={{ marginTop: '12px', borderTop: '1px dashed rgba(255,16,122,0.3)', paddingTop: '10px' }}>
                                    <div style={{ fontSize: '11px', color: '#FF107A', fontWeight: 'bold', marginBottom: '6px' }}>
                                        &gt; CUSTOM_VIP_PHOTO_STUDIO:
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <input
                                            type="text"
                                            placeholder="Request custom look (e.g. cyber bunny suit, maid dress)..."
                                            value={customPrompt}
                                            onChange={e => setCustomPrompt(e.target.value)}
                                            style={{
                                                flex: 1, padding: '6px 10px', borderRadius: '4px',
                                                background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(255,16,122,0.3)',
                                                color: '#fff', fontSize: '11px', outline: 'none'
                                            }}
                                        />
                                        <button
                                            onClick={handleGenerateVipPhoto}
                                            disabled={isGeneratingVip}
                                            style={{
                                                padding: '6px 12px', borderRadius: '4px', border: 'none',
                                                background: '#FF107A', color: '#fff', fontSize: '10px',
                                                fontWeight: 'bold', cursor: isGeneratingVip ? 'wait' : 'pointer'
                                            }}
                                        >
                                            {isGeneratingVip ? 'SYNTH...' : 'REQUEST'}
                                        </button>
                                    </div>

                                    {/* Gallery of VIP Photos */}
                                    {customSelfies.length > 0 && (
                                        <div style={{ marginTop: '10px', display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                                            {customSelfies.map((s, idx) => (
                                                <div key={idx} style={{ position: 'relative', flexShrink: 0 }}>
                                                    <img
                                                        src={s.url}
                                                        alt=""
                                                        onClick={() => setSelectedPhoto(s.url)}
                                                        style={{
                                                            width: '80px', height: '110px', objectFit: 'cover',
                                                            borderRadius: '4px', cursor: 'pointer', border: '1px solid #FF107A'
                                                        }}
                                                    />
                                                    <div style={{ fontSize: '8px', color: '#fff', width: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {s.title}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Lightbox Photo Preview */}
                {selectedPhoto && (
                    <div
                        onClick={() => setSelectedPhoto(null)}
                        style={{
                            position: 'absolute', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.95)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            padding: '16px', cursor: 'pointer'
                        }}
                    >
                        <img
                            src={selectedPhoto}
                            alt=""
                            style={{ maxWidth: '90%', maxHeight: '80%', objectFit: 'contain', borderRadius: '8px', border: `2px solid ${themeColor}` }}
                        />
                        <div style={{ marginTop: '10px', color: '#aaa', fontSize: '11px' }}>
                            [Tap anywhere to close preview]
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
