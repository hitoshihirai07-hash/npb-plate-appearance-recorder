import { eventType, shortTeamName } from '../game';

function EventRow({ event }) {
  const type = eventType(event);
  const score = event.scoreAfter ? `${event.scoreAfter.away} − ${event.scoreAfter.home}` : '−';
  if (type === 'plateAppearance') {
    return (
      <tr>
        <td>{event.inning}{event.half === 'top' ? '表' : '裏'}</td>
        <td>打席</td>
        <td><strong>{event.batter.name}</strong><span>{shortTeamName(event.offenseTeam)}</span></td>
        <td>{event.pitcher.name}</td>
        <td>{event.pitchType}　{event.speed ? `${event.speed}km/h` : event.pitchType === '投球なし' ? '申告' : '球速不明'}</td>
        <td className="result-cell">{event.result}</td>
        <td>{event.rbi ?? 0}打点／{(event.scored ?? []).length}得点</td>
        <td>{score}</td>
      </tr>
    );
  }
  return (
    <tr className={`history-event history-event--${type}`}>
      <td>{event.inning}{event.half === 'top' ? '表' : '裏'}</td>
      <td>{type === 'runnerAction' ? '走者' : '交代'}</td>
      <td colSpan="3"><strong>{event.description ?? event.action}</strong><span>{event.team ? shortTeamName(event.team) : shortTeamName(event.offenseTeam)}</span></td>
      <td className="result-cell">{event.action ?? event.substitutionType}</td>
      <td>{(event.scored ?? []).length ? `${event.scored.length}得点` : '−'}</td>
      <td>{score}</td>
    </tr>
  );
}

export default function HistoryTable({ events }) {
  return (
    <section className="history-panel" aria-labelledby="history-title">
      <div className="history-heading">
        <h2 id="history-title">試合履歴</h2>
        <span>打席・走者プレー・交代を新しい順に表示</span>
      </div>
      {events.length === 0 ? (
        <div className="empty-history">記録すると、ここに履歴が表示されます。</div>
      ) : (
        <div className="history-scroll">
          <table>
            <thead>
              <tr><th>回</th><th>種別</th><th>選手・内容</th><th>投手</th><th>決着球</th><th>結果</th><th>打点／得点</th><th>記録後</th></tr>
            </thead>
            <tbody>{[...events].reverse().map((event) => <EventRow key={event.number} event={event} />)}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}
