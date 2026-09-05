import { getApiKey, getSetting, setSetting, getOpenRouterKey, getActiveProvider } from "./db.js";
export { buildAuthUrl, startOAuthFlow, handleOAuthCallback, exchangeAuthCode } from "./pkceAuth.js";

export const NANOGPT_CHAT_ENDPOINT = "https://nano-gpt.com/api/v1/chat/completions";
export const NANOGPT_IMAGE_ENDPOINT = "https://nano-gpt.com/api/v1/images/generations";
export const OPENROUTER_CHAT_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export class AIClientError extends Error {
    constructor(message, status = 500, code = "AI_ERROR", provider = "nanogpt") {
        super(message);
        this.name = "AIClientError";
        this.status = status;
        this.code = code;
        this.provider = provider;
    }
}

// Backwards-compatible alias for existing NanoGPT handlers
export const NanoGPTError = AIClientError;

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

/**
 * Intelligently normalizes a custom server URL to the /chat/completions endpoint.
 * Accepts: "http://localhost:1234", "http://localhost:1234/v1", "http://localhost:1234/v1/chat/completions"
 */
export function normalizeChatEndpoint(url) {
    if (!url || !url.trim()) return "http://localhost:1234/v1/chat/completions";
    let trimmed = url.trim().replace(/\/+$/, "");
    if (trimmed.endsWith("/chat/completions")) return trimmed;
    if (trimmed.endsWith("/v1")) return `${trimmed}/chat/completions`;
    return `${trimmed}/v1/chat/completions`;
}

/**
 * Normalizes a custom server URL to the /models discovery endpoint.
 */
export function normalizeModelsEndpoint(url) {
    if (!url || !url.trim()) return "http://localhost:1234/v1/models";
    let trimmed = url.trim().replace(/\/+$/, "");
    if (trimmed.endsWith("/chat/completions")) {
        return trimmed.replace(/\/chat\/completions$/, "/models");
    }
    if (trimmed.endsWith("/v1")) return `${trimmed}/models`;
    return `${trimmed}/v1/models`;
}

/**
 * Dynamically resolves the active engine configuration (endpoint, API key, headers, defaults)
 * based on the activeProvider setting in Dexie.
 */
export async function getActiveEngineConfig() {
    const provider = await getSetting("activeProvider", "nanogpt");
    let endpoint = "";
    let apiKey = "";
    let defaultModel = "";
    const headers = { "Content-Type": "application/json" };

    if (provider === "openrouter") {
        const customEndpoint = await getSetting("custom_openrouter_endpoint", "");
        endpoint = (customEndpoint && customEndpoint.trim()) || OPENROUTER_CHAT_ENDPOINT;
        const rawKey = await getSetting("byok_openrouter_key", "");
        apiKey = cleanApiKey(rawKey);
        defaultModel = "openai/gpt-4o-mini";
        if (apiKey) {
            headers["Authorization"] = `Bearer ${apiKey}`;
        }
        if (typeof window !== "undefined") {
            headers["HTTP-Referer"] = window.location.origin;
            headers["X-Title"] = "GachaSwipe";
        }
    } else if (provider === "custom") {
        const customUrl = await getSetting("custom_ai_endpoint", "http://localhost:1234/v1");
        endpoint = normalizeChatEndpoint(customUrl);
        const rawKey = await getSetting("custom_ai_key", "");
        apiKey = cleanApiKey(rawKey) || "not-needed";
        defaultModel = (await getSetting("custom_ai_model", "local-model")) || "local-model";
        if (apiKey && apiKey !== "not-needed") {
            headers["Authorization"] = `Bearer ${apiKey}`;
        }
    } else {
        // Default to NanoGPT
        const customEndpoint = await getSetting("custom_nanogpt_endpoint", "");
        endpoint = (customEndpoint && customEndpoint.trim()) || NANOGPT_CHAT_ENDPOINT;
        const rawKey = await getApiKey();
        apiKey = cleanApiKey(rawKey);
        defaultModel = "z-ai/glm-5.2";
        if (apiKey) {
            headers["Authorization"] = `Bearer ${apiKey}`;
            headers["x-api-key"] = apiKey;
        }
    }

    return { provider, endpoint, apiKey, defaultModel, headers };
}

export async function requireApiKey() {
    const config = await getActiveEngineConfig();
    if (config.provider === "custom") {
        return config.apiKey || "not-needed";
    }
    if (!config.apiKey) {
        throw new AIClientError(
            `Missing API Key for ${config.provider === 'openrouter' ? 'OpenRouter' : 'NanoGPT'}. Master, please connect or paste your key into the API Matrix!`,
            401,
            "MISSING_KEY",
            config.provider
        );
    }
    return config.apiKey;
}

/**
 * Validates connection and credentials for either NanoGPT or OpenRouter.
 */
export async function testConnection(apiKey, targetProvider) {
    const provider = targetProvider || await getSetting("activeProvider", "nanogpt");
    
    // Resolve key if not explicitly passed
    let raw = apiKey;
    if (!raw) {
        if (provider === "openrouter") {
            raw = await getSetting("byok_openrouter_key", "");
        } else if (provider === "custom") {
            raw = await getSetting("custom_ai_key", "");
        } else {
            raw = await getApiKey();
        }
    }
    const key = cleanApiKey(raw);
    
    if (!key && provider !== "custom") {
        throw new AIClientError(
            `Missing API key for ${provider === 'openrouter' ? 'OpenRouter' : 'NanoGPT'}. Master, please paste or pair your key first!`,
            401,
            "MISSING_KEY",
            provider
        );
    }

    // --- CASE 1: OpenRouter Connection Verification ---
    if (provider === "openrouter") {
        try {
            // Check auth and limits using OpenRouter key inspection endpoint
            const keyRes = await fetch("https://openrouter.ai/api/v1/auth/key", {
                method: "GET",
                headers: {
                    "Authorization": "Bearer " + key,
                    "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "https://gachaswipe.app",
                    "X-Title": "GachaSwipe"
                }
            });

            if (keyRes.ok) {
                const info = await keyRes.json();
                const d = info.data || {};
                const limitStr = d.limit !== null && d.limit !== undefined ? `$${Number(d.limit).toFixed(2)} limit` : "No limit";
                const usageStr = d.usage !== undefined ? `$${Number(d.usage).toFixed(3)} used` : "";
                const details = [d.label, limitStr, usageStr].filter(Boolean).join(" • ");
                return {
                    success: true,
                    balance: d,
                    message: `⚡ OpenRouter Uplink Active! ${details || "Connected"}`
                };
            }

            if (keyRes.status === 401) {
                throw new AIClientError("Authentication rejected: Invalid OpenRouter API key.", 401, "AUTH_FAILED", "openrouter");
            }
        } catch (err) {
            if (err instanceof AIClientError) throw err;
        }

        // Secondary fallback: Single-token ping
        try {
            const customEndpoint = await getSetting("custom_openrouter_endpoint", "");
            const endpoint = (customEndpoint && customEndpoint.trim()) || OPENROUTER_CHAT_ENDPOINT;
            
            const res = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + key,
                    "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "https://gachaswipe.app",
                    "X-Title": "GachaSwipe"
                },
                body: JSON.stringify({
                    model: "openai/gpt-4o-mini",
                    messages: [{ role: "user", content: "ping" }],
                    max_tokens: 1
                })
            });

            if (res.status === 401 || res.status === 403) {
                throw new AIClientError("Authentication rejected: Invalid OpenRouter API key.", res.status, "AUTH_FAILED", "openrouter");
            }
            if (res.status === 402) {
                throw new AIClientError("OpenRouter account has insufficient credits.", res.status, "NO_CREDITS", "openrouter");
            }
            if (!res.ok) {
                const errDetail = await res.text();
                throw new AIClientError(`OpenRouter Error (${res.status}): ${errDetail}`, res.status, "SERVER_ERROR", "openrouter");
            }

            return { success: true, message: "⚡ Connection established with OpenRouter Matrix." };
        } catch (err) {
            if (err instanceof AIClientError) throw err;
            throw new AIClientError("Network connection failure: " + err.message, 0, "NETWORK_ERROR", "openrouter");
        }
    }

    // --- CASE 2: NanoGPT Connection Verification ---
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
            throw new AIClientError(
                "Malformed API key format. NanoGPT keys are standard UUIDs (e.g. c7b39a36-...).",
                400,
                "MALFORMED_KEY",
                "nanogpt"
            );
        }
        if (balRes.status === 401 || errJson?.code === "invalid_api_key") {
            throw new AIClientError(
                "Authentication rejected: Invalid NanoGPT API key. Please check your key at nano-gpt.com.",
                401,
                "AUTH_FAILED",
                "nanogpt"
            );
        }
    } catch (err) {
        if (err instanceof AIClientError) throw err;
    }

    // Secondary fallback: Single-token ping
    try {
        let pingModel = "z-ai/glm-5.2";
        try {
            const saved = await getSetting("ai_model");
            if (saved) pingModel = saved;
        } catch (e) {}

        const customEndpoint = await getSetting("custom_nanogpt_endpoint", "");
        const endpoint = (customEndpoint && customEndpoint.trim()) || NANOGPT_CHAT_ENDPOINT;

        const res = await fetch(endpoint, {
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
            throw new AIClientError("Authentication rejected: Invalid NanoGPT key.", res.status, "AUTH_FAILED", "nanogpt");
        }
        if (res.status === 402) {
            throw new AIClientError("NanoGPT account has run out of credits.", res.status, "NO_CREDITS", "nanogpt");
        }
        if (res.status === 429) {
            throw new AIClientError("NanoGPT rate limit reached! Calm down for a second~", res.status, "RATE_LIMITED", "nanogpt");
        }
        if (!res.ok) {
            const errDetail = await res.text();
            throw new AIClientError("Gateway Error (" + res.status + "): " + errDetail, res.status, "SERVER_ERROR", "nanogpt");
        }

        return { success: true, message: "⚡ Connection established with NanoGPT Matrix." };
    } catch (err) {
        if (err instanceof AIClientError) throw err;
        throw new AIClientError("Network connection failure: " + err.message, 0, "NETWORK_ERROR", "nanogpt");
    }

    // --- CASE 3: Custom / Local LLM Server Connection Verification ---
    if (provider === "custom") {
        const rawEndpoint = await getSetting("custom_ai_endpoint", "http://localhost:1234/v1");
        const endpoint = normalizeChatEndpoint(rawEndpoint);
        const modelsEndpoint = normalizeModelsEndpoint(rawEndpoint);
        const customKey = key || await getSetting("custom_ai_key", "");
        const customHeaders = { "Content-Type": "application/json" };
        if (customKey && customKey !== "not-needed") {
            customHeaders["Authorization"] = `Bearer ${customKey}`;
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);
            const res = await fetch(modelsEndpoint, {
                method: "GET",
                headers: customHeaders,
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                const count = Array.isArray(data?.data) ? data.data.length : (Array.isArray(data?.models) ? data.models.length : 0);
                return {
                    success: true,
                    message: `⚡ Connected to Custom Server at ${rawEndpoint} (${count} models detected).`
                };
            }

            // Fallback check against chat completions
            const testRes = await fetch(endpoint, {
                method: "POST",
                headers: customHeaders,
                body: JSON.stringify({
                    model: "test",
                    messages: [{ role: "user", content: "ping" }],
                    max_tokens: 1
                })
            });
            if (testRes.status === 200 || testRes.status === 400 || testRes.status === 404) {
                return {
                    success: true,
                    message: `⚡ Custom Server is online & reachable at ${rawEndpoint}.`
                };
            }
            throw new Error(`Server returned HTTP ${testRes.status}`);
        } catch (err) {
            let msg = err.message;
            if (err.name === "AbortError") {
                msg = `Connection timed out connecting to ${rawEndpoint}. Is LMStudio/Ollama running?`;
            } else if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
                msg = `Unable to reach ${rawEndpoint}. Ensure LMStudio or Ollama is running and CORS is enabled!`;
            }
            throw new AIClientError(`Custom Server Offline: ${msg}`, 0, "NETWORK_ERROR", "custom");
        }
    }
}

/**
 * Fetches available models from the designated provider (or active engine).
 */
export async function fetchAvailableModels(apiKey, targetProvider) {
    const provider = targetProvider || await getSetting("activeProvider", "nanogpt");
    
    // --- Custom / Local Models ---
    if (provider === "custom") {
        const rawEndpoint = await getSetting("custom_ai_endpoint", "http://localhost:1234/v1");
        const modelsEndpoint = normalizeModelsEndpoint(rawEndpoint);
        const rawKey = apiKey || await getSetting("custom_ai_key", "");
        const customKey = cleanApiKey(rawKey);
        const headers = { "Content-Type": "application/json" };
        if (customKey && customKey !== "not-needed") {
            headers["Authorization"] = `Bearer ${customKey}`;
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);
            const res = await fetch(modelsEndpoint, {
                method: "GET",
                headers,
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                const data = await res.json();
                const list = data?.data || data?.models || (Array.isArray(data) ? data : null);
                if (Array.isArray(list) && list.length > 0) {
                    return list.map(m => ({
                        id: m.id || m.name,
                        name: m.name || m.id,
                        owned_by: "local",
                        desc: m.description || `Local model on ${rawEndpoint}`,
                        created: m.created || Date.now() / 1000
                    }));
                }
            }
        } catch (e) {
            console.warn("🐾 [M.I.K.A API] Custom local model discovery error:", e.message);
        }

        const savedCustomModel = await getSetting("custom_ai_model", "local-model");
        return [
            { id: savedCustomModel || "local-model", name: savedCustomModel || "Local Model", owned_by: "local", desc: `Active model on ${rawEndpoint}` }
        ];
    }
    
    // --- OpenRouter Models ---
    if (provider === "openrouter") {
        let raw = apiKey || await getSetting("byok_openrouter_key", "");
        const key = cleanApiKey(raw);
        const headers = { "Content-Type": "application/json" };
        if (key) headers["Authorization"] = "Bearer " + key;
        if (typeof window !== "undefined") {
            headers["HTTP-Referer"] = window.location.origin;
            headers["X-Title"] = "GachaSwipe";
        }

        try {
            const res = await fetch("https://openrouter.ai/api/v1/models", { headers });
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data?.data) && data.data.length > 0) {
                    return data.data.map(m => ({
                        id: m.id,
                        name: m.name || m.id,
                        owned_by: m.id.split("/")[0] || "openrouter",
                        desc: m.description || "",
                        context: m.context_length ? `${Math.round(m.context_length / 1024)}k` : undefined,
                        pricing: m.pricing?.prompt ? `$${(Number(m.pricing.prompt) * 1000000).toFixed(2)}/M` : undefined,
                        created: m.created || Date.now() / 1000
                    }));
                }
            }
        } catch (e) {
            console.warn("🐾 [M.I.K.A API] OpenRouter live model query error:", e.message);
        }

        // Curated OpenRouter Fallbacks
        return [
            { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", owned_by: "openai", desc: "Fast, intelligent, ultra-low latency flagship mini", pricing: "$0.15/M" },
            { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", owned_by: "anthropic", desc: "Supreme roleplay, prose, and emotional intelligence", pricing: "$3.00/M" },
            { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B Instruct", owned_by: "meta-llama", desc: "State-of-the-art open weights flagship intelligence", pricing: "$0.12/M" },
            { id: "deepseek/deepseek-chat", name: "DeepSeek V3", owned_by: "deepseek", desc: "Industry-leading reasoning and conversational flow", pricing: "$0.14/M" },
            { id: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash", owned_by: "google", desc: "Next-gen multimodal Google speed engine", pricing: "$0.10/M" },
            { id: "qwen/qwen-2.5-72b-instruct", name: "Qwen 2.5 72B Instruct", owned_by: "qwen", desc: "Massive open weights model with expressive roleplay", pricing: "$0.35/M" },
            { id: "mistralai/mistral-large-2411", name: "Mistral Large 2", owned_by: "mistralai", desc: "Top tier European multilingual foundation model", pricing: "$2.00/M" }
        ];
    }

    // --- NanoGPT Models ---
    let raw = apiKey || await getApiKey();
    const key = cleanApiKey(raw);
    const customEndpoint = await getSetting("custom_nanogpt_endpoint", "");
    const baseEndpoint = (customEndpoint && customEndpoint.trim()) ? customEndpoint.trim() : "https://nano-gpt.com";
    const modelsUrl = baseEndpoint.endsWith("/models") ? baseEndpoint : `${baseEndpoint.replace(/\/+$/, "")}/api/v1/models`;

    try {
        // Query the full platform catalog unauthenticated so NanoGPT does not restrict
        // the returned models list to only subscription models (x-nanogpt-models-authenticated).
        const [modelsRes, subRes] = await Promise.allSettled([
            fetch(modelsUrl, { method: "GET" }).then(async r => {
                if (r.ok) {
                    const data = await r.json();
                    return data?.data || data?.models || (Array.isArray(data) ? data : []);
                }
                const fallbackUrl = `${baseEndpoint.replace(/\/+$/, "")}/api/models`;
                const r2 = await fetch(fallbackUrl);
                if (r2.ok) {
                    const data2 = await r2.json();
                    return data2?.data || data2?.models || (Array.isArray(data2) ? data2 : []);
                }
                throw new Error(`HTTP ${r.status}`);
            }),
            fetchSubscriptionModels(key)
        ]);

        const baseList = modelsRes.status === "fulfilled" && Array.isArray(modelsRes.value) && modelsRes.value.length > 0
            ? modelsRes.value
            : [
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

        const subList = subRes.status === "fulfilled" && Array.isArray(subRes.value) ? subRes.value : FALLBACK_NANOGPT_SUBSCRIPTION_MODELS;
        const subIdSet = new Set(subList.map(m => m.id));

        const enriched = baseList.map(m => {
            let chatPricing = typeof m.pricing === "string" ? m.pricing : undefined;
            if (m.pricing && typeof m.pricing === "object") {
                if (m.pricing.prompt) {
                    chatPricing = `$${(Number(m.pricing.prompt) * 1000000).toFixed(2)}/M`;
                }
            }
            return {
                ...m,
                pricing: chatPricing,
                subscription: subIdSet.has(m.id)
            };
        });

        const enrichedIds = new Set(enriched.map(m => m.id));
        for (const sub of subList) {
            if (!enrichedIds.has(sub.id)) {
                enriched.push({
                    id: sub.id,
                    name: sub.name || sub.id,
                    owned_by: sub.owned_by || (sub.id.includes("/") ? sub.id.split("/")[0] : "other"),
                    created: sub.created || Date.now() / 1000,
                    subscription: true
                });
            }
        }

        return enriched;
    } catch (err) {
        console.warn("🐾 [M.I.K.A API] NanoGPT model query fallback:", err.message);
        return FALLBACK_NANOGPT_SUBSCRIPTION_MODELS;
    }
}

/**
 * Curated fallback subscription chat models when offline or disconnected.
 */
export const FALLBACK_NANOGPT_SUBSCRIPTION_MODELS = [
    { id: "z-ai/glm-5.3-flash", name: "GLM-5.3 Flash", owned_by: "zhipu", subscription: true },
    { id: "z-ai/glm-5.3-flash-uncensored", name: "GLM-5.3 Flash Uncensored", owned_by: "zhipu", subscription: true },
    { id: "qwen/qwen3.8-27b-uncensored", name: "Qwen 3.8 27B Uncensored", owned_by: "qwen", subscription: true },
    { id: "qwen/qwen3.8-27b-fable", name: "Qwen 3.8 27B Fable", owned_by: "qwen", subscription: true },
    { id: "gemma-4-26b-a4b-uncensored", name: "Gemma 4 26B Uncensored", owned_by: "google", subscription: true },
    { id: "deepseek-reasoner", name: "DeepSeek Reasoner", owned_by: "deepseek", subscription: true },
    { id: "mistralai/Mistral-Nemo-Instruct-2407", name: "Mistral Nemo Instruct", owned_by: "mistral", subscription: true },
    { id: "Sao10K/L3.3-70B-Euryale-v2.3", name: "L3.3 70B Euryale v2.3", owned_by: "meta", subscription: true },
    { id: "venice-uncensored", name: "Venice Uncensored", owned_by: "venice", subscription: true },
    { id: "unsloth/gemma-3-27b-it", name: "Gemma 3 27B IT", owned_by: "gemini", subscription: true },
    { id: "nvidia/Llama-3.3-Nemotron-Super-49B-v1", name: "Nemotron Super 49B", owned_by: "nvidia", subscription: true },
    { id: "shisa-ai/shisa-v2.1-llama3.3-70b", name: "Shisa v2.1 Llama 3.3 70B", owned_by: "shisa", subscription: true },
    { id: "meta-llama/llama-3.2-3b-instruct", name: "Llama 3.2 3B Instruct", owned_by: "meta", subscription: true },
    { id: "huihui-ai/DeepSeek-R1-Distill-Qwen-32B-abliterated", name: "DeepSeek R1 Qwen 32B Abliterated", owned_by: "deepseek", subscription: true },
    { id: "inclusionai/ling-3.0-flash", name: "Ling 3.0 Flash", owned_by: "inclusionai", subscription: true },
    { id: "xiaomi/mimo-v2.5-pro-crof", name: "MiMo v2.5 Pro", owned_by: "xiaomi", subscription: true }
];

/**
 * Live query specifically for NanoGPT subscription chat models.
 */
export async function fetchSubscriptionModels(apiKey) {
    const raw = apiKey || await getApiKey();
    const key = cleanApiKey(raw);
    const headers = { "Content-Type": "application/json" };
    if (key) {
        headers["Authorization"] = "Bearer " + key;
        headers["x-api-key"] = key;
    }

    try {
        const res = await fetch("https://nano-gpt.com/api/subscription/v1/models", {
            method: "GET",
            headers
        });
        if (res.ok) {
            const data = await res.json();
            const list = data?.data || data?.models || (Array.isArray(data) ? data : null);
            if (Array.isArray(list) && list.length > 0) {
                return list.map(m => ({
                    id: m.id,
                    name: m.name || m.id,
                    owned_by: m.owned_by || (m.id.includes("/") ? m.id.split("/")[0] : "other"),
                    created: m.created || Date.now() / 1000,
                    subscription: true
                }));
            }
        }
    } catch (err) {
        console.warn("🐾 [M.I.K.A API] NanoGPT live subscription models query fallback:", err.message);
    }
    return FALLBACK_NANOGPT_SUBSCRIPTION_MODELS;
}

/**
 * Dedicated 5 NanoGPT Subscription Image Generation models.
 */
export const NANOGPT_SUBSCRIPTION_IMAGE_MODELS = [
    { id: "step-image-edit-2", name: "Step Image Edit 2", owned_by: "stepfun", category: "subscription", desc: "Fast text-to-image and prompt-guided image edits (Subscription Included)", pricing: "$0.003/img", subscription: true },
    { id: "z-image-turbo", name: "Z Image Turbo", owned_by: "alibaba", category: "subscription", desc: "High-speed, cinematic image generation (Subscription Included)", pricing: "$0.003/img", subscription: true },
    { id: "qwen-image", name: "Qwen Image", owned_by: "qwen", category: "subscription", desc: "Foundation model with complex text rendering (Subscription Included)", pricing: "$0.005/img", subscription: true },
    { id: "hidream", name: "Hidream I1", owned_by: "hidream", category: "subscription", desc: "Hidream flagship photorealistic rendering (Subscription Included)", pricing: "$0.015/img", subscription: true },
    { id: "chroma", name: "Chroma", owned_by: "chroma", category: "subscription", desc: "Uncensored text-to-image generation (Subscription Included)", pricing: "$0.010/img", subscription: true }
];

/**
 * Normalizes and formats image model pricing into a safe, human-readable string (e.g. "$0.005/img").
 * Handles arbitrary NanoGPT pricing structures (asterisk keys, resolution maps, numbers, strings).
 */
export function formatImagePrice(pricing) {
    if (!pricing) return "$0.010/img";
    if (typeof pricing === "string") {
        if (pricing.startsWith("$")) return pricing;
        const num = parseFloat(pricing);
        return !isNaN(num) ? `$${num.toFixed(3)}/img` : pricing;
    }
    if (typeof pricing === "number") {
        return `$${pricing.toFixed(3)}/img`;
    }
    if (typeof pricing === "object") {
        const perImg = pricing.per_image;
        if (typeof perImg === "number") {
            return `$${perImg.toFixed(3)}/img`;
        }
        if (typeof perImg === "string") {
            const num = parseFloat(perImg);
            return !isNaN(num) ? `$${num.toFixed(3)}/img` : perImg;
        }
        if (perImg && typeof perImg === "object") {
            const preferredKeys = [
                "1024x1024", "1024*1024", "square", "square_hd", "auto", "default",
                "portrait_16_9", "landscape_16_9", "1:1", "1k", "standard", "1080p", "720p"
            ];
            for (const k of preferredKeys) {
                if (perImg[k] !== undefined && perImg[k] !== null) {
                    const num = Number(perImg[k]);
                    if (!isNaN(num)) return `$${num.toFixed(3)}/img`;
                }
            }
            const values = Object.values(perImg);
            for (const val of values) {
                const num = Number(val);
                if (!isNaN(num)) return `$${num.toFixed(3)}/img`;
            }
        }
        if (pricing.price !== undefined && !isNaN(Number(pricing.price))) {
            return `$${Number(pricing.price).toFixed(3)}/img`;
        }
    }
    return "$0.010/img";
}

/**
 * Live query specifically for NanoGPT subscription image models.
 */
export async function fetchSubscriptionImageModels(apiKey) {
    const raw = apiKey || await getApiKey();
    const key = cleanApiKey(raw);
    const headers = { "Content-Type": "application/json" };
    if (key) {
        headers["Authorization"] = "Bearer " + key;
        headers["x-api-key"] = key;
    }

    try {
        const res = await fetch("https://nano-gpt.com/api/subscription/v1/image-models", {
            method: "GET",
            headers
        });
        if (res.ok) {
            const data = await res.json();
            const list = data?.data || data?.models || (Array.isArray(data) ? data : null);
            if (Array.isArray(list) && list.length > 0) {
                return list.map(m => ({
                    id: m.id,
                    name: m.name || m.id,
                    owned_by: m.owned_by || "other",
                    category: "subscription",
                    desc: m.description || "",
                    pricing: formatImagePrice(m.pricing),
                    subscription: true,
                    capabilities: m.capabilities || { image_generation: true }
                }));
            }
        }
    } catch (err) {
        console.warn("🐾 [M.I.K.A API] NanoGPT live subscription image models query fallback:", err.message);
    }
    return NANOGPT_SUBSCRIPTION_IMAGE_MODELS.map(m => ({
        ...m,
        pricing: formatImagePrice(m.pricing),
        subscription: true
    }));
}

/**
 * Curated list of top NanoGPT Image Generation models with metadata and pricing estimates.
 */
export const NANOGPT_IMAGE_MODELS = [
    // --- SUBSCRIPTION INCLUDED ENGINES ---
    ...NANOGPT_SUBSCRIPTION_IMAGE_MODELS,

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
 * Queries live list of Image Generation models from NanoGPT API, enriched with subscription metadata.
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
        const [imagesRes, subImagesRes] = await Promise.allSettled([
            fetch("https://nano-gpt.com/api/v1/images/models", { method: "GET" }).then(async r => {
                if (r.ok) {
                    const data = await r.json();
                    const list = data?.data || data?.models || (Array.isArray(data) ? data : null);
                    if (Array.isArray(list) && list.length > 0) return list;
                }
                const r2 = await fetch("https://nano-gpt.com/api/v1/image-models", { method: "GET" });
                if (r2.ok) {
                    const data2 = await r2.json();
                    const list2 = data2?.data || data2?.models || (Array.isArray(data2) ? data2 : null);
                    if (Array.isArray(list2) && list2.length > 0) return list2;
                }
                throw new Error(`HTTP ${r.status}`);
            }),
            fetchSubscriptionImageModels(key)
        ]);

        const rawList = imagesRes.status === "fulfilled" && Array.isArray(imagesRes.value) && imagesRes.value.length > 0
            ? imagesRes.value
            : NANOGPT_IMAGE_MODELS;

        const subList = subImagesRes.status === "fulfilled" && Array.isArray(subImagesRes.value) && subImagesRes.value.length > 0
            ? subImagesRes.value
            : NANOGPT_SUBSCRIPTION_IMAGE_MODELS;

        const subIdSet = new Set(subList.map(m => m.id));

        const mapped = rawList.map(m => {
            const pricingStr = formatImagePrice(m.pricing);

            let category = m.category || "other";
            const lowId = (m.id || "").toLowerCase();
            const lowName = (m.name || "").toLowerCase();
            const isSub = subIdSet.has(m.id) || m.subscription === true;

            if (isSub) category = "subscription";
            else if (lowId.includes("flux") || lowName.includes("flux")) category = "flux";
            else if (lowId.includes("anime") || lowName.includes("anime") || lowId.includes("illustrious") || lowId.includes("waifu") || lowId.includes("persona")) category = "anime";
            else if (lowId.includes("gpt") || lowId.includes("dall") || m.owned_by === "openai") category = "openai";
            else if (lowId.includes("civitai") || lowId.includes("artiwaifu") || lowId.includes("zuki")) category = "civitai";
            else if (lowId.includes("sd") || lowId.includes("stable-diffusion") || lowId.includes("real") || m.owned_by === "stability") category = "realistic";

            return {
                id: m.id,
                name: m.name || m.id,
                owned_by: m.owned_by || "other",
                category,
                desc: m.description || m.desc || "",
                pricing: pricingStr,
                subscription: isSub,
                capabilities: m.capabilities || { image_generation: true }
            };
        });

        // Ensure all subscription models exist in the mapped list and are flagged correctly
        const existingIds = new Set(mapped.map(m => m.id));
        for (const sub of subList) {
            if (!existingIds.has(sub.id)) {
                mapped.unshift({
                    ...sub,
                    pricing: formatImagePrice(sub.pricing),
                    category: "subscription",
                    subscription: true
                });
            } else {
                const target = mapped.find(m => m.id === sub.id);
                if (target) {
                    target.subscription = true;
                    target.category = "subscription";
                    if (sub.desc && !target.desc) target.desc = sub.desc;
                    if (sub.name && (!target.name || target.name === target.id)) target.name = sub.name;
                }
            }
        }

        return mapped;
    } catch (err) {
        console.warn("🐾 [M.I.K.A API] Live image models query fallback:", err.message);
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
 * Creates an SSE Chat Stream dynamically routed based on activeProvider in Dexie.
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
            const config = await getActiveEngineConfig();

            // Offline simulation if no API key is set for active engine
            if (!config.apiKey) {
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

            // Dynamic model resolution: explicit parameter > saved model in Dexie > provider default
            let activeChatModel = model;
            if (!activeChatModel || activeChatModel === "chatgpt-4o-latest" || activeChatModel === "Default (Auto)") {
                try {
                    const saved = await getSetting("ai_model");
                    if (saved) activeChatModel = saved;
                } catch (e) {}
            }
            if (!activeChatModel) {
                activeChatModel = config.defaultModel;
            }

            const allMessages = [];
            if (systemPrompt) allMessages.push({ role: "system", content: systemPrompt });
            if (messages) allMessages.push(...messages);

            const res = await fetch(config.endpoint, {
                method: "POST",
                headers: config.headers,
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
                throw new AIClientError(`Chat completion failed (${res.status}): ${errDetail}`, res.status, "STREAM_FAILED", config.provider);
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
                        // ignore unparseable chunk
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
 * Standard non-streaming chat completion with dynamic activeProvider routing.
 */
export async function generateCharacterPersona({ prompt, systemPrompt, messages, model, temperature = 0.85 }) {
    const config = await getActiveEngineConfig();
    
    if (!config.apiKey) {
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
        activeChatModel = config.defaultModel;
    }

    const allMessages = [];
    if (systemPrompt) allMessages.push({ role: "system", content: systemPrompt });
    if (messages && messages.length > 0) {
        allMessages.push(...messages);
    } else if (prompt) {
        allMessages.push({ role: "user", content: prompt });
    }

    const res = await fetch(config.endpoint, {
        method: "POST",
        headers: config.headers,
        body: JSON.stringify({
            model: activeChatModel,
            messages: allMessages,
            temperature,
            max_tokens: 1200
        })
    });

    if (!res.ok) {
        if (res.status === 401) throw new AIClientError(`Unauthorized. Please check your ${config.provider} API key.`, 401, "AUTH_FAILED", config.provider);
        if (res.status === 402) throw new AIClientError(`Insufficient ${config.provider} credits.`, 402, "NO_CREDITS", config.provider);
        if (res.status === 429) throw new AIClientError("Rate limit exceeded.", 429, "RATE_LIMITED", config.provider);
        const errDetail = await res.text();
        throw new AIClientError(`Generation failed (${res.status}): ${errDetail}`, res.status, "GEN_FAILED", config.provider);
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

        const customEndpoint = await getSetting("custom_nanogpt_image_endpoint", "");
        const imageEndpoint = (customEndpoint && customEndpoint.trim()) || NANOGPT_IMAGE_ENDPOINT;

        const res = await fetch(imageEndpoint, {
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
                throw new AIClientError("Unauthorized: Invalid NanoGPT API key.", 401, "AUTH_FAILED", "nanogpt");
            }
            if (res.status === 402) {
                throw new AIClientError("Insufficient NanoGPT balance for image generation.", 402, "NO_CREDITS", "nanogpt");
            }
            if (res.status === 429) {
                throw new AIClientError("NanoGPT image rate limit reached. Please wait a moment.", 429, "RATE_LIMITED", "nanogpt");
            }
            throw new AIClientError(`Image synthesis failed (${res.status}): ${errDetail}`, res.status, "IMG_FAILED", "nanogpt");
        }

        const data = await res.json();
        const imageUrl = data.data?.[0]?.url 
            || data.output?.[0] 
            || data.images?.[0]?.url 
            || (data.data?.[0]?.b64_json ? `data:image/png;base64,${data.data[0].b64_json}` : null);

        if (!imageUrl) throw new AIClientError("No image returned by NanoGPT.", 500, "EMPTY_RESPONSE", "nanogpt");

        if (onProgress) onProgress("Neural portrait complete!", totalSteps, totalSteps);
        return imageUrl;
    } finally {
        if (progressTimer) clearInterval(progressTimer);
    }
}
