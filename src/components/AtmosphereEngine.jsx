import React, { useMemo } from 'react';

export const AtmosphereEngine = React.memo(({ waifu, revealPhase }) => {
    if (!waifu) return null;

    const textToScan = useMemo(() => {
        return ((waifu.image_prompt || '') + ' ' + (waifu.tags || []).join(' ')).toLowerCase();
    }, [waifu.image_prompt, waifu.tags]);

    const isSSR = waifu.isSSR && revealPhase === 'revealed';

    const layers = useMemo(() => {
        const has = (words) => words.some(w => textToScan.includes(w));
        return {
            rain: has(['rain', 'storm', 'wet', 'umbrella', 'gloomy']),
            ember: has(['fire', 'flame', 'ember', 'battle', 'demon', 'hell', 'dragon', 'volcano', 'ash', 'burn', 'lava']),
            sakura: has(['sakura', 'cherry blossom', 'shrine', 'samurai', 'spring', 'kimono', 'japan', 'festival', 'miko', 'ninja']),
            lust: has(['succubus', 'yandere', 'bath', 'aphrodisiac', 'lewd', 'explicit', 'nude', 'corrupt', 'tentacle', 'harem', 'lust']),
            // Overlays!
            vivid: true, // Always apply a slight cinematic contrast pop
            holoPop: isSSR || has(['hologram', 'magic', 'goddess', 'divine', 'idol', 'cyberpunk', 'neon']),
            rimLight: true, // Always give a beautiful edge light!
            sparkle: true // Always add baseline magic
        };
    }, [textToScan, isSSR]);

    const particles = useMemo(() => {
        let pList = [];
        let pId = 0;
        const addParticles = (type, count, sizeMult) => {
            for (let i = 0; i < count; i++) {
                pList.push({
                    id: pId++,
                    type: type,
                    size: (Math.random() * 8 + 6) * sizeMult,
                    left: Math.random() * 95 + 2,
                    dur: Math.random() * 3 + 3,
                    delay: Math.random() * 3
                });
            }
        };

        if (layers.sparkle) addParticles('sparkle', 12, 1);
        if (layers.ember) addParticles('ember', 16, 1.3);
        if (layers.sakura) addParticles('sakura', 24, 1.5);
        if (layers.lust) addParticles('lust', 14, 1.6);

        return pList;
    }, [waifu.id, layers]);

    if (waifu.id === 'intro') return null;

    return (
        <div className="mika-atmosphere">
            {/* Overlays that POP! */}
            {layers.vivid && <div className="mika-vivid"></div>}
            {layers.rimLight && <div className="mika-rim-light"></div>}
            {layers.holoPop && <div className="mika-holo-pop"></div>}

            {/* Weather */}
            {layers.rain && <div className="mika-rain"></div>}

            {/* Crisp Particles */}
            {particles.map(p => {
                let style = { left: `${p.left}%`, animationDelay: `-${p.delay}s`, animationDuration: `${p.dur}s` };
                let content = '';

                if (p.type === 'ember') {
                    style = { ...style, width: p.size, height: p.size, background: '#FF4500', borderRadius: '50%', boxShadow: '0 0 12px #FFA500, 0 0 4px #FFF', animationName: 'floatUp', bottom: '-10%' };
                } else if (p.type === 'sakura') {
                    style = { ...style, width: p.size * 1.3, height: p.size * 1.3, background: 'linear-gradient(135deg, #FFB7C5, #FFF)', borderRadius: '50% 0 50% 0', animationName: 'fallDownSakura', top: '-10%', filter: 'drop-shadow(0 0 3px rgba(255,183,197,0.8))' };
                } else if (p.type === 'lust') {
                    style = { ...style, fontSize: `${p.size + 12}px`, animationName: 'floatUp', bottom: '-10%', color: '#FF107A', textShadow: '0 0 8px #FF107A, 0 0 15px #FFF' };
                    content = '♥';
                } else {
                    style = { ...style, width: p.size / 2, height: p.size / 2, background: '#FFF', borderRadius: '50%', boxShadow: '0 0 10px #FFF, 0 0 4px #00E5FF', animationName: 'twinkle', top: `${p.left}%` };
                }

                return <div key={p.id} className="mika-particle" style={style}>{content}</div>;
            })}
        </div>
    );
});
