import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '../lib/prisma';
import { applyInvoicePayment, PaymentRejectedError } from '../lib/payments';

test('two concurrent full payments cannot overpay one invoice', async () => {
  const stamp = Date.now();
  const school = await prisma.school.create({
    data: {
      name: `Pay Test ${stamp}`,
      initials: 'PT',
      address: 'test',
      email: `pay-test-${stamp}@example.com`,
      phone: '000',
    },
  });
  const user = await prisma.user.create({
    data: {
      name: 'Pay Test Student',
      email: `pay-student-${stamp}@example.com`,
      passwordHash: 'x',
      schoolId: school.id,
      role: 'STUDENT',
    },
  });
  const invoice = await prisma.invoice.create({
    data: {
      invoiceNo: `PAY-TEST-${stamp}`,
      studentId: user.id,
      month: 1,
      year: 2099,
      dueDate: new Date('2099-01-31'),
      totalAmount: 100,
      paidAmount: 0,
      status: 'UNPAID',
      schoolId: school.id,
    },
  });

  try {
    const pay = () =>
      prisma.$transaction((tx) =>
        applyInvoicePayment(tx, {
          invoiceId: invoice.id,
          amount: 100,
          method: 'CASH',
          schoolId: school.id,
        })
      );

    const results = await Promise.allSettled([pay(), pay()]);
    const fulfilled = results.filter((result) => result.status === 'fulfilled');
    const rejected = results.filter((result) => result.status === 'rejected');

    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    assert.equal((rejected[0] as PromiseRejectedResult).reason instanceof PaymentRejectedError, true);

    const stored = await prisma.invoice.findUnique({ where: { id: invoice.id } });
    const payments = await prisma.payment.count({ where: { invoiceId: invoice.id } });
    assert.equal(Number(stored?.paidAmount), 100);
    assert.equal(stored?.status, 'PAID');
    assert.equal(payments, 1);
  } finally {
    await prisma.payment.deleteMany({ where: { invoiceId: invoice.id } });
    await prisma.invoice.delete({ where: { id: invoice.id } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.school.delete({ where: { id: school.id } });
    await prisma.$disconnect();
  }
});
