import { useMemo, useState } from 'react';
import { dataStore } from '../data';
import {
  buildInitialGame,
  DEFAULT_LINEUP_POSITIONS,
  GIANTS,
  LINEUP_POSITIONS,
  shortTeamName,
} from '../game';
import PlayerSearchInput from './PlayerSearchInput';

function defaultPitcher(team) {
  return dataStore.playersFor(team, '投手').find((player) => player.registration === '支配下')
    ?? dataStore.playersFor(team, '投手')[0];
}

function defaultLineup(team) {
  const eligible = dataStore.playersFor(team).filter((player) => player.position !== '投手');
  const controlled = eligible.filter((player) => player.registration === '支配下');
  const hitters = (controlled.length >= 8 ? controlled : eligible).slice(0, 8);
  const pitcher = defaultPitcher(team);
  return [...hitters, pitcher].map((player, index) => ({
    ...player,
    lineupPosition: DEFAULT_LINEUP_POSITIONS[index],
  }));
}

function LineupEditor({ team, lineup, onChange }) {
  const options = useMemo(() => dataStore.playersFor(team), [team]);

  const changePlayer = (index, selected) => {
    onChange(lineup.map((item, itemIndex) => (
      itemIndex === index
        ? { ...selected, lineupPosition: item.lineupPosition }
        : item
    )));
  };

  const changePosition = (index, position) => {
    onChange(lineup.map((item, itemIndex) => (
      itemIndex === index ? { ...item, lineupPosition: position } : item
    )));
  };

  return (
    <section className="setup-lineup" aria-labelledby={`lineup-${team}`}>
      <div className="setup-lineup__heading">
        <h3 id={`lineup-${team}`}>{shortTeamName(team)} 打順</h3>
        <span>位置を選び、選手名で検索</span>
      </div>
      <div className="setup-lineup__columns" aria-hidden="true">
        <span>打順</span><span>位置</span><span>選手</span>
      </div>
      <ol className="setup-lineup__list">
        {lineup.map((player, index) => (
          <li key={`${team}-${index}`}>
            <span className="batting-order-number">{index + 1}</span>
            <select
              className="lineup-position-select"
              aria-label={`${shortTeamName(team)} ${index + 1}番のポジション`}
              value={player?.lineupPosition ?? ''}
              onChange={(event) => changePosition(index, event.target.value)}
            >
              {LINEUP_POSITIONS.map((position) => <option key={position} value={position}>{position}</option>)}
            </select>
            <PlayerSearchInput
              ariaLabel={`${shortTeamName(team)} ${index + 1}番打者`}
              value={player}
              options={options}
              onChange={(selected) => changePlayer(index, selected)}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}

export default function SetupScreen({ savedGame, onStart, onResume, onViewResult }) {
  const opponents = dataStore.teams.filter((team) => team !== GIANTS);
  const [date, setDate] = useState(new Date().toLocaleDateString('sv-SE'));
  const [giantsSide, setGiantsSide] = useState('home');
  const [opponent, setOpponent] = useState(opponents.find((team) => team === '阪神タイガース') ?? opponents[0]);
  const awayTeam = giantsSide === 'away' ? GIANTS : opponent;
  const homeTeam = giantsSide === 'home' ? GIANTS : opponent;
  const [lineups, setLineups] = useState(() => ({
    [GIANTS]: defaultLineup(GIANTS),
    [opponent]: defaultLineup(opponent),
  }));
  const [pitchers, setPitchers] = useState(() => ({
    [GIANTS]: defaultPitcher(GIANTS),
    [opponent]: defaultPitcher(opponent),
  }));
  const [error, setError] = useState('');

  const changeOpponent = (team) => {
    setOpponent(team);
    setLineups((current) => ({ ...current, [team]: current[team] ?? defaultLineup(team) }));
    setPitchers((current) => ({ ...current, [team]: current[team] ?? defaultPitcher(team) }));
  };

  const changeStartingPitcher = (team, pitcher) => {
    const previousPitcher = pitchers[team];
    setPitchers((current) => ({ ...current, [team]: pitcher }));
    setLineups((current) => {
      const lineup = current[team] ?? defaultLineup(team);
      const next = lineup.map((player) => (
        player.lineupPosition === '投' && player.id === previousPitcher?.id
          ? { ...pitcher, lineupPosition: '投' }
          : player
      ));
      return { ...current, [team]: next };
    });
  };

  const startGame = () => {
    const awayLineup = lineups[awayTeam] ?? defaultLineup(awayTeam);
    const homeLineup = lineups[homeTeam] ?? defaultLineup(homeTeam);
    if (awayLineup.length !== 9 || homeLineup.length !== 9 || awayLineup.some((item) => !item) || homeLineup.some((item) => !item)) {
      setError('両チームの打順を9人設定してください。');
      return;
    }
    if (!pitchers[awayTeam] || !pitchers[homeTeam]) {
      setError('両チームの先発投手を設定してください。');
      return;
    }
    if (new Set(awayLineup.map((item) => item.id)).size !== 9 || new Set(homeLineup.map((item) => item.id)).size !== 9) {
      setError('同じ選手を打順に複数登録することはできません。');
      return;
    }
    if (new Set(awayLineup.map((item) => item.lineupPosition)).size !== 9
      || new Set(homeLineup.map((item) => item.lineupPosition)).size !== 9) {
      setError('同じ守備位置を打順に複数登録することはできません。「投」または「指」もどちらか一方を設定してください。');
      return;
    }
    const awayPositions = awayLineup.map((item) => item.lineupPosition);
    const homePositions = homeLineup.map((item) => item.lineupPosition);
    if ((awayPositions.includes('投') && awayPositions.includes('指'))
      || (homePositions.includes('投') && homePositions.includes('指'))) {
      setError('「投」と「指」を同じ打順に入れることはできません。今年は「投」、指名打者制では「指」を使用してください。');
      return;
    }
    setError('');
    onStart(buildInitialGame({
      date,
      awayTeam,
      homeTeam,
      awayLineup,
      homeLineup,
      awayPitcher: pitchers[awayTeam],
      homePitcher: pitchers[homeTeam],
    }));
  };

  return (
    <main className="setup-page">
      <header className="setup-header">
        <div>
          <h1>NPB 打席記録</h1>
          <p>守備位置と選手を検索して、両チームの打順を設定します。</p>
        </div>
        {savedGame && (
          <div className="setup-saved-actions">
            <button type="button" className="button button--outline" onClick={onViewResult}>保存結果を見る</button>
            {!savedGame.finished ? (
              <button type="button" className="button button--primary" onClick={onResume}>保存中の試合を再開</button>
            ) : null}
          </div>
        )}
      </header>

      <section className="setup-basics" aria-labelledby="game-settings-title">
        <div className="section-heading">
          <h2 id="game-settings-title">試合設定</h2>
          <p>今年の投手打席は「投」、指名打者制では「指」を選択してください。</p>
        </div>
        <div className="setup-basics__grid">
          <label>
            <span>試合日</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </label>
          <label>
            <span>巨人</span>
            <select value={giantsSide} onChange={(event) => setGiantsSide(event.target.value)}>
              <option value="home">ホーム</option>
              <option value="away">ビジター</option>
            </select>
          </label>
          <label>
            <span>対戦相手</span>
            <select value={opponent} onChange={(event) => changeOpponent(event.target.value)}>
              {opponents.map((team) => <option key={team} value={team}>{team}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section className="setup-pitchers" aria-labelledby="starter-title">
        <div className="section-heading">
          <h2 id="starter-title">先発投手</h2>
        </div>
        {[awayTeam, homeTeam].map((team) => (
          <div className="setup-pitcher-field" key={team}>
            <span>{shortTeamName(team)}（{team === awayTeam ? 'ビジター' : 'ホーム'}）</span>
            <PlayerSearchInput
              ariaLabel={`${shortTeamName(team)}の先発投手`}
              value={pitchers[team]}
              options={dataStore.playersFor(team, '投手')}
              onChange={(pitcher) => changeStartingPitcher(team, pitcher)}
              placeholder="投手名を入力"
            />
          </div>
        ))}
      </section>

      <div className="setup-lineups-grid">
        {[awayTeam, homeTeam].map((team) => (
          <LineupEditor
            key={team}
            team={team}
            lineup={lineups[team] ?? defaultLineup(team)}
            onChange={(lineup) => setLineups((current) => ({ ...current, [team]: lineup }))}
          />
        ))}
      </div>

      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="setup-actions">
        <button type="button" className="button button--primary button--large" onClick={startGame}>
          この内容で試合を開始
        </button>
      </div>
    </main>
  );
}
