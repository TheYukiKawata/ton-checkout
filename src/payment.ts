import type { Invoice } from "./invoice.ts";
import type { Transfer } from "./transfer.ts";

export type PaymentStatus =
  | { kind: "unpaid" }
  | { kind: "underpaid"; received: bigint; transfers: Transfer[] }
  | { kind: "paid"; received: bigint; transfers: Transfer[] };

export function invoicePayments(invoice: Invoice, transfers: readonly Transfer[]): Transfer[] {
  return transfers.filter((transfer) => paysInvoice(invoice, transfer));
}

export function paymentStatus(invoice: Invoice, transfers: readonly Transfer[]): PaymentStatus {
  const payments = invoicePayments(invoice, transfers);
  if (payments.length === 0) return { kind: "unpaid" };
  const received = payments.reduce((sum, payment) => sum + payment.amount, 0n);
  return { kind: received >= invoice.amount ? "paid" : "underpaid", received, transfers: payments };
}

function paysInvoice(invoice: Invoice, transfer: Transfer): boolean {
  if (!transfer.recipient.equals(invoice.recipient)) return false;
  if (transfer.comment?.trim().toUpperCase() !== invoice.memo) return false;
  if (invoice.asset.kind === "ton") return transfer.asset.kind === "ton";
  return transfer.asset.kind === "jetton" && transfer.asset.recipientWallet.equals(invoice.asset.recipientWallet);
}
