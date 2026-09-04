import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useCards, saveCard, deleteCard, useCardCount, getApiKey } from './web/db.js';
import { generateCharacterPersona, generateCharacterImage, NanoGPTError } from './web/aiClient.js';
import { CloudVault } from './web/CloudVault.jsx';
import { SwipeCard } from './core/components/SwipeCard.jsx';
import { HeartIcon, XIcon, RewindIcon, InfoIcon, SparkIcon, RefreshIcon } from './core/components/Icons.jsx';
import { DEFAULT_PROXY } from './core/data/constants.js';

// Ultra-reliable starter cards for instant visual wow-factor
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

export default function App() {
  const dbCards = useCards();
  const cardCount = useCardCount();
  const [deck, setDeck] = useState(STARTER_CARDS);
  const [history, setHistory] = useState([]);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isCloudVaultOpen, setIsCloudVaultOpen] = useState(false);
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
        personality: c.metadata?.personality || 'Enigmatic & Loyal',
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

  // Swipe Action Handlers
  const handleSwipe = useCallback(async (direction) => {
    if (!currentCard) return;
    
    setHistory(prev => [...prev, { card: currentCard, direction }]);
    
    if (direction === 'like') {
      showToast(`💖 Bond formed with ${currentCard.name || 'Companion'}!`);
      if (!currentCard.dbId) {
        await saveCard({
          uuid: currentCard.uuid || crypto.randomUUID(),
          characterName: currentCard.name,
          imageBlobOrUrl: currentCard.imageUrl || currentCard.image,
          metadata: {
            name: currentCard.name,
            age: currentCard.age,
            personality: currentCard.personality,
            archetype: currentCard.archetype,
            description: currentCard.description,
            tagline: currentCard.tagline,
            quirks: currentCard.quirks,
            likes: currentCard.likes,
            dislikes: currentCard.dislikes,
            tags: currentCard.tags,
            isSSR: currentCard.isSSR,
            themeColor: currentCard.themeColor,
            gradient: currentCard.gradient,
            scenario: currentCard.scenario,
            first_message: currentCard.first_message,
            greeting: currentCard.greeting
          }
        });
      }
    } else {
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

  // AI Pull / Card Summon Handler
  const handleAIPull = async () => {
    setIsPullingCard(true);
    showToast('✨ Accessing NanoGPT Matrix for new companion pull...');
    try {
      const apiKey = await getApiKey();
      if (apiKey && apiKey.trim() !== '') {
        const personaText = await generateCharacterPersona({
          prompt: 'Generate an anime companion in JSON format: { "name": string, "age": string, "personality": string, "archetype": string, "tagline": string, "description": string, "quirks": string[], "likes": string[], "dislikes": string[], "tags": string[] }',
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
            tagline: 'Cyber explorer of the neon expanse.',
            quirks: ['Hacks streetlights', 'Collects retro game cartridges'],
            likes: ['Cyber ramen', 'Night drives'],
            dislikes: ['Data loss'],
            tags: ['AI_SYNTH', 'BYOK']
          };
        }

        const imageUrl = await generateCharacterImage({
          prompt: `Masterpiece anime portrait of ${parsed.name}, ${parsed.archetype || 'cyberpunk waifu'}, highly detailed, glowing neon highlights, 8k, vibrant colors`
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
            scenario: 'smiles at you through holographic lights',
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

  const likeOpacity = Math.min(1, Math.max(0, dragOffset.x / 90));
  const passOpacity = Math.min(1, Math.max(0, -dragOffset.x / 90));
  const cardRotation = dragOffset.x * 0.08;

  return (
    <div style={{
      width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column',
      background: 'radial-gradient(circle at 50% 20%, #1f1435 0%, #0c0817 60%, #05030a 100%)',
      color: '#fff', overflowX: 'hidden', position: 'relative',
      fontFamily: "'Hanken Grotesk', system-ui, sans-serif"
    }}
    onPointerMove={handlePointerMove}
    onPointerUp={handlePointerUp}
    >
      {/* Top Cyber Navigation Bar */}
      <header style={{
        padding: '16px 24px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', zIndex: 100, width: '100%',
        borderBottom: '1px solid rgba(255, 107, 181, 0.15)',
        background: 'rgba(12, 8, 23, 0.85)', backdropFilter: 'blur(12px)',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{
            fontSize: '22px', background: 'linear-gradient(135deg, #ff77a9, #00f5d4)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 800
          }}>
            🐾 GACHASWIPE <span style={{ fontSize: '13px', color: '#ff77a9', letterSpacing: '0.1em' }}>WEB</span>
          </span>
          <span style={{
            fontSize: '11px', padding: '3px 8px', borderRadius: '12px',
            background: 'rgba(0, 245, 212, 0.15)', color: '#00f5d4', border: '1px solid rgba(0, 245, 212, 0.3)'
          }}>
            Matrix Online
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={handleAIPull}
            disabled={isPullingCard}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: '20px', border: 'none',
              background: 'linear-gradient(135deg, #00f5d4, #7928ca)',
              color: '#000', fontWeight: 700, fontSize: '12px', cursor: isPullingCard ? 'wait' : 'pointer',
              boxShadow: '0 0 15px rgba(0, 245, 212, 0.3)'
            }}
          >
            <SparkIcon /> {isPullingCard ? 'Summoning...' : 'Gacha Pull'}
          </button>

          <button
            onClick={() => setIsCloudVaultOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 14px', borderRadius: '20px',
              border: '1px solid rgba(255, 119, 169, 0.4)',
              background: 'rgba(255, 119, 169, 0.12)',
              color: '#ffb3c6', fontWeight: 600, fontSize: '12px', cursor: 'pointer'
            }}
          >
            <span>⚡ Cloud Vault</span>
            <span style={{
              background: '#ff4d6d', color: '#fff', padding: '1px 6px',
              borderRadius: '10px', fontSize: '10px'
            }}>
              {cardCount}
            </span>
          </button>
        </div>
      </header>

      {/* Main Swipe Stage */}
      <main style={{
        flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center',
        position: 'relative', padding: '24px 16px', minHeight: '620px'
      }}>
        {currentCard ? (
          <div
            onPointerDown={handlePointerDown}
            style={{
              width: '100%', maxWidth: '380px', height: '580px', position: 'relative',
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
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        ) : (
          <div style={{
            textAlign: 'center', padding: '40px 20px',
            background: 'rgba(255, 255, 255, 0.04)', borderRadius: '24px',
            border: '1px dashed rgba(255, 107, 181, 0.4)', maxWidth: '340px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎴</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#ff77a9', fontSize: '20px' }}>Deck Depleted!</h3>
            <p style={{ fontSize: '13px', color: '#a09ab8', lineHeight: 1.5, marginBottom: '20px' }}>
              You have swiped through all available cards, Master! Pull a new companion from the NanoGPT Matrix or reset your deck.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={() => { setActiveCardIndex(0); setHistory([]); }}
                style={{
                  padding: '10px 18px', borderRadius: '12px', border: 'none',
                  background: 'linear-gradient(135deg, #ff77a9, #a370f7)',
                  color: '#fff', fontWeight: 600, cursor: 'pointer'
                }}
              >
                Reset Deck
              </button>
              <button
                onClick={handleAIPull}
                style={{
                  padding: '10px 18px', borderRadius: '12px',
                  border: '1px solid #00f5d4', background: 'transparent',
                  color: '#00f5d4', fontWeight: 600, cursor: 'pointer'
                }}
              >
                Summon New
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Deck Controls */}
      <footer style={{
        padding: '16px 20px 32px', display: 'flex', justifyContent: 'center',
        alignItems: 'center', gap: '24px', zIndex: 100
      }}>
        <button
          onClick={handleRewind}
          title="Rewind"
          style={{
            width: '48px', height: '48px', borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#f5a623', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'transform 0.15s'
          }}
        >
          <RewindIcon />
        </button>

        <button
          onClick={() => handleSwipe('pass')}
          title="Pass"
          style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'rgba(255, 77, 109, 0.15)', border: '2px solid #ff4d6d',
            color: '#ff4d6d', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 0 20px rgba(255, 77, 109, 0.35)',
            transition: 'transform 0.15s'
          }}
        >
          <XIcon size={30} />
        </button>

        <button
          onClick={() => handleSwipe('like')}
          title="Like"
          style={{
            width: '68px', height: '68px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #00f5d4, #05b49b)', border: 'none',
            color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 0 25px rgba(0, 245, 212, 0.6)',
            transition: 'transform 0.15s'
          }}
        >
          <HeartIcon />
        </button>
      </footer>

      {/* Cloud Vault Drawer */}
      <CloudVault isOpen={isCloudVaultOpen} onClose={() => setIsCloudVaultOpen(false)} />

      {/* Toast Feedback */}
      {toastMessage && (
        <div style={{
          position: 'fixed', bottom: '110px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 99999, background: 'rgba(12, 8, 23, 0.95)', border: '1px solid #00f5d4',
          borderRadius: '12px', padding: '10px 18px', color: '#fff', fontSize: '13px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.8), 0 0 15px rgba(0, 245, 212, 0.4)',
          pointerEvents: 'none', backdropFilter: 'blur(10px)'
        }}>
          {toastMessage}
        </div>
      )}
    </div>
  );
}
