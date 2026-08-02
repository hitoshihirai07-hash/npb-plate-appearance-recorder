import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInitialGame, STORAGE_KEY } from './game.js';
import {
  ARCHIVE_KEY,
  emptyArchive,
  exportArchiveJson,
  loadArchive,
  mergeArchive,
  rememberStartingLineups,
  upsertGame,
} from './storage.js';

class MemoryStorage {
  values = new Map();

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }
}

function player(id, name, lineupPosition) {
  return { id, name, team: 'テスト球団', position: '内野手', lineupPosition };
}

function testGame(id, date) {
  const positions = ['中', '二', '右', '一', '三', '左', '遊', '捕', '投'];
  const awayLineup = positions.map((position, index) => player(`a${index}`, `ビジター${index + 1}`, position));
  const homeLineup = positions.map((position, index) => player(`h${index}`, `ホーム${index + 1}`, position));
  return {
    ...buildInitialGame({
      date,
      awayTeam: '阪神タイガース',
      homeTeam: '読売ジャイアンツ',
      awayLineup,
      homeLineup,
      awayPitcher: awayLineup[8],
      homePitcher: homeLineup[8],
    }),
    id,
  };
}

test('以前の1試合保存を複数試合アーカイブへ移行する', () => {
  const storage = new MemoryStorage();
  storage.setItem(STORAGE_KEY, JSON.stringify(testGame('legacy-game', '2026-08-01')));

  const result = loadArchive(storage);
  assert.equal(result.error, '');
  assert.equal(result.archive.games.length, 1);
  assert.equal(result.archive.games[0].id, 'legacy-game');
  assert.ok(storage.getItem(ARCHIVE_KEY));
});

test('複数試合を保持し、保存時は大きな取り消し履歴を除外する', () => {
  const first = testGame('game-1', '2026-08-01');
  first.undoStack = [{ events: Array.from({ length: 20 }, () => ({ result: '単打' })) }];
  const second = testGame('game-2', '2026-08-02');

  const archive = upsertGame(upsertGame(emptyArchive(), first), second);
  assert.deepEqual(new Set(archive.games.map((game) => game.id)), new Set(['game-1', 'game-2']));
  assert.deepEqual(archive.games.find((game) => game.id === 'game-1').undoStack, []);
});

test('球団ごとのスタメンを保存し、バックアップを統合できる', () => {
  const first = testGame('game-1', '2026-08-01');
  const second = testGame('game-2', '2026-08-02');
  let archive = rememberStartingLineups(upsertGame(emptyArchive(), first), first);
  assert.equal(archive.lineupPresets['読売ジャイアンツ'].lineup.length, 9);

  const backup = exportArchiveJson(upsertGame(emptyArchive(), second));
  archive = mergeArchive(archive, backup);
  assert.equal(archive.games.length, 2);
  assert.equal(archive.lineupPresets['読売ジャイアンツ'].pitcher.id, first.config.homePitcher.id);
});
