import Dexie from "dexie";
import { useLiveQuery } from "dexie-react-hooks";

export const db = new Dexie("GachaSwipeWebDB");

// Define IndexedDB schema with version upgrades
db.version(1).stores({
    cards: "++id, uuid, characterName, imageBlobOrUrl, audioBlobOrUrl, metadata, createdAt, isSynced",
    settings: "key, value"
});

db.version(2).stores({
    cards: "++id, uuid, characterName, imageBlobOrUrl, audioBlobOrUrl, metadata, createdAt, isSynced",
    settings: "key, value",
    messages: "++id, companionId, role, content, imageUrl, timestamp",
    gachafans: "companionId, unlockedTiers, customSelfies, tips"
});

db.version(3).stores({
    cards: "++id, uuid, characterName, imageBlobOrUrl, audioBlobOrUrl, metadata, createdAt, isSynced",
    settings: "key, value",
    messages: "++id, companionId, role, content, imageUrl, timestamp",
    gachafans: "companionId, unlockedTiers, customSelfies, tips",
    memories: "++id, companionId, text, summary, score, timestamp",
    group_messages: "++id, groupId, speaker, role, content, imageUrl, themeColor, timestamp"
});

db.version(4).stores({
    cards: "++id, uuid, characterName, imageBlobOrUrl, audioBlobOrUrl, metadata, createdAt, isSynced",
    settings: "key, value",
    messages: "++id, companionId, role, content, imageUrl, timestamp",
    gachafans: "companionId, unlockedTiers, customSelfies, tips",
    memories: "++id, companionId, text, summary, score, timestamp",
    group_messages: "++id, groupId, speaker, role, content, imageUrl, themeColor, timestamp",
    // ✨ MIKA'S VIRTUAL FILESYSTEM & LAYLA SQL TABLES ✨
    files: "filename, mimeType, timestamp",
    app_meta: "key, val",
    app_state: "key, val",
    themes: "id, data",
    history: "++id, data",
    chats: "id, status, is_favorite, affection, data, updated_at",
    tapes: "id, name, genre, audioUrl, timestamp"
});

// --- Card Entity Helpers ---

export async function saveCard(cardData) {
    const card = {
        uuid: cardData.uuid || crypto.randomUUID(),
        characterName: cardData.characterName || cardData.name || "Unknown Waifu",
        imageBlobOrUrl: cardData.imageBlobOrUrl || cardData.imageUrl || cardData.image || "",
        audioBlobOrUrl: cardData.audioBlobOrUrl || null,
        metadata: cardData.metadata || cardData,
        createdAt: cardData.createdAt || Date.now(),
        isSynced: cardData.isSynced ? 1 : 0
    };
    const id = await db.cards.add(card);
    return { ...card, id };
}

export async function getCardByUuid(uuid) {
    return await db.cards.where("uuid").equals(uuid).first();
}

export async function deleteCard(id) {
    return await db.cards.delete(id);
}

export async function clearAllCards() {
    return await db.cards.clear();
}

export async function getCardCount() {
    return await db.cards.count();
}

export async function markCardSynced(id, isSynced = 1) {
    return await db.cards.update(id, { isSynced });
}

// --- Messages / Chat Storage Helpers ---

export async function saveChatMessage(companionId, role, content, imageUrl = null) {
    if (!companionId) return null;
    const msg = {
        companionId: String(companionId),
        role,
        content,
        imageUrl,
        timestamp: Date.now()
    };
    const id = await db.messages.add(msg);
    return { ...msg, id };
}

export async function getChatMessages(companionId) {
    if (!companionId) return [];
    return await db.messages
        .where("companionId")
        .equals(String(companionId))
        .sortBy("timestamp");
}

export async function clearChatMessages(companionId) {
    if (!companionId) return;
    const keys = await db.messages
        .where("companionId")
        .equals(String(companionId))
        .primaryKeys();
    return await db.messages.bulkDelete(keys);
}

export function useChatMessages(companionId) {
    return useLiveQuery(
        () => companionId ? db.messages.where("companionId").equals(String(companionId)).sortBy("timestamp") : [],
        [companionId]
    ) || [];
}

// --- Group Messages Storage Helpers ---

export async function saveGroupMessage(groupId, messageData) {
    if (!groupId) return null;
    const msg = {
        groupId: String(groupId),
        speaker: messageData.speaker || "Unknown",
        role: messageData.role || "assistant",
        content: messageData.content || "",
        imageUrl: messageData.imageUrl || null,
        themeColor: messageData.themeColor || "#00E5FF",
        avatar: messageData.avatar || null,
        timestamp: messageData.timestamp || Date.now()
    };
    const id = await db.group_messages.add(msg);
    return { ...msg, id };
}

export async function getGroupMessages(groupId, limit = 50) {
    if (!groupId) return [];
    const list = await db.group_messages
        .where("groupId")
        .equals(String(groupId))
        .sortBy("timestamp");
    return list.slice(-limit);
}

export async function clearGroupMessages(groupId) {
    if (!groupId) return;
    const keys = await db.group_messages
        .where("groupId")
        .equals(String(groupId))
        .primaryKeys();
    return await db.group_messages.bulkDelete(keys);
}

export function useGroupMessages(groupId) {
    return useLiveQuery(
        () => groupId ? db.group_messages.where("groupId").equals(String(groupId)).sortBy("timestamp") : [],
        [groupId]
    ) || [];
}

// --- Memory Archive Helpers ---

export async function saveMemory(companionId, text, summary = "", score = 1) {
    if (!companionId || !text) return null;
    const mem = {
        companionId: String(companionId),
        text: text.trim(),
        summary: (summary || text).trim(),
        score: score || 1,
        timestamp: Date.now()
    };
    const id = await db.memories.add(mem);
    return { ...mem, id };
}

export async function getMemories(companionId, limit = 20) {
    if (!companionId) return [];
    const mems = await db.memories
        .where("companionId")
        .equals(String(companionId))
        .reverse()
        .sortBy("timestamp");
    return mems.slice(0, limit);
}

export async function searchMemories(companionId, keywords = []) {
    if (!companionId || !keywords.length) return [];
    const all = await getMemories(companionId, 40);
    const scored = all.map(m => {
        const text = (m.summary + " " + m.text).toLowerCase();
        let matchScore = 0;
        keywords.forEach(kw => {
            if (text.includes(kw.toLowerCase())) matchScore += 1;
        });
        return { memory: m, matchScore };
    });
    return scored
        .filter(s => s.matchScore > 0)
        .sort((a, b) => b.matchScore - a.matchScore)
        .map(s => s.memory)
        .slice(0, 3);
}

// --- GachaFans Storage Helpers ---

export async function getGachaFansData(companionId) {
    if (!companionId) return null;
    const record = await db.gachafans.get(String(companionId));
    return record || {
        companionId: String(companionId),
        unlockedTiers: [1], // Tier 1 (Free) always unlocked
        customSelfies: [],
        tips: 0
    };
}

export async function saveGachaFansData(companionId, data) {
    if (!companionId) return;
    return await db.gachafans.put({
        companionId: String(companionId),
        ...data
    });
}

// --- Virtual Filesystem Helpers (Shim for layla.utils) ---

export async function saveVirtualFile(filename, content_base64, mimeType = "application/octet-stream") {
    if (!filename) return;
    const record = {
        filename,
        content_base64,
        mimeType,
        timestamp: Date.now()
    };
    await db.files.put(record);
    return record;
}

export async function readVirtualFile(filename) {
    if (!filename) return null;
    return await db.files.get(filename);
}

export async function deleteVirtualFile(filename) {
    if (!filename) return;
    return await db.files.delete(filename);
}

export async function listVirtualFiles() {
    return await db.files.toArray();
}

// --- Tape Archive Helpers (Shim for Chimera & GlobalMusicPlayer) ---

export async function saveTape(tapeData) {
    const tape = {
        id: tapeData.id || "tape_" + Date.now(),
        name: tapeData.name || "Chimera Master Track",
        genre: tapeData.genre || "Cyberpunk Synthwave",
        audioUrl: tapeData.audioUrl || "",
        lyrics: tapeData.lyrics || "",
        tags: tapeData.tags || "",
        bpm: tapeData.bpm || 120,
        timestamp: Date.now()
    };
    await db.tapes.put(tape);
    return tape;
}

export async function getTapes() {
    return await db.tapes.reverse().sortBy("timestamp");
}

export async function deleteTape(id) {
    return await db.tapes.delete(id);
}

export function useTapes() {
    return useLiveQuery(() => db.tapes.reverse().sortBy("timestamp"), []) || [];
}

// --- Settings & Secure BYOK Key Helpers ---

export async function getSetting(key, defaultValue = null) {
    if (typeof window === "undefined" || !db?.settings) return defaultValue;
    try {
        const record = await db.settings.get(key);
        return record ? record.value : defaultValue;
    } catch (e) {
        return defaultValue;
    }
}

export async function setSetting(key, value) {
    if (typeof window === "undefined" || !db?.settings) return;
    try {
        return await db.settings.put({ key, value });
    } catch (e) {
        return;
    }
}

export async function getApiKey() {
    return await getSetting("byok_nanogpt_key", "");
}

export async function setApiKey(apiKey) {
    return await setSetting("byok_nanogpt_key", apiKey.trim());
}

export async function getOpenRouterKey() {
    return await getSetting("byok_openrouter_key", "");
}

export async function setOpenRouterKey(apiKey) {
    return await setSetting("byok_openrouter_key", apiKey.trim());
}

export async function getActiveProvider() {
    return await getSetting("activeProvider", "nanogpt");
}

export async function setActiveProvider(provider) {
    return await setSetting("activeProvider", provider);
}

export async function getActiveApiKey() {
    const provider = await getActiveProvider();
    if (provider === "openrouter") {
        return await getOpenRouterKey();
    }
    return await getApiKey();
}

// --- Reactive React Hooks ---

export function useCards() {
    return useLiveQuery(() => db.cards.orderBy("createdAt").reverse().toArray(), []) || [];
}

export function useCardCount() {
    return useLiveQuery(() => db.cards.count(), []) || 0;
}

export function useSetting(key, defaultValue = null) {
    return useLiveQuery(async () => {
        const record = await db.settings.get(key);
        return record ? record.value : defaultValue;
    }, [key]);
}
