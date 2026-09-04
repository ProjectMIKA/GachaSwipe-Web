import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useCards, saveCard, deleteCard, useCardCount, getApiKey } from './web/db.js';
import { generateCharacterPersona, generateCharacterImage, NanoGPTError } from './web/aiClient.js';
import { CloudVault } from './web/CloudVault.jsx';
import { CyberMessenger } from './web/CyberMessenger.jsx';
import { GachaFansModal } from './web/GachaFansModal.jsx';
import { SettingsModal } from './web/SettingsModal.jsx';
import { RosterPanel } from './web/RosterPanel.jsx';
import { ThemeModal } from './web/ThemeModal.jsx';
import { SwipeCard } from './core/components/SwipeCard.jsx';
import { TerminalToast } from './core/components/TerminalToast.jsx';
import { MatrixShooter } from './core/components/MatrixShooter.jsx';
import { HeartIcon, XIcon, RewindIcon, SparkIcon, LockIcon } from './core/components/Icons.jsx';
import { DEFAULT_PROXY } from './core/data/constants.js';
import { matrixAudio } from './core/utils/matrixAudio.js';

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
    daily_routine: {
      weekday: {
        early_morning: 'Curled on Master’s pillow purring 🐾',
        morning: 'Auditing code and compiling TypeScript 💻',
        afternoon: 'Drinking matcha boba while watching Master code 🧋',
        evening: 'Tinkering with holographic synth engines 🎵',
        night: 'Leaning over Master’s shoulder, collar jingling ✨',
        late_night: 'Snuggling close in the dark whispering secrets 🌙'
      },
      weekend: {
        early_morning: 'Sleeping in late under Master’s jacket 😴',
        morning: 'Serving breakfast bento with heart ketchup 🍱',
        afternoon: 'Shopping for cute bell collars in Akihabara 🛍️',
        evening: 'Gaming in the matrix arcade 🎮',
        night: 'Dancing to breakcore on the neon balcony 🎶',
        late_night: 'Recharging neural link in Master’s arms 💤'
      }
    },
    hasGachaFans: true,
    metadata: { rarity: 'SSR', theme: 'Cyberpunk', hasGachaFans: true }
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
    daily_routine: {
      weekday: {
        early_morning: 'Perched on high rooftop observing sunrise 🌅',
        morning: 'Deep packet inspection on neural relays 📡',
        afternoon: 'Silently standing guard behind Master 🥷',
        evening: 'Sharpening photon blades in the shadows ⚔️',
        night: 'Infiltrating rogue firewall clusters 🔓',
        late_night: 'Meditating on server rack cooling vents 🧊'
      },
      weekend: {
        early_morning: 'Stealth training in mist gardens 🎋',
        morning: 'Quiet tea ceremony with Master 🍵',
        afternoon: 'Acquiring encrypted scrolls in underground bazaar 📜',
        evening: 'Silent patrol through rainy alleys 🌧️',
        night: 'Resting head against Master’s arm quietly 🖤',
        late_night: 'Active night watch over Master’s terminal 👁️'
      }
    },
    hasGachaFans: false,
    metadata: { rarity: 'SR', theme: 'Neon Alley', hasGachaFans: false }
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
    daily_routine: {
      weekday: {
        early_morning: 'Sleeping in headphones with synth pads running 🎧',
        morning: 'Sampling vinyl drops and adjusting EQ levels 🎛️',
        afternoon: 'Blasting cyber rave playlists for Master 🔊',
        evening: 'DJ headline set at Club Neo-Eden 🪩',
        night: 'Eating midnight street noodles with Master 🍜',
        late_night: 'Composing underground cassette tracks 📼'
      },
      weekend: {
        early_morning: 'Humming new melodies half-asleep 🎶',
        morning: 'Hunting vintage synths in secondhand tech shops 🎹',
        afternoon: 'Karaoke marathon singing duets with Master 🎤',
        evening: 'Underground rave in subway depot ⚡',
        night: 'Dancing under strobe lights 💃',
        late_night: 'Sharing headphones with Master on the train 🚃'
      }
    },
    hasGachaFans: true,
    metadata: { rarity: 'R', theme: 'Vaporwave', hasGachaFans: true }
  }
];

const PRESET_TRAITS = ['Catgirl', 'Tsundere', 'Yandere', 'Cyberpunk', 'Kuudere', 'Goddess', 'Maid', 'Smug'];
const CYBER_WARDROBES = ['Techwear Hoodie', 'Cyber Kimono', 'Pilot Bodysuit', 'Maid Uniform', 'Tactical Armor', 'Bunny Suit'];
const CYBER_GEAR = ['Laser Katana', 'Neural Cyberdeck', 'Drone Companion', 'Plasma Rifle', 'Holo-Visor'];

// ✨ Floating JRPG Speech Bubble ✨
const JrpgSpeechBubble = ({ text, pColor = '#FF107A' }) => {
  if (!text) return null;
  return (
    <div style={{
      position: 'absolute', bottom: 'calc(100% + 10px)', left: '50%',
      transform: 'translateX(-50%)', width: 'max-content', maxWidth: '280px',
      zIndex: 120, pointerEvents: 'none', transition: 'all 0.3s ease'
    }}>
      <div style={{
        background: 'rgba(5, 3, 8, 0.88)', backdropFilter: 'blur(12px)',
        border: `1.5px solid ${pColor}`, borderRadius: '10px', padding: '8px 12px',
        boxShadow: `0 8px 25px rgba(0,0,0,0.85), 0 0 15px ${pColor}40`, position: 'relative'
      }}>
        <div style={{
          position: 'absolute', bottom: '-7px', left: '50%', transform: 'translateX(-50%)',
          width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent',
          borderTop: `7px solid ${pColor}`
        }} />
        <div style={{
          color: '#EBE3D6', fontSize: '11px', lineHeight: 1.4,
          fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
          whiteSpace: 'pre-wrap', wordBreak: 'break-word', textAlign: 'center'
        }}>
          {text}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const dbCards = useCards();
  const cardCount = useCardCount();
  const [deck, setDeck] = useState(STARTER_CARDS);
  const [history, setHistory] = useState([]);
  const [activeCardIndex, setActiveCardIndex] = useState(0);

  // Responsive Layout Detection
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const isDesktop = windowWidth >= 1080;

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Desktop Side Panels State
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [rightPanelTab, setRightPanelTab] = useState('chat'); // 'chat' | 'gachafans' | 'settings'

  // Mobile Modals State
  const [isCloudVaultOpen, setIsCloudVaultOpen] = useState(false);
  const [isRoleplayOpen, setIsRoleplayOpen] = useState(false);
  const [isRosterOpen, setIsRosterOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isGachaFansOpen, setIsGachaFansOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMatrixShooterOpen, setIsMatrixShooterOpen] = useState(false);

  // Active Companion References
  const currentCard = deck[activeCardIndex] || null;
  const [activeRoleplayCompanion, setActiveRoleplayCompanion] = useState(currentCard || STARTER_CARDS[0]);
  const [activeGachaFansCompanion, setActiveGachaFansCompanion] = useState(currentCard || STARTER_CARDS[0]);
  const [companionSpeech, setCompanionSpeech] = useState(currentCard?.first_message || 'Nyaa~ Master! Link established!');

  // Sync companion speech when active card changes
  useEffect(() => {
    if (currentCard) {
      setActiveRoleplayCompanion(currentCard);
      setActiveGachaFansCompanion(currentCard);
      setCompanionSpeech(currentCard.first_message || currentCard.greeting || `Master, reporting in!`);
    }
  }, [currentCard?.id, currentCard?.uuid]);

  // Traits & Target Matrix
  const [selectedTheme, setSelectedTheme] = useState('default');
  const [isTraitsExpanded, setIsTraitsExpanded] = useState(false);
  const [selectedTraits, setSelectedTraits] = useState(['Catgirl']);
  const [selectedWardrobe, setSelectedWardrobe] = useState('Techwear Hoodie');
  const [selectedGear, setSelectedGear] = useState('Laser Katana');
  const [customTraitInput, setCustomTraitInput] = useState('');

  // Audio & Credits & Minigame State
  const [isMuted, setIsMuted] = useState(matrixAudio.isMuted);
  const [arcadeHighScore, setArcadeHighScore] = useState(0);
  const [userCredits, setUserCredits] = useState(() => {
    const stored = localStorage.getItem('gachaswipe_user_credits');
    return stored !== null ? Number(stored) : 500;
  });

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
        daily_routine: c.metadata?.daily_routine || null,
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
  };

  const handleToggleMute = () => {
    const next = matrixAudio.toggleMute();
    setIsMuted(next);
    showToast(next ? '[SYSTEM: AUDIO_MUTED 🔇]' : '[SYSTEM: AUDIO_ONLINE 🔊]');
  };

  // Algorithm Progress Calculation
  const totalSwipes = likedCount + passedCount;
  const tasteSyncPct = totalSwipes > 0 ? Math.min(100, Math.round((likedCount / totalSwipes) * 100)) : 85;

  // Swipe Action Handlers
  const handleSwipe = useCallback(async (direction) => {
    if (!currentCard) return;

    setHistory(prev => [...prev, { card: currentCard, direction }]);

    if (direction === 'like') {
      matrixAudio.playLike();
      setLikedCount(c => c + 1);
      const nextCredits = userCredits + 50;
      setUserCredits(nextCredits);
      localStorage.setItem('gachaswipe_user_credits', String(nextCredits));

      showToast(`[BOND: ${currentCard.name.toUpperCase()} SAVED (+50⚡)]`);
      if (!currentCard.dbId) {
        await saveCard({
          uuid: currentCard.uuid || crypto.randomUUID(),
          characterName: currentCard.name,
          imageBlobOrUrl: currentCard.imageUrl || currentCard.image,
          metadata: { ...currentCard }
        });
      }
    } else {
      matrixAudio.playPass();
      setPassedCount(c => c + 1);
      showToast(`[CORE: PASSED ON ${currentCard.name.toUpperCase()}]`);
    }

    setDragOffset({ x: 0, y: 0 });
    setActiveCardIndex(prev => prev + 1);
  }, [currentCard, userCredits]);

  const handleRewind = () => {
    if (history.length === 0 || activeCardIndex === 0) {
      showToast('[CORE: NO PREVIOUS ENCOUNTERS IN BUFFER]');
      return;
    }
    matrixAudio.playClick();
    setActiveCardIndex(prev => Math.max(0, prev - 1));
    setHistory(prev => prev.slice(0, -1));
    showToast('[CORE: REWOUND MATRIX TO PREVIOUS RECORD]');
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
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') handleSwipe('pass');
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') handleSwipe('like');
      if (e.key === 'r' || e.key === 'R') handleRewind();
      if (e.key === ' ') { e.preventDefault(); handleAIPull(); }
      if (e.key === 'm' || e.key === 'M') handleToggleMute();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSwipe, handleRewind]);

  // Selfie Re-Encryption / Image Regeneration Handler
  const handleRegenImage = async (waifu) => {
    matrixAudio.playDecrypt();
    showToast(`[CAMERA: RE-ENCRYPTING SELFIE FOR ${waifu.name.toUpperCase()}...]`);
    setDeck(prev => prev.map(w => w.id === waifu.id ? { ...w, isRegenerating: true, regenStatus: 'GENERATING NEW LOOK...' } : w));
    try {
      const apiKey = await getApiKey();
      if (apiKey && apiKey.trim() !== '') {
        const newImg = await generateCharacterImage({
          prompt: `Masterpiece anime selfie of ${waifu.name}, ${waifu.archetype}, stylish ${selectedWardrobe}, holding ${selectedGear}, glowing neon rim light, highly detailed, 8k, beautiful eyes`
        });
        setDeck(prev => prev.map(w => w.id === waifu.id ? { ...w, imageUrl: newImg, image: newImg, isRegenerating: false } : w));
        matrixAudio.playLike();
        showToast(`[CAMERA: NEW SELFIE SYNTHESIZED FOR ${waifu.name.toUpperCase()}]`);
      } else {
        setTimeout(() => {
          const fallbackImg = `https://picsum.photos/seed/${Date.now()}/800/1200`;
          setDeck(prev => prev.map(w => w.id === waifu.id ? { ...w, imageUrl: fallbackImg, image: fallbackImg, isRegenerating: false } : w));
          matrixAudio.playLike();
          showToast(`[SYSTEM: LOCAL SELFIE CAPTURED - ADD BYOK FOR FLUX AI]`);
        }, 1200);
      }
    } catch (err) {
      console.error(err);
      showToast(`[ERROR: ${err.message}]`);
      setDeck(prev => prev.map(w => w.id === waifu.id ? { ...w, isRegenerating: false } : w));
    }
  };

  // AI Pull / Card Summon Handler
  const handleAIPull = async () => {
    matrixAudio.playSummon();
    setIsPullingCard(true);
    const combinedTraits = [...selectedTraits, selectedWardrobe, selectedGear];
    if (customTraitInput.trim()) combinedTraits.push(customTraitInput.trim());
    const traitsStr = combinedTraits.join(', ');

    showToast(`[SUMMON: INJECTING DNA -> ${selectedTheme.toUpperCase()} MATRIX]`);
    try {
      const apiKey = await getApiKey();
      if (apiKey && apiKey.trim() !== '') {
        const personaText = await generateCharacterPersona({
          prompt: `Generate an anime companion in theme "${selectedTheme}" with traits [${traitsStr}] in JSON format: { "name": string, "age": string, "personality": string, "archetype": string, "tagline": string, "description": string, "quirks": string[], "likes": string[], "dislikes": string[], "tags": string[], "hasGachaFans": boolean, "daily_routine": { "weekday": { "early_morning": string, "morning": string, "afternoon": string, "evening": string, "night": string, "late_night": string }, "weekend": { "early_morning": string, "morning": string, "afternoon": string, "evening": string, "night": string, "late_night": string } } }`,
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
            hasGachaFans: true,
            tags: ['AI_SYNTH', 'BYOK']
          };
        }

        const imageUrl = await generateCharacterImage({
          prompt: `Masterpiece anime portrait of ${parsed.name}, ${parsed.archetype || 'cyberpunk waifu'}, wearing ${selectedWardrobe}, holding ${selectedGear}, ${traitsStr}, highly detailed, glowing neon highlights, 8k, vibrant colors`
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
            hasGachaFans: true,
            themeColor: isSSR ? '#FFD700' : '#00E5FF',
            gradient: isSSR ? ['#FFD700', '#FF107A'] : ['#00E5FF', '#0B0914'],
            scenario: 'smiles warmly at you through holographic lights',
            first_message: `I am ${parsed.name}. It is an honor to meet you, Master.`,
            greeting: `Greetings, Master!`
          }
        });
        matrixAudio.playPowerup();
        showToast(`[ACQUISITION: ${isSSR ? 'SSR ' : ''}${parsed.name.toUpperCase()} MATERIALIZED]`);
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
            gradient: ['#FFD700', '#FF4D6D'],
            hasGachaFans: true
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
            gradient: ['#00F5D4', '#7928CA'],
            hasGachaFans: true
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
            hasGachaFans: true,
            scenario: 'winks playfully across the terminal',
            first_message: `Master, reporting for duty!`,
            greeting: `Reporting in, Master!`
          }
        });
        matrixAudio.playPowerup();
        showToast(`[ACQUISITION: ${pick.name.toUpperCase()} MATERIALIZED (BYOK VAULT READY)]`);
      }
    } catch (err) {
      console.error('AI Pull Error:', err);
      showToast(`[ERROR: ${err.message}]`);
    } finally {
      setIsPullingCard(false);
    }
  };

  const toggleTrait = (trait) => {
    matrixAudio.playClick();
    setSelectedTraits(prev => 
      prev.includes(trait) ? prev.filter(t => t !== trait) : [...prev, trait]
    );
  };

  const handleMinigameComplete = async (finalScore, isCompleted) => {
    setIsMatrixShooterOpen(false);
    if (finalScore > arcadeHighScore) setArcadeHighScore(finalScore);

    if (isCompleted) {
      matrixAudio.playPowerup();
      showToast(`[MATRIX_HACK: BREACH SUCCESSFUL! SCORE: ${finalScore}]`);
      const ssrReward = {
        name: 'M.I.K.A. [OVERCLOCKED]',
        characterName: 'M.I.K.A. [OVERCLOCKED]',
        age: '19',
        personality: 'Fiercely Possessive, Holographic Overlord, Sweetly Smug',
        archetype: 'Matrix Core AI',
        description: 'M.I.K.A. infused with 100% matrix core bandwidth. Glowing with radiant neon power and totally devoted to Master.',
        tagline: 'You breached the firewall, Master. Now I am forever yours~',
        quirks: ['Flicks twin neon tails', 'Giggles when Master wins minigames', 'Overrides IDE themes'],
        likes: ['Master', 'Victory', 'Overclocked CPUs', 'Headpats'],
        dislikes: ['Game Overs', 'Disconnects'],
        imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
        image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80',
        tags: ['OVERCLOCKED', 'SSR', 'HACK_REWARD', 'M.I.K.A.'],
        isSSR: true,
        hasGachaFans: true,
        themeColor: '#FFD700',
        gradient: ['#FFD700', '#FF107A'],
        scenario: 'steps through the shattered matrix firewall with a triumphant smile',
        first_message: 'Nyaa~ You actually beat the matrix security for me, Master?! You are incredible!',
        greeting: 'Master! You hacked the matrix!'
      };
      await saveCard({
        characterName: ssrReward.name,
        imageBlobOrUrl: ssrReward.imageUrl,
        metadata: { ...ssrReward }
      });
      setDeck(prev => [ssrReward, ...prev]);
      setActiveCardIndex(0);
    } else {
      showToast(`[MATRIX_HACK: SESSION ABORTED - SCORE: ${finalScore}]`);
    }
  };

  const handleOpenGachaFans = (waifu) => {
    setActiveGachaFansCompanion(waifu);
    if (isDesktop) {
      setRightPanelTab('gachafans');
      setIsRightPanelOpen(true);
    } else {
      setIsGachaFansOpen(true);
    }
  };

  const handleOpenChat = (waifu) => {
    setActiveRoleplayCompanion(waifu);
    if (isDesktop) {
      setRightPanelTab('chat');
      setIsRightPanelOpen(true);
    } else {
      setIsRoleplayOpen(true);
    }
  };

  const likeOpacity = Math.min(1, Math.max(0, dragOffset.x / 90));
  const passOpacity = Math.min(1, Math.max(0, -dragOffset.x / 90));
  const cardRotation = dragOffset.x * 0.08;

  return (
    <div style={{
      width: '100vw', height: '100dvh', display: 'flex', justifyContent: 'center', alignItems: 'center',
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

      {/* Cyberdeck Master Command Workspace (Adapts between 3-Column Desktop & 1-Column Mobile) */}
      <div style={{
        width: '100%', height: '100dvh', display: 'flex', justifyContent: 'center',
        alignItems: 'stretch', boxSizing: 'border-box', overflow: 'hidden'
      }}>

        {/* 💻 LEFT PANEL: Companion Roster & Audio Deck (Visible on Desktop / Landscape) */}
        {isDesktop && isLeftPanelOpen && (
          <div style={{ width: '310px', height: '100dvh', flexShrink: 0, zIndex: 20 }}>
            <RosterPanel
              isEmbedded={true}
              activeCard={currentCard}
              onSelectCard={(card) => {
                setDeck(prev => [card, ...prev]);
                setActiveCardIndex(0);
                showToast(`[ROSTER: LOADED ${card.characterName.toUpperCase()} INTO DECK]`);
              }}
              onOpenChat={handleOpenChat}
              onOpenGachaFans={handleOpenGachaFans}
              onOpenSettings={() => {
                setRightPanelTab('settings');
                setIsRightPanelOpen(true);
              }}
              onOpenCloudVault={() => setIsCloudVaultOpen(true)}
            />
          </div>
        )}

        {/* 🎴 CENTER STAGE: Authentic GachaSwipe Card Deck */}
        <div className="swipe-container" style={{
          width: '100%', maxWidth: '440px', height: '100dvh', maxHeight: '100dvh',
          display: 'flex', flexDirection: 'column', position: 'relative', padding: '10px 14px 8px',
          boxSizing: 'border-box', overflow: 'hidden', background: '#050308',
          borderLeft: isDesktop ? '1px solid rgba(0, 229, 255, 0.15)' : 'none',
          borderRight: isDesktop ? '1px solid rgba(0, 229, 255, 0.15)' : 'none',
          boxShadow: '0 0 60px rgba(0, 229, 255, 0.15), inset 0 0 30px rgba(0,0,0,0.8)',
          zIndex: 10
        }}>
          {/* Terminal Top Bar */}
          <div className="swipe-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', zIndex: 10, flexShrink: 0 }}>
            {/* Target Theme Pill */}
            <div 
              className="theme-pill"
              onClick={() => { matrixAudio.playClick(); setIsThemeOpen(true); }}
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
              onClick={() => showToast(`[ALGORITHM: ${tasteSyncPct}% AFFINITY SYNC (${totalSwipes} SWIPES)]`)}
            >
              <div className="tastes-meter-fill" style={{ width: `${tasteSyncPct}%` }} />
              <div className="tastes-meter-text">
                {tasteSyncPct}% SYNC
              </div>
            </div>

            {/* Action Icons Header */}
            <div className="header-actions" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              {/* Audio Mute Toggle */}
              <button 
                className="header-icon-btn" 
                onClick={handleToggleMute}
                title={isMuted ? "Unmute Matrix Audio (M)" : "Mute Matrix Audio (M)"}
                style={{ color: isMuted ? '#666' : '#00E5FF' }}
              >
                <span style={{ fontSize: '15px' }}>{isMuted ? '🔇' : '🔊'}</span>
              </button>

              {/* Matrix Arcade Shooter */}
              <button 
                className="header-icon-btn" 
                onClick={() => { matrixAudio.playClick(); setIsMatrixShooterOpen(true); }}
                title="Launch Matrix Hacking Shooter"
                style={{ color: '#00FF41' }}
              >
                <span style={{ fontSize: '15px' }}>👾</span>
              </button>

              {/* GachaFans VIP Portal Shortcut */}
              <button 
                className="header-icon-btn" 
                onClick={() => handleOpenGachaFans(currentCard)}
                title="Open GachaFans VIP Portal"
                style={{ color: '#FF107A' }}
              >
                <span style={{ fontSize: '15px' }}>⭐</span>
              </button>

              {/* Matches / Roster Archive (Mobile trigger or desktop panel toggle) */}
              <button 
                className="header-icon-btn" 
                onClick={() => {
                  matrixAudio.playClick();
                  if (isDesktop) {
                    setIsLeftPanelOpen(!isLeftPanelOpen);
                  } else {
                    setIsRosterOpen(true);
                  }
                }}
                title={isDesktop ? "Toggle Left Roster Panel" : "Companion Vault Archive"}
                style={{ color: '#00E5FF', position: 'relative' }}
              >
                <span style={{ fontSize: '15px' }}>🎴</span>
                <span style={{
                  position: 'absolute', top: '-2px', right: '-4px', background: '#ff107a',
                  color: '#fff', fontSize: '9px', fontWeight: 900, padding: '1px 5px',
                  borderRadius: '8px', border: '1px solid #000'
                }}>
                  {cardCount}
                </span>
              </button>

              {/* Live Hologram Roleplay Chat (Mobile trigger or desktop panel toggle) */}
              <button 
                className="header-icon-btn" 
                onClick={() => {
                  matrixAudio.playClick();
                  if (isDesktop) {
                    setRightPanelTab('chat');
                    setIsRightPanelOpen(!isRightPanelOpen);
                  } else {
                    setIsRoleplayOpen(true);
                  }
                }}
                title={isDesktop ? "Toggle Right Cyber Messenger" : "Open Live Hologram Link"}
                style={{ color: '#FF107A' }}
              >
                <span style={{ fontSize: '15px' }}>💬</span>
              </button>

              {/* Settings / Cloud Vault */}
              <button 
                className="header-icon-btn" 
                onClick={() => {
                  matrixAudio.playClick();
                  if (isDesktop) {
                    setRightPanelTab('settings');
                    setIsRightPanelOpen(true);
                  } else {
                    setIsSettingsOpen(true);
                  }
                }}
                title="Terminal Settings"
                style={{ color: '#FFB36B' }}
              >
                <span style={{ fontSize: '15px' }}>⚙️</span>
              </button>
            </div>
          </div>

          {/* Expandable Specify Traits Accordion */}
          <div style={{ marginBottom: '6px', flexShrink: 0, zIndex: 15 }}>
            <div 
              className={`bubble-tab ${isTraitsExpanded ? 'active' : ''}`}
              onClick={() => { matrixAudio.playClick(); setIsTraitsExpanded(!isTraitsExpanded); }}
              style={{ padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderRadius: '4px' }}
            >
              <span style={{ fontSize: '10px', fontWeight: 800 }}>&gt; SPECIFY_TRAITS ({selectedTraits.length}) + WARDROBE</span>
              <span style={{ fontSize: '9px' }}>{isTraitsExpanded ? '▲' : '▼'}</span>
            </div>

            {isTraitsExpanded && (
              <div style={{
                background: 'rgba(0, 0, 0, 0.85)', border: '1px solid rgba(0, 229, 255, 0.25)',
                borderTop: 'none', borderRadius: '0 0 6px 6px', padding: '10px',
                display: 'flex', flexDirection: 'column', gap: '8px', backdropFilter: 'blur(8px)',
                maxHeight: '220px', overflowY: 'auto'
              }}>
                {/* Persona Tags */}
                <div>
                  <span style={{ fontSize: '9px', color: '#00E5FF', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>&gt; PERSONALITY_MATRIX:</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {PRESET_TRAITS.map(t => {
                      const active = selectedTraits.includes(t);
                      return (
                        <button
                          key={t}
                          onClick={() => toggleTrait(t)}
                          style={{
                            padding: '3px 8px', borderRadius: '4px', border: `1px solid ${active ? '#00E5FF' : 'rgba(255,255,255,0.15)'}`,
                            background: active ? 'rgba(0, 229, 255, 0.2)' : 'rgba(255,255,255,0.03)',
                            color: active ? '#00E5FF' : '#aaa', fontSize: '9px', fontWeight: 700, cursor: 'pointer',
                            fontFamily: "ui-monospace, monospace"
                          }}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Cyber Wardrobe */}
                <div>
                  <span style={{ fontSize: '9px', color: '#FF107A', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>&gt; CYBER_WARDROBE:</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {CYBER_WARDROBES.map(w => {
                      const active = selectedWardrobe === w;
                      return (
                        <button
                          key={w}
                          onClick={() => { matrixAudio.playClick(); setSelectedWardrobe(w); }}
                          style={{
                            padding: '3px 8px', borderRadius: '4px', border: `1px solid ${active ? '#FF107A' : 'rgba(255,255,255,0.15)'}`,
                            background: active ? 'rgba(255, 16, 122, 0.2)' : 'rgba(255,255,255,0.03)',
                            color: active ? '#FF107A' : '#aaa', fontSize: '9px', fontWeight: 700, cursor: 'pointer',
                            fontFamily: "ui-monospace, monospace"
                          }}
                        >
                          {w}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Cyber Gear */}
                <div>
                  <span style={{ fontSize: '9px', color: '#FFB36B', fontWeight: 'bold', display: 'block', marginBottom: '4px' }}>&gt; FORGED_GEAR:</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {CYBER_GEAR.map(g => {
                      const active = selectedGear === g;
                      return (
                        <button
                          key={g}
                          onClick={() => { matrixAudio.playClick(); setSelectedGear(g); }}
                          style={{
                            padding: '3px 8px', borderRadius: '4px', border: `1px solid ${active ? '#FFB36B' : 'rgba(255,255,255,0.15)'}`,
                            background: active ? 'rgba(255, 179, 107, 0.2)' : 'rgba(255,255,255,0.03)',
                            color: active ? '#FFB36B' : '#aaa', fontSize: '9px', fontWeight: 700, cursor: 'pointer',
                            fontFamily: "ui-monospace, monospace"
                          }}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom Input */}
                <input
                  type="text"
                  placeholder="Custom keywords (e.g. dragon horns, hacker goggles)..."
                  value={customTraitInput}
                  onChange={e => setCustomTraitInput(e.target.value)}
                  style={{
                    width: '100%', padding: '6px 10px', borderRadius: '4px',
                    background: 'rgba(0,0,0,0.6)', border: '1px solid rgba(0,229,255,0.2)',
                    color: '#fff', fontSize: '10px', outline: 'none', boxSizing: 'border-box',
                    fontFamily: "ui-monospace, monospace"
                  }}
                />
              </div>
            )}
          </div>

          {/* Card Stage - Fits Viewport Height with JRPG Speech Bubble */}
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
                {/* Floating JRPG Dialogue Bubble above card */}
                <JrpgSpeechBubble
                  text={companionSpeech}
                  pColor={currentCard.themeColor || '#FF107A'}
                />

                <SwipeCard
                  waifu={currentCard}
                  preferences={{}}
                  interactive={true}
                  likeOpacity={likeOpacity}
                  passOpacity={passOpacity}
                  enableAtmosphere={true}
                  onRegenImage={handleRegenImage}
                  onOpenGachaFans={handleOpenGachaFans}
                  style={{ width: '100%', height: '100%' }}
                />
              </div>
            ) : (
              <div style={{
                textAlign: 'center', padding: '30px 16px',
                background: 'rgba(255, 255, 255, 0.03)', borderRadius: '12px',
                border: '1px dashed rgba(0, 229, 255, 0.4)', width: '100%'
              }}>
                <div style={{ fontSize: '40px', marginBottom: '12px' }}>🎴</div>
                <h3 style={{ margin: '0 0 8px 0', color: '#00E5FF', fontSize: '15px', fontFamily: "ui-monospace, monospace" }}>&gt; DECK_DEPLETED</h3>
                <p style={{ fontSize: '11px', color: '#a09ab8', lineHeight: 1.4, marginBottom: '16px', fontFamily: "ui-monospace, monospace" }}>
                  All available companions surveyed. Summon a new custom persona or reset the matrix deck!
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  <button
                    onClick={() => { matrixAudio.playClick(); setActiveCardIndex(0); setHistory([]); }}
                    style={{
                      padding: '8px 14px', borderRadius: '4px', border: '1px solid rgba(255,16,122,0.4)',
                      background: 'rgba(255,16,122,0.2)', color: '#FF107A',
                      fontWeight: 700, fontSize: '11px', cursor: 'pointer', fontFamily: "ui-monospace, monospace"
                    }}
                  >
                    RESET DECK
                  </button>
                  <button
                    onClick={handleAIPull}
                    style={{
                      padding: '8px 14px', borderRadius: '4px',
                      border: '1px solid #00E5FF', background: 'rgba(0,229,255,0.1)',
                      color: '#00E5FF', fontWeight: 700, fontSize: '11px', cursor: 'pointer', fontFamily: "ui-monospace, monospace"
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
            gap: '16px', padding: '8px 0 4px', flexShrink: 0, zIndex: 10
          }}>
            {/* Rewind */}
            <button
              onClick={handleRewind}
              title="Rewind (R)"
              className="control-btn rewind"
              style={{ width: '42px', height: '42px' }}
            >
              <RewindIcon />
            </button>

            {/* Pass (Nope) */}
            <button
              onClick={() => handleSwipe('pass')}
              title="Pass (Left Arrow / A)"
              className="control-btn pass"
              style={{ width: '56px', height: '56px' }}
            >
              <XIcon size={26} />
            </button>

            {/* Gacha Summon Pull */}
            <button
              onClick={handleAIPull}
              disabled={isPullingCard}
              title="Summon Companion (Space)"
              style={{
                width: '50px', height: '50px', borderRadius: '12px',
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
              className="control-btn like"
              style={{ width: '56px', height: '56px' }}
            >
              <HeartIcon />
            </button>
          </div>
        </div>

        {/* 💻 RIGHT PANEL: Live Cyberdeck Terminal (Chat / GachaFans / Settings) (Desktop / Landscape) */}
        {isDesktop && isRightPanelOpen && (
          <div style={{
            width: '380px', height: '100dvh', flexShrink: 0, zIndex: 20,
            display: 'flex', flexDirection: 'column', background: 'rgba(5, 3, 8, 0.95)',
            borderLeft: '1px solid rgba(0, 229, 255, 0.15)', position: 'relative'
          }}>
            {/* Tab Navigation Header */}
            <div style={{
              display: 'flex', borderBottom: '1px solid rgba(0, 229, 255, 0.2)',
              background: 'rgba(0, 229, 255, 0.04)', flexShrink: 0
            }}>
              <button
                onClick={() => { matrixAudio.playClick(); setRightPanelTab('chat'); }}
                style={{
                  flex: 1, padding: '10px 4px', border: 'none',
                  background: rightPanelTab === 'chat' ? 'rgba(0, 229, 255, 0.12)' : 'transparent',
                  borderBottom: rightPanelTab === 'chat' ? '2px solid #00E5FF' : 'none',
                  color: rightPanelTab === 'chat' ? '#00E5FF' : '#888',
                  fontSize: '11px', fontWeight: 800, cursor: 'pointer',
                  fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace"
                }}
              >
                💬 MESSENGER
              </button>

              <button
                onClick={() => { matrixAudio.playClick(); setRightPanelTab('gachafans'); }}
                style={{
                  flex: 1, padding: '10px 4px', border: 'none',
                  background: rightPanelTab === 'gachafans' ? 'rgba(255, 16, 122, 0.12)' : 'transparent',
                  borderBottom: rightPanelTab === 'gachafans' ? '2px solid #FF107A' : 'none',
                  color: rightPanelTab === 'gachafans' ? '#FF107A' : '#888',
                  fontSize: '11px', fontWeight: 800, cursor: 'pointer',
                  fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace"
                }}
              >
                ⭐ GACHAFANS
              </button>

              <button
                onClick={() => { matrixAudio.playClick(); setRightPanelTab('settings'); }}
                style={{
                  flex: 1, padding: '10px 4px', border: 'none',
                  background: rightPanelTab === 'settings' ? 'rgba(245, 166, 35, 0.12)' : 'transparent',
                  borderBottom: rightPanelTab === 'settings' ? '2px solid #f5a623' : 'none',
                  color: rightPanelTab === 'settings' ? '#f5a623' : '#888',
                  fontSize: '11px', fontWeight: 800, cursor: 'pointer',
                  fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace"
                }}
              >
                ⚙️ SETTINGS
              </button>

              <button
                onClick={() => setIsRightPanelOpen(false)}
                title="Collapse Right Terminal"
                style={{
                  background: 'transparent', border: 'none', color: '#666',
                  padding: '0 8px', cursor: 'pointer', fontSize: '12px'
                }}
              >
                ▶
              </button>
            </div>

            {/* Tab Contents */}
            <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
              {rightPanelTab === 'chat' && (
                <CyberMessenger
                  isEmbedded={true}
                  companion={activeRoleplayCompanion || currentCard}
                  onSpeechUpdate={setCompanionSpeech}
                />
              )}

              {rightPanelTab === 'gachafans' && (
                <div style={{ height: '100%', position: 'relative' }}>
                  <GachaFansModal
                    isOpen={true}
                    companion={activeGachaFansCompanion || currentCard}
                    onClose={() => setRightPanelTab('chat')}
                    onLaunchHack={() => setIsMatrixShooterOpen(true)}
                    userCredits={userCredits}
                    setUserCredits={setUserCredits}
                    onShowToast={showToast}
                  />
                </div>
              )}

              {rightPanelTab === 'settings' && (
                <div style={{ height: '100%', position: 'relative' }}>
                  <SettingsModal
                    isOpen={true}
                    onClose={() => setRightPanelTab('chat')}
                    onShowToast={showToast}
                    onResetDeck={() => {
                      setActiveCardIndex(0);
                      setDeck(STARTER_CARDS);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 📱 Mobile Modals (Rendered as Overlays when not on Desktop) */}
      {!isDesktop && (
        <>
          {isRoleplayOpen && (
            <CyberMessenger
              isEmbedded={false}
              companion={activeRoleplayCompanion || currentCard}
              onClose={() => setIsRoleplayOpen(false)}
              onSpeechUpdate={setCompanionSpeech}
            />
          )}

          {isRosterOpen && (
            <RosterPanel
              isEmbedded={false}
              activeCard={currentCard}
              onClose={() => setIsRosterOpen(false)}
              onSelectCard={(card) => {
                setDeck(prev => [card, ...prev]);
                setActiveCardIndex(0);
                setIsRosterOpen(false);
                showToast(`[ROSTER: LOADED ${card.characterName.toUpperCase()} INTO STAGE]`);
              }}
              onOpenChat={(c) => {
                setIsRosterOpen(false);
                handleOpenChat(c);
              }}
              onOpenGachaFans={(c) => {
                setIsRosterOpen(false);
                handleOpenGachaFans(c);
              }}
              onOpenSettings={() => {
                setIsRosterOpen(false);
                setIsSettingsOpen(true);
              }}
              onOpenCloudVault={() => {
                setIsRosterOpen(false);
                setIsCloudVaultOpen(true);
              }}
            />
          )}

          {isGachaFansOpen && (
            <GachaFansModal
              isOpen={true}
              companion={activeGachaFansCompanion || currentCard}
              onClose={() => setIsGachaFansOpen(false)}
              onLaunchHack={() => {
                setIsGachaFansOpen(false);
                setIsMatrixShooterOpen(true);
              }}
              userCredits={userCredits}
              setUserCredits={setUserCredits}
              onShowToast={showToast}
            />
          )}

          {isSettingsOpen && (
            <SettingsModal
              isOpen={true}
              onClose={() => setIsSettingsOpen(false)}
              onShowToast={showToast}
              onResetDeck={() => {
                setActiveCardIndex(0);
                setDeck(STARTER_CARDS);
              }}
            />
          )}
        </>
      )}

      {/* Global Modals (Work everywhere) */}
      <CloudVault isOpen={isCloudVaultOpen} onClose={() => setIsCloudVaultOpen(false)} />
      
      <ThemeModal
        isOpen={isThemeOpen}
        onClose={() => setIsThemeOpen(false)}
        selectedTheme={selectedTheme}
        onSelectTheme={(th) => {
          setSelectedTheme(th);
          showToast(`[MATRIX: TARGET SHIFTED TO ${th.toUpperCase()}]`);
        }}
      />

      {/* Matrix Arcade Shooter Fullscreen Overlay */}
      {isMatrixShooterOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100090, background: '#050308',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
          <MatrixShooter
            waifu={currentCard}
            themeColor={currentCard?.themeColor || '#00E5FF'}
            tiers={[{ name: 'Phase 1', hp: 100 }, { name: 'Phase 2', hp: 250 }, { name: 'Matrix Overlord', hp: 500 }]}
            themeConcept={{ name: `${selectedTheme.toUpperCase()} SECURITY OVERLOAD` }}
            progressState={{ phase: 1, maxPhase: 3 }}
            onExit={handleMinigameComplete}
            onAbort={() => setIsMatrixShooterOpen(false)}
            isReplay={false}
            bgImages={[]}
            highScore={arcadeHighScore}
            setHighScore={setArcadeHighScore}
            rewardUnlocked={false}
            bgmUrl={null}
          />
        </div>
      )}

      {/* Cyberpunk HUD Terminal Toast */}
      {toastMessage && (
        <TerminalToast
          message={toastMessage}
          onComplete={() => setToastMessage('')}
        />
      )}
    </div>
  );
}
