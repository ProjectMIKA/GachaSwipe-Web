import { getApiKey } from './db.js';

const NANOGPT_CHAT_ENDPOINT = 'https://nano-gpt.com/api/v1/chat/completions';
const NANOGPT_IMAGE_ENDPOINT = 'https://nano-gpt.com/api/v1/images/generations';

export class NanoGPTError extends Error {
    constructor(message, status = 500, code = 'AI_ERROR') {
        super(message);
        this.name = 'NanoGPTError';
        this.status = status;
        this.code = code;
    }
}

async function requireApiKey() {
    const key = await getApiKey();
    if (!key || key.trim() === '') {
        throw new NanoGPTError(
            'Missing NanoGPT API Key. Master, please paste your BYOK key into the Cloud Vault!',
            401,
            'MISSING_KEY'
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
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({
                model: 'chatgpt-4o-latest',
                messages: [{ role: 'user', content: 'ping' }],
                max_tokens: 1
            })
        });

        if (res.status === 401 || res.status === 403) {
            throw new NanoGPTError('Authentication rejected. Invalid API key, Master.', res.status, 'AUTH_FAILED');
        }
        if (res.status === 402) {
            throw new NanoGPTError('NanoGPT account has run out of credits.', res.status, 'NO_CREDITS');
        }
        if (res.status === 429) {
            throw new NanoGPTError('NanoGPT rate limit reached! Calm down for a second~', res.status, 'RATE_LIMITED');
        }
        if (!res.ok) {
            const errDetail = await res.text();
            throw new NanoGPTError(`Gateway Error (${res.status}): ${errDetail}`, res.status, 'SERVER_ERROR');
        }

        return { success: true, message: '⚡ Connection established with NanoGPT Matrix.' };
    } catch (err) {
        if (err instanceof NanoGPTError) throw err;
        throw new NanoGPTError(`Network connection failure: ${err.message}`, 0, 'NETWORK_ERROR');
    }
}

/**
 * Generates character personality, dialogue, and stat payload.
 */
export async function generateCharacterPersona({ prompt, systemPrompt, model = 'chatgpt-4o-latest', temperature = 0.85 }) {
    const apiKey = await requireApiKey();
    
    const messages = [];
    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const res = await fetch(NANOGPT_CHAT_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages,
            temperature,
            max_tokens: 1200
        })
    });

    if (!res.ok) {
        if (res.status === 401) throw new NanoGPTError('Unauthorized. Please check your API key.', 401, 'AUTH_FAILED');
        if (res.status === 402) throw new NanoGPTError('Insufficient NanoGPT credits.', 402, 'NO_CREDITS');
        if (res.status === 429) throw new NanoGPTError('Rate limit exceeded.', 429, 'RATE_LIMITED');
        const errDetail = await res.text();
        throw new NanoGPTError(`Generation failed (${res.status}): ${errDetail}`, res.status, 'GEN_FAILED');
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
}

/**
 * Generates card illustration via NanoGPT Image API.
 */
export async function generateCharacterImage({ prompt, model = 'flux-schnell', aspectRatio = '9:16' }) {
    const apiKey = await requireApiKey();

    const res = await fetch(NANOGPT_IMAGE_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            prompt,
            aspect_ratio: aspectRatio,
            n: 1
        })
    });

    if (!res.ok) {
        const errDetail = await res.text();
        throw new NanoGPTError(`Image synthesis failed (${res.status}): ${errDetail}`, res.status, 'IMG_FAILED');
    }

    const data = await res.json();
    const imageUrl = data.data?.[0]?.url || data.output?.[0];
    if (!imageUrl) throw new NanoGPTError('No image returned by NanoGPT.', 500, 'EMPTY_RESPONSE');
    return imageUrl;
}
