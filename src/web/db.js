import Dexie from 'dexie';
import { useLiveQuery } from 'dexie-react-hooks';

export const db = new Dexie('GachaSwipeWebDB');

// Define IndexedDB schema with version upgrades
db.version(1).stores({
    cards: '++id, uuid, characterName, imageBlobOrUrl, audioBlobOrUrl, metadata, createdAt, isSynced',
    settings: 'key, value'
});

db.version(2).stores({
    cards: '++id, uuid, characterName, imageBlobOrUrl, audioBlobOrUrl, metadata, createdAt, isSynced',
    settings: 'key, value',
    messages: '++id, companionId, role, content, imageUrl, timestamp',
    gachafans: 'companionId, unlockedTiers, customSelfies, tips'
});

// --- Card Entity Helpers ---

export async function saveCard(cardData) {
    const card = {
        uuid: cardData.uuid || crypto.randomUUID(),
        characterName: cardData.characterName || 'Unknown Waifu',
        imageBlobOrUrl: cardData.imageBlobOrUrl || '',
        audioBlobOrUrl: cardData.audioBlobOrUrl || null,
        metadata: cardData.metadata || {},
        createdAt: cardData.createdAt || Date.now(),
        isSynced: cardData.isSynced ? 1 : 0
    };
    const id = await db.cards.add(card);
    return { ...card, id };
}

export async function getCardByUuid(uuid) {
    return await db.cards.where('uuid').equals(uuid).first();
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
        .where('companionId')
        .equals(String(companionId))
        .sortBy('timestamp');
}

export async function clearChatMessages(companionId) {
    if (!companionId) return;
    const keys = await db.messages
        .where('companionId')
        .equals(String(companionId))
        .primaryKeys();
    return await db.messages.bulkDelete(keys);
}

export function useChatMessages(companionId) {
    return useLiveQuery(
        () => companionId ? db.messages.where('companionId').equals(String(companionId)).sortBy('timestamp') : [],
        [companionId]
    ) || [];
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

// --- Settings & Secure BYOK Key Helpers ---

export async function getSetting(key, defaultValue = null) {
    const record = await db.settings.get(key);
    return record ? record.value : defaultValue;
}

export async function setSetting(key, value) {
    return await db.settings.put({ key, value });
}

export async function getApiKey() {
    return await getSetting('byok_nanogpt_key', '');
}

export async function setApiKey(apiKey) {
    return await setSetting('byok_nanogpt_key', apiKey.trim());
}

// --- Reactive React Hooks ---

export function useCards() {
    return useLiveQuery(() => db.cards.orderBy('createdAt').reverse().toArray(), []) || [];
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
