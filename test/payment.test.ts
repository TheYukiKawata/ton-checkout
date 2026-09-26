import { describe, expect, test } from "bun:test";
import { Address } from "@ton/core";
import { TON, USDT, type Asset } from "../src/asset.ts";
import { createInvoice, type Invoice } from "../src/invoice.ts";
import { paymentStatus } from "../src/payment.ts";
import { parseEventsPage } from "../src/transfer.ts";
import { event, fakeUsdtWallet, jettonTransfer, merchant, merchantUsdtWallet, page, tonTransfer } from "./fixtures.ts";

const usdtAsset: Asset = { kind: "jetton", ...USDT, recipientWallet: merchantUsdtWallet };

function invoice(asset: Asset, amount: bigint): Invoice {
  return createInvoice({ network: "mainnet", recipient: merchant, asset, amount });
}

function statusFor(target: Invoice, ...actions: object[]) {
  const events = actions.map((action, index) => event({ id: `e${index}` }, action));
  return paymentStatus(target, parseEventsPage(page(events)).transfers);
}

describe("paymentStatus for TON invoices", () => {
  const target = invoice(TON, 25_000_000_000n);

  test("is unpaid without a transfer carrying the memo", () => {
    expect(statusFor(target).kind).toBe("unpaid");
    expect(statusFor(target, tonTransfer(25_000_000_000, "OTHER")).kind).toBe("unpaid");
    expect(statusFor(target, tonTransfer(25_000_000_000)).kind).toBe("unpaid");
  });

  test("is paid by the exact amount or more", () => {
    expect(statusFor(target, tonTransfer(25_000_000_000, target.memo)).kind).toBe("paid");
    expect(statusFor(target, tonTransfer(30_000_000_000, target.memo)).kind).toBe("paid");
  });

  test("matches the memo ignoring case and surrounding spaces", () => {
    expect(statusFor(target, tonTransfer(25_000_000_000, ` ${target.memo.toLowerCase()} `)).kind).toBe("paid");
  });

  test("adds up a partial payment and a top-up", () => {
    const partial = statusFor(target, tonTransfer(20_000_000_000, target.memo));
    expect(partial).toMatchObject({ kind: "underpaid", received: 20_000_000_000n });
    const topped = statusFor(target, tonTransfer(20_000_000_000, target.memo), tonTransfer(5_000_000_000, target.memo));
    expect(topped).toMatchObject({ kind: "paid", received: 25_000_000_000n });
  });

  test("ignores jetton transfers with the memo", () => {
    expect(statusFor(target, jettonTransfer("25000000000", target.memo)).kind).toBe("unpaid");
  });

  test("ignores transfers to another recipient", () => {
    const other = { ...target, recipient: Address.parse("0:" + "1".repeat(64)) };
    expect(statusFor(other, tonTransfer(25_000_000_000, target.memo)).kind).toBe("unpaid");
  });
});

describe("paymentStatus for jetton invoices", () => {
  const target = invoice(usdtAsset, 37_000_000n);

  test("is paid through the merchant's own jetton wallet", () => {
    expect(statusFor(target, jettonTransfer("37000000", target.memo)).kind).toBe("paid");
  });

  test("rejects a fake jetton that claims the same master", () => {
    expect(statusFor(target, jettonTransfer("37000000", target.memo, fakeUsdtWallet)).kind).toBe("unpaid");
  });

  test("ignores TON transfers with the memo", () => {
    expect(statusFor(target, tonTransfer(37_000_000, target.memo)).kind).toBe("unpaid");
  });
});
