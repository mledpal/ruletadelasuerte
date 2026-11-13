import { useState, useEffect, useCallback, useRef } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useGame } from '../../context/GameContext';
import type { GameState, WheelResult, WheelStop, SpecialWheelResult } from '../../types/game';
import { playWheelTick, playWheelLaunch, playBankruptSound, playError, playDing, playJackpotSound } from '../../utils/audio';
import styles from './Wheel.module.css';

const LIGHT_BG = new Set(['#ffd60a', '#ffd700', '#e9ecef', '#70e000', '#f1faee', '#e0f2fe']);

// Recorrido según la potencia: mínimo ¼ de vuelta, máximo 1½ vueltas
const MIN_SPIN_DEG = 90;
const MAX_SPIN_DEG = 540;
// Retroceso de la ruleta mientras el jugador "la agarra" cargando energía
const WINDUP_DEG = 6;
const BULB_COUNT = 32;

// Vista con zoom (contenedor apaisado, móvil): ventana sobre el arco superior.
// Unidades de la escena: radio de la cara 2.24, lengüeta en y ≈ 2.42.
const ZOOM_MIN_ASPECT = 1.15;
const ZOOM_CENTER_Y = 1.66;
const ZOOM_HALF_WIDTH = 1.45;
const ZOOM_HALF_HEIGHT = 0.95;

type SpinPhase = 'ready' | 'charging' | 'spinning' | 'done';

interface WheelSegment {
  value: WheelResult;
  color: string;
  label: string;
  textColor?: string;
  isSpecial?: boolean;
}

interface SpinAnim {
  start: number;
  from: number;
  to: number;
  duration: number;
  index: number;
}

interface WheelProps {
  onResult?: (result: WheelResult) => void;
  onClose?: () => void;
}

/** Construye los gajos de la ruleta a partir del estado de la partida */
function buildSegments(state: GameState): WheelSegment[] {
  const castulo = state.castuloMode;
  const isBoteRound =
    state.boteRoundEnabled &&
    state.currentRound === state.totalRounds &&
    state.players.length >= 2;
  // Sin símbolo de moneda en los gajos: en la textura el «€» de Bebas Neue se confunde con un 8
  const money = (n: number) => `${n}`;

  const comodinSlot: WheelSegment = state.wildcardAvailable
    ? { value: 'COMODIN', color: '#f59e0b', label: 'COMODÍN', textColor: '#1a0e00', isSpecial: true }
    : { value: 400,       color: '#ffd700', label: money(400), textColor: '#1a0e00' };

  const boteLabel = `¡BOTE!\n${state.boteAmount.toLocaleString('es-ES')}`;
  const boteSlot: WheelSegment = isBoteRound
    ? { value: 'BOTE', color: '#ec4899', label: boteLabel,  textColor: '#ffffff', isSpecial: true }
    : { value: 100,    color: '#ef4444', label: money(100), textColor: '#ffffff' };

  const base: WheelSegment[] = [
    { value: 'QUIEBRA',      color: '#0f172a', label: 'QUIEBRA',       textColor: '#ffffff', isSpecial: true }, //  0
    { value: 100,            color: '#0284c7', label: money(100),      textColor: '#ffffff' }, //  1
    { value: 200,            color: '#9333ea', label: money(200),      textColor: '#ffffff' }, //  2
    { value: 75,             color: '#059669', label: money(75),       textColor: '#ffffff' }, //  3
    { value: 300,            color: '#dc2626', label: money(300),      textColor: '#ffffff' }, //  4
    { value: 50,             color: '#eab308', label: money(50),       textColor: '#1a0e00' }, //  5
    { value: 150,            color: '#2563eb', label: money(150),      textColor: '#ffffff' }, //  6
    { value: 'PIERDE_TURNO', color: '#475569', label: 'PIERDE\nTURNO', textColor: '#ffffff', isSpecial: true }, //  7
    { value: 25,             color: '#65a30d', label: money(25),       textColor: '#ffffff' }, //  8
    { value: 400,            color: '#ea580c', label: money(400),      textColor: '#ffffff' }, //  9
    boteSlot,                                                                                  // 10
    { value: 75,             color: '#eab308', label: money(75),       textColor: '#1a0e00' }, // 11
    { value: 'QUIEBRA',      color: '#0f172a', label: 'QUIEBRA',       textColor: '#ffffff', isSpecial: true }, // 12
    { value: 200,            color: '#0284c7', label: money(200),      textColor: '#ffffff' }, // 13
    { value: 500,            color: '#9333ea', label: money(500),      textColor: '#ffffff' }, // 14
    { value: 'PIERDE_TURNO', color: '#475569', label: 'PIERDE\nTURNO', textColor: '#ffffff', isSpecial: true }, // 15
    { value: 50,             color: '#059669', label: money(50),       textColor: '#ffffff' }, // 16
    { value: 750,            color: '#dc2626', label: money(750),      textColor: '#ffffff' }, // 17
    { value: 100,            color: '#eab308', label: money(100),      textColor: '#1a0e00' }, // 18
    { value: 25,             color: '#2563eb', label: money(25),       textColor: '#ffffff' }, // 19
    { value: 300,            color: '#ea580c', label: money(300),      textColor: '#ffffff' }, // 20
    { value: 75,             color: '#9333ea', label: money(75),       textColor: '#ffffff' }, // 21
    comodinSlot,                                                                               // 22
    { value: 'PIERDE_TURNO', color: '#475569', label: 'PIERDE\nTURNO', textColor: '#ffffff', isSpecial: true }, // 23
  ];

  if (!castulo) return base;

  const owns = (key: 'hasAnibal' | 'hasHimilce' | 'hasEscipion') =>
    state.players.some((p) => p[key]);

  const extras: WheelSegment[] = [];
  extras.push({ value: 'ASEDIO', color: '#18181b', label: 'ASEDIO', textColor: '#f87171', isSpecial: true });
  if (!owns('hasAnibal'))   extras.push({ value: 'ANIBAL',   color: '#7e22ce', label: 'ANÍBAL',   textColor: '#ffd700', isSpecial: true });
  if (!owns('hasHimilce'))  extras.push({ value: 'HIMILCE',  color: '#0e7490', label: 'HIMILCE',  textColor: '#ffffff', isSpecial: true });
  if (!owns('hasEscipion')) extras.push({ value: 'ESCIPION', color: '#991b1b', label: 'ESCIPIÓN', textColor: '#ffd700', isSpecial: true });

  const result = [...base];
  const step = Math.floor(base.length / (extras.length + 1));
  extras.forEach((seg, i) => {
    result.splice((i + 1) * step + i, 0, seg);
  });
  return result;
}

/** Índice del gajo bajo la lengüeta para una rotación dada (grados, sentido horario) */
function segmentIndexAt(rotation: number, count: number): number {
  const segmentAngle = 360 / count;
  const norm = ((rotation % 360) + 360) % 360;
  return (count - (Math.round(norm / segmentAngle) % count)) % count;
}

/**
 * Rotación inicial: la ruleta arranca donde se detuvo en el giro anterior.
 * Si el número de gajos cambió (fichas de Cástulo ganadas), se recoloca sobre
 * el gajo equivalente más cercano manteniendo el desplazamiento dentro del gajo.
 */
function resolveStartRotation(segments: WheelSegment[], stop: WheelStop | null): number {
  if (!stop) return 0;
  const count = segments.length;
  const segmentAngle = 360 / count;
  const current = segmentIndexAt(stop.rotation, count);
  const same = (s: WheelSegment) => s.value === stop.value && s.label === stop.label;
  if (same(segments[current])) return stop.rotation;

  const candidates = segments
    .map((s, i) => (same(s) ? i : -1))
    .filter((i) => i >= 0);
  if (candidates.length === 0) return stop.rotation;

  const circDist = (i: number) => Math.min(Math.abs(i - current), count - Math.abs(i - current));
  const target = candidates.reduce((best, i) => (circDist(i) < circDist(best) ? i : best));
  const norm = ((stop.rotation % 360) + 360) % 360;
  const offset = THREE.MathUtils.clamp(
    norm - Math.round(norm / segmentAngle) * segmentAngle,
    -segmentAngle * 0.38,
    segmentAngle * 0.38,
  );
  return ((count - target) % count) * segmentAngle + offset;
}

/** Dibuja la cara de la ruleta (gajos, volumen y textos) en un canvas cuadrado */
function drawWheelFace(canvas: HTMLCanvasElement, segments: WheelSegment[]) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const size = canvas.width;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 6;
  const segmentAngle = 360 / segments.length;

  // Fondo latón (se ve bajo el aro exterior)
  ctx.fillStyle = '#7a5410';
  ctx.fillRect(0, 0, size, size);

  // Gajos (0 = arriba/12h, sentido horario)
  segments.forEach((seg, i) => {
    const a1 = (i * segmentAngle - 90 - segmentAngle / 2) * (Math.PI / 180);
    const a2 = ((i + 1) * segmentAngle - 90 - segmentAngle / 2) * (Math.PI / 180);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, a1, a2, false);
    ctx.closePath();
    ctx.fillStyle = seg.color;
    ctx.fill();

    // Volumen: más luz cerca del centro y oscurecido hacia el borde, como pintura lacada
    const grad = ctx.createRadialGradient(cx, cy, radius * 0.15, cx, cy, radius);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.18)');
    grad.addColorStop(0.55, 'rgba(255, 255, 255, 0.02)');
    grad.addColorStop(0.9, 'rgba(0, 0, 0, 0.12)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Bisel sutil en los bordes de cada gajo
    ctx.lineWidth = 10;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.stroke();
    ctx.restore();

    // Texto radial
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(i * segmentAngle * (Math.PI / 180));

    ctx.fillStyle = seg.textColor || (LIGHT_BG.has(seg.color) ? '#0f172a' : '#ffffff');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 3;

    const isWildcard = seg.value === 'COMODIN';
    const textRadius = radius * 0.7;

    if (isWildcard) {
      ctx.font = 'bold 80px sans-serif';
      ctx.fillText('★', 0, -textRadius - 38);
    }

    ctx.font = `900 ${seg.isSpecial ? 54 : 78}px 'Bebas Neue', Impact, 'Arial Black', sans-serif`;
    if (seg.label.includes('\n')) {
      const [l1, l2] = seg.label.split('\n');
      ctx.fillText(l1, 0, -textRadius - 26);
      ctx.fillText(l2, 0, -textRadius + 42);
    } else {
      ctx.fillText(seg.label, 0, -textRadius + (isWildcard ? 28 : 0));
    }
    ctx.restore();
  });
}

/** Genera una versión con desenfoque de movimiento rotacional (media de copias giradas) */
function drawMotionBlur(dst: HTMLCanvasElement, src: HTMLCanvasElement, spanDeg: number, samples = 28) {
  const ctx = dst.getContext('2d');
  if (!ctx) return;
  const size = dst.width;
  ctx.clearRect(0, 0, size, size);
  for (let s = 0; s < samples; s++) {
    const a = (s / (samples - 1) - 0.5) * spanDeg * (Math.PI / 180);
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate(a);
    // alpha 1/(s+1) → media acumulada exacta de todas las copias
    ctx.globalAlpha = 1 / (s + 1);
    ctx.drawImage(src, -size / 2, -size / 2, size, size);
    ctx.restore();
  }
}

export function Wheel({ onResult, onClose }: WheelProps) {
  const { state, dispatch } = useGame();

  // Los gajos se congelan al abrir el modal: así el resultado (p. ej. perder el comodín)
  // no redibuja la ruleta bajo la lengüeta justo después de caer.
  const [segments] = useState(() => buildSegments(state));
  const [phase, setPhase] = useState<SpinPhase>('ready');
  const [lastResult, setLastResult] = useState<WheelResult | null>(null);

  const castulo = state.castuloMode;
  const segmentCount = segments.length;
  const segmentAngle = 360 / segmentCount;

  const mountRef = useRef<HTMLDivElement>(null);
  const meterRef = useRef<HTMLDivElement>(null);
  const meterLabelRef = useRef<HTMLSpanElement>(null);

  // Estado por frame (fuera de React para no re-renderizar a 60 fps)
  const phaseRef = useRef<SpinPhase>('ready');
  // Grados acumulados en sentido horario; parte de donde quedó el giro anterior
  const [startRotation] = useState(() => resolveStartRotation(segments, state.wheelStop ?? null));
  const rotationRef = useRef(startRotation);
  const restRef = useRef(0);          // posición en reposo antes de cargar
  const energyRef = useRef(0);        // 0-1
  const energyDirRef = useRef(1);
  const energySpeedRef = useRef(1.2); // barridos completos por segundo
  const spinRef = useRef<SpinAnim | null>(null);
  const finishRef = useRef<(index: number) => void>(() => {});
  const closeTimerRef = useRef<number | null>(null);

  // ─── Escena Three.js + bucle de animación único ─────────────────────────
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 540;
    const height = container.clientHeight || 540;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 100);
    /*
     * Encuadre según la proporción del contenedor:
     * - Cuadrado (escritorio): la ruleta completa.
     * - Apaisado (móvil, lo fija el CSS): zoom sobre el arco superior, de modo
     *   que se ven a gran tamaño la casilla bajo la lengüeta y sus vecinas.
     */
    const frameCamera = (aspect: number) => {
      camera.aspect = aspect;
      const vHalf = THREE.MathUtils.degToRad(camera.fov / 2);
      const hHalf = Math.atan(Math.tan(vHalf) * aspect);
      if (aspect > ZOOM_MIN_ASPECT) {
        const target = new THREE.Vector3(0, ZOOM_CENTER_Y, 0);
        const dist = Math.max(
          ZOOM_HALF_WIDTH / Math.tan(hHalf),
          ZOOM_HALF_HEIGHT / Math.tan(vHalf),
        );
        const tilt = THREE.MathUtils.degToRad(14);
        camera.position.set(0, target.y - Math.sin(tilt) * dist, Math.cos(tilt) * dist);
        camera.lookAt(target);
      } else {
        const fitRadius = 2.62;
        const dist = fitRadius / Math.sin(Math.min(vHalf, hHalf));
        const tilt = THREE.MathUtils.degToRad(24);
        camera.position.set(0, -Math.sin(tilt) * dist, Math.cos(tilt) * dist);
        camera.lookAt(0, 0.02, 0);
      }
      camera.updateProjectionMatrix();
    };
    frameCamera(width / height);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // Tone mapping neutro: conserva la saturación de los colores de los gajos
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1;
    container.replaceChildren(renderer.domElement);

    // Entorno de estudio para reflejos reales en metales y laca
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    scene.environmentIntensity = 0.5;

    // Iluminación: foco cenital cálido con sombras + contraluz frío
    scene.add(new THREE.AmbientLight(0xffffff, 0.15));

    const keyLight = new THREE.SpotLight(0xfff1d6, 16, 0, Math.PI / 5, 0.7, 1.2);
    keyLight.position.set(1.8, 1.2, 7);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.bias = -0.0004;
    keyLight.shadow.radius = 4;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x7dd3fc, 1.1);
    rimLight.position.set(-4, 4, 2);
    scene.add(rimLight);

    const warmFill = new THREE.PointLight(0xffc56b, 2.5, 9, 1.6);
    warmFill.position.set(-1.5, -1, 3);
    scene.add(warmFill);

    // Materiales compartidos
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xe0b44c, metalness: 1, roughness: 0.24 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xc9962e, metalness: 1, roughness: 0.32 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xf4f4f5, metalness: 1, roughness: 0.1 });
    const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x1b2230, metalness: 0.8, roughness: 0.45 });

    // 1. CHASIS ESTÁTICO: aro dorado + canal oscuro + bombillas
    const casing = new THREE.Group();
    scene.add(casing);

    const outerBezel = new THREE.Mesh(new THREE.TorusGeometry(2.36, 0.13, 32, 128), goldMat);
    outerBezel.castShadow = true;
    outerBezel.receiveShadow = true;
    casing.add(outerBezel);

    const channel = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.22, 128, 1, true), darkSteelMat);
    channel.rotation.x = Math.PI / 2;
    channel.position.z = -0.02;
    casing.add(channel);

    const backPlate = new THREE.Mesh(new THREE.CircleGeometry(2.42, 128), darkSteelMat);
    backPlate.position.z = -0.14;
    backPlate.receiveShadow = true;
    casing.add(backPlate);

    // Bombillas con casquillo cromado; cada una con material propio para animarlas
    const bulbGeo = new THREE.SphereGeometry(0.042, 20, 20);
    const socketGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.03, 20);
    const bulbMats: THREE.MeshStandardMaterial[] = [];
    for (let i = 0; i < BULB_COUNT; i++) {
      const ang = (90 - (i * 360) / BULB_COUNT) * (Math.PI / 180); // 0 = arriba, horario
      const x = 2.36 * Math.cos(ang);
      const y = 2.36 * Math.sin(ang);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xfff4c2,
        emissive: 0xffc94d,
        emissiveIntensity: 0.4,
        roughness: 0.15,
      });
      bulbMats.push(mat);
      const socket = new THREE.Mesh(socketGeo, chromeMat);
      socket.rotation.x = Math.PI / 2;
      socket.position.set(x, y, 0.12);
      casing.add(socket);
      const bulb = new THREE.Mesh(bulbGeo, mat);
      bulb.position.set(x, y, 0.16);
      casing.add(bulb);
    }

    // 2. DISCO GIRATORIO
    const wheelGroup = new THREE.Group();
    wheelGroup.rotation.z = -rotationRef.current * (Math.PI / 180);
    scene.add(wheelGroup);

    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = faceCanvas.height = 2048;
    drawWheelFace(faceCanvas, segments);
    const blurCanvas = document.createElement('canvas');
    blurCanvas.width = blurCanvas.height = 1024;
    drawMotionBlur(blurCanvas, faceCanvas, segmentAngle * 1.6);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const faceTexture = new THREE.CanvasTexture(faceCanvas);
    faceTexture.colorSpace = THREE.SRGBColorSpace;
    faceTexture.anisotropy = maxAniso;
    const blurTexture = new THREE.CanvasTexture(blurCanvas);
    blurTexture.colorSpace = THREE.SRGBColorSpace;
    blurTexture.anisotropy = maxAniso;

    // Redibujar cuando la fuente display esté cargada (el primer dibujo puede usar la de reserva)
    let disposed = false;
    document.fonts?.load("900 78px 'Bebas Neue'").then(() => {
      if (disposed) return;
      drawWheelFace(faceCanvas, segments);
      drawMotionBlur(blurCanvas, faceCanvas, segmentAngle * 1.6);
      faceTexture.needsUpdate = true;
      blurTexture.needsUpdate = true;
    }).catch(() => {});

    // Cara lacada: base de color + capa de barniz brillante
    const faceGeo = new THREE.CircleGeometry(2.24, 128);
    const faceMat = new THREE.MeshPhysicalMaterial({
      map: faceTexture,
      roughness: 0.6,
      metalness: 0,
      specularIntensity: 0.4,
      clearcoat: 0.35,
      clearcoatRoughness: 0.22,
      envMapIntensity: 0.12,
    });
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.position.z = 0.05;
    face.receiveShadow = true;
    wheelGroup.add(face);

    // Capa de desenfoque de movimiento: su opacidad sigue a la velocidad angular
    const blurMat = new THREE.MeshPhysicalMaterial({
      map: blurTexture,
      roughness: 0.6,
      metalness: 0,
      specularIntensity: 0.4,
      clearcoat: 0.35,
      clearcoatRoughness: 0.22,
      envMapIntensity: 0.12,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const blurFace = new THREE.Mesh(faceGeo, blurMat);
    blurFace.position.z = 0.0515;
    blurFace.receiveShadow = true;
    wheelGroup.add(blurFace);

    const discEdge = new THREE.Mesh(new THREE.CylinderGeometry(2.24, 2.24, 0.1, 128, 1, true), brassMat);
    discEdge.rotation.x = Math.PI / 2;
    discEdge.castShadow = true;
    wheelGroup.add(discEdge);

    // Separadores en relieve dorados entre gajos + clavijas cromadas en el borde
    const dividerInner = 0.66;
    const dividerOuter = 2.2;
    const dividerLen = dividerOuter - dividerInner;
    const dividerGeo = new THREE.BoxGeometry(dividerLen, 0.024, 0.018);
    const pegGeo = new THREE.CylinderGeometry(0.024, 0.026, 0.17, 20);
    const pegCapGeo = new THREE.SphereGeometry(0.034, 20, 20);
    const pegR = 2.14;

    for (let i = 0; i < segmentCount; i++) {
      // Límite anterior al gajo i (donde está la clavija)
      const theta = (90 - i * segmentAngle + segmentAngle / 2) * (Math.PI / 180);
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);

      const divider = new THREE.Mesh(dividerGeo, goldMat);
      const mid = (dividerInner + dividerOuter) / 2;
      divider.position.set(mid * cos, mid * sin, 0.06);
      divider.rotation.z = theta;
      divider.castShadow = true;
      divider.receiveShadow = true;
      wheelGroup.add(divider);

      const peg = new THREE.Mesh(pegGeo, chromeMat);
      peg.rotation.x = Math.PI / 2;
      peg.position.set(pegR * cos, pegR * sin, 0.13);
      peg.castShadow = true;
      wheelGroup.add(peg);

      const cap = new THREE.Mesh(pegCapGeo, chromeMat);
      cap.position.set(pegR * cos, pegR * sin, 0.22);
      cap.castShadow = true;
      wheelGroup.add(cap);
    }

    // 3. BUJE CENTRAL
    const hub = new THREE.Group();
    hub.position.z = 0.06;
    wheelGroup.add(hub);

    const hubRing = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.065, 32, 96), goldMat);
    hubRing.castShadow = true;
    hub.add(hubRing);

    const hubDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.58, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshPhysicalMaterial({
        color: castulo ? 0x881337 : 0x1e3a8a,
        roughness: 0.3,
        metalness: 0.5,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
      }),
    );
    hubDome.rotation.x = Math.PI / 2;
    hubDome.scale.set(1, 0.28, 1);
    hubDome.castShadow = true;
    hub.add(hubDome);

    const centerCap = new THREE.Mesh(new THREE.SphereGeometry(0.13, 32, 32), goldMat);
    centerCap.position.z = 0.16;
    centerCap.castShadow = true;
    hub.add(centerCap);

    // 4. LENGÜETA: pivota en su soporte superior y rebota contra las clavijas
    const flapperPivot = new THREE.Group();
    flapperPivot.position.set(0, 2.42, 0.2);
    scene.add(flapperPivot);

    const mount = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.12), goldMat);
    mount.castShadow = true;
    flapperPivot.add(mount);

    const pivotPin = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 16), chromeMat);
    pivotPin.rotation.x = Math.PI / 2;
    pivotPin.position.z = 0.04;
    flapperPivot.add(pivotPin);

    const tipShape = new THREE.Shape();
    tipShape.moveTo(-0.075, 0);
    tipShape.lineTo(0.075, 0);
    tipShape.lineTo(0.05, -0.34);
    tipShape.quadraticCurveTo(0, -0.5, -0.05, -0.34);
    tipShape.closePath();
    const tipGeo = new THREE.ExtrudeGeometry(tipShape, {
      depth: 0.03,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: 0.012,
      bevelThickness: 0.012,
    });
    const tip = new THREE.Mesh(
      tipGeo,
      new THREE.MeshPhysicalMaterial({ color: 0xd11a1a, roughness: 0.25, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.08 }),
    );
    tip.position.set(0, -0.04, -0.03);
    tip.castShadow = true;
    flapperPivot.add(tip);

    // ─── Bucle de animación ──────────────────────────────────────────────
    let frameId = 0;
    let lastTime = performance.now();
    let lastPeg = Math.floor((rotationRef.current + segmentAngle / 2) / segmentAngle);
    let flapAngle = 0;
    let flapVel = 0;
    let wobble = 0;

    const loop = (now: number) => {
      frameId = requestAnimationFrame(loop);
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      const t = now / 1000;
      const currentPhase = phaseRef.current;
      let omega = 0; // velocidad angular en grados/s

      if (currentPhase === 'charging') {
        // La energía sube y baja; cada barrido lleva una velocidad aleatoria distinta
        const speed = energySpeedRef.current * (1 + 0.3 * Math.sin(t * 6.1));
        let e = energyRef.current + energyDirRef.current * speed * dt;
        if (e >= 1) {
          e = 1;
          energyDirRef.current = -1;
          energySpeedRef.current = 0.7 + Math.random() * 1.5;
        } else if (e <= 0) {
          e = 0;
          energyDirRef.current = 1;
          energySpeedRef.current = 0.7 + Math.random() * 1.5;
        }
        energyRef.current = e;

        // La mano agarra la ruleta y la echa ligeramente hacia atrás
        const target = restRef.current - e * WINDUP_DEG;
        rotationRef.current += (target - rotationRef.current) * Math.min(1, dt * 14);

        meterRef.current?.style.setProperty('--power', e.toFixed(3));
        if (meterLabelRef.current) meterLabelRef.current.textContent = `${Math.round(e * 100)}%`;
      } else if (currentPhase === 'spinning' && spinRef.current) {
        const anim = spinRef.current;
        const u = Math.min((now - anim.start) / anim.duration, 1);
        // Deceleración por rozamiento: p(u) = 1 - (1-u)^3
        const inv = 1 - u;
        const dist = anim.to - anim.from;
        rotationRef.current = anim.from + dist * (1 - inv * inv * inv);
        omega = (dist * 3 * inv * inv) / (anim.duration / 1000);

        if (u >= 1) {
          rotationRef.current = anim.to;
          spinRef.current = null;
          finishRef.current(anim.index);
        }
      }

      const deg = rotationRef.current;
      wheelGroup.rotation.z = -deg * (Math.PI / 180);

      // Clavijas que pasan bajo la lengüeta
      const peg = Math.floor((deg + segmentAngle / 2) / segmentAngle);
      if (peg !== lastPeg) {
        const dir = Math.sign(peg - lastPeg);
        const crossings = Math.min(Math.abs(peg - lastPeg), 3);
        lastPeg = peg;
        const speedFactor = Math.min(omega / 320, 1);
        for (let c = 0; c < crossings; c++) playWheelTick(0.12 + speedFactor * 0.38);
        // Las clavijas empujan la punta en el sentido del giro
        const kick = dir * (0.22 + speedFactor * 0.32);
        flapAngle = dir > 0 ? Math.max(flapAngle, kick) : Math.min(flapAngle, kick);
        flapVel = 0;
        wobble = Math.min(wobble + 0.4 + speedFactor * 0.6, 1.2);
      }

      // Muelle amortiguado de la lengüeta (rebota y se asienta)
      const stiffness = 900;
      const damping = 16;
      flapVel += (-stiffness * flapAngle - damping * flapVel) * dt;
      flapAngle += flapVel * dt;
      flapperPivot.rotation.z = flapAngle;

      // Vibración mínima del disco al golpear clavijas
      wobble *= Math.exp(-dt * 10);
      wheelGroup.rotation.x = Math.sin(t * 70) * wobble * 0.0025;

      // Desenfoque de movimiento según velocidad
      blurMat.opacity = THREE.MathUtils.clamp((omega - 80) / 260, 0, 0.92);

      // Bombillas
      for (let i = 0; i < BULB_COUNT; i++) {
        let intensity: number;
        if (currentPhase === 'charging') {
          // Se encienden alrededor del aro según la energía acumulada
          const lit = i / BULB_COUNT < energyRef.current;
          intensity = lit ? 2.6 : 0.12;
        } else if (currentPhase === 'spinning') {
          // Persecución cuya velocidad sigue al giro
          const chase = Math.floor(t * (4 + omega / 25));
          intensity = (i + chase) % 3 === 0 ? 3 : 0.3;
        } else if (currentPhase === 'done') {
          intensity = Math.floor(t * 6) % 2 === i % 2 ? 2.8 : 0.3;
        } else {
          intensity = 0.9 + 0.6 * Math.sin(t * 2.2 + i * 0.5);
        }
        bulbMats[i].emissiveIntensity += (intensity - bulbMats[i].emissiveIntensity) * Math.min(1, dt * 18);
      }

      renderer.render(scene, camera);
    };
    frameId = requestAnimationFrame(loop);

    const resizeObserver = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      frameCamera(w / h);
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m: THREE.Material) => m.dispose());
        }
      });
      faceTexture.dispose();
      blurTexture.dispose();
      envTexture.dispose();
      pmrem.dispose();
      renderer.dispose();
    };
  }, [segments, segmentCount, segmentAngle, castulo]);

  // ─── Final del giro: resultado, sonido y despacho al reducer ───────────
  useEffect(() => {
    finishRef.current = (index: number) => {
      const selected = segments[index];
      phaseRef.current = 'done';

      // Guardar la casilla exacta en la que ha caído para el siguiente giro
      dispatch({
        type: 'SET_WHEEL_STOP',
        payload: {
          rotation: ((rotationRef.current % 360) + 360) % 360,
          value: selected.value,
          label: selected.label,
        },
      });
      setPhase('done');
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
      if (onClose) closeTimerRef.current = window.setTimeout(onClose, 2000);
    };
  }, [segments, dispatch, onResult, onClose]);

  // ─── Carga y lanzamiento ───────────────────────────────────────────────
  const startCharge = useCallback(() => {
    if (phaseRef.current !== 'ready' || state.isRevealing) return;
    restRef.current = rotationRef.current;
    energyRef.current = 0;
    energyDirRef.current = 1;
    energySpeedRef.current = 0.8 + Math.random() * 1.2;
    phaseRef.current = 'charging';
    setPhase('charging');
  }, [state.isRevealing]);

  const releaseCharge = useCallback(() => {
    if (phaseRef.current !== 'charging') return;
    const power = energyRef.current;

    // Distancia desde la posición de reposo: ¼ de vuelta (mín.) a 1½ vueltas (máx.)
    // más una pequeña imprecisión de la mano.
    const jitter = (Math.random() - 0.5) * 4;
    let target = restRef.current + MIN_SPIN_DEG + power * (MAX_SPIN_DEG - MIN_SPIN_DEG) + jitter;

    // La lengüeta no puede quedar apoyada sobre una clavija: se detiene antes o la supera
    const margin = segmentAngle * 0.12;
    const pastPeg = (((target + segmentAngle / 2) % segmentAngle) + segmentAngle) % segmentAngle;
    if (pastPeg < margin) target += margin - pastPeg;
    else if (pastPeg > segmentAngle - margin) target -= pastPeg - (segmentAngle - margin);

    const index = segmentIndexAt(target, segmentCount);

    const from = rotationRef.current;
    const distance = target - from;
    spinRef.current = {
      start: performance.now(),
      from,
      to: target,
      duration: 1800 + 3400 * Math.sqrt(distance / MAX_SPIN_DEG),
      index,
    };
    phaseRef.current = 'spinning';
    setPhase('spinning');
    playWheelLaunch(power);
  }, [segmentAngle, segmentCount]);

  // Barra espaciadora: mantener para cargar, soltar para lanzar
  useEffect(() => {
    // Quitar el foco del botón que abrió el modal para que el espacio no lo vuelva a pulsar
    (document.activeElement as HTMLElement | null)?.blur();

    const isSpace = (e: KeyboardEvent) => e.code === 'Space' || e.key === ' ';
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isSpace(e)) return;
      e.preventDefault();
      if (!e.repeat) startCharge();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (!isSpace(e)) return;
      e.preventDefault();
      releaseCharge();
    };
    // Si la ventana pierde el foco mientras se carga, se lanza con la energía actual
    const onBlur = () => releaseCharge();

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('blur', onBlur);
    };
  }, [startCharge, releaseCharge]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) clearTimeout(closeTimerRef.current);
    };
  }, []);

  // Alternativa táctil / ratón: mantener pulsado el botón
  const handlePointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    startCharge();
  };

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

  const showMeter = phase === 'ready' || phase === 'charging' || phase === 'spinning';

  // Portal a <body>: un ancestro con backdrop-filter/transform confinaría el overlay fijo
  return createPortal(
    <div className={styles.overlay}>
      <div className={styles.modalInner}>
        <div className={styles.modalTitle}>
          {castulo ? 'LA RULETA DE CÁSTULO' : 'LA RULETA DE LA FORTUNA'}
        </div>

        <div className={`${styles.wheelWrapper} ${castulo ? styles.wheelWrapperCastulo : ''}`}>
          <div ref={mountRef} className={styles.threeCanvasContainer} />
        </div>

        <div className={styles.resultArea}>
          {showMeter && (
            <div className={`${styles.powerPanel} ${phase === 'spinning' ? styles.powerLocked : ''}`}>
              <div className={styles.powerHeader}>
                <span>POTENCIA</span>
                <span ref={meterLabelRef} className={styles.powerValue}>0%</span>
              </div>
              <div ref={meterRef} className={styles.powerTrack}>
                <div className={styles.powerFill} />
                <div className={styles.powerMarker} />
              </div>
              <div className={styles.powerScale}>
                <span>¼ vuelta</span>
                <span>1½ vueltas</span>
              </div>
            </div>
          )}

          {phase === 'spinning' && (
            <div className={styles.spinning}>¡Girando…!</div>
          )}

          {(phase === 'ready' || phase === 'charging') && (
            <>
              <button
                type="button"
                className={`${styles.spinBtn} ${phase === 'charging' ? styles.spinBtnCharging : ''}`}
                disabled={state.isRevealing}
                onPointerDown={handlePointerDown}
                onPointerUp={releaseCharge}
                onPointerCancel={releaseCharge}
                onContextMenu={(e) => e.preventDefault()}
              >
                {phase === 'charging' ? '¡SUELTA PARA LANZAR!' : 'MANTÉN PARA CARGAR'}
              </button>
              <div className={`${styles.hint} ${styles.hintKeyboard}`}>
                Mantén pulsada la <kbd className={styles.kbd}>BARRA ESPACIADORA</kbd> y suéltala en el momento justo
              </div>
              <div className={`${styles.hint} ${styles.hintTouch}`}>
                Mantén pulsado el botón y suéltalo en el momento justo
              </div>
            </>
          )}

          {phase === 'done' && lastResult && (
            <div className={`${styles.result} ${getResultClass()}`}>
              {getResultText()}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
