export type Network = "mainnet" | "testnet";

export function tonapiBaseUrl(network: Network): string {
  return network === "mainnet" ? "https://tonapi.io" : "https://testnet.tonapi.io";
}
