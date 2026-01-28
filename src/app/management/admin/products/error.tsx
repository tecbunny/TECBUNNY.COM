"use client";

import { uiText } from '../../../../lib/strings';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-lg rounded-xl border border-red-500/40 bg-red-500/10 p-6 text-center text-red-100">
        <h2 className="text-xl font-semibold">{uiText.adminProducts.errorTitle}</h2>
        <p className="mt-2 text-sm text-red-200/80">{error?.message || uiText.adminProducts.errorBody}</p>
        <div className="mt-4 flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white hover:bg-red-600"
          >
            {uiText.adminProducts.retry}
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg border border-red-400/60 px-4 py-2 text-sm font-semibold text-red-100 hover:bg-red-500/20"
          >
            {uiText.adminProducts.reload}
          </button>
        </div>
      </div>
    </div>
  );
}
