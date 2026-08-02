import GameStatsPanel from './GameStatsPanel';
import HistoryTable from './HistoryTable';
import Scoreboard from './Scoreboard';
import { shortTeamName, totalScore } from '../game';

export default function SavedGameView({ game, onResume, onBack, onDownload }) {
  return (
    <main className="saved-game-view">
      <header className="app-header saved-game-header">
        <div className="brand-block">
          <h1>保存試合の結果</h1>
          <span>{game.config.date}　{shortTeamName(game.config.awayTeam)} vs {shortTeamName(game.config.homeTeam)}</span>
        </div>
        <div className="header-actions">
          <button type="button" className="button button--success" onClick={onDownload}>CSV出力</button>
          {!game.finished ? <button type="button" className="button button--primary" onClick={onResume}>試合を再開</button> : null}
          <button type="button" className="button button--quiet" onClick={onBack}>設定画面へ戻る</button>
        </div>
      </header>
      <section className="saved-game-summary">
        <span>{game.finished ? '試合終了' : `${game.inning}回${game.half === 'top' ? '表' : '裏'}・${game.outs}アウト時点`}</span>
        <strong>{shortTeamName(game.config.awayTeam)} {totalScore(game, 'away')} − {totalScore(game, 'home')} {shortTeamName(game.config.homeTeam)}</strong>
        <small>保存日時：{new Date(game.savedAt).toLocaleString('ja-JP')}</small>
      </section>
      <Scoreboard game={game} />
      <GameStatsPanel game={game} title="試合の打撃成績" note="保存時点の集計結果" />
      <HistoryTable events={game.events} />
      <div className="saved-game-bottom-actions">
        {!game.finished ? <button type="button" className="button button--primary" onClick={onResume}>試合を再開</button> : null}
        <button type="button" className="button button--outline" onClick={onBack}>設定画面へ戻る</button>
      </div>
    </main>
  );
}
