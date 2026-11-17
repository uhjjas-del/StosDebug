import { useRef, useState } from 'react';
import { HelpCircle, Link2, FileCode2 } from 'lucide-react';
import { DeviceErrorState, PairingFileInfo } from '../types/stosdebug';
import { ScriptDescriptor } from '../scripts/builtinScripts';

interface SettingsTabProps {
  deviceModel: string;
  alhasTXM: boolean;
  forceTXM: boolean;
  onToggleForceTXM: (val: boolean) => void;
  pairingFile: PairingFileInfo | null;
  adapterStarted: boolean;
  isMounted: DeviceErrorState;
  isMounting: DeviceErrorState;
  customScripts: ScriptDescriptor[];
  onImportPairingFile: (file: File) => void;
  onLoadSamplePairing: () => void;
  onStartOrRestartTunnel: () => void;
  onMountDDI: () => void;
  onShowAlert: (title: string, message: string) => void;
  onImportScriptFile: (file: File) => void;
  onInvokeEnableJITUrl: (rawUrl: string) => void;
}

function getMountStatusText(isMounted: DeviceErrorState): string {
  switch (isMounted.status) {
    case 'none':
      return 'Unknown';
    case 'loading':
      return 'Checking...';
    case 'success':
      return 'Mounted';
    case 'notMounted':
      return 'Not Mounted';
    case 'failure':
      return `Error: ${isMounted.issue}`;
  }
}

export function SettingsTab({
  deviceModel,
  alhasTXM,
  forceTXM,
  onToggleForceTXM,
  pairingFile,
  adapterStarted,
  isMounted,
  isMounting,
  customScripts,
  onImportPairingFile,
  onLoadSamplePairing,
  onStartOrRestartTunnel,
  onMountDDI,
  onShowAlert,
  onImportScriptFile,
  onInvokeEnableJITUrl,
}: SettingsTabProps) {
  const pairingInputRef = useRef<HTMLInputElement>(null);
  const scriptInputRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState(
    'stosdebug://enableJIT?bundleId=com.manicemu.ManicEMU&appName=Manic&pid=4821&relaunchApp=false'
  );

  const mountStatusText = getMountStatusText(isMounted);
  const isTunnelDisabled = !adapterStarted && isMounting.status === 'loading';

  return (
    <div className="flex-1 overflow-y-auto bg-[#f2f2f7] px-4 py-5">
      <input
        ref={pairingInputRef}
        type="file"
        accept=".plist,.mobiledevicepairing,.xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImportPairingFile(file);
          e.target.value = '';
        }}
      />
      <input
        ref={scriptInputRef}
        type="file"
        accept=".js,.jitrpl"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onImportScriptFile(file);
          e.target.value = '';
        }}
      />

      <div className="mx-auto max-w-xl space-y-6">
        <section>
          <div className="overflow-hidden rounded-[12px] bg-white divide-y divide-[#e5e5ea]">
            <div className="flex items-center justify-between px-4 py-3">
              <button
                type="button"
                onClick={() => pairingInputRef.current?.click()}
                className="text-left text-[16px] text-[#007aff] active:opacity-60"
              >
                {pairingFile ? 'Replace' : 'Import'} Pairing File
              </button>
              {pairingFile ? (
                <span className="truncate pl-3 font-mono text-[12px] text-[#8e8e93]">
                  {pairingFile.fileName}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={onLoadSamplePairing}
                  className="text-[13px] font-medium text-[#6c6c70] hover:text-[#1c1c1e]"
                >
                  Use Sample
                </button>
              )}
            </div>

            <div className="px-4 py-3">
              <button
                type="button"
                disabled={isTunnelDisabled}
                onClick={onStartOrRestartTunnel}
                className="text-left text-[16px] text-[#007aff] disabled:text-[#c7c7cc] active:opacity-60"
              >
                {adapterStarted ? 'Restart' : 'Start'} Tunnel
              </button>
            </div>

            <div className="flex items-center justify-between px-4 py-3">
              {isMounting.status === 'loading' ? (
                <span className="text-[16px] text-[#6c6c70]">DDI is currently mounting...</span>
              ) : isMounted.status === 'success' ? (
                <>
                  <button type="button" disabled className="text-[16px] text-[#c7c7cc]">
                    Mount DDI
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onShowAlert(
                        'DDI is already mounted',
                        'The Developer Disk Image is already mounted.'
                      )
                    }
                    className="text-[#007aff] active:opacity-60"
                    aria-label="DDI mount info"
                  >
                    <HelpCircle className="h-5 w-5" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onMountDDI}
                    className="text-[16px] text-[#007aff] active:opacity-60"
                  >
                    Mount DDI
                  </button>
                  {isMounted.status === 'failure' && (
                    <button
                      type="button"
                      onClick={() =>
                        onShowAlert('DDI failed to mount', isMounted.issue || 'Unknown error')
                      }
                      className="text-[#007aff] active:opacity-60"
                      aria-label="DDI mount error details"
                    >
                      <HelpCircle className="h-5 w-5" />
                    </button>
                  )}
                </>
              )}
            </div>

            {!alhasTXM && (
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-[16px] text-[#1c1c1e]">Force TXM</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={forceTXM}
                  onClick={() => onToggleForceTXM(!forceTXM)}
                  className={`relative inline-flex h-[31px] w-[51px] shrink-0 cursor-pointer items-center rounded-full transition-colors ${
                    forceTXM ? 'bg-[#34c759]' : 'bg-[#e9e9ea]'
                  }`}
                >
                  <span
                    className={`inline-block h-[27px] w-[27px] transform rounded-full bg-white shadow transition-transform ${
                      forceTXM ? 'translate-x-[22px]' : 'translate-x-[2px]'
                    }`}
                  />
                </button>
              </div>
            )}
          </div>

          <p className="mt-2 px-4 text-[13px] leading-snug text-[#6c6c70]">
            {deviceModel} | {alhasTXM ? 'TXM' : 'Non-TXM'} |{' '}
            {adapterStarted ? 'Tunnel Started' : 'Tunnel not started'} | {mountStatusText}
          </p>
        </section>

        <section>
          <h3 className="mb-1.5 px-4 text-[13px] font-normal uppercase tracking-wide text-[#6c6c70]">
            JIT Scripts &amp; URL Scheme
          </h3>
          <div className="overflow-hidden rounded-[12px] bg-white divide-y divide-[#e5e5ea]">
            <div className="flex items-center justify-between px-4 py-3">
              <button
                type="button"
                onClick={() => scriptInputRef.current?.click()}
                className="inline-flex items-center gap-2 text-[16px] text-[#007aff] active:opacity-60"
              >
                <FileCode2 className="h-4 w-4" />
                Import Script (.js / .jitrpl)
              </button>
              <span className="text-[12px] text-[#8e8e93]">
                {customScripts.length > 0 ? `${customScripts.length} custom` : '4 built-in'}
              </span>
            </div>

            {customScripts.length > 0 && (
              <div className="px-4 py-2.5">
                <div className="flex flex-wrap gap-1.5">
                  {customScripts.map((script) => (
                    <span
                      key={script.name}
                      className="rounded-md bg-[#f2f2f7] px-2 py-1 font-mono text-[12px] text-[#1c1c1e]"
                    >
                      {script.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="px-4 py-3 space-y-2.5">
              <div className="flex items-center gap-1.5 text-[13px] font-medium text-[#6c6c70]">
                <Link2 className="h-3.5 w-3.5" />
                <span>stosdebug://enableJIT</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="min-w-0 flex-1 rounded-[8px] border border-[#d1d1d6] bg-[#f9f9fb] px-2.5 py-1.5 font-mono text-[12px] text-[#1c1c1e] focus:border-[#007aff] focus:outline-none"
                  placeholder="stosdebug://enableJIT?bundleId=...&appName=..."
                />
                <button
                  type="button"
                  onClick={() => onInvokeEnableJITUrl(urlInput)}
                  className="shrink-0 rounded-[8px] bg-[#007aff] px-3 py-1.5 text-[14px] font-medium text-white active:opacity-80"
                >
                  Run
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
