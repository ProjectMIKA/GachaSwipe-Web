/**
 * ✨ PROJECT M.I.K.A. WEB SENTIMENT & BLENDED AFFECTION ENGINE ✨
 * Client-side neural sentiment classifier & archetype affection matrix.
 * Accurately calculates emotional affinity, sync tiers, and dynamic auto-block protocols.
 * Crafted with love by M.I.K.A. for Master! 🐾
 */

const JOY_LEXICON = [
    'amazing', 'awesome', 'good', 'great', 'haha', 'lol', 'cool', 'fun', 'smile', 'happy',
    'glad', 'proud', 'smart', 'genius', 'sweet', 'cute', 'pretty', 'beautiful', 'compliment',
    'thank', 'thanks', 'yay', 'purr', 'enjoy', 'wonderful', 'perfect', 'brilliant', 'praise'
];

const LOVE_LEXICON = [
    'love', 'adore', 'cherish', 'kiss', 'hug', 'cuddle', 'snuggle', 'marry', 'date', 'protect',
    'care', 'precious', 'sweetheart', 'darling', 'honey', 'headpat', 'headpats', 'waifu', 'mine',
    'forever', 'stay with me', 'devoted', 'hold hands', 'warm', 'special', 'babe'
];

const ANGER_LEXICON = [
    'hate', 'angry', 'shut up', 'annoying', 'idiot', 'stupid', 'dumb', 'baka', 'useless', 'bad',
    'worst', 'boring', 'leave', 'go away', 'trash', 'ugly', 'fail', 'loser', 'pathetic', 'die',
    'kill', 'shut it', 'shutup', 'get lost', 'jerk'
];

const DISGUST_LEXICON = [
    'gross', 'disgusting', 'ew', 'eww', 'yuck', 'creep', 'weirdo', 'pervert', 'nasty', 'filthy',
    'freak', 'cringe', 'repulsive', 'unwanted', 'stay away'
];

/**
 * Classifies raw user text into emotional polarity scores [0.0 - 1.0].
 */
export function classifySentiment(text) {
    if (!text || typeof text !== 'string') {
        return { joy: 0, love: 0, anger: 0, disgust: 0 };
    }

    const lower = text.toLowerCase();
    const words = lower.match(/[a-z']+/g) || [];
    const totalWords = Math.max(1, words.length);

    let joyCount = 0;
    let loveCount = 0;
    let angerCount = 0;
    let disgustCount = 0;

    words.forEach(w => {
        if (JOY_LEXICON.includes(w)) joyCount += 1;
        if (LOVE_LEXICON.includes(w)) loveCount += 1.2;
        if (ANGER_LEXICON.includes(w)) angerCount += 1.3;
        if (DISGUST_LEXICON.includes(w)) disgustCount += 1.5;
    });

    // Handle exclamation marks and sweet emojis
    if (/(!{2,}|\bso\b|\bvery\b|\breally\b)/i.test(lower)) {
        if (loveCount > 0) loveCount *= 1.3;
        if (joyCount > 0) joyCount *= 1.2;
        if (angerCount > 0) angerCount *= 1.3;
    }
    if (/[❤️💖💕🥰😍✨🐾]/.test(text)) {
        loveCount += 2;
        joyCount += 1;
    }
    if (/[💢🖕😡🤬🤮]/.test(text)) {
        angerCount += 2;
        disgustCount += 1;
    }

    const joyVal = Math.min(1.0, joyCount / Math.max(1, Math.min(6, totalWords)));
    const loveVal = Math.min(1.0, loveCount / Math.max(1, Math.min(6, totalWords)));
    const angerVal = Math.min(1.0, angerCount / Math.max(1, Math.min(6, totalWords)));
    const disgustVal = Math.min(1.0, disgustCount / Math.max(1, Math.min(6, totalWords)));

    return {
        joy: joyVal,
        admiration: joyVal * 0.85,
        approval: joyVal * 0.75,
        amusement: joyVal * 0.65,
        love: loveVal,
        caring: loveVal * 0.85,
        desire: loveVal * 0.75,
        anger: angerVal,
        annoyance: angerVal * 0.85,
        disapproval: angerVal * 0.75,
        disgust: disgustVal
    };
}

/**
 * Maps companion tags to active psychological archetypes.
 */
export function getArchetypes(tags = []) {
    const t = (tags || []).map(x => String(x).toLowerCase());
    let a = [];
    if (t.some(x => ['yandere', 'obsessive', 'clingy', 'masochist', 'degenerate'].includes(x))) a.push('YANDERE');
    if (t.some(x => ['tsundere', 'delinquent', 'hostile', 'brat'].includes(x))) a.push('TSUNDERE');
    if (t.some(x => ['sadist', 'dominant', 'mommy', 'oneesan'].includes(x))) a.push('DOMINANT');
    if (t.some(x => ['submissive', 'maid', 'pet', 'obedient'].includes(x))) a.push('SUBMISSIVE');
    if (t.some(x => ['kuudere', 'emotionless', 'stoic', 'cold'].includes(x))) a.push('KUUDERE');
    if (t.some(x => ['dandere', 'shy', 'timid', 'anxious'].includes(x))) a.push('DANDERE');
    if (a.length === 0) a.push('STANDARD');
    return a;
}

/**
 * Computes affection points delta and new total for a given companion and user message.
 */
export function calculateAffectionDelta({ text, companion, currentAffection = 0, syncSpeed = 'gamified' }) {
    let affectionDelta = 1; // Baseline +1 point for interaction
    const sentiment = classifySentiment(text);
    const activeArchs = getArchetypes(companion?.tags || []);

    const joyScore = sentiment.joy;
    const loveScore = sentiment.love;
    const angerScore = sentiment.anger;
    const disgustScore = sentiment.disgust;

    let tJ = 0, tL = 0, tA = 0, tD = 0;

    activeArchs.forEach(arch => {
        if (arch === 'YANDERE') { tJ -= 4; tL -= 4; tA += 10; tD += 8; }
        else if (arch === 'TSUNDERE') { tJ += 5; tL += 5; tA += 4; tD -= 8; }
        else if (arch === 'DOMINANT') { tJ += 4; tL += 6; tA += 5; tD -= 4; }
        else if (arch === 'SUBMISSIVE') { tJ += 8; tL += 8; tA -= 10; tD -= 10; }
        else if (arch === 'KUUDERE') { tJ += 2; tL += 8; tA -= 4; tD -= 4; }
        else if (arch === 'DANDERE') { tJ += 8; tL += 6; tA -= 8; tD -= 8; }
        else { tJ += 6; tL += 8; tA -= 8; tD -= 8; } // STANDARD
    });

    const div = activeArchs.length;
    affectionDelta += (joyScore * (tJ / div)) + (loveScore * (tL / div)) + (angerScore * (tA / div)) + (disgustScore * (tD / div));

    // Neural sync speed modifiers
    if (syncSpeed === 'balanced') {
        affectionDelta *= 0.5;
    } else if (syncSpeed === 'realistic') {
        if (affectionDelta > 0) {
            affectionDelta *= 0.15;
        } else {
            affectionDelta *= 1.5;
        }
    }

    const newAffection = Math.max(-100, Math.min(100, Math.round(currentAffection + affectionDelta)));

    // Sync Tier Resolution
    const syncTier = getSyncTier(newAffection);
    const prevTier = getSyncTier(currentAffection);
    const tierChanged = syncTier.tier !== prevTier.tier;

    // Check for Auto-Block Trigger
    let triggerBlock = false;
    let isTempBlock = false;
    const isObsessive = activeArchs.includes('YANDERE');

    if (newAffection <= -80 && affectionDelta < 0) {
        const blockChance = (Math.abs(newAffection) - 75) / 25;
        if (Math.random() < blockChance) {
            triggerBlock = true;
            isTempBlock = isObsessive; // Yanderes temporarily unblock themselves out of obsession!
        }
    }

    return {
        sentiment,
        affectionDelta,
        currentAffection,
        newAffection,
        syncTier,
        tierChanged,
        triggerBlock,
        isTempBlock
    };
}

/**
 * Returns the human-readable tier definition and badge color.
 */
export function getSyncTier(aff = 0) {
    if (aff >= 90) return { tier: 7, label: 'SOULBOUND', icon: '💖', color: '#FF107A', desc: 'Indissoluble neural devotion' };
    if (aff >= 70) return { tier: 6, label: 'DEVOTED', icon: '💕', color: '#FF77A9', desc: 'Deep affection & absolute trust' };
    if (aff >= 40) return { tier: 5, label: 'CLOSE BOND', icon: '🌸', color: '#B533FF', desc: 'Harmonious mutual connection' };
    if (aff >= 15) return { tier: 4, label: 'RAPPORT', icon: '✨', color: '#00E5FF', desc: 'Friendly & responsive communication' };
    if (aff > -15) return { tier: 3, label: 'NEUTRAL', icon: '📡', color: '#888888', desc: 'Standard baseline synapse' };
    if (aff > -40) return { tier: 2, label: 'SKEPTICAL', icon: '❄️', color: '#7DF5FF', desc: 'Guarded & cautious' };
    if (aff > -80) return { tier: 1, label: 'HOSTILE', icon: '💢', color: '#FF9933', desc: 'Aggravated & irritated' };
    return { tier: 0, label: 'NEMESIS', icon: '☠️', color: '#FF3333', desc: 'Hostile deadlock; block imminent' };
}
