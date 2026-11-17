import { Alert } from 'antd';
import { tripMessages } from '../i18n/tripMessages';

export function SafetyNote() {
  return (
    <Alert
      className="safety-note"
      type="warning"
      showIcon
      title={tripMessages.safetyTitle}
      description={tripMessages.safetyBody}
    />
  );
}