import { getApiKey } from "./db.js";

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

export async function requireApiKey() {
    const key = await getApiKey();
    if (!key || key.trim() === "") {
        throw new NanoGPTError(
            "Missing NanoGPT API Key. Master, please paste your BYOK key into the Cloud Vault!",
            401,
            "MISSING_KEY"
        );
    }
    return key.trim();
}

/**
 * Validates the user's BYOK key with a single-token ping check to avoid burning credits.
 */
export async function testConnection(apiKey) {
    const key = apiKey || await requireApiKey();
    try {
        const res = await fetch(NANOGPT_CHAT_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + key
            },
            body: JSON.stringify({
                model: "chatgpt-4o-latest",
                messages: [{ role: "user", content: "ping" }],
                max_tokens: 1
            })
        });

        if (res.status === 401 || res.status === 403) {
            throw new NanoGPTError("Authentication rejected. Invalid API key, Master.", res.status, "AUTH_FAILED");
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
export function createChatStream({ messages, systemPrompt, model = "chatgpt-4o-latest", temperature = 0.85, signal }) {
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
            const apiKey = await getApiKey();
            if (!apiKey || apiKey.trim() === "") {
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

            const allMessages = [];
            if (systemPrompt) allMessages.push({ role: "system", content: systemPrompt });
            if (messages) allMessages.push(...messages);

            const res = await fetch(NANOGPT_CHAT_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + apiKey.trim()
                },
                body: JSON.stringify({
                    model: model || "chatgpt-4o-latest",
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
export async function generateCharacterPersona({ prompt, systemPrompt, messages, model = "chatgpt-4o-latest", temperature = 0.85 }) {
    const apiKey = await getApiKey();
    if (!apiKey || apiKey.trim() === "") {
        return generateOfflineFallbackPersona(messages || [{ role: "user", content: prompt }]);
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
            "Authorization": "Bearer " + apiKey.trim()
        },
        body: JSON.stringify({
            model,
            messages: allMessages,
            temperature,
            max_tokens: 1200
        })
    });

    if (!res.ok) {
        if (res.status === 401) throw new NanoGPTError("Unauthorized. Please check your API key.", 401, "AUTH_FAILED");
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
export async function generateCharacterImage({ prompt, model = "flux-schnell", aspectRatio = "9:16", onProgress, signal }) {
    const apiKey = await getApiKey();

    // Progress simulation ticker
    let progressTimer = null;
    let currentStep = 1;
    const totalSteps = 20;

    if (onProgress) {
        onProgress("Initializing portrait matrix...", 1, totalSteps);
        progressTimer = setInterval(() => {
            currentStep = Math.min(totalSteps - 1, currentStep + 2);
            onProgress("Rendering neural portrait...", currentStep, totalSteps);
        }, 600);
    }

    try {
        if (!apiKey || apiKey.trim() === "") {
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
                "Authorization": "Bearer " + apiKey.trim()
            },
            body: JSON.stringify({
                model,
                prompt,
                aspect_ratio: aspectRatio,
                n: 1
            }),
            signal
        });

        if (!res.ok) {
            const errDetail = await res.text();
            throw new NanoGPTError("Image synthesis failed (" + res.status + "): " + errDetail, res.status, "IMG_FAILED");
        }

        const data = await res.json();
        const imageUrl = data.data?.[0]?.url || data.output?.[0];
        if (!imageUrl) throw new NanoGPTError("No image returned by NanoGPT.", 500, "EMPTY_RESPONSE");

        if (onProgress) onProgress("Neural portrait complete!", totalSteps, totalSteps);
        return imageUrl;
    } finally {
        if (progressTimer) clearInterval(progressTimer);
    }
}
