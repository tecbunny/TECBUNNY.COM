import { uiText } from '../../../../lib/strings';

export default function Loading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-slate-400">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400" />
        <p className="text-sm">{uiText.adminProducts.loadingPage}</p>
      </div>
    </div>
  );
}
