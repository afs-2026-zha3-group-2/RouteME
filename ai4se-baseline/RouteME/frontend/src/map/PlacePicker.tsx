import { useMemo, useState } from 'react';
import { Input, Typography } from 'antd';
import { PlaceMap } from './PlaceMap';
import {
  PLACES,
  resolvePlace,
  searchPlaces,
  type Place,
  type PlaceKind,
} from './placeCatalog';

type Props = {
  mode: 'single' | 'multi';
  value: string[];
  onChange: (next: string[]) => void;
  kinds?: PlaceKind[];
  max?: number;
  placeholder?: string;
  emptyHint?: string;
  /** Distinguishes several pickers on one form for assistive tech and tests. */
  ariaLabel?: string;
    /** Ties the caller's label to the text input. */
    inputId?: string;
    /** Marks the input invalid and points at the field's error text. */
    invalid?: boolean;
    /** Hides the schematic map when the field has no meaningful geography yet. */
    showMap?: boolean;
    /** Gazetteer city used to scope the map and its candidates. */
    city?: string;
  };

const KIND_LABEL: Record<PlaceKind, string> = { city: '城市', poi: '地点' };

/**
 * Search-or-click place picker. Manual input is accepted only when the text
 * resolves to the offline gazetteer, which keeps "must be searchable" true.
 */
export function PlacePicker({
  mode,
  value,
  onChange,
  kinds,
  max,
  placeholder = '输入城市或地点名，必须能在地图上搜到',
  emptyHint,
    ariaLabel = '搜索地图地点',
    inputId,
    invalid = false,
    showMap = true,
    city,
  }: Props) {
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [focusIndex, setFocusIndex] = useState(-1);
  const [focusPlaceId, setFocusPlaceId] = useState<string | null>(null);

  const kindKey = kinds === undefined ? 'all' : kinds.join(',');
  const suggestions = useMemo(
    () => searchPlaces(query, { kinds, limit: 8 }),
    // kinds is a stable literal from callers; joining it avoids identity churn.
    [query, kindKey],
  );
  const activePlaceId =
    focusIndex >= 0 && focusIndex < suggestions.length ? suggestions[focusIndex].id : null;

  const add = (place: Place) => {
    if (value.includes(place.name)) {
      setMessage(`「${place.name}」已经在列表里了`);
      setQuery('');
      setFocusIndex(-1);
      return;
    }
    if (mode === 'multi' && max !== undefined && value.length >= max) {
      setMessage(`最多选择 ${max} 个地点`);
      return;
    }
    onChange(mode === 'single' ? [place.name] : [...value, place.name]);
    setQuery('');
    setFocusIndex(-1);
    setMessage(null);
    setFocusPlaceId(place.id);
  };

  const remove = (name: string) => {
    onChange(value.filter((item) => item !== name));
    setMessage(null);
  };

  const commitQuery = () => {
    const text = query.trim();
    if (text === '') {
      return;
    }
    const place = resolvePlace(text, kinds);
    if (place === undefined) {
      setMessage(`地图上搜不到「${text}」，换个关键词，或直接在地图上点选`);
      return;
    }
    add(place);
  };

  const knownSelected = value.filter((name) => PLACES.some((place) => place.name === name));

  return (
    <div className="place-picker">
      <div className="place-search">
        <Input
                  id={inputId}
                  value={query}
                  placeholder={placeholder}
                  aria-invalid={invalid || undefined}
                  aria-describedby={invalid && inputId !== undefined ? `${inputId}-error` : undefined}
          allowClear
          onChange={(event) => {
            setQuery(event.target.value);
            setFocusIndex(-1);
            setMessage(null);
          }}
          onPressEnter={commitQuery}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown' && suggestions.length > 0) {
              event.preventDefault();
              setFocusIndex((previous) => (previous + 1) % suggestions.length);
            } else if (event.key === 'ArrowUp' && suggestions.length > 0) {
              event.preventDefault();
              setFocusIndex((previous) =>
                previous <= 0 ? suggestions.length - 1 : previous - 1,
              );
            } else if (event.key === 'Escape') {
              setQuery('');
              setFocusIndex(-1);
            }
          }}
          aria-label={ariaLabel}
        />
        {query.trim() !== '' && suggestions.length > 0 && (
          <ul className="place-suggest" role="listbox" aria-label="地点候选">
            {suggestions.map((place, index) => (
              <li key={place.id}>
                <button
                  type="button"
                  className={index === focusIndex ? 'place-suggest-item on' : 'place-suggest-item'}
                  onClick={() => add(place)}
                  onMouseEnter={() => setFocusIndex(index)}
                >
                  <span className="place-suggest-name">{place.name}</span>
                  <span className="place-suggest-meta">
                    {place.city} · {KIND_LABEL[place.kind]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {mode === 'multi' && value.length > 0 && (
        <ol className="place-chips">
          {value.map((name, index) => {
            const known = knownSelected.includes(name);
            return (
              <li key={`${name}-${index}`} className="place-chip">
                <span className="place-chip-index">{index + 1}</span>
                <span className="place-chip-name">{name}</span>
                {!known && <span className="place-chip-flag">非地图地点</span>}
                <button
                  type="button"
                  className="place-chip-remove"
                  aria-label={`移除 ${name}`}
                  onClick={() => remove(name)}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ol>
      )}

      {mode === 'single' && value.length > 0 && (
        <div className="place-chips">
          <span className="place-chip">
            <span className="place-chip-name">{value[0]}</span>
            <button
              type="button"
              className="place-chip-remove"
              aria-label={`移除 ${value[0]}`}
              onClick={() => remove(value[0])}
            >
              ×
            </button>
          </span>
        </div>
      )}

      {showMap && (
        <PlaceMap
          selected={value}
          onPick={add}
          kinds={kinds}
          activePlaceId={activePlaceId}
          city={city}
          focusPlaceId={focusPlaceId}
        />
      )}

      {message !== null ? (
        <Typography.Text type="warning" className="place-message">
          {message}
        </Typography.Text>
      ) : (
        emptyHint !== undefined && <Typography.Text type="secondary">{emptyHint}</Typography.Text>
      )}
    </div>
  );
}