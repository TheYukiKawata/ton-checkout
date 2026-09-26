import { describe, expect, test } from "bun:test";
import { Address, Cell } from "@ton/core";
import { TON, USDT, type JettonAsset } from "../src/asset.ts";
import { createInvoice } from "../src/invoice.ts";
import { jettonPaymentTransaction, tonPaymentTransaction } from "../src/tonconnect.ts";
import { buyer, merchant, merchantUsdtWallet } from "./fixtures.ts";

function readComment(cell: Cell): string {
  const slice = cell.beginParse();
  expect(slice.loadUint(32)).toBe(0);
  return slice.loadStringTail();
}

describe("tonPaymentTransaction", () => {
  test("sends the amount to the merchant with the memo as comment", () => {
    const invoice = createInvoice({ network: "testnet", recipient: merchant, asset: TON, amount: 25_000_000_000n });
    const transaction = tonPaymentTransaction(invoice);
    expect(transaction.network).toBe("-3");
    const [message] = transaction.messages;
    expect(Address.parse(message!.address).equals(merchant)).toBe(true);
    expect(message!.amount).toBe("25000000000");
    expect(readComment(Cell.fromBase64(message!.payload))).toBe(invoice.memo);
  });
});

describe("jettonPaymentTransaction", () => {
  test("asks the buyer's jetton wallet to move the amount to the merchant", () => {
    const asset: JettonAsset = { kind: "jetton", ...USDT, recipientWallet: merchantUsdtWallet };
    const invoice = createInvoice({ network: "mainnet", recipient: merchant, asset, amount: 37_000_000n });
    const buyerWallet = Address.parse("0:" + "2".repeat(64));
    const transaction = jettonPaymentTransaction(invoice, buyer, buyerWallet);
    expect(transaction.network).toBe("-239");
    const [message] = transaction.messages;
    expect(Address.parse(message!.address).equals(buyerWallet)).toBe(true);

    const body = Cell.fromBase64(message!.payload).beginParse();
    expect(body.loadUint(32)).toBe(0x0f8a7ea5);
    body.loadUint(64);
    expect(body.loadCoins()).toBe(37_000_000n);
    expect(body.loadAddress().equals(merchant)).toBe(true);
    expect(body.loadAddress().equals(buyer)).toBe(true);
    expect(body.loadBit()).toBe(false);
    expect(body.loadCoins()).toBeGreaterThan(0n);
    expect(body.loadBit()).toBe(true);
    expect(readComment(body.loadRef())).toBe(invoice.memo);
  });
});
