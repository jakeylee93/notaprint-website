import type { Metadata } from "next";
import { QuoteView } from "@/components/QuoteView";

export const metadata: Metadata = { title: "Trade quote" };

export default function QuotePage() {
  return <QuoteView />;
}
