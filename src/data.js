import playerMasterCsv from '../選手管理.csv?raw';
import pitcherStatsCsv from '../選手別成績.csv?raw';
import matchupStatsCsv from '../選手同士成績.csv?raw';
import batterStatsCsv from '../batter_stas.csv?raw';

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(field);
      if (row.some((value) => value !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [headers, ...body] = rows;
  return body.map((values) => Object.fromEntries(headers.map((header, i) => [header, values[i] ?? ''])));
}

const players = parseCsv(playerMasterCsv).map((player) => ({
  id: player.ID,
  team: player.球団名,
  name: player.選手名,
  position: player.ポジション,
  registration: player.区分,
  note: player.備考,
}));

const pitcherStats = new Map(
  parseCsv(pitcherStatsCsv).map((row) => [row.投手ID, row]),
);

const matchupRows = parseCsv(matchupStatsCsv);
const matchupStats = new Map(matchupRows.map((row) => [`${row.投手ID}|${row.野手ID}`, row]));

const batterStats = new Map(parseCsv(batterStatsCsv).map((row) => [row.選手ID, row]));

function displayRate(value) {
  return value ? value.replace(/^0(?=\.)/, '') : '---';
}

export function getBatterStats(id) {
  const row = batterStats.get(id);
  if (!row) return { avg: '---', hr: '0', ops: '---', pa: 0, ab: 0, hits: 0, rbi: 0 };
  return {
    pa: Number(row.打席 || 0),
    ab: Number(row.打数 || 0),
    hits: Number(row.安打 || 0),
    hr: row.本塁打 || '0',
    rbi: Number(row.打点 || 0),
    avg: displayRate(row.打率),
    obp: displayRate(row.出塁率),
    slg: displayRate(row.長打率),
    ops: displayRate(row.OPS),
    updatedAt: row.更新日,
  };
}

export function getPitcherStats(id) {
  const row = pitcherStats.get(id);
  return {
    era: row?.防御率 || '---',
    whip: row?.WHIP || '---',
    strikeouts: row?.奪三振 || '---',
  };
}

export function getMatchupStats(pitcherId, batterId) {
  const row = matchupStats.get(`${pitcherId}|${batterId}`);
  if (!row || Number(row.打席 || 0) === 0) return null;
  return {
    pa: row.打席,
    hits: row.安打,
    hr: row.本塁打,
    avg: row.打率,
    ops: row.OPS,
  };
}

export const dataStore = {
  players,
  teams: [...new Set(players.map((player) => player.team))].sort((a, b) => a.localeCompare(b, 'ja')),
  playersFor(team, position) {
    return players
      .filter((player) => player.team === team && (!position || player.position === position))
      .sort((a, b) => {
        if (a.registration !== b.registration) return a.registration === '支配下' ? -1 : 1;
        return a.name.localeCompare(b.name, 'ja');
      });
  },
  playerByTeamAndId(team, id) {
    return players.find((player) => player.team === team && player.id === id) ?? null;
  },
};
