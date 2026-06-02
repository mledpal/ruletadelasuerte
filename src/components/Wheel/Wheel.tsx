import { useState, useMemo, useEffect, useCallback } from 'react';
import { useGame } from '../../context/GameContext';
import type { WheelResult, SpecialWheelResult } from '../../types/game';
import styles from './Wheel.module.css';

const LIGHT_BG = new Set(['#ffd60a', '#ffd700', '#e9ecef', '#70e000']);

interface WheelProps {
  onResult?: (result: WheelResult) => void;
  onClose?: () => void;
  autoSpin?: boolean;
}

export function Wheel({ onResult, onClose, autoSpin }: WheelProps) {
  const { state, dispatch } = useGame();
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<WheelResult | null>(null);

  const castulo = state.castuloMode;

  const isBoteRound =
    state.boteRoundEnabled &&
    state.currentRound === state.totalRounds &&
    state.players.length >= 2;

  const WHEEL_SEGMENTS = useMemo(() => {
    // En modo Cástulo las casillas muestran solo la cifra (sin moneda).
    const money = (n: number) => (castulo ? `${n}` : `${n}€`);

    const comodinSlot = state.wildcardAvailable
      ? { value: 'COMODIN' as WheelResult, color: '#ffd700', label: 'COMODÍN' }
      : { value: 400 as WheelResult,       color: '#ffd700', label: money(400) };

    const boteLabel = `¡BOTE!\n${state.boteAmount.toLocaleString('es-ES')}${castulo ? '' : '€'}`;
    const boteSlot = isBoteRound
      ? { value: 'BOTE' as WheelResult, color: '#ff1493', label: boteLabel }
      : { value: 100 as WheelResult,    color: '#e63946', label: money(100) };

    const base: { value: WheelResult; color: string; label: string }[] = [
      { value: 'QUIEBRA' as WheelResult,     color: '#1a1a2e', label: 'QUIEBRA'       }, //  0
      { value: 100,                           color: '#0096c7', label: money(100)      }, //  1
      { value: 200,                           color: '#7b2d8b', label: money(200)      }, //  2
      { value: 75,                            color: '#43aa8b', label: money(75)       }, //  3
      { value: 300,                           color: '#e63946', label: money(300)      }, //  4
      { value: 50,                            color: '#ffd60a', label: money(50)       }, //  5
      { value: 150,                           color: '#0077b6', label: money(150)      }, //  6
      { value: 'PIERDE_TURNO' as WheelResult, color: '#e9ecef', label: 'PIERDE\nTURNO' }, //  7
      { value: 25,                            color: '#70e000', label: money(25)       }, //  8
      { value: 400,                           color: '#f77f00', label: money(400)      }, //  9
      boteSlot,                                                                           // 10
      { value: 75,                            color: '#ffd60a', label: money(75)       }, // 11
      { value: 'QUIEBRA' as WheelResult,     color: '#1a1a2e', label: 'QUIEBRA'       }, // 12
      { value: 200,                           color: '#0096c7', label: money(200)      }, // 13
      { value: 500,                           color: '#7b2d8b', label: money(500)      }, // 14
      { value: 'PIERDE_TURNO' as WheelResult, color: '#e9ecef', label: 'PIERDE\nTURNO' }, // 15
      { value: 50,                            color: '#43aa8b', label: money(50)       }, // 16
      { value: 750,                           color: '#e63946', label: money(750)      }, // 17
      { value: 100,                           color: '#ffd60a', label: money(100)      }, // 18
      { value: 25,                            color: '#0077b6', label: money(25)       }, // 19
      { value: 300,                           color: '#f77f00', label: money(300)      }, // 20
      { value: 75,                            color: '#7b2d8b', label: money(75)       }, // 21
      comodinSlot,                                                                        // 22
      { value: 'PIERDE_TURNO' as WheelResult, color: '#e9ecef', label: 'PIERDE\nTURNO' }, // 23
    ];

    if (!castulo) return base;

    // Gajos exclusivos del modo Cástulo. Los coleccionables (Aníbal, Himilce,
    // Escipión) solo aparecen si ningún jugador los posee todavía.
    const owns = (key: 'hasAnibal' | 'hasHimilce' | 'hasEscipion') =>
      state.players.some((p) => p[key]);

    const extras: { value: WheelResult; color: string; label: string }[] = [];
    extras.push({ value: 'ASEDIO' as WheelResult, color: '#212121', label: 'ASEDIO' });
    if (!owns('hasAnibal'))   extras.push({ value: 'ANIBAL' as WheelResult,   color: '#7b1fa2', label: 'ANÍBAL'   });
    if (!owns('hasHimilce'))  extras.push({ value: 'HIMILCE' as WheelResult,  color: '#00838f', label: 'HIMILCE'  });
    if (!owns('hasEscipion')) extras.push({ value: 'ESCIPION' as WheelResult, color: '#b71c1c', label: 'ESCIPIÓN' });

    // Repartir los gajos nuevos de forma uniforme entre los existentes.
    const result = [...base];
    const step = Math.floor(base.length / (extras.length + 1));
    extras.forEach((seg, i) => {
      result.splice((i + 1) * step + i, 0, seg);
    });
    return result;
  }, [castulo, state.wildcardAvailable, state.players, state.boteAmount, isBoteRound]);

  const segmentCount = WHEEL_SEGMENTS.length;
  const segmentAngle = 360 / segmentCount;
  const R  = 240;  // radio exterior del segmento
  const CX = 260;  // centro X
  const CY = 260;  // centro Y

  // Con más gajos (modo Cástulo) reducimos el tamaño del texto para que quepa.
  const numFont     = segmentCount > 24 ? 14 : 16;
  const specialFont = segmentCount > 24 ? 10 : 11;

  const createSegmentPath = (index: number): string => {
    const startAngle = (index * segmentAngle - 90) * (Math.PI / 180);
    const endAngle   = ((index + 1) * segmentAngle - 90) * (Math.PI / 180);
    const x1 = CX + R * Math.cos(startAngle);
    const y1 = CY + R * Math.sin(startAngle);
    const x2 = CX + R * Math.cos(endAngle);
    const y2 = CY + R * Math.sin(endAngle);
    return `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2} Z`;
  };

  const getTextPos = (index: number) => {
    const mid = ((index + 0.5) * segmentAngle - 90) * (Math.PI / 180);
    const tr  = R * 0.67;
    return {
      x:   CX + tr * Math.cos(mid),
      y:   CY + tr * Math.sin(mid),
      rot: (index + 0.5) * segmentAngle,
    };
  };

  const handleSpin = useCallback(() => {
    if (isSpinning || state.isRevealing) return;

    setIsSpinning(true);
    setLastResult(null);

    const randomIndex   = Math.floor(Math.random() * WHEEL_SEGMENTS.length);
    const selected      = WHEEL_SEGMENTS[randomIndex];
    const extraSpins    = 5 * 360;
    const segCenter     = randomIndex * segmentAngle + segmentAngle / 2;
    const normCurrent   = rotation % 360;
    const targetAngle   = (360 - segCenter) % 360;
    const angleDiff     = ((targetAngle - normCurrent) % 360 + 360) % 360;
    const targetRotation = extraSpins + angleDiff;

    setRotation(rotation + targetRotation);

    setTimeout(() => {
      if (typeof selected.value === 'number') {
        dispatch({ type: 'SPIN_WHEEL', payload: selected.value });
      } else {
        dispatch({ type: 'SPIN_WHEEL_SPECIAL', payload: selected.value as SpecialWheelResult });
      }
      setLastResult(selected.value);
      setIsSpinning(false);
      onResult?.(selected.value);
      if (onClose) setTimeout(onClose, 1500);
    }, 4000);
  }, [isSpinning, state.isRevealing, WHEEL_SEGMENTS, segmentAngle, rotation, dispatch, onResult, onClose]);

  // Auto-girar al montar (cuando se abre el modal)
  useEffect(() => {
    if (!autoSpin) return;
    const t = setTimeout(handleSpin, 600);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getResultText = () => {
    if (!lastResult) return '';
    if (lastResult === 'QUIEBRA')      return '¡QUIEBRA!';
    if (lastResult === 'PIERDE_TURNO') return '¡PIERDE TURNO!';
    if (lastResult === 'COMODIN')      return '¡COMODÍN!';
    if (lastResult === 'BOTE')         return '¡BOTE!';
    if (lastResult === 'ANIBAL')       return '¡ANÍBAL!';
    if (lastResult === 'HIMILCE')      return '¡HIMILCE!';
    if (lastResult === 'ESCIPION')     return '¡ESCIPIÓN!';
    if (lastResult === 'ASEDIO')       return '¡ASEDIO!';
    // En modo Cástulo se muestra solo la cifra, sin moneda.
    return castulo ? `${lastResult}` : `${lastResult} €`;
  };

  const getResultClass = () => {
    if (!lastResult) return '';
    if (lastResult === 'QUIEBRA' || lastResult === 'PIERDE_TURNO' || lastResult === 'ASEDIO') return styles.negativeResult;
    if (lastResult === 'COMODIN' || lastResult === 'ANIBAL' || lastResult === 'HIMILCE' || lastResult === 'ESCIPION') return styles.wildcardResult;
    if (lastResult === 'BOTE')    return styles.boteResult;
    return styles.positiveResult;
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modalInner}>
        <div className={styles.modalTitle}>{castulo ? 'LA RULETA DE CÁSTULO' : 'LA RULETA DE LA SUERTE'}</div>

        <div className={`${styles.wheelWrapper} ${castulo ? styles.wheelWrapperCastulo : ''}`}>
          <div className={styles.pointer} />
          <svg
            className={`${styles.wheelSvg} ${castulo ? styles.wheelSvgCastulo : ''}`}
            width="520"
            height="520"
            viewBox="0 0 520 520"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <defs>
              <linearGradient id="rimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"   stopColor="#fffbcc" />
                <stop offset="40%"  stopColor="#ffd700" />
                <stop offset="70%"  stopColor="#c8a400" />
                <stop offset="100%" stopColor="#ffd700" />
              </linearGradient>
              <radialGradient id="hubGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stopColor="#1e2d82" />
                <stop offset="100%" stopColor="#080e3d" />
              </radialGradient>
            </defs>

            {/* Aro exterior dorado */}
            <circle cx={CX} cy={CY} r={R + 16} fill="url(#rimGrad)" />
            <circle cx={CX} cy={CY} r={R + 2}  fill="#7a5c00" />

            {/* Segmentos */}
            {WHEEL_SEGMENTS.map((seg, i) => {
              const path        = createSegmentPath(i);
              const { x, y, rot } = getTextPos(i);
              const isWildcard  = seg.value === 'COMODIN';
              const isSpecial   =
                seg.value === 'QUIEBRA' ||
                seg.value === 'PIERDE_TURNO' ||
                seg.value === 'ASEDIO' ||
                seg.value === 'ANIBAL' ||
                seg.value === 'HIMILCE' ||
                seg.value === 'ESCIPION';
              const textFill    = LIGHT_BG.has(seg.color) ? '#1a1a2e' : '#ffffff';

              return (
                <g key={i}>
                  <path d={path} fill={seg.color} stroke="#c8a400" strokeWidth="1.5" />

                  {isWildcard && (
                    <text
                      x={x} y={y - 13}
                      fill={textFill}
                      fontSize="20" fontWeight="bold"
                      textAnchor="middle" dominantBaseline="middle"
                      transform={`rotate(${rot} ${x} ${y - 13})`}
                    >★</text>
                  )}

                  <text
                    x={x} y={isWildcard ? y + 9 : y}
                    fill={textFill}
                    fontSize={isSpecial ? specialFont : numFont}
                    fontWeight="900"
                    textAnchor="middle" dominantBaseline="middle"
                    fontFamily="'Bebas Neue', Impact, sans-serif"
                    letterSpacing="0.5"
                    transform={`rotate(${rot} ${x} ${isWildcard ? y + 9 : y})`}
                  >
                    {seg.label.includes('\n') ? (
                      <>
                        <tspan x={x} dy="-7">{seg.label.split('\n')[0]}</tspan>
                        <tspan x={x} dy="15">{seg.label.split('\n')[1]}</tspan>
                      </>
                    ) : seg.label}
                  </text>
                </g>
              );
            })}

            {/* Centro */}
            <circle cx={CX} cy={CY} r="57" fill="#0a0f3d" stroke="#ffd700" strokeWidth="5" />
            <circle cx={CX} cy={CY} r="51" fill="url(#hubGrad)" />
            {castulo ? (
              <>
                <text x={CX} y={CY - 10} fill="white"    fontSize="9" fontWeight="bold"
                  textAnchor="middle" dominantBaseline="middle"
                  fontFamily="'Poppins', sans-serif" letterSpacing="0.5">La ruleta de</text>
                <text x={CX} y={CY + 12} fill="#ffd700"  fontSize="18" fontWeight="bold"
                  textAnchor="middle" dominantBaseline="middle"
                  fontFamily="'Bebas Neue', sans-serif" letterSpacing="1.5">CÁSTULO</text>
              </>
            ) : (
              <>
                <text x={CX} y={CY - 14} fill="white"    fontSize="10" fontWeight="bold"
                  textAnchor="middle" dominantBaseline="middle"
                  fontFamily="'Poppins', sans-serif" letterSpacing="0.5">La ruleta</text>
                <text x={CX} y={CY - 1}  fill="#ffd700"  fontSize="8"
                  textAnchor="middle" dominantBaseline="middle"
                  fontFamily="'Poppins', sans-serif">de la</text>
                <text x={CX} y={CY + 14} fill="white"    fontSize="14" fontWeight="bold"
                  textAnchor="middle" dominantBaseline="middle"
                  fontFamily="'Bebas Neue', sans-serif" letterSpacing="1">SUERTE</text>
              </>
            )}
          </svg>
        </div>

        <div className={styles.resultArea}>
          {isSpinning && <div className={styles.spinning}>¡Girando…</div>}
          {!isSpinning && lastResult && (
            <div className={`${styles.result} ${getResultClass()}`}>
              {getResultText()}
            </div>
          )}
          {!isSpinning && !lastResult && !autoSpin && (
            <button
              onClick={handleSpin}
              className={styles.spinBtn}
              disabled={state.isRevealing}
            >
              ¡GIRAR!
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
