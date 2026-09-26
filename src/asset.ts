import { Address } from "@ton/core";

export type TonAsset = { kind: "ton" };

export type Jetton = {
  master: Address;
  symbol: string;
  decimals: number;
};

export type JettonAsset = Jetton & {
  kind: "jetton";
  recipientWallet: Address;
};

export type Asset = TonAsset | JettonAsset;

export const TON: TonAsset = { kind: "ton" };

export const USDT: Jetton = {
  master: Address.parse("EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs"),
  symbol: "USDT",
  decimals: 6,
};

export function assetDecimals(asset: Asset): number {
  return asset.kind === "ton" ? 9 : asset.decimals;
}

export function assetSymbol(asset: Asset): string {
  return asset.kind === "ton" ? "TON" : asset.symbol;
}
