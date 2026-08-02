import { useEffect, useMemo, useRef, useState } from 'react';
import SetupScreen from './components/SetupScreen';
import Scoreboard from './components/Scoreboard';
import LineupRail from './components/LineupRail';
import MatchupPanel from './components/MatchupPanel';
import GameStatePanel from './components/GameStatePanel';
import HistoryTable from './components/HistoryTable';
import RunnerDialog from './components/RunnerDialog';
import RunnerActionDialog from './components/RunnerActionDialog';
import RunnerSubstitutionDialog from './components/RunnerSubstitutionDialog';
import DefenseChangeDialog from './components/DefenseChangeDialog';
import GameStatsPanel from './components/GameStatsPanel';
import SavedGameView from './components/SavedGameView';
import {
  applyPlateAppearance,
  applyRunnerAction,
  canQuickRecord,
  currentMatchup,
  defaultRunnerOutcomes,
  exportGameCsv,
  shortTeamName,
  suggestedRbi,
  substituteBatter,
  substituteFielder,
  substitutePitcher,
  substituteRunner,
  undoLast,
} from './game';
import {
  exportArchiveJson,
  loadArchive,
  mergeArchive,
  persistArchive,
  rememberStartingLineups,
  removeGame,
  upsertGame,
} from './storage';

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

function downloadBackup(archive) {
  const blob = new Blob([exportArchiveJson(archive)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `npb打席記録_全試合バックアップ_${new Date().toLocaleDateString('sv-SE')}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function MobileSecondary({ game }) {
  const recent = [...game.events].reverse().filter((event) => (event.type ?? 'plateAppearance') === 'plateAppearance').slice(0, 5);
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
  const [initialStorage] = useState(loadArchive);
  const [archive, setArchive] = useState(initialStorage.archive);
  const archiveRef = useRef(initialStorage.archive);
  const [storageError, setStorageError] = useState(initialStorage.error);
  const [game, setGame] = useState(null);
  const [form, setForm] = useState({ pitchType: '不明', speed: '', result: '' });
  const [runnerDialogOpen, setRunnerDialogOpen] = useState(false);
  const [runnerActionOpen, setRunnerActionOpen] = useState(false);
  const [runnerSubstitutionOpen, setRunnerSubstitutionOpen] = useState(false);
  const [defenseChangeOpen, setDefenseChangeOpen] = useState(false);
  const [resultGame, setResultGame] = useState(null);
  const [formError, setFormError] = useState('');
  const [toast, setToast] = useState('');

  const matchup = useMemo(() => (game ? currentMatchup(game) : null), [game]);
  const quickRecordAvailable = game ? canQuickRecord(game, form.result) : false;

  useEffect(() => {
    if (!game) return;
    const next = upsertGame(archiveRef.current, game);
    try {
      persistArchive(next);
      setStorageError('');
    } catch {
      setStorageError('保存容量が不足しています。全試合バックアップを出力し、不要な試合を削除してください。');
    }
    archiveRef.current = next;
    setArchive(next);
  }, [game]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (resultGame) {
    return (
      <SavedGameView
        game={resultGame}
        onDownload={() => downloadCsv(resultGame)}
        onResume={() => {
          setForm({ pitchType: '不明', speed: '', result: '' });
          setGame(resultGame);
          setResultGame(null);
        }}
        onBack={() => { setGame(null); setResultGame(null); }}
      />
    );
  }

  if (!game) {
    return (
      <SetupScreen
        savedGames={archive.games}
        lineupPresets={archive.lineupPresets}
        storageError={storageError}
        onStart={(newGame) => {
          const next = rememberStartingLineups(upsertGame(archive, newGame), newGame);
          try {
            persistArchive(next);
            setStorageError('');
          } catch {
            setStorageError('試合を保存できませんでした。ブラウザの保存容量を確認してください。');
          }
          archiveRef.current = next;
          setArchive(next);
          setForm({ pitchType: '不明', speed: '', result: '' });
          setGame(newGame);
        }}
        onResume={(savedGame) => {
          setForm({ pitchType: '不明', speed: '', result: '' });
          setGame(savedGame);
        }}
        onViewResult={setResultGame}
        onDelete={(gameId) => {
          const next = removeGame(archive, gameId);
          try {
            persistArchive(next);
            setStorageError('');
          } catch {
            setStorageError('保存試合を削除できませんでした。');
            return;
          }
          archiveRef.current = next;
          setArchive(next);
        }}
        onBackup={() => downloadBackup(archive)}
        onRestore={(text) => {
          const next = mergeArchive(archive, text);
          persistArchive(next);
          archiveRef.current = next;
          setArchive(next);
          setStorageError('');
          return `${next.games.length}試合を保存しています。`;
        }}
      />
    );
  }

  const validatePlateAppearanceForm = () => {
    if (!form.result) {
      setFormError('打席結果を選択してください。');
      return false;
    }
    if (form.speed && (Number(form.speed) < 60 || Number(form.speed) > 180)) {
      setFormError('球速は60〜180km/hで入力するか、不明の場合は空欄にしてください。');
      return false;
    }
    setFormError('');
    return true;
  };

  const openRunnerDialog = () => {
    if (!validatePlateAppearanceForm()) return;
    setRunnerDialogOpen(true);
  };

  const commitPlateAppearance = ({ runnerOutcomes, rbi }) => {
    setGame((current) => applyPlateAppearance(current, {
      ...form,
      batter: matchup.batter,
      pitcher: matchup.pitcher,
      runnerOutcomes,
      rbi,
    }));
    setRunnerDialogOpen(false);
    setForm({ pitchType: '不明', speed: '', result: '' });
    setToast('打席を記録しました');
  };

  const quickRecord = () => {
    if (!validatePlateAppearanceForm() || !canQuickRecord(game, form.result)) return;
    const runnerOutcomes = defaultRunnerOutcomes(game, matchup.batter, form.result);
    commitPlateAppearance({
      runnerOutcomes,
      rbi: suggestedRbi(form.result, runnerOutcomes),
    });
  };

  const saveNow = (showResult = false) => {
    const savedAt = new Date().toISOString();
    const next = { ...game, savedAt };
    setGame(next);
    if (showResult) setResultGame(next);
    else setToast('この端末の試合一覧に保存しました');
  };

  const newGame = () => {
    if (!window.confirm('現在の試合を保存したまま、新しい試合の設定へ戻りますか？')) return;
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
          <button type="button" className="button button--outline" onClick={() => saveNow(false)}>試合を保存</button>
          <button type="button" className="button button--primary" onClick={() => saveNow(true)}>保存結果を見る</button>
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
            <button type="button" onClick={() => saveNow(true)}>保存結果を見る</button>
            <button type="button" onClick={() => downloadCsv(game)}>CSV出力</button>
            <button type="button" onClick={newGame}>新しい試合</button>
          </div>
        </details>
      </header>

      {storageError ? <p className="form-error storage-error" role="alert">{storageError}</p> : null}

      <Scoreboard game={game} />
      <MobileGameBar game={game} />

      <main className="workspace">
        <LineupRail game={game} side="away" />
        <div className="workspace-center">
          <MatchupPanel
            game={game}
            matchup={matchup}
            form={form}
            setForm={setForm}
            onNext={openRunnerDialog}
            onQuickRecord={quickRecord}
            quickRecordAvailable={quickRecordAvailable}
          />
          {formError && <p className="form-error form-error--workspace" role="alert">{formError}</p>}
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
            onRunnerAction={() => setRunnerActionOpen(true)}
            onRunnerSubstitution={() => setRunnerSubstitutionOpen(true)}
            onDefenseChange={() => setDefenseChangeOpen(true)}
          />
        </div>
        <LineupRail game={game} side="home" />
      </main>

      <GameStatsPanel game={game} />
      <HistoryTable events={game.events} />
      <MobileSecondary game={game} />

      <div className="mobile-sticky-actions">
        <button type="button" onClick={() => setGame((current) => undoLast(current))} disabled={!game.undoStack.length}>入力を取り消す</button>
        <button type="button" onClick={() => saveNow(false)}>一時保存</button>
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
      {runnerActionOpen && (
        <RunnerActionDialog
          game={game}
          onCancel={() => setRunnerActionOpen(false)}
          onConfirm={(payload) => {
            setGame((current) => applyRunnerAction(current, payload));
            setRunnerActionOpen(false);
            setToast(`${payload.action}を記録しました`);
          }}
        />
      )}
      {runnerSubstitutionOpen && (
        <RunnerSubstitutionDialog
          game={game}
          onCancel={() => setRunnerSubstitutionOpen(false)}
          onConfirm={(base, runner) => {
            setGame((current) => substituteRunner(current, base, runner));
            setRunnerSubstitutionOpen(false);
            setToast(`${runner.name}を代走に登録しました`);
          }}
        />
      )}
      {defenseChangeOpen && (
        <DefenseChangeDialog
          game={game}
          onCancel={() => setDefenseChangeOpen(false)}
          onConfirm={(side, lineupIndex, player, position) => {
            setGame((current) => substituteFielder(current, side, lineupIndex, player, position));
            setDefenseChangeOpen(false);
            setToast(`${player.name}を${position}で登録しました`);
          }}
        />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
