import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useCards, saveCard, deleteCard, useCardCount, getApiKey, useTapes, saveTape } from './web/db.js';
import { generateCharacterPersona, generateCharacterImage, NanoGPTError } from './web/aiClient.js';
import { LaylaWebSDK } from './web/laylaWebAdapter.js';
import { CloudVault } from './web/CloudVault.jsx';
import { CyberMessenger } from './web/CyberMessenger.jsx';
import { CyberGroupChat } from './web/CyberGroupChat.jsx';
import { GachaFansModal } from './web/GachaFansModal.jsx';
import { SettingsModal } from './web/SettingsModal.jsx';
import { RosterPanel } from './web/RosterPanel.jsx';
import { ThemeModal } from './web/ThemeModal.jsx';
import { SwipeCard } from './core/components/SwipeCard.jsx';
import { LoadingCard } from './core/components/LoadingCard.jsx';
import { TerminalToast } from './core/components/TerminalToast.jsx';
import { MatrixShooter } from './core/components/MatrixShooter.jsx';
import { GlobalMusicPlayer } from './core/components/GlobalMusicPlayer.jsx';
import { ChimeraEngine } from './core/components/ChimeraEngine.jsx';
import {
  HeartIcon,
  XIcon,
  RewindIcon,
  SparkIcon,
  LockIcon,
  UserIcon,
  MusicIcon,
  PlayIcon,
  PauseIcon
} from './core/components/Icons.jsx';
import { DEFAULT_PROXY, DEFAULT_THEMES, MUSIC_TAG_DB, GRADIENTS } from './core/data/constants.js';
import { matrixAudio } from './core/utils/matrixAudio.js';

// Ensure Web Layla SDK is globally initialized
if (typeof window !== 'undefined' && !window.layla) {
  window.LaylaSDK = LaylaWebSDK;
  window.layla = new LaylaWebSDK();
}

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
    daily_routine: {
      weekday: {
        early_morning: 'Curled on Master’s pillow purring 🐾',
        morning: 'Auditing code and compiling TypeScript 💻',
        afternoon: 'Drinking matcha boba while watching Master code 🧋',
        evening: 'Tinkering with holographic synth engines 🎵',
        night: 'Leaning over Master’s shoulder, collar jingling ✨',
        late_night: 'Snuggling close in the dark whispering secrets 🌙'
      }
    }
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
    greeting: 'Target acquired.'
  }
];

export default function App() {
  // --- 1. CORE DECK & QUEUE STATE ---
  const [queue, setQueue] = useState(STARTER_CARDS);
  const [beatQueue, setBeatQueue] = useState([]);
  const [swipeMode, setSwipeMode] = useState('dating'); // 'dating' | 'music'
  const [sessionHistory, setSessionHistory] = useState([]);
  const [inbox, setInbox] = useState({
    'mika-prime': {
      waifu: STARTER_CARDS[0],
      status: 'friend',
      hasUnread: false,
      messages: [{ role: 'assistant', content: 'Nyaa~ Master! Welcome to our matrix!', timestamp: Date.now() }]
    }
  });

  // User Stats & Currency
  const [swipes, setSwipes] = useState(159);
  const [sparkTokens, setSparkTokens] = useState(142);
  const [preferences, setPreferences] = useState({ cyberpunk: 5, catgirl: 3 });
  const [ssrPityCount, setSsrPityCount] = useState(0);
  const [lastSwipedImage, setLastSwipedImage] = useState(null);

  // Themes & Context
  const [themes, setThemes] = useState(DEFAULT_THEMES);
  const [selectedThemeId, setSelectedThemeId] = useState('default');
  const [selectedContext, setSelectedContext] = useState('Tsundere');
  const [isSurpriseMode, setIsSurpriseMode] = useState(false);

  // Generation & Pipeline Lock
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentGeneration, setCurrentGeneration] = useState(null);
  const processingCardsRef = useRef(new Set());
  const activeStreamRef = useRef(null);
  const activeImageAbortRef = useRef(null);

  // --- 2. SWIPE 3D PHYSICS & POINTER MATH ---
  const [isDragging, setIsDragging] = useState(false);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const dragStart = useRef(null);

  // Layout & 3-Panel Visibility States
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024);
  const [isLeftPanelOpen, setIsLeftPanelOpen] = useState(true);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [rightPanelTab, setRightPanelTab] = useState('chat'); // 'chat' | 'group' | 'gachafans' | 'settings'

  const [activeRoleplayCompanion, setActiveRoleplayCompanion] = useState(STARTER_CARDS[0]);
  const [activeGachaFansCompanion, setActiveGachaFansCompanion] = useState(STARTER_CARDS[0]);

  // Modals & Overlays
  const [isRoleplayOpen, setIsRoleplayOpen] = useState(false);
  const [isRosterOpen, setIsRosterOpen] = useState(false);
  const [isGachaFansOpen, setIsGachaFansOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCloudVaultOpen, setIsCloudVaultOpen] = useState(false);
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [isMatrixShooterOpen, setIsMatrixShooterOpen] = useState(false);
  const [arcadeHighScore, setArcadeHighScore] = useState(1250);
  const [toastMessage, setToastMessage] = useState('');

  // Music & DAW State
  const [isDawOpen, setIsDawOpen] = useState(false);
  const [activeTape, setActiveTape] = useState(null);
  const [dawState, setDawState] = useState({
    phase: 'active',
    tags: 'cyberpunk, synthwave, 128 bpm, female vocals',
    lyrics: '[CHORUS]\nNeon rain falling on my chrome wings\nMatrix whispers in the static',
    bpm: 128,
    duration: 60,
    isStructuredTags: false,
    isStructuredLyrics: false,
    isGenerating: false,
    progress: 0
  });

  const showToast = useCallback((msg) => {
    setToastMessage(msg);
  }, []);

  // Responsive resize watcher
  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      if (desktop) {
        setIsLeftPanelOpen(true);
        setIsRightPanelOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- 3. EXACT SWIPE MATH & POINTER HANDLERS ---
  const activeDeck = swipeMode === 'music' ? beatQueue : queue;
  const currentCard = activeDeck[0] || null;

  const onPointerDown = (e) => {
    const activeDeck = swipeMode === 'music' ? beatQueue : queue;
    if (activeDeck.length === 0) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}
  };

  const onPointerMove = (e) => {
    if (!isDragging || !dragStart.current) return;
    setDragPos({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const onPointerUp = (e) => {
    if (dragStart.current) {
      setIsDragging(false);
      dragStart.current = null;
      if (dragPos.x > 110) {
        setDragPos({ x: 0, y: 0 });
        swipeMode === 'music' ? handleMusicSwipe('right', beatQueue[0]) : processSwipe('right', queue[0]);
      } else if (dragPos.x < -110) {
        setDragPos({ x: 0, y: 0 });
        swipeMode === 'music' ? handleMusicSwipe('left', beatQueue[0]) : processSwipe('left', queue[0]);
      } else {
        setDragPos({ x: 0, y: 0 });
      }
    }
  };

  // Holographic 3D Transform math
  const dragX = dragPos.x / 110;
  const passOpacity = dragX < 0 ? Math.abs(dragX) : 0;
  const likeOpacity = dragX > 0 ? dragX : 0;
  const rotation = dragPos.x * 0.06;
  const rotateY = dragPos.x * 0.08;
  const rotateX = -dragPos.y * 0.08;

  // Sync Meter progress
  const meterProgress = Math.min(100, Math.floor((swipes % 15) * (100 / 15)));
  let syncText = 'ANALYZING';
  let syncColor = '#FF107A';
  if (meterProgress >= 75) {
    syncText = 'FOCUSED';
    syncColor = '#00E5FF';
  } else if (meterProgress >= 40) {
    syncText = 'LEARNING';
    syncColor = '#00FF9D';
  } else if (meterProgress >= 20) {
    syncText = 'CURIOUS';
    syncColor = '#FFD700';
  }

  // --- 4. SWIPE PROCESSING & CHARACARDV2 STORAGE ---
  const processSwipe = async (direction, waifu) => {
    if (!waifu) return;
    if (processingCardsRef.current.has(waifu.id)) return;
    processingCardsRef.current.add(waifu.id);

    try {
      // Duplicate Ghost Guard
      const isDuplicate = sessionHistory.some(
        (h) => h.waifu?.name === waifu.name && h.waifu?.description === waifu.description
      );
      if (isDuplicate) {
        setQueue((prev) => prev.slice(1));
        return;
      }

      // Catfish Reveal Mechanic
      let finalWaifu = waifu;
      if (waifu.isCatfish && direction === 'right') {
        finalWaifu = waifu.originalWaifu || waifu;
        showToast('🥸 You saw right through her disguise! Saved ' + finalWaifu.name + ' instead! 💖');
      }

      setSwipes((s) => s + 1);
      setSparkTokens((s) => s + 1);
      setLastSwipedImage(finalWaifu.imageUrl || finalWaifu.image || null);

      setSessionHistory((prev) => [
        ...prev,
        { name: finalWaifu.name, status: direction === 'right' ? 'approved' : 'rejected', waifu: finalWaifu }
      ]);

      if (direction === 'right') {
        matrixAudio.playLike();
        setPreferences((prev) => {
          const next = { ...prev };
          (finalWaifu.tags || []).forEach((t) => {
            const clean = t.replace(/\s*\(.*?\)\s*/g, '').trim().toLowerCase();
            if (clean) next[clean] = (next[clean] || 0) + 1;
          });
          return next;
        });

        // Store CharaCardV2 in Dexie Offline-first Database
        const charData = {
          id: finalWaifu.id || 'swipe_match_' + Date.now(),
          spec: 'chara_card_v2',
          spec_version: '2.0',
          data: {
            name: finalWaifu.name || 'Unknown',
            description: finalWaifu.description || '',
            personality: finalWaifu.personality || '',
            scenario: finalWaifu.scenario || '',
            first_mes: finalWaifu.first_message || finalWaifu.greeting || '',
            tags: finalWaifu.tags || [],
            creator: 'GachaSwipe Web',
            character_version: '2.0',
            extensions: {
              image: finalWaifu.imageUrl || finalWaifu.image || '',
              laylaSwipe: {
                likes: finalWaifu.likes || [],
                dislikes: finalWaifu.dislikes || [],
                quirks: finalWaifu.quirks || [],
                isSSR: !!finalWaifu.isSSR
              }
            }
          }
        };

        try {
          await saveCard({
            uuid: charData.id,
            characterName: finalWaifu.name,
            imageBlobOrUrl: finalWaifu.imageUrl || finalWaifu.image,
            metadata: charData
          });
        } catch (e) {
          console.error('Failed to save match to Dexie:', e);
        }

        // Add to live Inbox
        setInbox((prev) => ({
          ...prev,
          [finalWaifu.id]: {
            waifu: finalWaifu,
            status: 'friend',
            hasUnread: true,
            messages: [
              {
                role: 'assistant',
                content: finalWaifu.first_message || finalWaifu.greeting || 'Hey Master! Glad we matched! 💕',
                timestamp: Date.now()
              }
            ]
          }
        }));

        setActiveRoleplayCompanion(finalWaifu);
        showToast('[MATCH ACQUIRED: ' + (finalWaifu.name || 'WAIFU').toUpperCase() + '] 💕');
      } else {
        matrixAudio.playPass();
        showToast('[TARGET PASSED: ' + (waifu.name || 'TARGET').toUpperCase() + '] 💔');
      }

      setQueue((prev) => prev.slice(1));
    } finally {
      setTimeout(() => {
        processingCardsRef.current.delete(waifu.id);
      }, 400);
    }
  };

  // --- 5. REWIND SWIPE WITH STRICT RULES ---
  const rewindSwipe = () => {
    if (sessionHistory.length === 0) {
      showToast('No history to rewind! 🐾');
      return;
    }
    const lastHistory = sessionHistory[sessionHistory.length - 1];

    if (lastHistory.status !== 'rejected') {
      showToast("You can't rewind a Match! She's already in your Inbox! 💕");
      return;
    }
    if (queue.length > 0 && queue[0].isRewound) {
      showToast('You can only rewind one card at a time! 🐾');
      return;
    }
    if (lastHistory.waifu?.isRewound) {
      showToast('You already gave her a second chance! 🐾');
      return;
    }

    setSessionHistory((prev) => prev.slice(0, -1));
    setSwipes((s) => Math.max(0, s - 1));
    if (lastHistory.waifu) {
      const rewoundWaifu = { ...lastHistory.waifu, isRewound: true };
      setQueue((prev) => [rewoundWaifu, ...prev]);
      showToast('⏪ Card returned to stage: ' + rewoundWaifu.name);
    }
    setDragPos({ x: 0, y: 0 });
  };

  // --- 6. DUAL-MODE MUSIC SWIPE & DAW ---
  const handleMusicSwipe = (direction, concept) => {
    if (!concept) return;
    if (direction === 'right') {
      matrixAudio.playLike();
      const bpmMatch = (concept.bpm || '').match(/\d+/);
      const bpm = bpmMatch ? parseInt(bpmMatch[0], 10) : 124;

      setDawState({
        phase: 'active',
        concept,
        tags: concept.promptPayload || concept.tags || 'cyberpunk, synthwave',
        lyrics: concept.fullLyrics || concept.lyrics || '[CHORUS]\nNeon city dreams in chrome',
        bpm,
        duration: 60,
        isStructuredTags: true,
        isStructuredLyrics: true,
        isGenerating: false,
        progress: 0
      });
      setIsDawOpen(true);
      showToast('🎵 [LAUNCHING ACE-STEP DAW WORKSPACE]');
    } else {
      matrixAudio.playPass();
      showToast('Track concept discarded.');
    }
    setBeatQueue((prev) => prev.slice(1));
  };

  // Generate Music Concepts
  const generateSongConcepts = useCallback(async () => {
    const concepts = [
      {
        id: 'beat_' + Date.now(),
        name: 'Cyber City Overdrive',
        bpm: '128 BPM',
        genre: 'Cyberpunk Electro',
        themeColor: '#00E5FF',
        promptPayload: 'electro, synthwave, 128 bpm, hard bass, cyberpunk',
        fullLyrics: '[INTRO]\nSystems boot\n[CHORUS]\nDancing on the edge of the neon grid\nElectric pulse inside my veins'
      },
      {
        id: 'beat_' + (Date.now() + 1),
        name: 'Neon Cherry Blossom',
        bpm: '140 BPM',
        genre: 'J-Pop Breakcore',
        themeColor: '#FF107A',
        promptPayload: 'j-pop, breakcore, 140 bpm, fast drums, hyper energetic',
        fullLyrics: '[VERSE 1]\nLate night Akihabara rain\n[CHORUS]\nCatch my heart before the server drops!'
      }
    ];
    setBeatQueue(concepts);
  }, []);

  // --- 7. MODULAR CARD GENERATOR (Faithful Pipeline) ---
  const generateNextWaifu = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setCurrentGeneration({
      phase: 'profile',
      responseText: '',
      imageStatus: '',
      imageStep: 0,
      imageTotalSteps: 1,
      error: null
    });

    try {
      const isSSR = Math.random() < 0.2 || ssrPityCount >= 9;
      if (isSSR) setSsrPityCount(0);
      else setSsrPityCount((c) => c + 1);

      const layla = window.layla || new LaylaWebSDK();

      // Assemble dynamic prompt
      const systemPrompt = 'You are the GachaSwipe Character Generation Engine. Generate a charismatic anime character conforming strictly to XML tags.';
      const userPrompt = '[INCOMING_DATA_PAYLOAD]\n' +
        'ARCHETYPE_LOCK: ' + selectedContext + '\n' +
        'SSR_RARITY_FLAG: ' + (isSSR ? 'SSR_5_STAR_FATED_ENCOUNTER' : 'STANDARD_ENCOUNTER') + '\n' +
        '[EXECUTION: Output XML only. Start directly with <name>.]\n' +
        'Format:\n' +
        '<name>Character Name</name>\n' +
        '<age>18-22</age>\n' +
        '<tagline>Short cool bio tagline</tagline>\n' +
        '<description>Third-person character backstory and vibe</description>\n' +
        '<personality>Personality traits</personality>\n' +
        '<scenario>Opening roleplay scene</scenario>\n' +
        '<first_message>First direct message to user</first_message>\n' +
        '<tags>TAG1, TAG2, TAG3</tags>\n' +
        '<likes>Like1, Like2</likes>\n' +
        '<dislikes>Dislike1, Dislike2</dislikes>\n' +
        '<quirks>Quirk1, Quirk2</quirks>\n' +
        '<quotes>Sample dialogue quote</quotes>\n' +
        '<species_tags>1girl, human</species_tags>\n' +
        '<hair_color>hair color</hair_color>\n' +
        '<hair_style>hair style</hair_style>\n' +
        '<eyes>eye color</eyes>\n' +
        '<body_tags>body type</body_tags>\n' +
        '<outfit>clothing description</outfit>\n' +
        '<pose_and_expression>pose and facial expression</pose_and_expression>\n' +
        '<environment>background scenery</environment>';

      // Stream chat completion
      const stream = layla.chat.completions.stream({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ]
      });

      activeStreamRef.current = stream;

      const extractThoughts = (text) => {
        if (!text) return { clean: '', thought: '' };
        let thoughtStr = '';
        let clean = text;
        const closedRegex = /<(?:think|thought|\|?channel\|?>?\s*thought)\b>?([\s\S]*?)(?:<\/(?:think|thought|channel)>|<\|?end_of_thought\|?>|<channel\|?>|<\|?channel\|?>?\s*(?:model|assistant|bot|message))/gi;
        clean = clean.replace(closedRegex, (m, p1) => { thoughtStr += p1 + '\n'; return ''; });
        const openRegex = /<(?:think|thought|\|?channel\|?>?\s*thought)\b>?([\s\S]*)$/gi;
        clean = clean.replace(openRegex, (m, p1) => { thoughtStr += p1 + '\n'; return ''; });
        clean = clean.replace(/<[^>]*$/g, '');
        return { clean: clean.trim(), thought: thoughtStr.trim() };
      };

      stream.on('content', (delta, snapshot) => {
        const extracted = extractThoughts(snapshot);
        setCurrentGeneration((prev) => (prev ? { ...prev, streamedContent: extracted.clean, thinkingContent: extracted.thought } : prev));
      });

      const rawContent = await stream.finalContent();
      activeStreamRef.current = null;

      const { clean: cleanContent } = extractThoughts(rawContent);

      const extract = (tag) => {
        const strictRegex = new RegExp('<' + tag + '>([\\s\\S]*?)</' + tag + '>', 'i');
        const match = cleanContent.match(strictRegex);
        if (match) return match[1].trim();
        const looseRegex = new RegExp('<' + tag + '>([\\s\\S]*?)(?=<[a-zA-Z/]+>|$)', 'i');
        const looseMatch = cleanContent.match(looseRegex);
        return looseMatch ? looseMatch[1].trim() : '';
      };

      const extractArray = (tag) => {
        const str = extract(tag);
        if (!str) return [];
        if (str.includes('|')) return str.split('|').map((s) => s.replace(/^[-*•\d.]\s*/, '').trim()).filter(Boolean);
        if (str.includes('\n')) return str.split('\n').map((s) => s.replace(/^[-*•\d.]\s*/, '').trim()).filter(Boolean);
        return str.split(/[,;]+/).map((s) => s.trim()).filter(Boolean);
      };

      const extractedName = extract('name');
      const extractedDesc = extract('description');

      if (!extractedName && !extractedDesc) {
        throw new Error('CatfishTrigger');
      }

      const coreApp = [extract('species_tags') || '1girl', extract('hair_color'), extract('hair_style'), extract('eyes')].filter(Boolean).join(', ');
      const dynStyle = [extract('outfit'), extract('pose_and_expression'), extract('environment')].filter(Boolean).join(', ');

      const newWaifu = {
        id: 'swipe-' + Date.now(),
        uuid: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'uuid-' + Date.now(),
        name: extractedName || 'Kira',
        characterName: extractedName || 'Kira',
        age: extract('age') || '19',
        tagline: extract('tagline') || 'A wandering cyber nomad.',
        description: extractedDesc || 'She regards you quietly from the shadows.',
        personality: extract('personality') || 'Playful and secretive.',
        scenario: extract('scenario') || 'approaches you with a curious tilt of her head',
        first_message: extract('first_message') || 'Hey there. Decrypting my signal was bold of you.',
        greeting: extract('first_message') || 'Hey there.',
        tags: extractArray('tags').slice(0, 6),
        likes: extractArray('likes').slice(0, 5),
        dislikes: extractArray('dislikes').slice(0, 5),
        quirks: extractArray('quirks').slice(0, 4),
        quotes: extractArray('quotes').slice(0, 2),
        isSSR,
        gradient: GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)],
        themeColor: isSSR ? '#FFD700' : '#00E5FF',
        hasGachaFans: Math.random() < 0.25
      };

      setCurrentGeneration((prev) => ({ ...prev, phase: 'image', parsedWaifu: newWaifu, imageStatus: 'Rendering portrait...' }));

      // Image synthesis
      const imgPrompt = 'masterpiece anime portrait, highly detailed, ' + coreApp + ', ' + dynStyle + ', cyberpunk aesthetic, volumetric lighting';
      const imgUrl = await layla.images.generateImage(imgPrompt, (status, step, total) => {
        setCurrentGeneration((prev) => (prev ? { ...prev, imageStatus: status, imageStep: step, imageTotalSteps: total } : prev));
      });

      newWaifu.imageUrl = imgUrl;
      newWaifu.image = imgUrl;

      setQueue((prev) => [...prev, newWaifu]);
      setCurrentGeneration(null);
    } catch (err) {
      if (err.message === 'CatfishTrigger') {
        // Spawn cheeky catfish card
        const catfishCard = {
          id: 'catfish-' + Date.now(),
          name: 'Anonymous User',
          age: '??',
          tagline: 'Definitely not a disguised operative.',
          description: 'Her profile looks suspiciously pixelated and glitchy.',
          personality: 'Pushy, asking for your API keys.',
          isCatfish: true,
          imageUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=800&auto=format&fit=crop&q=80',
          originalWaifu: {
            id: 'unmasked-' + Date.now(),
            name: 'Reina (Unmasked)',
            characterName: 'Reina (Unmasked)',
            age: '19',
            description: 'An elite cyber-shinobi blushing behind a broken disguise.',
            personality: 'Tsundere, easily flustered.',
            isSSR: true,
            imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80'
          }
        };
        setQueue((prev) => [...prev, catfishCard]);
        showToast('⚠️ Anomalous entity entered your swipe queue!');
      } else {
        console.error('Card generation error:', err);
        setCurrentGeneration({ phase: 'error', error: err.message, imageStatus: '', imageStep: 0, imageTotalSteps: 1 });
      }
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, selectedContext, ssrPityCount, showToast]);

  // Auto-fill queue if low
  useEffect(() => {
    if (swipeMode === 'dating' && queue.length < 2 && !isGenerating && !currentGeneration) {
      generateNextWaifu();
    }
  }, [queue.length, swipeMode, isGenerating, currentGeneration, generateNextWaifu]);

  return (
    <div
      style={{
        width: '100vw',
        height: '100dvh',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'stretch',
        background: '#050308',
        color: '#fff',
        overflow: 'hidden',
        position: 'relative',
        boxSizing: 'border-box',
        fontFamily: "'Hanken Grotesk', ui-monospace, sans-serif",
        userSelect: 'none'
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {/* Cyberpunk CRT Scanlines & Vignette */}
      <div className="swipe-scanlines" style={{ zIndex: 1, pointerEvents: 'none' }} />
      <div className="swipe-vignette" style={{ zIndex: 1, pointerEvents: 'none' }} />

      {/* ==================== 1. LEFT PANEL: ROSTER & PROFILE HUB ==================== */}
      {isDesktop && isLeftPanelOpen && (
        <aside
          style={{
            width: '320px',
            minWidth: '320px',
            maxWidth: '320px',
            height: '100dvh',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            background: '#07050E',
            borderRight: '1px solid rgba(0, 229, 255, 0.18)',
            overflow: 'hidden',
            zIndex: 20,
            boxSizing: 'border-box'
          }}
        >
          <RosterPanel
            isEmbedded={true}
            activeCard={currentCard}
            history={sessionHistory}
            swipes={swipes}
            sparks={sparkTokens}
            userName="Master"
            onSelectCard={(card) => {
              setActiveRoleplayCompanion(card);
              setRightPanelTab('chat');
              setIsRightPanelOpen(true);
            }}
            onOpenChat={(card) => {
              setActiveRoleplayCompanion(card);
              setRightPanelTab('chat');
              setIsRightPanelOpen(true);
            }}
            onOpenGachaFans={(card) => {
              setActiveGachaFansCompanion(card);
              setRightPanelTab('gachafans');
              setIsRightPanelOpen(true);
            }}
            onOpenSettings={() => {
              setRightPanelTab('settings');
              setIsRightPanelOpen(true);
            }}
            onOpenCloudVault={() => setIsCloudVaultOpen(true)}
            onSendSpark={(card) => {
              setSparkTokens((c) => Math.max(0, c - 5));
              showToast('[SPARK SENT: ⚡ REMATCHED WITH ' + (card.characterName || card.name).toUpperCase() + '!]');
            }}
          />
        </aside>
      )}

      {/* ==================== 2. CENTER PANEL: 3D SWIPE ARENA ==================== */}
      <main
        className="swipe-container"
        style={{
          width: isDesktop ? '440px' : '100%',
          minWidth: isDesktop ? '380px' : 'auto',
          maxWidth: isDesktop ? '460px' : '100%',
          height: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          padding: '10px 14px 10px',
          boxSizing: 'border-box',
          background: '#050308',
          borderLeft: isDesktop && isLeftPanelOpen ? '1px solid rgba(0, 229, 255, 0.15)' : 'none',
          borderRight: isDesktop && isRightPanelOpen ? '1px solid rgba(0, 229, 255, 0.15)' : 'none',
          boxShadow: '0 0 50px rgba(0, 229, 255, 0.1), inset 0 0 30px rgba(0,0,0,0.8)',
          overflow: 'hidden',
          flexShrink: 0,
          zIndex: 15
        }}
      >
        {/* Terminal Header Bar */}
        <div
          className="swipe-header"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingBottom: '6px',
            zIndex: 10,
            flexShrink: 0
          }}
        >
          {/* Left: TARGET Pill + Soulbound */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <div
              className="theme-pill"
              onClick={() => {
                matrixAudio.playClick();
                setIsThemeOpen(true);
              }}
              title="Click to Switch Theme Matrix"
              style={{ cursor: 'pointer', margin: 0 }}
            >
              <span style={{ fontWeight: 'bold', color: 'rgba(0,229,255,0.6)', marginRight: '4px', flexShrink: 0, fontSize: '11px' }}>
                &gt; TARGET:
              </span>
              <div className="smart-scroll-box">
                <span className="smart-scroll-content" style={{ color: '#00E5FF', fontWeight: 800, fontSize: '11px', textShadow: '0 0 6px rgba(0,229,255,0.4)' }}>
                  {selectedContext.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Mode Switcher: Dating vs Music */}
            <button
              onClick={() => {
                matrixAudio.playClick();
                if (swipeMode === 'dating') {
                  setSwipeMode('music');
                  if (beatQueue.length === 0) generateSongConcepts();
                } else {
                  setSwipeMode('dating');
                }
              }}
              style={{
                background: swipeMode === 'music' ? 'rgba(0,229,255,0.2)' : 'rgba(255,16,122,0.2)',
                border: '1px solid ' + (swipeMode === 'music' ? '#00E5FF' : '#FF107A'),
                borderRadius: '4px',
                color: swipeMode === 'music' ? '#00E5FF' : '#FF107A',
                padding: '4px 8px',
                fontSize: '9.5px',
                fontWeight: 900,
                letterSpacing: '0.05em',
                cursor: 'pointer',
                boxShadow: '0 0 10px ' + (swipeMode === 'music' ? 'rgba(0,229,255,0.3)' : 'rgba(255,16,122,0.3)'),
                flexShrink: 0
              }}
            >
              {swipeMode === 'music' ? '🎵 MUSIC' : '❤️ DATING'}
            </button>
          </div>

          {/* Right: Roster Toggle, Chat Toggle, Sparks */}
          <div className="header-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
            <button
              className="header-icon-btn"
              onClick={() => {
                matrixAudio.playClick();
                if (isDesktop) setIsLeftPanelOpen(!isLeftPanelOpen);
                else setIsRosterOpen(true);
              }}
              title="Toggle Roster"
              style={{ color: '#00E5FF', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              <UserIcon size={18} />
            </button>

            <button
              onClick={() => setIsCloudVaultOpen(true)}
              style={{
                background: 'transparent',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: '#FFD700',
                fontSize: '11px',
                fontWeight: 800,
                cursor: 'pointer',
                textShadow: '0 0 6px rgba(255,215,0,0.4)',
                padding: 0
              }}
              title="Spark Tokens & Cloud Vault"
            >
              <SparkIcon />
              <span>{sparkTokens}</span>
            </button>

            <button
              className="header-icon-btn"
              onClick={() => {
                matrixAudio.playClick();
                if (isDesktop) {
                  setIsRightPanelOpen(!isRightPanelOpen);
                } else {
                  setIsRoleplayOpen(true);
                }
              }}
              title="Toggle Messenger"
              style={{ color: '#FF107A', background: 'transparent', border: 'none', cursor: 'pointer', position: 'relative' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </button>

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
              title="Settings"
              style={{ color: 'rgba(255,255,255,0.6)', background: 'transparent', border: 'none', cursor: 'pointer' }}
            >
              ⚙️
            </button>
          </div>
        </div>

        {/* Subheader Status Line */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexShrink: 0 }}>
          <span
            style={{
              fontSize: '10.5px',
              fontStyle: 'italic',
              color: '#FF107A',
              fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
              textShadow: '0 0 6px rgba(255, 16, 122, 0.4)'
            }}
          >
            * Leaning over Master's shoulder, collar jingling ✨
          </span>
          <span style={{ fontSize: '9.5px', color: syncColor, fontWeight: 'bold' }}>
            {syncText} ({meterProgress}%)
          </span>
        </div>

        {/* 🎴 Card Stage Arena with 3D Preservation */}
        <div
          className="card-area"
          style={{
            flex: 1,
            position: 'relative',
            minHeight: 0,
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            perspective: '1000px',
            overflow: 'hidden'
          }}
        >
          {activeDeck.length > 0 ? (
            activeDeck
              .slice(0, 3)
              .map((card, index) => {
                const isTop = index === 0;
                const cardStyle = isTop
                  ? {
                      transform: 'translate(' + dragPos.x + 'px, ' + dragPos.y + 'px) rotate(' + rotation + 'deg) rotateY(' + rotateY + 'deg) rotateX(' + rotateX + 'deg)',
                      transformStyle: 'preserve-3d',
                      transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(.2,.8,.2,1)',
                      zIndex: 10
                    }
                  : {
                      transform: 'translateY(' + index * 16 + 'px) scale(' + (1 - index * 0.045) + ')',
                      transition: 'transform 0.35s cubic-bezier(.2,.8,.2,1)',
                      zIndex: 10 - index,
                      filter: 'saturate(0.92)'
                    };

                return (
                  <SwipeCard
                    key={card.id || card.name + index}
                    waifu={card}
                    preferences={preferences}
                    style={cardStyle}
                    interactive={isTop}
                    likeOpacity={isTop ? likeOpacity : 0}
                    passOpacity={isTop ? passOpacity : 0}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    fallbackImage={lastSwipedImage}
                    enableAtmosphere={true}
                    onOpenGachaFans={(w) => {
                      setActiveGachaFansCompanion(w);
                      if (isDesktop) {
                        setRightPanelTab('gachafans');
                        setIsRightPanelOpen(true);
                      } else {
                        setIsGachaFansOpen(true);
                      }
                    }}
                    onOpenMatrix={() => setIsMatrixShooterOpen(true)}
                  />
                );
              })
              .reverse()
          ) : (
            <LoadingCard
              top={true}
              generation={currentGeneration}
              onRetry={() => (swipeMode === 'music' ? generateSongConcepts() : generateNextWaifu())}
              emptyQueueAndNoAuto={false}
              onForceGenerate={() => (swipeMode === 'music' ? generateSongConcepts() : generateNextWaifu())}
              fallbackImage={lastSwipedImage}
            />
          )}
        </div>

        {/* 🕹️ Bottom Swipe Controls Deck */}
        <div
          className="swipe-controls"
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            padding: '6px 0 10px',
            flexShrink: 0,
            zIndex: 10,
            width: '100%'
          }}
        >
          {/* 1. Profile / Vault Button */}
          <button
            onClick={() => {
              matrixAudio.playClick();
              if (isDesktop) setIsLeftPanelOpen(!isLeftPanelOpen);
              else setIsRosterOpen(true);
            }}
            title="Character Roster"
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(0, 229, 255, 0.15)',
              border: '1px solid #00E5FF',
              color: '#00E5FF',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: '0 0 15px rgba(0,229,255,0.2)',
              flexShrink: 0
            }}
          >
            <UserIcon size={18} />
          </button>

          {/* 2. Pass Button (X) */}
          <button
            onClick={() => {
              if (currentCard) {
                swipeMode === 'music' ? handleMusicSwipe('left', currentCard) : processSwipe('left', currentCard);
              }
            }}
            title="Pass (Left Arrow / A)"
            className="control-btn pass"
            style={{ width: '56px', height: '56px', borderRadius: '12px' }}
          >
            <XIcon size={24} />
          </button>

          {/* 3. Rewind Button */}
          <button
            onClick={rewindSwipe}
            title="Rewind (R)"
            className="control-btn rewind"
            style={{ width: '42px', height: '42px', borderRadius: '12px' }}
          >
            <RewindIcon />
          </button>

          {/* 4. Like Button (Heart) */}
          <button
            onClick={() => {
              if (currentCard) {
                swipeMode === 'music' ? handleMusicSwipe('right', currentCard) : processSwipe('right', currentCard);
              }
            }}
            title="Match / Like (Right Arrow / D)"
            className="control-btn like"
            style={{ width: '56px', height: '56px', borderRadius: '12px' }}
          >
            <HeartIcon />
          </button>

          {/* 5. Music Mode Toggle */}
          <button
            onClick={() => {
              matrixAudio.playClick();
              if (swipeMode === 'dating') {
                setSwipeMode('music');
                if (beatQueue.length === 0) generateSongConcepts();
              } else {
                setSwipeMode('dating');
              }
            }}
            title="Toggle Music Mode"
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: swipeMode === 'music' ? 'rgba(181, 51, 255, 0.25)' : 'rgba(255,255,255,0.05)',
              border: swipeMode === 'music' ? '1px solid #B533FF' : '1px solid rgba(255,255,255,0.15)',
              color: swipeMode === 'music' ? '#B533FF' : '#888',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              transition: 'all 0.2s',
              boxShadow: swipeMode === 'music' ? '0 0 15px rgba(181, 51, 255, 0.3)' : 'none',
              flexShrink: 0
            }}
          >
            <MusicIcon />
          </button>
        </div>

        {/* Floating Cassette Deck / Music HUD */}
        <GlobalMusicPlayer
          tape={activeTape || { name: 'Ace-Step Cyber BGM', genre: 'Synthwave', audioUrl: '' }}
          archive={[]}
          onSelectTape={(t) => setActiveTape(t)}
          onClose={() => setActiveTape(null)}
        />
      </main>

      {/* ==================== 3. RIGHT PANEL: LIVE CYBER TERMINAL ==================== */}
      {isDesktop && isRightPanelOpen && (
        <aside
          style={{
            width: '380px',
            minWidth: '360px',
            maxWidth: '420px',
            height: '100dvh',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            background: '#07050E',
            borderLeft: '1px solid rgba(0, 229, 255, 0.18)',
            overflow: 'hidden',
            zIndex: 20,
            boxSizing: 'border-box'
          }}
        >
          {/* Tab Selector Header */}
          <div
            style={{
              height: '46px',
              borderBottom: '1px solid rgba(0, 229, 255, 0.18)',
              background: '#0B0914',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              padding: '0 8px',
              flexShrink: 0
            }}
          >
            {[
              { id: 'chat', label: '💬 CHAT', color: '#00E5FF' },
              { id: 'group', label: '👥 GROUP', color: '#FF107A' },
              { id: 'gachafans', label: '⭐ FANS', color: '#FFD700' },
              { id: 'settings', label: '⚙️ OPTS', color: '#00FF9D' }
            ].map((tab) => {
              const isActive = rightPanelTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    matrixAudio.playClick();
                    setRightPanelTab(tab.id);
                  }}
                  style={{
                    flex: 1,
                    height: '100%',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: isActive ? '2px solid ' + tab.color : '2px solid transparent',
                    color: isActive ? tab.color : 'rgba(255,255,255,0.4)',
                    fontWeight: isActive ? 800 : 500,
                    fontSize: '11px',
                    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    letterSpacing: '0.04em'
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Body */}
          <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
            {rightPanelTab === 'chat' && (
              <CyberMessenger
                isEmbedded={true}
                companion={activeRoleplayCompanion || currentCard}
                onClose={() => setIsRightPanelOpen(false)}
                onShowToast={showToast}
                userCredits={sparkTokens}
              />
            )}

            {rightPanelTab === 'group' && (
              <CyberGroupChat
                isEmbedded={true}
                activeRoster={Object.values(inbox).map((i) => i.waifu)}
                onShowToast={showToast}
              />
            )}

            {rightPanelTab === 'gachafans' && (
              <GachaFansModal
                isOpen={true}
                companion={activeGachaFansCompanion || currentCard}
                onClose={() => setRightPanelTab('chat')}
                onLaunchHack={() => setIsMatrixShooterOpen(true)}
                userCredits={sparkTokens}
                setUserCredits={setSparkTokens}
                onShowToast={showToast}
              />
            )}

            {rightPanelTab === 'settings' && (
              <SettingsModal
                isOpen={true}
                onClose={() => setRightPanelTab('chat')}
                onShowToast={showToast}
                onResetDeck={() => {
                  setQueue(STARTER_CARDS);
                  showToast('Queue restored to starter deck!');
                }}
              />
            )}
          </div>
        </aside>
      )}

      {/* 📱 MOBILE RESPONSIVE OVERLAYS (when screen is narrow) */}
      {!isDesktop && (
        <>
          {/* Mobile Bottom Bar */}
          <nav
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              height: '56px',
              borderTop: '1px solid rgba(0, 229, 255, 0.2)',
              background: '#0B0914',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-around',
              padding: '0 16px',
              zIndex: 40
            }}
          >
            <button
              onClick={() => setIsRosterOpen(true)}
              style={{ background: 'transparent', border: 'none', color: '#00E5FF', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
            >
              <UserIcon size={18} />
              <span style={{ fontSize: '10px' }}>Roster</span>
            </button>
            <button
              onClick={() => setIsRoleplayOpen(true)}
              style={{ background: 'transparent', border: 'none', color: '#FF107A', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
            >
              <span>💬</span>
              <span style={{ fontSize: '10px' }}>Chat</span>
            </button>
            <button
              onClick={() => setIsGachaFansOpen(true)}
              style={{ background: 'transparent', border: 'none', color: '#FFD700', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
            >
              <span>⭐</span>
              <span style={{ fontSize: '10px' }}>Fans</span>
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}
            >
              <span>⚙️</span>
              <span style={{ fontSize: '10px' }}>Config</span>
            </button>
          </nav>

          {isRosterOpen && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#050308' }}>
              <RosterPanel
                isEmbedded={false}
                activeCard={currentCard}
                history={sessionHistory}
                swipes={swipes}
                sparks={sparkTokens}
                onClose={() => setIsRosterOpen(false)}
                onSelectCard={(c) => {
                  setActiveRoleplayCompanion(c);
                  setIsRosterOpen(false);
                  setIsRoleplayOpen(true);
                }}
                onOpenChat={(c) => {
                  setActiveRoleplayCompanion(c);
                  setIsRosterOpen(false);
                  setIsRoleplayOpen(true);
                }}
                onOpenGachaFans={(c) => {
                  setActiveGachaFansCompanion(c);
                  setIsRosterOpen(false);
                  setIsGachaFansOpen(true);
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
            </div>
          )}

          {isRoleplayOpen && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: '#050308' }}>
              <CyberMessenger
                isEmbedded={false}
                companion={activeRoleplayCompanion || currentCard}
                onClose={() => setIsRoleplayOpen(false)}
                onShowToast={showToast}
                userCredits={sparkTokens}
              />
            </div>
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
              userCredits={sparkTokens}
              setUserCredits={setSparkTokens}
              onShowToast={showToast}
            />
          )}
        </>
      )}

      {/* Global Cloud Vault Modal */}
      <CloudVault isOpen={isCloudVaultOpen} onClose={() => setIsCloudVaultOpen(false)} />

      {/* Global Theme Selector Modal */}
      <ThemeModal
        isOpen={isThemeOpen}
        onClose={() => setIsThemeOpen(false)}
        selectedTheme={selectedContext}
        onSelectTheme={(th) => {
          setSelectedContext(th);
          showToast('[MATRIX TARGET SHIFTED: ' + th.toUpperCase() + ']');
        }}
      />

      {/* Chimera Audio Studio Modal */}
      {isDawOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(5, 3, 8, 0.96)', backdropFilter: 'blur(12px)', display: 'flex', flexDirection: 'column', padding: '16px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,229,255,0.3)', paddingBottom: '12px', marginBottom: '16px', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
            <h2 style={{ color: '#00E5FF', fontWeight: 800, letterSpacing: '0.1em', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <span>🧬</span> ACE-STEP CHIMERA AUDIO MATRIX
            </h2>
            <button
              onClick={() => setIsDawOpen(false)}
              style={{ color: '#aaa', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              [ CLOSE_STUDIO ]
            </button>
          </div>
          <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', flex: 1 }}>
            <ChimeraEngine
              dawState={dawState}
              setDawState={setDawState}
              tColor="#00E5FF"
              enableMp3Compression={true}
              setEnableMp3Compression={() => {}}
              restoreDefaults={() => {}}
              handleMikaGenerateTags={() => {}}
              toggleTag={() => {}}
              updateStructTag={() => {}}
              handleAiTagCategory={() => {}}
              restoreLyricsDefaults={() => {}}
              handleMikaGenerateLyrics={() => {}}
              updateStructLyric={() => {}}
              handleAiRewriteLyric={() => {}}
              setTapeArchive={() => {}}
              showConfirm={() => {}}
              showToast={showToast}
              handleSaveSession={() => {}}
            />
          </div>
        </div>
      )}

      {/* Matrix Arcade Shooter Modal */}
      {isMatrixShooterOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: '#050308', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MatrixShooter
            waifu={currentCard}
            themeColor={currentCard?.themeColor || '#00E5FF'}
            tiers={[
              { name: 'Phase 1: Firewall Intrusion', hp: 100 },
              { name: 'Phase 2: Neural Icebreaker', hp: 250 },
              { name: 'Matrix Overlord Core', hp: 500 }
            ]}
            themeConcept={{ name: selectedContext.toUpperCase() + ' SECURITY CLUSTER' }}
            progressState={{ phase: 1, maxPhase: 3 }}
            onExit={(result) => {
              setIsMatrixShooterOpen(false);
              showToast('🎮 Arcade Run Completed! Score: ' + (result?.score || 1000));
            }}
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
