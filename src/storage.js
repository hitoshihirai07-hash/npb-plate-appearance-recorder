import { DEFAULT_LINEUP_POSITIONS, STORAGE_KEY } from './game.js';

export const ARCHIVE_KEY = 'npbPlateAppearanceRecorder.archive.v1';
const ARCHIVE_VERSION = 1;

export function emptyArchive() {
  return { version: ARCHIVE_VERSION, games: [], lineupPresets: {} };
}

function normalizeGame(game) {
  if (!game?.config?.awayTeam || !game?.config?.homeTeam) {
    throw new Error('試合データの形式が正しくありません。');
  }

  const normalized = structuredClone(game);
  for (const side of ['away', 'home']) {
    const key = `${side}Lineup`;
    normalized.config[key] = (normalized.config[key] ?? []).map((player, index) => ({
      ...player,
      lineupPosition: player.lineupPosition ?? DEFAULT_LINEUP_POSITIONS[index],
    }));
  }

  let plateAppearanceNumber = 0;
  normalized.events = (normalized.events ?? []).map((event, index) => {
    const type = event.type ?? 'plateAppearance';
    if (type === 'plateAppearance') plateAppearanceNumber += 1;
    return {
      ...event,
      number: index + 1,
      type,
      plateAppearanceNumber: type === 'plateAppearance'
        ? (event.plateAppearanceNumber ?? plateAppearanceNumber)
        : undefined,
      rbi: type === 'plateAppearance' ? Number(event.rbi ?? 0) : undefined,
      scored: event.scored ?? [],
    };
  });
  normalized.id = normalized.id
    ?? `legacy-${normalized.config.date}-${normalized.config.awayTeam}-${normalized.config.homeTeam}`;
  normalized.version = 2;
  normalized.savedAt = normalized.savedAt ?? normalized.createdAt ?? new Date().toISOString();
  normalized.undoStack = [];
  return normalized;
}

function normalizePreset(preset) {
  if (!preset || !Array.isArray(preset.lineup) || preset.lineup.length !== 9) return null;
  return {
    lineup: structuredClone(preset.lineup),
    pitcher: preset.pitcher ? structuredClone(preset.pitcher) : null,
    updatedAt: preset.updatedAt ?? '',
  };
}

export function normalizeArchive(value) {
  if (!value || !Array.isArray(value.games)) {
    throw new Error('バックアップの形式が正しくありません。');
  }

  const gamesById = new Map();
  for (const item of value.games) {
    const game = normalizeGame(item);
    gamesById.set(game.id, game);
  }

  const lineupPresets = {};
  for (const [team, preset] of Object.entries(value.lineupPresets ?? {})) {
    const normalized = normalizePreset(preset);
    if (normalized) lineupPresets[team] = normalized;
  }

  return {
    version: ARCHIVE_VERSION,
    games: [...gamesById.values()].sort((a, b) => b.savedAt.localeCompare(a.savedAt)),
    lineupPresets,
  };
}

export function loadArchive(storage = localStorage) {
  const archiveText = storage.getItem(ARCHIVE_KEY);
  if (archiveText) {
    try {
      return { archive: normalizeArchive(JSON.parse(archiveText)), error: '' };
    } catch {
      return {
        archive: emptyArchive(),
        error: '保存データを読み込めませんでした。ブラウザのデータを消さず、バックアップから復元してください。',
      };
    }
  }

  const legacyText = storage.getItem(STORAGE_KEY);
  if (!legacyText) return { archive: emptyArchive(), error: '' };

  try {
    const game = normalizeGame(JSON.parse(legacyText));
    const archive = { ...emptyArchive(), games: [game] };
    storage.setItem(ARCHIVE_KEY, JSON.stringify(archive));
    return { archive, error: '' };
  } catch {
    return {
      archive: emptyArchive(),
      error: '以前の保存試合を読み込めませんでした。ブラウザのデータは削除していません。',
    };
  }
}

export function persistArchive(archive, storage = localStorage) {
  storage.setItem(ARCHIVE_KEY, JSON.stringify(normalizeArchive(archive)));
}

export function upsertGame(archive, game) {
  const normalized = normalizeGame(game);
  return normalizeArchive({
    ...archive,
    games: [normalized, ...archive.games.filter((item) => item.id !== normalized.id)],
  });
}

export function removeGame(archive, gameId) {
  return { ...archive, games: archive.games.filter((game) => game.id !== gameId) };
}

export function rememberStartingLineups(archive, game) {
  const updatedAt = new Date().toISOString();
  const lineupPresets = { ...archive.lineupPresets };
  for (const side of ['away', 'home']) {
    const team = game.config[`${side}Team`];
    lineupPresets[team] = {
      lineup: structuredClone(game.config[`${side}Lineup`]),
      pitcher: structuredClone(game.config[`${side}Pitcher`]),
      updatedAt,
    };
  }
  return { ...archive, lineupPresets };
}

export function exportArchiveJson(archive) {
  return JSON.stringify({
    ...normalizeArchive(archive),
    exportedAt: new Date().toISOString(),
  }, null, 2);
}

export function mergeArchive(archive, importedText) {
  const imported = normalizeArchive(JSON.parse(importedText));
  const games = new Map(archive.games.map((game) => [game.id, game]));
  for (const game of imported.games) {
    const current = games.get(game.id);
    if (!current || game.savedAt > current.savedAt) games.set(game.id, game);
  }
  const lineupPresets = { ...archive.lineupPresets };
  for (const [team, preset] of Object.entries(imported.lineupPresets)) {
    const current = lineupPresets[team];
    if (!current || preset.updatedAt > current.updatedAt) lineupPresets[team] = preset;
  }
  return normalizeArchive({
    version: ARCHIVE_VERSION,
    games: [...games.values()],
    lineupPresets,
  });
}
