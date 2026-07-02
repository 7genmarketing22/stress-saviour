import type { PaymentMethod } from "@/types";

export type BookablePaymentMethod = Extract<PaymentMethod, "jazzcash" | "easypaisa" | "bank_transfer">;

export interface PaymentAccountDetails {
  id?: string;
  label: string;
  method: string;
  accountTitle: string;
  accountNumber: string;
  bankName?: string | null;
  iban?: string | null;
  instructions: string;
}

/** Fallback hardcoded accounts used when the DB has no active accounts configured. */
export const FALLBACK_PAYMENT_ACCOUNTS: Record<BookablePaymentMethod, PaymentAccountDetails> = {
  jazzcash: {
    label: "JazzCash",
    method: "jazzcash",
    accountTitle: "Stress Saviors (Admin)",
    accountNumber: "0300-1234567",
    instructions:
      "Open JazzCash app → Send Money → Mobile Account → enter the number above → enter exact consultation fee → screenshot the confirmation.",
  },
  easypaisa: {
    label: "EasyPaisa",
    method: "easypaisa",
    accountTitle: "Stress Saviors (Admin)",
    accountNumber: "0345-7654321",
    instructions:
      "Open EasyPaisa app → Send Money → Mobile Account → enter the number above → enter exact consultation fee → screenshot the confirmation.",
  },
  bank_transfer: {
    label: "Bank Transfer",
    method: "bank_transfer",
    accountTitle: "Stress Saviors Pvt Ltd",
    accountNumber: "PK12 HABB 0000 1234 5678 9012",
    instructions:
      "Transfer the exact consultation fee to the account above via your bank app or branch. Upload a screenshot or PDF of the transfer receipt.",
  },
};

/** Legacy shape kept for components not yet migrated. */
export const PLATFORM_PAYMENT_ACCOUNTS = FALLBACK_PAYMENT_ACCOUNTS;

export const BOOKING_PAYMENT_METHODS: BookablePaymentMethod[] = ["jazzcash", "easypaisa", "bank_transfer"];

/** Fetch live payment accounts from the DB (public API — no auth needed). */
export async function fetchPlatformPaymentAccounts(): Promise<PaymentAccountDetails[]> {
  try {
    const res = await fetch("/api/payment-accounts", { next: { revalidate: 60 } });
    if (!res.ok) return Object.values(FALLBACK_PAYMENT_ACCOUNTS);
    const payload = (await res.json()) as { accounts?: Array<{
      id: string;
      method: string;
      account_title: string;
      account_number: string;
      bank_name: string | null;
      iban: string | null;
      instructions: string | null;
    }> };
    if (!payload.accounts?.length) return Object.values(FALLBACK_PAYMENT_ACCOUNTS);
    return payload.accounts.map((a) => ({
      id: a.id,
      label: methodLabel(a.method),
      method: a.method,
      accountTitle: a.account_title,
      accountNumber: a.account_number,
      bankName: a.bank_name,
      iban: a.iban,
      instructions: a.instructions ?? "",
    }));
  } catch {
    return Object.values(FALLBACK_PAYMENT_ACCOUNTS);
  }
}

function methodLabel(method: string) {
  const MAP: Record<string, string> = {
    jazzcash: "JazzCash",
    easypaisa: "EasyPaisa",
    bank_transfer: "Bank Transfer",
    hbl: "HBL",
    ubl: "UBL",
    meezan: "Meezan Bank",
    allied: "Allied Bank",
    mcb: "MCB Bank",
    standard_chartered: "Standard Chartered",
  };
  return MAP[method] ?? method;
}
