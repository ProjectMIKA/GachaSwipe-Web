import React from 'react';

export const DawTabToggles = ({ dawState, setDawState, tColor }) => (
    <div style={{ display: 'flex', gap: '4px', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '8px', border: `1px solid ${tColor}20`, margin: '16px 0', width: '100%' }}>
        <button 
            onClick={() => setDawState(p => ({ ...p, engineTab: 'studio' }))}
            style={{ 
                flex: 1, padding: '10px 0', fontSize: '11px', fontWeight: 'bold', fontFamily: "monospace", borderRadius: '4px', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                background: (!dawState.engineTab || dawState.engineTab === 'studio') ? `${tColor}25` : 'transparent', 
                border: 'none',
                color: (!dawState.engineTab || dawState.engineTab === 'studio') ? '#fff' : 'rgba(255,255,255,0.3)',
                boxShadow: (!dawState.engineTab || dawState.engineTab === 'studio') ? `0 0 15px ${tColor}30, inset 0 0 10px ${tColor}20` : 'none',
                textShadow: (!dawState.engineTab || dawState.engineTab === 'studio') ? `0 0 10px ${tColor}` : 'none'
            }}
        >
            [ STUDIO DAW ]
        </button>
        <button 
            onClick={() => setDawState(p => ({ ...p, engineTab: 'chimera' }))}
            style={{ 
                flex: 1, padding: '10px 0', fontSize: '11px', fontWeight: 'bold', fontFamily: "monospace", borderRadius: '4px', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                background: dawState.engineTab === 'chimera' ? 'rgba(255, 215, 0, 0.2)' : 'transparent', 
                border: 'none',
                color: dawState.engineTab === 'chimera' ? '#FFD700' : 'rgba(255,255,255,0.3)',
                boxShadow: dawState.engineTab === 'chimera' ? `0 0 15px rgba(255,215,0,0.3), inset 0 0 10px rgba(255,215,0,0.2)` : 'none',
                textShadow: dawState.engineTab === 'chimera' ? `0 0 10px #FFD700` : 'none'
            }}
        >
            [ CHIMERA ENGINE ]
        </button>
    </div>
);
