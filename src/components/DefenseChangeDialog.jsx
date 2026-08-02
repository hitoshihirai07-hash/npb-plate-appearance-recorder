import { useMemo, useState } from 'react';
import { dataStore } from '../data';
import { getSides, shortTeamName } from '../game';
import PlayerSearchInput from './PlayerSearchInput';

export default function DefenseChangeDialog({ game, onCancel, onConfirm }) {
  const { defenseSide } = getSides(game);
  const [side, setSide] = useState(defenseSide);
  const [lineupIndex, setLineupIndex] = useState(0);
  const [player, setPlayer] = useState(game.config[`${defenseSide}Lineup`][0]);
  const [position, setPosition] = useState(game.config[`${defenseSide}Lineup`][0].lineupPosition);
  const [error, setError] = useState('');
  const lineup = game.config[`${side}Lineup`];
  const team = game.config[`${side}Team`];
  const activeIds = useMemo(() => new Set(lineup.map((item) => item.id)), [lineup]);
  const options = useMemo(() => dataStore.playersFor(team).filter((item) => (
    item.id === lineup[lineupIndex]?.id || !activeIds.has(item.id)
  )), [activeIds, lineup, lineupIndex, team]);
  const positions = useMemo(() => [...new Set(lineup.map((item) => item.lineupPosition))], [lineup]);

  const changeSide = (nextSide) => {
    const first = game.config[`${nextSide}Lineup`][0];
    setSide(nextSide);
    setLineupIndex(0);
    setPlayer(first);
    setPosition(first.lineupPosition);
    setError('');
  };

  const changeSlot = (index) => {
    const selected = lineup[index];
    setLineupIndex(index);
    setPlayer(selected);
    setPosition(selected.lineupPosition);
    setError('');
  };

  const confirm = () => {
    if (!player || !position) {
      setError('交代選手と守備位置を選択してください。');
      return;
    }
    onConfirm(side, lineupIndex, player, position);
  };

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onCancel();
    }}>
      <section className="runner-dialog substitution-dialog" role="dialog" aria-modal="true" aria-labelledby="defense-change-title">
        <div className="dialog-heading">
          <div>
            <h2 id="defense-change-title">守備交代・守備位置変更</h2>
            <p>選手の交代と守備位置を同時に登録します。既存選手を選べば位置変更のみも可能です。</p>
          </div>
          <button type="button" className="dialog-close" aria-label="閉じる" onClick={onCancel}>×</button>
        </div>
        <div className="substitution-dialog__fields substitution-dialog__fields--three">
          <label>
            <span>チーム</span>
            <select value={side} onChange={(event) => changeSide(event.target.value)}>
              {['away', 'home'].map((item) => (
                <option key={item} value={item}>{shortTeamName(game.config[`${item}Team`])}</option>
              ))}
            </select>
          </label>
          <label>
            <span>交代する打順</span>
            <select value={lineupIndex} onChange={(event) => changeSlot(Number(event.target.value))}>
              {lineup.map((item, index) => (
                <option key={`${item.id}-${index}`} value={index}>{index + 1}番　{item.lineupPosition}　{item.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>守備位置</span>
            <select value={position} onChange={(event) => setPosition(event.target.value)}>
              {positions.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="substitution-dialog__player">
            <span>交代後の選手</span>
            <PlayerSearchInput
              ariaLabel="守備交代後の選手"
              value={player}
              options={options}
              onChange={setPlayer}
              placeholder="選手名を入力"
            />
          </label>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="dialog-actions">
          <button type="button" className="button button--outline" onClick={onCancel}>戻る</button>
          <button type="button" className="button button--primary" onClick={confirm}>守備交代を登録</button>
        </div>
      </section>
    </div>
  );
}
