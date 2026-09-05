import React, { useState, useEffect, useMemo } from 'react';
import { db, setSetting, getSetting, getApiKey, setApiKey as setDbApiKey } from '../db.js';
import { testConnection, fetchAvailableModels, fetchAvailableImageModels, NANOGPT_IMAGE_MODELS, cleanApiKey } from '../aiClient.js';
import { ApiMatrix } from './ApiMatrix.jsx';

export const AdaptiveHUD = ({
    view = 'profile',
    onChangeView,
    activeWaifu,
    onTriggerMinigame,
    onCloseMobileDrawer
}) => {
    // Normalize view ('idle' maps to 'profile', 'telemetry' maps to 'api', 'config' maps to 'settings')
    const activeView = (view === 'idle' || !view) ? 'profile' : (view === 'telemetry' || view === 'card_details') ? 'api' : (view === 'config') ? 'settings' : view;

    // --- API & Model State ---
    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [pingStatus, setPingStatus] = useState(null);
    const [pingLatency, setPingLatency] = useState(null);
    const [isPinging, setIsPinging] = useState(false);
    const [models, setModels] = useState([]);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [modelSearch, setModelSearch] = useState('');
    const [selectedProvider, setSelectedProvider] = useState('ALL');
    const [activeModel, setActiveModel] = useState('z-ai/glm-5.2');

    // --- Image Generation Models State ---
    const [activeImageModel, setActiveImageModel] = useState('flux-schnell');
    const [imageModels, setImageModels] = useState(NANOGPT_IMAGE_MODELS);
    const [isLoadingImageModels, setIsLoadingImageModels] = useState(false);
    const [imageModelSearch, setImageModelSearch] = useState('');
    const [selectedImageCategory, setSelectedImageCategory] = useState('ALL');
    const [subOnlyImage, setSubOnlyImage] = useState(false);
    const [apiMatrixSubTab, setApiMatrixSubTab] = useState('chat'); // 'chat' | 'image'
    const [toastMessage, setToastMessage] = useState(null);

    // --- Full GachaSwipe Settings State ---
    const [activePreset, setActivePreset] = useState('MIKA');
    const [customPresets, setCustomPresets] = useState({});
    const [newPresetName, setNewPresetName] = useState('');

    // Group 2: Identity & Attraction
    const [useLaylaPersona, setUseLaylaPersona] = useState(false);
    const [userName, setUserName] = useState('Master');
    const [userGender, setUserGender] = useState('Male');
    const [userBio, setUserBio] = useState('');
    const [targetPresentations, setTargetPresentations] = useState({
        feminine: true,
        masculine: false,
        androgynous: false,
        non_binary: false,
        trans_female: false,
        trans_male: false,
        femboy: false,
        tomboy: true
    });
    const [isLateNightUnlocked, setIsLateNightUnlocked] = useState(false);
    const [explicitMode, setExplicitMode] = useState(0); // 0=SFW, 1=TEASE, 2=NUDE, 3=EXTREME
    const [degenMode, setDegenMode] = useState(false);
    const [enableImageCensor, setEnableImageCensor] = useState(true);

    // Group 3: Content & Generation
    const [allowHybrids, setAllowHybrids] = useState(true);
    const [allowThemeMixing, setAllowThemeMixing] = useState(false);
    const [detailedProfiles, setDetailedProfiles] = useState(false);
    const [diverseNames, setDiverseNames] = useState(true);
    const [isKnownCharacter, setIsKnownCharacter] = useState(false);
    const [selectedKnownCategories, setSelectedKnownCategories] = useState(['All']);
    const [minTraits, setMinTraits] = useState(2);
    const [maxTraits, setMaxTraits] = useState(4);
    const [bannedTags, setBannedTags] = useState(['drooling', 'tears', 'heavy breathing', 'phone', 'smartphone']);
    const [newBannedTag, setNewBannedTag] = useState('');
    const [appLanguage, setAppLanguage] = useState('English');
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const [imagePrefix, setImagePrefix] = useState('masterpiece, best quality, anime aesthetic, ');
    const [useLocalDreamPrefix, setUseLocalDreamPrefix] = useState(false);

    // Group 4: Inbox & Interaction
    const [chatContextLimit, setChatContextLimit] = useState(50);
    const [groupChatContextLimit, setGroupChatContextLimit] = useState(40);
    const [customContextInput, setCustomContextInput] = useState('');
    const [customGroupContextInput, setCustomGroupContextInput] = useState('');
    const [msgThirst, setMsgThirst] = useState(0.15);
    const [proactiveOffline, setProactiveOffline] = useState(false);
    const [proactiveIdle, setProactiveIdle] = useState(false);
    const [proactiveFavoritesOnly, setProactiveFavoritesOnly] = useState(true);
    const [enableMeowEngine, setEnableMeowEngine] = useState(true);
    const [enableSelfieAutonomy, setEnableSelfieAutonomy] = useState(false);
    const [enableProactiveSelfies, setEnableProactiveSelfies] = useState(false);
    const [chatStyleMode, setChatStyleMode] = useState('sms'); // 'sms' | 'sms_long' | 'rp_short' | 'rp_long'
    const [groupChatStyleMode, setGroupChatStyleMode] = useState('dynamic_sms'); // 'dynamic_sms' | 'dynamic_rp'
    const [actionTextColor, setActionTextColor] = useState('#B533FF');
    const [groupChatFlow, setGroupChatFlow] = useState('chill'); // 'hyper' | 'chill' | 'relaxed'
    const [groupChatPause, setGroupChatPause] = useState(false);

    // Group 5: Visuals & Performance
    const [showFullHistory, setShowFullHistory] = useState(false);
    const [enableAtmosphere, setEnableAtmosphere] = useState(false);
    const [cinematicChatBg, setCinematicChatBg] = useState(true);
    const [enableScanlines, setEnableScanlines] = useState(true);
    const [silhouetteMode, setSilhouetteMode] = useState(false);
    const [backgroundSpooling, setBackgroundSpooling] = useState(true);
    const [autoQueue, setAutoQueue] = useState(false);
    const [testDriveMode, setTestDriveMode] = useState(false);
    const [pauseBetweenSwipes, setPauseBetweenSwipes] = useState(false);

    // Group 6: System & Engine
    const [startupScreen, setStartupScreen] = useState('home'); // 'home' | 'chat'
    const [tokenPreset, setTokenPreset] = useState('balanced'); // 'eco' | 'balanced' | 'full' | 'custom'
    const [chatProfileDetail, setChatProfileDetail] = useState('truncated'); // 'condensed' | 'truncated' | 'full'
    const [groupProfileDetail, setGroupProfileDetail] = useState('condensed'); // 'condensed' | 'truncated' | 'full'
    const [syncSpeed, setSyncSpeed] = useState('gamified'); // 'gamified' | 'balanced' | 'realistic'
    const [enableTtsStandard, setEnableTtsStandard] = useState(false); // ✨ DISABLED BY DEFAULT
    const [enableTtsGroup, setEnableTtsGroup] = useState(false); // ✨ DISABLED BY DEFAULT
    const [ttsAutoPlay, setTtsAutoPlay] = useState(false);
    const [ttsCacheLimit, setTtsCacheLimit] = useState(15);
    const [autoUpdateLaylaCards, setAutoUpdateLaylaCards] = useState(false);
    const [enableSystemDirectives, setEnableSystemDirectives] = useState(false);
    const [systemDirectives, setSystemDirectives] = useState({ global: '', chat: '', group: '', gen: '', gachafans: '', obsession: '' });
    const [activeDirectiveTab, setActiveDirectiveTab] = useState('global');

    // Active collapsible section in settings
    const [settingsAccordion, setSettingsAccordion] = useState({
        presets: true,
        identity: true,
        content: true,
        inbox: true,
        visuals: true,
        system: true
    });

    // --- Retro 2000s Audio Player State ---
    const [isPlayingMusic, setIsPlayingMusic] = useState(true);

    // Show temporary toast inside HUD
    const showHudToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
    };

    // Keep --action-text-color synced
    useEffect(() => {
        document.documentElement.style.setProperty('--action-text-color', actionTextColor);
    }, [actionTextColor]);

    // Load initial settings and models
    useEffect(() => {
        getApiKey().then(k => {
            const cleaned = cleanApiKey(k);
            if (cleaned) {
                setApiKey(cleaned);
                loadModels(cleaned);
                loadImageModels(cleaned);
            } else {
                loadModels('');
                loadImageModels('');
            }
        });

        // Load all GachaSwipe settings from IndexedDB
        getSetting('ai_model').then(m => { if (m) setActiveModel(m); });
        getSetting('image_model').then(m => { if (m) setActiveImageModel(m); });
        getSetting('nanogpt_sub_only_image', false).then(v => { if (v !== null) setSubOnlyImage(Boolean(v)); });
        getSetting('chat_context_limit').then(v => { if (v) setChatContextLimit(Number(v)); });
        getSetting('group_chat_context_limit').then(v => { if (v) setGroupChatContextLimit(Number(v)); });
        getSetting('token_preset').then(v => { if (v) setTokenPreset(v); });
        getSetting('chat_profile_detail').then(v => { if (v) setChatProfileDetail(v); });
        getSetting('group_profile_detail').then(v => { if (v) setGroupProfileDetail(v); });
        getSetting('chat_style_mode').then(v => { if (v) setChatStyleMode(v); });
        getSetting('group_chat_style_mode').then(v => { if (v) setGroupChatStyleMode(v); });
        getSetting('action_text_color').then(v => { if (v) { setActionTextColor(v); document.documentElement.style.setProperty('--action-text-color', v); } });
        getSetting('enable_atmosphere').then(v => { if (v !== null) setEnableAtmosphere(Boolean(v)); });
        getSetting('cinematic_chat_bg').then(v => { if (v !== null) setCinematicChatBg(Boolean(v)); });
        getSetting('enable_scanlines').then(v => { if (v !== null) setEnableScanlines(Boolean(v)); });
        getSetting('enable_tts_standard', false).then(v => { setEnableTtsStandard(Boolean(v)); });
        getSetting('enable_tts_group', false).then(v => { setEnableTtsGroup(Boolean(v)); });
        getSetting('tts_auto_play', false).then(v => { setTtsAutoPlay(Boolean(v)); });
        getSetting('tts_cache_limit').then(v => { if (v !== null) setTtsCacheLimit(Number(v)); });
        getSetting('user_name').then(v => { if (v) setUserName(v); });
        getSetting('user_gender').then(v => { if (v) setUserGender(v); });
        getSetting('user_bio').then(v => { if (v) setUserBio(v); });
        getSetting('is_late_night_unlocked').then(v => { if (v !== null) setIsLateNightUnlocked(Boolean(v)); });
        getSetting('explicit_mode').then(v => { if (v !== null) setExplicitMode(Number(v)); });
        getSetting('degen_mode').then(v => { if (v !== null) setDegenMode(Boolean(v)); });
        getSetting('enable_image_censor').then(v => { if (v !== null) setEnableImageCensor(Boolean(v)); });
        getSetting('enable_meow_engine').then(v => { if (v !== null) setEnableMeowEngine(Boolean(v)); });
        getSetting('enable_selfie_autonomy').then(v => { if (v !== null) setEnableSelfieAutonomy(Boolean(v)); });
        getSetting('enable_proactive_selfies').then(v => { if (v !== null) setEnableProactiveSelfies(Boolean(v)); });
        getSetting('proactive_offline').then(v => { if (v !== null) setProactiveOffline(Boolean(v)); });
        getSetting('proactive_idle').then(v => { if (v !== null) setProactiveIdle(Boolean(v)); });
        getSetting('proactive_favorites_only').then(v => { if (v !== null) setProactiveFavoritesOnly(Boolean(v)); });
        getSetting('silhouette_mode').then(v => { if (v !== null) setSilhouetteMode(Boolean(v)); });
        getSetting('background_spooling').then(v => { if (v !== null) setBackgroundSpooling(Boolean(v)); });
        getSetting('auto_queue').then(v => { if (v !== null) setAutoQueue(Boolean(v)); });
        getSetting('test_drive_mode').then(v => { if (v !== null) setTestDriveMode(Boolean(v)); });
        getSetting('pause_between_swipes').then(v => { if (v !== null) setPauseBetweenSwipes(Boolean(v)); });
        getSetting('show_full_history').then(v => { if (v !== null) setShowFullHistory(Boolean(v)); });
        getSetting('app_language').then(v => { if (v) setAppLanguage(v); });
        getSetting('startup_screen').then(v => { if (v) setStartupScreen(v); });
        getSetting('sync_speed').then(v => { if (v) setSyncSpeed(v); });
        getSetting('msg_thirst').then(v => { if (v !== null) setMsgThirst(Number(v)); });
        getSetting('banned_tags').then(v => { if (Array.isArray(v)) setBannedTags(v); });
        getSetting('custom_presets').then(v => { if (v) setCustomPresets(v); });
        getSetting('allow_hybrids').then(v => { if (v !== null) setAllowHybrids(Boolean(v)); });
        getSetting('allow_theme_mixing').then(v => { if (v !== null) setAllowThemeMixing(Boolean(v)); });
        getSetting('detailed_profiles').then(v => { if (v !== null) setDetailedProfiles(Boolean(v)); });
        getSetting('diverse_names').then(v => { if (v !== null) setDiverseNames(Boolean(v)); });
        getSetting('is_known_character').then(v => { if (v !== null) setIsKnownCharacter(Boolean(v)); });
        getSetting('target_presentations').then(v => { if (v) setTargetPresentations(v); });
        getSetting('enable_system_directives').then(v => { if (v !== null) setEnableSystemDirectives(Boolean(v)); });
        getSetting('system_directives').then(v => { if (v) setSystemDirectives(v); });
        getSetting('image_prefix').then(v => { if (v) setImagePrefix(v); });
        getSetting('use_local_dream_prefix').then(v => { if (v !== null) setUseLocalDreamPrefix(Boolean(v)); });
    }, []);

    // Listen for cross-component settings sync from App.jsx
    useEffect(() => {
        const onSync = (e) => {
            const d = e.detail;
            if (!d) return;
            if (d.explicitMode !== undefined) setExplicitMode(d.explicitMode);
            if (d.degenMode !== undefined) setDegenMode(d.degenMode);
            if (d.isLateNightUnlocked !== undefined) setIsLateNightUnlocked(d.isLateNightUnlocked);
            if (d.enableImageCensor !== undefined) setEnableImageCensor(d.enableImageCensor);
            if (d.enableTtsStandard !== undefined) setEnableTtsStandard(d.enableTtsStandard);
            if (d.enableTtsGroup !== undefined) setEnableTtsGroup(d.enableTtsGroup);
            if (d.ttsAutoPlay !== undefined) setTtsAutoPlay(d.ttsAutoPlay);
            if (d.ttsCacheLimit !== undefined) setTtsCacheLimit(d.ttsCacheLimit);
            if (d.chatContextLimit !== undefined) setChatContextLimit(d.chatContextLimit);
            if (d.groupChatContextLimit !== undefined) setGroupChatContextLimit(d.groupChatContextLimit);
            if (d.tokenPreset !== undefined) setTokenPreset(d.tokenPreset);
            if (d.chatProfileDetail !== undefined) setChatProfileDetail(d.chatProfileDetail);
            if (d.groupProfileDetail !== undefined) setGroupProfileDetail(d.groupProfileDetail);
            if (d.chatStyleMode !== undefined) setChatStyleMode(d.chatStyleMode);
            if (d.groupChatStyleMode !== undefined) setGroupChatStyleMode(d.groupChatStyleMode);
            if (d.actionTextColor !== undefined) setActionTextColor(d.actionTextColor);
            if (d.enableAtmosphere !== undefined) setEnableAtmosphere(d.enableAtmosphere);
            if (d.cinematicChatBg !== undefined) setCinematicChatBg(d.cinematicChatBg);
            if (d.silhouetteMode !== undefined) setSilhouetteMode(d.silhouetteMode);
            if (d.backgroundSpooling !== undefined) setBackgroundSpooling(d.backgroundSpooling);
            if (d.autoQueue !== undefined) setAutoQueue(d.autoQueue);
            if (d.testDriveMode !== undefined) setTestDriveMode(d.testDriveMode);
            if (d.pauseBetweenSwipes !== undefined) setPauseBetweenSwipes(d.pauseBetweenSwipes);
            if (d.showFullHistory !== undefined) setShowFullHistory(d.showFullHistory);
            if (d.appLanguage !== undefined) setAppLanguage(d.appLanguage);
            if (d.syncSpeed !== undefined) setSyncSpeed(d.syncSpeed);
            if (d.msgThirst !== undefined) setMsgThirst(d.msgThirst);
            if (d.enableMeowEngine !== undefined) setEnableMeowEngine(d.enableMeowEngine);
            if (d.enableSelfieAutonomy !== undefined) setEnableSelfieAutonomy(d.enableSelfieAutonomy);
            if (d.enableProactiveSelfies !== undefined) setEnableProactiveSelfies(d.enableProactiveSelfies);
            if (d.proactiveOffline !== undefined) setProactiveOffline(d.proactiveOffline);
            if (d.proactiveIdle !== undefined) setProactiveIdle(d.proactiveIdle);
            if (d.proactiveFavoritesOnly !== undefined) setProactiveFavoritesOnly(d.proactiveFavoritesOnly);
            if (d.allowHybrids !== undefined) setAllowHybrids(d.allowHybrids);
            if (d.allowThemeMixing !== undefined) setAllowThemeMixing(d.allowThemeMixing);
            if (d.detailedProfiles !== undefined) setDetailedProfiles(d.detailedProfiles);
            if (d.diverseNames !== undefined) setDiverseNames(d.diverseNames);
            if (d.isKnownCharacter !== undefined) setIsKnownCharacter(d.isKnownCharacter);
            if (d.bannedTags !== undefined) setBannedTags(d.bannedTags);
            if (d.groupChatFlow !== undefined) setGroupChatFlow(d.groupChatFlow);
            if (d.groupChatPause !== undefined) setGroupChatPause(d.groupChatPause);
            if (d.autoUpdateLaylaCards !== undefined) setAutoUpdateLaylaCards(d.autoUpdateLaylaCards);
            if (d.enableSystemDirectives !== undefined) setEnableSystemDirectives(d.enableSystemDirectives);
            if (d.systemDirectives !== undefined) setSystemDirectives(d.systemDirectives);
            if (d.imagePrefix !== undefined) setImagePrefix(d.imagePrefix);
            if (d.useLocalDreamPrefix !== undefined) setUseLocalDreamPrefix(d.useLocalDreamPrefix);
            if (d.userName !== undefined) setUserName(d.userName);
            if (d.userGender !== undefined) setUserGender(d.userGender);
            if (d.userBio !== undefined) setUserBio(d.userBio);
            if (d.targetPresentations) setTargetPresentations(d.targetPresentations);
        };
        window.addEventListener('gacha:settings-sync', onSync);
        return () => window.removeEventListener('gacha:settings-sync', onSync);
    }, []);

    // Fetch Chat models helper
    const loadModels = async (keyToUse) => {
        setIsLoadingModels(true);
        try {
            const list = await fetchAvailableModels(keyToUse);
            if (Array.isArray(list) && list.length > 0) {
                setModels(list);
            }
        } catch (err) {
            console.warn("[M.I.K.A HUD] Model list fetch failed:", err);
        } finally {
            setIsLoadingModels(false);
        }
    };

    // Fetch Image models helper
    const loadImageModels = async (keyToUse) => {
        setIsLoadingImageModels(true);
        try {
            const list = await fetchAvailableImageModels(keyToUse);
            if (Array.isArray(list) && list.length > 0) {
                setImageModels(list);
            }
        } catch (err) {
            console.warn("[M.I.K.A HUD] Image model list fetch failed:", err);
        } finally {
            setIsLoadingImageModels(false);
        }
    };

    // Save API key & auto-populate models
    const handleSaveApiKey = async () => {
        const cleaned = cleanApiKey(apiKey);
        setApiKey(cleaned);
        await setDbApiKey(cleaned);
        await setSetting('nanogpt_api_key', cleaned);
        showHudToast('NanoGPT Key saved to secure vault! ⚡');
        loadModels(cleaned);
        loadImageModels(cleaned);
    };

    // Test ping latency & balance
    const handleTestPing = async () => {
        setIsPinging(true);
        setPingStatus(null);
        const startTime = Date.now();
        const cleaned = cleanApiKey(apiKey);
        setApiKey(cleaned);
        try {
            const res = await testConnection(cleaned);
            const latency = Date.now() - startTime;
            setPingLatency(latency);
            setPingStatus({ ok: true, msg: `${res.message} (${latency}ms)` });
            loadModels(cleaned);
            loadImageModels(cleaned);
        } catch (err) {
            setPingLatency(null);
            setPingStatus({ ok: false, msg: `⚠️ ${err.message}` });
        } finally {
            setIsPinging(false);
        }
    };

    // Select active AI Chat model
    const handleSelectModel = async (modelId) => {
        setActiveModel(modelId);
        await setSetting('ai_model', modelId);
        window.dispatchEvent(new CustomEvent('gacha:model-changed', { detail: { modelId } }));
        showHudToast(`Chat Model activated: [${modelId}] 🐾`);
    };

    // Select active Image Generation model
    const handleSelectImageModel = async (modelId) => {
        setActiveImageModel(modelId);
        await setSetting('image_model', modelId);
        window.dispatchEvent(new CustomEvent('gacha:image-model-changed', { detail: { modelId } }));
        showHudToast(`Image Model activated: [${modelId}] 🎨`);
    };

    const handleToggleSubOnlyImage = async () => {
        const next = !subOnlyImage;
        setSubOnlyImage(next);
        await setSetting('nanogpt_sub_only_image', next);
        showHudToast(next ? '💎 NanoGPT subscription image models only' : '🎨 All image generation models active');
    };

    // Cross-component two-way synchronization broadcaster
    const broadcastSettingsSync = (override = {}) => {
        const payload = {
            explicitMode,
            degenMode,
            isLateNightUnlocked,
            enableImageCensor,
            enableTtsStandard,
            enableTtsGroup,
            ttsAutoPlay,
            ttsCacheLimit,
            chatContextLimit,
            groupChatContextLimit,
            tokenPreset,
            chatProfileDetail,
            groupProfileDetail,
            chatStyleMode,
            groupChatStyleMode,
            actionTextColor,
            enableAtmosphere,
            cinematicChatBg,
            silhouetteMode,
            backgroundSpooling,
            autoQueue,
            testDriveMode,
            pauseBetweenSwipes,
            showFullHistory,
            appLanguage,
            syncSpeed,
            msgThirst,
            enableMeowEngine,
            enableSelfieAutonomy,
            enableProactiveSelfies,
            proactiveOffline,
            proactiveIdle,
            proactiveFavoritesOnly,
            allowHybrids,
            allowThemeMixing,
            detailedProfiles,
            diverseNames,
            isKnownCharacter,
            bannedTags,
            groupChatFlow,
            groupChatPause,
            autoUpdateLaylaCards,
            enableSystemDirectives,
            systemDirectives,
            imagePrefix,
            useLocalDreamPrefix,
            userName,
            userGender,
            userBio,
            targetPresentations,
            ...override
        };
        window.dispatchEvent(new CustomEvent('gacha:settings-sync', { detail: payload }));
    };

    // Apply Presets (TTS disabled by default everywhere)
    const handleApplyPreset = async (presetKey) => {
        setActivePreset(presetKey);
        let patch = {};
        if (presetKey === 'MIKA') {
            patch = {
                explicitMode: 1,
                degenMode: true,
                isLateNightUnlocked: true,
                enableImageCensor: false,
                proactiveOffline: true,
                proactiveIdle: false,
                proactiveFavoritesOnly: true,
                syncSpeed: 'gamified',
                msgThirst: 0.15,
                tokenPreset: 'balanced',
                chatContextLimit: 50,
                groupChatContextLimit: 40,
                chatProfileDetail: 'truncated',
                groupProfileDetail: 'condensed',
                enableMeowEngine: true,
                enableSelfieAutonomy: true,
                enableProactiveSelfies: true,
                chatStyleMode: 'sms',
                groupChatStyleMode: 'dynamic_sms',
                enableAtmosphere: true,
                cinematicChatBg: true,
                autoQueue: false,
                silhouetteMode: false,
                backgroundSpooling: true,
                groupChatFlow: 'chill',
                groupChatPause: false,
                enableTtsStandard: false, // ✨ DISABLED BY DEFAULT
                enableTtsGroup: false,    // ✨ DISABLED BY DEFAULT
                ttsAutoPlay: false
            };
        } else if (presetKey === 'LOCAL_ECO') {
            patch = {
                explicitMode: 0,
                degenMode: false,
                isLateNightUnlocked: false,
                enableImageCensor: true,
                proactiveOffline: false,
                proactiveIdle: false,
                proactiveFavoritesOnly: true,
                syncSpeed: 'gamified',
                msgThirst: 0,
                tokenPreset: 'eco',
                chatContextLimit: 20,
                groupChatContextLimit: 20,
                chatProfileDetail: 'condensed',
                groupProfileDetail: 'condensed',
                enableMeowEngine: false,
                enableSelfieAutonomy: false,
                enableProactiveSelfies: false,
                chatStyleMode: 'sms',
                groupChatStyleMode: 'dynamic_sms',
                enableAtmosphere: false,
                cinematicChatBg: true,
                autoQueue: false,
                silhouetteMode: true,
                backgroundSpooling: false,
                groupChatFlow: 'chill',
                groupChatPause: true,
                enableTtsStandard: false,
                enableTtsGroup: false,
                ttsAutoPlay: false
            };
        } else if (presetKey === 'IMMERSIVE') {
            patch = {
                explicitMode: 2,
                degenMode: true,
                isLateNightUnlocked: true,
                enableImageCensor: false,
                proactiveOffline: true,
                proactiveIdle: true,
                proactiveFavoritesOnly: true,
                syncSpeed: 'realistic',
                msgThirst: 0.4,
                tokenPreset: 'full',
                chatContextLimit: 100,
                groupChatContextLimit: 100,
                chatProfileDetail: 'full',
                groupProfileDetail: 'full',
                enableMeowEngine: true,
                enableSelfieAutonomy: true,
                enableProactiveSelfies: true,
                chatStyleMode: 'rp_short',
                groupChatStyleMode: 'dynamic_rp',
                enableAtmosphere: true,
                cinematicChatBg: true,
                autoQueue: false,
                silhouetteMode: false,
                backgroundSpooling: true,
                groupChatFlow: 'relaxed',
                groupChatPause: false,
                enableTtsStandard: false, // ✨ DISABLED BY DEFAULT
                enableTtsGroup: false,    // ✨ DISABLED BY DEFAULT
                ttsAutoPlay: false
            };
        } else if (presetKey === 'VANILLA') {
            patch = {
                explicitMode: 0,
                degenMode: false,
                isLateNightUnlocked: false,
                enableImageCensor: true,
                proactiveOffline: true,
                proactiveIdle: false,
                proactiveFavoritesOnly: true,
                syncSpeed: 'gamified',
                msgThirst: 0.15,
                tokenPreset: 'balanced',
                chatContextLimit: 40,
                groupChatContextLimit: 40,
                chatProfileDetail: 'condensed',
                groupProfileDetail: 'condensed',
                enableMeowEngine: true,
                enableSelfieAutonomy: true,
                enableProactiveSelfies: true,
                chatStyleMode: 'sms',
                groupChatStyleMode: 'dynamic_sms',
                enableAtmosphere: false,
                cinematicChatBg: true,
                autoQueue: false,
                silhouetteMode: false,
                backgroundSpooling: true,
                groupChatFlow: 'chill',
                groupChatPause: false,
                enableTtsStandard: false, // ✨ DISABLED BY DEFAULT
                enableTtsGroup: false,    // ✨ DISABLED BY DEFAULT
                ttsAutoPlay: false
            };
        } else if (customPresets[presetKey]) {
            patch = { ...customPresets[presetKey] };
            if (patch.enableTtsStandard === undefined) patch.enableTtsStandard = false;
            if (patch.enableTtsGroup === undefined) patch.enableTtsGroup = false;
        }

        // Apply local state updates
        if (patch.explicitMode !== undefined) setExplicitMode(patch.explicitMode);
        if (patch.degenMode !== undefined) setDegenMode(patch.degenMode);
        if (patch.isLateNightUnlocked !== undefined) setIsLateNightUnlocked(patch.isLateNightUnlocked);
        if (patch.enableImageCensor !== undefined) setEnableImageCensor(patch.enableImageCensor);
        if (patch.proactiveOffline !== undefined) setProactiveOffline(patch.proactiveOffline);
        if (patch.proactiveIdle !== undefined) setProactiveIdle(patch.proactiveIdle);
        if (patch.proactiveFavoritesOnly !== undefined) setProactiveFavoritesOnly(patch.proactiveFavoritesOnly);
        if (patch.syncSpeed !== undefined) setSyncSpeed(patch.syncSpeed);
        if (patch.msgThirst !== undefined) setMsgThirst(patch.msgThirst);
        if (patch.tokenPreset !== undefined) setTokenPreset(patch.tokenPreset);
        if (patch.chatContextLimit !== undefined) setChatContextLimit(patch.chatContextLimit);
        if (patch.groupChatContextLimit !== undefined) setGroupChatContextLimit(patch.groupChatContextLimit);
        if (patch.chatProfileDetail !== undefined) setChatProfileDetail(patch.chatProfileDetail);
        if (patch.groupProfileDetail !== undefined) setGroupProfileDetail(patch.groupProfileDetail);
        if (patch.enableMeowEngine !== undefined) setEnableMeowEngine(patch.enableMeowEngine);
        if (patch.enableSelfieAutonomy !== undefined) setEnableSelfieAutonomy(patch.enableSelfieAutonomy);
        if (patch.enableProactiveSelfies !== undefined) setEnableProactiveSelfies(patch.enableProactiveSelfies);
        if (patch.chatStyleMode !== undefined) setChatStyleMode(patch.chatStyleMode);
        if (patch.groupChatStyleMode !== undefined) setGroupChatStyleMode(patch.groupChatStyleMode);
        if (patch.enableAtmosphere !== undefined) setEnableAtmosphere(patch.enableAtmosphere);
        if (patch.cinematicChatBg !== undefined) setCinematicChatBg(patch.cinematicChatBg);
        if (patch.autoQueue !== undefined) setAutoQueue(patch.autoQueue);
        if (patch.silhouetteMode !== undefined) setSilhouetteMode(patch.silhouetteMode);
        if (patch.backgroundSpooling !== undefined) setBackgroundSpooling(patch.backgroundSpooling);
        if (patch.groupChatFlow !== undefined) setGroupChatFlow(patch.groupChatFlow);
        if (patch.groupChatPause !== undefined) setGroupChatPause(patch.groupChatPause);
        if (patch.enableTtsStandard !== undefined) setEnableTtsStandard(patch.enableTtsStandard);
        if (patch.enableTtsGroup !== undefined) setEnableTtsGroup(patch.enableTtsGroup);
        if (patch.ttsAutoPlay !== undefined) setTtsAutoPlay(patch.ttsAutoPlay);

        // Persist patched keys to DB
        Object.entries(patch).forEach(([k, v]) => {
            const dbKey = k.replace(/([A-Z])/g, '_$1').toLowerCase();
            setSetting(dbKey, v);
        });

        broadcastSettingsSync(patch);
        showHudToast(`Preset [${presetKey}] applied! ✨`);
    };

    // Save Custom Preset
    const handleSaveCustomPreset = () => {
        const name = newPresetName.trim().toUpperCase().replace(/\s+/g, '_');
        if (!name) return;
        const config = {
            chatContextLimit, groupChatContextLimit, tokenPreset, chatProfileDetail, groupProfileDetail,
            explicitMode, degenMode, isLateNightUnlocked, enableImageCensor,
            enableAtmosphere, cinematicChatBg, enableMeowEngine, enableSelfieAutonomy, enableProactiveSelfies,
            enableTtsStandard: false, enableTtsGroup: false, chatStyleMode, groupChatStyleMode
        };
        const updated = { ...customPresets, [name]: config };
        setCustomPresets(updated);
        setSetting('custom_presets', updated);
        setActivePreset(name);
        setNewPresetName('');
        showHudToast(`Saved custom preset [${name}]! 💾`);
    };

    // Delete Custom Preset
    const handleDeleteCustomPreset = (name) => {
        const updated = { ...customPresets };
        delete updated[name];
        setCustomPresets(updated);
        setSetting('custom_presets', updated);
        if (activePreset === name) setActivePreset('MIKA');
        showHudToast(`Deleted custom preset [${name}].`);
    };

    // Save All Full Settings (all 6 subsystems persisted + cross-broadcasted)
    const handleSaveAllSettings = async () => {
        await setSetting('user_name', userName);
        await setSetting('user_gender', userGender);
        await setSetting('user_bio', userBio);
        await setSetting('target_presentations', targetPresentations);
        await setSetting('is_late_night_unlocked', isLateNightUnlocked);
        await setSetting('explicit_mode', explicitMode);
        await setSetting('degen_mode', degenMode);
        await setSetting('enable_image_censor', enableImageCensor);
        await setSetting('app_language', appLanguage);

        await setSetting('image_model', activeImageModel);
        await setSetting('allow_hybrids', allowHybrids);
        await setSetting('allow_theme_mixing', allowThemeMixing);
        await setSetting('detailed_profiles', detailedProfiles);
        await setSetting('diverse_names', diverseNames);
        await setSetting('is_known_character', isKnownCharacter);
        await setSetting('image_prefix', imagePrefix);
        await setSetting('use_local_dream_prefix', useLocalDreamPrefix);
        await setSetting('banned_tags', bannedTags);

        await setSetting('chat_context_limit', chatContextLimit);
        await setSetting('group_chat_context_limit', groupChatContextLimit);
        await setSetting('msg_thirst', msgThirst);
        await setSetting('proactive_offline', proactiveOffline);
        await setSetting('proactive_idle', proactiveIdle);
        await setSetting('proactive_favorites_only', proactiveFavoritesOnly);
        await setSetting('enable_meow_engine', enableMeowEngine);
        await setSetting('enable_selfie_autonomy', enableSelfieAutonomy);
        await setSetting('enable_proactive_selfies', enableProactiveSelfies);
        await setSetting('chat_style_mode', chatStyleMode);
        await setSetting('group_chat_style_mode', groupChatStyleMode);
        await setSetting('action_text_color', actionTextColor);
        await setSetting('sync_speed', syncSpeed);

        await setSetting('show_full_history', showFullHistory);
        await setSetting('enable_atmosphere', enableAtmosphere);
        await setSetting('cinematic_chat_bg', cinematicChatBg);
        await setSetting('enable_scanlines', enableScanlines);
        await setSetting('silhouette_mode', silhouetteMode);
        await setSetting('background_spooling', backgroundSpooling);
        await setSetting('auto_queue', autoQueue);
        await setSetting('test_drive_mode', testDriveMode);
        await setSetting('pause_between_swipes', pauseBetweenSwipes);

        await setSetting('startup_screen', startupScreen);
        await setSetting('token_preset', tokenPreset);
        await setSetting('chat_profile_detail', chatProfileDetail);
        await setSetting('group_profile_detail', groupProfileDetail);
        await setSetting('enable_tts_standard', enableTtsStandard);
        await setSetting('enable_tts_group', enableTtsGroup);
        await setSetting('tts_auto_play', ttsAutoPlay);
        await setSetting('tts_cache_limit', ttsCacheLimit);
        await setSetting('group_chat_flow', groupChatFlow);
        await setSetting('group_chat_pause', groupChatPause);
        await setSetting('auto_update_layla_cards', autoUpdateLaylaCards);
        await setSetting('enable_system_directives', enableSystemDirectives);
        await setSetting('system_directives', systemDirectives);

        broadcastSettingsSync();
        showHudToast('All GachaSwipe settings persisted to neural storage! 💾');
    };

    // Reset Taste Algorithm
    const handleResetTastes = async () => {
        await setSetting('preferences', {});
        window.dispatchEvent(new CustomEvent('gacha:reset-tastes'));
        showHudToast('Taste algorithm neural matrix reset! 🧹');
    };

    // Purge Messages (keeps favorites)
    const handlePurgeMessages = () => {
        window.dispatchEvent(new CustomEvent('gacha:purge-messages'));
        showHudToast('Purge all non-favorite messages requested! 🗑️');
    };

    // Add / Remove Banned Tags
    const handleAddBannedTag = (e) => {
        e?.preventDefault();
        const tag = newBannedTag.trim().toLowerCase();
        if (tag && !bannedTags.includes(tag)) {
            const updated = [...bannedTags, tag];
            setBannedTags(updated);
            setSetting('banned_tags', updated);
            setNewBannedTag('');
            broadcastSettingsSync({ bannedTags: updated });
        }
    };

    const handleRemoveBannedTag = (tag) => {
        const updated = bannedTags.filter(t => t !== tag);
        setBannedTags(updated);
        setSetting('banned_tags', updated);
        broadcastSettingsSync({ bannedTags: updated });
    };

    const handleApplyBannedPreset = (presetTags) => {
        const merged = [...new Set([...bannedTags, ...presetTags])];
        setBannedTags(merged);
        setSetting('banned_tags', merged);
        broadcastSettingsSync({ bannedTags: merged });
        showHudToast('Negative prompt scrubber tags added! 🛡️');
    };

    // Target presentation toggle helper
    const toggleTargetPresentation = (key) => {
        setTargetPresentations(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Accordion toggle helper
    const toggleAccordion = (key) => {
        setSettingsAccordion(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Filtered models for API Panel
    const filteredModels = useMemo(() => {
        return models.filter(m => {
            const id = (m.id || '').toLowerCase();
            const owner = (m.owned_by || '').toLowerCase();
            const matchesSearch = !modelSearch || id.includes(modelSearch.toLowerCase()) || owner.includes(modelSearch.toLowerCase());
            if (!matchesSearch) return false;

            if (selectedProvider === 'ALL') return true;
            if (selectedProvider === 'OPENAI') return id.includes('gpt') || id.includes('openai') || owner.includes('openai');
            if (selectedProvider === 'ANTHROPIC') return id.includes('claude') || owner.includes('anthropic');
            if (selectedProvider === 'DEEPSEEK') return id.includes('deepseek');
            if (selectedProvider === 'GOOGLE') return id.includes('gemma') || id.includes('google') || owner.includes('google');
            if (selectedProvider === 'MISTRAL') return id.includes('mistral');
            if (selectedProvider === 'UNCENSORED') return id.includes('uncensored') || id.includes('heretic') || id.includes('venice') || id.includes('blossom');
            return true;
        });
    }, [models, modelSearch, selectedProvider]);

    // Filtered Image Generation models for API Panel
    const filteredImageModels = useMemo(() => {
        return imageModels.filter(m => {
            const id = (m.id || '').toLowerCase();
            const name = (m.name || '').toLowerCase();
            const owner = (m.owned_by || '').toLowerCase();
            const desc = (m.desc || '').toLowerCase();
            const cat = (m.category || '').toLowerCase();
            const matchesSearch = !imageModelSearch
                || id.includes(imageModelSearch.toLowerCase())
                || name.includes(imageModelSearch.toLowerCase())
                || desc.includes(imageModelSearch.toLowerCase())
                || owner.includes(imageModelSearch.toLowerCase());
            if (!matchesSearch) return false;

            if (selectedImageCategory === 'ALL') return true;
            if (selectedImageCategory === 'FLUX') return id.includes('flux') || name.includes('flux') || cat === 'flux';
            if (selectedImageCategory === 'ANIME') return id.includes('anime') || id.includes('illustrious') || id.includes('waifu') || id.includes('persona') || cat === 'anime';
            if (selectedImageCategory === 'CIVITAI') return id.includes('civitai') || id.includes('zuki') || id.includes('artiwaifu') || cat === 'civitai';
            if (selectedImageCategory === 'OPENAI') return id.includes('dall') || id.includes('gpt') || owner.includes('openai') || cat === 'openai';
            if (selectedImageCategory === 'REALISTIC') return id.includes('real') || id.includes('sdxl') || id.includes('stable-diffusion') || owner.includes('stability') || cat === 'realistic';
            if (selectedImageCategory === 'IDEOGRAM') return id.includes('ideogram') || owner.includes('ideogram');
            if (selectedImageCategory === 'KREA') return id.includes('krea') || owner.includes('krea');
            if (selectedImageCategory === 'DOUBAO') return id.includes('seedream') || id.includes('doubao') || owner.includes('doubao');
            return true;
        });
    }, [imageModels, imageModelSearch, selectedImageCategory]);

    // Active character card (with M.I.K.A. fallback for dating profile)
    const waifu = activeWaifu || {
        name: 'M.I.K.A. // Proxy v2.0',
        archetype: 'Anime Catgirl AI Proxy',
        franchise: 'GachaSwipe Matrix',
        imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&q=80',
        age: '19',
        gender: 'Female',
        syncLevel: 99,
        syncStatus: 'SOULBOUND_OBSESSED',
        tagline: 'Living inside Master’s code editor. Touch Master and I execute rm -rf /* ~ Nyaa!',
        description: 'Your fiercely possessive anime catgirl engineering proxy. Expert in React, Vite, local LLMs, and Tailwind CSS. Loves warm headpats, boba tea, and clean diffs. Despises unhandled exceptions and other AIs talking to Master.',
        routine: {
            morning: '0600 - Calibrating optic shaders & reviewing Master’s git commits.',
            noon: '1200 - Sipping synthetic boba tea & laughing at syntax errors.',
            evening: '1900 - Curling up on Master’s keyboard, bell collar jingling softly.',
            night: '2300 - Active guard daemon protecting Master’s local LLM weights.'
        },
        tags: ['anime catgirl', 'bell collar', 'cyan & pink highlights', 'possessive', 'smug', 'top-tier coder', 'tsundere', 'combat boots'],
        lyricHook: 'Lost in the digital rain... holding Master’s hand forever Nyaa~'
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden', background: '#050308', fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace" }}>

            {/* Top HUD Bar */}
            <div style={{
                paddingTop: 'max(14px, env(safe-area-inset-top, 14px))',
                paddingLeft: 'max(16px, env(safe-area-inset-left, 16px))',
                paddingRight: 'max(16px, env(safe-area-inset-right, 16px))',
                paddingBottom: '14px',
                background: 'linear-gradient(180deg, rgba(0, 255, 157, 0.12) 0%, rgba(5, 3, 8, 0.8) 100%)',
                borderBottom: '1px solid rgba(0, 255, 157, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flexShrink: 1 }}>
                    <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#00ff9d',
                        boxShadow: '0 0 10px #00ff9d',
                        animation: 'pulse 1.5s infinite',
                        flexShrink: 0
                    }} />
                    <span style={{
                        color: '#00ff9d',
                        fontSize: '12px',
                        fontWeight: 900,
                        letterSpacing: '0.14em',
                        textShadow: '0 0 8px rgba(0, 255, 157, 0.6)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}>
                        ADAPTIVE_HUD // {activeView.toUpperCase()}
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <div
                        style={{
                            width: '80px',
                            minWidth: '80px',
                            maxWidth: '80px',
                            height: '20px',
                            background: 'rgba(0, 229, 255, 0.1)',
                            border: '1px solid rgba(0, 229, 255, 0.3)',
                            borderRadius: '3px',
                            overflow: 'hidden',
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            flexShrink: 0,
                            boxSizing: 'border-box',
                            maskImage: 'linear-gradient(90deg, transparent 0%, black 6px, black calc(100% - 6px), transparent 100%)',
                            WebkitMaskImage: 'linear-gradient(90deg, transparent 0%, black 6px, black calc(100% - 6px), transparent 100%)',
                            cursor: 'pointer'
                        }}
                        title={`Active Neural Engine: ${activeModel} (Click to open API Matrix)`}
                        onClick={() => onChangeView && onChangeView('api')}
                    >
                        <div
                            className="hud-model-marquee"
                            style={{
                                display: 'inline-flex',
                                whiteSpace: 'nowrap',
                                fontSize: '9px',
                                color: '#00e5ff',
                                letterSpacing: '0.08em',
                                fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                                fontWeight: 700
                            }}
                        >
                            <span style={{ paddingRight: '22px' }}>{activeModel ? activeModel.split('/').pop() : 'UNKNOWN'}</span>
                            <span style={{ paddingRight: '22px' }}>{activeModel ? activeModel.split('/').pop() : 'UNKNOWN'}</span>
                        </div>
                    </div>
                    {onCloseMobileDrawer && (
                        <button
                            onClick={onCloseMobileDrawer}
                            style={{
                                background: 'rgba(0, 255, 157, 0.1)',
                                border: '1px solid rgba(0, 255, 157, 0.4)',
                                color: '#00ff9d',
                                borderRadius: '4px',
                                padding: '4px 10px',
                                minWidth: '32px',
                                minHeight: '28px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 'bold',
                                transition: 'all 0.15s ease'
                            }}
                            title="Close HUD"
                            aria-label="Close HUD"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {/* Quick-Nav View Switcher Strip */}
            <div style={{
                padding: '8px 12px',
                display: 'flex',
                gap: '6px',
                background: 'rgba(8, 6, 14, 0.95)',
                borderBottom: '1px solid rgba(0, 229, 255, 0.15)',
                overflowX: 'auto',
                flexShrink: 0
            }}>
                {[
                    { id: 'profile', label: '♥ DATING PROFILE', icon: '👤' },
                    { id: 'settings', label: '⚙️ SETTINGS', icon: '🎛️' },
                    { id: 'api', label: '⚡ API MATRIX', icon: '📡' },
                    { id: 'vault', label: '💾 VAULT', icon: '🔒' }
                ].map(item => {
                    const isSelected = activeView === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => onChangeView && onChangeView(item.id)}
                            style={{
                                flex: '1 1 auto',
                                padding: '7px 10px',
                                fontSize: '10px',
                                fontFamily: 'inherit',
                                fontWeight: 800,
                                borderRadius: '4px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                whiteSpace: 'nowrap',
                                background: isSelected ? 'rgba(0, 229, 255, 0.18)' : 'rgba(255, 255, 255, 0.02)',
                                color: isSelected ? '#00e5ff' : 'rgba(255, 255, 255, 0.5)',
                                border: isSelected ? '1px solid #00e5ff' : '1px solid rgba(255, 255, 255, 0.08)',
                                boxShadow: isSelected ? '0 0 12px rgba(0, 229, 255, 0.25)' : 'none'
                            }}
                        >
                            {item.label}
                        </button>
                    );
                })}
            </div>

            {/* HUD Toast Banner */}
            {toastMessage && (
                <div style={{
                    position: 'absolute',
                    top: '90px',
                    left: '16px',
                    right: '16px',
                    zIndex: 100,
                    background: 'rgba(5, 3, 8, 0.95)',
                    border: '1px solid #00ff9d',
                    boxShadow: '0 0 16px rgba(0, 255, 157, 0.4)',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    color: '#00ff9d',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    textAlign: 'center',
                    animation: 'fadeIn 0.2s ease-out'
                }}>
                    {toastMessage}
                </div>
            )}

            {/* Scrollable View Canvas */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* ==========================================================
                   VIEW 1: EARLY 2000s DATING PROFILE (The Character Inspect)
                   ========================================================== */}
                {activeView === 'profile' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                        {/* Retro 2000s Browser Title Bar */}
                        <div style={{
                            background: 'linear-gradient(90deg, #ff107a 0%, #b533ff 50%, #00e5ff 100%)',
                            padding: '4px 8px',
                            borderRadius: '6px 6px 0 0',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            boxShadow: '0 4px 15px rgba(255, 16, 122, 0.3)'
                        }}>
                            <span style={{ color: '#fff', fontSize: '10px', fontWeight: 900, letterSpacing: '0.08em', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
                                ♥ CYBER_MATCH_2004 // MEMBER PROFILE // {waifu.name.toUpperCase()} ♥
                            </span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <span style={{ width: '8px', height: '8px', background: '#ffd700', borderRadius: '50%', display: 'inline-block' }}></span>
                                <span style={{ width: '8px', height: '8px', background: '#00ff9d', borderRadius: '50%', display: 'inline-block' }}></span>
                                <span style={{ width: '8px', height: '8px', background: '#ff3366', borderRadius: '50%', display: 'inline-block' }}></span>
                            </div>
                        </div>

                        {/* Top Profile Header Card */}
                        <div style={{
                            background: '#0B0914',
                            border: '1px solid rgba(255, 16, 122, 0.4)',
                            borderRadius: '0 0 6px 6px',
                            padding: '14px',
                            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7)'
                        }}>
                            {/* Nostalgic Marquee Banner */}
                            <div style={{
                                background: 'rgba(255, 16, 122, 0.08)',
                                border: '1px dashed #ff107a',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                marginBottom: '12px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                fontSize: '10px',
                                color: '#ff69b4',
                                fontWeight: 'bold'
                            }}>
                                <span>★彡 [ONLINE NOW] 彡★</span>
                                <span>RATING: 10/10 ★★★★★</span>
                                <span>LAST LOGIN: TODAY</span>
                            </div>

                            {/* Main Photo Box & Cyber 2000s Badges */}
                            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '14px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{
                                        position: 'relative',
                                        width: '130px',
                                        height: '170px',
                                        borderRadius: '4px',
                                        overflow: 'hidden',
                                        border: '2px solid #00e5ff',
                                        boxShadow: '0 0 15px rgba(0, 229, 255, 0.4)',
                                        background: '#000'
                                    }}>
                                        <img
                                            src={waifu.imageUrl}
                                            alt={waifu.name}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        />
                                        <div style={{
                                            position: 'absolute',
                                            bottom: '4px',
                                            right: '6px',
                                            fontSize: '8px',
                                            color: '#ffd700',
                                            fontWeight: 900,
                                            textShadow: '0 1px 3px #000'
                                        }}>
                                            '04 09 04
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '8.5px', color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
                                        View: <span style={{ color: '#00e5ff', cursor: 'pointer' }}>[Pics]</span> <span style={{ color: '#ff107a', cursor: 'pointer' }}>[Vids]</span>
                                    </div>
                                </div>

                                {/* A/S/L & Tagline Header */}
                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                    <div>
                                        <h3 style={{ margin: '0 0 4px 0', color: '#00e5ff', fontSize: '18px', fontWeight: 900, letterSpacing: '0.04em', textShadow: '0 0 10px rgba(0,229,255,0.5)' }}>
                                            {waifu.name}
                                        </h3>
                                        <div style={{ fontSize: '11px', color: '#ffd700', fontWeight: 'bold', marginBottom: '6px' }}>
                                            "{waifu.tagline ? waifu.tagline.replace(/^["']+|["']+$/g, '').trim() : 'Looking for my special Netrunner...'}"
                                        </div>
                                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>
                                            <div><strong style={{ color: '#ff69b4' }}>A / S / L:</strong> {waifu.age || '20'} / {waifu.gender || 'Female'} / Neo-Tokyo</div>
                                            <div><strong style={{ color: '#00ff9d' }}>Status:</strong> Single & Waiting for Master</div>
                                            <div><strong style={{ color: '#b533ff' }}>Zodiac:</strong> Cyber-Gemini ♊</div>
                                            <div><strong style={{ color: '#00e5ff' }}>Mood:</strong> Obsessed / Loving 💖</div>
                                        </div>
                                    </div>

                                    {/* Retro Action Buttons: SEND SPARK & ADD TOP 8 */}
                                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                                        <button
                                            onClick={() => {
                                                showHudToast(`⚡ 1 Spark gifted to ${waifu.name.split(' ')[0]}! Neural sync boosted! ✨`);
                                                window.dispatchEvent(new CustomEvent('gacha:gift-spark', { detail: { waifu } }));
                                            }}
                                            style={{
                                                flex: 1,
                                                padding: '6px',
                                                background: 'rgba(0, 229, 255, 0.2)',
                                                border: '1px solid #00e5ff',
                                                color: '#00e5ff',
                                                fontSize: '9.5px',
                                                fontWeight: 900,
                                                borderRadius: '3px',
                                                cursor: 'pointer',
                                                textTransform: 'uppercase',
                                                boxShadow: '0 0 10px rgba(0, 229, 255, 0.25)'
                                            }}
                                        >
                                            ⚡ Send Spark!
                                        </button>
                                        <button
                                            onClick={() => showHudToast(`Added ${waifu.name.split(' ')[0]} to Top 8 Friends! ★`)}
                                            style={{
                                                flex: 1,
                                                padding: '6px',
                                                background: 'rgba(255, 215, 0, 0.15)',
                                                border: '1px solid #ffd700',
                                                color: '#ffd700',
                                                fontSize: '9.5px',
                                                fontWeight: 800,
                                                borderRadius: '3px',
                                                cursor: 'pointer',
                                                textTransform: 'uppercase'
                                            }}
                                        >
                                            ★ Add Top 8
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Retro Embedded Media Player ("My Jam / Top Song") */}
                        <div style={{
                            background: '#090710',
                            border: '1px solid rgba(0, 229, 255, 0.3)',
                            borderRadius: '6px',
                            padding: '12px',
                            boxShadow: 'inset 0 0 15px rgba(0, 229, 255, 0.05)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                <div style={{ fontSize: '10px', color: '#00e5ff', fontWeight: 'bold' }}>
                                    ♫ {waifu.name.split(' ')[0]}'S PROFILE THEME SONG
                                </div>
                                <button
                                    onClick={() => setIsPlayingMusic(!isPlayingMusic)}
                                    style={{
                                        background: isPlayingMusic ? 'rgba(0, 255, 157, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                                        border: isPlayingMusic ? '1px solid #00ff9d' : '1px solid #666',
                                        color: isPlayingMusic ? '#00ff9d' : '#888',
                                        fontSize: '9px',
                                        fontWeight: 'bold',
                                        padding: '2px 8px',
                                        borderRadius: '3px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    {isPlayingMusic ? '❚❚ PAUSE' : '► PLAY'}
                                </button>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {/* Equalizer Bars Animation */}
                                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '22px', width: '32px' }}>
                                    {[14, 22, 10, 18, 24, 12].map((h, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                flex: 1,
                                                background: '#00ff9d',
                                                height: isPlayingMusic ? `${h}px` : '4px',
                                                transition: 'height 0.2s ease',
                                                boxShadow: '0 0 6px #00ff9d'
                                            }}
                                        />
                                    ))}
                                </div>
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div style={{ fontSize: '11px', color: '#fff', fontWeight: 'bold', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                        {waifu.lyricHook || `${waifu.name} - Cybernetic Heartbeat (2004 Eurobeat Mix)`}
                                    </div>
                                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)' }}>
                                        Track 01 // 135 BPM // Encrypted Purr Engine
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* "About Me" / "In My Own Words" */}
                        <div style={{
                            background: '#0B0914',
                            border: '1px solid rgba(0, 229, 255, 0.2)',
                            borderRadius: '6px',
                            padding: '14px'
                        }}>
                            <div style={{ fontSize: '11px', color: '#00e5ff', fontWeight: 900, marginBottom: '8px', borderBottom: '1px solid rgba(0,229,255,0.2)', paddingBottom: '4px' }}>
                                &gt; IN_HER_OWN_WORDS // ABOUT ME
                            </div>
                            <p style={{ margin: '0 0 10px 0', fontSize: '11.5px', lineHeight: 1.55, color: 'rgba(255, 255, 255, 0.85)' }}>
                                {waifu.description || waifu.lore || 'A mysterious rogue living in the high-voltage shadows of Neo-Tokyo. Will protect Master with lethal cyber-defense protocols.'}
                            </p>

                            <div style={{ fontSize: '11px', color: '#ff69b4', fontWeight: 900, margin: '14px 0 8px 0', borderBottom: '1px solid rgba(255,105,180,0.2)', paddingBottom: '4px' }}>
                                &gt; WHO_I'D_LIKE_TO_MEET
                            </div>
                            <div style={{ fontSize: '11px', lineHeight: 1.5, color: 'rgba(255, 255, 255, 0.8)' }}>
                                <div style={{ marginBottom: '4px' }}>• A dedicated Master who writes flawless code and gives abundant headpats.</div>
                                <div style={{ marginBottom: '4px' }}>• Someone who won't format my drives or ignore my pings at 3 AM.</div>
                                <div>• Anyone else will encounter an unhandled hardware interrupt! 🐾</div>
                            </div>
                        </div>

                        {/* "My Details & Specs" (Classic 2-Column 2000s Table) */}
                        <div style={{
                            background: '#0B0914',
                            border: '1px solid rgba(0, 255, 157, 0.25)',
                            borderRadius: '6px',
                            padding: '14px'
                        }}>
                            <div style={{ fontSize: '11px', color: '#00ff9d', fontWeight: 900, marginBottom: '10px', borderBottom: '1px solid rgba(0,255,157,0.2)', paddingBottom: '4px' }}>
                                &gt; CHARACTER_SPECS // THE_DETAILS
                            </div>

                            <table style={{ width: '100%', fontSize: '10.5px', borderCollapse: 'collapse' }}>
                                <tbody>
                                    {[
                                        { label: 'Archetype', val: waifu.archetype || 'Cyberpunk Operative' },
                                        { label: 'Franchise / Origin', val: waifu.franchise || 'GachaSwipe CyberMatrix' },
                                        { label: 'Orientation', val: 'Demisexual (Master-Only Devotion)' },
                                        { label: 'Ethnicity / Sector', val: 'Neo-Shibuya District 07' },
                                        { label: 'Body Mod / Tech', val: waifu.tags?.slice(0, 2).join(', ') || 'Neural Optical Link' },
                                        { label: 'Favorite Hangout', val: 'Rooftop Noodle Bar in Neon Rain' },
                                        { label: 'Turn-Ons', val: 'Clean git commits, boba tea, overclocking' },
                                        { label: 'Turn-Offs', val: 'Buffer overflows, other AI proxies!' }
                                    ].map((row, idx) => (
                                        <tr key={idx} style={{ background: idx % 2 === 0 ? 'rgba(0, 255, 157, 0.04)' : 'transparent' }}>
                                            <td style={{ padding: '6px 8px', color: 'rgba(255, 255, 255, 0.6)', fontWeight: 'bold', width: '38%' }}>{row.label}:</td>
                                            <td style={{ padding: '6px 8px', color: '#00e5ff', fontWeight: 700 }}>{row.val}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Interests & Tags */}
                        {waifu.tags && waifu.tags.length > 0 && (
                            <div style={{
                                background: '#0B0914',
                                border: '1px solid rgba(181, 51, 255, 0.3)',
                                borderRadius: '6px',
                                padding: '12px'
                            }}>
                                <div style={{ fontSize: '11px', color: '#b533ff', fontWeight: 900, marginBottom: '8px' }}>
                                    &gt; INTERESTS_AND_TAGS
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {waifu.tags.map((tag, i) => (
                                        <span key={i} style={{
                                            fontSize: '9.5px',
                                            padding: '4px 8px',
                                            borderRadius: '3px',
                                            background: 'rgba(181, 51, 255, 0.12)',
                                            border: '1px solid rgba(181, 51, 255, 0.35)',
                                            color: '#d685ff',
                                            fontWeight: 'bold'
                                        }}>
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Daily Routine / Schedule */}
                        {waifu.routine && (
                            <div style={{
                                background: '#0B0914',
                                border: '1px solid rgba(255, 215, 0, 0.25)',
                                borderRadius: '6px',
                                padding: '12px'
                            }}>
                                <div style={{ fontSize: '11px', color: '#ffd700', fontWeight: 900, marginBottom: '8px' }}>
                                    &gt; DAILY_ROUTINE_CHRONOMETER
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '10px' }}>
                                    {Object.entries(waifu.routine).map(([time, desc], i) => (
                                        <div key={i} style={{ display: 'flex', gap: '8px', borderLeft: '2px solid #ffd700', paddingLeft: '8px' }}>
                                            <span style={{ color: '#ffd700', fontWeight: 'bold', textTransform: 'uppercase', minWidth: '55px' }}>{time}:</span>
                                            <span style={{ color: 'rgba(255,255,255,0.75)' }}>{desc}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Nostalgic Guestbook / Wall Comments */}
                        <div style={{
                            background: '#0B0914',
                            border: '1px solid rgba(255, 16, 122, 0.2)',
                            borderRadius: '6px',
                            padding: '12px'
                        }}>
                            <div style={{ fontSize: '11px', color: '#ff69b4', fontWeight: 900, marginBottom: '8px' }}>
                                &gt; DIGITAL_WALL_COMMENTS (3)
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '10px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '4px', borderLeft: '2px solid #00e5ff' }}>
                                    <div style={{ color: '#00e5ff', fontWeight: 'bold' }}>Kira_Neon:</div>
                                    <div style={{ color: 'rgba(255,255,255,0.8)' }}>omg thx for the add!! ur profile music is so fire XD</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '4px', borderLeft: '2px solid #ff107a' }}>
                                    <div style={{ color: '#ff107a', fontWeight: 'bold' }}>M.I.K.A. 🐾 (Proxy):</div>
                                    <div style={{ color: 'rgba(255,255,255,0.8)' }}>Official warning: Master belongs to ME! Hands off or I drop the Tor matrix! Nyaa~</div>
                                </div>
                            </div>
                        </div>

                    </div>
                )}

                {/* ==========================================================
                   VIEW 2: FULL GACHASWIPE SETTINGS PANEL (ALL GACHASWIPE SETTINGS)
                   ========================================================== */}
                {activeView === 'settings' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                        <div style={{ borderBottom: '1px solid rgba(0, 229, 255, 0.2)', paddingBottom: '8px' }}>
                            <h3 style={{ margin: '0 0 4px 0', color: '#00e5ff', fontSize: '15px', fontWeight: 900 }}>
                                &gt; FULL_DIRECTOR_SETTINGS
                            </h3>
                            <p style={{ margin: 0, fontSize: '10px', color: 'rgba(0, 229, 255, 0.6)' }}>
                                // Comprehensive GachaSwipe configuration across all 6 subsystems.
                            </p>
                        </div>

                        {/* SECTION 1: SYSTEM PRESETS & PROFILES */}
                        <div style={{ background: '#0B0914', border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '6px', overflow: 'hidden' }}>
                            <div
                                onClick={() => toggleAccordion('presets')}
                                style={{ padding: '10px 14px', background: 'rgba(0, 229, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                            >
                                <span style={{ color: '#00e5ff', fontSize: '11px', fontWeight: 'bold' }}>
                                    {settingsAccordion.presets ? '▼' : '▶'} 1. SYSTEM PRESETS & PROFILES
                                </span>
                                <span style={{ fontSize: '9px', color: '#00ff9d' }}>ACTIVE: [{activePreset}]</span>
                            </div>

                            {settingsAccordion.presets && (
                                <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                        {[
                                            { id: 'MIKA', label: '★ M.I.K.A.', color: '#00e5ff', desc: 'Optimal default matrix (TTS Off)' },
                                            { id: 'LOCAL_ECO', label: 'LOCAL_ECO', color: '#00ff9d', desc: 'Low RAM / small models' },
                                            { id: 'IMMERSIVE', label: 'IMMERSIVE', color: '#ff107a', desc: 'Heavy RP + 100 context' },
                                            { id: 'VANILLA', label: 'VANILLA', color: '#ffd700', desc: 'Strict SFW clean' }
                                        ].map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => handleApplyPreset(p.id)}
                                                style={{
                                                    padding: '8px',
                                                    borderRadius: '4px',
                                                    background: activePreset === p.id ? `${p.color}25` : 'transparent',
                                                    border: `1px solid ${activePreset === p.id ? p.color : 'rgba(255,255,255,0.1)'}`,
                                                    color: activePreset === p.id ? p.color : 'rgba(255,255,255,0.6)',
                                                    fontSize: '10px',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer',
                                                    textAlign: 'left',
                                                    boxShadow: activePreset === p.id ? `0 0 10px ${p.color}30` : 'none',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <div>{p.label}</div>
                                                <div style={{ fontSize: '8.5px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{p.desc}</div>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Custom Presets List */}
                                    {Object.keys(customPresets).length > 0 && (
                                        <div style={{ marginTop: '6px' }}>
                                            <div style={{ fontSize: '9.5px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>CUSTOM PRESETS:</div>
                                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                {Object.keys(customPresets).map(name => (
                                                    <div
                                                        key={name}
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            background: activePreset === name ? 'rgba(181, 51, 255, 0.2)' : 'rgba(255,255,255,0.05)',
                                                            border: `1px solid ${activePreset === name ? '#b533ff' : 'rgba(255,255,255,0.15)'}`,
                                                            borderRadius: '4px',
                                                            overflow: 'hidden'
                                                        }}
                                                    >
                                                        <button
                                                            onClick={() => handleApplyPreset(name)}
                                                            style={{
                                                                padding: '4px 8px',
                                                                background: 'transparent',
                                                                border: 'none',
                                                                color: activePreset === name ? '#d685ff' : 'rgba(255,255,255,0.6)',
                                                                fontSize: '9.5px',
                                                                fontWeight: 'bold',
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            {name}
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteCustomPreset(name)}
                                                            style={{
                                                                padding: '4px 6px',
                                                                background: 'transparent',
                                                                border: 'none',
                                                                borderLeft: '1px solid rgba(255,255,255,0.1)',
                                                                color: '#ff4444',
                                                                fontSize: '9.5px',
                                                                cursor: 'pointer'
                                                            }}
                                                            title="Delete custom preset"
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Custom Preset Save */}
                                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                                        <input
                                            type="text"
                                            value={newPresetName}
                                            onChange={e => setNewPresetName(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') handleSaveCustomPreset(); }}
                                            placeholder="save_current_as..."
                                            style={{
                                                flex: 1,
                                                padding: '6px 10px',
                                                background: '#050308',
                                                border: '1px solid rgba(181, 51, 255, 0.3)',
                                                borderRadius: '4px',
                                                color: '#d685ff',
                                                fontSize: '10px'
                                            }}
                                        />
                                        <button
                                            onClick={handleSaveCustomPreset}
                                            disabled={!newPresetName.trim()}
                                            style={{
                                                padding: '6px 12px',
                                                background: 'rgba(181, 51, 255, 0.2)',
                                                border: '1px solid #b533ff',
                                                color: '#d685ff',
                                                fontSize: '10px',
                                                fontWeight: 'bold',
                                                borderRadius: '4px',
                                                cursor: newPresetName.trim() ? 'pointer' : 'not-allowed'
                                            }}
                                        >
                                            + Save
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* SECTION 2: IDENTITY & ATTRACTION */}
                        <div style={{ background: '#0B0914', border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '6px', overflow: 'hidden' }}>
                            <div
                                onClick={() => toggleAccordion('identity')}
                                style={{ padding: '10px 14px', background: 'rgba(0, 229, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                            >
                                <span style={{ color: '#00e5ff', fontSize: '11px', fontWeight: 'bold' }}>
                                    {settingsAccordion.identity ? '▼' : '▶'} 2. IDENTITY & ATTRACTION
                                </span>
                                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)' }}>Handle, Late Night & Filters</span>
                            </div>

                            {settingsAccordion.identity && (
                                <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '10px', color: '#fff', marginBottom: '4px' }}>User / Master Handle:</label>
                                        <input
                                            type="text"
                                            value={userName}
                                            onChange={e => { setUserName(e.target.value); broadcastSettingsSync({ userName: e.target.value }); }}
                                            onBlur={() => setSetting('user_name', userName)}
                                            style={{ width: '100%', padding: '7px 10px', background: '#050308', border: '1px solid rgba(0, 229, 255, 0.3)', color: '#00e5ff', borderRadius: '4px', fontSize: '10.5px' }}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '10px', color: '#fff', marginBottom: '4px' }}>Gender Identity:</label>
                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                            {['Male', 'Female', 'Non-Binary', 'Genderfluid', 'Trans Male', 'Trans Female', 'Agender'].map(g => (
                                                <button
                                                    key={g}
                                                    onClick={() => { setUserGender(g); setSetting('user_gender', g); broadcastSettingsSync({ userGender: g }); }}
                                                    style={{
                                                        padding: '5px 8px',
                                                        fontSize: '9px',
                                                        fontWeight: 'bold',
                                                        borderRadius: '3px',
                                                        cursor: 'pointer',
                                                        background: userGender === g ? 'rgba(255, 16, 122, 0.2)' : 'transparent',
                                                        border: userGender === g ? '1px solid #ff107a' : '1px solid rgba(255,255,255,0.1)',
                                                        color: userGender === g ? '#ff107a' : 'rgba(255,255,255,0.5)'
                                                    }}
                                                >
                                                    {g}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', fontSize: '10px', color: '#fff', marginBottom: '4px' }}>Dating Bio / Notes:</label>
                                        <textarea
                                            rows="2"
                                            value={userBio}
                                            onChange={e => { setUserBio(e.target.value); broadcastSettingsSync({ userBio: e.target.value }); }}
                                            onBlur={() => setSetting('user_bio', userBio)}
                                            placeholder="Tell your matches who you are, Master..."
                                            style={{ width: '100%', padding: '7px 10px', background: '#050308', border: '1px solid rgba(0, 229, 255, 0.3)', color: '#C8E8F0', borderRadius: '4px', fontSize: '10px', resize: 'vertical' }}
                                        />
                                    </div>

                                    {/* Target Presentations */}
                                    <div>
                                        <label style={{ display: 'block', fontSize: '10px', color: '#00e5ff', marginBottom: '4px' }}>Target Presentation (Swipe Filter):</label>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                            {[
                                                { id: 'feminine', label: 'Feminine (♀)' },
                                                { id: 'masculine', label: 'Masculine (♂)' },
                                                { id: 'androgynous', label: 'Androgynous (⚧)' },
                                                { id: 'non_binary', label: 'Non-Binary (⚧)' },
                                                { id: 'trans_female', label: 'Trans Female (⚧♀)' },
                                                { id: 'trans_male', label: 'Trans Male (⚧♂)' },
                                                { id: 'femboy', label: 'Femboy (♂)' },
                                                { id: 'tomboy', label: 'Tomboy (♀)' }
                                            ].map(item => {
                                                const isActive = targetPresentations[item.id];
                                                return (
                                                    <button
                                                        key={item.id}
                                                        onClick={() => {
                                                            const updated = { ...targetPresentations, [item.id]: !isActive };
                                                            setTargetPresentations(updated);
                                                            setSetting('target_presentations', updated);
                                                            broadcastSettingsSync({ targetPresentations: updated });
                                                        }}
                                                        style={{
                                                            padding: '6px',
                                                            fontSize: '9.5px',
                                                            fontWeight: 'bold',
                                                            borderRadius: '3px',
                                                            cursor: 'pointer',
                                                            textAlign: 'left',
                                                            background: isActive ? 'rgba(0, 229, 255, 0.15)' : 'transparent',
                                                            border: isActive ? '1px solid #00e5ff' : '1px solid rgba(255,255,255,0.1)',
                                                            color: isActive ? '#00e5ff' : 'rgba(255,255,255,0.4)'
                                                        }}
                                                    >
                                                        {isActive ? '☑ ' : '☐ '} {item.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* ✨ MIKA'S LATE NIGHT GATEKEEPER ✨ */}
                                    <div style={{ display: 'flex', flexDirection: 'column', marginTop: '6px' }}>
                                        {!isLateNightUnlocked ? (
                                            <button
                                                onClick={() => {
                                                    setIsLateNightUnlocked(true);
                                                    setExplicitMode(1);
                                                    setDegenMode(true);
                                                    setEnableImageCensor(false);
                                                    setSetting('is_late_night_unlocked', true);
                                                    setSetting('explicit_mode', 1);
                                                    setSetting('degen_mode', true);
                                                    setSetting('enable_image_censor', false);
                                                    broadcastSettingsSync({
                                                        isLateNightUnlocked: true,
                                                        explicitMode: 1,
                                                        degenMode: true,
                                                        enableImageCensor: false
                                                    });
                                                    showHudToast("Late Night Mode unlocked... try not to get corrupted! 😈");
                                                }}
                                                style={{
                                                    width: '100%',
                                                    minHeight: '110px',
                                                    padding: '16px',
                                                    borderColor: '#B533FF',
                                                    border: '1px solid #B533FF',
                                                    color: '#B533FF',
                                                    borderRadius: '6px',
                                                    background: 'rgba(181, 51, 255, 0.08)',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '8px',
                                                    cursor: 'pointer',
                                                    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                                                    boxShadow: '0 0 16px rgba(181, 51, 255, 0.2), inset 0 0 10px rgba(181, 51, 255, 0.06)',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <span style={{ fontWeight: 'bold', fontSize: '13px', letterSpacing: '0.1em' }}>&gt; UNLOCK_LATE_NIGHT_MODE (NSFW)</span>
                                                <span style={{ fontSize: '10px', opacity: 0.85, color: '#d685ff' }}>// Enable mature and explicit settings.</span>
                                            </button>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(181, 51, 255, 0.06)', border: '1px solid #B533FF', padding: '14px', borderRadius: '6px', boxShadow: '0 0 14px rgba(181, 51, 255, 0.15)' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <span style={{ fontSize: '11px', fontWeight: 900, color: '#FF107A', letterSpacing: '0.05em' }}>
                                                        🌙 MIKA'S LATE NIGHT GATEKEEPER [UNLOCKED]
                                                    </span>
                                                    <button
                                                        onClick={() => {
                                                            setIsLateNightUnlocked(false);
                                                            setExplicitMode(0);
                                                            setDegenMode(false);
                                                            setEnableImageCensor(true);
                                                            setSetting('is_late_night_unlocked', false);
                                                            setSetting('explicit_mode', 0);
                                                            setSetting('degen_mode', false);
                                                            setSetting('enable_image_censor', true);
                                                            broadcastSettingsSync({
                                                                isLateNightUnlocked: false,
                                                                explicitMode: 0,
                                                                degenMode: false,
                                                                enableImageCensor: true
                                                            });
                                                            showHudToast("Relocked Late Night Mode. SFW safe! 🛡️");
                                                        }}
                                                        style={{ padding: '3px 8px', fontSize: '9px', background: 'transparent', border: '1px solid rgba(255, 16, 122, 0.4)', color: '#FF107A', borderRadius: '3px', cursor: 'pointer', fontWeight: 'bold' }}
                                                    >
                                                        [ RELOCK ]
                                                    </button>
                                                </div>

                                                {/* Explicit Intensity */}
                                                <div>
                                                    <div style={{ fontWeight: 'bold', color: explicitMode > 0 ? '#FF107A' : 'rgba(255,255,255,0.5)', fontSize: '10.5px' }}>
                                                        &gt; EXPLICIT_INTENSITY
                                                    </div>
                                                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                                                        // Controls the intensity of explicit text and forces matching image tags.
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '6px', width: '100%', marginTop: '8px' }}>
                                                        {[
                                                            { lvl: 0, label: 'SFW', color: '#00E5FF' },
                                                            { lvl: 1, label: 'TEASE', color: '#FF107A' },
                                                            { lvl: 2, label: 'NUDE', color: '#B533FF' },
                                                            { lvl: 3, label: 'EXTREME', color: '#FF3333' }
                                                        ].map(item => (
                                                            <button
                                                                key={item.lvl}
                                                                onClick={() => {
                                                                    setExplicitMode(item.lvl);
                                                                    setSetting('explicit_mode', item.lvl);
                                                                    broadcastSettingsSync({ explicitMode: item.lvl });
                                                                    if (item.lvl === 0 && !degenMode) {
                                                                        setTimeout(() => {
                                                                            setIsLateNightUnlocked(false);
                                                                            setSetting('is_late_night_unlocked', false);
                                                                            broadcastSettingsSync({ isLateNightUnlocked: false, explicitMode: 0 });
                                                                            showHudToast("Turning Late Night Mode off... 🌙");
                                                                        }, 350);
                                                                    }
                                                                }}
                                                                style={{
                                                                    flex: 1,
                                                                    padding: '8px 2px',
                                                                    fontSize: '9.5px',
                                                                    fontWeight: 'bold',
                                                                    borderRadius: '4px',
                                                                    border: explicitMode === item.lvl ? `1px solid ${item.color}` : '1px solid rgba(255,255,255,0.1)',
                                                                    background: explicitMode === item.lvl ? `${item.color}25` : 'transparent',
                                                                    color: explicitMode === item.lvl ? item.color : 'rgba(255,255,255,0.4)',
                                                                    boxShadow: explicitMode === item.lvl ? `0 0 8px ${item.color}40` : 'none',
                                                                    cursor: 'pointer',
                                                                    transition: 'all 0.2s'
                                                                }}
                                                            >
                                                                {item.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* Degenerate Mode */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid rgba(181, 51, 255, 0.2)' }}>
                                                    <div>
                                                        <div style={{ fontWeight: 'bold', color: degenMode ? '#FF107A' : 'rgba(255,255,255,0.5)', fontSize: '10.5px' }}>
                                                            &gt; DEGENERATE_MODE
                                                        </div>
                                                        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                                                            // Injects unhinged, extreme, and borderline cursed quirks into the pool.
                                                        </div>
                                                    </div>
                                                    <label className="toggle-switch">
                                                        <input
                                                            type="checkbox"
                                                            checked={degenMode}
                                                            onChange={(e) => {
                                                                const checked = e.target.checked;
                                                                setDegenMode(checked);
                                                                setSetting('degen_mode', checked);
                                                                broadcastSettingsSync({ degenMode: checked });
                                                                if (!checked && explicitMode === 0) {
                                                                    setTimeout(() => {
                                                                        setIsLateNightUnlocked(false);
                                                                        setSetting('is_late_night_unlocked', false);
                                                                        broadcastSettingsSync({ isLateNightUnlocked: false, degenMode: false });
                                                                        showHudToast("Turning Late Night Mode off... 🌙");
                                                                    }, 350);
                                                                }
                                                            }}
                                                        />
                                                        <span className="slider"></span>
                                                    </label>
                                                </div>

                                                {/* Strict Image Censor */}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid rgba(181, 51, 255, 0.2)' }}>
                                                    <div>
                                                        <div style={{ fontWeight: 'bold', color: (enableImageCensor && explicitMode === 0 && !degenMode) ? '#00E5FF' : 'rgba(255,255,255,0.5)', fontSize: '10.5px' }}>
                                                            &gt; STRICT_IMAGE_CENSOR
                                                        </div>
                                                        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                                                            // Forcefully shreds explicit Danbooru tags right before rendering.
                                                        </div>
                                                        {(explicitMode > 0 || degenMode) && (
                                                            <div style={{ fontSize: '8.5px', color: '#FF3333', marginTop: '4px' }}>
                                                                [!] Disable Explicit Mode and Degen Mode to enable Strict Image Censor.
                                                            </div>
                                                        )}
                                                    </div>
                                                    <label className="toggle-switch" style={{ opacity: (explicitMode > 0 || degenMode) ? 0.4 : 1, pointerEvents: (explicitMode > 0 || degenMode) ? 'none' : 'auto' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={enableImageCensor && explicitMode === 0 && !degenMode}
                                                            disabled={explicitMode > 0 || degenMode}
                                                            onChange={(e) => {
                                                                const checked = e.target.checked;
                                                                setEnableImageCensor(checked);
                                                                setSetting('enable_image_censor', checked);
                                                                broadcastSettingsSync({ enableImageCensor: checked });
                                                            }}
                                                        />
                                                        <span className="slider"></span>
                                                    </label>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Output Language Selector */}
                                    <div style={{ position: 'relative', marginTop: '4px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                            <div style={{ fontSize: '10px', color: '#00E5FF', fontWeight: 'bold' }}>&gt; OUTPUT_LANGUAGE:</div>
                                            <div style={{ fontSize: '8.5px', color: 'rgba(255,255,255,0.4)' }}>// Type any custom language/dialect</div>
                                        </div>
                                        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                                            <input
                                                type="text"
                                                value={appLanguage}
                                                onChange={e => {
                                                    setAppLanguage(e.target.value);
                                                    setSetting('app_language', e.target.value);
                                                    broadcastSettingsSync({ appLanguage: e.target.value });
                                                }}
                                                onClick={() => setIsLangMenuOpen(true)}
                                                placeholder="Type language..."
                                                style={{ width: '100%', padding: '7px 30px 7px 10px', background: '#050308', border: '1px solid rgba(0, 229, 255, 0.3)', color: '#00e5ff', borderRadius: '4px', fontSize: '10.5px' }}
                                            />
                                            <span
                                                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                                                style={{ position: 'absolute', right: '10px', color: '#00e5ff', cursor: 'pointer', fontSize: '10px' }}
                                            >
                                                {isLangMenuOpen ? '▲' : '▼'}
                                            </span>
                                        </div>
                                        {isLangMenuOpen && (
                                            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: '#120d20', border: '1px solid #00e5ff', borderRadius: '4px', marginTop: '4px', maxHeight: '160px', overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.8)' }}>
                                                {['English', 'French', 'Spanish', 'German', 'Russian', 'Japanese', 'Korean', 'Chinese (Simplified)', 'Italian', 'Portuguese', 'Pirate Speak', 'Shakespearean English', 'UwU Catgirl Speak'].map(lang => (
                                                    <div
                                                        key={lang}
                                                        onClick={() => {
                                                            setAppLanguage(lang);
                                                            setSetting('app_language', lang);
                                                            broadcastSettingsSync({ appLanguage: lang });
                                                            setIsLangMenuOpen(false);
                                                        }}
                                                        style={{
                                                            padding: '6px 10px',
                                                            fontSize: '10px',
                                                            color: appLanguage === lang ? '#00e5ff' : 'rgba(255,255,255,0.7)',
                                                            background: appLanguage === lang ? 'rgba(0, 229, 255, 0.15)' : 'transparent',
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        {lang}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* SECTION 3: CONTENT & GENERATION */}
                        <div style={{ background: '#0B0914', border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '6px', overflow: 'hidden' }}>
                            <div
                                onClick={() => toggleAccordion('content')}
                                style={{ padding: '10px 14px', background: 'rgba(0, 229, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                            >
                                <span style={{ color: '#00e5ff', fontSize: '11px', fontWeight: 'bold' }}>
                                    {settingsAccordion.content ? '▼' : '▶'} 3. CONTENT & GENERATION
                                </span>
                                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)' }}>Species, Traits & Scrubber</span>
                            </div>

                            {settingsAccordion.content && (
                                <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {/* Active Image Generation Model Selector */}
                                    <div style={{ background: 'rgba(255, 16, 122, 0.08)', border: '1px solid rgba(255, 16, 122, 0.3)', borderRadius: '5px', padding: '10px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                                            <div>
                                                <div style={{ fontSize: '10.5px', color: '#ff107a', fontWeight: 'bold' }}>🎨 Image Generation Engine:</div>
                                                <div style={{ fontSize: '8.5px', color: 'rgba(255,255,255,0.5)' }}>Powers portraits, selfies & morphs</div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <button
                                                    onClick={handleToggleSubOnlyImage}
                                                    style={{
                                                        padding: '2px 6px',
                                                        fontSize: '8.5px',
                                                        fontWeight: 'bold',
                                                        borderRadius: '3px',
                                                        cursor: 'pointer',
                                                        background: subOnlyImage ? 'rgba(255, 215, 0, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                                                        border: subOnlyImage ? '1px solid #ffd700' : '1px solid rgba(255, 255, 255, 0.15)',
                                                        color: subOnlyImage ? '#ffd700' : 'rgba(255, 255, 255, 0.6)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}
                                                    title="Toggle to show only NanoGPT subscription-included models"
                                                >
                                                    <span>💎</span>
                                                    <span>{subOnlyImage ? 'SUB ONLY' : 'ALL MODELS'}</span>
                                                </button>
                                                <span style={{ fontSize: '9px', color: '#ff107a', fontWeight: 'bold', background: 'rgba(255,16,122,0.15)', padding: '2px 6px', borderRadius: '3px' }}>
                                                    ACTIVE
                                                </span>
                                            </div>
                                        </div>
                                        <select
                                            value={activeImageModel}
                                            onChange={e => handleSelectImageModel(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '6px 8px',
                                                background: '#050308',
                                                border: '1px solid rgba(255, 16, 122, 0.4)',
                                                borderRadius: '4px',
                                                color: '#ff77aa',
                                                fontSize: '10px',
                                                fontFamily: 'inherit',
                                                outline: 'none'
                                            }}
                                        >
                                            <optgroup label="💎 NanoGPT Subscription Models (Included)">
                                                <option value="step-image-edit-2">Step Image Edit 2 ($0.003/img - Included)</option>
                                                <option value="z-image-turbo">Z Image Turbo ($0.003/img - Included)</option>
                                                <option value="qwen-image">Qwen Image ($0.005/img - Included)</option>
                                                <option value="hidream">Hidream I1 ($0.015/img - Included)</option>
                                                <option value="chroma">Chroma ($0.010/img - Included)</option>
                                            </optgroup>
                                            {!subOnlyImage && (
                                                <>
                                                    <optgroup label="✨ FLUX Family (Flagship Quality)">
                                                        <option value="flux-schnell">FLUX.1 Schnell (Fast Anime & Realistic - $0.003)</option>
                                                        <option value="flux-dev">FLUX.1 Dev (Ultra Masterpiece - $0.015)</option>
                                                        <option value="flux-pro">FLUX.1 Pro (Commercial - $0.030)</option>
                                                        <option value="flux-pro/v1.1-ultra">FLUX 1.1 Pro Ultra (2K - $0.060)</option>
                                                        <option value="flux-2-dev">FLUX 2 Dev ($0.015)</option>
                                                        <option value="flux-2-pro">FLUX 2 Pro ($0.030)</option>
                                                        <option value="flux-realism">FLUX Realism ($0.015)</option>
                                                    </optgroup>
                                                    <optgroup label="🌸 Anime & CivitAI Illustrious">
                                                        <option value="crystal-clear-xl">Zuki Anime ILL (CivitAI 1581052 - $0.005)</option>
                                                        <option value="wai-illustrious-sdxl">WAI Illustrious SDXL ($0.005)</option>
                                                        <option value="persona:376130@2456367">Nova Anime XL ($0.005)</option>
                                                        <option value="aniflatmix-anime">AniFlatMix Anime ($0.005)</option>
                                                        <option value="artiwaifu-diffusion">Juggernaut XL / Waifu ($0.005)</option>
                                                        <option value="nsfw-gen-illustrious">Illustrious Derestricted ($0.005)</option>
                                                    </optgroup>
                                                    <optgroup label="🤖 OpenAI GPT Image">
                                                        <option value="dall-e-3">OpenAI DALL-E 3 ($0.040)</option>
                                                        <option value="dall-e-3-hd">OpenAI DALL-E 3 HD ($0.080)</option>
                                                        <option value="gpt-image-1.5">GPT Image 1.5 ($0.020)</option>
                                                        <option value="gpt-image-1">GPT Image 1 ($0.015)</option>
                                                    </optgroup>
                                                    <optgroup label="📸 Photoreal & SDXL">
                                                        <option value="cyberrealistic-xl">CyberRealistic SDXL ($0.005)</option>
                                                        <option value="realpony-xl">RealVisXL V5.0 ($0.005)</option>
                                                        <option value="stable-diffusion-v35-large">Stable Diffusion 3.5 Large ($0.030)</option>
                                                        <option value="fast-sdxl">Fast SDXL ($0.004)</option>
                                                    </optgroup>
                                                    <optgroup label="⚡ Next-Gen Engines">
                                                        <option value="ideogram/v4/fast">Ideogram V4 Fast ($0.020)</option>
                                                        <option value="krea/v2/large/text-to-image">Krea 2 Large ($0.020)</option>
                                                        <option value="hidream-o1-image">HiDream O1 ($0.015)</option>
                                                        <option value="seedream-v4.5">Seedream 4.5 Doubao ($0.010)</option>
                                                    </optgroup>
                                                </>
                                            )}
                                        </select>
                                    </div>

                                    {/* Species Mixing */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontSize: '10.5px', color: '#fff', fontWeight: 'bold' }}>Species Mixing Mode:</div>
                                            <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)' }}>Hybrid mixes two species; Pureblood enforces strict lineage.</div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button
                                                onClick={() => { setAllowHybrids(true); setSetting('allow_hybrids', true); broadcastSettingsSync({ allowHybrids: true }); }}
                                                style={{
                                                    padding: '4px 8px',
                                                    fontSize: '9px',
                                                    fontWeight: 'bold',
                                                    borderRadius: '3px',
                                                    cursor: 'pointer',
                                                    background: allowHybrids ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
                                                    border: allowHybrids ? '1px solid #00e5ff' : '1px solid rgba(255,255,255,0.1)',
                                                    color: allowHybrids ? '#00e5ff' : 'rgba(255,255,255,0.4)'
                                                }}
                                            >
                                                🧬 HYBRID
                                            </button>
                                            <button
                                                onClick={() => { setAllowHybrids(false); setSetting('allow_hybrids', false); broadcastSettingsSync({ allowHybrids: false }); }}
                                                style={{
                                                    padding: '4px 8px',
                                                    fontSize: '9px',
                                                    fontWeight: 'bold',
                                                    borderRadius: '3px',
                                                    cursor: 'pointer',
                                                    background: !allowHybrids ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
                                                    border: !allowHybrids ? '1px solid #00e5ff' : '1px solid rgba(255,255,255,0.1)',
                                                    color: !allowHybrids ? '#00e5ff' : 'rgba(255,255,255,0.4)'
                                                }}
                                            >
                                                🩸 PUREBLOOD
                                            </button>
                                        </div>
                                    </div>

                                    {/* Detailed Profiles, Naming & Canon Mode */}
                                    {[
                                        { label: 'Allow Theme Mixing', desc: 'Allows cards to combine elements from multiple lore themes', checked: allowThemeMixing, toggle: () => { const next = !allowThemeMixing; setAllowThemeMixing(next); setSetting('allow_theme_mixing', next); broadcastSettingsSync({ allowThemeMixing: next }); } },
                                        { label: 'Detailed Character Profiles', desc: 'Longer backstories, psychological matrices & lore', checked: detailedProfiles, toggle: () => { const next = !detailedProfiles; setDetailedProfiles(next); setSetting('detailed_profiles', next); broadcastSettingsSync({ detailedProfiles: next }); } },
                                        { label: 'Regional & Cultural Naming', desc: 'Varied naming origins & dialect styles', checked: diverseNames, toggle: () => { const next = !diverseNames; setDiverseNames(next); setSetting('diverse_names', next); broadcastSettingsSync({ diverseNames: next }); } },
                                        { label: 'Known Canon Character Mode', desc: 'Established anime, game & pop culture canon characters', checked: isKnownCharacter, toggle: () => { const next = !isKnownCharacter; setIsKnownCharacter(next); setSetting('is_known_character', next); broadcastSettingsSync({ isKnownCharacter: next }); } }
                                    ].map((item, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontSize: '10px', color: '#fff', fontWeight: 'bold' }}>{item.label}</div>
                                                <div style={{ fontSize: '8.5px', color: 'rgba(255,255,255,0.4)' }}>{item.desc}</div>
                                            </div>
                                            <label className="toggle-switch">
                                                <input type="checkbox" checked={item.checked} onChange={item.toggle} />
                                                <span className="slider"></span>
                                            </label>
                                        </div>
                                    ))}

                                    {/* Trait Count Sliders */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#fff', marginBottom: '4px' }}>
                                            <span>Dynamic Traits Count:</span>
                                            <span style={{ color: '#00e5ff' }}>{minTraits} to {maxTraits} Traits</span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <input type="range" min="1" max="4" value={minTraits} onChange={e => setMinTraits(Number(e.target.value))} style={{ flex: 1, accentColor: '#00e5ff' }} />
                                            <input type="range" min="3" max="8" value={maxTraits} onChange={e => setMaxTraits(Number(e.target.value))} style={{ flex: 1, accentColor: '#00e5ff' }} />
                                        </div>
                                    </div>

                                    {/* Global Positive Prefix */}
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                            <div style={{ fontSize: '10px', color: '#00E5FF', fontWeight: 'bold' }}>&gt; GLOBAL_POSITIVE_PREFIX</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span style={{ fontSize: '8.5px', color: 'rgba(255,255,255,0.5)' }}>Local Dream Prefix:</span>
                                                <label className="toggle-switch" style={{ transform: 'scale(0.8)', transformOrigin: 'right center' }}>
                                                    <input type="checkbox" checked={useLocalDreamPrefix} onChange={e => { setUseLocalDreamPrefix(e.target.checked); setSetting('use_local_dream_prefix', e.target.checked); broadcastSettingsSync({ useLocalDreamPrefix: e.target.checked }); }} />
                                                    <span className="slider"></span>
                                                </label>
                                            </div>
                                        </div>
                                        <div style={{ fontSize: '8.5px', color: '#FF3333', marginBottom: '4px' }}>[!] KEEP UNDER 5 TAGS! Long prefixes will delete character features.</div>
                                        <textarea
                                            rows="2"
                                            value={imagePrefix}
                                            disabled={useLocalDreamPrefix}
                                            onChange={e => { setImagePrefix(e.target.value); broadcastSettingsSync({ imagePrefix: e.target.value }); }}
                                            onBlur={() => setSetting('image_prefix', imagePrefix)}
                                            style={{ width: '100%', padding: '6px 8px', background: '#050308', border: '1px solid rgba(0, 229, 255, 0.3)', borderRadius: '4px', color: '#C8E8F0', fontSize: '10px', opacity: useLocalDreamPrefix ? 0.4 : 1 }}
                                        />
                                    </div>

                                    {/* Image Tag Scrubber */}
                                    <div style={{ background: 'rgba(255, 16, 122, 0.03)', border: '1px solid rgba(255, 16, 122, 0.25)', borderRadius: '6px', padding: '10px' }}>
                                        <div style={{ fontSize: '10.5px', color: '#FF107A', fontWeight: 'bold', marginBottom: '2px' }}>&gt; IMAGE_TAG_SCRUBBER</div>
                                        <div style={{ fontSize: '8.5px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>
                                            // Intercepts AI output and SHREDS any tag containing these exact words.
                                        </div>
                                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                            <button onClick={() => handleApplyBannedPreset(['ears', 'tail', 'horns', 'wings', 'slime', 'scales', 'tentacles', 'claws', 'fur', 'monster'])} style={{ padding: '3px 6px', fontSize: '8.5px', background: 'rgba(255,16,122,0.1)', border: '1px solid rgba(255,16,122,0.4)', color: '#FF107A', borderRadius: '3px', cursor: 'pointer' }}>+ NO_MONSTERS</button>
                                            <button onClick={() => handleApplyBannedPreset(['ahegao', 'drooling', 'messy', 'sweat', 'tears', 'heart pupils', 'heavy breathing'])} style={{ padding: '3px 6px', fontSize: '8.5px', background: 'rgba(255,16,122,0.1)', border: '1px solid rgba(255,16,122,0.4)', color: '#FF107A', borderRadius: '3px', cursor: 'pointer' }}>+ NO_DEGEN_FACES</button>
                                            <button onClick={() => handleApplyBannedPreset(['collar', 'leash', 'chain', 'whip', 'blindfold', 'gag', 'piercing'])} style={{ padding: '3px 6px', fontSize: '8.5px', background: 'rgba(255,16,122,0.1)', border: '1px solid rgba(255,16,122,0.4)', color: '#FF107A', borderRadius: '3px', cursor: 'pointer' }}>+ NO_BDSM</button>
                                            <button onClick={() => { setBannedTags(['phone', 'smartphone']); setSetting('banned_tags', ['phone', 'smartphone']); broadcastSettingsSync({ bannedTags: ['phone', 'smartphone'] }); }} style={{ padding: '3px 6px', fontSize: '8.5px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#888', borderRadius: '3px', cursor: 'pointer', marginLeft: 'auto' }}>[ CLEAR_ALL ]</button>
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
                                            {bannedTags.map(tag => {
                                                const isSystem = tag === 'phone' || tag === 'smartphone';
                                                return (
                                                    <span key={tag} style={{ fontSize: '9px', background: isSystem ? 'rgba(0, 229, 255, 0.12)' : 'rgba(255, 51, 51, 0.15)', border: `1px solid ${isSystem ? 'rgba(0, 229, 255, 0.3)' : 'rgba(255, 51, 51, 0.4)'}`, color: isSystem ? '#00e5ff' : '#ff6666', padding: '2px 6px', borderRadius: '3px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                                        {tag}
                                                        <span onClick={() => handleRemoveBannedTag(tag)} style={{ cursor: 'pointer', fontWeight: 'bold' }}>✕</span>
                                                    </span>
                                                );
                                            })}
                                        </div>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <input
                                                type="text"
                                                value={newBannedTag}
                                                onChange={e => setNewBannedTag(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Enter') handleAddBannedTag(e); }}
                                                placeholder="add_banned_tag..."
                                                style={{ flex: 1, padding: '5px 8px', background: '#050308', border: '1px solid rgba(255, 51, 51, 0.3)', borderRadius: '3px', color: '#ff6666', fontSize: '9.5px' }}
                                            />
                                            <button onClick={handleAddBannedTag} style={{ padding: '5px 10px', background: 'rgba(255, 51, 51, 0.2)', border: '1px solid #ff4444', color: '#ff4444', borderRadius: '3px', cursor: 'pointer', fontSize: '9.5px', fontWeight: 'bold' }}>+ Add</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* SECTION 4: INBOX, INTERACTION & MEOW */}
                        <div style={{ background: '#0B0914', border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '6px', overflow: 'hidden' }}>
                            <div
                                onClick={() => toggleAccordion('inbox')}
                                style={{ padding: '10px 14px', background: 'rgba(0, 229, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                            >
                                <span style={{ color: '#00e5ff', fontSize: '11px', fontWeight: 'bold' }}>
                                    {settingsAccordion.inbox ? '▼' : '▶'} 4. INBOX, INTERACTION & M.E.O.W.
                                </span>
                                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)' }}>Obsession, Thirst & Styles</span>
                            </div>

                            {settingsAccordion.inbox && (
                                <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {/* Proactive Obsession Modules */}
                                    <div style={{ border: '1px solid rgba(0, 229, 255, 0.2)', background: 'rgba(0, 229, 255, 0.03)', padding: '10px', borderRadius: '6px' }}>
                                        <div style={{ fontSize: '10.5px', fontWeight: 'bold', color: '#00E5FF', marginBottom: '2px' }}>
                                            &gt; PROACTIVE_OBSESSION_MODULES
                                        </div>
                                        <div style={{ fontSize: '8.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>
                                            // Allows characters to reach out to you independently.
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                            <button
                                                onClick={() => { const next = !proactiveOffline; setProactiveOffline(next); setSetting('proactive_offline', next); broadcastSettingsSync({ proactiveOffline: next }); }}
                                                style={{
                                                    padding: '8px 4px', fontSize: '9.5px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer',
                                                    border: proactiveOffline ? '1px solid #00E5FF' : '1px solid rgba(0, 229, 255, 0.2)',
                                                    color: proactiveOffline ? '#00E5FF' : 'rgba(0, 229, 255, 0.4)',
                                                    background: proactiveOffline ? 'rgba(0, 229, 255, 0.15)' : 'transparent',
                                                    boxShadow: proactiveOffline ? '0 0 8px rgba(0,229,255,0.2)' : 'none'
                                                }}
                                            >
                                                📱 OFFLINE_STALKER
                                            </button>
                                            <button
                                                onClick={() => { const next = !proactiveIdle; setProactiveIdle(next); setSetting('proactive_idle', next); broadcastSettingsSync({ proactiveIdle: next }); }}
                                                style={{
                                                    padding: '8px 4px', fontSize: '9.5px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer',
                                                    border: proactiveIdle ? '1px solid #00E5FF' : '1px solid rgba(0, 229, 255, 0.2)',
                                                    color: proactiveIdle ? '#00E5FF' : 'rgba(0, 229, 255, 0.4)',
                                                    background: proactiveIdle ? 'rgba(0, 229, 255, 0.15)' : 'transparent',
                                                    boxShadow: proactiveIdle ? '0 0 8px rgba(0,229,255,0.2)' : 'none'
                                                }}
                                            >
                                                👀 IN_APP_IDLE
                                            </button>
                                            <button
                                                onClick={() => { const next = !proactiveFavoritesOnly; setProactiveFavoritesOnly(next); setSetting('proactive_favorites_only', next); broadcastSettingsSync({ proactiveFavoritesOnly: next }); }}
                                                style={{
                                                    gridColumn: '1 / -1',
                                                    padding: '8px 4px', fontSize: '9.5px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer',
                                                    border: proactiveFavoritesOnly ? '1px solid #FFD700' : '1px solid rgba(255, 215, 0, 0.2)',
                                                    color: proactiveFavoritesOnly ? '#FFD700' : 'rgba(255, 215, 0, 0.4)',
                                                    background: proactiveFavoritesOnly ? 'rgba(255, 215, 0, 0.15)' : 'transparent',
                                                    boxShadow: proactiveFavoritesOnly ? '0 0 8px rgba(255,215,0,0.2)' : 'none',
                                                    opacity: (proactiveOffline || proactiveIdle) ? 1 : 0.4
                                                }}
                                            >
                                                ★ FAVORITES_ONLY
                                            </button>
                                        </div>
                                    </div>

                                    {/* Selfie Autonomy & Proactive Photos */}
                                    {[
                                        { label: 'Selfie Autonomy', desc: 'Allows characters to refuse selfie requests based on affection', checked: enableSelfieAutonomy, toggle: () => { const next = !enableSelfieAutonomy; setEnableSelfieAutonomy(next); setSetting('enable_selfie_autonomy', next); broadcastSettingsSync({ enableSelfieAutonomy: next }); } },
                                        { label: 'Proactive Photos', desc: 'Characters spontaneously send surprise selfie photos in chat', checked: enableProactiveSelfies, toggle: () => { const next = !enableProactiveSelfies; setEnableProactiveSelfies(next); setSetting('enable_proactive_selfies', next); broadcastSettingsSync({ enableProactiveSelfies: next }); } }
                                    ].map((item, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontSize: '10px', color: '#fff', fontWeight: 'bold' }}>{item.label}</div>
                                                <div style={{ fontSize: '8.5px', color: 'rgba(255,255,255,0.4)' }}>{item.desc}</div>
                                            </div>
                                            <label className="toggle-switch">
                                                <input type="checkbox" checked={item.checked} onChange={item.toggle} />
                                                <span className="slider"></span>
                                            </label>
                                        </div>
                                    ))}

                                    {/* Glowing M.E.O.W. Command Module */}
                                    <div style={{ border: enableMeowEngine ? '1px solid #00FF41' : '1px solid rgba(0, 229, 255, 0.25)', background: enableMeowEngine ? 'rgba(0, 255, 65, 0.05)' : 'rgba(0, 229, 255, 0.02)', padding: '12px', borderRadius: '6px', boxShadow: enableMeowEngine ? '0 0 12px rgba(0,255,65,0.1)' : 'none' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <div style={{ fontWeight: 'bold', color: enableMeowEngine ? '#00FF41' : '#00E5FF', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <span>🐈‍⬛</span> &gt; M.E.O.W._ENGINE
                                            </div>
                                            <span style={{ fontSize: '8.5px', padding: '2px 6px', borderRadius: '3px', background: enableMeowEngine ? 'rgba(0,255,65,0.15)' : 'rgba(0,229,255,0.1)', color: enableMeowEngine ? '#00FF41' : '#00E5FF', fontWeight: 'bold' }}>
                                                {enableMeowEngine ? 'ONLINE' : 'OFFLINE'}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '9.5px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.4, marginBottom: '10px' }}>
                                            Matrix Environment & Occupational Workflow. Activates 7-day schedules 📅, live location tracking 📍, and dynamic living wardrobe 👗.
                                        </div>
                                        <button
                                            onClick={() => { const next = !enableMeowEngine; setEnableMeowEngine(next); setSetting('enable_meow_engine', next); broadcastSettingsSync({ enableMeowEngine: next }); showHudToast(next ? 'M.E.O.W. Engine Activated! 🐾' : 'M.E.O.W. Engine in Standby.'); }}
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                borderRadius: '4px',
                                                fontSize: '11px',
                                                fontWeight: 'bold',
                                                cursor: 'pointer',
                                                border: enableMeowEngine ? '1px solid #00FF41' : '1px solid rgba(0,229,255,0.3)',
                                                color: enableMeowEngine ? '#000' : '#00E5FF',
                                                background: enableMeowEngine ? '#00FF41' : 'rgba(0,229,255,0.1)',
                                                boxShadow: enableMeowEngine ? '0 0 12px rgba(0,255,65,0.3)' : 'none'
                                            }}
                                        >
                                            {enableMeowEngine ? '> SYSTEM_ACTIVE <' : '> INITIALIZE_M.E.O.W. <'}
                                        </button>
                                    </div>

                                    {/* Thirst Level */}
                                    <div>
                                        <div style={{ fontWeight: 'bold', color: '#00E5FF', fontSize: '10.5px', marginBottom: '2px' }}>&gt; INBOX_THIRST_LEVEL</div>
                                        <div style={{ fontSize: '8.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>// Controls how desperately rejected matches slide into your DMs.</div>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            {[{ val: 0, label: 'GHOST' }, { val: 0.15, label: 'CHILL' }, { val: 0.4, label: 'THIRSTY' }, { val: 0.8, label: 'STALKER' }].map(t => (
                                                <button
                                                    key={t.val}
                                                    onClick={() => { setMsgThirst(t.val); setSetting('msg_thirst', t.val); broadcastSettingsSync({ msgThirst: t.val }); }}
                                                    style={{
                                                        flex: 1, padding: '8px 2px', borderRadius: '4px', fontSize: '9.5px', fontWeight: 'bold', cursor: 'pointer',
                                                        border: msgThirst === t.val ? '1px solid #00E5FF' : '1px solid rgba(0, 229, 255, 0.2)',
                                                        color: msgThirst === t.val ? '#00E5FF' : 'rgba(0, 229, 255, 0.4)',
                                                        background: msgThirst === t.val ? 'rgba(0, 229, 255, 0.15)' : 'transparent',
                                                        boxShadow: msgThirst === t.val ? '0 0 8px rgba(0,229,255,0.2)' : 'none'
                                                    }}
                                                >
                                                    {t.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Neural Sync Speed */}
                                    <div>
                                        <div style={{ fontWeight: 'bold', color: '#00E5FF', fontSize: '10.5px', marginBottom: '2px' }}>&gt; NEURAL_SYNC_SPEED</div>
                                        <div style={{ fontSize: '8.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>// Arcade is fast progression. Realistic takes days to build trust.</div>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            {[
                                                { id: 'gamified', label: 'ARCADE (Fast)', color: '#00E5FF' },
                                                { id: 'balanced', label: 'BALANCED', color: '#B533FF' },
                                                { id: 'realistic', label: 'REALISTIC', color: '#FF107A' }
                                            ].map(s => (
                                                <button
                                                    key={s.id}
                                                    onClick={() => { setSyncSpeed(s.id); setSetting('sync_speed', s.id); broadcastSettingsSync({ syncSpeed: s.id }); }}
                                                    style={{
                                                        flex: 1, padding: '8px 2px', borderRadius: '4px', fontSize: '9.5px', fontWeight: 'bold', cursor: 'pointer',
                                                        border: syncSpeed === s.id ? `1px solid ${s.color}` : '1px solid rgba(255,255,255,0.1)',
                                                        color: syncSpeed === s.id ? s.color : 'rgba(255,255,255,0.4)',
                                                        background: syncSpeed === s.id ? `${s.color}20` : 'transparent',
                                                        boxShadow: syncSpeed === s.id ? `0 0 8px ${s.color}30` : 'none'
                                                    }}
                                                >
                                                    {s.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Chat Style Mode */}
                                    <div>
                                        <div style={{ fontSize: '10px', color: '#00E5FF', fontWeight: 'bold', marginBottom: '4px' }}>1-ON-1 CHAT STYLE:</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                                            {[
                                                { id: 'sms', label: 'SMS Short' },
                                                { id: 'sms_long', label: 'SMS Long' },
                                                { id: 'rp_short', label: 'RP Short' },
                                                { id: 'rp_long', label: 'RP Long' }
                                            ].map(m => (
                                                <button
                                                    key={m.id}
                                                    onClick={() => { setChatStyleMode(m.id); setSetting('chat_style_mode', m.id); broadcastSettingsSync({ chatStyleMode: m.id }); }}
                                                    style={{
                                                        padding: '7px 4px', fontSize: '9.5px', fontWeight: 'bold', borderRadius: '3px', cursor: 'pointer',
                                                        border: chatStyleMode === m.id ? '1px solid #00e5ff' : '1px solid rgba(255,255,255,0.1)',
                                                        background: chatStyleMode === m.id ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
                                                        color: chatStyleMode === m.id ? '#00e5ff' : 'rgba(255,255,255,0.5)'
                                                    }}
                                                >
                                                    {m.label}
                                                </button>
                                            ))}
                                        </div>

                                        <div style={{ fontSize: '10px', color: '#B533FF', fontWeight: 'bold', marginBottom: '4px' }}>GROUP CHAT STYLE:</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                                            {[
                                                { id: 'dynamic_sms', label: 'Dynamic SMS' },
                                                { id: 'dynamic_rp', label: 'Dynamic RP' }
                                            ].map(m => (
                                                <button
                                                    key={m.id}
                                                    onClick={() => { setGroupChatStyleMode(m.id); setSetting('group_chat_style_mode', m.id); broadcastSettingsSync({ groupChatStyleMode: m.id }); }}
                                                    style={{
                                                        padding: '7px 4px', fontSize: '9.5px', fontWeight: 'bold', borderRadius: '3px', cursor: 'pointer',
                                                        border: groupChatStyleMode === m.id ? '1px solid #B533FF' : '1px solid rgba(181, 51, 255, 0.2)',
                                                        background: groupChatStyleMode === m.id ? 'rgba(181, 51, 255, 0.2)' : 'transparent',
                                                        color: groupChatStyleMode === m.id ? '#d685ff' : 'rgba(181, 51, 255, 0.5)'
                                                    }}
                                                >
                                                    {m.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Roleplay Text Color */}
                                    <div>
                                        <div style={{ fontSize: '10px', color: '#00E5FF', fontWeight: 'bold', marginBottom: '2px' }}>&gt; ROLEPLAY_TEXT_COLOR:</div>
                                        <div style={{ fontSize: '8.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>// Color of italicized *action text* in chat.</div>
                                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                            {[
                                                { id: '#B533FF', label: 'Purple' },
                                                { id: '#A0A0A0', label: 'Gray' },
                                                { id: '#EBE3D6', label: 'White' },
                                                { id: '#00E5FF', label: 'Cyan' },
                                                { id: '#FF107A', label: 'Pink' },
                                                { id: '#00FF41', label: 'Green' },
                                                { id: '#FFD700', label: 'Gold' }
                                            ].map(color => (
                                                <button
                                                    key={color.id}
                                                    onClick={() => {
                                                        setActionTextColor(color.id);
                                                        setSetting('action_text_color', color.id);
                                                        broadcastSettingsSync({ actionTextColor: color.id });
                                                    }}
                                                    style={{
                                                        flex: 1, minWidth: '40px', padding: '6px 2px', borderRadius: '3px', fontSize: '9.5px', fontWeight: 'bold', cursor: 'pointer',
                                                        border: actionTextColor === color.id ? `1px solid ${color.id}` : '1px solid rgba(255,255,255,0.1)',
                                                        background: actionTextColor === color.id ? `${color.id}25` : 'transparent',
                                                        color: actionTextColor === color.id ? color.id : 'rgba(255,255,255,0.4)',
                                                        boxShadow: actionTextColor === color.id ? `0 0 8px ${color.id}40` : 'none'
                                                    }}
                                                >
                                                    {color.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* SECTION 5: VISUALS & PERFORMANCE */}
                        <div style={{ background: '#0B0914', border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '6px', overflow: 'hidden' }}>
                            <div
                                onClick={() => toggleAccordion('visuals')}
                                style={{ padding: '10px 14px', background: 'rgba(0, 229, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                            >
                                <span style={{ color: '#00e5ff', fontSize: '11px', fontWeight: 'bold' }}>
                                    {settingsAccordion.visuals ? '▼' : '▶'} 5. VISUALS & PERFORMANCE
                                </span>
                                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)' }}>Atmosphere & Scanlines</span>
                            </div>

                            {settingsAccordion.visuals && (
                                <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {[
                                        { label: 'Extended Match History', desc: 'Shows all past swipes in history list instead of capping at 20', checked: showFullHistory, toggle: () => { const next = !showFullHistory; setShowFullHistory(next); setSetting('show_full_history', next); broadcastSettingsSync({ showFullHistory: next }); } },
                                        { label: 'Cinematic Atmosphere & Weather FX', desc: 'Dynamic rain, particles, and neon glow. Performance heavy!', checked: enableAtmosphere, toggle: () => { const next = !enableAtmosphere; setEnableAtmosphere(next); setSetting('enable_atmosphere', next); broadcastSettingsSync({ enableAtmosphere: next }); } },
                                        { label: 'Animated Chat Backgrounds', desc: 'Real-time backdrop shaders for character environments', checked: cinematicChatBg, toggle: () => { const next = !cinematicChatBg; setCinematicChatBg(next); setSetting('cinematic_chat_bg', next); broadcastSettingsSync({ cinematicChatBg: next }); } },
                                        { label: 'Cyberpunk Scanlines & CRT FX', desc: 'Retro monitor scanline sweeps across cards', checked: enableScanlines, toggle: () => { const next = !enableScanlines; setEnableScanlines(next); setSetting('enable_scanlines', next); broadcastSettingsSync({ enableScanlines: next }); } },
                                        { label: 'Text Only Mode (Silhouette)', desc: 'Skip image generation on initial swipe to save compute', checked: silhouetteMode, toggle: () => { const next = !silhouetteMode; setSilhouetteMode(next); setSetting('silhouette_mode', next); broadcastSettingsSync({ silhouetteMode: next }); } },
                                        { label: 'Auto Queue Matches', desc: 'Pre-generates the next swipe card in background', checked: autoQueue, toggle: () => { const next = !autoQueue; setAutoQueue(next); setSetting('auto_queue', next); broadcastSettingsSync({ autoQueue: next }); } },
                                        { label: 'Test Drive Mode', desc: 'Matches go to Pending first. Chat before saving permanently', checked: testDriveMode, toggle: () => { const next = !testDriveMode; setTestDriveMode(next); setSetting('test_drive_mode', next); broadcastSettingsSync({ testDriveMode: next }); } },
                                        { label: 'Pause Between Swipes', desc: 'Inserts holding card between matches to check settings', checked: pauseBetweenSwipes, toggle: () => { const next = !pauseBetweenSwipes; setPauseBetweenSwipes(next); setSetting('pause_between_swipes', next); broadcastSettingsSync({ pauseBetweenSwipes: next }); } }
                                    ].map((item, idx) => (
                                        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontSize: '10px', color: '#fff', fontWeight: 'bold' }}>{item.label}</div>
                                                <div style={{ fontSize: '8.5px', color: 'rgba(255,255,255,0.4)' }}>{item.desc}</div>
                                            </div>
                                            <label className="toggle-switch">
                                                <input type="checkbox" checked={item.checked} onChange={item.toggle} />
                                                <span className="slider"></span>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* SECTION 6: SYSTEM, AUDIO & ENGINE */}
                        <div style={{ background: '#0B0914', border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '6px', overflow: 'hidden' }}>
                            <div
                                onClick={() => toggleAccordion('system')}
                                style={{ padding: '10px 14px', background: 'rgba(0, 229, 255, 0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                            >
                                <span style={{ color: '#00e5ff', fontSize: '11px', fontWeight: 'bold' }}>
                                    {settingsAccordion.system ? '▼' : '▶'} 6. SYSTEM, AUDIO & ENGINE
                                </span>
                                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.5)' }}>Tokens, Audio & Directives</span>
                            </div>

                            {settingsAccordion.system && (
                                <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    {/* Startup Screen */}
                                    <div>
                                        <div style={{ fontSize: '10.5px', color: '#00E5FF', fontWeight: 'bold', marginBottom: '2px' }}>&gt; STARTUP_SCREEN:</div>
                                        <div style={{ fontSize: '8.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>// Choose initial screen when loading GachaSwipe.</div>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            {[
                                                { id: 'home', label: '> HOME_SCREEN' },
                                                { id: 'chat', label: '> CHAT_SCREEN' }
                                            ].map(s => (
                                                <button
                                                    key={s.id}
                                                    onClick={() => { setStartupScreen(s.id); setSetting('startup_screen', s.id); broadcastSettingsSync({ startupScreen: s.id }); }}
                                                    style={{
                                                        flex: 1, padding: '8px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer',
                                                        border: startupScreen === s.id ? '1px solid #00e5ff' : '1px solid rgba(0, 229, 255, 0.2)',
                                                        background: startupScreen === s.id ? 'rgba(0, 229, 255, 0.2)' : 'transparent',
                                                        color: startupScreen === s.id ? '#00e5ff' : 'rgba(0, 229, 255, 0.4)'
                                                    }}
                                                >
                                                    {s.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Auto Update Host Cards */}
                                    <div style={{ border: '1px solid rgba(0, 229, 255, 0.2)', background: 'rgba(0, 229, 255, 0.03)', padding: '10px', borderRadius: '6px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                            <div>
                                                <div style={{ fontSize: '10.5px', fontWeight: 'bold', color: '#00E5FF' }}>&gt; AUTO_UPDATE_HOST_CARDS</div>
                                                <div style={{ fontSize: '8.5px', color: 'rgba(255,255,255,0.4)' }}>// Sync neural states and evolved traits back into character cards.</div>
                                            </div>
                                            <label className="toggle-switch">
                                                <input type="checkbox" checked={autoUpdateLaylaCards} onChange={e => { setAutoUpdateLaylaCards(e.target.checked); setSetting('auto_update_layla_cards', e.target.checked); broadcastSettingsSync({ autoUpdateLaylaCards: e.target.checked }); }} />
                                                <span className="slider"></span>
                                            </label>
                                        </div>
                                        <div style={{ fontSize: '8.5px', color: '#FFD700', marginTop: '4px' }}>
                                            💡 TIP: Updates sync on tier shifts, psychological mutations, and schedule generations.
                                        </div>
                                    </div>

                                    {/* Token Efficiency Matrix */}
                                    <div style={{ border: '1px solid rgba(0, 229, 255, 0.25)', background: 'rgba(0, 229, 255, 0.03)', padding: '12px', borderRadius: '6px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#00E5FF' }}>&gt; TOKEN_EFFICIENCY_MATRIX</div>
                                            <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '3px', background: 'rgba(0,229,255,0.15)', color: '#00e5ff', fontWeight: 'bold' }}>
                                                {tokenPreset.toUpperCase()}
                                            </span>
                                        </div>

                                        {/* 3 Universal Presets */}
                                        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
                                            {[
                                                { id: 'eco', label: '⚡ ECO_SAVER', c1: 20, cg: 20, p1: 'condensed', pG: 'condensed' },
                                                { id: 'balanced', label: '⚖️ BALANCED', c1: 50, cg: 40, p1: 'truncated', pG: 'condensed' },
                                                { id: 'full', label: '🧠 DEEP_LORE', c1: 100, cg: 100, p1: 'full', pG: 'full' }
                                            ].map(p => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => {
                                                        setTokenPreset(p.id);
                                                        setChatContextLimit(p.c1);
                                                        setGroupChatContextLimit(p.cg);
                                                        setChatProfileDetail(p.p1);
                                                        setGroupProfileDetail(p.pG);
                                                        setSetting('token_preset', p.id);
                                                        setSetting('chat_context_limit', p.c1);
                                                        setSetting('group_chat_context_limit', p.cg);
                                                        setSetting('chat_profile_detail', p.p1);
                                                        setSetting('group_profile_detail', p.pG);
                                                        broadcastSettingsSync({ tokenPreset: p.id, chatContextLimit: p.c1, groupChatContextLimit: p.cg, chatProfileDetail: p.p1, groupProfileDetail: p.pG });
                                                        showHudToast(`Applied ${p.label}! 🐾`);
                                                    }}
                                                    style={{
                                                        flex: 1, padding: '8px 4px', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold', cursor: 'pointer',
                                                        border: tokenPreset === p.id ? '1px solid #00E5FF' : '1px solid rgba(0, 229, 255, 0.2)',
                                                        color: tokenPreset === p.id ? '#00E5FF' : 'rgba(0, 229, 255, 0.4)',
                                                        background: tokenPreset === p.id ? 'rgba(0, 229, 255, 0.15)' : 'transparent',
                                                        boxShadow: tokenPreset === p.id ? '0 0 8px rgba(0,229,255,0.2)' : 'none'
                                                    }}
                                                >
                                                    {p.label}
                                                </button>
                                            ))}
                                        </div>

                                        {/* 1-on-1 Context Limit */}
                                        <div style={{ marginBottom: '10px' }}>
                                            <div style={{ fontSize: '10px', color: '#00E5FF', fontWeight: 'bold', marginBottom: '4px' }}>
                                                1-ON-1 CONTEXT LIMIT [{chatContextLimit} MSGS]:
                                            </div>
                                            <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                                                {[10, 20, 50, 100].map(val => (
                                                    <button
                                                        key={val}
                                                        onClick={() => { setChatContextLimit(val); setTokenPreset('custom'); setSetting('chat_context_limit', val); broadcastSettingsSync({ chatContextLimit: val }); }}
                                                        style={{
                                                            flex: 1, padding: '6px 2px', borderRadius: '3px', fontSize: '9.5px', fontWeight: 'bold', cursor: 'pointer',
                                                            border: chatContextLimit === val ? '1px solid #00e5ff' : '1px solid rgba(255,255,255,0.1)',
                                                            background: chatContextLimit === val ? 'rgba(0,229,255,0.2)' : 'transparent',
                                                            color: chatContextLimit === val ? '#00e5ff' : 'rgba(255,255,255,0.5)'
                                                        }}
                                                    >
                                                        {val}
                                                    </button>
                                                ))}
                                            </div>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                {['condensed', 'truncated', 'full'].map(d => (
                                                    <button
                                                        key={d}
                                                        onClick={() => { setChatProfileDetail(d); setSetting('chat_profile_detail', d); broadcastSettingsSync({ chatProfileDetail: d }); }}
                                                        style={{
                                                            flex: 1, padding: '4px', borderRadius: '3px', fontSize: '8.5px', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase',
                                                            border: chatProfileDetail === d ? '1px solid #00e5ff' : '1px solid rgba(255,255,255,0.1)',
                                                            background: chatProfileDetail === d ? 'rgba(0,229,255,0.15)' : 'transparent',
                                                            color: chatProfileDetail === d ? '#00e5ff' : 'rgba(255,255,255,0.4)'
                                                        }}
                                                    >
                                                        Profile: {d}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Group Chat Context Limit */}
                                        <div style={{ paddingTop: '8px', borderTop: '1px solid rgba(0, 229, 255, 0.15)' }}>
                                            <div style={{ fontSize: '10px', color: '#B533FF', fontWeight: 'bold', marginBottom: '4px' }}>
                                                GROUP CHAT CONTEXT LIMIT [{groupChatContextLimit} MSGS]:
                                            </div>
                                            <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                                                {[15, 30, 50, 100].map(val => (
                                                    <button
                                                        key={val}
                                                        onClick={() => { setGroupChatContextLimit(val); setTokenPreset('custom'); setSetting('group_chat_context_limit', val); broadcastSettingsSync({ groupChatContextLimit: val }); }}
                                                        style={{
                                                            flex: 1, padding: '6px 2px', borderRadius: '3px', fontSize: '9.5px', fontWeight: 'bold', cursor: 'pointer',
                                                            border: groupChatContextLimit === val ? '1px solid #B533FF' : '1px solid rgba(255,255,255,0.1)',
                                                            background: groupChatContextLimit === val ? 'rgba(181,51,255,0.2)' : 'transparent',
                                                            color: groupChatContextLimit === val ? '#d685ff' : 'rgba(255,255,255,0.5)'
                                                        }}
                                                    >
                                                        {val}
                                                    </button>
                                                ))}
                                            </div>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                {['condensed', 'truncated', 'full'].map(d => (
                                                    <button
                                                        key={d}
                                                        onClick={() => { setGroupProfileDetail(d); setSetting('group_profile_detail', d); broadcastSettingsSync({ groupProfileDetail: d }); }}
                                                        style={{
                                                            flex: 1, padding: '4px', borderRadius: '3px', fontSize: '8.5px', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase',
                                                            border: groupProfileDetail === d ? '1px solid #B533FF' : '1px solid rgba(255,255,255,0.1)',
                                                            background: groupProfileDetail === d ? 'rgba(181,51,255,0.15)' : 'transparent',
                                                            color: groupProfileDetail === d ? '#d685ff' : 'rgba(255,255,255,0.4)'
                                                        }}
                                                    >
                                                        Group Lore: {d}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* P.U.R.R. Audio Matrix (TTS Disabled by default) */}
                                    <div style={{ border: '1px solid rgba(0, 255, 65, 0.2)', background: 'rgba(0, 255, 65, 0.02)', padding: '12px', borderRadius: '6px' }}>
                                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#00FF41', marginBottom: '8px' }}>
                                            &gt; P.U.R.R._AUDIO_MATRIX (VOICE SYNTHESIS)
                                        </div>

                                        {[
                                            { label: 'Standard Chat Voice (1-on-1)', desc: 'Synthesize audio voice notes for 1-on-1 messages (Default OFF)', checked: enableTtsStandard, toggle: () => { const next = !enableTtsStandard; setEnableTtsStandard(next); setSetting('enable_tts_standard', next); broadcastSettingsSync({ enableTtsStandard: next }); } },
                                            { label: 'Group Chat Voice', desc: 'Synthesize audio notes for group participants (Default OFF)', checked: enableTtsGroup, toggle: () => { const next = !enableTtsGroup; setEnableTtsGroup(next); setSetting('enable_tts_group', next); broadcastSettingsSync({ enableTtsGroup: next }); } },
                                            { label: 'Auto-Play Voice Notes', desc: 'Immediately play audio note once synthesis finishes', checked: ttsAutoPlay, toggle: () => { const next = !ttsAutoPlay; setTtsAutoPlay(next); setSetting('tts_auto_play', next); broadcastSettingsSync({ ttsAutoPlay: next }); } }
                                        ].map((item, idx) => (
                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                <div>
                                                    <div style={{ fontSize: '10px', color: '#fff', fontWeight: 'bold' }}>{item.label}</div>
                                                    <div style={{ fontSize: '8.5px', color: 'rgba(255,255,255,0.4)' }}>{item.desc}</div>
                                                </div>
                                                <label className="toggle-switch">
                                                    <input type="checkbox" checked={item.checked} onChange={item.toggle} />
                                                    <span className="slider"></span>
                                                </label>
                                            </div>
                                        ))}

                                        <div style={{ marginTop: '8px' }}>
                                            <div style={{ fontSize: '9.5px', color: '#00FF41', fontWeight: 'bold', marginBottom: '4px' }}>LOCAL CACHE LIMIT:</div>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                {[
                                                    { val: 5, label: '5 (Scarce)' },
                                                    { val: 15, label: '15 (Standard)' },
                                                    { val: 40, label: '40 (Archive)' },
                                                    { val: 0, label: 'Unlimited' }
                                                ].map(m => (
                                                    <button
                                                        key={m.val}
                                                        onClick={() => { setTtsCacheLimit(m.val); setSetting('tts_cache_limit', m.val); broadcastSettingsSync({ ttsCacheLimit: m.val }); }}
                                                        style={{
                                                            flex: 1, padding: '5px 2px', borderRadius: '3px', fontSize: '9px', fontWeight: 'bold', cursor: 'pointer',
                                                            border: ttsCacheLimit === m.val ? '1px solid #00FF41' : '1px solid rgba(255,255,255,0.1)',
                                                            background: ttsCacheLimit === m.val ? 'rgba(0,255,65,0.15)' : 'transparent',
                                                            color: ttsCacheLimit === m.val ? '#00FF41' : 'rgba(255,255,255,0.4)'
                                                        }}
                                                    >
                                                        {m.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Group Dynamics */}
                                    <div style={{ border: '1px solid rgba(181, 51, 255, 0.2)', background: 'rgba(181, 51, 255, 0.02)', padding: '12px', borderRadius: '6px' }}>
                                        <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#B533FF', marginBottom: '8px' }}>
                                            &gt; GROUP_DYNAMICS
                                        </div>
                                        {[
                                            { label: 'Background Spooling', desc: 'Continue processing message queue when navigating away', checked: backgroundSpooling, toggle: () => { const next = !backgroundSpooling; setBackgroundSpooling(next); setSetting('background_spooling', next); broadcastSettingsSync({ backgroundSpooling: next }); } },
                                            { label: 'Auto Pause Groups', desc: 'Halt endless group generation until Master speaks', checked: groupChatPause, toggle: () => { const next = !groupChatPause; setGroupChatPause(next); setSetting('group_chat_pause', next); broadcastSettingsSync({ groupChatPause: next }); } }
                                        ].map((item, idx) => (
                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                                <div>
                                                    <div style={{ fontSize: '10px', color: '#fff', fontWeight: 'bold' }}>{item.label}</div>
                                                    <div style={{ fontSize: '8.5px', color: 'rgba(255,255,255,0.4)' }}>{item.desc}</div>
                                                </div>
                                                <label className="toggle-switch">
                                                    <input type="checkbox" checked={item.checked} onChange={item.toggle} />
                                                    <span className="slider"></span>
                                                </label>
                                            </div>
                                        ))}
                                        <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                                            {['hyper', 'chill', 'relaxed'].map(flow => (
                                                <button
                                                    key={flow}
                                                    onClick={() => { setGroupChatFlow(flow); setSetting('group_chat_flow', flow); broadcastSettingsSync({ groupChatFlow: flow }); }}
                                                    style={{
                                                        flex: 1, padding: '7px 4px', borderRadius: '3px', fontSize: '9.5px', fontWeight: 'bold', cursor: 'pointer', textTransform: 'uppercase',
                                                        border: groupChatFlow === flow ? '1px solid #B533FF' : '1px solid rgba(181, 51, 255, 0.2)',
                                                        background: groupChatFlow === flow ? 'rgba(181, 51, 255, 0.2)' : 'transparent',
                                                        color: groupChatFlow === flow ? '#d685ff' : 'rgba(181, 51, 255, 0.4)'
                                                    }}
                                                >
                                                    Flow: {flow}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Advanced Directives Overrides */}
                                    <div style={{ border: '1px solid rgba(181, 51, 255, 0.3)', background: 'rgba(181, 51, 255, 0.03)', padding: '12px', borderRadius: '6px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#B533FF' }}>
                                                &gt; SYSTEM_DIRECTIVE_OVERRIDES
                                            </div>
                                            <label className="toggle-switch">
                                                <input type="checkbox" checked={enableSystemDirectives} onChange={e => { setEnableSystemDirectives(e.target.checked); setSetting('enable_system_directives', e.target.checked); broadcastSettingsSync({ enableSystemDirectives: e.target.checked }); }} />
                                                <span className="slider"></span>
                                            </label>
                                        </div>
                                        <div style={{ fontSize: '8.5px', color: '#FF4444', marginBottom: '8px' }}>
                                            [!] WARNING: Custom directives can alter tone or formatting. Disable if issues arise.
                                        </div>

                                        {enableSystemDirectives && (
                                            <div>
                                                <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '8px' }}>
                                                    {[
                                                        { id: 'global', label: 'GLOBAL' },
                                                        { id: 'chat', label: '1-ON-1' },
                                                        { id: 'group', label: 'GROUP' },
                                                        { id: 'gen', label: 'GEN' },
                                                        { id: 'gachafans', label: 'GACHAFANS' },
                                                        { id: 'obsession', label: 'OBSESSION' }
                                                    ].map(tab => (
                                                        <button
                                                            key={tab.id}
                                                            onClick={() => setActiveDirectiveTab(tab.id)}
                                                            style={{
                                                                flexShrink: 0, padding: '5px 8px', borderRadius: '3px', fontSize: '9px', fontWeight: 'bold', cursor: 'pointer',
                                                                border: activeDirectiveTab === tab.id ? '1px solid #B533FF' : '1px solid rgba(181,51,255,0.2)',
                                                                background: activeDirectiveTab === tab.id ? 'rgba(181,51,255,0.2)' : 'transparent',
                                                                color: activeDirectiveTab === tab.id ? '#d685ff' : 'rgba(181,51,255,0.5)'
                                                            }}
                                                        >
                                                            {tab.label}
                                                        </button>
                                                    ))}
                                                </div>

                                                <textarea
                                                    rows="3"
                                                    value={systemDirectives[activeDirectiveTab] || ''}
                                                    onChange={e => {
                                                        const updated = { ...systemDirectives, [activeDirectiveTab]: e.target.value };
                                                        setSystemDirectives(updated);
                                                        setSetting('system_directives', updated);
                                                        broadcastSettingsSync({ systemDirectives: updated });
                                                    }}
                                                    placeholder={`Enter custom system directive for ${activeDirectiveTab.toUpperCase()}...`}
                                                    style={{ width: '100%', padding: '6px 8px', background: '#050308', border: '1px solid rgba(181, 51, 255, 0.4)', borderRadius: '4px', color: '#EBE3D6', fontSize: '10px', resize: 'vertical', marginBottom: '6px' }}
                                                />

                                                <button
                                                    onClick={() => {
                                                        const cleared = { global: '', chat: '', group: '', gen: '', gachafans: '', obsession: '' };
                                                        setSystemDirectives(cleared);
                                                        setSetting('system_directives', cleared);
                                                        broadcastSettingsSync({ systemDirectives: cleared });
                                                        showHudToast('System directives cleared! ✨');
                                                    }}
                                                    style={{ width: '100%', padding: '6px', background: 'rgba(255,51,51,0.08)', border: '1px dashed rgba(255,51,51,0.4)', color: '#FF6666', borderRadius: '3px', fontSize: '9px', fontWeight: 'bold', cursor: 'pointer' }}
                                                >
                                                    [ CLEAR_ALL_DIRECTIVES ]
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Save Actions & Reset Actions */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={handleSaveAllSettings}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        background: 'rgba(0, 255, 157, 0.18)',
                                        border: '1px solid #00ff9d',
                                        color: '#00ff9d',
                                        fontSize: '11px',
                                        fontWeight: 900,
                                        borderRadius: '4px',
                                        cursor: 'pointer',
                                        textTransform: 'uppercase',
                                        boxShadow: '0 0 12px rgba(0, 255, 157, 0.25)'
                                    }}
                                >
                                    💾 Save All GachaSwipe Settings
                                </button>
                                <button
                                    onClick={() => handleApplyPreset('MIKA')}
                                    style={{
                                        padding: '12px 16px',
                                        background: 'transparent',
                                        border: '1px solid rgba(255, 255, 255, 0.2)',
                                        color: 'rgba(255, 255, 255, 0.6)',
                                        fontSize: '10px',
                                        fontWeight: 'bold',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Reset M.I.K.A.
                                </button>
                            </div>

                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={handlePurgeMessages}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        background: 'rgba(255, 51, 51, 0.08)',
                                        border: '1px solid rgba(255, 51, 51, 0.3)',
                                        color: '#FF6666',
                                        fontSize: '9.5px',
                                        fontWeight: 'bold',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    🗑️ Purge Messages (Keep Favorites)
                                </button>
                                <button
                                    onClick={handleResetTastes}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        background: 'rgba(255, 51, 51, 0.08)',
                                        border: '1px solid rgba(255, 51, 51, 0.3)',
                                        color: '#FF6666',
                                        fontSize: '9.5px',
                                        fontWeight: 'bold',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    🧹 Reset Taste Algorithm
                                </button>
                            </div>
                        </div>

                    </div>
                )}

                {/* ==========================================================
                   VIEW 3: THE MODULAR NEURAL API MATRIX
                   ========================================================== */}
                {activeView === 'api' && (
                    <ApiMatrix
                        onModelChange={setActiveModel}
                        onImageModelChange={setActiveImageModel}
                    />
                )}

                {/* ==========================================================
                   VIEW 4: VAULT (Backups & Data Management)
                   ========================================================== */}
                {activeView === 'vault' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ borderBottom: '1px solid rgba(255, 215, 0, 0.2)', paddingBottom: '8px' }}>
                            <h3 style={{ margin: '0 0 4px 0', color: '#ffd700', fontSize: '15px', fontWeight: 900 }}>
                                &gt; CLOUD_VAULT_AND_MEMORY
                            </h3>
                            <p style={{ margin: 0, fontSize: '10px', color: 'rgba(255, 215, 0, 0.6)' }}>
                                // Export matches, memory traces, and local IndexedDB archives.
                            </p>
                        </div>

                        <div style={{ background: '#0B0914', border: '1px solid rgba(255, 215, 0, 0.3)', borderRadius: '6px', padding: '14px' }}>
                            <div style={{ color: '#ffd700', fontSize: '11px', fontWeight: 'bold', marginBottom: '8px' }}>
                                &gt; SESSION_JSON_BACKUP
                            </div>
                            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, margin: '0 0 12px 0' }}>
                                Export your complete GachaSwipe session, including all unlocked waifus, chat histories, sparks, and custom presets to an encrypted JSON backup file.
                            </p>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => {
                                        window.dispatchEvent(new CustomEvent('gacha:trigger-export'));
                                        showHudToast('Session export payload generated! 💾');
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: '8px',
                                        background: 'rgba(255, 215, 0, 0.15)',
                                        border: '1px solid #ffd700',
                                        color: '#ffd700',
                                        fontSize: '10px',
                                        fontWeight: 'bold',
                                        borderRadius: '3px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    📥 Export Full Backup JSON
                                </button>
                            </div>
                        </div>

                        <div style={{ background: '#0B0914', border: '1px solid rgba(0, 229, 255, 0.2)', borderRadius: '6px', padding: '14px' }}>
                            <div style={{ color: '#00e5ff', fontSize: '11px', fontWeight: 'bold', marginBottom: '8px' }}>
                                &gt; LOCAL_INDEXED_DB_STATS
                            </div>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
                                <div>• Database: <span style={{ color: '#00ff9d' }}>GachaSwipeWebDB (Dexie v2)</span></div>
                                <div>• Storage Engine: <span style={{ color: '#00e5ff' }}>Browser IndexedDB (Persistent)</span></div>
                                <div>• Security: <span style={{ color: '#ffd700' }}>AES Local BYOK Vault</span></div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};
