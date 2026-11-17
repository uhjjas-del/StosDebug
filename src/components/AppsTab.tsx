import { useRef } from 'react';
import { AlertTriangle, Loader2, Upload } from 'lucide-react';
import { DeviceErrorState, PairingFileInfo, SideApp } from '../types/stosdebug';
import { AppIconTile } from './AppIconTile';

interface AppsTabProps {
  apps: SideApp[];
  pairingFile: PairingFileInfo | null;
  adapterStarted: boolean;
  isLoadingApps: boolean;
  isMounted: DeviceErrorState;
  onImportPairingFile: (file: File) => void;
  onLoadSamplePairing: () => void;
  onRetryTunnel: () => void;
  onTapApp: (app: SideApp) => void;
}

export function AppsTab({
  apps,
  pairingFile,
  adapterStarted,
  isLoadingApps,
  isMounted,
  onImportPairingFile,
  onLoadSamplePairing,
  onRetryTunnel,
  onTapApp,
}: AppsTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="relative flex-1 overflow-y-auto bg-white">
      <input
        ref={fileInputRef}
        type="file"
        accept=".plist,.mobiledevicepairing,.xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onImportPairingFile(file);
          }
          e.target.value = '';
        }}
      />

      {!pairingFile && !isLoadingApps ? (
        <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#007aff]/10 text-[#007aff]">
            <Upload className="h-6 w-6" />
          </div>
          <h2 className="text-[17px] font-semibold text-[#1c1c1e]">Pairing File Required</h2>
          <p className="mt-1.5 max-w-xs text-[14px] leading-relaxed text-[#6c6c70]">
            Import your iOS <span className="font-mono text-xs">pairingFile.plist</span> to start the loopback tunnel at{' '}
            <span className="font-mono text-xs">10.7.0.1:49152</span> and list sideloaded apps.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-[10px] bg-[#007aff] px-4 py-2 text-[15px] font-medium text-white active:opacity-80"
            >
              Import Pairing File
            </button>
            <button
              type="button"
              onClick={onLoadSamplePairing}
              className="rounded-[10px] bg-[#e5e5ea] px-4 py-2 text-[15px] font-medium text-[#1c1c1e] active:opacity-80"
            >
              Use Sample Pairing
            </button>
          </div>
        </div>
      ) : isLoadingApps && apps.length === 0 ? (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-[#8e8e93]" />
          <span className="text-[15px] text-[#6c6c70]">Connecting…</span>
        </div>
      ) : isMounted.status === 'failure' ? (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
          <AlertTriangle className="h-9 w-9 text-[#ff9500]" />
          <p className="max-w-sm text-[15px] leading-relaxed text-[#6c6c70]">{isMounted.issue}</p>
          <button
            type="button"
            onClick={onRetryTunnel}
            className="rounded-[10px] bg-[#007aff] px-5 py-2 text-[15px] font-semibold text-white active:opacity-80"
          >
            Retry
          </button>
        </div>
      ) : !adapterStarted && !isLoadingApps ? (
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
          <p className="text-[15px] text-[#6c6c70]">Tunnel not started</p>
          <button
            type="button"
            onClick={onRetryTunnel}
            className="rounded-[10px] bg-[#007aff] px-5 py-2 text-[15px] font-semibold text-white active:opacity-80"
          >
            Start Tunnel
          </button>
        </div>
      ) : apps.length === 0 ? (
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-[16px] text-[#6c6c70]">No Apps</p>
        </div>
      ) : (
        <div className="divide-y divide-[#e5e5ea]">
          {apps.map((app) => (
            <button
              key={app.id}
              type="button"
              onClick={() => onTapApp(app)}
              className="flex w-full items-center px-4 py-3.5 text-left transition-colors hover:bg-[#f2f2f7]/60 active:bg-[#e5e5ea]/60"
            >
              <div className="mr-3">
                <AppIconTile app={app} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[17px] font-semibold text-[#1c1c1e]">{app.name}</div>
                <div className="truncate text-[12.5px] text-[#6c6c70]">{app.bundleIdentifier}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
