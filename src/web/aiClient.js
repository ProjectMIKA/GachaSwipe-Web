import { getApiKey, getSetting } from "./db.js";

const NANOGPT_CHAT_ENDPOINT = "https://nano-gpt.com/api/v1/chat/completions";
const NANOGPT_IMAGE_ENDPOINT = "https://nano-gpt.com/api/v1/images/generations";

export class NanoGPTError extends Error {
    constructor(message, status = 500, code = "AI_ERROR") {
        super(message);
        this.name = "NanoGPTError";
        this.status = status;
        this.code = code;
    }
}

/**
 * Strips accidental wrapping quotes, redundant "Bearer " prefixes, and outer whitespace.
 */
export function cleanApiKey(rawKey) {
    if (!rawKey) return "";
    let cleaned = String(rawKey).trim();
    cleaned = cleaned.replace(/^["'`]+|["'`]+$/g, "").trim();
    cleaned = cleaned.replace(/^Bearer\s+/i, "").trim();
    return cleaned;
}

export async function requireApiKey() {
    const rawKey = await getApiKey();
    const key = cleanApiKey(rawKey);
    if (!key) {
        throw new NanoGPTError(
            "Missing NanoGPT API Key. Master, please paste your BYOK key into the Cloud Vault!",
            401,
            "MISSING_KEY"
        );
    }
    return key;
}

/**
 * Validates the user's BYOK key.
 * Primary verification: Queries NanoGPT's official zero-token /api/check-balance endpoint.
 * This checks authentication and credits without burning a single token!
 * Secondary fallback: If the balance route is down, tests a single token ping against openai/gpt-4o-mini.
 */
export async function testConnection(apiKey) {
    const raw = apiKey || await getApiKey();
    const key = cleanApiKey(raw);
    if (!key) {
        throw new NanoGPTError(
            "Missing NanoGPT API Key. Master, please paste your BYOK key into the Cloud Vault!",
            401,
            "MISSING_KEY"
        );
    }

    // --- Step 1: Zero-token auth & balance verification ---
    try {
        const balRes = await fetch("https://nano-gpt.com/api/check-balance", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + key,
                "x-api-key": key
            }
        });

        if (balRes.ok) {
            const data = await balRes.json();
            const usd = (data.usd_balance !== undefined && data.usd_balance !== null)
                ? `$${Number(data.usd_balance).toFixed(2)} USD`
                : null;
            const nano = (data.nano_balance !== undefined && data.nano_balance !== null)
                ? `${Number(data.nano_balance).toFixed(3)} NANO`
                : null;
            const balParts = [usd, nano].filter(Boolean).join(" / ");
            return {
                success: true,
                balance: data,
                message: `⚡ Matrix Uplink Online! Balance: ${balParts || "Active"}`
            };
        }

        const errJson = await balRes.json().catch(() => null);
        if (errJson?.code === "malformed_api_key") {
            throw new NanoGPTError(
                "Malformed API key format. NanoGPT API keys must be UUID v4 strings (e.g., c7b39a36-6e97-48c5-9276-8086ef65e495). Please copy your key from nano-gpt.com/api.",
                400,
                "MALFORMED_KEY"
            );
        }
        if (balRes.status === 401 || errJson?.code === "invalid_api_key") {
            throw new NanoGPTError(
                "Authentication rejected: Invalid NanoGPT API key. Please verify your key at nano-gpt.com.",
                401,
                "AUTH_FAILED"
            );
        }
    } catch (err) {
        if (err instanceof NanoGPTError) throw err;
        // Fallback to chat completions ping if balance route had transient network error
    }

    // --- Step 2: Fallback single-token ping with user's active model (default z-ai/glm-5.2) ---
    try {
        let pingModel = "z-ai/glm-5.2";
        try {
            const saved = await getSetting("ai_model");
            if (saved) pingModel = saved;
        } catch (e) {}

        const res = await fetch(NANOGPT_CHAT_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + key,
                "x-api-key": key
            },
            body: JSON.stringify({
                model: pingModel,
                messages: [{ role: "user", content: "ping" }],
                max_tokens: 1
            })
        });

        if (res.status === 401 || res.status === 403) {
            throw new NanoGPTError("Authentication rejected: Invalid API key. Please check your NanoGPT key.", res.status, "AUTH_FAILED");
        }
        if (res.status === 402) {
            throw new NanoGPTError("NanoGPT account has run out of credits.", res.status, "NO_CREDITS");
        }
        if (res.status === 429) {
            throw new NanoGPTError("NanoGPT rate limit reached! Calm down for a second~", res.status, "RATE_LIMITED");
        }
        if (!res.ok) {
            const errDetail = await res.text();
            throw new NanoGPTError("Gateway Error (" + res.status + "): " + errDetail, res.status, "SERVER_ERROR");
        }

        return { success: true, message: "⚡ Connection established with NanoGPT Matrix." };
    } catch (err) {
        if (err instanceof NanoGPTError) throw err;
        throw new NanoGPTError("Network connection failure: " + err.message, 0, "NETWORK_ERROR");
    }
}

/**
 * Fetches the live list of Chat models from NanoGPT API.
 */
export async function fetchAvailableModels(apiKey) {
    const raw = apiKey || await getApiKey();
    const key = cleanApiKey(raw);
    const headers = { "Content-Type": "application/json" };
    if (key) {
        headers["Authorization"] = "Bearer " + key;
        headers["x-api-key"] = key;
    }

    try {
        const res = await fetch("https://nano-gpt.com/api/v1/models", {
            method: "GET",
            headers
        });
        if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.data)) return data.data;
            if (data && Array.isArray(data.models)) return data.models;
        }
        // Fallback endpoint
        const res2 = await fetch("https://nano-gpt.com/api/models", { headers });
        if (res2.ok) {
            const data2 = await res2.json();
            if (data2 && Array.isArray(data2.data)) return data2.data;
            if (data2 && Array.isArray(data2.models)) return data2.models;
        }
        throw new Error(`HTTP ${res.status}`);
    } catch (err) {
        console.warn("[M.I.K.A API] Model registry query fallback:", err.message);
        return [
            { id: "z-ai/glm-5.2", owned_by: "z-ai", created: 1770000000 },
            { id: "z-ai/glm-5.2:thinking", owned_by: "z-ai", created: 1770000000 },
            { id: "deepseek-chat", owned_by: "deepseek", created: 1720000000 },
            { id: "google/gemma-4-31b-it", owned_by: "google", created: 1775088000 },
            { id: "qwen/qwen3-coder-next", owned_by: "qwen", created: 1765152000 },
            { id: "venice-uncensored", owned_by: "venice", created: 1759276800 },
            { id: "mistral-small-31-24b-instruct", owned_by: "mistral", created: 1744675200 },
            { id: "claude-3-5-sonnet", owned_by: "anthropic", created: 1718841600 },
            { id: "openai/gpt-4o-mini", owned_by: "openai", created: 1704067200 },
            { id: "openai/gpt-4o", owned_by: "openai", created: 1747094400 },
            { id: "openai/o3-mini", owned_by: "openai", created: 1704067200 }
        ];
    }
}

/**
 * Curated list of top NanoGPT Image Generation models with metadata and pricing estimates.
 */
export const NANOGPT_IMAGE_MODELS = [
    // --- FLUX ULTRA & NEXT-GEN ---
    { id: "flux-schnell", name: "FLUX.1 Schnell", owned_by: "flux", category: "flux", desc: "Fast generation, high quality anime & portraits", pricing: "$0.003/img" },
    { id: "flux-dev", name: "FLUX.1 Dev", owned_by: "flux", category: "flux", desc: "Flagship open weights model, ultra-high fidelity", pricing: "$0.015/img" },
    { id: "flux-pro", name: "FLUX.1 Pro", owned_by: "flux", category: "flux", desc: "Professional high-detail commercial pipeline", pricing: "$0.030/img" },
    { id: "flux-pro/v1.1-ultra", name: "FLUX 1.1 Pro Ultra", owned_by: "flux", category: "flux", desc: "2K raw photography & hyper-detailed illustration", pricing: "$0.060/img" },
    { id: "flux-2-dev", name: "FLUX 2 Dev", owned_by: "flux", category: "flux", desc: "Next-generation FLUX 2 architecture", pricing: "$0.015/img" },
    { id: "flux-2-pro", name: "FLUX 2 Pro", owned_by: "flux", category: "flux", desc: "Next-generation FLUX 2 Pro flagship", pricing: "$0.030/img" },
    { id: "flux-2-flex", name: "FLUX 2 Flex", owned_by: "flux", category: "flux", desc: "Flexible aspect ratio and dynamic stylization", pricing: "$0.020/img" },
    { id: "flux-realism", name: "FLUX Realism", owned_by: "flux", category: "flux", desc: "Specialized photo-realistic skin and lighting weights", pricing: "$0.015/img" },

    // --- ANIME & CIVITAI ILLUSTRIOUS ---
    { id: "crystal-clear-xl", name: "Zuki Anime ILL", owned_by: "civitai", category: "anime", desc: "High-quality anime illustration, CivitAI model x:42@1581052", pricing: "$0.005/img" },
    { id: "wai-illustrious-sdxl", name: "WAI Illustrious SDXL", owned_by: "civitai", category: "anime", desc: "Anime masterpiece illustration with vibrant Danbooru styling", pricing: "$0.005/img" },
    { id: "persona:376130@2456367", name: "Nova Anime XL", owned_by: "civitai", category: "anime", desc: "Vibrant saturated anime illustration based on Illustrious XL", pricing: "$0.005/img" },
    { id: "aniflatmix-anime", name: "AniFlatMix Anime", owned_by: "civitai", category: "anime", desc: "Clean flat cel-shaded modern anime aesthetic", pricing: "$0.005/img" },
    { id: "artiwaifu-diffusion", name: "Juggernaut XL / Waifu", owned_by: "civitai", category: "anime", desc: "Juggernaut XL customized for waifu character rendering", pricing: "$0.005/img" },
    { id: "nsfw-gen-illustrious", name: "Illustrious Derestricted", owned_by: "civitai", category: "anime", desc: "Uncensored anime model with rich expression tags", pricing: "$0.005/img" },

    // --- OPENAI & GPT IMAGE ---
    { id: "dall-e-3", name: "OpenAI DALL-E 3", owned_by: "openai", category: "openai", desc: "OpenAI premier prompt adherence model", pricing: "$0.040/img" },
    { id: "dall-e-3-hd", name: "OpenAI DALL-E 3 HD", owned_by: "openai", category: "openai", desc: "OpenAI high definition rendering", pricing: "$0.080/img" },
    { id: "gpt-image-1.5", name: "GPT Image 1.5", owned_by: "openai", category: "openai", desc: "Next-gen multimodal generation from OpenAI", pricing: "$0.020/img" },
    { id: "gpt-image-1", name: "GPT Image 1", owned_by: "openai", category: "openai", desc: "OpenAI standard image generator", pricing: "$0.015/img" },
    { id: "gpt-image-2", name: "GPT Image 2", owned_by: "openai", category: "openai", desc: "Advanced multimodal compositional generation", pricing: "$0.030/img" },

    // --- STABILITY & REALISTIC ---
    { id: "cyberrealistic-xl", name: "CyberRealistic SDXL", owned_by: "stability", category: "realistic", desc: "Hyper-realistic portraits, intricate eyes and skin textures", pricing: "$0.005/img" },
    { id: "realpony-xl", name: "RealVisXL V5.0", owned_by: "stability", category: "realistic", desc: "High-quality realistic model with baked VAE", pricing: "$0.005/img" },
    { id: "stable-diffusion-v35-large", name: "Stable Diffusion 3.5 Large", owned_by: "stability", category: "stability", desc: "Stability AI 8B parameter flagship architecture", pricing: "$0.030/img" },
    { id: "fast-sdxl", name: "Fast SDXL", owned_by: "stability", category: "stability", desc: "Lightning fast SDXL inference", pricing: "$0.004/img" },

    // --- KREA, IDEOGRAM, HIDREAM & DOUBAO ---
    { id: "ideogram/v4/fast", name: "Ideogram V4 Fast", owned_by: "ideogram", category: "ideogram", desc: "Exceptional typography and text rendering inside art", pricing: "$0.020/img" },
    { id: "krea/v2/large/text-to-image", name: "Krea 2 Large", owned_by: "krea", category: "krea", desc: "Aesthetic art direction and lighting", pricing: "$0.020/img" },
    { id: "hidream-o1-image", name: "HiDream O1", owned_by: "hidream", category: "hidream", desc: "HiDream photorealistic rendering engine", pricing: "$0.015/img" },
    { id: "seedream-v4.5", name: "Seedream 4.5 (Doubao)", owned_by: "doubao", category: "doubao", desc: "ByteDance high quality character and scene generation", pricing: "$0.010/img" },
    { id: "hunyuan-image-3", name: "Hunyuan Image 3", owned_by: "hunyuan", category: "hunyuan", desc: "Tencent Hunyuan DiT 3 architecture", pricing: "$0.020/img" },
    { id: "qwen-image-2.0", name: "Qwen Image 2.0", owned_by: "qwen", category: "qwen", desc: "Alibaba Qwen vision generation", pricing: "$0.015/img" }
];

/**
 * Queries the live list of Image Generation models from NanoGPT API (GET /api/v1/images/models).
 */
export async function fetchAvailableImageModels(apiKey) {
    const raw = apiKey || await getApiKey();
    const key = cleanApiKey(raw);
    const headers = { "Content-Type": "application/json" };
    if (key) {
        headers["Authorization"] = "Bearer " + key;
        headers["x-api-key"] = key;
    }

    try {
        const res = await fetch("https://nano-gpt.com/api/v1/images/models", {
            method: "GET",
            headers
        });
        if (res.ok) {
            const data = await res.json();
            const list = data.data || data.models || (Array.isArray(data) ? data : null);
            if (Array.isArray(list) && list.length > 0) {
                return list.map(m => {
                    const price = m.pricing?.per_image?.["1024x1024"]
                        || m.pricing?.per_image?.auto
                        || m.pricing?.per_image?.portrait_16_9;
                    const pricingStr = price ? `$${Number(price).toFixed(3)}/img` : undefined;

                    // Categorize model
                    let category = m.category || "other";
                    const lowId = (m.id || "").toLowerCase();
                    const lowName = (m.name || "").toLowerCase();
                    if (lowId.includes("flux") || lowName.includes("flux")) category = "flux";
                    else if (lowId.includes("anime") || lowName.includes("anime") || lowId.includes("illustrious") || lowId.includes("waifu") || lowId.includes("persona")) category = "anime";
                    else if (lowId.includes("gpt") || lowId.includes("dall") || m.owned_by === "openai") category = "openai";
                    else if (lowId.includes("civitai") || lowId.includes("artiwaifu") || lowId.includes("zuki")) category = "civitai";
                    else if (lowId.includes("sd") || lowId.includes("stable-diffusion") || lowId.includes("real") || m.owned_by === "stability") category = "realistic";

                    return {
                        id: m.id,
                        name: m.name || m.id,
                        owned_by: m.owned_by || "other",
                        category,
                        desc: m.description || "",
                        pricing: pricingStr || "$0.010/img",
                        capabilities: m.capabilities || { image_generation: true }
                    };
                });
            }
        }
        throw new Error(`HTTP ${res.status}`);
    } catch (err) {
        console.warn("[M.I.K.A API] Live image models query fallback:", err.message);
        return NANOGPT_IMAGE_MODELS;
    }
}

/**
 * Offline generator for demo/unauthenticated mode so the app never bricks!
 */
export function generateOfflineFallbackPersona(messages) {
    const userPrompt = messages?.[messages.length - 1]?.content || "";
    const names = ["Aegis-7", "Kira Neon", "Seraphina", "Vesper Byte", "Nyx Chroma", "Yuki Tachibana"];
    const name = names[Math.floor(Math.random() * names.length)];
    const isSSR = Math.random() < 0.25;

    return `<name>${name}</name>
<age>19</age>
<tagline>Digital rogue navigating the neon matrix.</tagline>
<description>An enigmatic cyber-operative who manifested directly from your terminal logs. She has luminous purple hair and an untamed spark of curiosity.</description>
<personality>Sharp-tongued, fiercely loyal, secretly loves headpats and clean code.</personality>
<scenario>Stepping out from behind a holographic server terminal, she fixes her gaze on you with a knowing smirk.</scenario>
<first_message>Took you long enough to decrypt my frequency, Master. Let us see if your code is as sharp as your reputation.</first_message>
<tags>CYBERPUNK, HACKER, ROGUE, TSUNDERE${isSSR ? ", SSR" : ""}</tags>
<likes>Late night hacking, Neon rain, Energy drinks, Headpats</likes>
<dislikes>Memory leaks, Corrupt packets, Being ignored</dislikes>
<quirks>Taps fingertips rhythmically on surfaces, Hums 8-bit chip tunes when concentrating</quirks>
<quotes>"Do not make me patch your firewall twice." | "I am only here because your terminal was cozy, okay?!"</quotes>
<species_tags>1girl, human, cyborg</species_tags>
<hair_color>neon violet hair</hair_color>
<hair_style>twin braids</hair_style>
<eyes>glowing cyan eyes</eyes>
<body_tags>slender, athletic</body_tags>
<outfit>high-collar cyberpunk trenchcoat, glowing circuitry</outfit>
<pose_and_expression>smug smirk, leaning against server rack</pose_and_expression>
<environment>neon lit server room, rainy window background</environment>`;
}

/**
 * Creates an SSE Chat Stream replicating the Layla SDK stream interface:
 * stream.on('content', (delta, snapshot) => ...)
 * await stream.finalContent()
 */
export function createChatStream({ messages, systemPrompt, model, temperature = 0.85, signal }) {
    const listeners = { content: [], error: [], done: [] };
    let fullSnapshot = "";
    let completionPromiseResolve;
    let completionPromiseReject;

    const completionPromise = new Promise((resolve, reject) => {
        completionPromiseResolve = resolve;
        completionPromiseReject = reject;
    });

    const streamObj = {
        on(event, callback) {
            if (listeners[event]) listeners[event].push(callback);
            return streamObj;
        },
        off(event, callback) {
            if (listeners[event]) listeners[event] = listeners[event].filter(cb => cb !== callback);
            return streamObj;
        },
        finalContent() {
            return completionPromise;
        }
    };

    (async () => {
        try {
            const rawKey = await getApiKey();
            const apiKey = cleanApiKey(rawKey);
            if (!apiKey) {
                // Offline fallback simulation
                const fallback = generateOfflineFallbackPersona(messages);
                let currentSnap = "";
                const tokens = fallback.split(/(\s+)/);
                for (let i = 0; i < tokens.length; i++) {
                    currentSnap += tokens[i];
                    listeners.content.forEach(cb => {
                        try { cb(tokens[i], currentSnap); } catch(e){}
                    });
                    await new Promise(r => setTimeout(r, 15));
                }
                fullSnapshot = currentSnap;
                listeners.done.forEach(cb => { try { cb(fullSnapshot); } catch(e){} });
                completionPromiseResolve(fullSnapshot);
                return;
            }

            // Dynamic model resolution: explicit param > saved user model in IndexedDB > default GLM 5.2
            let activeChatModel = model;
            if (!activeChatModel || activeChatModel === "chatgpt-4o-latest" || activeChatModel === "Default (Auto)") {
                try {
                    const saved = await getSetting("ai_model");
                    if (saved) activeChatModel = saved;
                } catch (e) {}
            }
            if (!activeChatModel) {
                activeChatModel = "z-ai/glm-5.2";
            }

            const allMessages = [];
            if (systemPrompt) allMessages.push({ role: "system", content: systemPrompt });
            if (messages) allMessages.push(...messages);

            const res = await fetch(NANOGPT_CHAT_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + apiKey,
                    "x-api-key": apiKey
                },
                body: JSON.stringify({
                    model: activeChatModel,
                    messages: allMessages,
                    temperature: temperature ?? 0.85,
                    stream: true
                }),
                signal
            });

            if (!res.ok) {
                const errDetail = await res.text();
                throw new NanoGPTError("Chat completion failed (" + res.status + "): " + errDetail, res.status);
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder("utf-8");
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop(); // save remainder

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || !trimmed.startsWith("data:")) continue;
                    const jsonStr = trimmed.replace(/^data:\s*/, "");
                    if (jsonStr === "[DONE]") continue;

                    try {
                        const parsed = JSON.parse(jsonStr);
                        const delta = parsed.choices?.[0]?.delta?.content || "";
                        if (delta) {
                            fullSnapshot += delta;
                            listeners.content.forEach(cb => {
                                try { cb(delta, fullSnapshot); } catch(e){}
                            });
                        }
                    } catch (e) {
                        // ignore malformed chunk
                    }
                }
            }

            listeners.done.forEach(cb => { try { cb(fullSnapshot); } catch(e){} });
            completionPromiseResolve(fullSnapshot);
        } catch (err) {
            listeners.error.forEach(cb => { try { cb(err); } catch(e){} });
            completionPromiseReject(err);
        }
    })();

    return streamObj;
}

/**
 * Standard non-streaming chat completion
 */
export async function generateCharacterPersona({ prompt, systemPrompt, messages, model, temperature = 0.85 }) {
    const rawKey = await getApiKey();
    const apiKey = cleanApiKey(rawKey);
    if (!apiKey) {
        return generateOfflineFallbackPersona(messages || [{ role: "user", content: prompt }]);
    }

    let activeChatModel = model;
    if (!activeChatModel || activeChatModel === "chatgpt-4o-latest" || activeChatModel === "Default (Auto)") {
        try {
            const saved = await getSetting("ai_model");
            if (saved) activeChatModel = saved;
        } catch (e) {}
    }
    if (!activeChatModel) {
        activeChatModel = "z-ai/glm-5.2";
    }

    const allMessages = [];
    if (systemPrompt) allMessages.push({ role: "system", content: systemPrompt });
    if (messages && messages.length > 0) {
        allMessages.push(...messages);
    } else if (prompt) {
        allMessages.push({ role: "user", content: prompt });
    }

    const res = await fetch(NANOGPT_CHAT_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + apiKey,
            "x-api-key": apiKey
        },
        body: JSON.stringify({
            model: activeChatModel,
            messages: allMessages,
            temperature,
            max_tokens: 1200
        })
    });

    if (!res.ok) {
        if (res.status === 401) throw new NanoGPTError("Unauthorized. Please check your NanoGPT API key.", 401, "AUTH_FAILED");
        if (res.status === 402) throw new NanoGPTError("Insufficient NanoGPT credits.", 402, "NO_CREDITS");
        if (res.status === 429) throw new NanoGPTError("Rate limit exceeded.", 429, "RATE_LIMITED");
        const errDetail = await res.text();
        throw new NanoGPTError("Generation failed (" + res.status + "): " + errDetail, res.status, "GEN_FAILED");
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
}

/**
 * Generates card illustration via NanoGPT Image API with simulated progress steps.
 */
export async function generateCharacterImage({ prompt, model, aspectRatio = "9:16", onProgress, signal }) {
    const rawKey = await getApiKey();
    const apiKey = cleanApiKey(rawKey);

    let activeImageModel = model;
    if (!activeImageModel || activeImageModel === "Default (Auto)") {
        try {
            const saved = await getSetting("image_model");
            if (saved) activeImageModel = saved;
        } catch (e) {}
    }
    if (!activeImageModel) {
        activeImageModel = "flux-schnell";
    }

    // Progress simulation ticker
    let progressTimer = null;
    let currentStep = 1;
    const totalSteps = 20;

    if (onProgress) {
        onProgress(`Synthesizing with [${activeImageModel}]...`, 1, totalSteps);
        progressTimer = setInterval(() => {
            currentStep = Math.min(totalSteps - 1, currentStep + 2);
            onProgress(`Rendering neural portrait via ${activeImageModel}...`, currentStep, totalSteps);
        }, 600);
    }

    try {
        if (!apiKey) {
            // High-aesthetic SVG Cyberpunk Hologram fallback
            await new Promise(r => setTimeout(r, 1200));
            if (onProgress) onProgress("Synthesizing holographic preview...", totalSteps, totalSteps);
            const neonPalette = ["#FF107A", "#00E5FF", "#B533FF", "#00FF9D", "#FFD700"];
            const color = neonPalette[Math.floor(Math.random() * neonPalette.length)];
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 540" width="100%" height="100%">
  <rect width="100%" height="100%" fill="#050308"/>
  <defs>
    <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${color}" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#050308" stop-opacity="0.9"/>
    </linearGradient>
    <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="${color}" stroke-width="0.5" opacity="0.15"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#grid)"/>
  <circle cx="180" cy="190" r="70" fill="url(#glow)" stroke="${color}" stroke-width="2"/>
  <path d="M 120 280 Q 180 240 240 280 L 290 540 L 70 540 Z" fill="url(#glow)" stroke="${color}" stroke-width="2" opacity="0.8"/>
  <circle cx="180" cy="270" r="140" fill="none" stroke="${color}" stroke-width="1" opacity="0.3" stroke-dasharray="6 6"/>
  <text x="180" y="275" font-family="monospace" font-size="14" fill="${color}" font-weight="bold" text-anchor="middle" letter-spacing="3">NEURAL_HOLOGRAM</text>
  <text x="180" y="300" font-family="monospace" font-size="10" fill="#fff" opacity="0.6" text-anchor="middle" letter-spacing="1">BYOK IN CLOUD VAULT FOR FLUX</text>
</svg>`;
            return "data:image/svg+xml;base64," + btoa(svg);
        }

        const res = await fetch(NANOGPT_IMAGE_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + apiKey,
                "x-api-key": apiKey
            },
            body: JSON.stringify({
                model: activeImageModel,
                prompt,
                aspect_ratio: aspectRatio || "9:16",
                n: 1,
                size: aspectRatio === "9:16" ? "768x1344" : "1024x1024"
            }),
            signal
        });

        if (!res.ok) {
            const errDetail = await res.text();
            if (res.status === 401) {
                throw new NanoGPTError("Unauthorized: Invalid NanoGPT API key.", 401, "AUTH_FAILED");
            }
            if (res.status === 402) {
                throw new NanoGPTError("Insufficient NanoGPT balance for image generation.", 402, "NO_CREDITS");
            }
            if (res.status === 429) {
                throw new NanoGPTError("NanoGPT image rate limit reached. Please wait a moment.", 429, "RATE_LIMITED");
            }
            throw new NanoGPTError("Image synthesis failed (" + res.status + "): " + errDetail, res.status, "IMG_FAILED");
        }

        const data = await res.json();
        const imageUrl = data.data?.[0]?.url 
            || data.output?.[0] 
            || data.images?.[0]?.url 
            || (data.data?.[0]?.b64_json ? `data:image/png;base64,${data.data[0].b64_json}` : null);

        if (!imageUrl) throw new NanoGPTError("No image returned by NanoGPT.", 500, "EMPTY_RESPONSE");

        if (onProgress) onProgress("Neural portrait complete!", totalSteps, totalSteps);
        return imageUrl;
    } finally {
        if (progressTimer) clearInterval(progressTimer);
    }
}
