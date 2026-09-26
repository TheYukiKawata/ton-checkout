import { beginCell, toNano, type Address, type Cell } from "@ton/core";
import type { JettonAsset, TonAsset } from "./asset.ts";
import type { Invoice } from "./invoice.ts";
import { friendlyAddress } from "./links.ts";

export type TonConnectTransaction = {
  validUntil: number;
  network: "-239" | "-3";
  messages: { address: string; amount: string; payload: string }[];
};

const jettonTransferOp = 0x0f8a7ea5;
const jettonTransferGas = toNano("0.05");
const jettonNotificationAmount = 1n;
const transactionLifetimeSeconds = 600;

export function tonPaymentTransaction(invoice: Invoice<TonAsset>): TonConnectTransaction {
  return transaction(invoice, {
    address: friendlyAddress(invoice.recipient, invoice.network),
    amount: invoice.amount.toString(),
    payload: toBase64(commentCell(invoice.memo)),
  });
}

export function jettonPaymentTransaction(
  invoice: Invoice<JettonAsset>,
  payer: Address,
  payerJettonWallet: Address,
): TonConnectTransaction {
  const body = beginCell()
    .storeUint(jettonTransferOp, 32)
    .storeUint(0, 64)
    .storeCoins(invoice.amount)
    .storeAddress(invoice.recipient)
    .storeAddress(payer)
    .storeBit(false)
    .storeCoins(jettonNotificationAmount)
    .storeBit(true)
    .storeRef(commentCell(invoice.memo))
    .endCell();
  return transaction(invoice, {
    address: payerJettonWallet.toString({ urlSafe: true, bounceable: true, testOnly: invoice.network === "testnet" }),
    amount: jettonTransferGas.toString(),
    payload: toBase64(body),
  });
}

function transaction(invoice: Invoice, message: TonConnectTransaction["messages"][number]): TonConnectTransaction {
  return {
    validUntil: Math.floor(Date.now() / 1000) + transactionLifetimeSeconds,
    network: invoice.network === "mainnet" ? "-239" : "-3",
    messages: [message],
  };
}

function commentCell(comment: string): Cell {
  return beginCell().storeUint(0, 32).storeStringTail(comment).endCell();
}

function toBase64(cell: Cell): string {
  return cell.toBoc().toString("base64");
}
