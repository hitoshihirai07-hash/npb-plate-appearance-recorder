import { useMemo, useState } from 'react';

const ACTIONS = ['盗塁成功', '盗塁死', '牽制死', '暴投', '捕逸', 'ボーク', 'その他進塁・アウト'];
const BASES = ['third', 'second', 'first'];
const BASE_LABEL = { first: '一塁走者', second: '二塁走者', third: '三塁走者' };
const DESTINATIONS = [
  ['out', 'アウト'],
  ['first', '一塁'],
  ['second', '二塁'],
  ['third', '三塁'],
  ['score', '得点'],
];

function nextBase(source) {
  return { first: 'second', second: 'third', third: 'score' }[source];
}

function defaults(game, action) {
  const outcomes = BASES.filter((base) => game.bases[base]).map((source) => ({
    source,
    runner: game.bases[source],
    destination: source,
  }));
  if (action === '盗塁死' || action === '牽制死') {
    if (outcomes[0]) outcomes[0].destination = 'out';
  } else {
    outcomes.forEach((outcome) => { outcome.destination = nextBase(outcome.source); });
  }
  return outcomes;
}

function destinationLabel(destination) {
  return Object.fromEntries(DESTINATIONS)[destination];
}

export default function RunnerActionDialog({ game, onCancel, onConfirm }) {
  const [action, setAction] = useState('盗塁成功');
  const initial = useMemo(() => defaults(game, '盗塁成功'), [game]);
  const [outcomes, setOutcomes] = useState(initial);
  const [error, setError] = useState('');

  const confirm = () => {
    const occupied = outcomes.map((item) => item.destination).filter((item) => ['first', 'second', 'third'].includes(item));
    if (new Set(occupied).size !== occupied.length) {
      setError('同じ塁に複数の走者を置くことはできません。');
      return;
    }
    if (!outcomes.some((item) => item.destination !== item.source)) {
      setError('少なくとも1人の進塁またはアウトを設定してください。');
      return;
    }
    const description = outcomes
      .filter((item) => item.destination !== item.source)
      .map((item) => `${item.runner.name} ${BASE_LABEL[item.source]}→${destinationLabel(item.destination)}`)
      .join('、');
    onConfirm({ action, runnerOutcomes: outcomes, description });
  };

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onCancel();
    }}>
      <section className="runner-dialog" role="dialog" aria-modal="true" aria-labelledby="runner-action-title">
        <div className="dialog-heading">
          <div>
            <h2 id="runner-action-title">盗塁・走者プレー</h2>
            <p>打席を進めずに、走者の進塁・得点・アウトを記録します。</p>
          </div>
          <button type="button" className="dialog-close" aria-label="閉じる" onClick={onCancel}>×</button>
        </div>
        <label className="dialog-select-field">
          <span>プレー種別</span>
          <select value={action} onChange={(event) => {
            setAction(event.target.value);
            setOutcomes(defaults(game, event.target.value));
            setError('');
          }}>
            {ACTIONS.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <div className="runner-outcome-list">
          {outcomes.map((outcome, index) => (
            <div className="runner-outcome-row" key={outcome.source}>
              <div><span>{BASE_LABEL[outcome.source]}</span><strong>{outcome.runner.name}</strong></div>
              <div className="destination-options" role="radiogroup" aria-label={`${outcome.runner.name}の走者結果`}>
                {DESTINATIONS.map(([value, label]) => (
                  <label key={value} className={outcome.destination === value ? 'is-selected' : ''}>
                    <input
                      type="radio"
                      name={`runner-action-${outcome.source}`}
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
