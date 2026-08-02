import { useEffect, useMemo, useState } from 'react';
import SetupScreen from './components/SetupScreen';
import Scoreboard from './components/Scoreboard';
import LineupRail from './components/LineupRail';
import MatchupPanel from './components/MatchupPanel';
import GameStatePanel from './components/GameStatePanel';
import HistoryTable from './components/HistoryTable';
import RunnerDialog from './components/RunnerDialog';
import {
  DEFAULT_LINEUP_POSITIONS,
  STORAGE_KEY,
  applyPlateAppearance,
  currentMatchup,
  exportGameCsv,
  shortTeamName,
  substituteBatter,
  substitutePitcher,
  undoLast,
} from './game';

function readSavedGame() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const game = JSON.parse(stored);
    for (const side of ['away', 'home']) {
      const key = `${side}Lineup`;
      game.config[key] = game.config[key].map((player, index) => ({
        ...player,
        lineupPosition: player.lineupPosition ?? DEFAULT_LINEUP_POSITIONS[index],
      }));
    }
    return game;
  } catch {
    return null;
  }
}

function downloadCsv(game) {
  const blob = new Blob([exportGameCsv(game)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${game.config.date}_${shortTeamName(game.config.awayTeam)}-${shortTeamName(game.config.homeTeam)}_打席記録.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function MobileSecondary({ game }) {
  const recent = [...game.events].reverse().slice(0, 5);
  return (
    <details className="mobile-secondary">
      <summary>打順・打席履歴</summary>
      <div className="mobile-lineup-summary">
        {['away', 'home'].map((side) => (
          <section key={side}>
            <h3>{shortTeamName(game.config[`${side}Team`])}</h3>
            <ol>
              {game.config[`${side}Lineup`].map((player, index) => (
                <li key={`${side}-${index}`} className={game.battingIndexes[side] === index ? 'is-current' : ''}>
                  <span>{index + 1}</span><span>{player.lineupPosition ?? player.position.replace('手', '')}</span><strong>{player.name}</strong>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
      <div className="mobile-history">
        <h3>最近の打席</h3>
        {recent.length ? recent.map((event) => (
          <div key={event.number}>
            <span>{event.inning}{event.half === 'top' ? '表' : '裏'}</span>
            <strong>{event.batter.name}</strong>
            <span>{event.pitchType} {event.speed ? `${event.speed}km/h` : ''}</span>
            <b>{event.result}</b>
          </div>
        )) : <p>まだ打席記録はありません。</p>}
      </div>
    </details>
  );
}

function MobileGameBar({ game }) {
  const away = game.lineScore.away.reduce((sum, value) => sum + (value ?? 0), 0);
  const home = game.lineScore.home.reduce((sum, value) => sum + (value ?? 0), 0);
  return (
    <div className="mobile-game-bar">
      <strong>{game.inning}回{game.half === 'top' ? '表' : '裏'}</strong>
      <span><b>{shortTeamName(game.config.awayTeam)}</b> {away} − {home} <b>{shortTeamName(game.config.homeTeam)}</b></span>
      <strong>{game.finished ? '試合終了' : `${game.outs}アウト`}</strong>
    </div>
  );
}

export default function App() {
  const [savedGame, setSavedGame] = useState(readSavedGame);
  const [game, setGame] = useState(null);
  const [form, setForm] = useState({ pitchType: 'ストレート', speed: '', result: '空振り三振' });
  const [runnerDialogOpen, setRunnerDialogOpen] = useState(false);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState('');

  const matchup = useMemo(() => (game ? currentMatchup(game) : null), [game]);

  useEffect(() => {
    if (!game) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
    setSavedGame(game);
  }, [game]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!game) {
    return (
      <SetupScreen
        savedGame={savedGame}
        onStart={(newGame) => { setGame(newGame); setSavedGame(newGame); }}
        onResume={() => setGame(savedGame)}
      />
    );
  }

  const openRunnerDialog = () => {
    if (form.speed && (Number(form.speed) < 60 || Number(form.speed) > 180)) {
      setFormError('球速は60〜180km/hで入力するか、不明の場合は空欄にしてください。');
      return;
    }
    setFormError('');
    setRunnerDialogOpen(true);
  };

  const commitPlateAppearance = (runnerOutcomes) => {
    setGame((current) => applyPlateAppearance(current, {
      ...form,
      batter: matchup.batter,
      pitcher: matchup.pitcher,
      runnerOutcomes,
    }));
    setRunnerDialogOpen(false);
    setForm((current) => ({ ...current, speed: '' }));
    setToast('打席を記録しました');
  };

  const saveNow = () => {
    const savedAt = new Date().toISOString();
    const next = { ...game, savedAt };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setGame(next);
    setToast('ローカルに保存しました');
  };

  const newGame = () => {
    if (!window.confirm('現在の試合を閉じて、新しい試合の設定へ戻りますか？ 保存済みデータはCSV出力しない限り上書きされます。')) return;
    setGame(null);
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-block">
          <h1>NPB 打席記録</h1>
          <span>{game.config.date}　{shortTeamName(game.config.awayTeam)} vs {shortTeamName(game.config.homeTeam)}</span>
        </div>
        <div className="header-actions">
          <button type="button" className="button button--outline" onClick={saveNow}>試合を保存</button>
          <button type="button" className="button button--success" onClick={() => downloadCsv(game)}>CSV出力</button>
          <button type="button" className="button button--danger" disabled={!game.undoStack.length} onClick={() => {
            setGame((current) => undoLast(current));
            setToast('直前の状態に戻しました');
          }}>入力を取り消す</button>
          <button type="button" className="button button--quiet" onClick={newGame}>新しい試合</button>
        </div>
        <details className="mobile-menu">
          <summary aria-label="メニュー">⋮</summary>
          <div>
            <button type="button" onClick={() => downloadCsv(game)}>CSV出力</button>
            <button type="button" onClick={newGame}>新しい試合</button>
          </div>
        </details>
      </header>

      <Scoreboard game={game} />
      <MobileGameBar game={game} />

      <main className="workspace">
        <LineupRail game={game} />
        <div className="workspace-center">
          <MatchupPanel game={game} matchup={matchup} form={form} setForm={setForm} onNext={openRunnerDialog} />
          {formError && <p className="form-error form-error--workspace" role="alert">{formError}</p>}
        </div>
        <GameStatePanel
          game={game}
          matchup={matchup}
          onPitcherChange={(pitcher) => {
            setGame((current) => substitutePitcher(current, matchup.defenseSide, pitcher));
            setToast(`${pitcher.name}に投手交代しました`);
          }}
          onBatterChange={(batter) => {
            setGame((current) => substituteBatter(current, matchup.offenseSide, current.battingIndexes[matchup.offenseSide], batter));
            setToast(`${batter.name}を現在の打順に登録しました`);
          }}
        />
      </main>

      <HistoryTable events={game.events} />
      <MobileSecondary game={game} />

      <div className="mobile-sticky-actions">
        <button type="button" onClick={() => setGame((current) => undoLast(current))} disabled={!game.undoStack.length}>入力を取り消す</button>
        <button type="button" onClick={saveNow}>一時保存</button>
      </div>

      {runnerDialogOpen && (
        <RunnerDialog
          game={game}
          batter={matchup.batter}
          result={form.result}
          onCancel={() => setRunnerDialogOpen(false)}
          onConfirm={commitPlateAppearance}
        />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
