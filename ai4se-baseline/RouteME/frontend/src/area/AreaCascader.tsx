import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { AREA_OPTIONS, destinationLabel, findCity } from './areaOptions';

type Props = {
  value?: string;
  onChange: (code: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  id?: string;
  invalid?: boolean;
  style?: CSSProperties;
};

/**
 * 自绘省市级联面板：不依赖浮层 Portal 与动态定位，
 * 避免部分浏览器（Edge/缩放/iframe）下弹层无法定位或滚动条抖动。
 */
export function AreaCascader({
  value,
  onChange,
  placeholder,
  ariaLabel,
  ariaDescribedBy,
  id,
  invalid,
  style,
}: Props) {
  const selectedCity = findCity(value);
  const [open, setOpen] = useState(false);
  const [provinceCode, setProvinceCode] = useState(selectedCity?.provinceCode ?? '');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedCity !== undefined) {
      setProvinceCode(selectedCity.provinceCode);
    }
  }, [selectedCity]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handlePointer = (event: MouseEvent) => {
      if (rootRef.current !== null && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const activeProvince = AREA_OPTIONS.find((province) => province.value === provinceCode);
  const label = destinationLabel(value);

  return (
    <div className="area-picker" style={style} ref={rootRef}>
      <button
        type="button"
        id={id}
        className={invalid === true ? 'area-trigger invalid' : 'area-trigger'}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={invalid}
        aria-describedby={ariaDescribedBy}
        onClick={() => setOpen((previous) => !previous)}
      >
        <span className={label === '' ? 'area-value placeholder' : 'area-value'}>
          {label === '' ? placeholder : label}
        </span>
        <span className="area-arrow" aria-hidden="true">
          ▾
        </span>
      </button>

      {label !== '' && (
        <button
          type="button"
          className="area-clear"
          aria-label="清除目的地"
          onClick={() => {
            onChange('');
            setOpen(false);
          }}
        >
          ×
        </button>
      )}

      {open && (
        <div className="area-panel">
          <div className="area-column" role="listbox" aria-label="省份">
            {AREA_OPTIONS.map((province) => (
              <button
                key={province.value}
                type="button"
                role="option"
                aria-selected={province.value === provinceCode}
                data-area-province={province.value}
                className={province.value === provinceCode ? 'area-option active' : 'area-option'}
                onClick={() => setProvinceCode(province.value)}
              >
                {province.label}
              </button>
            ))}
          </div>
          <div className="area-column" role="listbox" aria-label="城市">
            {(activeProvince?.children ?? []).length === 0 ? (
              <p className="area-empty">先选择省份</p>
            ) : (
              (activeProvince?.children ?? []).map((city) => (
                <button
                  key={city.value}
                  type="button"
                  role="option"
                  aria-selected={city.value === value}
                  data-area-city={city.value}
                  className={city.value === value ? 'area-option active' : 'area-option'}
                  onClick={() => {
                    onChange(city.value);
                    setOpen(false);
                  }}
                >
                  {city.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
