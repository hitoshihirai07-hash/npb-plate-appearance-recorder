import { shortTeamName } from '../game';

export default function LineupRail({ game, side }) {
  const activeSide = game.half === 'top' ? 'away' : 'home';
  const team = game.config[`${side}Team`];
  const lineup = game.config[`${side}Lineup`];
  return (
    <aside className={`lineup-rail lineup-rail--${side}`} aria-label={`${shortTeamName(team)}の打順`}>
      <section className="lineup-block">
        <h2><span className={team === '読売ジャイアンツ' ? 'accent-bar' : ''} />{shortTeamName(team)} 打順</h2>
        <ol>
          {lineup.map((player, index) => {
            const active = activeSide === side && game.battingIndexes[side] === index;
            return (
              <li key={`${side}-${index}`} className={active ? 'is-current' : ''}>
                <span className="lineup-order">{index + 1}</span>
                <span className="lineup-position">{player.lineupPosition ?? player.position.replace('手', '')}</span>
                <strong>{player.name}</strong>
                {active && <span className="current-marker">打席</span>}
              </li>
            );
          })}
        </ol>
      </section>
    </aside>
  );
}
