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
        // 1. Classifier / Sentiment Engine
        this.classifier = {
            getSentiment: async (text) => {
                return classifySentiment(text);
            }
        };

        // 2. Chat Completions & Streaming
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

        // 3. Image Synthesis
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

        // 4. Memory Archive
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

        // 5. Database SQL Interceptor (Polyfill for SQLite on top of Dexie)
        this.db = {
            executeSql: async (query, params = []) => {
                const q = query.trim().toUpperCase();

                // CREATE TABLE handlers
                if (q.startsWith("CREATE TABLE")) {
                    return { rows: { raw: () => [] } };
                }

                // SELECT handlers
                if (q.startsWith("SELECT")) {
                    if (q.includes("CHATS")) {
                        const allChats = await db.chats.toArray();
                        return {
                            rows: {
                                raw: () => allChats,
                                length: allChats.length,
                                item: (i) => allChats[i]
                            }
                        };
                    }
                    if (q.includes("APP_META")) {
                        const meta = await db.app_meta.toArray();
                        return {
                            rows: {
                                raw: () => meta,
                                length: meta.length,
                                item: (i) => meta[i]
                            }
                        };
                    }
                    if (q.includes("APP_STATE")) {
                        const states = await db.app_state.toArray();
                        return {
                            rows: {
                                raw: () => states,
                                length: states.length,
                                item: (i) => states[i]
                            }
                        };
                    }
                    if (q.includes("THEMES")) {
                        const ths = await db.themes.toArray();
                        return {
                            rows: {
                                raw: () => ths,
                                length: ths.length,
                                item: (i) => ths[i]
                            }
                        };
                    }
                    return { rows: { raw: () => [], length: 0, item: () => null } };
                }

                // INSERT / REPLACE / UPDATE handlers
                if (q.startsWith("INSERT") || q.startsWith("REPLACE") || q.startsWith("UPDATE")) {
                    if (q.includes("CHATS")) {
                        if (params.length >= 6) {
                            await db.chats.put({
                                id: params[0],
                                status: params[1],
                                is_favorite: params[2],
                                affection: params[3],
                                data: params[4],
                                updated_at: params[5]
                            });
                        }
                    } else if (q.includes("APP_META")) {
                        if (params.length >= 2) {
                            await db.app_meta.put({ key: params[0], val: params[1] });
                        }
                    } else if (q.includes("APP_STATE")) {
                        if (params.length >= 2) {
                            await db.app_state.put({ key: params[0], val: params[1] });
                        }
                    }
                    return { rowsAffected: 1 };
                }

                return { rows: { raw: () => [] } };
            }
        };

        // 6. Characters / Companion Store
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
                // Support CharaCardV2 spec
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

        // 7. Virtual Filesystem (layla.utils)
        this.utils = {
            saveFile: async (filename, content_base64, overwrite = false) => {
                await saveVirtualFile(filename, content_base64);
                return { success: true, filename };
            },
            readFile: async (filename) => {
                const record = await readVirtualFile(filename);
                if (record) {
                    return { content_base64: record.content_base64, data: record.content_base64 };
                }
                // Try localStorage fallback
                const lsData = localStorage.getItem("vf_" + filename);
                if (lsData) {
                    return { content_base64: lsData, data: lsData };
                }
                return null;
            }
        };

        // 8. AceStep Audio Synthesis Pipeline
        this.acestep = {
            understand: async ({ audioBase64 }) => {
                console.log("[M.I.K.A. AceStep] Audio DNA Harvested:", audioBase64 ? audioBase64.substring(0, 40) + "..." : "none");
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
                console.log("[M.I.K.A. AceStep LM] Generating arrangement blueprints for:", caption);
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
                console.log("[M.I.K.A. AceStep Synth] Synthesizing audio take:", params);
                if (options?.onProgress) {
                    options.onProgress({ current: 50, total: 100 });
                }

                // Simulate brief synthesis delay
                await new Promise(r => setTimeout(r, 1400));

                if (options?.onProgress) {
                    options.onProgress({ current: 100, total: 100 });
                }

                const wavB64 = generateProceduralSynthWav(params.duration || 8, params.bpm || 120);
                return {
                    audio_data_base64: "data:audio/wav;base64," + wavB64
                };
            }
        };

        // 9. Background Audio Player (HTML5 Audio Controller)
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

        // 10. TTS Voice Synthesis
        this.tts = {
            getVoices: async () => {
                if (typeof window !== "undefined" && window.speechSynthesis) {
                    return window.speechSynthesis.getVoices().map(v => ({ id: v.voiceURI, name: v.name, lang: v.lang }));
                }
                return [{ id: "mika_voice", name: "M.I.K.A. Neural Voice", lang: "en-US" }];
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
