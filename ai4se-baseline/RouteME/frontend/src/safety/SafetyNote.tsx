import { Alert, Button } from 'antd';
import { tripMessages } from '../i18n/tripMessages';

type Props = {
  onReport?: () => void;
};

export function SafetyNote({ onReport }: Props) {
  return (
    <Alert
      className="safety-note"
      type="warning"
      showIcon
      title={tripMessages.safetyTitle}
      description={tripMessages.safetyBody}
      action={
        onReport === undefined ? undefined : (
          <Button size="small" onClick={onReport}>
            {tripMessages.reportEntry}
          </Button>
        )
      }
    />
  );
}