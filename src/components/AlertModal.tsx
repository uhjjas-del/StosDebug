import { AlertConfig } from '../types/stosdebug';

interface AlertModalProps {
  alert: AlertConfig | null;
  onDismiss: () => void;
}

export function AlertModal({ alert, onDismiss }: AlertModalProps) {
  if (!alert) return null;

  const actions = alert.actions && alert.actions.length > 0 ? alert.actions : ['OK'];

  const handleAction = (label: string) => {
    alert.onAction?.(label);
    onDismiss();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-6 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stos-alert-title"
    >
      <div className="w-full max-w-[290px] overflow-hidden rounded-[14px] bg-white/95 text-center shadow-2xl">
        <div className="px-4 pt-5 pb-4">
          <h3 id="stos-alert-title" className="text-[17px] font-semibold leading-snug text-[#1c1c1e]">
            {alert.title}
          </h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[#3c3c43]">{alert.message}</p>
        </div>

        <div className="border-t border-[#3c3c43]/20">
          {actions.map((actionLabel) => (
            <button
              key={actionLabel}
              type="button"
              onClick={() => handleAction(actionLabel)}
              className="block w-full border-b border-[#3c3c43]/20 py-3 text-[17px] font-semibold text-[#007aff] last:border-b-0 active:bg-black/5"
            >
              {actionLabel}
            </button>
          ))}
          {alert.hasCancel && (
            <button
              type="button"
              onClick={() => handleAction('Cancel')}
              className="block w-full border-t border-[#3c3c43]/20 py-3 text-[17px] font-normal text-[#007aff] active:bg-black/5"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
