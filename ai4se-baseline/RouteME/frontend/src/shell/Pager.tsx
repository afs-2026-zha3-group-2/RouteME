import { Select } from 'antd';
import { appSelectProps } from '../utils/datePickerProps';
import { PAGE_SIZE_OPTIONS, pageWindow } from './paging';

type Props = {
  page: number;
  size: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
};

/**
 * 列表分页控件：共 N 条、页码窗口、上一页 / 下一页与每页条数。
 * totalPages <= 1 时不渲染，避免单页列表出现无意义的分页条。
 */
export function Pager({ page, size, total, totalPages, onPageChange, onSizeChange }: Props) {
  if (totalPages <= 1) {
    return null;
  }

  const slots = pageWindow(page, totalPages);

  return (
    <nav className="pager" aria-label="分页">
      <span className="pager-total">共 {total} 条</span>

      <div className="pager-pages">
        <button
          type="button"
          className="pager-btn"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="上一页"
        >
          上一页
        </button>

        {slots.map((slot, index) =>
          slot === 'gap' ? (
            <span key={`gap-${index}`} className="pager-gap" aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={slot}
              type="button"
              className={slot === page ? 'pager-btn on' : 'pager-btn'}
              onClick={() => onPageChange(slot)}
              aria-current={slot === page ? 'page' : undefined}
              aria-label={`第 ${slot} 页`}
            >
              {slot}
            </button>
          ),
        )}

        <button
          type="button"
          className="pager-btn"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="下一页"
        >
          下一页
        </button>
      </div>

      <label className="pager-size">
        <span>每页</span>
        <Select
          {...appSelectProps}
          size="small"
          className="pager-size-select"
          aria-label="每页条数"
          popupMatchSelectWidth={false}
          value={size}
          options={PAGE_SIZE_OPTIONS.map((option) => ({
            value: option,
            label: `${option} 条`,
          }))}
          onChange={(value: number) => onSizeChange(value)}
        />
      </label>
    </nav>
  );
}