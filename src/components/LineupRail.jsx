import { shortTeamName } from '../game';

export default function LineupRail({ game }) {
  const activeSide = game.half === 'top' ? 'away' : 'home';
  return (
    <aside className="lineup-rail" aria-label="両チームの打順">
      {['away', 'home'].map((side) => {
        const team = game.config[`${side}Team`];
        const lineup = game.config[`${side}Lineup`];
        return (
          <section key={side} className="lineup-block">
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
        );
      })}
    </aside>
  );
}
