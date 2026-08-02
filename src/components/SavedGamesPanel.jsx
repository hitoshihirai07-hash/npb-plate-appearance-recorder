import { useRef, useState } from 'react';
import { shortTeamName, totalScore } from '../game';

function gameStatus(game) {
  if (game.finished) return '試合終了';
  return `${game.inning}回${game.half === 'top' ? '表' : '裏'}・${game.outs}アウト`;
}

export default function SavedGamesPanel({
  games,
  storageError,
  onResume,
  onViewResult,
  onDelete,
  onBackup,
  onRestore,
}) {
  const fileInputRef = useRef(null);
  const [message, setMessage] = useState('');
  const [importError, setImportError] = useState('');

  const restore = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const result = onRestore(await file.text());
      setMessage(`バックアップを読み込みました。${result}`);
      setImportError('');
    } catch {
      setMessage('');
      setImportError('バックアップを読み込めませんでした。NPB 打席記録から出力したJSONを選択してください。');
    }
  };

  return (
    <section className="saved-games-panel" aria-labelledby="saved-games-title">
      <div className="saved-games-heading">
        <div>
          <h2 id="saved-games-title">保存試合</h2>
          <p>試合ごとに保存されます。続きからの入力や結果確認ができます。</p>
        </div>
        <div className="saved-games-tools">
          <button type="button" className="button button--success" onClick={onBackup} disabled={!games.length}>
            全試合バックアップ
          </button>
          <button type="button" className="button button--outline" onClick={() => fileInputRef.current?.click()}>
            バックアップ読込
          </button>
          <input ref={fileInputRef} className="visually-hidden" type="file" accept="application/json,.json" onChange={restore} />
        </div>
      </div>

      {storageError ? <p className="form-error saved-games-message" role="alert">{storageError}</p> : null}
      {importError ? <p className="form-error saved-games-message" role="alert">{importError}</p> : null}
      {message ? <p className="saved-games-success" role="status">{message}</p> : null}

      {games.length ? (
        <div className="saved-games-list">
          {games.map((game) => (
            <article className="saved-game-card" key={game.id}>
              <div className="saved-game-card__date">
                <strong>{game.config.date.replaceAll('-', '/')}</strong>
                <span>{gameStatus(game)}</span>
              </div>
              <div className="saved-game-card__matchup">
                <strong>
                  {shortTeamName(game.config.awayTeam)} {totalScore(game, 'away')}
                  <span>−</span>
                  {totalScore(game, 'home')} {shortTeamName(game.config.homeTeam)}
                </strong>
                <small>最終保存：{new Date(game.savedAt).toLocaleString('ja-JP')}</small>
              </div>
              <div className="saved-game-card__actions">
                {!game.finished ? (
                  <button type="button" className="button button--primary" onClick={() => onResume(game)}>再開</button>
                ) : null}
                <button type="button" className="button button--outline" onClick={() => onViewResult(game)}>結果を見る</button>
                <button
                  type="button"
                  className="button button--danger"
                  onClick={() => {
                    const label = `${game.config.date} ${shortTeamName(game.config.awayTeam)}対${shortTeamName(game.config.homeTeam)}`;
                    if (window.confirm(`${label}の保存データを削除しますか？`)) onDelete(game.id);
                  }}
                >
                  削除
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="saved-games-empty">保存試合はまだありません。開始した試合は自動でここに追加されます。</p>
      )}
    </section>
  );
}
