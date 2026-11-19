import { Checkbox } from 'antd';
import { tripMessages } from '../i18n/tripMessages';
import { toggleIndex } from './stopCompletion';

type Props = {
  stops: string[];
  checked: number[];
  onChange: (next: number[]) => void;
};

/** 结束行程弹窗内的完成点勾选：默认全选，取消勾选即声明该点未完成。 */
export function StopCompletionPicker({ stops, checked, onChange }: Props) {
  return (
    <div className="stop-completion">
      <p className="stop-completion-label">{tripMessages.completeStopsLabel}</p>
      <div className="stop-completion-list">
        {stops.map((stop, index) => (
          <Checkbox
            key={`${index}-${stop}`}
            checked={checked.includes(index)}
            onChange={() => onChange(toggleIndex(checked, index))}
          >
            {stop}
          </Checkbox>
        ))}
      </div>
      <p className="hint">{tripMessages.completeStopsHint}</p>
    </div>
  );
}