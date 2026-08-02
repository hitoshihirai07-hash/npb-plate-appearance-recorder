import { useMemo, useState } from 'react';
import { dataStore } from '../data';
import { getSides, shortTeamName } from '../game';
import PlayerSearchInput from './PlayerSearchInput';

const BASES = ['first', 'second', 'third'];
const BASE_LABEL = { first: '一塁', second: '二塁', third: '三塁' };

export default function RunnerSubstitutionDialog({ game, onCancel, onConfirm }) {
  const { offenseSide } = getSides(game);
  const occupiedBases = BASES.filter((base) => game.bases[base]);
  const [base, setBase] = useState(occupiedBases[0]);
  const [replacement, setReplacement] = useState(null);
  const [error, setError] = useState('');
  const team = game.config[`${offenseSide}Team`];
  const activeIds = useMemo(() => new Set(game.config[`${offenseSide}Lineup`].map((player) => player.id)), [game, offenseSide]);
  const options = useMemo(() => dataStore.playersFor(team).filter((player) => !activeIds.has(player.id)), [activeIds, team]);

  const confirm = () => {
    if (!base || !game.bases[base] || !replacement) {
      setError('交代する走者と代走選手を選択してください。');
      return;
    }
    onConfirm(base, replacement);
  };

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onCancel();
    }}>
      <section className="runner-dialog substitution-dialog" role="dialog" aria-modal="true" aria-labelledby="runner-substitution-title">
        <div className="dialog-heading">
          <div>
            <h2 id="runner-substitution-title">走者交代（代走）</h2>
            <p>{shortTeamName(team)}の塁上走者をベンチ選手に交代します。打順も引き継がれます。</p>
          </div>
          <button type="button" className="dialog-close" aria-label="閉じる" onClick={onCancel}>×</button>
        </div>
        <div className="substitution-dialog__fields">
          <label>
            <span>交代する走者</span>
            <select value={base} onChange={(event) => { setBase(event.target.value); setReplacement(null); }}>
              {occupiedBases.map((item) => (
                <option key={item} value={item}>{BASE_LABEL[item]}　{game.bases[item].name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>代走選手</span>
            <PlayerSearchInput
              ariaLabel="代走選手"
              value={replacement}
              options={options}
              onChange={setReplacement}
              placeholder="選手名を入力"
            />
          </label>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="dialog-actions">
          <button type="button" className="button button--outline" onClick={onCancel}>戻る</button>
          <button type="button" className="button button--primary" onClick={confirm}>代走を登録</button>
        </div>
      </section>
    </div>
  );
}
