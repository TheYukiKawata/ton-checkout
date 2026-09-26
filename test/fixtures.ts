import { Address } from "@ton/core";

export const merchant = Address.parse("0:1ca372a6943cfd4d7df7b5d35e114016fb6a182a9b8057e976279b51ee8dc5f8");
export const buyer = Address.parse("0:8fcc88fb1ae5f999e149c8be7d4f759dcf14741bb1941147fcba8b0a5b67709f");
export const usdtMaster = Address.parse("0:b113a994b5024a16719f69139328eb759596c38a25f59028b146fecdc3621dfe");
export const merchantUsdtWallet = Address.parse("0:2a4484d16a5662b1a7f434e17c9debdd7e9843815b35e56bb7d9063727730c7a");
export const fakeUsdtWallet = Address.parse("0:bb699fbf1bfb567929f4199d07725c19bc6201a7e091ad2b1b3226d31cdea5e2");

type EventOptions = { id: string; timestamp?: number; inProgress?: boolean };

export function event(options: EventOptions, ...actions: object[]) {
  return {
    event_id: options.id,
    timestamp: options.timestamp ?? 1_790_000_000,
    in_progress: options.inProgress ?? false,
    actions,
  };
}

export function tonTransfer(amount: number, comment?: string, status = "ok") {
  return {
    type: "TonTransfer",
    status,
    base_transactions: [`tx-${comment ?? "none"}-${amount}`],
    TonTransfer: {
      sender: { address: buyer.toRawString() },
      recipient: { address: merchant.toRawString() },
      amount,
      ...(comment === undefined ? {} : { comment }),
    },
  };
}

export function jettonTransfer(amount: string, comment: string, recipientsWallet = merchantUsdtWallet) {
  return {
    type: "JettonTransfer",
    status: "ok",
    JettonTransfer: {
      sender: { address: buyer.toRawString() },
      recipient: { address: merchant.toRawString() },
      senders_wallet: "0:7265cc8a50e9fa256a4eb27dcd670f0432413c50e7e929ffa5c43dedf090a8d0",
      recipients_wallet: recipientsWallet.toRawString(),
      amount,
      comment,
      jetton: { address: usdtMaster.toRawString(), symbol: "USD₮", decimals: 6 },
    },
  };
}

export function page(events: object[], nextFrom = 0) {
  return { events, next_from: nextFrom };
}
