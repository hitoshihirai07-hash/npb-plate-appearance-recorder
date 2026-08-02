import { getGameBattingStats, shortTeamName } from '../game';

function TeamBattingTable({ game, side }) {
  const lines = getGameBattingStats(game, side);
  const activeIds = new Set(game.config[`${side}Lineup`].map((player) => player.id));
  return (
    <section className="team-batting-stats">
      <h3>{shortTeamName(game.config[`${side}Team`])}</h3>
      <div className="batting-stats-scroll">
        <table>
          <thead>
            <tr><th>順</th><th>選手</th><th>打数</th><th>安打</th><th>本塁打</th><th>打点</th><th>四球</th><th>三振</th><th>得点</th><th>打率</th><th>OPS</th></tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.player.id} className={!activeIds.has(line.player.id) ? 'is-replaced' : ''}>
                <td>{line.lineupIndex == null ? '−' : line.lineupIndex + 1}</td>
                <td><strong>{line.player.name}</strong>{!activeIds.has(line.player.id) ? <span>途中交代</span> : null}</td>
                <td>{line.ab}</td><td>{line.hits}</td><td>{line.homeRuns}</td><td>{line.rbi}</td>
                <td>{line.walks}</td><td>{line.strikeouts}</td><td>{line.runs}</td><td>{line.avg}</td><td>{line.ops}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function GameStatsPanel({ game, title = '試合中の打撃成績', note = '打席を記録するたびに更新されます' }) {
  return (
    <section className="game-stats-panel" aria-labelledby="game-stats-title">
      <div className="history-heading">
        <h2 id="game-stats-title">{title}</h2>
        <span>{note}</span>
      </div>
      <div className="game-stats-grid">
        <TeamBattingTable game={game} side="away" />
        <TeamBattingTable game={game} side="home" />
      </div>
    </section>
  );
}
