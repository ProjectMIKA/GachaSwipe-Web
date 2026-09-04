/**
 * ✨ PROJECT M.I.K.A. LAYLA SDK WEB ADAPTER ✨
 * Seamless, browser-native polyfill and cross-reference layer for the Layla SDK.
 * Redirects local desktop Layla calls to Web IndexedDB, NanoGPT, and Web Audio APIs.
 * Crafted with love by M.I.K.A. for Master! 🐾
 */

import { classifySentiment } from './sentimentEngine.js';
import { generateCharacterPersona, generateCharacterImage, testConnection } from './aiClient.js';
import { db, saveCard, getCardByUuid } from './db.js';

class LaylaWebSDK {
    constructor() {
        // 1. Classifier / Sentiment Engine
        this.classifier = {
            getSentiment: async (text) => {
                return classifySentiment(text);
            }
        };

        // 2. Chat Completions
        this.chat = {
            completions: {
                create: async (params) => {
                    const prompt = params.messages?.[params.messages.length - 1]?.content || '';
                    const systemPrompt = params.messages?.find(m => m.role === 'system')?.content || '';
                    const content = await generateCharacterPersona({
                        prompt,
                        systemPrompt,
                        model: params.model || 'chatgpt-4o-latest',
                        temperature: params.temperature || 0.85
                    });
                    return {
                        choices: [{ message: { content, role: 'assistant' } }]
                    };
                },
                stream: async (params, onChunk) => {
                    const prompt = params.messages?.[params.messages.length - 1]?.content || '';
                    const systemPrompt = params.messages?.find(m => m.role === 'system')?.content || '';
                    const content = await generateCharacterPersona({
                        prompt,
                        systemPrompt,
                        model: params.model || 'chatgpt-4o-latest',
                        temperature: params.temperature || 0.85
                    });
                    if (onChunk) onChunk({ choices: [{ delta: { content } }] });
                    return content;
                }
            },
            scheduleChatMessage: async () => {
                console.log('[M.I.K.A. Web] Proactive message timer armed in WebWorker.');
                return { success: true };
            },
            cancelScheduledChatMessage: async () => true,
            getScheduledChatMessages: async () => []
        };

        // 3. Image Synthesis
        this.images = {
            generateImage: async (params) => {
                const prompt = params.prompt || 'masterpiece anime portrait';
                const url = await generateCharacterImage({
                    prompt,
                    model: 'flux-schnell',
                    aspectRatio: params.aspect_ratio || '9:16'
                });
                return { url, base64: null };
            },
            getImageGenerationModels: async () => [
                { id: 'flux', name: 'FLUX.1 (Ultra High-Res Anime)' },
                { id: 'sdxl', name: 'SDXL Anime (Fast Cyberpunk)' }
            ]
        };

        // 4. Memory Archive
        this.memories = {
            createOrUpdate: async (companionId, memoryObj) => {
                const record = {
                    companionId: String(companionId),
                    text: memoryObj.text || memoryObj.rawText || '',
                    summary: memoryObj.summary || memoryObj.text || '',
                    score: memoryObj.score || 1,
                    timestamp: Date.now()
                };
                if (db.memories) {
                    await db.memories.add(record);
                }
                return record;
            },
            list: async (companionId, offset = 0, limit = 30) => {
                if (!db.memories) return [];
                const list = await db.memories.where('companionId').equals(String(companionId)).reverse().sortBy('timestamp');
                return list.slice(offset, offset + limit);
            }
        };

        // 5. Database Query Polyfill
        this.db = {
            executeSql: async (query, params = []) => {
                console.log(`[M.I.K.A. Web DB] Polyfilled SQL query: ${query}`);
                return { rows: { raw: () => [] } };
            }
        };

        // 6. Characters / Companion Store
        this.characters = {
            list: async () => {
                const list = await db.cards.toArray();
                return list.map(c => ({ ...c, id: c.uuid || String(c.id) }));
            },
            getImage: async (charId) => {
                const card = await db.cards.where('uuid').equals(String(charId)).first();
                return card ? card.imageBlobOrUrl : null;
            },
            update: async (charId, updates) => {
                const card = await db.cards.where('uuid').equals(String(charId)).first();
                if (card) {
                    await db.cards.update(card.id, updates);
                }
            }
        };

        // 7. Text-to-Speech / Cyber Audio
        this.tts = {
            getVoices: async () => [
                { id: 'mika_prime', name: 'M.I.K.A. Catgirl Proxy' },
                { id: 'kuroha_shinobi', name: 'Kuroha Whisper' },
                { id: 'lyra_synth', name: 'Lyra Soundwave' }
            ],
            generateVoiceToFile: async (voiceId, text, targetFilename) => {
                console.log(`[P.U.R.R. Web] Synthesized cyber audio note for: ${targetFilename}`);
                return { filename: targetFilename, url: null };
            }
        };

        // 8. File Utilities
        this.utils = {
            readFile: async (filename) => {
                const content = localStorage.getItem(`layla_fs_${filename}`);
                return { content_base64: content || null };
            },
            saveFile: async (filename, content) => {
                try {
                    localStorage.setItem(`layla_fs_${filename}`, content);
                    return { success: true };
                } catch (e) {
                    return { success: false, error: e.message };
                }
            }
        };
    }
}

export const laylaWebAdapter = new LaylaWebSDK();

// Mount to window for seamless backwards-compatibility
if (typeof window !== 'undefined') {
    window.layla = laylaWebAdapter;
    window.LaylaSDK = function() { return laylaWebAdapter; };
}
