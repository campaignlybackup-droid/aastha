"use client";

import * as React from "react";
import Script from "next/script";
import { CreditCard } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/primitives";
import type { RazorpayHandlerResponse } from "@/lib/payments/razorpay-types";

export type RazorpayCheckoutButtonProps = {
  amountPaise: number;
  label?: string;
  name?: string;
  email?: string;
  contact?: string;
  onSuccess?: (details: { paymentId: string; orderId: string; signature: string }) => void;
  onError?: (error: string) => void;
  className?: string;
};

export function RazorpayCheckoutButton({
  amountPaise,
  label = "Pay with Razorpay",
  name = "",
  email = "",
  contact = "",
  onSuccess,
  onError,
  className,
}: RazorpayCheckoutButtonProps) {
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  async function handleCheckout() {
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // Step 1: Create Order via backend API
      const res = await fetch("/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountPaise,
          currency: "INR",
          receipt: `rcpt_${Date.now()}`,
        }),
      });

      const orderData = await res.json();
      if (!res.ok || !orderData.order_id) {
        throw new Error(orderData.error || "Failed to create payment order");
      }

      // Ensure checkout.js is loaded
      if (typeof window === "undefined" || !window.Razorpay) {
        throw new Error("Razorpay SDK not loaded. Please try again.");
      }

      const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_TSrUdjEaS9kJMO";

      // Step 2: Open Razorpay modal
      const razorpay = new window.Razorpay({
        key: keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Aastha Silver & Jewels",
        description: "925 Sterling Silver Order",
        order_id: orderData.order_id,
        prefill: {
          name,
          email,
          contact,
        },
        theme: { color: "#1f5557" },
        handler: async (response: RazorpayHandlerResponse) => {
          setLoading(true);
          try {
            // Step 3: Verify Payment via backend API
            const verifyRes = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.error || "Payment verification failed");
            }

            setSuccessMsg("Payment completed & verified successfully!");
            if (onSuccess) {
              onSuccess({
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id,
                signature: response.razorpay_signature,
              });
            }
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Verification error";
            setErrorMsg(msg);
            if (onError) onError(msg);
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setErrorMsg("Payment was cancelled.");
          },
        },
      });

      razorpay.open();
    } catch (err: unknown) {
      setLoading(false);
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setErrorMsg(msg);
      if (onError) onError(msg);
    }
  }

  return (
    <div className="space-y-3">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />

      <Button
        type="button"
        size="lg"
        onClick={handleCheckout}
        loading={loading}
        className={className}
      >
        <CreditCard className="size-4 mr-2" />
        {label}
      </Button>

      {errorMsg ? <Alert variant="danger">{errorMsg}</Alert> : null}
      {successMsg ? <Alert variant="success">{successMsg}</Alert> : null}
    </div>
  );
}
