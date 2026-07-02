import type { PaymentMethod } from "@/types";

export type BookablePaymentMethod = Extract<PaymentMethod, "jazzcash" | "easypaisa" | "bank_transfer">;

export interface PaymentAccountDetails {
  label: string;
  accountTitle: string;
  accountNumber: string;
  instructions: string;
}

export const PLATFORM_PAYMENT_ACCOUNTS: Record<BookablePaymentMethod, PaymentAccountDetails> = {
  jazzcash: {
    label: "JazzCash",
    accountTitle: "Stress Saviors (Admin)",
    accountNumber: "0300-1234567",
    instructions:
      "Open JazzCash app → Send Money → Mobile Account → enter the number above → enter exact consultation fee → take a screenshot of the successful payment.",
  },
  easypaisa: {
    label: "EasyPaisa",
    accountTitle: "Stress Saviors (Admin)",
    accountNumber: "0345-7654321",
    instructions:
      "Open EasyPaisa app → Send Money → Mobile Account → enter the number above → enter exact consultation fee → take a screenshot of the successful payment.",
  },
  bank_transfer: {
    label: "Bank Transfer",
    accountTitle: "Stress Saviors Pvt Ltd",
    accountNumber: "PK12 HABB 0000 1234 5678 9012",
    instructions:
      "Transfer the exact consultation fee to the account above via your bank app or branch. Upload a screenshot or PDF of the transfer receipt.",
  },
};

export const BOOKING_PAYMENT_METHODS: BookablePaymentMethod[] = ["jazzcash", "easypaisa", "bank_transfer"];
