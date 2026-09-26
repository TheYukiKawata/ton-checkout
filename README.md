# ton-checkout

Accept TON and USDT payments in TypeScript without a payment processor. The library creates invoices, builds wallet links and TonConnect transactions, and checks payments through [TonAPI](https://tonapi.io). Your server needs only your wallet address, never a private key.

```ts
import { Address } from "@ton/core";
import { TON, TonApi, USDT, checkInvoice, createInvoice, parseUnits, tonkeeperLink } from "ton-checkout";

const tonapi = new TonApi({ network: "mainnet", apiKey: process.env.TONAPI_KEY });
const merchant = Address.parse("UQ...");

const invoice = createInvoice({ network: "mainnet", recipient: merchant, asset: TON, amount: parseUnits("25", 9) });
console.log(tonkeeperLink(invoice));

const status = await checkInvoice(tonapi, invoice);
if (status.kind === "paid") console.log("Paid");
```

## How a payment is matched

Each invoice gets a random 10-character comment. `checkInvoice` adds up finalized, successful transfers to your address that carry the comment, and reports `unpaid`, `underpaid`, or `paid`. Comments match without regard to case or surrounding spaces, because buyers sometimes type them by hand.

TonAPI reports a TON transfer as successful even when it bounced back to the sender, which happens when someone sends a bounceable payment to a wallet that has never sent a transaction. `checkInvoice` checks each matching TON transfer against your own transaction and drops the ones that bounced.

For USDT, create the asset with `await tonapi.acceptJetton(USDT, merchant)`. A USDT payment then counts only when it arrives through your own USDT jetton wallet, the address the USDT master contract gives for your wallet. A fake token's jetton wallet can claim the real USDT master address, but it is never your jetton wallet, so its transfers never match.

Links and TonConnect messages use the non-bounceable form of your address (`UQ...` on mainnet, `0Q...` on testnet), so payments reach a wallet that has never sent a transaction.

## API

| Export | Purpose |
| --- | --- |
| `createInvoice`, `invoiceToJson`, `invoiceFromJson` | Create an invoice and store it as JSON |
| `transferLink`, `tonkeeperLink` | `ton://` and Tonkeeper links with amount, comment, and jetton |
| `tonPaymentTransaction`, `jettonPaymentTransaction` | Transactions to pass to TonConnect's `sendTransaction` |
| `TonApi.acceptJetton`, `TonApi.jettonWallet` | Read jetton wallet addresses from TonAPI |
| `checkInvoice` | Decide whether an invoice is paid |
| `parseUnits`, `formatUnits` | Convert between decimal strings and smallest units |

Run the tests with `bun install && bun test`.

## Ready-made store

The [TON Checkout Kit](https://ton-checkout-store.yukikawata.workers.dev) adds a Cloudflare Workers store built on this library: a checkout page with TonConnect, QR code and manual payment details, order storage in Workers KV, file delivery after payment, and a script that pays test orders on testnet. The store on that page is the kit itself.

Yuki Kawata publishes this library and sells the kit. Both were written with Claude, an AI model by Anthropic.

## License

MIT
