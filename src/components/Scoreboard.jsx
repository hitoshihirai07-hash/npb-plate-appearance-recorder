import { shortTeamName } from '../game';

function total(values) {
  return values.reduce((sum, value) => sum + (value ?? 0), 0);
}

export default function Scoreboard({ game }) {
  const inningColumns = Array.from({ length: 12 }, (_, index) => index + 1);
  const rows = [
    { side: 'away', team: game.config.awayTeam },
    { side: 'home', team: game.config.homeTeam },
  ];

  return (
    <div className="scoreboard-scroll" aria-label="1回から12回までのスコア">
      <table className="scoreboard">
        <thead>
          <tr>
            <th className="scoreboard__team-column">チーム</th>
            {inningColumns.map((inning) => <th key={inning}>{inning}</th>)}
            <th>計</th>
            <th>H</th>
            <th>E</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ side, team }) => (
            <tr key={side}>
              <th className={team === '読売ジャイアンツ' ? 'is-giants' : ''}>{shortTeamName(team)}</th>
              {game.lineScore[side].map((score, index) => {
                const active = game.inning === index + 1 && (game.half === 'top' ? side === 'away' : side === 'home');
                return <td key={index} className={active ? 'is-active-inning' : ''}>{score ?? '−'}</td>;
              })}
              <td className="scoreboard__total">{total(game.lineScore[side])}</td>
              <td>{game.hits[side]}</td>
              <td>{game.errors[side]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
