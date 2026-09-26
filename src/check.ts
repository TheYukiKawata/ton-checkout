import type { Invoice } from "./invoice.ts";
import { invoicePayments, paymentStatus, type PaymentStatus } from "./payment.ts";
import type { TonApi } from "./tonapi.ts";
import type { Transfer } from "./transfer.ts";

export async function checkInvoice(tonapi: TonApi, invoice: Invoice): Promise<PaymentStatus> {
  const candidates = invoicePayments(invoice, await tonapi.transfersSince(invoice.recipient, invoice.createdAt));
  const kept = await Promise.all(candidates.map((transfer) => merchantKept(tonapi, transfer)));
  return paymentStatus(invoice, candidates.filter((_, index) => kept[index]));
}

function merchantKept(tonapi: TonApi, transfer: Transfer): Promise<boolean> {
  if (transfer.asset.kind === "jetton") return Promise.resolve(true);
  return tonapi.merchantKeptValue(transfer.asset.receiverTransaction);
}
