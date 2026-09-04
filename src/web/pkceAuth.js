import { setSetting, getSetting } from './db.js';

/**
 * Generates a high-entropy cryptographically random string for PKCE code_verifier
 * (RFC 7636 compliant, URL-safe alphanumeric characters)
 */
export function generateCodeVerifier(length = 64) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const randomValues = new Uint8Array(length);
    if (typeof window !== 'undefined' && window.crypto) {
        window.crypto.getRandomValues(randomValues);
    } else {
        for (let i = 0; i < length; i++) {
            randomValues[i] = Math.floor(Math.random() * 256);
        }
    }
    let result = '';
    for (let i = 0; i < length; i++) {
        result += charset[randomValues[i] % charset.length];
    }
    return result;
}

/**
 * Calculates the SHA-256 digest of the verifier and returns a base64url string
 */
export async function generateCodeChallenge(verifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    
    // Convert ArrayBuffer to binary string
    const bytes = new Uint8Array(hashBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    
    // Base64url encode (RFC 4648 §5)
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

/**
 * Constructs the 1-click OAuth PKCE Authorization URL for the requested provider.
 * Stores the code_verifier and provider in sessionStorage.
 */
export async function buildAuthUrl(provider = 'nanogpt') {
    if (typeof window === 'undefined') return '';
    
    const verifier = generateCodeVerifier(64);
    const challenge = await generateCodeChallenge(verifier);
    
    // Persist PKCE verifier state for exchange upon redirect back
    try {
        sessionStorage.setItem('gs_pkce_verifier', verifier);
        sessionStorage.setItem('gs_pkce_provider', provider);
    } catch (e) {
        console.warn('🐾 [M.I.K.A. PKCE] sessionStorage restricted, falling back to localStorage');
        localStorage.setItem('gs_pkce_verifier', verifier);
        localStorage.setItem('gs_pkce_provider', provider);
    }
    
    const callbackUrl = window.location.origin + window.location.pathname;
    
    if (provider === 'nanogpt') {
        // NanoGPT RFC-compliant PKCE shortcut endpoint
        return `https://nano-gpt.com/auth?callback_url=${encodeURIComponent(callbackUrl)}&code_challenge=${challenge}&code_challenge_method=S256`;
    } else if (provider === 'openrouter') {
        // OpenRouter RFC-compliant PKCE endpoint
        return `https://openrouter.ai/auth?callback_url=${encodeURIComponent(callbackUrl)}&code_challenge=${challenge}&code_challenge_method=S256`;
    }
    
    throw new Error(`Unsupported OAuth provider: ${provider}`);
}

/**
 * Exchanges the returned authorization code for an API key token.
 */
export async function exchangeAuthCode({ code, provider, codeVerifier }) {
    if (!code) throw new Error('Missing authorization code for exchange');
    if (!codeVerifier) throw new Error('Missing PKCE code verifier for exchange');
    
    let tokenUrl = '';
    if (provider === 'nanogpt') {
        tokenUrl = 'https://nano-gpt.com/api/v1/auth/keys';
    } else if (provider === 'openrouter') {
        tokenUrl = 'https://openrouter.ai/api/v1/auth/keys';
    } else {
        throw new Error(`Unknown provider during token exchange: ${provider}`);
    }
    
    const res = await fetch(tokenUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            code: code,
            code_verifier: codeVerifier
        })
    });
    
    if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`OAuth token exchange failed (${res.status}): ${errorText}`);
    }
    
    const data = await res.json();
    // OpenRouter returns { key: "sk-or-v1-..." }
    // NanoGPT returns { key: "sk-nano-...", access_token: "..." }
    const apiKey = data.key || data.access_token || data.token;
    
    if (!apiKey) {
        throw new Error('No API key returned in token exchange payload');
    }
    
    // Save to Dexie IndexedDB
    if (provider === 'nanogpt') {
        await setSetting('byok_nanogpt_key', apiKey.trim());
        await setSetting('activeProvider', 'nanogpt');
    } else if (provider === 'openrouter') {
        await setSetting('byok_openrouter_key', apiKey.trim());
        await setSetting('activeProvider', 'openrouter');
    }
    
    return { success: true, provider, key: apiKey };
}

/**
 * Intercepts incoming OAuth redirect callback if code query param is present.
 * Returns { success: true, provider, key } if processed, or null if no callback detected.
 */
export async function handleOAuthCallback() {
    if (typeof window === 'undefined') return null;
    
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (!code) return null;
    
    let provider = null;
    let codeVerifier = null;
    
    try {
        provider = sessionStorage.getItem('gs_pkce_provider') || localStorage.getItem('gs_pkce_provider') || 'nanogpt';
        codeVerifier = sessionStorage.getItem('gs_pkce_verifier') || localStorage.getItem('gs_pkce_verifier');
    } catch (e) {
        console.warn('🐾 [M.I.K.A. PKCE] Storage access failed');
    }
    
    // If not found in storage, try checking url params or fallback
    if (!codeVerifier) {
        console.error('🐾 [M.I.K.A. PKCE] No PKCE code_verifier found in session. Authorization cannot be verified safely.');
        return null;
    }
    
    try {
        console.log(`🐾 [M.I.K.A. PKCE] Intercepted OAuth authorization code for ${provider}. Exchanging...`);
        const result = await exchangeAuthCode({ code, provider, codeVerifier });
        
        // Clean session storage
        try {
            sessionStorage.removeItem('gs_pkce_verifier');
            sessionStorage.removeItem('gs_pkce_provider');
            localStorage.removeItem('gs_pkce_verifier');
            localStorage.removeItem('gs_pkce_provider');
        } catch (e) {}
        
        // Strip ?code=... from address bar cleanly without page reload
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        
        // Dispatch global notification event
        window.dispatchEvent(new CustomEvent('gacha:auth-success', {
            detail: { provider: result.provider, key: result.key }
        }));
        
        return result;
    } catch (err) {
        console.error('🐾 [M.I.K.A. PKCE] OAuth exchange failed:', err);
        // Strip invalid code so user doesn't loop
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
        throw err;
    }
}

/**
 * Initiates the full OAuth PKCE redirect flow for a chosen provider
 */
export async function startOAuthFlow(provider) {
    const authUrl = await buildAuthUrl(provider);
    if (authUrl) {
        window.location.href = authUrl;
    }
}
