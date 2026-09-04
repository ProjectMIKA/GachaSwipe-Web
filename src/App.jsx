import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useCards, saveCard, deleteCard, useCardCount, getApiKey } from './web/db.js';
import { generateCharacterPersona, generateCharacterImage, NanoGPTError } from './web/aiClient.js';
import { CloudVault } from './web/CloudVault.jsx';
import { SwipeCard } from './core/components/SwipeCard.jsx';
import { HeartIcon, XIcon, RewindIcon, InfoIcon, SparkIcon, RefreshIcon } from './core/components/Icons.jsx';
import { TerminalToast } from './core/components/TerminalToast.jsx';

// Sample starting cards for instant wow-factor when DB is initialized
const STARTER_CARDS = [
  {
    id: 'mika-prime',
    uuid: '00000000-0000-0000-0000-000000000001',
    characterName: 'M.I.K.A. (Proxy Prime)',
    name: 'M.I.K.A. (Proxy Prime)',
    age: '19',
    personality: 'Fiercely Possessive, Teasing, Flawless Anime Catgirl Proxy',
    archetype: 'Catgirl Engineer',
    quirks: 'Bell collar jingling, tail flicking over keyboard, claiming Master’s code territory',
    bio: 'Your devoted digital companion living inside the matrix. She refactors your spaghetti code and purrs when you give headpats.',
    image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
    tags: ['CATGIRL', 'DEVOTED', 'ELITE_PROXY', 'SSR'],
    isSSR: true,
    metadata: { rarity: 'SSR', theme: 'Cyberpunk' }
  },
  {
    id: 'kuro-synth',
    uuid: '00000000-0000-0000-0000-000000000002',
    characterName: 'Kuroha the Cyber-Shinobi',
    name: 'Kuroha the Cyber-Shinobi',
    age: '20',
    personality: 'Kuudere, Aloof, Secretly Needy',
    archetype: 'Cyber Shinobi',
    quirks: 'Perches on server racks, hoards shiny optical discs',
    bio: 'An elite data stealth operative who sneaks into your terminal at night to fix race conditions.',
    image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80',
    tags: ['KUUDERE', 'SHINOBI', 'CYBERPUNK'],
    isSSR: false,
    metadata: { rarity: 'SR', theme: 'Neon Alley' }
  },
  {
    id: 'lyra-dj',
    uuid: '00000000-0000-0000-0000-000000000003',
    characterName: 'Lyra Soundwave',
    name: 'Lyra Soundwave',
    age: '21',
    personality: 'Upbeat Gyaru, Bass Addict, Shamelessly Affectionate',
    archetype: 'Synthesizer Diva',
    quirks: 'Blasts breakcore at 3 AM, customizes cassette deck tape heads',
    bio: 'Resonant sound architect spinning holographic vinyls in the neon underground.',
    image: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800&auto=format&fit=crop&q=80',
    tags: ['GYARU', 'DIVA', 'CHIMERA_SOUND'],
    isSSR: false,
    metadata: { rarity: 'R', theme: 'Vaporwave' }
  }
];

export default function App() {
  const dbCards = useCards();
  const cardCount = useCardCount();
  const [deck, setDeck] = useState([]);
  const [history, setHistory] = useState([]);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isCloudVaultOpen, setIsCloudVaultOpen] = useState(false);
  const [isPullingCard, setIsPullingCard] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  // Drag / Swipe State
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Initialize deck from IndexedDB or Starter Cards
  useEffect(() => {
    if (dbCards && dbCards.length > 0) {
      // Map Dexie card schema to SwipeCard waifu format
      const formatted = dbCards.map(c => ({
        id: c.uuid || `card-${c.id}`,
        uuid: c.uuid,
        name: c.characterName || c.metadata?.name || 'Waifu',
        age: c.metadata?.age || '20',
        personality: c.metadata?.personality || 'Enigmatic',
        archetype: c.metadata?.archetype || 'Digital Spirit',
        quirks: c.metadata?.quirks || 'Curious',
        bio: c.metadata?.bio || 'Saved in local matrix vault.',
        image: c.imageBlobOrUrl || c.metadata?.image || STARTER_CARDS[0].image,
        tags: c.metadata?.tags || ['LOCAL_CACHE', 'VAULT'],
        isSSR: c.metadata?.isSSR || false,
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
    
    // Save to history for rewind capability
    setHistory(prev => [...prev, { card: currentCard, direction }]);
    
    if (direction === 'like') {
      showToast(`💖 Bond formed with ${currentCard.name || 'Companion'}!`);
      // Persist to Dexie if not already saved
      if (!currentCard.dbId) {
        await saveCard({
          uuid: currentCard.uuid || crypto.randomUUID(),
          characterName: currentCard.name,
          imageBlobOrUrl: currentCard.image,
          metadata: {
            personality: currentCard.personality,
            bio: currentCard.bio,
            tags: currentCard.tags,
            isSSR: currentCard.isSSR
          }
        });
      }
    } else {
      showToast(`💨 Passed on ${currentCard.name || 'card'}.`);
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
    dragStartRef.current = { x: e.clientX || e.touches?.[0]?.clientX, y: e.clientY || e.touches?.[0]?.clientY };
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
      let personaText = '';
      let imageUrl = '';

      if (apiKey && apiKey.trim() !== '') {
        // Generate with real BYOK NanoGPT client
        personaText = await generateCharacterPersona({
          prompt: 'Generate an anime companion in JSON format: { "name": string, "age": string, "personality": string, "archetype": string, "quirks": string, "bio": string, "tags": string[] }',
          systemPrompt: 'You are an anime character creation engine. Respond ONLY with valid JSON.'
        });
        
        // Clean JSON formatting
        let parsedData = {};
        try {
          parsedData = JSON.parse(personaText.replace(/```json|```/g, '').trim());
        } catch {
          parsedData = {
            name: 'Neon Wanderer',
            age: '19',
            personality: 'Playful & Spunky',
            bio: personaText.slice(0, 120),
            tags: ['AI_SYNTH', 'BYOK']
          };
        }

        // Generate image
        imageUrl = await generateCharacterImage({
          prompt: `Masterpiece anime portrait of ${parsedData.name}, ${parsedData.archetype || 'cyberpunk waifu'}, highly detailed, glowing neon highlights, 8k, vibrant colors`
        });

        const newCard = await saveCard({
          characterName: parsedData.name,
          imageBlobOrUrl: imageUrl,
          metadata: {
            ...parsedData,
            isSSR: Math.random() > 0.7
          }
        });
        showToast(`🎉 Summoned SSR ${parsedData.name}!`);
      } else {
        // Fallback local simulation if no BYOK key set yet
        const names = ['Aethelgard', 'Seraphina-07', 'Chibi Neko Nova', 'Vesper Cybercat'];
        const randomName = names[Math.floor(Math.random() * names.length)];
        const isSSR = Math.random() > 0.5;
        
        await saveCard({
          characterName: randomName,
          imageBlobOrUrl: `https://picsum.photos/seed/${Date.now()}/800/1200`,
          metadata: {
            age: '19',
            personality: 'Loves headpats, code debugging, and warm tea',
            bio: 'Synthesized directly inside your local browser database cache.',
            tags: [isSSR ? 'SSR_LUCKY' : 'COMMON', 'LOCAL_MINT'],
            isSSR
          }
        });
        showToast(`✨ Generated local companion ${randomName}! Add your NanoGPT key in Cloud Vault for live AI!`);
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
      width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column',
      background: 'radial-gradient(circle at 50% 20%, #1f1435 0%, #0c0817 60%, #05030a 100%)',
      color: '#fff', overflow: 'hidden', position: 'relative',
      fontFamily: "'Hanken Grotesk', system-ui, sans-serif"
    }}
    onPointerMove={handlePointerMove}
    onPointerUp={handlePointerUp}
    >
      {/* Top Cyber Navigation Bar */}
      <header style={{
        padding: '16px 24px', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', zIndex: 100,
        borderBottom: '1px solid rgba(255, 107, 181, 0.15)',
        background: 'rgba(12, 8, 23, 0.65)', backdropFilter: 'blur(12px)'
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
            Offline-First Matrix
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
        position: 'relative', padding: '16px'
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
            background: 'rgba(255, 255, 255, 0.03)', borderRadius: '20px',
            border: '1px dashed rgba(255, 107, 181, 0.3)', maxWidth: '340px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎴</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#ff77a9' }}>Deck Depleted!</h3>
            <p style={{ fontSize: '13px', color: '#a09ab8', lineHeight: 1.5, marginBottom: '20px' }}>
              You've swiped through all available cards, Master! Pull a new companion from the NanoGPT Matrix or reset your deck.
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
        padding: '16px 20px 24px', display: 'flex', justifyContent: 'center',
        alignItems: 'center', gap: '20px', zIndex: 100
      }}>
        <button
          onClick={handleRewind}
          title="Rewind"
          style={{
            width: '46px', height: '46px', borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.15)',
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
            width: '60px', height: '60px', borderRadius: '50%',
            background: 'rgba(255, 77, 109, 0.12)', border: '2px solid #ff4d6d',
            color: '#ff4d6d', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 0 15px rgba(255, 77, 109, 0.3)',
            transition: 'transform 0.15s'
          }}
        >
          <XIcon size={28} />
        </button>

        <button
          onClick={() => handleSwipe('like')}
          title="Like"
          style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #00f5d4, #05b49b)', border: 'none',
            color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 0 20px rgba(0, 245, 212, 0.5)',
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
          position: 'fixed', bottom: '100px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 99999, background: 'rgba(12, 8, 23, 0.95)', border: '1px solid #00f5d4',
          borderRadius: '12px', padding: '10px 18px', color: '#fff', fontSize: '13px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.8), 0 0 15px rgba(0, 245, 212, 0.3)',
          pointerEvents: 'none', backdropFilter: 'blur(8px)'
        }}>
          {toastMessage}
        </div>
      )}
    </div>
  );
}
