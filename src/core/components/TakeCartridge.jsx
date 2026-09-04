import React, { useState } from 'react';

export const TakeCartridge = ({ take, onApprove, onSkip, onAbort, themeColor = '#00ffff' }) => {
  const [isRendering, setIsRendering] = useState(false);
  const [showRawData, setShowRawData] = useState(false);
  const [activeTab, setActiveTab] = useState('inspector'); // 'inspector' | 'json'
  const [copiedField, setCopiedField] = useState(null);
  const [expandTokens, setExpandTokens] = useState(false);

  // Token calculations
  const tokenCount = take?.audio_codes 
    ? (Array.isArray(take.audio_codes) ? take.audio_codes.length : (typeof take.audio_codes === 'string' ? take.audio_codes.split(',').length : 0)) 
    : 0;

  const handleRender = () => {
    setIsRendering(true);
    onApprove();
  };

  const handleCopy = (text, fieldKey) => {
    if (!text) return;
    const content = typeof text === 'object' ? JSON.stringify(text, null, 2) : String(text);
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(content).catch(() => {});
    }
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const tColor = themeColor || '#00ffff';

  // Prepare sanitized display take for RAW JSON view so giant audio_codes arrays don't drown everything out
  const getDisplayJson = () => {
    if (!take) return '// No blueprint data available.';
    if (expandTokens) {
      return JSON.stringify(take, null, 2);
    }
    const cleanTake = { ...take };
    if (cleanTake.audio_codes) {
      cleanTake.audio_codes = `[/* ${tokenCount} acoustic tokens condensed - toggle 'EXPAND TOKENS' to inspect raw array */]`;
    }
    return JSON.stringify(cleanTake, null, 2);
  };

  const cardStyle = {
    position: 'relative',
    width: '100%',
    maxWidth: '350px',
    margin: '0 auto',
    background: 'linear-gradient(180deg, #110E1A 0%, #050308 100%)',
    border: `1px solid ${tColor}50`,
    borderRadius: '12px',
    padding: '16px',
    boxShadow: `0 8px 24px rgba(0,0,0,0.8), inset 0 0 20px ${tColor}15`,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
    userSelect: 'none',
    color: '#fff',
    overflow: 'hidden',
    boxSizing: 'border-box'
  };

  return (
    <div style={cardStyle}>
      
      {/* Cassette Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: '12px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '9px', color: tColor, fontWeight: 'bold', letterSpacing: '0.1em', marginBottom: '4px' }}>[ TAPE: BLUEPRINT ]</div>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '18px', textShadow: `0 0 8px ${tColor}80`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                M.I.K.A. // A-SIDE
            </h3>
        </div>
        <span style={{ color: '#ff00ff', fontSize: '10px', textTransform: 'uppercase', padding: '4px 8px', background: 'rgba(255,0,255,0.1)', borderRadius: '4px', border: '1px solid rgba(255,0,255,0.3)', animation: isRendering ? 'csd-pulse 0.4s infinite' : 'none', flexShrink: 0 }}>
            {isRendering ? 'RENDERING...' : 'Unrendered'}
        </span>
      </div>

      {/* Mechanical Reels & Glowing RAW Tape Bridge Window */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '14px 0', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', border: `1px solid ${tColor}30`, position: 'relative' }}>
        {/* Left Tape Reel */}
        <div className={`tape-reel ${isRendering ? 'spinning' : ''}`} style={{ width: '48px', height: '48px', borderColor: tColor, boxShadow: `0 0 10px ${tColor}40`, animationDuration: isRendering ? '0.5s' : '2s', flexShrink: 0 }}>
            <div className="tape-spoke" style={{ background: tColor }}></div>
            <div className="tape-spoke" style={{ background: tColor, transform: 'rotate(60deg)' }}></div>
            <div className="tape-spoke" style={{ background: tColor, transform: 'rotate(120deg)' }}></div>
            <div className="tape-hub" style={{ borderColor: tColor }}></div>
        </div>

        {/* Glowing RAW Tape Inspection Window Button */}
        <button 
          onClick={() => setShowRawData(true)}
          title="Inspect LLM Raw Matrix & Blueprint Data"
          style={{
            height: '28px',
            minWidth: '115px',
            maxWidth: '135px',
            margin: '0 12px',
            background: 'linear-gradient(180deg, rgba(22,14,32,0.95) 0%, rgba(6,3,12,0.98) 100%)',
            borderRadius: '4px',
            border: `1px solid ${tColor}70`,
            boxShadow: `0 0 12px ${tColor}35, inset 0 0 10px rgba(0,0,0,0.9)`,
            position: 'relative',
            cursor: 'pointer',
            outline: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            padding: '0 8px',
            transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
            flexShrink: 0
          }}
          onMouseOver={e => {
            e.currentTarget.style.borderColor = tColor;
            e.currentTarget.style.boxShadow = `0 0 18px ${tColor}70, inset 0 0 10px ${tColor}25`;
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseOut={e => {
            e.currentTarget.style.borderColor = `${tColor}70`;
            e.currentTarget.style.boxShadow = `0 0 12px ${tColor}35, inset 0 0 10px rgba(0,0,0,0.9)`;
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {/* Subtle Magnetic Ribbon Strip Behind */}
          <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '7px', background: 'linear-gradient(180deg, #32231b 0%, #17100d 100%)', borderTop: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(0,0,0,0.85)', transform: 'translateY(-50%)', opacity: 0.8 }}></div>
          
          {/* Glowing RAW Badge Pill */}
          <div style={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            background: 'rgba(5, 3, 10, 0.88)',
            padding: '2px 8px',
            borderRadius: '3px',
            border: `1px solid ${tColor}60`,
            boxShadow: `0 0 8px ${tColor}40`
          }}>
            <span style={{ fontSize: '9px', color: '#ff00ff', animation: 'csd-pulse 1.2s infinite' }}>⚡</span>
            <span style={{
              fontSize: '10px',
              fontWeight: '900',
              color: tColor,
              letterSpacing: '0.15em',
              fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
              textShadow: `0 0 8px ${tColor}`
            }}>
              RAW
            </span>
          </div>
        </button>

        {/* Right Tape Reel */}
        <div className={`tape-reel ${isRendering ? 'spinning' : ''}`} style={{ width: '48px', height: '48px', borderColor: tColor, boxShadow: `0 0 10px ${tColor}40`, animationDuration: isRendering ? '0.5s' : '2s', flexShrink: 0 }}>
            <div className="tape-spoke" style={{ background: tColor }}></div>
            <div className="tape-spoke" style={{ background: tColor, transform: 'rotate(60deg)' }}></div>
            <div className="tape-spoke" style={{ background: tColor, transform: 'rotate(120deg)' }}></div>
            <div className="tape-hub" style={{ borderColor: tColor }}></div>
        </div>
      </div>

      {/* Fixed Size Info Box Container */}
      <div 
        style={{ 
          height: '280px',
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px',
          background: 'rgba(5, 5, 10, 0.6)',
          borderRadius: '8px',
          padding: '12px',
          border: '1px solid rgba(255,255,255,0.1)',
          minWidth: 0,
          overflow: 'hidden'
        }}
      >
        <style>{`
          @keyframes marqueeVertical {
              0% { transform: translateY(0); }
              100% { transform: translateY(-50%); }
          }
        `}</style>
        {/* Metadata Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '10px', color: '#aaa', flexShrink: 0 }}>
            <div><strong style={{ color:'#fff' }}>Duration:</strong> {take?.duration || 'AUTO'}s</div>
            <div><strong style={{ color:'#fff' }}>Tempo:</strong> {take?.bpm || 'AUTO'}</div>
            <div><strong style={{ color:'#fff' }}>Key:</strong> {take?.keyscale || 'AUTO'}</div>
            <div><strong style={{ color:'#fff' }}>Time Sig:</strong> {take?.timesignature || 'AUTO'}</div>
            <div><strong style={{ color:'#fff' }}>Language:</strong> {take?.vocal_language || 'AUTO'}</div>
            <div><strong style={{ color:'#fff' }}>Tokens:</strong> {tokenCount}</div>
        </div>

        {/* Prompt/Tags Scroll Box */}
        <div style={{ borderTop: '1px solid #222', paddingTop: '8px', display: 'flex', flexDirection: 'column', flexShrink: 0, minWidth: 0 }}>
            <div style={{ fontSize: '10px', color: tColor, marginBottom: '4px' }}>PROMPT_TAGS:</div>
            <div style={{ height: '50px', overflow: 'hidden', position: 'relative' }}>
                <div style={{ animation: 'marqueeVertical 10s linear infinite', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ paddingBottom: '10px', fontSize: '11px', color: '#ddd', wordBreak: 'break-word' }}>{take?.caption || '// No tags found.'}</div>
                    <div style={{ paddingBottom: '10px', fontSize: '11px', color: '#ddd', wordBreak: 'break-word' }}>{take?.caption || '// No tags found.'}</div>
                </div>
            </div>
        </div>

        {/* Lyrics Structure Scroll Box */}
        <div style={{ borderTop: '1px solid #222', paddingTop: '8px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, minWidth: 0 }}>
            <div style={{ fontSize: '10px', color: '#ff00ff', marginBottom: '4px' }}>STRUCTURAL_DNA (LYRICS):</div>
            <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                <div style={{ animation: 'marqueeVertical 20s linear infinite', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ paddingBottom: '20px', fontSize: '12px', color: '#eee', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{take?.lyrics || "// No structural data found."}</div>
                    <div style={{ paddingBottom: '20px', fontSize: '12px', color: '#eee', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{take?.lyrics || "// No structural data found."}</div>
                </div>
            </div>
        </div>
      </div>

      {/* Media Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', padding: '0 8px' }}>
        <button 
          onClick={onSkip} 
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.8 }}
          onMouseOver={e => e.currentTarget.style.opacity = 1}
          onMouseOut={e => e.currentTarget.style.opacity = 0.8}
        >
          <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#111', border: '1px solid rgba(255,0,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
            <svg style={{ width: '16px', height: '16px', color: '#ff00ff' }} fill="currentColor" viewBox="0 0 24 24"><path d="M4 18l8.5-6L4 6v12zm9 0l8.5-6-8.5-6v12z"/></svg>
          </div>
          <span style={{ fontSize: '9px', color: '#ff00ff', letterSpacing: '2px' }}>SKIP</span>
        </button>

        {onAbort && (
            <button 
                onClick={onAbort} 
                style={{ background: 'rgba(255,51,51,0.05)', border: '1px dashed rgba(255,51,51,0.5)', color: '#FF3333', fontSize: '9px', fontWeight: 'bold', padding: '6px 12px', borderRadius: '4px', letterSpacing: '2px', cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseOver={e => { e.currentTarget.style.background = 'rgba(255,51,51,0.2)'; e.currentTarget.style.boxShadow = '0 0 10px rgba(255,51,51,0.3)'; }}
                onMouseOut={e => { e.currentTarget.style.background = 'rgba(255,51,51,0.05)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
                [ YEET ]
            </button>
        )}

        <button 
          onClick={handleRender} 
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#002233', border: `1px solid ${tColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 15px ${tColor}40`, transition: 'all 0.2s' }}>
            <svg style={{ width: '20px', height: '20px', color: tColor }} fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
          <span style={{ fontSize: '9px', color: tColor, fontWeight: 'bold', letterSpacing: '2px' }}>RENDER</span>
        </button>
      </div>

      {/* Upgraded LLM Output Data Modal / Matrix Inspector */}
      {showRawData && (
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 100,
          background: 'rgba(7, 4, 12, 0.98)',
          backdropFilter: 'blur(12px)',
          borderRadius: '12px',
          padding: '14px',
          border: `1px solid ${tColor}`,
          boxShadow: `0 0 30px ${tColor}35, inset 0 0 20px rgba(0,0,0,0.9)`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}>
          {/* Header Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
            borderBottom: `1px dashed ${tColor}50`,
            paddingBottom: '8px',
            flexShrink: 0
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#00FF41', fontSize: '10px', animation: 'csd-pulse 1s infinite' }}>●</span>
              <span style={{ color: tColor, fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.08em' }}>
                LLM_BLUEPRINT_DATA
              </span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => handleCopy(activeTab === 'json' ? JSON.stringify(take, null, 2) : take, 'all')}
                style={{
                  background: copiedField === 'all' ? 'rgba(0,255,65,0.2)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${copiedField === 'all' ? '#00FF41' : `${tColor}40`}`,
                  color: copiedField === 'all' ? '#00FF41' : '#fff',
                  padding: '3px 8px',
                  borderRadius: '4px',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s'
                }}
                title="Copy entire blueprint JSON"
              >
                {copiedField === 'all' ? '✓ COPIED' : '📋 COPY ALL'}
              </button>
              <button 
                onClick={() => setShowRawData(false)} 
                style={{
                  background: 'rgba(255,51,51,0.1)',
                  border: '1px solid rgba(255,51,51,0.3)',
                  color: '#FF5555',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  width: '24px',
                  height: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  lineHeight: 1
                }}
                title="Close overlay"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Tab Selection */}
          <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexShrink: 0 }}>
            <button
              onClick={() => setActiveTab('inspector')}
              style={{
                flex: 1,
                padding: '6px 8px',
                fontSize: '9px',
                fontWeight: 'bold',
                letterSpacing: '0.05em',
                background: activeTab === 'inspector' ? `${tColor}25` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${activeTab === 'inspector' ? tColor : 'rgba(255,255,255,0.1)'}`,
                color: activeTab === 'inspector' ? tColor : '#888',
                borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.2s',
                boxShadow: activeTab === 'inspector' ? `0 0 8px ${tColor}30` : 'none'
              }}
            >
              📑 BLUEPRINT MATRIX
            </button>
            <button
              onClick={() => setActiveTab('json')}
              style={{
                flex: 1,
                padding: '6px 8px',
                fontSize: '9px',
                fontWeight: 'bold',
                letterSpacing: '0.05em',
                background: activeTab === 'json' ? `${tColor}25` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${activeTab === 'json' ? tColor : 'rgba(255,255,255,0.1)'}`,
                color: activeTab === 'json' ? tColor : '#888',
                borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.2s',
                boxShadow: activeTab === 'json' ? `0 0 8px ${tColor}30` : 'none'
              }}
            >
              👾 RAW JSON
            </button>
          </div>

          {/* Tab 1: Formatted Blueprint Matrix Inspector */}
          {activeTab === 'inspector' && (
            <div style={{
              flex: 1,
              overflowY: 'auto',
              overflowX: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              paddingRight: '4px',
              paddingBottom: '20px',
              minWidth: 0
            }}>
              {/* Musical DNA Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '6px',
                background: 'rgba(0,0,0,0.45)',
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.08)',
                flexShrink: 0
              }}>
                {take?.bpm ? <div style={{ fontSize: '10px' }}><span style={{ color: '#777' }}>BPM: </span><span style={{ color: tColor, fontWeight: 'bold' }}>{take.bpm}</span></div> : null}
                {take?.keyscale ? <div style={{ fontSize: '10px' }}><span style={{ color: '#777' }}>KEY: </span><span style={{ color: tColor, fontWeight: 'bold' }}>{take.keyscale}</span></div> : null}
                {take?.duration ? <div style={{ fontSize: '10px' }}><span style={{ color: '#777' }}>DURATION: </span><span style={{ color: '#fff', fontWeight: 'bold' }}>{take.duration}s</span></div> : null}
                {take?.timesignature ? <div style={{ fontSize: '10px' }}><span style={{ color: '#777' }}>TIME SIG: </span><span style={{ color: '#fff' }}>{take.timesignature}</span></div> : null}
                {take?.vocal_language ? <div style={{ fontSize: '10px' }}><span style={{ color: '#777' }}>LANG: </span><span style={{ color: '#fff' }}>{take.vocal_language}</span></div> : null}
                <div style={{ fontSize: '10px' }}><span style={{ color: '#777' }}>TOKENS: </span><span style={{ color: '#00FF41', fontWeight: 'bold' }}>{tokenCount}</span></div>
                {take?.seed !== undefined && (
                  <div style={{ fontSize: '10px', gridColumn: 'span 2' }}><span style={{ color: '#777' }}>SEED: </span><span style={{ color: '#ffaa00' }}>{take.seed}</span></div>
                )}
              </div>

              {/* Prompt / Caption Card */}
              <div style={{
                background: 'rgba(0,0,0,0.5)',
                borderRadius: '6px',
                border: `1px solid ${tColor}30`,
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                flexShrink: 0,
                height: 'auto',
                boxSizing: 'border-box'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', color: tColor, fontWeight: 'bold', letterSpacing: '0.05em' }}>PROMPT_TAGS:</span>
                  <button
                    onClick={() => handleCopy(take?.caption, 'prompt')}
                    style={{ background: 'none', border: 'none', color: copiedField === 'prompt' ? '#00FF41' : '#888', cursor: 'pointer', fontSize: '9px', padding: 0 }}
                  >
                    {copiedField === 'prompt' ? '✓ COPIED' : '[COPY]'}
                  </button>
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#ddd',
                  lineHeight: '1.4',
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                  whiteSpace: 'pre-wrap'
                }}>
                  {take?.caption || '// No prompt tags found.'}
                </div>
              </div>

              {/* Lyrics / Song Structure Card */}
              <div style={{
                background: 'rgba(0,0,0,0.5)',
                borderRadius: '6px',
                border: '1px solid rgba(255,0,255,0.35)',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                flexShrink: 0,
                height: 'auto',
                minHeight: 'fit-content',
                boxSizing: 'border-box'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '10px', color: '#ff00ff', fontWeight: 'bold', letterSpacing: '0.05em' }}>STRUCTURAL_DNA (LYRICS):</span>
                  <button
                    onClick={() => handleCopy(take?.lyrics, 'lyrics')}
                    style={{ background: 'none', border: 'none', color: copiedField === 'lyrics' ? '#00FF41' : '#888', cursor: 'pointer', fontSize: '9px', padding: 0 }}
                  >
                    {copiedField === 'lyrics' ? '✓ COPIED' : '[COPY]'}
                  </button>
                </div>
                <div style={{
                  fontSize: '11px',
                  color: '#eee',
                  lineHeight: '1.45',
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                  whiteSpace: 'pre-wrap',
                  height: 'auto'
                }}>
                  {take?.lyrics || '// No lyrics or structural tags found.'}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Clean Wrapping Raw JSON View */}
          {activeTab === 'json' && (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              minWidth: 0,
              gap: '6px'
            }}>
              {/* Token Condensation Toolbar */}
              {tokenCount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.4)', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                  <span style={{ fontSize: '9px', color: '#888' }}>
                    {expandTokens ? `⚠️ Displaying all ${tokenCount} codes` : `Condensed ${tokenCount} tokens`}
                  </span>
                  <button
                    onClick={() => setExpandTokens(!expandTokens)}
                    style={{
                      background: expandTokens ? 'rgba(255,170,0,0.15)' : 'rgba(0,255,65,0.1)',
                      border: `1px solid ${expandTokens ? '#ffaa00' : 'rgba(0,255,65,0.4)'}`,
                      color: expandTokens ? '#ffaa00' : '#00FF41',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontSize: '8px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontFamily: 'inherit'
                    }}
                  >
                    {expandTokens ? 'CONDENSE TOKENS' : 'EXPAND TOKENS'}
                  </button>
                </div>
              )}

              {/* Monospace Wrapped JSON Dump */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                overflowX: 'hidden',
                background: 'rgba(0,0,0,0.75)',
                border: '1px solid rgba(0,255,65,0.25)',
                borderRadius: '6px',
                padding: '10px',
                fontSize: '10px',
                color: '#00FF41',
                lineHeight: '1.45',
                fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                overflowWrap: 'anywhere',
                boxSizing: 'border-box'
              }}>
                {getDisplayJson()}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default TakeCartridge;

