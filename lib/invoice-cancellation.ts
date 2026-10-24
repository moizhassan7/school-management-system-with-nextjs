type CancellableInvoice = {
  status: string;
  paidAmount: number | string | { toString(): string };
};

const CANCELLABLE_STATUSES = new Set(['UNPAID', 'OVERDUE']);

export function canCancelInvoice(invoice: CancellableInvoice): boolean {
  return CANCELLABLE_STATUSES.has(invoice.status) && Number(invoice.paidAmount) === 0;
}
