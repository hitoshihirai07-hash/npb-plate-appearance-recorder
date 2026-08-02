import { shortTeamName } from '../game';

export default function HistoryTable({ events }) {
  return (
    <section className="history-panel" aria-labelledby="history-title">
      <div className="history-heading">
        <h2 id="history-title">打席履歴</h2>
        <span>最新の打席が上に表示されます</span>
      </div>
      {events.length === 0 ? (
        <div className="empty-history">打席を記録すると、ここに履歴が表示されます。</div>
      ) : (
        <div className="history-scroll">
          <table>
            <thead>
              <tr><th>回</th><th>打者</th><th>投手</th><th>決着球</th><th>結果</th><th>得点</th><th>記録後</th></tr>
            </thead>
            <tbody>
              {[...events].reverse().map((event) => (
                <tr key={event.number}>
                  <td>{event.inning}{event.half === 'top' ? '表' : '裏'}</td>
                  <td><strong>{event.batter.name}</strong><span>{shortTeamName(event.offenseTeam)}</span></td>
                  <td>{event.pitcher.name}</td>
                  <td>{event.pitchType}　{event.speed ? `${event.speed}km/h` : '球速不明'}</td>
                  <td className="result-cell">{event.result}</td>
                  <td>{event.scored.length}</td>
                  <td>{event.scoreAfter.away} − {event.scoreAfter.home}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
