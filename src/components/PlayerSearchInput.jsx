import { useDeferredValue, useEffect, useId, useMemo, useState } from 'react';

const MAX_CANDIDATES = 12;

function normalize(value) {
  return value
    .normalize('NFKC')
    .toLocaleLowerCase('ja')
    .replace(/[\s・.．]/g, '');
}

function playerSearchText(player) {
  return normalize(`${player.name} ${player.id} ${player.position} ${player.registration} ${player.note}`);
}

export default function PlayerSearchInput({
  ariaLabel,
  value,
  options,
  onChange,
  placeholder = '選手名を入力',
  disabled = false,
}) {
  const listboxId = useId();
  const [query, setQuery] = useState(value?.name ?? '');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    setQuery(value?.name ?? '');
  }, [value?.id, value?.name]);

  const candidates = useMemo(() => {
    const term = normalize(deferredQuery);
    const matches = term
      ? options.filter((player) => playerSearchText(player).includes(term))
      : options;
    return matches.slice(0, MAX_CANDIDATES);
  }, [deferredQuery, options]);

  useEffect(() => {
    setActiveIndex(0);
  }, [deferredQuery]);

  const choose = (player) => {
    onChange(player);
    setQuery(player.name);
    setOpen(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => Math.min(current + 1, Math.max(candidates.length - 1, 0)));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === 'Enter' && open && candidates[activeIndex]) {
      event.preventDefault();
      choose(candidates[activeIndex]);
    } else if (event.key === 'Escape') {
      setOpen(false);
      setQuery(value?.name ?? '');
    }
  };

  return (
    <div className="player-search">
      <input
        type="text"
        role="combobox"
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={open}
        aria-activedescendant={open && candidates[activeIndex] ? `${listboxId}-${activeIndex}` : undefined}
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          setOpen(false);
          setQuery(value?.name ?? '');
        }}
      />
      {open && (
        <div className="player-search__list" id={listboxId} role="listbox" aria-label={`${ariaLabel}の候補`}>
          {candidates.length ? candidates.map((player, index) => (
            <button
              type="button"
              role="option"
              aria-selected={value?.id === player.id}
              className={index === activeIndex ? 'is-active' : ''}
              id={`${listboxId}-${index}`}
              key={`${player.team}-${player.id}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(player)}
            >
              <strong>{player.name}</strong>
              <span>{player.position}・{player.registration}{player.note ? `・${player.note}` : ''}</span>
            </button>
          )) : (
            <p>一致する選手がいません</p>
          )}
        </div>
      )}
    </div>
  );
}
