import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import './ThreePanelLayout.css';
import { AdaptiveHUD } from './AdaptiveHUD.jsx';
import { MatrixShooter } from '../../components/MatrixShooter.jsx';

// Context for any child or sub-panel needing layout state
export const ThreePanelContext = createContext({
    rightPanelView: 'idle',
    setRightPanelView: () => {},
    activeWaifu: null,
    setActiveWaifu: () => {},
    activeChatId: null,
    setActiveChatId: () => {},
    isMinigameActive: false,
    triggerMinigame: () => {},
    closeMinigame: () => {},
    mobileDrawer: 'none',
    setMobileDrawer: () => {}
});

export const useThreePanel = () => useContext(ThreePanelContext);

export const ThreePanelLayout = ({ children }) => {
    const [rightPanelView, setRightPanelView] = useState('profile');
    const [activeWaifu, setActiveWaifu] = useState(null);
    const [activeChatId, setActiveChatId] = useState(null);
    const [isMinigameActive, setIsMinigameActive] = useState(false);
    const [isMinigameExiting, setIsMinigameExiting] = useState(false);
    const [minigameHighScore, setMinigameHighScore] = useState(0);
    const [mobileDrawer, setMobileDrawer] = useState('none'); // 'none' | 'left' | 'right'

    const centerStageRef = useRef(null);

    const handleCloseMobileDrawer = () => {
        setMobileDrawer('none');
        window.dispatchEvent(new CustomEvent('gacha:close-hud'));
    };

    // Global layout communication bus
    useEffect(() => {
        window.__GACHA_HUD__ = {
            setRightPanelView: (view) => setRightPanelView(view),
            openHUD: (view = 'profile') => {
                setRightPanelView(view);
                if (window.innerWidth <= 1024) setMobileDrawer('right');
            },
            closeHUD: () => handleCloseMobileDrawer(),
            triggerMinigame: (waifu) => {
                if (waifu) setActiveWaifu(waifu);
                setIsMinigameActive(true);
            },
            setActiveWaifu: (w) => setActiveWaifu(w),
            openChat: (chatId) => {
                setActiveChatId(chatId);
                if (window.innerWidth <= 1024) {
                    window.dispatchEvent(new CustomEvent('gacha:toggle-chat'));
                }
            }
        };

        const handleSetRightView = (e) => {
            if (e.detail?.view) setRightPanelView(e.detail.view);
        };
        const handleTriggerMinigame = (e) => {
            if (e.detail?.waifu) setActiveWaifu(e.detail.waifu);
            setIsMinigameActive(true);
        };
        const handleSelectWaifu = (e) => {
            if (e.detail?.waifu) setActiveWaifu(e.detail.waifu);
        };

        window.addEventListener('gacha:set-right-view', handleSetRightView);
        window.addEventListener('gacha:trigger-minigame', handleTriggerMinigame);
        window.addEventListener('gacha:select-waifu', handleSelectWaifu);

        return () => {
            window.removeEventListener('gacha:set-right-view', handleSetRightView);
            window.removeEventListener('gacha:trigger-minigame', handleTriggerMinigame);
            window.removeEventListener('gacha:select-waifu', handleSelectWaifu);
        };
    }, []);

    // Intercept header & action clicks inside Center Panel without mutating App internals
    const handleCenterClickCapture = (e) => {
        const settingsBtn = e.target.closest('.header-icon-btn.settings');
        if (settingsBtn) {
            e.stopPropagation();
            e.preventDefault();
            setRightPanelView('settings');
            if (window.innerWidth <= 1024) {
                setMobileDrawer('right');
            }
            return;
        }

        const historyBtn = e.target.closest('.header-icon-btn.history');
        if (historyBtn) {
            e.stopPropagation();
            e.preventDefault();
            setRightPanelView('profile');
            if (window.innerWidth <= 1024) {
                setMobileDrawer('right');
            }
            return;
        }
    };

    // Close minigame lifecycle handler
    const handleMinigameExit = (score = 0, isCompleted = false) => {
        setIsMinigameExiting(true);
        setTimeout(() => {
            setIsMinigameActive(false);
            setIsMinigameExiting(false);
            setRightPanelView('profile');
            if (window.innerWidth <= 1024) setMobileDrawer('right');
        }, 600);
    };

    const contextValue = {
        rightPanelView,
        setRightPanelView,
        activeWaifu,
        setActiveWaifu,
        activeChatId,
        setActiveChatId,
        isMinigameActive,
        triggerMinigame: (w) => {
            if (w) setActiveWaifu(w);
            setIsMinigameActive(true);
        },
        closeMinigame: handleMinigameExit,
        mobileDrawer,
        setMobileDrawer
    };

    return (
        <ThreePanelContext.Provider value={contextValue}>
            <div className="three-panel-root">

                {/* ------------------------------------------------------------------
                   LEFT PANEL: PERSISTENT CHAT (Desktop: minmax(320px, 1fr) | Mobile Drawer)
                   The real 1:1 App.jsx setup-chat-panel pins here on desktop via CSS!
                   ------------------------------------------------------------------ */}
                <aside className={`panel-left ${mobileDrawer === 'left' ? 'drawer-open' : ''}`}>
                    <div className="left-panel-standby">
                        <div className="standby-header">
                            <span className="live-dot" />
                            <span className="standby-title">NEURAL_CHAT_STREAM // v2.0</span>
                        </div>
                        <div className="standby-body">
                            <div className="standby-icon">💬</div>
                            <div className="standby-glitch-text">&gt; NEURAL_MESSAGES_STREAM_ONLINE</div>
                            <div className="standby-subtext">// Encrypted proxy uplink active</div>
                        </div>
                    </div>
                </aside>

                {/* ------------------------------------------------------------------
                   CYBERPUNK GUTTER RAIL (LEFT): 2px Neon Divider Rail
                   ------------------------------------------------------------------ */}
                <div className="cyber-gutter left" aria-hidden="true">
                    <div className="gutter-light-pulse" />
                    <div className="gutter-marker">[L]</div>
                    <div className="gutter-label">MATRIX_RAIL_01 // CHAT_STREAM</div>
                    <div className="gutter-marker">[01]</div>
                </div>

                {/* ------------------------------------------------------------------
                   CENTER PANEL: THE MATCH STAGE (Preserved & Locked 440px)
                   ------------------------------------------------------------------ */}
                <main
                    className="panel-center"
                    ref={centerStageRef}
                    onClickCapture={handleCenterClickCapture}
                >
                    {children}
                </main>

                {/* ------------------------------------------------------------------
                   CYBERPUNK GUTTER RAIL (RIGHT): 2px Neon Divider Rail
                   ------------------------------------------------------------------ */}
                <div className="cyber-gutter right" aria-hidden="true">
                    <div className="gutter-light-pulse" />
                    <div className="gutter-marker green">[R]</div>
                    <div className="gutter-label">DIAGNOSTIC_RAIL_02 // ADAPTIVE_HUD</div>
                    <div className="gutter-marker green">[02]</div>
                </div>

                {/* ------------------------------------------------------------------
                   RIGHT PANEL: ADAPTIVE HUD (Desktop: minmax(320px, 1fr) | Mobile Drawer)
                   ------------------------------------------------------------------ */}
                <aside className={`panel-right ${mobileDrawer === 'right' ? 'drawer-open' : ''}`}>
                    <AdaptiveHUD
                        view={rightPanelView}
                        onChangeView={setRightPanelView}
                        activeWaifu={activeWaifu}
                        onTriggerMinigame={() => setIsMinigameActive(true)}
                        onCloseMobileDrawer={handleCloseMobileDrawer}
                    />
                </aside>

                {/* ------------------------------------------------------------------
                   MOBILE DRAWER BACKDROP (for ≤ 1024px)
                   ------------------------------------------------------------------ */}
                {mobileDrawer !== 'none' && (
                    <div
                        className="mobile-drawer-backdrop"
                        onClick={handleCloseMobileDrawer}
                    />
                )}

                {/* ------------------------------------------------------------------
                   MOBILE EDGE HANDLES (for easy drawer toggling on mobile)
                   ------------------------------------------------------------------ */}
                <div
                    className="mobile-edge-handle left"
                    onClick={() => {
                        window.dispatchEvent(new CustomEvent('gacha:toggle-chat'));
                    }}
                    title="Toggle Chat"
                >
                    💬 CHAT
                </div>
                <div
                    className="mobile-edge-handle right"
                    onClick={() => {
                        if (mobileDrawer === 'right') {
                            handleCloseMobileDrawer();
                        } else {
                            setMobileDrawer('right');
                        }
                    }}
                    title="Toggle HUD"
                >
                    ⚙️ HUD
                </div>

                {/* ------------------------------------------------------------------
                   FULL-VIEWPORT MINIGAME PHASE-IN OVERLAY (z-index: 9999, inset: 0)
                   ------------------------------------------------------------------ */}
                {isMinigameActive && (
                    <div className={`minigame-fullscreen-overlay ${isMinigameExiting ? 'exiting' : ''}`}>
                        <div className="minigame-scanlines" />
                        <div className="minigame-scanline-sweep" />

                        {/* Top HUD bar with Quick Abort */}
                        <div style={{
                            position: 'absolute',
                            top: '16px',
                            right: '20px',
                            zIndex: 10005,
                            display: 'flex',
                            gap: '10px'
                        }}>
                            <button
                                onClick={() => handleMinigameExit(0, false)}
                                style={{
                                    background: 'rgba(5, 3, 8, 0.8)',
                                    border: '1px solid rgba(0, 229, 255, 0.5)',
                                    color: '#00e5ff',
                                    borderRadius: '4px',
                                    padding: '8px 14px',
                                    fontFamily: 'inherit',
                                    fontWeight: 'bold',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    letterSpacing: '0.08em',
                                    boxShadow: '0 0 15px rgba(0, 229, 255, 0.3)'
                                }}
                            >
                                [ ✕ ABORT_MATRIX ]
                            </button>
                        </div>

                        {/* Shooter Component Canvas */}
                        <MatrixShooter
                            waifu={activeWaifu || { name: 'Kira V', imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&q=80' }}
                            themeColor="#00e5ff"
                            tiers={[]}
                            themeConcept="Cyberpunk Neural Breach"
                            progressState={{ current: { step: 40, total: 80, done: false } }}
                            onAbort={() => handleMinigameExit(0, false)}
                            onExit={(score, isCompleted) => handleMinigameExit(score, isCompleted)}
                            isReplay={true}
                            bgImages={activeWaifu?.imageUrl ? [activeWaifu.imageUrl] : []}
                            highScore={minigameHighScore}
                            setHighScore={setMinigameHighScore}
                            rewardUnlocked={false}
                        />
                    </div>
                )}
            </div>
        </ThreePanelContext.Provider>
    );
};
