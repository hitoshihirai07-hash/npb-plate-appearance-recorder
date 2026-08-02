import { useMemo, useState } from 'react';
import { defaultRunnerOutcomes } from '../game';

const DESTINATIONS = [
  ['out', 'アウト'],
  ['first', '一塁'],
  ['second', '二塁'],
  ['third', '三塁'],
  ['score', '得点'],
];

const SOURCE_LABEL = { batter: '打者', first: '一塁走者', second: '二塁走者', third: '三塁走者' };

export default function RunnerDialog({ game, batter, result, onCancel, onConfirm }) {
  const initial = useMemo(() => defaultRunnerOutcomes(game, batter, result), [game, batter, result]);
  const [outcomes, setOutcomes] = useState(initial);
  const [error, setError] = useState('');

  const confirm = () => {
    const occupied = outcomes
      .map((outcome) => outcome.destination)
      .filter((destination) => ['first', 'second', 'third'].includes(destination));
    if (new Set(occupied).size !== occupied.length) {
      setError('同じ塁に複数の走者を置くことはできません。');
      return;
    }
    if (!outcomes.some((outcome) => outcome.source === 'batter')) {
      setError('打者の結果を設定してください。');
      return;
    }
    onConfirm(outcomes);
  };

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onCancel();
    }}>
      <section className="runner-dialog" role="dialog" aria-modal="true" aria-labelledby="runner-dialog-title">
        <div className="dialog-heading">
          <div>
            <h2 id="runner-dialog-title">走者の進塁を設定</h2>
            <p>{result}による各走者の結果を確認してください。</p>
          </div>
          <button type="button" className="dialog-close" aria-label="閉じる" onClick={onCancel}>×</button>
        </div>
        <div className="runner-outcome-list">
          {outcomes.map((outcome, index) => (
            <div className="runner-outcome-row" key={outcome.source}>
              <div>
                <span>{SOURCE_LABEL[outcome.source]}</span>
                <strong>{outcome.runner.name}</strong>
              </div>
              <div className="destination-options" role="radiogroup" aria-label={`${outcome.runner.name}の結果`}>
                {DESTINATIONS.map(([value, label]) => (
                  <label key={value} className={outcome.destination === value ? 'is-selected' : ''}>
                    <input
                      type="radio"
                      name={`destination-${outcome.source}`}
                      value={value}
                      checked={outcome.destination === value}
                      onChange={() => setOutcomes(outcomes.map((item, itemIndex) => (
                        itemIndex === index ? { ...item, destination: value } : item
                      )))}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="dialog-summary">
          <span>得点　<strong>{outcomes.filter((item) => item.destination === 'score').length}</strong></span>
          <span>アウト追加　<strong>{outcomes.filter((item) => item.destination === 'out').length}</strong></span>
        </div>
        <div className="dialog-actions">
          <button type="button" className="button button--outline" onClick={onCancel}>戻る</button>
          <button type="button" className="button button--primary" onClick={confirm}>この内容で記録</button>
        </div>
      </section>
    </div>
  );
}
