export const findPaymentByReference = (db, referenceId) =>
  db.payments.find((item) => item.referenceId === referenceId || item.id === referenceId);

export const findPaymentByIdempotency = (db, applicationId, ownerId, idempotencyKey) =>
  db.payments.find((item) =>
    item.applicationId === applicationId &&
    item.userId === ownerId &&
    item.idempotencyKey === idempotencyKey
  );

export const successfulPaymentsForRegistration = (db, applicationId) =>
  db.payments.filter((item) =>
    item.applicationId === applicationId && ['SUCCESS', 'Paid'].includes(item.status)
  );
