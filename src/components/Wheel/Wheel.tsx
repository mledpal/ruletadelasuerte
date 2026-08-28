import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import * as THREE from 'three';
import { useGame } from '../../context/GameContext';
import type { WheelResult, SpecialWheelResult } from '../../types/game';
import { playWheelTick, playBankruptSound, playError, playDing, playJackpotSound } from '../../utils/audio';
import styles from './Wheel.module.css';

const LIGHT_BG = new Set(['#ffd60a', '#ffd700', '#e9ecef', '#70e000', '#f1faee', '#e0f2fe']);

interface WheelProps {
  onResult?: (result: WheelResult) => void;
  onClose?: () => void;
  autoSpin?: boolean;
}

export function Wheel({ onResult, onClose, autoSpin }: WheelProps) {
  const { state, dispatch } = useGame();
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastResult, setLastResult] = useState<WheelResult | null>(null);

  const mountRef = useRef<HTMLDivElement>(null);
  const wheelGroupRef = useRef<THREE.Group | null>(null);
  const flapperMeshRef = useRef<THREE.Group | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const currentRotationRef = useRef<number>(0);
  const lastPegRef = useRef<number>(-1);

  const castulo = state.castuloMode;

  const isBoteRound =
    state.boteRoundEnabled &&
    state.currentRound === state.totalRounds &&
    state.players.length >= 2;

  const WHEEL_SEGMENTS = useMemo(() => {
    const money = (n: number) => (castulo ? `${n}` : `${n}€`);

    const comodinSlot = state.wildcardAvailable
      ? { value: 'COMODIN' as WheelResult, color: '#f59e0b', label: 'COMODÍN', textColor: '#1a0e00', isSpecial: true }
      : { value: 400 as WheelResult,       color: '#ffd700', label: money(400),   textColor: '#1a0e00', isSpecial: false };

    const boteLabel = `¡BOTE!\n${state.boteAmount.toLocaleString('es-ES')}${castulo ? '' : '€'}`;
    const boteSlot = isBoteRound
      ? { value: 'BOTE' as WheelResult, color: '#ec4899', label: boteLabel,  textColor: '#ffffff', isSpecial: true }
      : { value: 100 as WheelResult,    color: '#ef4444', label: money(100),  textColor: '#ffffff', isSpecial: false };

    const base: { value: WheelResult; color: string; label: string; textColor?: string; isSpecial?: boolean }[] = [
      { value: 'QUIEBRA' as WheelResult,     color: '#0f172a', label: 'QUIEBRA',       textColor: '#ffffff', isSpecial: true }, //  0
      { value: 100,                           color: '#0284c7', label: money(100),      textColor: '#ffffff' }, //  1
      { value: 200,                           color: '#9333ea', label: money(200),      textColor: '#ffffff' }, //  2
      { value: 75,                            color: '#059669', label: money(75),       textColor: '#ffffff' }, //  3
      { value: 300,                           color: '#dc2626', label: money(300),      textColor: '#ffffff' }, //  4
      { value: 50,                            color: '#eab308', label: money(50),       textColor: '#1a0e00' }, //  5
      { value: 150,                           color: '#2563eb', label: money(150),      textColor: '#ffffff' }, //  6
      { value: 'PIERDE_TURNO' as WheelResult, color: '#475569', label: 'PIERDE\nTURNO', textColor: '#ffffff', isSpecial: true }, //  7
      { value: 25,                            color: '#65a30d', label: money(25),       textColor: '#ffffff' }, //  8
      { value: 400,                           color: '#ea580c', label: money(400),      textColor: '#ffffff' }, //  9
      boteSlot,                                                                                                  // 10
      { value: 75,                            color: '#eab308', label: money(75),       textColor: '#1a0e00' }, // 11
      { value: 'QUIEBRA' as WheelResult,     color: '#0f172a', label: 'QUIEBRA',       textColor: '#ffffff', isSpecial: true }, // 12
      { value: 200,                           color: '#0284c7', label: money(200),      textColor: '#ffffff' }, // 13
      { value: 500,                           color: '#9333ea', label: money(500),      textColor: '#ffffff' }, // 14
      { value: 'PIERDE_TURNO' as WheelResult, color: '#475569', label: 'PIERDE\nTURNO', textColor: '#ffffff', isSpecial: true }, // 15
      { value: 50,                            color: '#059669', label: money(50),       textColor: '#ffffff' }, // 16
      { value: 750,                           color: '#dc2626', label: money(750),      textColor: '#ffffff' }, // 17
      { value: 100,                           color: '#eab308', label: money(100),      textColor: '#1a0e00' }, // 18
      { value: 25,                            color: '#2563eb', label: money(25),       textColor: '#ffffff' }, // 19
      { value: 300,                           color: '#ea580c', label: money(300),      textColor: '#ffffff' }, // 20
      { value: 75,                            color: '#9333ea', label: money(75),       textColor: '#ffffff' }, // 21
      comodinSlot,                                                                                               // 22
      { value: 'PIERDE_TURNO' as WheelResult, color: '#475569', label: 'PIERDE\nTURNO', textColor: '#ffffff', isSpecial: true }, // 23
    ];

    if (!castulo) return base;

    const owns = (key: 'hasAnibal' | 'hasHimilce' | 'hasEscipion') =>
      state.players.some((p) => p[key]);

    const extras: { value: WheelResult; color: string; label: string; textColor?: string; isSpecial?: boolean }[] = [];
    extras.push({ value: 'ASEDIO' as WheelResult, color: '#18181b', label: 'ASEDIO', textColor: '#f87171', isSpecial: true });
    if (!owns('hasAnibal'))   extras.push({ value: 'ANIBAL' as WheelResult,   color: '#7e22ce', label: 'ANÍBAL',   textColor: '#ffd700', isSpecial: true });
    if (!owns('hasHimilce'))  extras.push({ value: 'HIMILCE' as WheelResult,  color: '#0e7490', label: 'HIMILCE',  textColor: '#ffffff', isSpecial: true });
    if (!owns('hasEscipion')) extras.push({ value: 'ESCIPION' as WheelResult, color: '#991b1b', label: 'ESCIPIÓN', textColor: '#ffd700', isSpecial: true });

    const result = [...base];
    const step = Math.floor(base.length / (extras.length + 1));
    extras.forEach((seg, i) => {
      result.splice((i + 1) * step + i, 0, seg);
    });
    return result;
  }, [castulo, state.wildcardAvailable, state.players, state.boteAmount, isBoteRound]);

  const segmentCount = WHEEL_SEGMENTS.length;
  const segmentAngle = 360 / segmentCount;

  // Generar textura 2D en alta resolución para la cara de la ruleta
  const generateWheelTexture = useCallback(() => {
    const size = 2048;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const cx = size / 2;
    const cy = size / 2;
    const radius = size * 0.48;

    // Fondo transparente
    ctx.clearRect(0, 0, size, size);

    // Dibujar cada segmento (0 = Arriba/12h, 1 = 1h sentido horario, ...)
    WHEEL_SEGMENTS.forEach((seg, i) => {
      // Límites angulares en canvas (0° = 3h, 90° = 6h, -90° = 12h)
      // Centro del gajo i: i * segmentAngle - 90
      const a1 = (i * segmentAngle - 90 - segmentAngle / 2) * (Math.PI / 180);
      const a2 = ((i + 1) * segmentAngle - 90 - segmentAngle / 2) * (Math.PI / 180);

      // 1. Superficie del gajo
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, a1, a2, false);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();

      // 2. Borde dorado entre gajos
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 6;
      ctx.stroke();

      // 3. Gradiente de volumen radial
      const grad = ctx.createRadialGradient(cx, cy, radius * 0.2, cx, cy, radius);
      grad.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
      grad.addColorStop(0.75, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();

      // 4. Texto del segmento
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(i * segmentAngle * (Math.PI / 180));

      const textFill = seg.textColor || (LIGHT_BG.has(seg.color) ? '#0f172a' : '#ffffff');
      ctx.fillStyle = textFill;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.95)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 4;

      const isWildcard = seg.value === 'COMODIN';
      const isSpecial = seg.isSpecial;
      const textRadius = radius * 0.68;

      if (isWildcard) {
        ctx.font = 'bold 80px sans-serif';
        ctx.fillText('★', 0, -textRadius - 38);
      }

      ctx.font = `900 ${isSpecial ? 52 : 74}px 'Bebas Neue', Impact, 'Arial Black', sans-serif`;

      if (seg.label.includes('\n')) {
        const lines = seg.label.split('\n');
        ctx.fillText(lines[0], 0, -textRadius - 26);
        ctx.fillText(lines[1], 0, -textRadius + 42);
      } else {
        ctx.fillText(seg.label, 0, -textRadius + (isWildcard ? 28 : 0));
      }

      ctx.restore();
    });

    // Aro exterior del disco
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.lineWidth = 14;
    ctx.strokeStyle = '#ffd700';
    ctx.stroke();
    ctx.restore();

    return canvas;
  }, [WHEEL_SEGMENTS, segmentAngle]);

  // Montar escena Three.js
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 540;
    const height = container.clientHeight || 540;

    // Escena
    const scene = new THREE.Scene();

    // Cámara con ángulo de estudio de TV inclinado
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, -3.2, 5.2);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.replaceChildren(renderer.domElement);
    rendererRef.current = renderer;

    // Luces de estudio
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    const mainSpot = new THREE.SpotLight(0xfff3d6, 4.5);
    mainSpot.position.set(2, -2, 6);
    mainSpot.angle = Math.PI / 3;
    mainSpot.penumbra = 0.5;
    mainSpot.castShadow = true;
    mainSpot.shadow.mapSize.width = 1024;
    mainSpot.shadow.mapSize.height = 1024;
    scene.add(mainSpot);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.8);
    rimLight.position.set(-4, 3, 3);
    scene.add(rimLight);

    const goldFill = new THREE.PointLight(0xffd700, 2.2, 8);
    goldFill.position.set(0, 0, 4);
    scene.add(goldFill);

    // 1. CHASIS EXTERIOR ESTÁTICO (Aro de acero con luces)
    const casingGroup = new THREE.Group();
    scene.add(casingGroup);

    // Aro dorado exterior
    const outerBezelGeo = new THREE.TorusGeometry(2.35, 0.12, 24, 64);
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.9,
      roughness: 0.2,
    });
    const outerBezel = new THREE.Mesh(outerBezelGeo, goldMat);
    outerBezel.castShadow = true;
    outerBezel.receiveShadow = true;
    casingGroup.add(outerBezel);

    // Aro interior de acero oscuro
    const innerRimGeo = new THREE.CylinderGeometry(2.32, 2.32, 0.18, 64, 1, true);
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.7,
      roughness: 0.4,
    });
    const innerRim = new THREE.Mesh(innerRimGeo, steelMat);
    innerRim.rotation.x = Math.PI / 2;
    casingGroup.add(innerRim);

    // Bombillas LED en el chasis
    const bulbCount = 28;
    const bulbGeo = new THREE.SphereGeometry(0.04, 16, 16);
    const bulbMatOn = new THREE.MeshStandardMaterial({
      color: 0xffea79,
      emissive: 0xffd700,
      emissiveIntensity: 1.5,
      roughness: 0.2,
    });
    for (let i = 0; i < bulbCount; i++) {
      const ang = (i * (360 / bulbCount)) * (Math.PI / 180);
      const bx = 2.35 * Math.cos(ang);
      const by = 2.35 * Math.sin(ang);
      const bulb = new THREE.Mesh(bulbGeo, bulbMatOn);
      bulb.position.set(bx, by, 0.1);
      casingGroup.add(bulb);
    }

    // 2. DISCO GIRATORIO 3D
    const wheelGroup = new THREE.Group();
    scene.add(wheelGroup);
    wheelGroupRef.current = wheelGroup;

    // Cara frontal del disco con textura plana CircleGeometry
    const canvasTexture = generateWheelTexture();
    const texture = canvasTexture ? new THREE.CanvasTexture(canvasTexture) : null;
    if (texture) {
      texture.anisotropy = 16;
      texture.colorSpace = THREE.SRGBColorSpace;
    }

    const discFaceMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.32,
      metalness: 0.12,
    });
    const discFaceGeo = new THREE.CircleGeometry(2.22, 64);
    const discFaceMesh = new THREE.Mesh(discFaceGeo, discFaceMat);
    discFaceMesh.position.z = 0.05;
    discFaceMesh.receiveShadow = true;
    wheelGroup.add(discFaceMesh);

    // Borde cilíndrico lateral dorado
    const discEdgeMat = new THREE.MeshStandardMaterial({
      color: 0xb48200,
      metalness: 0.85,
      roughness: 0.25,
    });
    const discEdgeGeo = new THREE.CylinderGeometry(2.22, 2.22, 0.10, 64, 1, true);
    const discEdgeMesh = new THREE.Mesh(discEdgeGeo, discEdgeMat);
    discEdgeMesh.rotation.x = Math.PI / 2;
    discEdgeMesh.castShadow = true;
    wheelGroup.add(discEdgeMesh);

    // Cara posterior del disco
    const discBackMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.6,
      metalness: 0.5,
    });
    const discBackMesh = new THREE.Mesh(discFaceGeo, discBackMat);
    discBackMesh.position.z = -0.05;
    wheelGroup.add(discBackMesh);

    // Clavijas metálicas 3D (Cilindro cromado + esfera en cada división angular)
    const pegCylinderGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.16, 16);
    const pegSphereGeo = new THREE.SphereGeometry(0.032, 16, 16);
    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.98,
      roughness: 0.08,
    });

    const pegR = 2.15;
    for (let i = 0; i < segmentCount; i++) {
      // Clavija en el límite antes del segmento i
      // theta = 90 - i * segmentAngle + segmentAngle / 2
      const thetaDeg = 90 - i * segmentAngle + segmentAngle / 2;
      const ang = thetaDeg * (Math.PI / 180);
      const px = pegR * Math.cos(ang);
      const py = pegR * Math.sin(ang);

      const pegGroup = new THREE.Group();
      pegGroup.position.set(px, py, 0.08);

      const pCyl = new THREE.Mesh(pegCylinderGeo, chromeMat);
      pCyl.rotation.x = Math.PI / 2;
      pCyl.castShadow = true;
      pegGroup.add(pCyl);

      const pSph = new THREE.Mesh(pegSphereGeo, chromeMat);
      pSph.position.set(0, 0, 0.08);
      pSph.castShadow = true;
      pegGroup.add(pSph);

      wheelGroup.add(pegGroup);
    }

    // 3. EJE CENTRAL 3D
    const hubGroup = new THREE.Group();
    hubGroup.position.set(0, 0, 0.08);
    wheelGroup.add(hubGroup);

    const hubOuterRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.58, 0.06, 24, 48),
      goldMat
    );
    hubOuterRing.castShadow = true;
    hubGroup.add(hubOuterRing);

    const hubDomeMat = new THREE.MeshStandardMaterial({
      color: castulo ? 0x881337 : 0x1e3a8a,
      roughness: 0.25,
      metalness: 0.6,
    });
    const hubDome = new THREE.Mesh(
      new THREE.CylinderGeometry(0.54, 0.54, 0.08, 48),
      hubDomeMat
    );
    hubDome.rotation.x = Math.PI / 2;
    hubDome.castShadow = true;
    hubGroup.add(hubDome);

    const centerCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 24, 24),
      goldMat
    );
    centerCap.position.set(0, 0, 0.06);
    centerCap.castShadow = true;
    hubGroup.add(centerCap);

    // 4. LENGÜETA / PUNTERO MECÁNICO 3D (Fijado en la parte superior, 12h)
    const flapperGroup = new THREE.Group();
    flapperGroup.position.set(0, 2.26, 0.22);
    scene.add(flapperGroup);
    flapperMeshRef.current = flapperGroup;

    // Soporte dorado del puntero
    const mountGeo = new THREE.BoxGeometry(0.24, 0.12, 0.08);
    const mountMesh = new THREE.Mesh(mountGeo, goldMat);
    mountMesh.castShadow = true;
    flapperGroup.add(mountMesh);

    // Lengüeta roja apuntando hacia abajo
    const tipShape = new THREE.Shape();
    tipShape.moveTo(-0.08, 0);
    tipShape.lineTo(0.08, 0);
    tipShape.lineTo(0.05, -0.32);
    tipShape.lineTo(0, -0.46);
    tipShape.lineTo(-0.05, -0.32);
    tipShape.closePath();

    const tipExtrudeGeo = new THREE.ExtrudeGeometry(tipShape, {
      depth: 0.03,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.01,
      bevelThickness: 0.01,
    });

    const tipMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      roughness: 0.3,
      metalness: 0.4,
    });
    const tipMesh = new THREE.Mesh(tipExtrudeGeo, tipMat);
    tipMesh.position.set(0, 0, -0.01);
    tipMesh.castShadow = true;
    flapperGroup.add(tipMesh);

    // Render loop
    let isMounted = true;
    const render = () => {
      if (!isMounted) return;
      renderer.render(scene, camera);
      requestAnimationFrame(render);
    };
    render();

    // Redimensionar si cambia la ventana
    const handleResize = () => {
      if (!container || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      isMounted = false;
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      scene.clear();
    };
  }, [segmentCount, segmentAngle, castulo, generateWheelTexture]);

  // Lógica de giro animado con física y sonido de clavijas
  const handleSpin = useCallback(() => {
    if (isSpinning || state.isRevealing || !wheelGroupRef.current) return;

    setIsSpinning(true);
    setLastResult(null);

    const randomIndex = Math.floor(Math.random() * WHEEL_SEGMENTS.length);
    const selected = WHEEL_SEGMENTS[randomIndex];

    // Cálculo exacto del ángulo objetivo:
    // El gajo `randomIndex` está originalmente centrado en `90 - randomIndex * segmentAngle`.
    // Para que quede bajo la lengüeta en 12h (90°) girando en sentido horario,
    // el giro requerido módulo 360° es:
    const targetNorm = ((segmentCount - randomIndex) % segmentCount) * segmentAngle;

    const startAngleDeg = currentRotationRef.current;
    const normCurrent = ((startAngleDeg % 360) + 360) % 360;
    const angleDiff = ((targetNorm - normCurrent) % 360 + 360) % 360;

    // Añadir jitter controlado dentro del gajo para realismo sin tocar los pivotes
    const jitter = (Math.random() - 0.5) * 0.6 * segmentAngle;
    const fullRotations = 6 * 360;
    const totalRotation = fullRotations + angleDiff + jitter;

    const duration = 4800;
    const startTime = performance.now();
    lastPegRef.current = -1;

    const easeOutQuart = (t: number): number => {
      return 1 - Math.pow(1 - t, 4.2);
    };

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuart(progress);
      const curDeg = startAngleDeg + totalRotation * eased;

      currentRotationRef.current = curDeg;

      // Rotar el grupo 3D de Three.js (en sentido horario = rotación Z negativa)
      if (wheelGroupRef.current) {
        wheelGroupRef.current.rotation.z = -curDeg * (Math.PI / 180);
      }

      // Detección física de clavijas pasando por la lengüeta (en 12h / 90°)
      const currentPeg = Math.floor((curDeg + segmentAngle / 2) / segmentAngle);

      if (currentPeg !== lastPegRef.current) {
        lastPegRef.current = currentPeg;
        const speedRatio = 1 - progress;
        playWheelTick(0.15 + speedRatio * 0.35);

        // Animar deflexión del puntero 3D
        if (flapperMeshRef.current) {
          const flickZ = (Math.random() > 0.5 ? 1 : -1) * (0.1 + speedRatio * 0.3);
          flapperMeshRef.current.rotation.z = flickZ;
          setTimeout(() => {
            if (flapperMeshRef.current) flapperMeshRef.current.rotation.z = 0;
          }, 35);
        }
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        if (flapperMeshRef.current) flapperMeshRef.current.rotation.z = 0;
        setIsSpinning(false);
        setLastResult(selected.value);

        if (selected.value === 'QUIEBRA') {
          playBankruptSound();
        } else if (selected.value === 'PIERDE_TURNO' || selected.value === 'ASEDIO') {
          playError();
        } else if (selected.value === 'COMODIN' || selected.value === 'BOTE') {
          playJackpotSound();
        } else {
          playDing();
        }

        if (typeof selected.value === 'number') {
          dispatch({ type: 'SPIN_WHEEL', payload: selected.value });
        } else {
          dispatch({ type: 'SPIN_WHEEL_SPECIAL', payload: selected.value as SpecialWheelResult });
        }

        onResult?.(selected.value);
        if (onClose) setTimeout(onClose, 2000);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, [isSpinning, state.isRevealing, WHEEL_SEGMENTS, segmentCount, segmentAngle, dispatch, onResult, onClose]);

  // Auto-girar al abrir
  useEffect(() => {
    if (!autoSpin) return;
    const t = setTimeout(handleSpin, 500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Limpiar animación de frame al desmontar
  useEffect(() => {
    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
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
        <div className={styles.modalTitle}>
          {castulo ? 'LA RULETA DE CÁSTULO' : 'LA RULETA DE LA FORTUNA'}
        </div>

        {/* Contenedor 3D WebGL Three.js */}
        <div className={`${styles.wheelWrapper} ${castulo ? styles.wheelWrapperCastulo : ''}`}>
          <div ref={mountRef} className={styles.threeCanvasContainer} />
        </div>

        {/* Zona inferior de resultados y botón de giro */}
        <div className={styles.resultArea}>
          {isSpinning && (
            <div className={styles.spinning}>
              <span className={styles.spinIcon}>🎡</span> ¡Girando la ruleta 3D…!
            </div>
          )}
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
              ¡GIRAR RULETA!
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

