import type { Metadata } from "next";
import { Suspense } from "react";
import { BasketView } from "@/components/BasketView";

export const metadata: Metadata = { title: "Basket" };

export default function BasketPage() {
  return (
    <Suspense fallback={<div className="container page-head" aria-busy="true" />}>
      <BasketView />
    </Suspense>
  );
}
