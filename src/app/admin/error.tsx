"use client";

import { useEffect } from "react";
import { Alert } from "@/components/ui/primitives";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("ADMIN ERROR BOUNDARY CAUGHT ERROR:", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-surface-sunken p-6">
      <div className="w-full max-w-xl">
        <Alert variant="danger" title="Admin Portal Error" className="mb-4">
          Something went wrong loading the Admin Portal.
          <br />
          <br />
          <strong className="text-danger-900">Error Details:</strong>
          <pre className="mt-2 whitespace-pre-wrap rounded-sm bg-danger-950 p-3 text-xs text-danger-50">
            {error.message || "Unknown error"}
            {"\n"}
            {error.stack}
          </pre>
        </Alert>
        <button
          className="rounded-sm bg-brand-800 px-4 py-2 text-sm text-sand-50 hover:bg-brand-900"
          onClick={() => reset()}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
