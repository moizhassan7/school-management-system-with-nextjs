export type DiaryWorkflowStatus = 'PENDING_APPROVAL' | 'PUBLISHED' | 'REJECTED';

export function canPublishDiary(status: DiaryWorkflowStatus) {
  return status === 'PENDING_APPROVAL' || status === 'REJECTED';
}

export function canRejectDiary(status: DiaryWorkflowStatus) {
  return status === 'PENDING_APPROVAL';
}
