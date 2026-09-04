import React, { useState } from "react";
import { useCards } from "./db.js";
import { matrixAudio } from "../core/utils/matrixAudio.js";
import { UserIcon, SparkIcon, XIcon, LockIcon } from "../core/components/Icons.jsx";

export function RosterPanel({
    activeCard,
    history = [],
    swipes = 159,
    sparks = 142,
    userName = "Master",
    onSelectCard,
    onOpenChat,
    onOpenGachaFans,
    onOpenSettings,
    onOpenCloudVault,
    onSendSpark,
    isEmbedded = false,
    onClose
}) {
    const dbCards = useCards();
    const [sessionTab, setSessionTab] = useState("history"); // "history" | "friends"
    const [previewWaifu, setPreviewWaifu] = useState(null);

    // Grab all friends/bonded cards
    const friendsList = dbCards && dbCards.length > 0 ? dbCards : [];

    // Format session history (newest first)
    const sessionHistory = history.length > 0 ? [...history].reverse() : [
        { card: { id: "rynni", name: "Rynni", age: "19", archetype: "Fox Shrine Maiden", likes: ["Shrine Bells", "Master"], dislikes: ["Cold Rain"], quirks: ["Tail flicks when happy"], imageUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400" }, direction: "pass" },
        { card: { id: "veshka", name: "Veshka", age: "22", archetype: "Dark Cyber Elf", likes: ["Plasma Daggers", "Midnight"], dislikes: ["Firewalls"], quirks: ["Hacks while whispering"], imageUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400" }, direction: "pass" },
        { card: { id: "ysolde", name: "Ysolde Mavraen", age: "21", archetype: "Chrono Mage", likes: ["Time Relics", "Master"], dislikes: ["Paradoxes"], quirks: ["Reverses clock hands"], imageUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400" }, direction: "like" },
        { card: { id: "khessari", name: "Khessari", age: "20", archetype: "Desert Rogue", likes: ["Sunstones", "Sandstorms"], dislikes: ["Cages"], quirks: ["Hides in shadows"], imageUrl: "https://images.unsplash.com/photo-1563089145-599997674d42?w=400" }, direction: "pass" },
        { card: { id: "tzipora", name: "Tzipora", age: "23", archetype: "Celestial Priestess", likes: ["Starlight", "Holy Chants"], dislikes: ["Demons"], quirks: ["Floats 2 inches off ground"], imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400" }, direction: "like" },
        { card: { id: "kitta", name: "Kitta", age: "18", archetype: "Calico Catgirl", likes: ["Headpats", "Warm Bento"], dislikes: ["Vacuum Cleaners"], quirks: ["Purrs at 100dB"], imageUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400" }, direction: "like" },
        { card: { id: "nyssara", name: "Nyssara", age: "21", archetype: "Void Sorceress", likes: ["Black Holes", "Master"], dislikes: ["Bright Lights"], quirks: ["Blinks with purple spark"], imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400" }, direction: "like" },
        { card: { id: "faeliri", name: "Faeliri", age: "20", archetype: "Bioluminescent Sylph", likes: ["Glowing Moss", "Dewdrops"], dislikes: ["Smog"], quirks: ["Hair glows in dark"], imageUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400" }, direction: "pass" }
    ];

    const handleSparkClick = (card) => {
        matrixAudio.playPowerup();
        if (onSendSpark) {
            onSendSpark(card);
        } else if (onOpenChat) {
            onOpenChat(card);
        }
    };

    return (
        <div style={{
            height: "100%", width: "100%", display: "flex", flexDirection: "column",
            background: "#0B0914", borderRight: isEmbedded ? "1px solid rgba(0, 229, 255, 0.15)" : "none",
            fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", overflow: "hidden", position: "relative"
        }}>
            {!isEmbedded && onClose && (
                <button
                    onClick={onClose}
                    style={{
                        position: "absolute", top: "16px", right: "16px", background: "rgba(0,0,0,0.6)",
                        border: "1px solid rgba(0,229,255,0.4)", borderRadius: "50%", width: "32px", height: "32px",
                        color: "#00E5FF", display: "grid", placeItems: "center", cursor: "pointer", zIndex: 10
                    }}
                >
                    <XIcon size={14} />
                </button>
            )}

            {/* ✨ MIKA'S PROFILE HUB HEADER (1:1 with Screenshot 1) ✨ */}
            <div style={{
                padding: "24px 16px 14px", display: "flex", flexDirection: "column", alignItems: "center",
                borderBottom: "1px solid rgba(0, 229, 255, 0.12)", background: "#050308", flexShrink: 0
            }}>
                {/* 80x80px Frosted Cyber Avatar Box */}
                <div style={{
                    width: "74px", height: "74px", borderRadius: "6px", background: "rgba(0, 229, 255, 0.05)",
                    border: "2px solid rgba(0, 229, 255, 0.4)", color: "#00E5FF", display: "grid", placeItems: "center",
                    marginBottom: "10px", boxShadow: "0 0 25px rgba(0, 229, 255, 0.2), inset 0 0 15px rgba(0, 229, 255, 0.05)"
                }}>
                    <UserIcon size={38} />
                </div>

                {/* Username */}
                <h2 style={{
                    margin: "0 0 8px 0", color: "#00E5FF", fontSize: "20px", fontWeight: 800,
                    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", letterSpacing: "0.05em",
                    textShadow: "0 0 12px rgba(0,229,255,0.4)"
                }}>
                    &gt; {userName}
                </h2>

                {/* Stats Pill Badge */}
                <div style={{
                    display: "flex", alignItems: "center", gap: "14px", fontSize: "11px", fontWeight: "bold",
                    background: "rgba(0, 229, 255, 0.03)", padding: "5px 14px", borderRadius: "4px",
                    border: "1px solid rgba(0, 229, 255, 0.15)", letterSpacing: "0.05em"
                }}>
                    <span style={{ color: "#FF107A" }}>{swipes} Swipes</span>
                    <span style={{ width: "1px", height: "12px", background: "rgba(255,255,255,0.2)" }} />
                    <span style={{ color: "#00E5FF", display: "flex", alignItems: "center", gap: "4px", textShadow: "0 0 8px rgba(0, 229, 255, 0.4)" }}>
                        <SparkIcon /> {sparks} Sparks
                    </span>
                </div>
            </div>

            {/* ✨ MIKA'S HUB TABS (1:1 with Screenshot 1) ✨ */}
            <div style={{
                display: "flex", padding: "8px 12px", gap: "6px", background: "rgba(0, 229, 255, 0.02)",
                borderBottom: "1px solid rgba(0, 229, 255, 0.1)", flexShrink: 0
            }}>
                <button
                    onClick={() => { matrixAudio.playClick(); setSessionTab("friends"); }}
                    style={{
                        flex: 1, padding: "9px 4px", borderRadius: "4px",
                        border: sessionTab === "friends" ? "1px solid rgba(255, 16, 122, 0.4)" : "1px solid rgba(255,255,255,0.08)",
                        background: sessionTab === "friends" ? "rgba(255, 16, 122, 0.15)" : "transparent",
                        color: sessionTab === "friends" ? "#FF107A" : "rgba(255,255,255,0.35)",
                        fontWeight: "bold", fontSize: "10.5px", cursor: "pointer", transition: "all 0.2s",
                        letterSpacing: "0.05em", textShadow: sessionTab === "friends" ? "0 0 6px rgba(255,16,122,0.3)" : "none",
                        boxShadow: sessionTab === "friends" ? "0 0 8px rgba(255,16,122,0.1)" : "none"
                    }}
                >
                    &gt; FRIENDS [{friendsList.length || 82}]
                </button>
                <button
                    onClick={() => { matrixAudio.playClick(); setSessionTab("history"); }}
                    style={{
                        flex: 1, padding: "9px 4px", borderRadius: "4px",
                        border: sessionTab === "history" ? "1px solid rgba(0, 229, 255, 0.4)" : "1px solid rgba(255,255,255,0.08)",
                        background: sessionTab === "history" ? "rgba(0, 229, 255, 0.15)" : "transparent",
                        color: sessionTab === "history" ? "#00E5FF" : "rgba(255,255,255,0.35)",
                        fontWeight: "bold", fontSize: "10.5px", cursor: "pointer", transition: "all 0.2s",
                        letterSpacing: "0.05em", textShadow: sessionTab === "history" ? "0 0 6px rgba(0, 229, 255, 0.3)" : "none",
                        boxShadow: sessionTab === "history" ? "0 0 8px rgba(0, 229, 255, 0.1)" : "none"
                    }}
                >
                    &gt; HISTORY
                </button>
            </div>

            {/* Content List Area */}
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {sessionTab === "history" ? (
                    sessionHistory.map((item, idx) => {
                        const card = item.card;
                        const isMatched = item.direction === "like" || item.status === "approved";
                        const name = card.characterName || card.name || "Companion";
                        const img = card.imageBlobOrUrl || card.imageUrl || card.image;

                        return (
                            <div
                                key={card.id || card.uuid || idx}
                                style={{
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                    padding: "8px 10px", background: "rgba(0, 229, 255, 0.02)",
                                    border: "1px solid rgba(0, 229, 255, 0.08)", borderRadius: "4px",
                                    transition: "background 0.15s"
                                }}
                                onMouseOver={e => e.currentTarget.style.background = "rgba(0, 229, 255, 0.06)"}
                                onMouseOut={e => e.currentTarget.style.background = "rgba(0, 229, 255, 0.02)"}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                                    <img
                                        src={img}
                                        alt=""
                                        style={{
                                            width: "42px", height: "42px", borderRadius: "50%", objectFit: "cover",
                                            border: isMatched ? "2px solid #FF107A" : "2px solid #00E5FF", flexShrink: 0
                                        }}
                                    />
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{
                                            fontSize: "12px", fontWeight: 800, color: "#fff",
                                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                                        }}>
                                            {name}
                                        </div>
                                        <div style={{
                                            color: isMatched ? "#FF107A" : "#00E5FF", fontWeight: "bold",
                                            textTransform: "uppercase", fontSize: "9px", letterSpacing: "0.1em", marginTop: "2px"
                                        }}>
                                            {isMatched ? "> MATCHED" : "> REJECTED"}
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                                    <button
                                        className="icon-btn"
                                        onClick={() => { matrixAudio.playClick(); setPreviewWaifu(card); }}
                                        title="View Profile"
                                        style={{
                                            background: "rgba(0, 229, 255, 0.08)", borderRadius: "4px",
                                            width: "32px", height: "32px", color: "#00E5FF", display: "grid",
                                            placeItems: "center", border: "1px solid rgba(0, 229, 255, 0.2)", cursor: "pointer"
                                        }}
                                    >
                                        <UserIcon size={16} />
                                    </button>

                                    {!isMatched && (
                                        <button
                                            className="icon-btn"
                                            onClick={() => handleSparkClick(card)}
                                            title="Send a Spark! Rematch"
                                            style={{
                                                background: "rgba(255, 16, 122, 0.08)", border: "1px solid rgba(255, 16, 122, 0.4)",
                                                borderRadius: "4px", width: "32px", height: "32px", color: "#FF107A",
                                                fontSize: "13px", display: "grid", placeItems: "center", cursor: "pointer"
                                            }}
                                        >
                                            ⚡
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    friendsList.length === 0 ? (
                        <div style={{ textAlign: "center", padding: "30px 10px", color: "rgba(0, 229, 255, 0.4)", fontSize: "11px" }}>
                            &gt; NO_SAVED_FRIENDS
                            <div style={{ marginTop: "4px", fontSize: "9px" }}>Swipe right on companions to add them to your Friends list!</div>
                        </div>
                    ) : (
                        friendsList.map(card => {
                            const name = card.characterName || card.metadata?.name || "Companion";
                            const img = card.imageBlobOrUrl || card.metadata?.imageUrl || card.metadata?.image;
                            const isSSR = Boolean(card.metadata?.isSSR);

                            return (
                                <div
                                    key={card.id || card.uuid}
                                    style={{
                                        display: "flex", alignItems: "center", justifyContent: "space-between",
                                        padding: "8px 10px", background: "rgba(0, 229, 255, 0.02)",
                                        border: "1px solid rgba(0, 229, 255, 0.08)", borderRadius: "4px",
                                        transition: "background 0.15s"
                                    }}
                                    onMouseOver={e => e.currentTarget.style.background = "rgba(0, 229, 255, 0.06)"}
                                    onMouseOut={e => e.currentTarget.style.background = "rgba(0, 229, 255, 0.02)"}
                                >
                                    <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                                        <img
                                            src={img}
                                            alt=""
                                            style={{
                                                width: "42px", height: "42px", borderRadius: "50%", objectFit: "cover",
                                                border: isSSR ? "2px solid #FFD700" : "2px solid #FF107A", flexShrink: 0
                                            }}
                                        />
                                        <div style={{ minWidth: 0 }}>
                                            <div style={{
                                                fontSize: "12px", fontWeight: 800, color: "#fff",
                                                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                                            }}>
                                                {name}
                                            </div>
                                            <div style={{
                                                color: isSSR ? "#FFD700" : "#FF107A", fontWeight: "bold",
                                                textTransform: "uppercase", fontSize: "9px", letterSpacing: "0.1em", marginTop: "2px"
                                            }}>
                                                {isSSR ? "> SOULBOUND" : "> MATCHED"}
                                            </div>
                                        </div>
                                    </div>

                                    <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                                        <button
                                            className="icon-btn"
                                            onClick={() => { matrixAudio.playClick(); setPreviewWaifu(card); }}
                                            title="View Profile"
                                            style={{
                                                background: "rgba(0, 229, 255, 0.08)", borderRadius: "4px",
                                                width: "32px", height: "32px", color: "#00E5FF", display: "grid",
                                                placeItems: "center", border: "1px solid rgba(0, 229, 255, 0.2)", cursor: "pointer"
                                            }}
                                        >
                                            <UserIcon size={16} />
                                        </button>
                                        <button
                                            className="icon-btn"
                                            onClick={() => { matrixAudio.playClick(); onOpenChat(card); }}
                                            title="Open Chat"
                                            style={{
                                                background: "rgba(255, 16, 122, 0.08)", border: "1px solid rgba(255, 16, 122, 0.4)",
                                                borderRadius: "4px", width: "32px", height: "32px", color: "#FF107A",
                                                fontSize: "13px", display: "grid", placeItems: "center", cursor: "pointer"
                                            }}
                                        >
                                            💬
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )
                )}
            </div>

            {/* Profile Inspector Drawer / Modal */}
            {previewWaifu && (
                <div style={{
                    position: "absolute", inset: 0, zIndex: 100, background: "#0B0914",
                    display: "flex", flexDirection: "column", animation: "fadeIn 0.2s ease", overflow: "hidden"
                }}>
                    <div style={{
                        padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "center",
                        borderBottom: "1px dashed rgba(0,229,255,0.3)", background: "rgba(5, 3, 8, 0.85)"
                    }}>
                        <h3 style={{ margin: 0, fontSize: "14px", fontWeight: 800, color: "#00E5FF", letterSpacing: "0.05em" }}>
                            &gt; {(previewWaifu.name || previewWaifu.characterName || "COMPANION").toUpperCase()}_DATA
                        </h3>
                        <button
                            onClick={() => setPreviewWaifu(null)}
                            style={{
                                background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%",
                                width: "28px", height: "28px", color: "#fff", display: "grid", placeItems: "center", cursor: "pointer"
                            }}
                        >
                            <XIcon size={14} />
                        </button>
                    </div>

                    <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
                        <img
                            src={previewWaifu.imageBlobOrUrl || previewWaifu.imageUrl || previewWaifu.image}
                            alt=""
                            style={{ width: "100%", height: "180px", objectFit: "cover", borderRadius: "6px", border: "1px solid rgba(0,229,255,0.3)" }}
                        />
                        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.8)", lineHeight: 1.5 }}>
                            {previewWaifu.description || previewWaifu.metadata?.description || "Devoted companion forged in the matrix."}
                        </div>

                        <div>
                            <span style={{ fontSize: "10px", color: "#00E5FF", fontWeight: "bold" }}>&gt; LIKES:</span>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                                {(previewWaifu.likes || previewWaifu.metadata?.likes || ["Master", "Cyber Aesthetics"]).map((l, i) => (
                                    <span key={i} style={{ fontSize: "9px", background: "rgba(0,229,255,0.1)", border: "1px solid rgba(0,229,255,0.3)", color: "#00E5FF", padding: "2px 6px", borderRadius: "3px" }}>
                                        {l}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div>
                            <span style={{ fontSize: "10px", color: "#FF107A", fontWeight: "bold" }}>&gt; QUIRKS:</span>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                                {(previewWaifu.quirks || previewWaifu.metadata?.quirks || ["Bell collar jingling", "Tail flicks"]).map((q, i) => (
                                    <span key={i} style={{ fontSize: "9px", background: "rgba(255,16,122,0.1)", border: "1px solid rgba(255,16,122,0.3)", color: "#FF107A", padding: "2px 6px", borderRadius: "3px" }}>
                                        {q}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                            <button
                                onClick={() => {
                                    matrixAudio.playClick();
                                    onSelectCard(previewWaifu);
                                    setPreviewWaifu(null);
                                }}
                                style={{
                                    flex: 1, padding: "8px", borderRadius: "4px", border: "1px solid #00E5FF",
                                    background: "rgba(0,229,255,0.15)", color: "#00E5FF", fontWeight: "bold",
                                    fontSize: "11px", cursor: "pointer"
                                }}
                            >
                                LOAD TO DECK
                            </button>
                            <button
                                onClick={() => {
                                    matrixAudio.playClick();
                                    onOpenChat(previewWaifu);
                                    setPreviewWaifu(null);
                                }}
                                style={{
                                    flex: 1, padding: "8px", borderRadius: "4px", border: "1px solid #FF107A",
                                    background: "rgba(255,16,122,0.15)", color: "#FF107A", fontWeight: "bold",
                                    fontSize: "11px", cursor: "pointer"
                                }}
                            >
                                OPEN CHAT
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
