import { Address } from "@ton/core";
import { TON, type Asset, type JettonAsset } from "./asset.ts";
import type { Network } from "./network.ts";

type InvoiceFor<A extends Asset> = {
  network: Network;
  recipient: Address;
  asset: A;
  amount: bigint;
  memo: string;
  createdAt: number;
};

export type Invoice<A extends Asset = Asset> = A extends Asset ? InvoiceFor<A> : never;

export type InvoiceJson = {
  network: Network;
  recipient: string;
  asset:
    | { kind: "ton" }
    | { kind: "jetton"; master: string; symbol: string; decimals: number; recipientWallet: string };
  amount: string;
  memo: string;
  createdAt: number;
};

const memoAlphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const memoLength = 10;

export function createInvoice<A extends Asset>(params: {
  network: Network;
  recipient: Address;
  asset: A;
  amount: bigint;
}): Invoice<A> {
  if (params.amount <= 0n) throw new Error("Invoice amount must be positive");
  const invoice: InvoiceFor<A> = { ...params, memo: randomMemo(), createdAt: Math.floor(Date.now() / 1000) };
  return invoice as Invoice<A>;
}

export function isJettonInvoice(invoice: Invoice): invoice is Invoice<JettonAsset> {
  return invoice.asset.kind === "jetton";
}

function randomMemo(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(memoLength));
  return Array.from(bytes, (byte) => memoAlphabet[byte % memoAlphabet.length]).join("");
}

export function invoiceToJson(invoice: Invoice): InvoiceJson {
  return {
    network: invoice.network,
    recipient: invoice.recipient.toRawString(),
    asset:
      invoice.asset.kind === "ton"
        ? { kind: "ton" }
        : {
            kind: "jetton",
            master: invoice.asset.master.toRawString(),
            symbol: invoice.asset.symbol,
            decimals: invoice.asset.decimals,
            recipientWallet: invoice.asset.recipientWallet.toRawString(),
          },
    amount: invoice.amount.toString(),
    memo: invoice.memo,
    createdAt: invoice.createdAt,
  };
}

export function invoiceFromJson(json: InvoiceJson): Invoice {
  const fields = {
    network: json.network,
    recipient: Address.parse(json.recipient),
    amount: BigInt(json.amount),
    memo: json.memo,
    createdAt: json.createdAt,
  };
  if (json.asset.kind === "ton") return { ...fields, asset: TON };
  return {
    ...fields,
    asset: {
      kind: "jetton",
      master: Address.parse(json.asset.master),
      symbol: json.asset.symbol,
      decimals: json.asset.decimals,
      recipientWallet: Address.parse(json.asset.recipientWallet),
    },
  };
}
