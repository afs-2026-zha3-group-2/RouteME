import { useEffect, useState } from 'react';
import { Button, Input, Modal, Typography, message } from 'antd';
import { ApiError, updateTripStops } from '../api';
import { tripMessages } from '../i18n/tripMessages';
import type { TripDetail } from '../types';
import { cleanRouteStops, moveStop, validateRouteStops } from './routeForm';
import { MAX_STOPS, MIN_STOPS } from './tripOptions';

type Props = {
  open: boolean;
  userId: number;
  trip: Pick<TripDetail, 'id' | 'stops'>;
  onClose: () => void;
  onSaved: (trip: TripDetail) => void;
};

/**
 * 发布者编辑途经点弹窗：有序列表支持增 / 删 / 上移 / 下移，
 * 保存口径与发布一致（trim 去重、至少 MIN_STOPS 站）；成功后通知同行者。
 */
export function TripRouteModal({ open, userId, trip, onClose, onSaved }: Props) {
  const [stops, setStops] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStops([...trip.stops]);
      setSubmitting(false);
      setError(null);
    }
  }, [open, trip.stops]);

  const submit = async () => {
    const validation = validateRouteStops(stops);
    if (validation !== null) {
      setError(validation);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const updated = await updateTripStops(userId, trip.id, { stops: cleanRouteStops(stops) });
      message.success(tripMessages.routeSaved);
      onSaved(updated);
      onClose();
    } catch (caught: unknown) {
      const code = caught instanceof ApiError ? caught.code : 'UNKNOWN_ERROR';
      if (code === 'FORBIDDEN') {
        setError(tripMessages.routeEditForbidden);
      } else if (code === 'TRIP_NOT_OPEN') {
        setError(tripMessages.routeEditNotOpen);
      } else {
        setError(tripMessages.routeSaveFailed);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      title={tripMessages.routeEditTitle}
      okText={tripMessages.routeSave}
      cancelText={tripMessages.routeCancel}
      confirmLoading={submitting}
      onOk={() => void submit()}
      onCancel={onClose}
    >
      <Typography.Paragraph type="secondary">{tripMessages.routeEditHint}</Typography.Paragraph>
      <ol className="route-edit-list">
        {stops.map((stop, index) => (
          <li key={index} className="route-edit-row">
            <span className="route-edit-index">{index + 1}</span>
            <Input
              data-testid="route-stop-input"
              value={stop}
              placeholder={tripMessages.routeStopPlaceholder(index + 1)}
              onChange={(event) => {
                const value = event.target.value;
                setStops((current) => current.map((item, i) => (i === index ? value : item)));
                setError(null);
              }}
            />
            <span className="route-edit-tools">
              <Button
                size="small"
                disabled={index === 0}
                aria-label={tripMessages.routeMoveUp}
                title={tripMessages.routeMoveUp}
                onClick={() => setStops((current) => moveStop(current, index, -1))}
              >
                ↑
              </Button>
              <Button
                size="small"
                disabled={index === stops.length - 1}
                aria-label={tripMessages.routeMoveDown}
                title={tripMessages.routeMoveDown}
                onClick={() => setStops((current) => moveStop(current, index, 1))}
              >
                ↓
              </Button>
              <Button
                size="small"
                danger
                disabled={stops.length <= MIN_STOPS}
                aria-label={tripMessages.routeRemoveStop}
                title={tripMessages.routeRemoveStop}
                onClick={() => {
                  setStops((current) => current.filter((_, i) => i !== index));
                  setError(null);
                }}
              >
                ×
              </Button>
            </span>
          </li>
        ))}
      </ol>
      <Button
        block
        type="dashed"
        data-testid="route-add-stop"
        disabled={stops.length >= MAX_STOPS}
        onClick={() => setStops((current) => [...current, ''])}
      >
        {tripMessages.routeAddStop}
      </Button>
      {error !== null && <Typography.Text type="danger">{error}</Typography.Text>}
    </Modal>
  );
}