// Identidad del jugador en el modo online y utilidades de la sala (código, enlace).
import { newGameId } from '../utils/id';
import { MAX_NAME_LENGTH } from '../utils/ranking';

const CLIENT_ID_KEY = 'ruleta:clientId';
const NAME_KEY = 'ruleta:online:name';
const HOST_KEY = 'ruleta:online:hostOf';
const ROOM_PARAM = 'sala';

/** Letras sin ambigüedades (sin I, O, 0, 1) para dictar el código por teléfono */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 5;
export const MAX_ONLINE_PLAYERS = 6;

/** Identificador estable de este navegador: permite volver a la partida tras recargar */
export function getClientId(): string {
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = newGameId();
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    return newGameId();
  }
}

export function loadOnlineName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveOnlineName(name: string): void {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch { /* ignorar */ }
}

/** Quita espacios sobrantes y recorta a la longitud máxima */
export function cleanOnlineName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, MAX_NAME_LENGTH);
}

export function newRoomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(ROOM_CODE_LENGTH));
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

/** Normaliza lo que teclea el invitado ("abc 12" → "ABC12"); null si no es válido */
export function parseRoomCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return code.length === ROOM_CODE_LENGTH && [...code].every((c) => CODE_ALPHABET.includes(c)) ? code : null;
}

/** ¿Este navegador creó la sala? (el anfitrión configura y arranca la partida) */
export function isHostOf(room: string): boolean {
  try {
    return localStorage.getItem(HOST_KEY) === room;
  } catch {
    return false;
  }
}

export function markHostOf(room: string): void {
  try {
    localStorage.setItem(HOST_KEY, room);
  } catch { /* ignorar */ }
}

export function readRoomFromUrl(): string | null {
  const value = new URLSearchParams(window.location.search).get(ROOM_PARAM);
  return value ? parseRoomCode(value) : null;
}

export function roomUrl(room: string): string {
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set(ROOM_PARAM, room);
  return url.toString();
}

/** Cambia la URL sin recargar (con o sin sala) */
export function setRoomInUrl(room: string | null): void {
  const url = new URL(window.location.href);
  if (room) url.searchParams.set(ROOM_PARAM, room);
  else url.searchParams.delete(ROOM_PARAM);
  window.history.pushState(null, '', url);
}

/** Clave de guardado de la partida de cada sala */
export function roomStorageKey(room: string): string {
  return `ruleta:online:${room}`;
}
