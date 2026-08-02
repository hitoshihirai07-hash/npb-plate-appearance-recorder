import { dataStore } from '../data';
import { shortTeamName } from '../game';
import PlayerSearchInput from './PlayerSearchInput';

function total(values) {
  return values.reduce((sum, value) => sum + (value ?? 0), 0);
}

function Base({ position, runner }) {
  return (
    <div className={`base base--${position} ${runner ? 'is-occupied' : ''}`} title={runner?.name ?? '走者なし'}>
      <span>{runner?.name ?? ''}</span>
    </div>
  );
}

export default function GameStatePanel({ game, matchup, onPitcherChange, onBatterChange }) {
  const awayScore = total(game.lineScore.away);
  const homeScore = total(game.lineScore.home);
  const defenseTeam = game.config[`${matchup.defenseSide}Team`];
  const offenseTeam = game.config[`${matchup.offenseSide}Team`];
  const pitcherOptions = dataStore.playersFor(defenseTeam, '投手');
  const batterOptions = dataStore.playersFor(offenseTeam);

  return (
    <aside className="game-state-panel" aria-label="現在の試合状況">
      <div className="game-state-heading">
        <strong>{game.inning}回{game.half === 'top' ? '表' : '裏'}</strong>
        <div>
          <span className={game.config.awayTeam === '読売ジャイアンツ' ? 'is-giants-text' : ''}>{shortTeamName(game.config.awayTeam)} {awayScore}</span>
          <b>−</b>
          <span className={game.config.homeTeam === '読売ジャイアンツ' ? 'is-giants-text' : ''}>{homeScore} {shortTeamName(game.config.homeTeam)}</span>
        </div>
        <span>{game.finished ? '試合終了' : `${game.outs}アウト`}</span>
      </div>

      <div className="diamond" aria-label="走者状況">
        <Base position="second" runner={game.bases.second} />
        <Base position="third" runner={game.bases.third} />
        <Base position="first" runner={game.bases.first} />
        <div className="home-plate" />
      </div>
      <div className="runner-summary">
        <span>一塁　{game.bases.first?.name ?? '−'}</span>
        <span>二塁　{game.bases.second?.name ?? '−'}</span>
        <span>三塁　{game.bases.third?.name ?? '−'}</span>
      </div>

      <div className="substitution-control">
        <span className="substitution-label">投手交代</span>
        <PlayerSearchInput
          ariaLabel="交代後の投手"
          value={matchup.pitcher}
          options={pitcherOptions}
          onChange={onPitcherChange}
          placeholder="投手名を入力"
        />
      </div>
      <div className="substitution-control">
        <span className="substitution-label">打者交代</span>
        <PlayerSearchInput
          ariaLabel="交代後の打者"
          value={matchup.batter}
          options={batterOptions}
          onChange={onBatterChange}
          placeholder="選手名を入力"
        />
      </div>
    </aside>
  );
}
