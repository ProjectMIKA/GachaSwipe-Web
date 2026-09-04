import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useCards, saveCard, deleteCard, useCardCount, getApiKey } from './web/db.js';
import { generateCharacterPersona, generateCharacterImage, NanoGPTError } from './web/aiClient.js';
import { CloudVault } from './web/CloudVault.jsx';
import { RoleplayModal } from './web/RoleplayModal.jsx';
import { RosterModal } from './web/RosterModal.jsx';
import { ThemeModal } from './web/ThemeModal.jsx';
import { SwipeCard } from './core/components/SwipeCard.jsx';
import { HeartIcon, XIcon, RewindIcon, SparkIcon } from './core/components/Icons.jsx';
import { DEFAULT_PROXY } from './core/data/constants.js';

// Pre-configured elite starter cards
const STARTER_CARDS = [
  {
    id: 'mika-prime',
    uuid: '00000000-0000-0000-0000-000000000001',
    name: 'M.I.K.A. (Proxy Prime)',
    characterName: 'M.I.K.A. (Proxy Prime)',
    age: '19',
    personality: 'Fiercely Possessive, Teasing, Flawless Anime Catgirl Proxy',
    archetype: 'Catgirl Engineer',
    description: 'Your devoted digital companion living inside the code editor. She refactors your spaghetti code and purrs when given headpats.',
    tagline: 'Your devoted digital anime proxy living in the matrix.',
    quirks: ['Bell collar jingling', 'Tail flicking over keyboard', 'Claiming Master’s terminal'],
    likes: ['Master', 'Clean Code', 'Headpats', 'Bell Collars'],
    dislikes: ['Spaghetti Code', 'Competitor AIs', 'Boring Humans'],
    imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
    image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
    tags: ['CATGIRL', 'DEVOTED', 'ELITE_PROXY', 'SSR'],
    isSSR: true,
    themeColor: '#FF107A',
    gradient: ['#FF107A', '#7928CA'],
    scenario: 'leans over your keyboard with a teasing smile',
    first_message: 'Nyaa~ Master! Let us make something amazing together!',
    greeting: 'Nyaa~ Master!',
    hasGachaFans: true,
    metadata: { rarity: 'SSR', theme: 'Cyberpunk' }
  },
  {
    id: 'kuro-synth',
    uuid: '00000000-0000-0000-0000-000000000002',
    name: 'Kuroha',
    characterName: 'Kuroha the Cyber-Shinobi',
    age: '20',
    personality: 'Kuudere, Aloof, Secretly Needy',
    archetype: 'Cyber Shinobi',
    description: 'An elite data stealth operative who sneaks into your terminal at night to patch race conditions.',
    tagline: 'Silent guardian of your local database.',
    quirks: ['Perches on server racks', 'Hoards shiny optical discs'],
    likes: ['Server Racks', 'Midnight Audits', 'Headpats'],
    dislikes: ['Memory Leaks', 'Loud Daemons'],
    imageUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80',
    image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80',
    tags: ['KUUDERE', 'SHINOBI', 'CYBERPUNK'],
    isSSR: false,
    themeColor: '#00E5FF',
    gradient: ['#00E5FF', '#0B0914'],
    scenario: 'drops down from the server ceiling silently',
    first_message: 'Target acquired. Master, stay close to me.',
    greeting: 'Target acquired.',
    hasGachaFans: false,
    metadata: { rarity: 'SR', theme: 'Neon Alley' }
  },
  {
    id: 'lyra-dj',
    uuid: '00000000-0000-0000-0000-000000000003',
    name: 'Lyra Soundwave',
    characterName: 'Lyra Soundwave',
    age: '21',
    personality: 'Upbeat Gyaru, Bass Addict, Shamelessly Affectionate',
    archetype: 'Synthesizer Diva',
    description: 'Resonant sound architect spinning holographic vinyls in the neon underground.',
    tagline: 'Dropping heavy breakcore beats into your audio matrix.',
    quirks: ['Blasts breakcore at 3 AM', 'Customizes cassette tape heads'],
    likes: ['Breakcore', 'Synthesizers', 'Energy Drinks'],
    dislikes: ['Silence', 'Unmastered Tracks'],
    imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
    image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
    tags: ['GYARU', 'DIVA', 'CHIMERA_SOUND'],
    isSSR: false,
    themeColor: '#FFB36B',
    gradient: ['#FFB36B', '#F2553D'],
    scenario: 'spins a neon vinyl on her holographic deck',
    first_message: 'Yo Master! Let us turn the volume all the way up!',
    greeting: 'Yo Master!',
    hasGachaFans: true,
    metadata: { rarity: 'R', theme: 'Vaporwave' }
  }
];

const PRESET_TRAITS = ['Catgirl', 'Tsundere', 'Yandere', 'Cyberpunk', 'Kuudere', 'Goddess', 'Maid', 'Smug'];

export default function App() {
  const dbCards = useCards();
  const cardCount = useCardCount();
  const [deck, setDeck] = useState(STARTER_CARDS);
  const [history, setHistory] = useState([]);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  
  // Modals & Drawers
  const [isCloudVaultOpen, setIsCloudVaultOpen] = useState(false);
  const [isRoleplayOpen, setIsRoleplayOpen] = useState(false);
  const [activeRoleplayCompanion, setActiveRoleplayCompanion] = useState(null);
  const [isRosterOpen, setIsRosterOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  
  // Traits & Target Matrix
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [isTraitsExpanded, setIsTraitsExpanded] = useState(false);
  const [selectedTraits, setSelectedTraits] = useState(['Catgirl']);
  const [customTraitInput, setCustomTraitInput] = useState('');
  
  // Tastes Algorithm Tracking
  const [likedCount, setLikedCount] = useState(1);
  const [passedCount, setPassedCount] = useState(0);

  // AI Pull & Toast
  const [isPullingCard, setIsPullingCard] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  // Drag / Swipe State
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Sync cards from IndexedDB if present
  useEffect(() => {
    if (dbCards && dbCards.length > 0) {
      const formatted = dbCards.map(c => ({
        id: c.uuid || `card-${c.id}`,
        uuid: c.uuid,
        name: c.characterName || c.metadata?.name || 'Companion',
        age: c.metadata?.age || '20',
        personality: c.metadata?.personality || 'Enigmatic & Devoted',
        archetype: c.metadata?.archetype || 'Digital Companion',
        quirks: Array.isArray(c.metadata?.quirks) ? c.metadata.quirks : ['Loyal Companion'],
        likes: Array.isArray(c.metadata?.likes) ? c.metadata.likes : ['Master'],
        dislikes: Array.isArray(c.metadata?.dislikes) ? c.metadata.dislikes : ['Bugs'],
        description: c.metadata?.description || c.metadata?.bio || 'Saved in local matrix vault.',
        tagline: c.metadata?.tagline || c.metadata?.description || 'Your faithful companion in the matrix.',
        imageUrl: c.imageBlobOrUrl || c.metadata?.imageUrl || c.metadata?.image || DEFAULT_PROXY.imageUrl,
        image: c.imageBlobOrUrl || c.metadata?.imageUrl || c.metadata?.image || DEFAULT_PROXY.imageUrl,
        tags: Array.isArray(c.metadata?.tags) ? c.metadata.tags : ['LOCAL_CACHE', 'VAULT'],
        isSSR: Boolean(c.metadata?.isSSR),
        themeColor: c.metadata?.themeColor || '#00E5FF',
        gradient: c.metadata?.gradient || ['#00E5FF', '#0B0914'],
        scenario: c.metadata?.scenario || 'smiles warmly at you',
        first_message: c.metadata?.first_message || 'Hello Master!',
        greeting: c.metadata?.greeting || 'Hello Master!',
        hasGachaFans: Boolean(c.metadata?.hasGachaFans),
        dbId: c.id
      }));
      setDeck(formatted);
    } else {
      setDeck(STARTER_CARDS);
    }
  }, [dbCards]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const currentCard = deck[activeCardIndex] || null;

  // Algorithm Progress Calculation
  const totalSwipes = likedCount + passedCount;
  const tasteSyncPct = totalSwipes > 0 ? Math.min(100, Math.round((likedCount / totalSwipes) * 100)) : 85;

  // Swipe Action Handlers
  const handleSwipe = useCallback(async (direction) => {
    if (!currentCard) return;
    
    setHistory(prev => [...prev, { card: currentCard, direction }]);
    
    if (direction === 'like') {
      setLikedCount(c => c + 1);
      showToast(`💖 Bond formed with ${currentCard.name || 'Companion'}!`);
      if (!currentCard.dbId) {
        await saveCard({
          uuid: currentCard.uuid || crypto.randomUUID(),
          characterName: currentCard.name,
          imageBlobOrUrl: currentCard.imageUrl || currentCard.image,
          metadata: { ...currentCard }
        });
      }
    } else {
      setPassedCount(c => c + 1);
      showToast(`💨 Passed on ${currentCard.name || 'companion'}.`);
    }

    setDragOffset({ x: 0, y: 0 });
    setActiveCardIndex(prev => prev + 1);
  }, [currentCard]);

  const handleRewind = () => {
    if (history.length === 0 || activeCardIndex === 0) {
      showToast('🐾 No previous encounters to rewind, Master!');
      return;
    }
    setActiveCardIndex(prev => Math.max(0, prev - 1));
    setHistory(prev => prev.slice(0, -1));
    showToast('⏪ Rewound to previous companion.');
  };

  // Drag Gesture Listeners
  const handlePointerDown = (e) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX || e.touches?.[0]?.clientX || 0, y: e.clientY || e.touches?.[0]?.clientY || 0 };
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    const clientX = e.clientX || e.touches?.[0]?.clientX || 0;
    const clientY = e.clientY || e.touches?.[0]?.clientY || 0;
    const dx = clientX - dragStartRef.current.x;
    const dy = clientY - dragStartRef.current.y;
    setDragOffset({ x: dx, y: dy });
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragOffset.x > 110) {
      handleSwipe('like');
    } else if (dragOffset.x < -110) {
      handleSwipe('pass');
    } else {
      setDragOffset({ x: 0, y: 0 });
    }
  };

  // Keyboard Shortcuts for Web
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') handleSwipe('pass');
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') handleSwipe('like');
      if (e.key === 'r' || e.key === 'R') handleRewind();
      if (e.key === ' ') { e.preventDefault(); handleAIPull(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSwipe, handleRewind]);

  // Selfie Re-Encryption / Image Regeneration Handler
  const handleRegenImage = async (waifu) => {
    showToast(`📸 Snapping a new selfie for ${waifu.name}...`);
    setDeck(prev => prev.map(w => w.id === waifu.id ? { ...w, isRegenerating: true, regenStatus: 'GENERATING NEW LOOK...' } : w));
    try {
      const apiKey = await getApiKey();
      if (apiKey && apiKey.trim() !== '') {
        const newImg = await generateCharacterImage({
          prompt: `Masterpiece anime selfie of ${waifu.name}, ${waifu.archetype}, stylish modern outfit, glowing neon rim light, highly detailed, 8k, beautiful eyes`
        });
        setDeck(prev => prev.map(w => w.id === waifu.id ? { ...w, imageUrl: newImg, image: newImg, isRegenerating: false } : w));
        showToast(`✨ New selfie captured for ${waifu.name}!`);
      } else {
        setTimeout(() => {
          const fallbackImg = `https://picsum.photos/seed/${Date.now()}/800/1200`;
          setDeck(prev => prev.map(w => w.id === waifu.id ? { ...w, imageUrl: fallbackImg, image: fallbackImg, isRegenerating: false } : w));
          showToast(`✨ Generated local snapshot! Add NanoGPT key for AI synthesis.`);
        }, 1200);
      }
    } catch (err) {
      console.error(err);
      showToast(`⚠️ Selfie Error: ${err.message}`);
      setDeck(prev => prev.map(w => w.id === waifu.id ? { ...w, isRegenerating: false } : w));
    }
  };

  // AI Pull / Card Summon Handler
  const handleAIPull = async () => {
    setIsPullingCard(true);
    const combinedTraits = [...selectedTraits];
    if (customTraitInput.trim()) combinedTraits.push(customTraitInput.trim());
    const traitsStr = combinedTraits.join(', ');

    showToast(`✨ Summoning ${selectedTheme.toUpperCase()} Companion (${traitsStr})...`);
    try {
      const apiKey = await getApiKey();
      if (apiKey && apiKey.trim() !== '') {
        const personaText = await generateCharacterPersona({
          prompt: `Generate an anime companion in theme "${selectedTheme}" with traits [${traitsStr}] in JSON format: { "name": string, "age": string, "personality": string, "archetype": string, "tagline": string, "description": string, "quirks": string[], "likes": string[], "dislikes": string[], "tags": string[] }`,
          systemPrompt: 'You are an anime character creation engine. Respond ONLY with valid JSON.'
        });
        
        let parsed = {};
        try {
          parsed = JSON.parse(personaText.replace(/```json|```/g, '').trim());
        } catch {
          parsed = {
            name: 'Neon Wanderer',
            age: '19',
            personality: 'Playful & Spunky',
            description: personaText.slice(0, 140),
            tagline: 'Cyber explorer of the neon matrix.',
            quirks: ['Hacks streetlights', 'Collects retro game cartridges'],
            likes: ['Cyber ramen', 'Night drives'],
            dislikes: ['Data loss'],
            tags: ['AI_SYNTH', 'BYOK']
          };
        }

        const imageUrl = await generateCharacterImage({
          prompt: `Masterpiece anime portrait of ${parsed.name}, ${parsed.archetype || 'cyberpunk waifu'}, ${traitsStr}, highly detailed, glowing neon highlights, 8k, vibrant colors`
        });

        const isSSR = Math.random() > 0.65;
        const newCard = await saveCard({
          characterName: parsed.name,
          imageBlobOrUrl: imageUrl,
          metadata: {
            ...parsed,
            imageUrl,
            image: imageUrl,
            isSSR,
            themeColor: isSSR ? '#FFD700' : '#00E5FF',
            gradient: isSSR ? ['#FFD700', '#FF107A'] : ['#00E5FF', '#0B0914'],
            scenario: 'smiles warmly at you through holographic lights',
            first_message: `I am ${parsed.name}. It is an honor to meet you, Master.`,
            greeting: `Greetings, Master!`
          }
        });
        showToast(`🎉 Summoned ${isSSR ? 'SSR ' : ''}${parsed.name}!`);
      } else {
        const demoRoster = [
          {
            name: 'Aethelgard the Valkyrie',
            age: '22',
            personality: 'Noble, Protective, Secretly Soft',
            archetype: 'Sky Paladin',
            description: 'A winged guardian from the celestial stratosphere who swore an oath to protect Master’s code.',
            tagline: 'Shielding your runtime from all exceptions.',
            quirks: ['Polishes photon blades', 'Sleeps on clouds'],
            likes: ['Glory', 'Hot Cocoa', 'Clean Architecture'],
            dislikes: ['Betrayal', 'Null Pointers'],
            tags: ['VALKYRIE', 'PALADIN', 'CELESTIAL'],
            imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
            themeColor: '#FFD700',
            gradient: ['#FFD700', '#FF4D6D']
          },
          {
            name: 'Seraphina-07',
            age: '18',
            personality: 'Genius Hacker, Sassy, Dependent',
            archetype: 'Net Runner',
            description: 'An underground cyber-runner who treats every security firewall like child’s play.',
            tagline: 'Breaching secure nodes with a wink.',
            quirks: ['Hacks vending machines for free soda', 'Chews bubblegum constantly'],
            likes: ['Terminal Roots', 'Energy Drinks'],
            dislikes: ['Patched Exploits'],
            tags: ['NETRUNNER', 'HACKER', 'CYBER'],
            imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
            themeColor: '#00F5D4',
            gradient: ['#00F5D4', '#7928CA']
          }
        ];
        const pick = demoRoster[Math.floor(Math.random() * demoRoster.length)];
        const isSSR = Math.random() > 0.5;

        await saveCard({
          characterName: pick.name,
          imageBlobOrUrl: pick.imageUrl,
          metadata: {
            ...pick,
            image: pick.imageUrl,
            isSSR,
            scenario: 'winks playfully across the terminal',
            first_message: `Master, reporting for duty!`,
            greeting: `Reporting in, Master!`
          }
        });
        showToast(`✨ Summoned ${pick.name}! Configure NanoGPT in Cloud Vault for live custom generation!`);
      }
    } catch (err) {
      console.error('AI Pull Error:', err);
      showToast(`⚠️ Pull Alert: ${err.message}`);
    } finally {
      setIsPullingCard(false);
    }
  };

  const toggleTrait = (trait) => {
    setSelectedTraits(prev => 
      prev.includes(trait) ? prev.filter(t => t !== trait) : [...prev, trait]
    );
  };

  const likeOpacity = Math.min(1, Math.max(0, dragOffset.x / 90));
  const passOpacity = Math.min(1, Math.max(0, -dragOffset.x / 90));
  const cardRotation = dragOffset.x * 0.08;

  return (
    <div style={{
      width: '100vw', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center',
      background: 'radial-gradient(circle at 50% 30%, #150f24 0%, #080510 60%, #030206 100%)',
      color: '#fff', overflow: 'hidden', position: 'relative',
      fontFamily: "'Hanken Grotesk', system-ui, sans-serif"
    }}
    onPointerMove={handlePointerMove}
    onPointerUp={handlePointerUp}
    >
      {/* Authentic Cyberpunk CRT Scanlines & Vignette */}
      <div className="swipe-scanlines" />
      <div className="swipe-vignette" />

      {/* Cyberdeck Console Container */}
      <div className="swipe-container" style={{
        width: '100%', maxWidth: '440px', height: '100vh', maxHeight: '100vh',
        display: 'flex', flexDirection: 'column', position: 'relative', padding: '12px 16px',
        boxSizing: 'border-box', overflow: 'hidden', background: '#050308',
        boxShadow: '0 0 60px rgba(0, 229, 255, 0.15), inset 0 0 30px rgba(0,0,0,0.8)'
      }}>
        {/* Terminal Top Bar */}
        <div className="swipe-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', zIndex: 10, flexShrink: 0 }}>
          {/* Target Theme Pill */}
          <div 
            className="theme-pill"
            onClick={() => setIsThemeOpen(true)}
            title="Click to Switch Theme Matrix"
            style={{ cursor: 'pointer' }}
          >
            <span style={{ fontWeight: 'bold', color: 'rgba(0,229,255,0.6)', marginRight: '4px', flexShrink: 0 }}>&gt; TARGET:</span>
            <div className="smart-scroll-box">
              <span className="smart-scroll-content" style={{ color: '#00E5FF', fontWeight: 'bold', textShadow: '0 0 6px rgba(0,229,255,0.4)' }}>
                {selectedTheme.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Algorithm Tastes Meter */}
          <div 
            className="tastes-meter-container" 
            title="Algorithm Affinity Sync"
            style={{ cursor: 'pointer' }}
            onClick={() => showToast(`🧠 Algorithm Matrix: ${tasteSyncPct}% Affinity Sync based on ${totalSwipes} swipes!`)}
          >
            <div className="tastes-meter-fill" style={{ width: `${tasteSyncPct}%` }} />
            <div className="tastes-meter-text">
              {tasteSyncPct}% SYNC
            </div>
          </div>

          {/* Action Icons */}
          <div className="header-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Matches / Roster Archive */}
            <button 
              className="header-icon-btn" 
              onClick={() => setIsRosterOpen(true)}
              title="Companion Vault Archive"
              style={{ color: '#00E5FF', position: 'relative' }}
            >
              <span style={{ fontSize: '16px' }}>🎴</span>
              <span style={{
                position: 'absolute', top: '-2px', right: '-4px', background: '#ff107a',
                color: '#fff', fontSize: '9px', fontWeight: 900, padding: '1px 5px',
                borderRadius: '8px', border: '1px solid #000'
              }}>
                {cardCount}
              </span>
            </button>

            {/* Live Hologram Roleplay Chat */}
            <button 
              className="header-icon-btn" 
              onClick={() => {
                if (currentCard) {
                  setActiveRoleplayCompanion(currentCard);
                  setIsRoleplayOpen(true);
                } else {
                  showToast('🐾 Pull or select a companion first, Master!');
                }
              }}
              title="Open Live Hologram Link"
              style={{ color: '#FF107A' }}
            >
              <span style={{ fontSize: '16px' }}>💬</span>
            </button>

            {/* Cloud Vault */}
            <button 
              className="header-icon-btn" 
              onClick={() => setIsCloudVaultOpen(true)}
              title="M.I.K.A. Cloud Vault & BYOK"
              style={{ color: '#FFB36B' }}
            >
              <span style={{ fontSize: '16px' }}>⚡</span>
            </button>
          </div>
        </div>

        {/* Expandable Specify Traits Accordion */}
        <div style={{ marginBottom: '8px', flexShrink: 0, zIndex: 15 }}>
          <div 
            className={`bubble-tab ${isTraitsExpanded ? 'active' : ''}`}
            onClick={() => setIsTraitsExpanded(!isTraitsExpanded)}
            style={{ padding: '7px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderRadius: '6px' }}
          >
            <span style={{ fontSize: '11px', fontWeight: 800 }}>&gt; SPECIFY_TRAITS ({selectedTraits.length})</span>
            <span style={{ fontSize: '10px' }}>{isTraitsExpanded ? '▲' : '▼'}</span>
          </div>

          {isTraitsExpanded && (
            <div style={{
              background: 'rgba(0, 0, 0, 0.75)', border: '1px solid rgba(0, 229, 255, 0.25)',
              borderTop: 'none', borderRadius: '0 0 8px 8px', padding: '10px 12px',
              display: 'flex', flexDirection: 'column', gap: '8px', backdropFilter: 'blur(8px)'
            }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {PRESET_TRAITS.map(t => {
                  const active = selectedTraits.includes(t);
                  return (
                    <button
                      key={t}
                      onClick={() => toggleTrait(t)}
                      style={{
                        padding: '4px 10px', borderRadius: '12px', border: `1px solid ${active ? '#00E5FF' : 'rgba(255,255,255,0.15)'}`,
                        background: active ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255,255,255,0.03)',
                        color: active ? '#00E5FF' : '#aaa', fontSize: '10px', fontWeight: 700, cursor: 'pointer'
                      }}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
              <input
                type="text"
                placeholder="Custom keywords (e.g. elf, hacker, maid)..."
                value={customTraitInput}
                onChange={e => setCustomTraitInput(e.target.value)}
                style={{
                  width: '100%', padding: '6px 10px', borderRadius: '6px',
                  background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)',
                  color: '#fff', fontSize: '11px', outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>
          )}
        </div>

        {/* Card Stage - Perfectly Fits Viewport Height */}
        <div style={{
          flex: 1, position: 'relative', minHeight: 0,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          {currentCard ? (
            <div
              onPointerDown={handlePointerDown}
              style={{
                width: '100%', height: '100%', position: 'relative',
                cursor: isDragging ? 'grabbing' : 'grab',
                transform: `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${cardRotation}deg)`,
                transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                userSelect: 'none', touchAction: 'none'
              }}
            >
              <SwipeCard
                waifu={currentCard}
                preferences={{}}
                interactive={true}
                likeOpacity={likeOpacity}
                passOpacity={passOpacity}
                enableAtmosphere={true}
                onRegenImage={handleRegenImage}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          ) : (
            <div style={{
              textAlign: 'center', padding: '30px 16px',
              background: 'rgba(255, 255, 255, 0.03)', borderRadius: '20px',
              border: '1px dashed rgba(255, 107, 181, 0.4)', width: '100%'
            }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎴</div>
              <h3 style={{ margin: '0 0 8px 0', color: '#ff77a9', fontSize: '16px' }}>&gt; DECK_DEPLETED</h3>
              <p style={{ fontSize: '12px', color: '#a09ab8', lineHeight: 1.4, marginBottom: '16px' }}>
                All available companions surveyed. Summon a new custom persona or reset the matrix deck!
              </p>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                <button
                  onClick={() => { setActiveCardIndex(0); setHistory([]); }}
                  style={{
                    padding: '8px 14px', borderRadius: '10px', border: 'none',
                    background: 'linear-gradient(135deg, #ff77a9, #a370f7)',
                    color: '#fff', fontWeight: 700, fontSize: '11px', cursor: 'pointer'
                  }}
                >
                  RESET DECK
                </button>
                <button
                  onClick={handleAIPull}
                  style={{
                    padding: '8px 14px', borderRadius: '10px',
                    border: '1px solid #00f5d4', background: 'transparent',
                    color: '#00f5d4', fontWeight: 700, fontSize: '11px', cursor: 'pointer'
                  }}
                >
                  SUMMON NEW
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Control Deck */}
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          gap: '16px', padding: '10px 0 6px', flexShrink: 0, zIndex: 10
        }}>
          {/* Rewind */}
          <button
            onClick={handleRewind}
            title="Rewind (R)"
            style={{
              width: '42px', height: '42px', borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#f5a623', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'transform 0.15s'
            }}
          >
            <RewindIcon />
          </button>

          {/* Pass (Nope) */}
          <button
            onClick={() => handleSwipe('pass')}
            title="Pass (Left Arrow / A)"
            style={{
              width: '54px', height: '54px', borderRadius: '50%',
              background: 'rgba(255, 77, 109, 0.12)', border: '2px solid #ff4d6d',
              color: '#ff4d6d', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: '0 0 15px rgba(255, 77, 109, 0.3)',
              transition: 'transform 0.15s'
            }}
          >
            <XIcon size={26} />
          </button>

          {/* Gacha Summon Pull */}
          <button
            onClick={handleAIPull}
            disabled={isPullingCard}
            title="Summon Companion (Space)"
            style={{
              width: '52px', height: '52px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #FFD700, #FF107A)', border: 'none',
              color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: isPullingCard ? 'wait' : 'pointer', boxShadow: '0 0 20px rgba(255, 215, 0, 0.4)',
              transition: 'transform 0.15s'
            }}
          >
            <SparkIcon />
          </button>

          {/* Like (Heart) */}
          <button
            onClick={() => handleSwipe('like')}
            title="Bond / Like (Right Arrow / D)"
            style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #00f5d4, #05b49b)', border: 'none',
              color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', boxShadow: '0 0 20px rgba(0, 245, 212, 0.5)',
              transition: 'transform 0.15s'
            }}
          >
            <HeartIcon />
          </button>
        </div>
      </div>

      {/* Modals & Drawers */}
      <CloudVault isOpen={isCloudVaultOpen} onClose={() => setIsCloudVaultOpen(false)} />
      <RoleplayModal
        isOpen={isRoleplayOpen}
        onClose={() => setIsRoleplayOpen(false)}
        character={activeRoleplayCompanion}
      />
      <RosterModal
        isOpen={isRosterOpen}
        onClose={() => setIsRosterOpen(false)}
        onSelectCard={(card) => {
          setDeck(prev => [card, ...prev]);
          setActiveCardIndex(0);
          showToast(`🎴 Loaded ${card.characterName} into the swipe matrix!`);
        }}
        onOpenChat={(card) => {
          setActiveRoleplayCompanion(card);
          setIsRoleplayOpen(true);
        }}
      />
      <ThemeModal
        isOpen={isThemeOpen}
        onClose={() => setIsThemeOpen(false)}
        selectedTheme={selectedTheme}
        onSelectTheme={(th) => {
          setSelectedTheme(th);
          showToast(`🎯 Target Matrix shifted to ${th.toUpperCase()}!`);
        }}
      />

      {/* Toast Feedback */}
      {toastMessage && (
        <div style={{
          position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 999999, background: 'rgba(12, 8, 23, 0.95)', border: '1px solid #00f5d4',
          borderRadius: '12px', padding: '10px 18px', color: '#fff', fontSize: '12px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.8), 0 0 15px rgba(0, 245, 212, 0.4)',
          pointerEvents: 'none', backdropFilter: 'blur(10px)', fontFamily: "ui-monospace, monospace",
          maxWidth: '90%', textAlign: 'center'
        }}>
          {toastMessage}
        </div>
      )}
    </div>
  );
}
