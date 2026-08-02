export const GIANTS = '読売ジャイアンツ';
export const STORAGE_KEY = 'npbPlateAppearanceRecorder.v1';
export const LINEUP_POSITIONS = ['投', '捕', '一', '二', '三', '遊', '左', '中', '右', '指'];
export const DEFAULT_LINEUP_POSITIONS = ['中', '二', '右', '一', '三', '左', '遊', '捕', '投'];

export const PITCH_TYPES = [
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
  'ファウルフライ',
  '単打',
  '二塁打',
  '三塁打',
  '本塁打',
  '四球',
  '死球',
  '犠打',
  '犠飛',
  '失策',
  '野選',
  '併殺打',
  'その他',
];

export const HIT_RESULTS = new Set(['単打', '二塁打', '三塁打', '本塁打']);
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
    version: 1,
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
  } else if (result === '四球' || result === '死球') {
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

export function applyPlateAppearance(game, payload) {
  const next = clone(game);
  const before = stateSnapshot(game);
  next.undoStack = [...game.undoStack.slice(-19), before];

  const { offenseSide, defenseSide } = getSides(next);
  const offenseTeam = next.config[`${offenseSide}Team`];
  const defenseTeam = next.config[`${defenseSide}Team`];
  const beforeBases = clone(next.bases);
  const beforeOuts = next.outs;
  const newBases = { first: null, second: null, third: null };
  const scored = [];
  let addedOuts = 0;

  for (const outcome of payload.runnerOutcomes) {
    if (outcome.destination === 'out') addedOuts += 1;
    else if (outcome.destination === 'score') scored.push(outcome.runner);
    else if (['first', 'second', 'third'].includes(outcome.destination)) newBases[outcome.destination] = outcome.runner;
  }

  const inningIndex = next.inning - 1;
  const currentRuns = next.lineScore[offenseSide][inningIndex] ?? 0;
  next.lineScore[offenseSide][inningIndex] = currentRuns + scored.length;
  if (HIT_RESULTS.has(payload.result)) next.hits[offenseSide] += 1;
  if (payload.result === '失策') next.errors[defenseSide] += 1;
  next.bases = newBases;
  next.outs += addedOuts;
  next.battingIndexes[offenseSide] = (next.battingIndexes[offenseSide] + 1) % 9;

  const event = {
    number: next.events.length + 1,
    recordedAt: new Date().toISOString(),
    inning: next.inning,
    half: next.half,
    offenseSide,
    offenseTeam,
    defenseTeam,
    pitcher: payload.pitcher,
    batter: payload.batter,
    pitchType: payload.pitchType,
    speed: payload.speed,
    result: payload.result,
    outsBefore: beforeOuts,
    outsAfter: Math.min(next.outs, 3),
    basesBefore: beforeBases,
    basesAfter: clone(newBases),
    runnerOutcomes: payload.runnerOutcomes,
    scored,
    scoreAfter: {
      away: next.lineScore.away.reduce((sum, value) => sum + (value ?? 0), 0),
      home: next.lineScore.home.reduce((sum, value) => sum + (value ?? 0), 0),
    },
  };
  next.events.push(event);

  if (next.outs >= 3) {
    next.outs = 0;
    next.bases = { first: null, second: null, third: null };
    if (next.half === 'top') {
      next.half = 'bottom';
    } else if (next.inning >= 12) {
      next.finished = true;
    } else {
      next.half = 'top';
      next.inning += 1;
    }
  }

  next.savedAt = new Date().toISOString();
  return next;
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
  next.undoStack = [...game.undoStack.slice(-19), stateSnapshot(game)];
  next.pitchers[side] = pitcher;
  next.savedAt = new Date().toISOString();
  return next;
}

export function substituteBatter(game, side, lineupIndex, batter) {
  const next = clone(game);
  next.undoStack = [...game.undoStack.slice(-19), stateSnapshot(game)];
  const current = next.config[`${side}Lineup`][lineupIndex];
  next.config[`${side}Lineup`][lineupIndex] = {
    ...batter,
    lineupPosition: current?.lineupPosition ?? batter.lineupPosition ?? '',
  };
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
    '試合ID', '日付', '打席番号', '回', '表裏', '攻撃球団', '守備球団', '投手ID', '投手名', '打者ID', '打者名', '打者ポジション',
    '球種', '球速kmh', '打席結果', '開始時アウト', '終了時アウト', '一塁走者開始', '二塁走者開始', '三塁走者開始',
    '一塁走者終了', '二塁走者終了', '三塁走者終了', '得点走者', '得点', 'ビジター得点', 'ホーム得点', '記録時刻',
  ];
  const rows = game.events.map((event) => [
    game.id, game.config.date, event.number, event.inning, event.half === 'top' ? '表' : '裏', event.offenseTeam, event.defenseTeam,
    event.pitcher.id, event.pitcher.name, event.batter.id, event.batter.name, event.batter.lineupPosition, event.pitchType, event.speed, event.result,
    event.outsBefore, event.outsAfter, runnerName(event.basesBefore.first), runnerName(event.basesBefore.second), runnerName(event.basesBefore.third),
    runnerName(event.basesAfter.first), runnerName(event.basesAfter.second), runnerName(event.basesAfter.third), event.scored.map(runnerName).join(' / '),
    event.scored.length, event.scoreAfter.away, event.scoreAfter.home, event.recordedAt,
  ]);
  return `\uFEFF${[headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n')}`;
}
