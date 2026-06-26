"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ShieldCheck, Download, Loader2 } from "lucide-react";
import { getPatientPayments } from "@/lib/patient/api";
import { mapToPaymentRow } from "@/lib/patient/mappers";

export default function PatientPaymentsPage() {
  const [transactions, setTransactions] = useState<ReturnType<typeof mapToPaymentRow>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPatientPayments()
      .then((data) => setTransactions(data.map(mapToPaymentRow)))
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Billing & Payments</h2>
        <p className="text-sm text-muted-foreground">
          Track your consultation payments, invoices, and active platform transactions.
        </p>
      </div>

      <div className="flex items-center gap-3 p-4 rounded-xl border border-blue-500/10 bg-blue-500/5 text-xs text-muted-foreground">
        <ShieldCheck className="h-5 w-5 text-blue-500 shrink-0" />
        <span>
          All transactions are secured with 128-bit SSL encryption. We support JazzCash, EasyPaisa, and card payments.
        </span>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Payment History</CardTitle>
          <CardDescription>All invoices and platform receipts</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50 border-b border-border text-muted-foreground">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Transaction ID</th>
                    <th className="px-6 py-3 font-semibold">Consultant</th>
                    <th className="px-6 py-3 font-semibold">Date</th>
                    <th className="px-6 py-3 font-semibold">Method</th>
                    <th className="px-6 py-3 font-semibold">Amount</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 font-semibold text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.length > 0 ? (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs">{tx.id}</td>
                        <td className="px-6 py-4 font-medium">{tx.doctorName}</td>
                        <td className="px-6 py-4 text-xs text-muted-foreground">{tx.date}</td>
                        <td className="px-6 py-4 text-xs">{tx.method}</td>
                        <td className="px-6 py-4 font-semibold">{tx.amount}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            tx.rawStatus === "completed"
                              ? "bg-emerald-100 text-emerald-800"
                              : tx.rawStatus === "pending"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-red-100 text-red-800"
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="sm" className="h-8 text-primary gap-1" disabled>
                            <Download className="h-3 w-3" />
                            <span>PDF</span>
                          </Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                        No payment transactions found. Payments appear after booking consultations.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
