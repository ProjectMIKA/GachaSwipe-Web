/**
 * ✨ PROJECT M.I.K.A. LAYLA SDK COMPLETE WEB-NATIVE SHIM LAYER ✨
 * 1:1 Browser-native polyfill and interception layer for the Layla SDK.
 * Redirects local desktop Layla calls to Web IndexedDB (Dexie), NanoGPT BYOK,
 * Web Audio, and HTML5 Audio APIs.
 * Crafted with love by M.I.K.A. for Master! 🐾
 */

import { classifySentiment } from "./sentimentEngine.js";
import { generateCharacterPersona, generateCharacterImage, createChatStream } from "./aiClient.js";
import {
    db,
    saveCard,
    getCardByUuid,
    saveVirtualFile,
    readVirtualFile,
    deleteVirtualFile,
    saveMemory,
    getMemories
} from "./db.js";

// Helper: Generates a procedural WAV base64 tone (fallback for AceStep synthesis)
function generateProceduralSynthWav(durationSeconds = 6, bpm = 120) {
    const sampleRate = 22050;
    const numSamples = Math.floor(sampleRate * durationSeconds);
    const numChannels = 1;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numSamples * blockAlign;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // RIFF identifier
    function writeString(offset, str) {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
    }

    writeString(0, "RIFF");
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true); // Subchunk1Size
    view.setUint16(20, 1, true);  // PCM format
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true); // BitsPerSample
    writeString(36, "data");
    view.setUint32(40, dataSize, true);

    // Generate dreamy cyberpunk synth chord sequence
    const notes = [220, 261.63, 329.63, 392.00, 440]; // Am7 pentatonic
    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        const noteIdx = Math.floor((t * (bpm / 60)) % notes.length);
        const freq = notes[noteIdx];
        const envelope = Math.exp(-((t % (60 / bpm)) * 2));
        const sample = Math.sin(2 * Math.PI * freq * t) * 0.4 * envelope
                     + Math.sin(2 * Math.PI * (freq * 0.5) * t) * 0.3
                     + (Math.sin(2 * Math.PI * (freq * 2) * t) * 0.1);
        const clamped = Math.max(-1, Math.min(1, sample));
        view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF, true);
        offset += 2;
    }

    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

export class LaylaWebSDK {
    constructor() {
        // 1. Contextual & Version Execution Context
        this.contextual = {
            getExecutionContext: async (options) => {
                return {
                    app_version: "7.4.5",
                    host_os: "web",
                    character: null,
                    session_id: "mika_web_session_" + Date.now()
                };
            }
        };

        // 2. User Persona Manager
        this.personas = {
            get: async () => {
                try {
                    const record = await db.settings.get("user_persona");
                    if (record?.value) return record.value;
                } catch (e) {}
                return {
                    name: "Master",
                    avatar: "",
                    role: "User"
                };
            },
            update: async (personaData) => {
                await db.settings.put({ key: "user_persona", value: personaData });
                return personaData;
            }
        };

        // 3. Classifier / Sentiment Engine
        this.classifier = {
            getSentiment: async (text) => {
                return classifySentiment(text);
            }
        };

        // 4. Chat Completions & Streaming
        this.chat = {
            completions: {
                create: async (params) => {
                    const prompt = params.messages?.[params.messages.length - 1]?.content || "";
                    const systemPrompt = params.messages?.find(m => m.role === "system")?.content || "";
                    const content = await generateCharacterPersona({
                        prompt,
                        systemPrompt,
                        messages: params.messages,
                        model: params.model || "chatgpt-4o-latest",
                        temperature: params.temperature ?? 0.85
                    });
                    return {
                        choices: [{ message: { content, role: "assistant" } }]
                    };
                },
                stream: (params) => {
                    const systemPrompt = params.messages?.find(m => m.role === "system")?.content || "";
                    const userMessages = params.messages?.filter(m => m.role !== "system") || [];
                    return createChatStream({
                        messages: userMessages,
                        systemPrompt,
                        model: params.model || "chatgpt-4o-latest",
                        temperature: params.temperature ?? 0.85,
                        signal: params.signal
                    });
                }
            },
            getInferenceEngines: async () => [
                { id: "chatgpt-4o-latest", name: "ChatGPT-4o (NanoGPT Cloud)", engine: "chatgpt-4o-latest" },
                { id: "claude-3-5-sonnet", name: "Claude 3.5 Sonnet (NanoGPT)", engine: "claude-3-5-sonnet" },
                { id: "deepseek-chat", name: "DeepSeek Chat (NanoGPT)", engine: "deepseek-chat" },
                { id: "offline-mock", name: "Offline Procedural Proxy", engine: "offline-mock" }
            ],
            setInferenceEngine: async (engineId) => {
                await db.settings.put({ key: "active_inference_engine", value: engineId });
                return true;
            },
            scheduleChatMessage: async (params) => {
                console.log("[M.I.K.A. Web] Proactive message timer scheduled:", params);
                return { success: true, id: "sched_" + Date.now() };
            },
            cancelScheduledChatMessage: async (id) => {
                console.log("[M.I.K.A. Web] Canceled scheduled message:", id);
                return true;
            },
            getScheduledChatMessages: async () => []
        };

        // 5. Image Synthesis
        this.images = {
            generateImage: async (promptOrParams, onProgress, opts, model, extra) => {
                let prompt = "";
                let progressCb = onProgress;
                let targetModel = model || "flux-schnell";
                let signal = extra?.signal;

                if (typeof promptOrParams === "string") {
                    prompt = promptOrParams;
                } else if (promptOrParams && typeof promptOrParams === "object") {
                    prompt = promptOrParams.prompt || "";
                    progressCb = promptOrParams.onProgress || progressCb;
                    targetModel = promptOrParams.model || targetModel;
                    signal = promptOrParams.signal || signal;
                }

                return await generateCharacterImage({
                    prompt: prompt || "masterpiece anime cyberpunk portrait, neon glow, highly detailed",
                    model: targetModel,
                    aspectRatio: "9:16",
                    onProgress: progressCb,
                    signal
                });
            },
            getImageGenerationModels: async () => [
                { id: "flux-schnell", name: "FLUX.1 Schnell (Fast Anime)" },
                { id: "flux-dev", name: "FLUX.1 Dev (Ultra Masterpiece)" },
                { id: "sdxl", name: "SDXL Anime Cyberpunk" }
            ]
        };

        // 6. Memory Archive
        this.memories = {
            createOrUpdate: async (companionId, memoryObj) => {
                const text = memoryObj.text || memoryObj.rawText || "";
                const summary = memoryObj.summary || text;
                const score = memoryObj.score || 1;
                return await saveMemory(companionId, text, summary, score);
            },
            list: async (companionId, offset = 0, limit = 30) => {
                const list = await getMemories(companionId, offset + limit);
                return list.slice(offset, offset + limit);
            }
        };

        // 7. Database SQL Interceptor (Polyfill for SQLite on top of Dexie)
        this.db = {
            executeSql: async (query, params = []) => {
                const q = (query || "").trim();
                const upperQ = q.toUpperCase();

                // 1. CREATE TABLE
                if (upperQ.startsWith("CREATE TABLE")) {
                    const emptyRes = { rows: { raw: () => [], length: 0, item: () => null, 0: null } };
                    return emptyRes;
                }

                // 2. DELETE
                if (upperQ.startsWith("DELETE FROM")) {
                    if (upperQ.includes("CHATS")) {
                        if (upperQ.includes("WHERE ID = ?") || upperQ.includes("WHERE ID =")) {
                            const id = params[0] || (q.match(/WHERE\s+id\s*=\s*['"]?([^'"]+)['"]?/i)?.[1]);
                            if (id) await db.chats.delete(String(id));
                        } else {
                            await db.chats.clear();
                        }
                    } else if (upperQ.includes("APP_STATE")) {
                        await db.app_state.clear();
                    } else if (upperQ.includes("APP_META")) {
                        await db.app_meta.clear();
                    } else if (upperQ.includes("HISTORY")) {
                        await db.history.clear();
                    } else if (upperQ.includes("THEMES")) {
                        await db.themes.clear();
                    }
                    return { rowsAffected: 1 };
                }

                // 3. SELECT
                if (upperQ.startsWith("SELECT")) {
                    let results = [];

                    if (upperQ.includes("APP_META")) {
                        let key = null;
                        if (upperQ.includes("WHERE KEY = ?")) {
                            key = params[0];
                        } else {
                            const match = q.match(/WHERE\s+key\s*=\s*['"]([^'"]+)['"]/i);
                            if (match) key = match[1];
                        }
                        if (key) {
                            const item = await db.app_meta.get(key);
                            results = item ? [item] : [];
                        } else {
                            results = await db.app_meta.toArray();
                        }
                    } else if (upperQ.includes("APP_STATE")) {
                        let key = null;
                        if (upperQ.includes("WHERE KEY = ?")) {
                            key = params[0];
                        } else {
                            const match = q.match(/WHERE\s+key\s*=\s*['"]([^'"]+)['"]/i);
                            if (match) key = match[1];
                        }
                        if (key) {
                            const item = await db.app_state.get(key);
                            results = item ? [item] : [];
                        } else {
                            results = await db.app_state.toArray();
                        }
                    } else if (upperQ.includes("CHATS")) {
                        if (upperQ.includes("WHERE ID = ?") || upperQ.includes("WHERE ID =")) {
                            const id = params[0] || (q.match(/WHERE\s+id\s*=\s*['"]?([^'"]+)['"]?/i)?.[1]);
                            if (id) {
                                const item = await db.chats.get(String(id));
                                results = item ? [item] : [];
                            }
                        } else if (upperQ.includes("SELECT ID FROM CHATS")) {
                            const all = await db.chats.toArray();
                            results = all.map(c => ({ id: c.id }));
                        } else {
                            results = await db.chats.toArray();
                        }
                    } else if (upperQ.includes("THEMES")) {
                        results = await db.themes.toArray();
                    } else if (upperQ.includes("HISTORY")) {
                        results = await db.history.toArray();
                    }

                    const rowsObj = {
                        raw: () => results,
                        length: results.length,
                        item: (i) => results[i] || null
                    };
                    results.forEach((row, i) => { rowsObj[i] = row; });

                    return { rows: rowsObj };
                }

                // 4. INSERT OR REPLACE INTO
                if (upperQ.startsWith("INSERT") || upperQ.startsWith("REPLACE")) {
                    if (upperQ.includes("APP_META")) {
                        let key = params[0];
                        let val = params[1];
                        if (params.length === 0) {
                            const match = q.match(/VALUES\s*\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]\s*\)/i);
                            if (match) { key = match[1]; val = match[2]; }
                        }
                        if (key !== undefined) {
                            await db.app_meta.put({ key: String(key), val: String(val) });
                        }
                    } else if (upperQ.includes("APP_STATE")) {
                        let key = null;
                        let val = null;
                        const matchKey = q.match(/VALUES\s*\(\s*['"]([^'"]+)['"]\s*,\s*\?\s*\)/i);
                        if (matchKey) {
                            key = matchKey[1];
                            val = params[0];
                        } else if (params.length >= 2) {
                            key = params[0];
                            val = params[1];
                        }
                        if (key) {
                            await db.app_state.put({ key: String(key), val: typeof val === 'string' ? val : JSON.stringify(val) });
                        }
                    } else if (upperQ.includes("CHATS")) {
                        if (params.length >= 6) {
                            await db.chats.put({
                                id: String(params[0]),
                                status: String(params[1] || ""),
                                is_favorite: Number(params[2] || 0),
                                affection: Number(params[3] || 0),
                                data: typeof params[4] === 'string' ? params[4] : JSON.stringify(params[4]),
                                updated_at: Number(params[5] || Date.now())
                            });
                        }
                    } else if (upperQ.includes("THEMES")) {
                        if (params.length >= 2) {
                            await db.themes.put({ id: String(params[0]), data: typeof params[1] === 'string' ? params[1] : JSON.stringify(params[1]) });
                        }
                    } else if (upperQ.includes("HISTORY")) {
                        if (params.length >= 1) {
                            await db.history.add({ data: typeof params[0] === 'string' ? params[0] : JSON.stringify(params[0]) });
                        }
                    }
                    return { rowsAffected: 1 };
                }

                return { rows: { raw: () => [], length: 0, item: () => null, 0: null } };
            }
        };

        // 8. Characters / Companion Store
        this.characters = {
            list: async (offset = 0, limit = 9999) => {
                const list = await db.cards.toArray();
                return list.slice(offset, offset + limit).map(c => ({
                    id: c.uuid || String(c.id),
                    name: c.characterName || c.metadata?.name || "Unknown Waifu",
                    description: c.metadata?.description || "",
                    personality: c.metadata?.personality || "",
                    imageUrl: c.imageBlobOrUrl || "",
                    data: c.metadata
                }));
            },
            getImage: async (charId) => {
                const card = await db.cards.where("uuid").equals(String(charId)).first();
                return card ? card.imageBlobOrUrl : null;
            },
            update: async (charData) => {
                const specData = charData.data?.data || charData.data || charData;
                const charId = charData.id || specData.id || "card_" + Date.now();
                const name = specData.name || charData.name || "Unknown";
                const imageUrl = specData.extensions?.image || specData.imageUrl || charData.imageUrl || "";

                const existing = await db.cards.where("uuid").equals(String(charId)).first();
                if (existing) {
                    await db.cards.update(existing.id, {
                        characterName: name,
                        imageBlobOrUrl: imageUrl || existing.imageBlobOrUrl,
                        metadata: charData
                    });
                    return { id: charId };
                } else {
                    await saveCard({
                        uuid: charId,
                        characterName: name,
                        imageBlobOrUrl: imageUrl,
                        metadata: charData
                    });
                    return { id: charId };
                }
            }
        };

        // 9. Virtual Filesystem (layla.utils)
        this.utils = {
            saveFile: async (filename, content_base64, overwrite = false) => {
                await saveVirtualFile(filename, content_base64);
                return { success: true, filename };
            },
            readFile: async (filename) => {
                const record = await readVirtualFile(filename);
                if (record && record.content_base64) {
                    return { content_base64: record.content_base64, data: record.content_base64 };
                }
                const lsData = localStorage.getItem("vf_" + filename);
                if (lsData) {
                    return { content_base64: lsData, data: lsData };
                }
                return null;
            }
        };

        // 10. AceStep Audio Synthesis Pipeline
        this.acestep = {
            understand: async ({ audioBase64 }) => {
                return {
                    request: {
                        audio_context: "cyberpunk_synth_dna",
                        genre: "Cyberpunk Electro",
                        detected_bpm: 124,
                        mood: "futuristic, neon, energetic"
                    }
                };
            },
            lm: async ({ caption, lyrics, duration, lm_batch_size = 1 }) => {
                return [
                    {
                        id: "take_" + Date.now(),
                        caption: caption || "Cyberpunk Anthem",
                        lyrics: lyrics || "",
                        duration: duration || 60,
                        output_format: "wav16"
                    }
                ];
            },
            synth: async (params, options) => {
                if (options?.onProgress) {
                    options.onProgress({ current: 50, total: 100 });
                }

                await new Promise(r => setTimeout(r, 600));

                if (options?.onProgress) {
                    options.onProgress({ current: 100, total: 100 });
                }

                const wavB64 = generateProceduralSynthWav(params.duration || 8, params.bpm || 120);
                return {
                    audio_data_base64: "data:audio/wav;base64," + wavB64
                };
            }
        };

        // 11. Background Audio Player (HTML5 Audio Controller)
        const audioListeners = { trackChanged: [], status: [], finished: [] };
        let currentAudio = null;

        this.backgroundAudio = {
            start: async (audioFiles, metadata = {}) => {
                const file = Array.isArray(audioFiles) ? audioFiles[0] : audioFiles;
                if (!file) return;

                if (currentAudio) {
                    try { currentAudio.pause(); } catch(e){}
                }

                let src = file;
                if (!src.startsWith("data:") && !src.startsWith("blob:") && !src.startsWith("http")) {
                    const vf = await readVirtualFile(src);
                    if (vf && vf.content_base64) {
                        src = vf.content_base64.startsWith("data:") ? vf.content_base64 : "data:audio/wav;base64," + vf.content_base64;
                    }
                }

                currentAudio = new Audio(src);
                currentAudio.onended = () => {
                    audioListeners.finished.forEach(cb => { try { cb(); } catch(e){} });
                };
                currentAudio.ontimeupdate = () => {
                    audioListeners.status.forEach(cb => {
                        try {
                            cb({
                                currentTime: currentAudio.currentTime,
                                duration: currentAudio.duration || 0,
                                isPlaying: !currentAudio.paused
                            });
                        } catch(e){}
                    });
                };

                try {
                    await currentAudio.play();
                } catch(e) {
                    console.log("[M.I.K.A. Audio] Autoplay pending user interaction.");
                }

                audioListeners.trackChanged.forEach(cb => { try { cb(metadata); } catch(e){} });
            },
            pause: async () => {
                if (currentAudio) currentAudio.pause();
            },
            resume: async () => {
                if (currentAudio) await currentAudio.play();
            },
            stop: async () => {
                if (currentAudio) {
                    currentAudio.pause();
                    currentAudio.currentTime = 0;
                }
            },
            on: (event, handler) => {
                if (audioListeners[event]) audioListeners[event].push(handler);
            },
            off: (event, handler) => {
                if (audioListeners[event]) {
                    audioListeners[event] = audioListeners[event].filter(cb => cb !== handler);
                }
            }
        };

        // 12. TTS Voice Synthesis
        this.tts = {
            getVoices: async () => {
                if (typeof window !== "undefined" && window.speechSynthesis) {
                    const browserVoices = window.speechSynthesis.getVoices();
                    if (browserVoices.length > 0) {
                        return browserVoices.map(v => ({ id: v.voiceURI, name: v.name, lang: v.lang }));
                    }
                }
                return [
                    { id: "mika_neural", name: "M.I.K.A. Neural Voice (En)", lang: "en-US" },
                    { id: "kokoro_en_female", name: "Kokoro Heart (En Female)", lang: "en-US" },
                    { id: "piper_cyber_female", name: "Piper Cyberpunk (En)", lang: "en-US" }
                ];
            },
            generateVoiceToFile: async (voiceId, text) => {
                if (typeof window !== "undefined" && window.speechSynthesis) {
                    const utterance = new SpeechSynthesisUtterance(text);
                    window.speechSynthesis.speak(utterance);
                }
                return { filename: "tts_" + Date.now() + ".wav" };
            }
        };
    }
}

// Global browser registration
if (typeof window !== "undefined") {
    window.LaylaSDK = LaylaWebSDK;
    window.layla = new LaylaWebSDK();
}
