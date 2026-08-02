import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyPlateAppearance,
  buildInitialGame,
  canQuickRecord,
  defaultRunnerOutcomes,
  getGameBattingStats,
  suggestedRbi,
} from './game.js';

function player(id, name, lineupPosition) {
  return { id, name, team: 'テスト球団', position: '内野手', lineupPosition };
}

function testGame() {
  const positions = ['中', '二', '右', '一', '三', '左', '遊', '捕', '投'];
  const awayLineup = positions.map((position, index) => player(`a${index}`, `ビジター${index + 1}`, position));
  const homeLineup = positions.map((position, index) => player(`h${index}`, `ホーム${index + 1}`, position));
  return buildInitialGame({
    date: '2026-08-02',
    awayTeam: '阪神タイガース',
    homeTeam: '読売ジャイアンツ',
    awayLineup,
    homeLineup,
    awayPitcher: awayLineup[8],
    homePitcher: homeLineup[8],
  });
}

test('走者なしの通常結果だけクイック記録を許可する', () => {
  const game = testGame();
  assert.equal(canQuickRecord(game, '空振り三振'), true);
  assert.equal(canQuickRecord(game, '本塁打'), true);
  assert.equal(canQuickRecord(game, '犠飛'), false);
  assert.equal(canQuickRecord(game, ''), false);

  game.bases.first = game.config.awayLineup[1];
  assert.equal(canQuickRecord(game, '空振り三振'), false);
});

test('走者なし本塁打のクイック記録で1得点1打点になる', () => {
  const game = testGame();
  const batter = game.config.awayLineup[0];
  const outcomes = defaultRunnerOutcomes(game, batter, '本塁打');
  const next = applyPlateAppearance(game, {
    batter,
    pitcher: game.config.homePitcher,
    pitchType: 'ストレート',
    speed: '150',
    result: '本塁打',
    runnerOutcomes: outcomes,
    rbi: suggestedRbi('本塁打', outcomes),
  });

  assert.equal(next.lineScore.away[0], 1);
  assert.equal(next.events[0].rbi, 1);
  assert.equal(next.events[0].scored[0].id, batter.id);
  assert.equal(next.battingIndexes.away, 1);
});

test('1打席の凡打は打数を1だけ加算する', () => {
  const game = testGame();
  const batter = game.config.awayLineup[0];
  const outcomes = defaultRunnerOutcomes(game, batter, '遊ゴロ');
  const next = applyPlateAppearance(game, {
    batter,
    pitcher: game.config.homePitcher,
    pitchType: '不明',
    speed: '',
    result: '遊ゴロ',
    runnerOutcomes: outcomes,
    rbi: 0,
  });

  const stats = getGameBattingStats(next, 'away').find((line) => line.player.id === batter.id);
  assert.equal(stats.pa, 1);
  assert.equal(stats.ab, 1);
  assert.equal(stats.hits, 0);
});
