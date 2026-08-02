import { getBatterStats, getMatchupStats, getPitcherStats } from '../data';
import { PITCH_TYPES, RESULTS } from '../game';

function Stat({ label, value }) {
  return <div className="stat"><span>{label}</span><strong>{value}</strong></div>;
}

export default function MatchupPanel({ game, matchup, form, setForm, onNext }) {
  const pitcherStats = getPitcherStats(matchup.pitcher.id);
  const batterStats = getBatterStats(matchup.batter.id);
  const headToHead = getMatchupStats(matchup.pitcher.id, matchup.batter.id);

  return (
    <section className="matchup-panel" aria-labelledby="matchup-title">
      <div className="matchup-players">
        <div className="player-summary">
          <span>投手（{game.config[`${matchup.defenseSide}Team`].replace('読売ジャイアンツ', '巨人')}）</span>
          <h2 id="matchup-title">{matchup.pitcher.name}</h2>
          <div className="stats-row">
            <Stat label="防御率" value={pitcherStats.era} />
            <Stat label="WHIP" value={pitcherStats.whip} />
            <Stat label="奪三振" value={pitcherStats.strikeouts} />
          </div>
        </div>
        <div className="versus" aria-hidden="true">VS</div>
        <div className="player-summary">
          <span>打者（{game.config[`${matchup.offenseSide}Team`].replace('読売ジャイアンツ', '巨人')}）</span>
          <h2>{matchup.batter.name}</h2>
          <div className="stats-row">
            <Stat label="打率" value={batterStats.avg} />
            <Stat label="本塁打" value={batterStats.hr} />
            <Stat label="OPS" value={batterStats.ops} />
          </div>
        </div>
      </div>

      <div className="head-to-head">
        <strong>対戦成績</strong>
        {headToHead ? (
          <span>対戦 {headToHead.pa}打席　{headToHead.hits}安打　{headToHead.hr}本塁打 ／ OPS {headToHead.ops}</span>
        ) : <span>初対戦</span>}
      </div>

      <form className="final-pitch-form" onSubmit={(event) => { event.preventDefault(); onNext(); }}>
        <div className="final-pitch-heading">
          <h3>決着球</h3>
          <span>最後の1球のみ記録</span>
        </div>
        <div className="pitch-fields">
          <label>
            <span>球種</span>
            <select value={form.pitchType} onChange={(event) => setForm({ ...form, pitchType: event.target.value })}>
              {PITCH_TYPES.map((type) => <option key={type}>{type}</option>)}
            </select>
          </label>
          <label>
            <span>球速（km/h）</span>
            <input
              type="number"
              inputMode="numeric"
              min="60"
              max="180"
              placeholder="不明は空欄"
              value={form.speed}
              onChange={(event) => setForm({ ...form, speed: event.target.value })}
            />
          </label>
          <label>
            <span>打席結果</span>
            <select value={form.result} onChange={(event) => setForm({ ...form, result: event.target.value })}>
              {RESULTS.map((result) => <option key={result}>{result}</option>)}
            </select>
          </label>
        </div>
        <button type="submit" className="button button--primary button--record" disabled={game.finished}>
          {game.finished ? '試合終了' : '走者の進塁を設定'}
          {!game.finished && <span aria-hidden="true">›</span>}
        </button>
      </form>
    </section>
  );
}
