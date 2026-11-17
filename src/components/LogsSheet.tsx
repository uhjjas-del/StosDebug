import { Download, X } from 'lucide-react';

interface LogsSheetProps {
  isOpen: boolean;
  scriptName: string;
  logs: string[];
  onClose: () => void;
}

export function LogsSheet({ isOpen, scriptName, logs, onClose }: LogsSheetProps) {
  if (!isOpen) return null;

  const handleExport = () => {
    const content = logs.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${scriptName || 'stosdebug'}-logs.txt`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`${scriptName} Logs`}
    >
      <div className="flex h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl bg-[#f2f2f7] shadow-2xl sm:h-[78vh] sm:rounded-2xl">
        <header className="flex items-center justify-between border-b border-[#c6c6c8] bg-white/95 px-4 py-3 backdrop-blur">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[16px] font-medium text-[#007aff] hover:bg-[#007aff]/10"
          >
            <Download className="h-4 w-4" />
            Export
          </button>

          <h2 className="text-[17px] font-semibold text-[#1c1c1e]">
            {scriptName || 'Missing Script ViewModel'}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#e5e5ea] text-[#3c3c43] hover:bg-[#d1d1d6]"
            aria-label="Close logs"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto bg-white p-4">
          {logs.length === 0 ? (
            <p className="py-12 text-center text-sm text-[#8e8e93]">No log output yet.</p>
          ) : (
            <div className="divide-y divide-[#e5e5ea]">
              {logs.map((entry, index) => (
                <div key={index} className="py-2 font-mono text-[12.5px] leading-relaxed break-all text-[#1c1c1e]">
                  {entry}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
