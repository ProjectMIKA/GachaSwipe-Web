import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    getSetting, 
    setSetting, 
    useSetting, 
    getApiKey, 
    setApiKey, 
    getOpenRouterKey, 
    setOpenRouterKey,
    getActiveProvider,
    setActiveProvider,
    getCustomAiEndpoint,
    setCustomAiEndpoint,
    getCustomAiKey,
    setCustomAiKey,
    getCustomAiModel,
    setCustomAiModel
} from '../db.js';
import { 
    cleanApiKey, 
    testConnection, 
    fetchAvailableModels, 
    fetchAvailableImageModels, 
    NANOGPT_IMAGE_MODELS,
    NANOGPT_CHAT_ENDPOINT,
    OPENROUTER_CHAT_ENDPOINT,
    normalizeChatEndpoint,
    normalizeModelsEndpoint
} from '../aiClient.js';
import { startOAuthFlow } from '../pkceAuth.js';

export const ApiMatrix = ({ onModelChange, onImageModelChange }) => {
    // --- Reactive Dexie Settings ---
    const nanoGptKey = useSetting('byok_nanogpt_key', '') || '';
    const openRouterKey = useSetting('byok_openrouter_key', '') || '';
    const activeProvider = useSetting('activeProvider', 'nanogpt') || 'nanogpt';
    const activeModel = useSetting('ai_model', activeProvider === 'openrouter' ? 'openai/gpt-4o-mini' : 'z-ai/glm-5.2');
    const activeImageModel = useSetting('image_model', 'flux-schnell');
    const customNanoEndpoint = useSetting('custom_nanogpt_endpoint', '') || '';
    const customOpenRouterEndpoint = useSetting('custom_openrouter_endpoint', '') || '';
    const subOnlyChat = useSetting('nanogpt_sub_only_chat', false);
    const subOnlyImage = useSetting('nanogpt_sub_only_image', false);
    const customAiEndpoint = useSetting('custom_ai_endpoint', 'http://localhost:1234/v1') || 'http://localhost:1234/v1';
    const customAiKey = useSetting('custom_ai_key', '') || '';
    const customAiModel = useSetting('custom_ai_model', 'local-model') || 'local-model';

    // --- Local UI State ---
    const [subTab, setSubTab] = useState('chat'); // 'chat' | 'image'
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
    
    // Manual Key Inputs (inside Advanced)
    const [manualNanoKey, setManualNanoKey] = useState('');
    const [manualOpenRouterKey, setManualOpenRouterKey] = useState('');
    const [showNanoKey, setShowNanoKey] = useState(false);
    const [showOpenRouterKey, setShowOpenRouterKey] = useState(false);

    // Custom Local Setup State
    const [customEndpointInput, setCustomEndpointInput] = useState('http://localhost:1234/v1');
    const [customKeyInput, setCustomKeyInput] = useState('');
    const [customModelInput, setCustomModelInput] = useState('local-model');

    // Custom Endpoint Overrides (inside Advanced)
    const [nanoEndpointInput, setNanoEndpointInput] = useState('');
    const [openRouterEndpointInput, setOpenRouterEndpointInput] = useState('');

    // Connecting State
    const [connectingProvider, setConnectingProvider] = useState(null);

    // Models State
    const [models, setModels] = useState([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [modelSearch, setModelSearch] = useState('');
    const [selectedProviderFilter, setSelectedProviderFilter] = useState('ALL');

    // Image Models State
    const [imageModels, setImageModels] = useState(NANOGPT_IMAGE_MODELS);
    const [isLoadingImageModels, setIsLoadingImageModels] = useState(false);
    const [imageModelSearch, setImageModelSearch] = useState('');
    const [selectedImageCategory, setSelectedImageCategory] = useState('ALL');

    // Telemetry Ping State
    const [isPinging, setIsPinging] = useState(false);
    const [pingStatus, setPingStatus] = useState(null);
    const [statusToast, setStatusToast] = useState(null);

    // Synchronize local input state with Dexie values
    useEffect(() => {
        if (nanoGptKey) setManualNanoKey(nanoGptKey);
    }, [nanoGptKey]);

    useEffect(() => {
        if (openRouterKey) setManualOpenRouterKey(openRouterKey);
    }, [openRouterKey]);

    useEffect(() => {
        setNanoEndpointInput(customNanoEndpoint);
    }, [customNanoEndpoint]);

    useEffect(() => {
        setOpenRouterEndpointInput(customOpenRouterEndpoint);
    }, [customOpenRouterEndpoint]);

    useEffect(() => {
        if (customAiEndpoint) setCustomEndpointInput(customAiEndpoint);
    }, [customAiEndpoint]);

    useEffect(() => {
        if (customAiKey !== undefined) setCustomKeyInput(customAiKey);
    }, [customAiKey]);

    useEffect(() => {
        if (customAiModel) setCustomModelInput(customAiModel);
    }, [customAiModel]);

    const showToast = (msg) => {
        setStatusToast(msg);
        setTimeout(() => setStatusToast(null), 3500);
    };

    // --- Load Models for the Active Provider ---
    const loadModelsForActiveProvider = useCallback(async (provider, keyOverride) => {
        setIsLoadingModels(true);
        try {
            const list = await fetchAvailableModels(keyOverride, provider);
            setModels(Array.isArray(list) ? list : []);
        } catch (err) {
            console.error('🐾 [M.I.K.A API Matrix] Model loading failed:', err);
        } finally {
            setIsLoadingModels(false);
        }
    }, []);

    const loadImageModels = useCallback(async (keyOverride) => {
        setIsLoadingImageModels(true);
        try {
            const list = await fetchAvailableImageModels(keyOverride);
            setImageModels(Array.isArray(list) && list.length > 0 ? list : NANOGPT_IMAGE_MODELS);
        } catch (err) {
            console.error('🐾 [M.I.K.A API Matrix] Image model loading failed:', err);
        } finally {
            setIsLoadingImageModels(false);
        }
    }, []);

    // Reload models whenever activeProvider or respective keys change
    useEffect(() => {
        const key = activeProvider === 'openrouter' 
            ? openRouterKey 
            : (activeProvider === 'custom' ? customAiKey : nanoGptKey);
        loadModelsForActiveProvider(activeProvider, key);
        loadImageModels(nanoGptKey);
    }, [activeProvider, nanoGptKey, openRouterKey, customAiKey, customAiEndpoint, loadModelsForActiveProvider, loadImageModels]);

    // --- Provider Switch Handler ---
    const handleSwitchProvider = async (newProvider) => {
        await setActiveProvider(newProvider);
        const providerLabel = newProvider === 'openrouter' ? 'OpenRouter' : (newProvider === 'custom' ? 'Custom / Local' : 'NanoGPT');
        showToast(`⚡ Active Engine switched to ${providerLabel}`);
        
        // Pick smart default model if needed
        const currentSaved = await getSetting('ai_model');
        if (!currentSaved || (newProvider === 'openrouter' && !currentSaved.includes('/')) || (newProvider === 'nanogpt' && currentSaved.startsWith('meta-llama/')) || newProvider === 'custom') {
            const def = newProvider === 'openrouter' 
                ? 'openai/gpt-4o-mini' 
                : (newProvider === 'custom' ? (customAiModel || 'local-model') : 'z-ai/glm-5.2');
            await setSetting('ai_model', def);
            if (onModelChange) onModelChange(def);
        }
    };

    // --- Custom Local Server Handlers ---
    const handleSaveCustomSettings = async (urlOverride, keyOverride, modelOverride) => {
        const urlToSave = (urlOverride !== undefined ? urlOverride : customEndpointInput).trim();
        const keyToSave = (keyOverride !== undefined ? keyOverride : customKeyInput).trim();
        const modelToSave = (modelOverride !== undefined ? modelOverride : customModelInput).trim();

        if (urlToSave) {
            await setCustomAiEndpoint(urlToSave);
            setCustomEndpointInput(urlToSave);
        }
        await setCustomAiKey(keyToSave);
        setCustomKeyInput(keyToSave);
        if (modelToSave) {
            await setCustomAiModel(modelToSave);
            setCustomModelInput(modelToSave);
            if (activeProvider === 'custom') {
                await setSetting('ai_model', modelToSave);
                if (onModelChange) onModelChange(modelToSave);
            }
        }
        showToast('💾 Custom Local Server configuration saved!');
        if (activeProvider === 'custom') {
            loadModelsForActiveProvider('custom', keyToSave);
        }
    };

    const handleApplyPreset = async (presetType) => {
        let url = 'http://localhost:1234/v1';
        let defModel = 'local-model';
        if (presetType === 'lmstudio') {
            url = 'http://localhost:1234/v1';
            defModel = 'local-model';
        } else if (presetType === 'ollama') {
            url = 'http://localhost:11434/v1';
            defModel = 'llama3.2';
        } else if (presetType === 'localai') {
            url = 'http://localhost:8080/v1';
            defModel = 'gpt-4';
        }
        setCustomEndpointInput(url);
        setCustomModelInput(defModel);
        await handleSaveCustomSettings(url, customKeyInput, defModel);
        showToast(`🦙 Applied ${presetType.toUpperCase()} preset (${url})`);
    };

    // --- PKCE OAuth Connect Action ---
    const handleConnectOAuth = async (provider) => {
        try {
            setConnectingProvider(provider);
            await startOAuthFlow(provider);
        } catch (err) {
            console.error('🐾 [M.I.K.A API Matrix] OAuth trigger error:', err);
            setConnectingProvider(null);
            showToast(`⚠️ Connection trigger error: ${err.message}`);
        }
    };

    // --- Disconnect / Wipe Key Action ---
    const handleDisconnect = async (provider) => {
        const confirmMsg = `Are you sure you want to disconnect ${provider === 'openrouter' ? 'OpenRouter' : 'NanoGPT'}? This will remove the stored API key from local storage.`;
        if (typeof window !== 'undefined' && !window.confirm(confirmMsg)) {
            return;
        }

        if (provider === 'nanogpt') {
            await setApiKey('');
            setManualNanoKey('');
            showToast('🗑️ NanoGPT key removed.');
        } else {
            await setOpenRouterKey('');
            setManualOpenRouterKey('');
            showToast('🗑️ OpenRouter key removed.');
        }
    };

    // --- Manual Key Save Handlers (Advanced Accordion) ---
    const handleSaveNanoKey = async () => {
        const cleaned = cleanApiKey(manualNanoKey);
        await setApiKey(cleaned);
        showToast(cleaned ? '💾 NanoGPT key updated!' : '🗑️ NanoGPT key cleared');
        loadModelsForActiveProvider('nanogpt', cleaned);
        loadImageModels(cleaned);
    };

    const handleSaveOpenRouterKey = async () => {
        const cleaned = cleanApiKey(manualOpenRouterKey);
        await setOpenRouterKey(cleaned);
        showToast(cleaned ? '💾 OpenRouter key updated!' : '🗑️ OpenRouter key cleared');
        loadModelsForActiveProvider('openrouter', cleaned);
    };

    // --- Custom Endpoint Save Handlers ---
    const handleSaveNanoEndpoint = async () => {
        await setSetting('custom_nanogpt_endpoint', nanoEndpointInput.trim());
        showToast('⚙️ Custom NanoGPT endpoint saved!');
    };

    const handleSaveOpenRouterEndpoint = async () => {
        await setSetting('custom_openrouter_endpoint', openRouterEndpointInput.trim());
        showToast('⚙️ Custom OpenRouter endpoint saved!');
    };

    // --- Connection Ping & Diagnostics ---
    const handleTestPing = async (providerToPing) => {
        const target = providerToPing || activeProvider;
        setIsPinging(true);
        setPingStatus(null);
        try {
            const res = await testConnection(null, target);
            setPingStatus({ ok: true, msg: res.message || `Connected to ${target}`, target });
            showToast(res.message);
        } catch (err) {
            setPingStatus({ ok: false, msg: err.message, target });
            showToast(`⚠️ Ping failed: ${err.message}`);
        } finally {
            setIsPinging(false);
        }
    };

    // --- Model Selection ---
    const handleSelectChatModel = async (modelId) => {
        await setSetting('ai_model', modelId);
        if (onModelChange) onModelChange(modelId);
        showToast(`🎯 Model activated: ${modelId}`);
    };

    const handleSelectImageModel = async (modelId) => {
        await setSetting('image_model', modelId);
        if (onImageModelChange) onImageModelChange(modelId);
        showToast(`🎨 Image model activated: ${modelId}`);
    };

    const handleToggleSubOnlyChat = async () => {
        const next = !subOnlyChat;
        await setSetting('nanogpt_sub_only_chat', next);
        showToast(next ? '💎 Filter active: Showing NanoGPT subscription chat models only.' : '🌐 Showing all chat models.');
    };

    const handleToggleSubOnlyImage = async () => {
        const next = !subOnlyImage;
        await setSetting('nanogpt_sub_only_image', next);
        showToast(next ? '💎 Filter active: Showing NanoGPT subscription image models only.' : '🎨 Showing all image models.');
    };

    const subChatCount = useMemo(() => models.filter(m => m.subscription).length, [models]);
    const subImageCount = useMemo(() => imageModels.filter(m => m.subscription).length, [imageModels]);

    // --- Filtering Logic for Chat Models ---
    const providerOptions = useMemo(() => {
        const set = new Set();
        models.forEach(m => {
            const org = m.owned_by || (m.id.includes('/') ? m.id.split('/')[0] : 'other');
            if (org) set.add(org);
        });
        return ['ALL', ...Array.from(set).sort()];
    }, [models]);

    const filteredModels = useMemo(() => {
        return models.filter(m => {
            if (activeProvider === 'nanogpt' && subOnlyChat && !m.subscription) {
                return false;
            }
            const q = modelSearch.toLowerCase();
            const idMatch = m.id.toLowerCase().includes(q);
            const nameMatch = m.name ? m.name.toLowerCase().includes(q) : false;
            const descMatch = m.desc ? m.desc.toLowerCase().includes(q) : false;
            const matchesQuery = idMatch || nameMatch || descMatch;

            if (!matchesQuery) return false;
            if (selectedProviderFilter === 'ALL') return true;
            const org = m.owned_by || (m.id.includes('/') ? m.id.split('/')[0] : 'other');
            return org.toLowerCase() === selectedProviderFilter.toLowerCase();
        });
    }, [models, modelSearch, selectedProviderFilter, subOnlyChat, activeProvider]);

    // --- Filtering Logic for Image Models ---
    const filteredImageModels = useMemo(() => {
        return imageModels.filter(m => {
            if (subOnlyImage && !m.subscription) {
                return false;
            }
            const q = imageModelSearch.toLowerCase();
            const matchesQuery = m.name.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || (m.desc && m.desc.toLowerCase().includes(q));
            if (!matchesQuery) return false;
            if (selectedImageCategory === 'ALL') return true;
            if (selectedImageCategory === 'subscription') return m.subscription === true;
            return m.category === selectedImageCategory;
        });
    }, [imageModels, imageModelSearch, selectedImageCategory, subOnlyImage]);

    const isNanoConnected = Boolean(nanoGptKey && nanoGptKey.trim().length > 5);
    const isOpenRouterConnected = Boolean(openRouterKey && openRouterKey.trim().length > 5);

    return (
        <div 
            className="api-matrix-container"
            style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '16px',
                fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
                color: '#ebe3d6'
            }}
        >
            {/* Header / Matrix Identity */}
            <div style={{ borderBottom: '1px solid rgba(0, 255, 157, 0.25)', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <h3 style={{ margin: 0, color: '#00ff9d', fontSize: '15px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>⚡</span>
                        <span>&gt; NEURAL_API_MATRIX</span>
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span 
                            style={{ 
                                fontSize: '9px', 
                                padding: '2px 6px', 
                                borderRadius: '4px',
                                background: activeProvider === 'openrouter' 
                                    ? 'rgba(181, 51, 255, 0.2)' 
                                    : (activeProvider === 'custom' ? 'rgba(0, 255, 157, 0.2)' : 'rgba(0, 229, 255, 0.2)'),
                                color: activeProvider === 'openrouter' 
                                    ? '#b533ff' 
                                    : (activeProvider === 'custom' ? '#00ff9d' : '#00e5ff'),
                                border: `1px solid ${activeProvider === 'openrouter' ? '#b533ff' : (activeProvider === 'custom' ? '#00ff9d' : '#00e5ff')}`,
                                fontWeight: 900
                            }}
                        >
                            {activeProvider === 'openrouter' ? 'OPENROUTER' : (activeProvider === 'custom' ? 'CUSTOM / LOCAL' : 'NANOGPT')}
                        </span>
                    </div>
                </div>
                <p style={{ margin: 0, fontSize: '10px', color: 'rgba(0, 255, 157, 0.6)' }}>
                    // 1-Click OAuth Onboarding &amp; Dynamic Multi-Provider Hot-Swapping
                </p>
            </div>

            {/* Notification Toast */}
            {statusToast && (
                <div 
                    style={{
                        padding: '8px 12px',
                        background: 'rgba(0, 229, 255, 0.12)',
                        border: '1px solid #00e5ff',
                        color: '#00e5ff',
                        borderRadius: '6px',
                        fontSize: '10.5px',
                        fontWeight: 'bold',
                        animation: 'fadeIn 0.2s ease-out'
                    }}
                >
                    {statusToast}
                </div>
            )}

            {/* ================================================================
               SECTION 1: THE PRIMARY DASHBOARD (TOP)
               Large styled "🔗 Connect" buttons with Connected state & Trash icon
               ================================================================ */}
            <div 
                style={{ 
                    background: '#0B0914', 
                    border: '1px solid rgba(0, 229, 255, 0.3)', 
                    borderRadius: '8px', 
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '11px', fontWeight: 900, color: '#00e5ff', letterSpacing: '0.05em' }}>
                        &gt; 1-CLICK CLOUD CREDENTIALS
                    </div>
                    <button
                        onClick={() => window.dispatchEvent(new CustomEvent('gacha:open-welcome-modal'))}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'rgba(255,255,255,0.5)',
                            fontSize: '10px',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                        }}
                    >
                        View Onboarding Tour
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
                    {/* --- NanoGPT Connect Card --- */}
                    <div 
                        style={{
                            background: isNanoConnected ? 'rgba(0, 255, 157, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                            border: isNanoConnected ? '1px solid rgba(0, 255, 157, 0.4)' : '1px dashed rgba(255, 255, 255, 0.15)',
                            borderRadius: '6px',
                            padding: '10px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '10px', fontWeight: 900, color: isNanoConnected ? '#00ff9d' : 'rgba(255,255,255,0.7)' }}>
                                NANOGPT
                            </span>
                            {isNanoConnected && (
                                <button
                                    onClick={() => handleDisconnect('nanogpt')}
                                    title="Disconnect & wipe stored key"
                                    style={{
                                        background: 'rgba(255, 51, 51, 0.15)',
                                        border: '1px solid rgba(255, 51, 51, 0.4)',
                                        color: '#ff5555',
                                        width: '22px',
                                        height: '22px',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '11px'
                                    }}
                                >
                                    🗑️
                                </button>
                            )}
                        </div>

                        {isNanoConnected ? (
                            <button
                                disabled
                                style={{
                                    width: '100%',
                                    padding: '8px 6px',
                                    background: 'rgba(0, 255, 157, 0.15)',
                                    border: '1px solid #00ff9d',
                                    borderRadius: '5px',
                                    color: '#00ff9d',
                                    fontSize: '11px',
                                    fontWeight: 900,
                                    cursor: 'default',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}
                            >
                                <span>✅</span>
                                <span>NanoGPT Connected</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => handleConnectOAuth('nanogpt')}
                                disabled={connectingProvider !== null}
                                style={{
                                    width: '100%',
                                    padding: '8px 6px',
                                    background: 'rgba(0, 229, 255, 0.15)',
                                    border: '1px solid #00e5ff',
                                    borderRadius: '5px',
                                    color: '#00e5ff',
                                    fontSize: '11px',
                                    fontWeight: 900,
                                    cursor: connectingProvider ? 'wait' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={e => e.currentTarget.style.background = 'rgba(0, 229, 255, 0.25)'}
                                onMouseOut={e => e.currentTarget.style.background = 'rgba(0, 229, 255, 0.15)'}
                            >
                                <span>🔗</span>
                                <span>{connectingProvider === 'nanogpt' ? 'Opening...' : 'Connect NanoGPT'}</span>
                            </button>
                        )}
                        <div style={{ fontSize: '8.5px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                            Zero-signup micro-billing &amp; Flux
                        </div>
                    </div>

                    {/* --- OpenRouter Connect Card --- */}
                    <div 
                        style={{
                            background: isOpenRouterConnected ? 'rgba(0, 255, 157, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                            border: isOpenRouterConnected ? '1px solid rgba(0, 255, 157, 0.4)' : '1px dashed rgba(255, 255, 255, 0.15)',
                            borderRadius: '6px',
                            padding: '10px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '10px', fontWeight: 900, color: isOpenRouterConnected ? '#00ff9d' : 'rgba(255,255,255,0.7)' }}>
                                OPENROUTER
                            </span>
                            {isOpenRouterConnected && (
                                <button
                                    onClick={() => handleDisconnect('openrouter')}
                                    title="Disconnect & wipe stored key"
                                    style={{
                                        background: 'rgba(255, 51, 51, 0.15)',
                                        border: '1px solid rgba(255, 51, 51, 0.4)',
                                        color: '#ff5555',
                                        width: '22px',
                                        height: '22px',
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: '11px'
                                    }}
                                >
                                    🗑️
                                </button>
                            )}
                        </div>

                        {isOpenRouterConnected ? (
                            <button
                                disabled
                                style={{
                                    width: '100%',
                                    padding: '8px 6px',
                                    background: 'rgba(0, 255, 157, 0.15)',
                                    border: '1px solid #00ff9d',
                                    borderRadius: '5px',
                                    color: '#00ff9d',
                                    fontSize: '11px',
                                    fontWeight: 900,
                                    cursor: 'default',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px'
                                }}
                            >
                                <span>✅</span>
                                <span>OpenRouter Connected</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => handleConnectOAuth('openrouter')}
                                disabled={connectingProvider !== null}
                                style={{
                                    width: '100%',
                                    padding: '8px 6px',
                                    background: 'rgba(181, 51, 255, 0.15)',
                                    border: '1px solid #b533ff',
                                    borderRadius: '5px',
                                    color: '#b533ff',
                                    fontSize: '11px',
                                    fontWeight: 900,
                                    cursor: connectingProvider ? 'wait' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    transition: 'all 0.2s'
                                }}
                                onMouseOver={e => e.currentTarget.style.background = 'rgba(181, 51, 255, 0.25)'}
                                onMouseOut={e => e.currentTarget.style.background = 'rgba(181, 51, 255, 0.15)'}
                            >
                                <span>🔗</span>
                                <span>{connectingProvider === 'openrouter' ? 'Opening...' : 'Connect OpenRouter'}</span>
                            </button>
                        )}
                        <div style={{ fontSize: '8.5px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                            Claude 3.5, GPT-4o, Llama 3.3 &amp; more
                        </div>
                    </div>

                    {/* --- Custom / Local LMStudio Server Card --- */}
                    <div 
                        style={{
                            background: activeProvider === 'custom' ? 'rgba(0, 255, 157, 0.06)' : 'rgba(255, 255, 255, 0.02)',
                            border: activeProvider === 'custom' ? '1px solid rgba(0, 255, 157, 0.4)' : '1px dashed rgba(255, 255, 255, 0.15)',
                            borderRadius: '6px',
                            padding: '10px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '10px', fontWeight: 900, color: activeProvider === 'custom' ? '#00ff9d' : 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>🖥️</span>
                                <span>CUSTOM / LOCAL LLM</span>
                            </span>
                            <span style={{ fontSize: '8.5px', color: 'rgba(255,255,255,0.4)' }}>
                                LMStudio / Ollama
                            </span>
                        </div>

                        {/* Server URL Input */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <input
                                    type="text"
                                    value={customEndpointInput}
                                    onChange={e => setCustomEndpointInput(e.target.value)}
                                    placeholder="http://localhost:1234/v1"
                                    style={{
                                        flex: 1,
                                        padding: '5px 7px',
                                        background: '#050308',
                                        border: '1px solid rgba(0, 255, 157, 0.3)',
                                        color: '#00ff9d',
                                        fontSize: '9.5px',
                                        borderRadius: '4px',
                                        fontFamily: 'monospace'
                                    }}
                                />
                                <button
                                    onClick={() => handleSaveCustomSettings()}
                                    title="Save Endpoint"
                                    style={{
                                        padding: '5px 8px',
                                        background: 'rgba(0, 255, 157, 0.15)',
                                        border: '1px solid #00ff9d',
                                        color: '#00ff9d',
                                        fontSize: '9px',
                                        fontWeight: 'bold',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Save
                                </button>
                            </div>

                            {/* 1-Click Presets */}
                            <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                                <button
                                    onClick={() => handleApplyPreset('lmstudio')}
                                    style={{
                                        flex: 1,
                                        padding: '2px 4px',
                                        fontSize: '8px',
                                        borderRadius: '3px',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: 'rgba(255, 255, 255, 0.7)',
                                        cursor: 'pointer'
                                    }}
                                    title="Set default to LMStudio (http://localhost:1234/v1)"
                                >
                                    LMStudio
                                </button>
                                <button
                                    onClick={() => handleApplyPreset('ollama')}
                                    style={{
                                        flex: 1,
                                        padding: '2px 4px',
                                        fontSize: '8px',
                                        borderRadius: '3px',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: 'rgba(255, 255, 255, 0.7)',
                                        cursor: 'pointer'
                                    }}
                                    title="Set default to Ollama (http://localhost:11434/v1)"
                                >
                                    Ollama
                                </button>
                                <button
                                    onClick={() => handleApplyPreset('localai')}
                                    style={{
                                        flex: 1,
                                        padding: '2px 4px',
                                        fontSize: '8px',
                                        borderRadius: '3px',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        color: 'rgba(255, 255, 255, 0.7)',
                                        cursor: 'pointer'
                                    }}
                                    title="Set default to LocalAI (http://localhost:8080/v1)"
                                >
                                    LocalAI
                                </button>
                            </div>
                        </div>

                        {/* Ping & Switch Actions */}
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <button
                                onClick={() => handleTestPing('custom')}
                                disabled={isPinging}
                                style={{
                                    flex: 1,
                                    padding: '6px 8px',
                                    background: 'rgba(0, 229, 255, 0.15)',
                                    border: '1px solid #00e5ff',
                                    color: '#00e5ff',
                                    fontSize: '9.5px',
                                    fontWeight: 900,
                                    borderRadius: '4px',
                                    cursor: isPinging ? 'wait' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px'
                                }}
                            >
                                <span>⚡</span>
                                <span>{isPinging ? 'Testing...' : 'Test Server'}</span>
                            </button>
                            {activeProvider !== 'custom' && (
                                <button
                                    onClick={() => handleSwitchProvider('custom')}
                                    style={{
                                        padding: '6px 8px',
                                        background: 'rgba(0, 255, 157, 0.15)',
                                        border: '1px solid #00ff9d',
                                        color: '#00ff9d',
                                        fontSize: '9.5px',
                                        fontWeight: 900,
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap'
                                    }}
                                >
                                    Activate
                                </button>
                            )}
                        </div>
                        <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.35)', textAlign: 'center' }}>
                            Ensure server is running &amp; CORS is enabled
                        </div>
                    </div>
                </div>
            </div>

            {/* ================================================================
               SECTION 2: THE ACTIVE PROVIDER SWITCHER
               Toggle/dropdown for selecting the active generation engine
               ================================================================ */}
            <div 
                style={{ 
                    background: '#0B0914', 
                    border: '1px solid rgba(0, 255, 157, 0.3)', 
                    borderRadius: '8px', 
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '11px', fontWeight: 900, color: '#00ff9d', letterSpacing: '0.05em' }}>
                        &gt; ACTIVE ENGINE (HOT-SWAP):
                    </label>
                    <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)' }}>
                        Current: <strong style={{ color: activeProvider === 'openrouter' ? '#b533ff' : '#00e5ff' }}>{activeProvider.toUpperCase()}</strong>
                    </span>
                </div>

                <div 
                    style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', 
                        gap: '6px',
                        background: '#050308',
                        padding: '4px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.08)'
                    }}
                >
                    <button
                        onClick={() => handleSwitchProvider('nanogpt')}
                        style={{
                            padding: '9px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 900,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            background: activeProvider === 'nanogpt' ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
                            border: activeProvider === 'nanogpt' ? '1px solid #00e5ff' : '1px solid transparent',
                            color: activeProvider === 'nanogpt' ? '#00e5ff' : 'rgba(255, 255, 255, 0.5)',
                            boxShadow: activeProvider === 'nanogpt' ? '0 0 10px rgba(0, 229, 255, 0.25)' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        <span>⚡</span>
                        <span>NanoGPT Engine</span>
                        {isNanoConnected && <span style={{ fontSize: '8px', color: '#00ff9d' }}>●</span>}
                    </button>

                    <button
                        onClick={() => handleSwitchProvider('openrouter')}
                        style={{
                            padding: '9px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 900,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            background: activeProvider === 'openrouter' ? 'rgba(181, 51, 255, 0.2)' : 'transparent',
                            border: activeProvider === 'openrouter' ? '1px solid #b533ff' : '1px solid transparent',
                            color: activeProvider === 'openrouter' ? '#b533ff' : 'rgba(255, 255, 255, 0.5)',
                            boxShadow: activeProvider === 'openrouter' ? '0 0 10px rgba(181, 51, 255, 0.25)' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        <span>🪐</span>
                        <span>OpenRouter Engine</span>
                        {isOpenRouterConnected && <span style={{ fontSize: '8px', color: '#00ff9d' }}>●</span>}
                    </button>

                    <button
                        onClick={() => handleSwitchProvider('custom')}
                        style={{
                            padding: '9px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 900,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            background: activeProvider === 'custom' ? 'rgba(0, 255, 157, 0.2)' : 'transparent',
                            border: activeProvider === 'custom' ? '1px solid #00ff9d' : '1px solid transparent',
                            color: activeProvider === 'custom' ? '#00ff9d' : 'rgba(255, 255, 255, 0.5)',
                            boxShadow: activeProvider === 'custom' ? '0 0 10px rgba(0, 255, 157, 0.25)' : 'none',
                            transition: 'all 0.2s'
                        }}
                    >
                        <span>🖥️</span>
                        <span>Custom / Local</span>
                        {activeProvider === 'custom' && <span style={{ fontSize: '8px', color: '#00ff9d' }}>●</span>}
                    </button>
                </div>
            </div>

            {/* ================================================================
               SECTION 3: MATRIX SUB-TABS: CHAT vs IMAGE GEN
               ================================================================ */}
            <div style={{ display: 'flex', gap: '8px' }}>
                <button
                    onClick={() => setSubTab('chat')}
                    style={{
                        flex: 1,
                        padding: '9px 12px',
                        fontSize: '11px',
                        fontWeight: 900,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        background: subTab === 'chat' ? 'rgba(0, 255, 157, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                        border: subTab === 'chat' ? '1px solid #00ff9d' : '1px solid rgba(255, 255, 255, 0.1)',
                        color: subTab === 'chat' ? '#00ff9d' : 'rgba(255, 255, 255, 0.5)',
                        boxShadow: subTab === 'chat' ? '0 0 10px rgba(0, 255, 157, 0.2)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                    }}
                >
                    <span>💬 CHAT MODELS</span>
                    <span style={{ fontSize: '9px', background: subTab === 'chat' ? '#00ff9d' : 'rgba(255,255,255,0.1)', color: subTab === 'chat' ? '#000' : '#888', padding: '1px 5px', borderRadius: '10px' }}>
                        {models.length}
                    </span>
                </button>
                <button
                    onClick={() => setSubTab('image')}
                    style={{
                        flex: 1,
                        padding: '9px 12px',
                        fontSize: '11px',
                        fontWeight: 900,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        background: subTab === 'image' ? 'rgba(255, 16, 122, 0.18)' : 'rgba(255, 255, 255, 0.04)',
                        border: subTab === 'image' ? '1px solid #ff107a' : '1px solid rgba(255, 255, 255, 0.1)',
                        color: subTab === 'image' ? '#ff107a' : 'rgba(255, 255, 255, 0.5)',
                        boxShadow: subTab === 'image' ? '0 0 10px rgba(255, 16, 122, 0.2)' : 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                    }}
                >
                    <span>🎨 IMAGE GEN MODELS</span>
                    <span style={{ fontSize: '9px', background: subTab === 'image' ? '#ff107a' : 'rgba(255,255,255,0.1)', color: subTab === 'image' ? '#fff' : '#888', padding: '1px 5px', borderRadius: '10px' }}>
                        {imageModels.length}
                    </span>
                </button>
            </div>

            {/* SUB-VIEW 1: CHAT MODELS MATRIX */}
            {subTab === 'chat' && (
                <div style={{ background: '#0B0914', border: '1px solid rgba(0, 255, 157, 0.3)', borderRadius: '6px', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ color: '#00ff9d', fontSize: '11px', fontWeight: 'bold' }}>
                                &gt; LIVE_CHAT_MODELS ({filteredModels.length} of {models.length})
                            </div>
                            {activeProvider === 'nanogpt' && (
                                <button
                                    onClick={handleToggleSubOnlyChat}
                                    style={{
                                        padding: '2px 8px',
                                        fontSize: '9px',
                                        borderRadius: '3px',
                                        cursor: 'pointer',
                                        border: subOnlyChat ? '1px solid #ffd700' : '1px solid rgba(255, 215, 0, 0.3)',
                                        background: subOnlyChat ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 215, 0, 0.05)',
                                        color: subOnlyChat ? '#ffd700' : 'rgba(255, 215, 0, 0.65)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontWeight: 'bold',
                                        boxShadow: subOnlyChat ? '0 0 8px rgba(255, 215, 0, 0.3)' : 'none',
                                        transition: 'all 0.15s ease'
                                    }}
                                    title="Toggle to view only models included in the NanoGPT Subscription Plan"
                                >
                                    <span>💎</span>
                                    <span>{subOnlyChat ? 'SUBSCRIPTION ONLY' : 'ALL MODELS'}</span>
                                    <span style={{ 
                                        fontSize: '8px', 
                                        background: subOnlyChat ? '#ffd700' : 'rgba(255,215,0,0.15)', 
                                        color: subOnlyChat ? '#000' : '#ffd700', 
                                        padding: '0 4px', 
                                        borderRadius: '6px' 
                                    }}>
                                        {subChatCount}
                                    </span>
                                </button>
                            )}
                        </div>
                        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)' }}>
                            Active: <strong style={{ color: '#00e5ff' }}>{activeModel}</strong>
                        </div>
                    </div>

                    {/* Search & Provider Filter */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                        {activeProvider === 'custom' && (
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', background: 'rgba(0, 255, 157, 0.05)', border: '1px solid rgba(0, 255, 157, 0.2)', padding: '6px 8px', borderRadius: '4px' }}>
                                <span style={{ fontSize: '9.5px', color: '#00ff9d', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
                                    Model ID Override:
                                </span>
                                <input
                                    type="text"
                                    value={customModelInput}
                                    onChange={e => setCustomModelInput(e.target.value)}
                                    placeholder="e.g. llama-3.2-3b-instruct or local-model"
                                    style={{
                                        flex: 1,
                                        padding: '4px 6px',
                                        background: '#050308',
                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                        color: '#fff',
                                        fontSize: '9.5px',
                                        borderRadius: '3px',
                                        fontFamily: 'monospace'
                                    }}
                                />
                                <button
                                    onClick={() => handleSaveCustomSettings(undefined, undefined, customModelInput)}
                                    style={{
                                        padding: '4px 8px',
                                        fontSize: '9px',
                                        fontWeight: 'bold',
                                        borderRadius: '3px',
                                        background: 'rgba(0, 255, 157, 0.2)',
                                        border: '1px solid #00ff9d',
                                        color: '#00ff9d',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Set Model
                                </button>
                            </div>
                        )}

                        <input
                            type="text"
                            value={modelSearch}
                            onChange={e => setModelSearch(e.target.value)}
                            placeholder={`Filter ${activeProvider === 'openrouter' ? 'OpenRouter' : (activeProvider === 'custom' ? 'Local' : 'NanoGPT')} models (e.g. gpt-4o, claude, llama, deepseek)...`}
                            style={{
                                width: '100%',
                                padding: '7px 10px',
                                background: '#050308',
                                border: '1px solid rgba(0, 255, 157, 0.3)',
                                color: '#00ff9d',
                                borderRadius: '4px',
                                fontSize: '10px',
                                boxSizing: 'border-box'
                            }}
                        />

                        {providerOptions.length > 2 && (
                            <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }}>
                                {providerOptions.slice(0, 9).map(org => (
                                    <button
                                        key={org}
                                        onClick={() => setSelectedProviderFilter(org)}
                                        style={{
                                            padding: '2px 8px',
                                            fontSize: '9px',
                                            borderRadius: '3px',
                                            border: '1px solid',
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                            background: selectedProviderFilter === org ? 'rgba(0, 255, 157, 0.2)' : 'transparent',
                                            borderColor: selectedProviderFilter === org ? '#00ff9d' : 'rgba(255, 255, 255, 0.1)',
                                            color: selectedProviderFilter === org ? '#00ff9d' : 'rgba(255, 255, 255, 0.5)'
                                        }}
                                    >
                                        {org.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Models Scroll Grid */}
                    {isLoadingModels ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(0, 255, 157, 0.5)', fontSize: '11px' }}>
                            [ POLLING NEURAL MODEL REGISTRY... ]
                        </div>
                    ) : filteredModels.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.4)', fontSize: '10px' }}>
                            No models found matching criteria.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                            {filteredModels.map(m => {
                                const isSelected = activeModel === m.id;
                                return (
                                    <div
                                        key={m.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '8px 10px',
                                            background: isSelected ? 'rgba(0, 255, 157, 0.1)' : 'rgba(255, 255, 255, 0.02)',
                                            border: isSelected ? '1px solid #00ff9d' : '1px solid rgba(255, 255, 255, 0.06)',
                                            borderRadius: '4px',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <div style={{ flex: 1, minWidth: 0, paddingRight: '10px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: 'bold', color: isSelected ? '#00ff9d' : '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                                    {m.name || m.id}
                                                </span>
                                                {m.subscription && (
                                                    <span style={{ fontSize: '8px', color: '#ffd700', background: 'rgba(255,215,0,0.15)', border: '1px solid rgba(255,215,0,0.4)', padding: '1px 4px', borderRadius: '2px', whiteSpace: 'nowrap', fontWeight: 'bold' }}>
                                                        💎 SUB
                                                    </span>
                                                )}
                                                {m.pricing && (
                                                    <span style={{ fontSize: '8.5px', color: '#ffd700', background: 'rgba(255,215,0,0.1)', padding: '1px 4px', borderRadius: '2px', whiteSpace: 'nowrap' }}>
                                                        {m.pricing}
                                                    </span>
                                                )}
                                                {m.context && (
                                                    <span style={{ fontSize: '8.5px', color: '#00e5ff', background: 'rgba(0,229,255,0.1)', padding: '1px 4px', borderRadius: '2px', whiteSpace: 'nowrap' }}>
                                                        {m.context}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginTop: '2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                                <code>{m.id}</code> {m.desc ? `— ${m.desc}` : ''}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleSelectChatModel(m.id)}
                                            style={{
                                                padding: '4px 8px',
                                                fontSize: '9px',
                                                fontWeight: 900,
                                                borderRadius: '3px',
                                                cursor: 'pointer',
                                                background: isSelected ? '#00ff9d' : 'transparent',
                                                color: isSelected ? '#000' : 'rgba(0, 255, 157, 0.8)',
                                                border: '1px solid #00ff9d',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {isSelected ? 'ACTIVE' : 'SELECT'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Refresh Models CTA */}
                    <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                            onClick={() => loadModelsForActiveProvider(activeProvider)}
                            disabled={isLoadingModels}
                            style={{
                                padding: '5px 10px',
                                background: 'transparent',
                                border: '1px solid rgba(0, 255, 157, 0.4)',
                                color: '#00ff9d',
                                fontSize: '9.5px',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            {isLoadingModels ? 'Fetching...' : '🔄 Refresh Model Registry'}
                        </button>
                    </div>
                </div>
            )}

            {/* SUB-VIEW 2: IMAGE GEN MODELS MATRIX */}
            {subTab === 'image' && (
                <div style={{ background: '#0B0914', border: '1px solid rgba(255, 16, 122, 0.3)', borderRadius: '6px', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ color: '#ff107a', fontSize: '11px', fontWeight: 'bold' }}>
                                &gt; IMAGE_DIFFUSION_MODELS ({filteredImageModels.length} of {imageModels.length})
                            </div>
                            <button
                                onClick={handleToggleSubOnlyImage}
                                style={{
                                    padding: '2px 8px',
                                    fontSize: '9px',
                                    borderRadius: '3px',
                                    cursor: 'pointer',
                                    border: subOnlyImage ? '1px solid #ffd700' : '1px solid rgba(255, 215, 0, 0.3)',
                                    background: subOnlyImage ? 'rgba(255, 215, 0, 0.2)' : 'rgba(255, 215, 0, 0.05)',
                                    color: subOnlyImage ? '#ffd700' : 'rgba(255, 215, 0, 0.65)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontWeight: 'bold',
                                    boxShadow: subOnlyImage ? '0 0 8px rgba(255, 215, 0, 0.3)' : 'none',
                                    transition: 'all 0.15s ease'
                                }}
                                title="Toggle to view only models included in the NanoGPT Subscription Plan"
                            >
                                <span>💎</span>
                                <span>{subOnlyImage ? 'SUBSCRIPTION ONLY' : 'ALL MODELS'}</span>
                                <span style={{ 
                                    fontSize: '8px', 
                                    background: subOnlyImage ? '#ffd700' : 'rgba(255,215,0,0.15)', 
                                    color: subOnlyImage ? '#000' : '#ffd700', 
                                    padding: '0 4px', 
                                    borderRadius: '6px' 
                                }}>
                                    {subImageCount}
                                </span>
                            </button>
                        </div>
                        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)' }}>
                            Active: <strong style={{ color: '#ff107a' }}>{activeImageModel}</strong>
                        </div>
                    </div>

                    {/* Search & Filter */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                        <input
                            type="text"
                            value={imageModelSearch}
                            onChange={e => setImageModelSearch(e.target.value)}
                            placeholder="Filter image models (flux, anime, civitai, sdxl, dall-e)..."
                            style={{
                                width: '100%',
                                padding: '7px 10px',
                                background: '#050308',
                                border: '1px solid rgba(255, 16, 122, 0.3)',
                                color: '#ff107a',
                                borderRadius: '4px',
                                fontSize: '10px',
                                boxSizing: 'border-box'
                            }}
                        />

                        {/* Category Buttons */}
                        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }}>
                            {['ALL', 'subscription', 'flux', 'anime', 'civitai', 'openai', 'stability'].map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedImageCategory(cat)}
                                    style={{
                                        padding: '2px 8px',
                                        fontSize: '9px',
                                        borderRadius: '3px',
                                        border: '1px solid',
                                        cursor: 'pointer',
                                        whiteSpace: 'nowrap',
                                        background: selectedImageCategory === cat ? (cat === 'subscription' ? 'rgba(255, 215, 0, 0.25)' : 'rgba(255, 16, 122, 0.2)') : 'transparent',
                                        borderColor: selectedImageCategory === cat ? (cat === 'subscription' ? '#ffd700' : '#ff107a') : 'rgba(255, 255, 255, 0.1)',
                                        color: selectedImageCategory === cat ? (cat === 'subscription' ? '#ffd700' : '#ff107a') : (cat === 'subscription' ? '#ffd700' : 'rgba(255, 255, 255, 0.5)'),
                                        fontWeight: cat === 'subscription' ? 'bold' : 'normal'
                                    }}
                                >
                                    {cat === 'subscription' ? `💎 SUB (${subImageCount})` : cat.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Image Models List */}
                    {isLoadingImageModels ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255, 16, 122, 0.5)', fontSize: '11px' }}>
                            [ QUERYING DIFFUSION REGISTRY... ]
                        </div>
                    ) : filteredImageModels.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255, 255, 255, 0.4)', fontSize: '10px' }}>
                            No diffusion models found matching criteria.
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                            {filteredImageModels.map(m => {
                                const isSelected = activeImageModel === m.id;
                                return (
                                    <div
                                        key={m.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '8px 10px',
                                            background: isSelected ? 'rgba(255, 16, 122, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                                            border: isSelected ? '1px solid #ff107a' : '1px solid rgba(255, 255, 255, 0.06)',
                                            borderRadius: '4px',
                                            transition: 'all 0.15s ease'
                                        }}
                                    >
                                        <div style={{ flex: 1, minWidth: 0, paddingRight: '10px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: 'bold', color: isSelected ? '#ff107a' : '#fff', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                                    {m.name || m.id}
                                                </span>
                                                {m.subscription && (
                                                    <span style={{ fontSize: '8px', color: '#ffd700', background: 'rgba(255,215,0,0.15)', border: '1px solid rgba(255,215,0,0.4)', padding: '1px 4px', borderRadius: '2px', whiteSpace: 'nowrap', fontWeight: 'bold' }}>
                                                        💎 SUB
                                                    </span>
                                                )}
                                                {m.pricing && (
                                                    <span style={{ fontSize: '8.5px', color: '#ffd700', background: 'rgba(255,215,0,0.1)', padding: '1px 4px', borderRadius: '2px', whiteSpace: 'nowrap' }}>
                                                        {m.pricing}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginTop: '2px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                                <code>{m.id}</code> {m.desc ? `— ${m.desc}` : ''}
                                            </div>
                                            <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                                                <span style={{ fontSize: '8.5px', color: '#ff77aa', background: 'rgba(255,119,170,0.1)', padding: '1px 5px', borderRadius: '2px' }}>
                                                    {m.owned_by || 'image'}
                                                </span>
                                                {m.category && (
                                                    <span style={{ fontSize: '8.5px', color: '#00e5ff', background: 'rgba(0,229,255,0.1)', padding: '1px 5px', borderRadius: '2px' }}>
                                                        {m.category}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleSelectImageModel(m.id)}
                                            style={{
                                                padding: '4px 8px',
                                                fontSize: '9px',
                                                fontWeight: 900,
                                                borderRadius: '3px',
                                                cursor: 'pointer',
                                                background: isSelected ? '#ff107a' : 'transparent',
                                                color: isSelected ? '#fff' : 'rgba(255, 119, 170, 0.8)',
                                                border: '1px solid #ff107a',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {isSelected ? 'ACTIVE' : 'SELECT'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ================================================================
               SECTION 4: THE ADVANCED COLLAPSIBLE ACCORDION (BOTTOM)
               Closed by default. Contains manual keys, endpoint overrides, pings
               ================================================================ */}
            <div 
                style={{ 
                    background: '#0B0914', 
                    border: '1px solid rgba(255, 255, 255, 0.1)', 
                    borderRadius: '8px', 
                    overflow: 'hidden' 
                }}
            >
                {/* Accordion Header / Toggle */}
                <button
                    onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                    style={{
                        width: '100%',
                        padding: '12px 14px',
                        background: isAdvancedOpen ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                        border: 'none',
                        borderBottom: isAdvancedOpen ? '1px solid rgba(255, 255, 255, 0.08)' : 'none',
                        color: isAdvancedOpen ? '#00e5ff' : 'rgba(255, 255, 255, 0.7)',
                        fontSize: '11px',
                        fontWeight: 900,
                        letterSpacing: '0.05em',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer',
                        textAlign: 'left'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>⚙️</span>
                        <span>Advanced Connection Settings</span>
                    </div>
                    <span style={{ fontSize: '11px', transition: 'transform 0.2s', transform: isAdvancedOpen ? 'rotate(180deg)' : 'none' }}>
                        ▼
                    </span>
                </button>

                {/* Collapsible Body */}
                {isAdvancedOpen && (
                    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '16px', animation: 'fadeIn 0.2s ease-out' }}>
                        
                        {/* 1. Manual NanoGPT API Key */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={{ fontSize: '10px', color: '#00e5ff', fontWeight: 'bold' }}>
                                    &gt; MANUAL_NANOGPT_KEY:
                                </label>
                                <span style={{ fontSize: '9px', color: nanoGptKey ? '#00ff9d' : 'rgba(255,255,255,0.4)' }}>
                                    {nanoGptKey ? '● Configured' : '○ Not Set'}
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <input
                                        type={showNanoKey ? 'text' : 'password'}
                                        value={manualNanoKey}
                                        onChange={e => setManualNanoKey(e.target.value)}
                                        placeholder="UUID v4 (e.g. c7b39a36-6e97-48c5-...)"
                                        style={{
                                            width: '100%',
                                            padding: '7px 28px 7px 8px',
                                            background: '#050308',
                                            border: '1px solid rgba(0, 229, 255, 0.3)',
                                            borderRadius: '4px',
                                            color: '#00e5ff',
                                            fontSize: '10px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNanoKey(!showNanoKey)}
                                        style={{
                                            position: 'absolute',
                                            right: '6px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'rgba(0, 229, 255, 0.6)',
                                            cursor: 'pointer',
                                            fontSize: '11px'
                                        }}
                                    >
                                        {showNanoKey ? '👁️' : '🔒'}
                                    </button>
                                </div>
                                <button
                                    onClick={handleSaveNanoKey}
                                    style={{
                                        padding: '7px 12px',
                                        background: 'rgba(0, 229, 255, 0.2)',
                                        border: '1px solid #00e5ff',
                                        color: '#00e5ff',
                                        fontSize: '10px',
                                        fontWeight: 'bold',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Save
                                </button>
                            </div>
                        </div>

                        {/* 2. Manual OpenRouter API Key */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <label style={{ fontSize: '10px', color: '#b533ff', fontWeight: 'bold' }}>
                                    &gt; MANUAL_OPENROUTER_KEY:
                                </label>
                                <span style={{ fontSize: '9px', color: openRouterKey ? '#00ff9d' : 'rgba(255,255,255,0.4)' }}>
                                    {openRouterKey ? '● Configured' : '○ Not Set'}
                                </span>
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <div style={{ position: 'relative', flex: 1 }}>
                                    <input
                                        type={showOpenRouterKey ? 'text' : 'password'}
                                        value={manualOpenRouterKey}
                                        onChange={e => setManualOpenRouterKey(e.target.value)}
                                        placeholder="sk-or-v1-..."
                                        style={{
                                            width: '100%',
                                            padding: '7px 28px 7px 8px',
                                            background: '#050308',
                                            border: '1px solid rgba(181, 51, 255, 0.3)',
                                            borderRadius: '4px',
                                            color: '#b533ff',
                                            fontSize: '10px',
                                            boxSizing: 'border-box'
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowOpenRouterKey(!showOpenRouterKey)}
                                        style={{
                                            position: 'absolute',
                                            right: '6px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: 'transparent',
                                            border: 'none',
                                            color: 'rgba(181, 51, 255, 0.6)',
                                            cursor: 'pointer',
                                            fontSize: '11px'
                                        }}
                                    >
                                        {showOpenRouterKey ? '👁️' : '🔒'}
                                    </button>
                                </div>
                                <button
                                    onClick={handleSaveOpenRouterKey}
                                    style={{
                                        padding: '7px 12px',
                                        background: 'rgba(181, 51, 255, 0.2)',
                                        border: '1px solid #b533ff',
                                        color: '#b533ff',
                                        fontSize: '10px',
                                        fontWeight: 'bold',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Save
                                </button>
                            </div>
                        </div>

                        {/* 3. Custom Endpoint Overrides */}
                        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'rgba(255, 255, 255, 0.7)' }}>
                                &gt; CUSTOM_ENDPOINT_OVERRIDES (Optional Proxies)
                            </div>

                            {/* NanoGPT endpoint override */}
                            <div>
                                <label style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '3px' }}>
                                    NanoGPT Chat Endpoint (Default: {NANOGPT_CHAT_ENDPOINT}):
                                </label>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <input
                                        type="text"
                                        value={nanoEndpointInput}
                                        onChange={e => setNanoEndpointInput(e.target.value)}
                                        placeholder={NANOGPT_CHAT_ENDPOINT}
                                        style={{
                                            flex: 1,
                                            padding: '6px 8px',
                                            background: '#050308',
                                            border: '1px solid rgba(255, 255, 255, 0.15)',
                                            color: '#fff',
                                            fontSize: '9.5px',
                                            borderRadius: '4px'
                                        }}
                                    />
                                    <button
                                        onClick={handleSaveNanoEndpoint}
                                        style={{
                                            padding: '6px 10px',
                                            background: 'rgba(255, 255, 255, 0.08)',
                                            border: '1px solid rgba(255, 255, 255, 0.2)',
                                            color: '#fff',
                                            fontSize: '9.5px',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Set
                                    </button>
                                </div>
                            </div>

                            {/* OpenRouter endpoint override */}
                            <div>
                                <label style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '3px' }}>
                                    OpenRouter Chat Endpoint (Default: {OPENROUTER_CHAT_ENDPOINT}):
                                </label>
                                <div style={{ display: 'flex', gap: '6px' }}>
                                    <input
                                        type="text"
                                        value={openRouterEndpointInput}
                                        onChange={e => setOpenRouterEndpointInput(e.target.value)}
                                        placeholder={OPENROUTER_CHAT_ENDPOINT}
                                        style={{
                                            flex: 1,
                                            padding: '6px 8px',
                                            background: '#050308',
                                            border: '1px solid rgba(255, 255, 255, 0.15)',
                                            color: '#fff',
                                            fontSize: '9.5px',
                                            borderRadius: '4px'
                                        }}
                                    />
                                    <button
                                        onClick={handleSaveOpenRouterEndpoint}
                                        style={{
                                            padding: '6px 10px',
                                            background: 'rgba(255, 255, 255, 0.08)',
                                            border: '1px solid rgba(255, 255, 255, 0.2)',
                                            color: '#fff',
                                            fontSize: '9.5px',
                                            borderRadius: '4px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Set
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* 4. Raw Connection Ping Diagnostics */}
                        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '10px' }}>
                            <div style={{ fontSize: '10px', fontWeight: 'bold', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '8px' }}>
                                &gt; DIAGNOSTIC_PING_TESTER
                            </div>

                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                <button
                                    onClick={() => handleTestPing('nanogpt')}
                                    disabled={isPinging}
                                    style={{
                                        flex: 1,
                                        minWidth: '100px',
                                        padding: '7px 10px',
                                        background: 'rgba(0, 229, 255, 0.1)',
                                        border: '1px solid #00e5ff',
                                        color: '#00e5ff',
                                        fontSize: '9.5px',
                                        fontWeight: 'bold',
                                        borderRadius: '4px',
                                        cursor: isPinging ? 'wait' : 'pointer'
                                    }}
                                >
                                    {isPinging ? 'Pinging...' : '⚡ Ping NanoGPT'}
                                </button>

                                <button
                                    onClick={() => handleTestPing('openrouter')}
                                    disabled={isPinging}
                                    style={{
                                        flex: 1,
                                        minWidth: '100px',
                                        padding: '7px 10px',
                                        background: 'rgba(181, 51, 255, 0.1)',
                                        border: '1px solid #b533ff',
                                        color: '#b533ff',
                                        fontSize: '9.5px',
                                        fontWeight: 'bold',
                                        borderRadius: '4px',
                                        cursor: isPinging ? 'wait' : 'pointer'
                                    }}
                                >
                                    {isPinging ? 'Pinging...' : '⚡ Ping OpenRouter'}
                                </button>

                                <button
                                    onClick={() => handleTestPing('custom')}
                                    disabled={isPinging}
                                    style={{
                                        flex: 1,
                                        minWidth: '100px',
                                        padding: '7px 10px',
                                        background: 'rgba(0, 255, 157, 0.1)',
                                        border: '1px solid #00ff9d',
                                        color: '#00ff9d',
                                        fontSize: '9.5px',
                                        fontWeight: 'bold',
                                        borderRadius: '4px',
                                        cursor: isPinging ? 'wait' : 'pointer'
                                    }}
                                >
                                    {isPinging ? 'Pinging...' : '🖥️ Ping Local Server'}
                                </button>
                            </div>

                            {pingStatus && (
                                <div 
                                    style={{
                                        marginTop: '8px',
                                        fontSize: '9.5px',
                                        color: pingStatus.ok ? '#00ff9d' : '#ff4444',
                                        padding: '6px 8px',
                                        background: pingStatus.ok ? 'rgba(0, 255, 157, 0.08)' : 'rgba(255, 51, 51, 0.08)',
                                        borderRadius: '4px',
                                        border: pingStatus.ok ? '1px solid rgba(0, 255, 157, 0.2)' : '1px solid rgba(255, 51, 51, 0.2)'
                                    }}
                                >
                                    [{pingStatus.target?.toUpperCase()}] {pingStatus.msg}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ApiMatrix;
