export const GIANTS = '読売ジャイアンツ';
export const STORAGE_KEY = 'npbPlateAppearanceRecorder.v1';
export const LINEUP_POSITIONS = ['投', '捕', '一', '二', '三', '遊', '左', '中', '右', '指'];
export const DEFAULT_LINEUP_POSITIONS = ['中', '二', '右', '一', '三', '左', '遊', '捕', '投'];

export const PITCH_TYPES = [
  '投球なし',
  'ストレート',
  'ツーシーム',
  'カットボール',
  'スライダー',
  'カーブ',
  'フォーク',
  'スプリット',
  'チェンジアップ',
  'シンカー',
  'シュート',
  'その他',
  '不明',
];

export const RESULTS = [
  '空振り三振',
  '見逃し三振',
  '投ゴロ',
  '一ゴロ',
  '二ゴロ',
  '三ゴロ',
  '遊ゴロ',
  '左飛',
  '中飛',
  '右飛',
  'ライナー',
  '内野フライ',
  'ファウルフライ',
  '単打',
  '二塁打',
  '三塁打',
  '本塁打',
  '四球',
  '申告敬遠',
  '敬遠（申告なし）',
  '死球',
  '犠打',
  '犠飛',
  '失策',
  '野選',
  '併殺打',
  'その他',
];

export const HIT_RESULTS = new Set(['単打', '二塁打', '三塁打', '本塁打']);
export const WALK_RESULTS = new Set(['四球', '申告敬遠', '敬遠（申告なし）']);
export const STRIKEOUT_RESULTS = new Set(['空振り三振', '見逃し三振']);
export const NON_AT_BAT_RESULTS = new Set([...WALK_RESULTS, '死球', '犠打', '犠飛']);
export const OUT_RESULTS = new Set([
  '空振り三振',
  '見逃し三振',
  '投ゴロ',
  '一ゴロ',
  '二ゴロ',
  '三ゴロ',
  '遊ゴロ',
  '左飛',
  '中飛',
  '右飛',
  'ライナー',
  '内野フライ',
  'ファウルフライ',
  '犠打',
  '犠飛',
  '併殺打',
]);

export function shortTeamName(team) {
  const names = {
    読売ジャイアンツ: '巨人',
    阪神タイガース: '阪神',
    横浜DeNAベイスターズ: 'DeNA',
    広島東洋カープ: '広島',
    中日ドラゴンズ: '中日',
    東京ヤクルトスワローズ: 'ヤクルト',
    福岡ソフトバンクホークス: 'ソフトバンク',
    北海道日本ハムファイターズ: '日本ハム',
    千葉ロッテマリーンズ: 'ロッテ',
    東北楽天ゴールデンイーグルス: '楽天',
    オリックス・バファローズ: 'オリックス',
    埼玉西武ライオンズ: '西武',
  };
  return names[team] ?? team;
}

export function emptyLineScore() {
  return Array.from({ length: 12 }, () => null);
}

export function buildInitialGame(config) {
  const now = new Date();
  return {
    version: 2,
    id: `${config.date.replaceAll('-', '')}-${Date.now()}`,
    createdAt: now.toISOString(),
    savedAt: now.toISOString(),
    config,
    inning: 1,
    half: 'top',
    outs: 0,
    bases: { first: null, second: null, third: null },
    battingIndexes: { away: 0, home: 0 },
    pitchers: { away: config.awayPitcher, home: config.homePitcher },
    lineScore: { away: emptyLineScore(), home: emptyLineScore() },
    hits: { away: 0, home: 0 },
    errors: { away: 0, home: 0 },
    events: [],
    undoStack: [],
    finished: false,
  };
}

export function getSides(game) {
  const offenseSide = game.half === 'top' ? 'away' : 'home';
  const defenseSide = offenseSide === 'away' ? 'home' : 'away';
  return { offenseSide, defenseSide };
}

export function currentMatchup(game) {
  const { offenseSide, defenseSide } = getSides(game);
  const lineup = game.config[`${offenseSide}Lineup`];
  return {
    offenseSide,
    defenseSide,
    batter: lineup[game.battingIndexes[offenseSide]],
    pitcher: game.pitchers[defenseSide],
  };
}

export function defaultRunnerOutcomes(game, batter, result) {
  const entries = [];
  if (game.bases.third) entries.push({ source: 'third', runner: game.bases.third, destination: 'third' });
  if (game.bases.second) entries.push({ source: 'second', runner: game.bases.second, destination: 'second' });
  if (game.bases.first) entries.push({ source: 'first', runner: game.bases.first, destination: 'first' });
  entries.push({ source: 'batter', runner: batter, destination: 'out' });

  const move = (source, destination) => {
    const entry = entries.find((item) => item.source === source);
    if (entry) entry.destination = destination;
  };

  if (result === '単打') {
    move('third', 'score'); move('second', 'third'); move('first', 'second'); move('batter', 'first');
  } else if (result === '二塁打') {
    move('third', 'score'); move('second', 'score'); move('first', 'third'); move('batter', 'second');
  } else if (result === '三塁打') {
    move('third', 'score'); move('second', 'score'); move('first', 'score'); move('batter', 'third');
  } else if (result === '本塁打') {
    entries.forEach((entry) => { entry.destination = 'score'; });
  } else if (WALK_RESULTS.has(result) || result === '死球') {
    move('batter', 'first');
    if (game.bases.first) {
      move('first', 'second');
      if (game.bases.second) {
        move('second', 'third');
        if (game.bases.third) move('third', 'score');
      }
    }
  } else if (result === '失策' || result === '野選') {
    move('batter', 'first');
  } else if (result === '犠飛') {
    move('third', 'score');
  } else if (result === '犠打') {
    move('first', 'second'); move('second', 'third');
  } else if (result === '併殺打') {
    if (game.bases.first) move('first', 'out');
  }

  return entries;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function stateSnapshot(game) {
  const snapshot = clone(game);
  snapshot.undoStack = [];
  return snapshot;
}

export function eventType(event) {
  return event.type ?? 'plateAppearance';
}

export function totalScore(game, side) {
  return game.lineScore[side].reduce((sum, value) => sum + (value ?? 0), 0);
}

function addRuns(next, side, count) {
  const inningIndex = next.inning - 1;
  next.lineScore[side][inningIndex] = (next.lineScore[side][inningIndex] ?? 0) + count;
}

function resolveOutcomes(outcomes) {
  const newBases = { first: null, second: null, third: null };
  const scored = [];
  let addedOuts = 0;
  for (const outcome of outcomes) {
    if (outcome.destination === 'out') addedOuts += 1;
    else if (outcome.destination === 'score') scored.push(outcome.runner);
    else if (['first', 'second', 'third'].includes(outcome.destination)) newBases[outcome.destination] = outcome.runner;
  }
  return { newBases, scored, addedOuts };
}

function scoreSnapshot(next) {
  return { away: totalScore(next, 'away'), home: totalScore(next, 'home') };
}

function advanceAfterOuts(next) {
  if (next.outs < 3 || next.finished) return;
  const awayScore = totalScore(next, 'away');
  const homeScore = totalScore(next, 'home');
  next.outs = 0;
  next.bases = { first: null, second: null, third: null };

  if (next.half === 'top') {
    if (next.inning >= 9 && homeScore > awayScore) {
      next.finished = true;
    } else {
      next.half = 'bottom';
    }
  } else if ((next.inning >= 9 && awayScore !== homeScore) || next.inning >= 12) {
    next.finished = true;
  } else {
    next.half = 'top';
    next.inning += 1;
  }
}

function finishWalkOff(next) {
  if (next.half === 'bottom' && next.inning >= 9 && totalScore(next, 'home') > totalScore(next, 'away')) {
    next.finished = true;
  }
}

function addUndo(next, game) {
  next.undoStack = [...game.undoStack.slice(-19), stateSnapshot(game)];
}

function pushGameEvent(next, event) {
  next.events.push({
    number: next.events.length + 1,
    recordedAt: new Date().toISOString(),
    ...event,
  });
}

export function applyPlateAppearance(game, payload) {
  const next = clone(game);
  addUndo(next, game);

  const { offenseSide, defenseSide } = getSides(next);
  const offenseTeam = next.config[`${offenseSide}Team`];
  const defenseTeam = next.config[`${defenseSide}Team`];
  const beforeBases = clone(next.bases);
  const beforeOuts = next.outs;
  const lineupIndex = next.battingIndexes[offenseSide];
  const { newBases, scored, addedOuts } = resolveOutcomes(payload.runnerOutcomes);

  addRuns(next, offenseSide, scored.length);
  if (HIT_RESULTS.has(payload.result)) next.hits[offenseSide] += 1;
  if (payload.result === '失策') next.errors[defenseSide] += 1;
  next.bases = newBases;
  next.outs += addedOuts;
  next.battingIndexes[offenseSide] = (lineupIndex + 1) % 9;

  pushGameEvent(next, {
    type: 'plateAppearance',
    plateAppearanceNumber: next.events.filter((event) => eventType(event) === 'plateAppearance').length + 1,
    inning: next.inning,
    half: next.half,
    offenseSide,
    offenseTeam,
    defenseTeam,
    lineupIndex,
    pitcher: payload.pitcher,
    batter: payload.batter,
    pitchType: payload.result === '申告敬遠' ? '投球なし' : payload.pitchType,
    speed: payload.result === '申告敬遠' ? '' : payload.speed,
    result: payload.result,
    rbi: Math.max(0, Math.min(Number(payload.rbi ?? 0), scored.length)),
    outsBefore: beforeOuts,
    outsAfter: Math.min(next.outs, 3),
    basesBefore: beforeBases,
    basesAfter: clone(newBases),
    runnerOutcomes: payload.runnerOutcomes,
    scored,
    scoreAfter: scoreSnapshot(next),
  });

  finishWalkOff(next);
  advanceAfterOuts(next);
  next.savedAt = new Date().toISOString();
  return next;
}

export function applyRunnerAction(game, payload) {
  const next = clone(game);
  addUndo(next, game);
  const { offenseSide, defenseSide } = getSides(next);
  const beforeBases = clone(next.bases);
  const beforeOuts = next.outs;
  const { newBases, scored, addedOuts } = resolveOutcomes(payload.runnerOutcomes);

  addRuns(next, offenseSide, scored.length);
  next.bases = newBases;
  next.outs += addedOuts;
  pushGameEvent(next, {
    type: 'runnerAction',
    inning: next.inning,
    half: next.half,
    offenseSide,
    offenseTeam: next.config[`${offenseSide}Team`],
    defenseTeam: next.config[`${defenseSide}Team`],
    action: payload.action,
    description: payload.description,
    outsBefore: beforeOuts,
    outsAfter: Math.min(next.outs, 3),
    basesBefore: beforeBases,
    basesAfter: clone(newBases),
    runnerOutcomes: payload.runnerOutcomes,
    scored,
    scoreAfter: scoreSnapshot(next),
  });

  finishWalkOff(next);
  advanceAfterOuts(next);
  next.savedAt = new Date().toISOString();
  return next;
}

function blankBattingLine(player, lineupIndex = null) {
  return {
    player,
    lineupIndex,
    pa: 0,
    ab: 0,
    runs: 0,
    hits: 0,
    doubles: 0,
    triples: 0,
    homeRuns: 0,
    rbi: 0,
    walks: 0,
    hbp: 0,
    strikeouts: 0,
    sacrifices: 0,
    sacrificeFlies: 0,
    totalBases: 0,
  };
}

function displayRate(numerator, denominator) {
  if (!denominator) return '.000';
  return (numerator / denominator).toFixed(3).replace(/^0/, '');
}

export function getGameBattingStats(game, side) {
  const lines = new Map();
  const ensure = (player, lineupIndex = null) => {
    if (!lines.has(player.id)) lines.set(player.id, blankBattingLine(player, lineupIndex));
    else if (lines.get(player.id).lineupIndex == null && lineupIndex != null) lines.get(player.id).lineupIndex = lineupIndex;
    return lines.get(player.id);
  };

  game.config[`${side}Lineup`].forEach((player, index) => ensure(player, index));
  for (const event of game.events) {
    if (eventType(event) !== 'plateAppearance' || event.offenseSide !== side) continue;
    const line = ensure(event.batter, event.lineupIndex);
    line.pa += 1;
    if (!NON_AT_BAT_RESULTS.has(event.result)) line.ab += 1;
    if (HIT_RESULTS.has(event.result)) line.hits += 1;
    if (event.result === '二塁打') line.doubles += 1;
    if (event.result === '三塁打') line.triples += 1;
    if (event.result === '本塁打') line.homeRuns += 1;
    if (WALK_RESULTS.has(event.result)) line.walks += 1;
    if (event.result === '死球') line.hbp += 1;
    if (STRIKEOUT_RESULTS.has(event.result)) line.strikeouts += 1;
    if (event.result === '犠打') line.sacrifices += 1;
    if (event.result === '犠飛') line.sacrificeFlies += 1;
    line.rbi += Number(event.rbi ?? 0);
    if (event.result === '単打') line.totalBases += 1;
    if (event.result === '二塁打') line.totalBases += 2;
    if (event.result === '三塁打') line.totalBases += 3;
    if (event.result === '本塁打') line.totalBases += 4;
  }

  for (const event of game.events) {
    if (event.offenseSide !== side) continue;
    for (const runner of event.scored ?? []) ensure(runner).runs += 1;
  }

  return [...lines.values()]
    .map((line) => {
      const obpDenominator = line.ab + line.walks + line.hbp + line.sacrificeFlies;
      const obpNumerator = line.hits + line.walks + line.hbp;
      const avg = displayRate(line.hits, line.ab);
      const obp = obpDenominator ? obpNumerator / obpDenominator : 0;
      const slg = line.ab ? line.totalBases / line.ab : 0;
      return { ...line, avg, ops: (obp + slg).toFixed(3).replace(/^0/, '') };
    })
    .sort((a, b) => (a.lineupIndex ?? 99) - (b.lineupIndex ?? 99));
}

export function getPlayerGameStats(game, side, playerId) {
  return getGameBattingStats(game, side).find((line) => line.player.id === playerId) ?? null;
}

export function undoLast(game) {
  if (!game.undoStack.length) return game;
  const previous = clone(game.undoStack.at(-1));
  previous.undoStack = game.undoStack.slice(0, -1);
  previous.savedAt = new Date().toISOString();
  return previous;
}

export function substitutePitcher(game, side, pitcher) {
  const next = clone(game);
  addUndo(next, game);
  const previous = next.pitchers[side];
  next.pitchers[side] = pitcher;
  const pitcherSlot = next.config[`${side}Lineup`].findIndex((player) => player.lineupPosition === '投');
  if (pitcherSlot >= 0) next.config[`${side}Lineup`][pitcherSlot] = { ...pitcher, lineupPosition: '投' };
  pushGameEvent(next, {
    type: 'substitution',
    substitutionType: '投手交代',
    inning: next.inning,
    half: next.half,
    side,
    team: next.config[`${side}Team`],
    previousPlayer: previous,
    newPlayer: pitcher,
    description: `投手交代　${previous?.name ?? '−'} → ${pitcher.name}`,
    scored: [],
    scoreAfter: scoreSnapshot(next),
  });
  next.savedAt = new Date().toISOString();
  return next;
}

export function substituteBatter(game, side, lineupIndex, batter) {
  const next = clone(game);
  addUndo(next, game);
  const current = next.config[`${side}Lineup`][lineupIndex];
  next.config[`${side}Lineup`][lineupIndex] = {
    ...batter,
    lineupPosition: current?.lineupPosition ?? batter.lineupPosition ?? '',
  };
  pushGameEvent(next, {
    type: 'substitution',
    substitutionType: '代打',
    inning: next.inning,
    half: next.half,
    side,
    team: next.config[`${side}Team`],
    lineupIndex,
    previousPlayer: current,
    newPlayer: batter,
    description: `代打　${current?.name ?? '−'} → ${batter.name}`,
    scored: [],
    scoreAfter: scoreSnapshot(next),
  });
  next.savedAt = new Date().toISOString();
  return next;
}

export function substituteRunner(game, base, runner) {
  const next = clone(game);
  const { offenseSide } = getSides(next);
  const previous = next.bases[base];
  if (!previous) return game;
  const lineup = next.config[`${offenseSide}Lineup`];
  const lineupIndex = lineup.findIndex((player) => player.id === previous.id);
  if (lineupIndex < 0) return game;
  addUndo(next, game);
  const replacement = { ...runner, lineupPosition: lineup[lineupIndex].lineupPosition };
  lineup[lineupIndex] = replacement;
  next.bases[base] = replacement;
  const baseLabel = { first: '一塁', second: '二塁', third: '三塁' }[base];
  pushGameEvent(next, {
    type: 'substitution',
    substitutionType: '代走',
    inning: next.inning,
    half: next.half,
    side: offenseSide,
    team: next.config[`${offenseSide}Team`],
    lineupIndex,
    base,
    previousPlayer: previous,
    newPlayer: replacement,
    description: `代走（${baseLabel}）　${previous.name} → ${runner.name}`,
    scored: [],
    scoreAfter: scoreSnapshot(next),
  });
  next.savedAt = new Date().toISOString();
  return next;
}

export function substituteFielder(game, side, lineupIndex, player, position) {
  const next = clone(game);
  const lineup = next.config[`${side}Lineup`];
  const previous = lineup[lineupIndex];
  if (!previous) return game;
  addUndo(next, game);
  const previousPosition = previous.lineupPosition;
  const swapIndex = lineup.findIndex((item, index) => index !== lineupIndex && item.lineupPosition === position);
  const replacement = { ...player, lineupPosition: position };
  lineup[lineupIndex] = replacement;
  if (swapIndex >= 0) lineup[swapIndex] = { ...lineup[swapIndex], lineupPosition: previousPosition };

  const pitcherSlot = lineup.find((item) => item.lineupPosition === '投');
  if (pitcherSlot) next.pitchers[side] = pitcherSlot;
  const swapText = swapIndex >= 0 ? `、${lineup[swapIndex].name}は${previousPosition}` : '';
  pushGameEvent(next, {
    type: 'substitution',
    substitutionType: '守備交代',
    inning: next.inning,
    half: next.half,
    side,
    team: next.config[`${side}Team`],
    lineupIndex,
    previousPlayer: previous,
    newPlayer: replacement,
    position,
    description: `守備交代　${previous.name} → ${player.name}（${position}）${swapText}`,
    scored: [],
    scoreAfter: scoreSnapshot(next),
  });
  next.savedAt = new Date().toISOString();
  return next;
}

function escapeCsv(value) {
  const string = String(value ?? '');
  return /[",\r\n]/.test(string) ? `"${string.replaceAll('"', '""')}"` : string;
}

function runnerName(runner) {
  return runner?.name ?? '';
}

export function exportGameCsv(game) {
  const headers = [
    '試合ID', '日付', '記録番号', '記録種別', '打席番号', '回', '表裏', '攻撃球団', '守備球団', '投手ID', '投手名',
    '打者ID', '打者名', '打者ポジション', '球種', '球速kmh', '打席結果', '打点', 'プレー内容', '開始時アウト', '終了時アウト',
    '一塁走者開始', '二塁走者開始', '三塁走者開始', '一塁走者終了', '二塁走者終了', '三塁走者終了',
    '得点走者', '得点', 'ビジター得点', 'ホーム得点', '記録時刻',
  ];
  const typeLabels = { plateAppearance: '打席', runnerAction: '走者プレー', substitution: '交代' };
  const rows = game.events.map((event) => {
    const type = eventType(event);
    return [
      game.id, game.config.date, event.number, typeLabels[type] ?? type, event.plateAppearanceNumber ?? '', event.inning,
      event.half === 'top' ? '表' : '裏', event.offenseTeam ?? event.team ?? '', event.defenseTeam ?? '',
      event.pitcher?.id ?? '', event.pitcher?.name ?? '', event.batter?.id ?? '', event.batter?.name ?? '',
      event.batter?.lineupPosition ?? '', event.pitchType ?? '', event.speed ?? '', event.result ?? '', event.rbi ?? '',
      event.description ?? event.action ?? '', event.outsBefore ?? '', event.outsAfter ?? '',
      runnerName(event.basesBefore?.first), runnerName(event.basesBefore?.second), runnerName(event.basesBefore?.third),
      runnerName(event.basesAfter?.first), runnerName(event.basesAfter?.second), runnerName(event.basesAfter?.third),
      (event.scored ?? []).map(runnerName).join(' / '), (event.scored ?? []).length,
      event.scoreAfter?.away ?? totalScore(game, 'away'), event.scoreAfter?.home ?? totalScore(game, 'home'), event.recordedAt,
    ];
  });
  return `\uFEFF${[headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n')}`;
}
