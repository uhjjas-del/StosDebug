import { useCallback, useEffect, useState } from 'react';
import { Layers, Settings } from 'lucide-react';
import {
  AlertConfig,
  DeviceErrorState,
  PairingFileInfo,
  SideApp,
} from './types/stosdebug';
import {
  createSamplePairingFile,
  DEFAULT_SIDE_APPS,
  DEVELOPER_DISK_IMAGE_URLS,
  parseEnableJITUrl,
  parsePairingFile,
} from './data/defaultApps';
import {
  getScriptFromName,
  listRegisteredCustomScripts,
  registerCustomScript,
  ScriptDescriptor,
} from './scripts/builtinScripts';
import { executeJitScript, executeNonTxmAttachDetach } from './engine/debugServerSim';
import { StosDebugIcon } from './components/StosDebugIcon';
import { AppsTab } from './components/AppsTab';
import { SettingsTab } from './components/SettingsTab';
import { LogsSheet } from './components/LogsSheet';
import { AlertModal } from './components/AlertModal';

const PAIRING_STORAGE_KEY = 'stosdebug_pairing_file';
const FORCE_TXM_STORAGE_KEY = 'forceTXM';
const DEVICE_MODEL = 'iPhone17,2';
const ALHAS_TXM = false;

function readInitialPairing(): PairingFileInfo | null {
  try {
    const raw = localStorage.getItem(PAIRING_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PairingFileInfo;
  } catch {
    return null;
  }
}

function readInitialForceTXM(): boolean {
  try {
    return localStorage.getItem(FORCE_TXM_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'apps' | 'settings'>('apps');
  const [pairingFile, setPairingFile] = useState<PairingFileInfo | null>(readInitialPairing);
  const [forceTXM, setForceTXM] = useState<boolean>(readInitialForceTXM);
  const [adapterStarted, setAdapterStarted] = useState<boolean>(false);
  const [isLoadingApps, setIsLoadingApps] = useState<boolean>(false);
  const [apps, setApps] = useState<SideApp[]>([]);
  const [isMounted, setIsMounted] = useState<DeviceErrorState>({ status: 'none' });
  const [isMounting, setIsMounting] = useState<DeviceErrorState>({ status: 'none' });

  const [showingScript, setShowingScript] = useState<boolean>(false);
  const [scriptTitle, setScriptTitle] = useState<string>('Missing Script ViewModel');
  const [logs, setLogs] = useState<string[]>([]);
  const [alertConfig, setAlertConfig] = useState<AlertConfig | null>(null);
  const [customScripts, setCustomScripts] = useState<ScriptDescriptor[]>(() =>
    listRegisteredCustomScripts()
  );

  const hasTXM = forceTXM ? true : ALHAS_TXM;

  const showAlert = useCallback(
    (title: string, message: string, options?: { actions?: string[]; hasCancel?: boolean }) => {
      setAlertConfig({
        title,
        message,
        actions: options?.actions,
        hasCancel: options?.hasCancel ?? false,
      });
    },
    []
  );

  const handleToggleForceTXM = useCallback((next: boolean) => {
    setForceTXM(next);
    try {
      localStorage.setItem(FORCE_TXM_STORAGE_KEY, String(next));
    } catch {
      // ignore storage errors
    }
  }, []);

  const runMountDDI = useCallback(
    async (checkOnlyIfMounting = false) => {
      if (checkOnlyIfMounting && isMounting.status === 'success') {
        return;
      }
      setIsMounting({ status: 'loading' });
      await new Promise((resolve) => setTimeout(resolve, 450));
      // Mirror mountPersonalDDI referencing doronz88/DeveloperDiskImage
      void DEVELOPER_DISK_IMAGE_URLS;
      setIsMounting({ status: 'success' });
      setIsMounted({ status: 'success' });
    },
    [isMounting.status]
  );

  const startTunnel = useCallback(
    async (activePairing: PairingFileInfo | null = pairingFile) => {
      if (!activePairing) {
        setAdapterStarted(false);
        setIsMounted({ status: 'failure', issue: 'Pairing read failed: No pairing file imported.' });
        return;
      }

      setIsLoadingApps(true);
      setIsMounted({ status: 'loading' });
      await new Promise((resolve) => setTimeout(resolve, 320));

      setAdapterStarted(true);
      await runMountDDI(true);
      setApps(DEFAULT_SIDE_APPS);
      setIsLoadingApps(false);
    },
    [pairingFile, runMountDDI]
  );

  // Auto-start tunnel on mount if pairing file already exists, mirroring AppView.onAppear()
  useEffect(() => {
    if (pairingFile && !adapterStarted) {
      void startTunnel(pairingFile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleImportPairingFile = useCallback(
    async (file: File) => {
      try {
        const parsed = await parsePairingFile(file);
        setPairingFile(parsed);
        try {
          localStorage.setItem(PAIRING_STORAGE_KEY, JSON.stringify(parsed));
        } catch {
          // ignore
        }
        await startTunnel(parsed);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unable to read pairing file.';
        showAlert('Failed to copy pairing file', msg);
      }
    },
    [showAlert, startTunnel]
  );

  const handleLoadSamplePairing = useCallback(async () => {
    const sample = createSamplePairingFile();
    setPairingFile(sample);
    try {
      localStorage.setItem(PAIRING_STORAGE_KEY, JSON.stringify(sample));
    } catch {
      // ignore
    }
    await startTunnel(sample);
  }, [startTunnel]);

  const handleStartOrRestartTunnel = useCallback(async () => {
    if (!pairingFile) {
      showAlert('Failed to start tunnel', 'Pairing read failed: No pairing file imported.');
      return;
    }
    await startTunnel(pairingFile);
  }, [pairingFile, showAlert, startTunnel]);

  const startDebugApp = useCallback(
    (options: {
      bundleID: string;
      appName: string;
      pid?: number;
      useScript: boolean;
      script?: ScriptDescriptor;
    }) => {
      const targetPid = options.pid && options.pid > 0 ? options.pid : Math.floor(2000 + Math.random() * 7000);

      if (options.useScript && options.script) {
        setScriptTitle(options.script.scriptName);
        setLogs([]);
        setShowingScript(true);

        const result = executeJitScript({
          pid: targetPid,
          script: options.script,
        });
        setLogs(result.logs);
        setCustomScripts(listRegisteredCustomScripts());
      } else {
        const nonTxmLines = executeNonTxmAttachDetach(targetPid, options.bundleID);
        showAlert(
          'JIT Attached (Non-TXM)',
          `${options.appName} (PID ${targetPid}) attached & detached via debug proxy.\n\n${nonTxmLines.join('\n')}`
        );
      }
    },
    [showAlert]
  );

  const handleTapApp = useCallback(
    (app: SideApp) => {
      if (isMounted.status !== 'success') {
        showAlert(
          'DDI is not mounted',
          'Please go into settings and mount the Developer Disk Image.'
        );
        return;
      }

      if (hasTXM) {
        const script = getScriptFromName(app.name);
        startDebugApp({
          bundleID: app.bundleIdentifier,
          appName: app.name,
          useScript: true,
          script,
        });
      } else {
        startDebugApp({
          bundleID: app.bundleIdentifier,
          appName: app.name,
          useScript: false,
        });
      }
    },
    [hasTXM, isMounted.status, showAlert, startDebugApp]
  );

  const handleImportScriptFile = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const isPatch = file.name.endsWith('.jitrpl');
        const baseName = file.name.replace(/\.(js|jitrpl)$/i, '');
        const descriptor = registerCustomScript(baseName, text, { isPatch, persistent: true });
        setCustomScripts(listRegisteredCustomScripts());
        showAlert(
          'Script Imported',
          `Registered "${descriptor.name}" (active name: "${descriptor.scriptName}").`
        );
      } catch (err) {
        showAlert(
          'Failed to import script',
          err instanceof Error ? err.message : 'Unable to read script file.'
        );
      }
    },
    [showAlert]
  );

  const handleInvokeEnableJITUrl = useCallback(
    (rawUrl: string) => {
      if (!adapterStarted) {
        showAlert('Tunnel not initialized', 'Start the tunnel in Settings before running enableJIT.');
        return;
      }
      if (isMounted.status !== 'success') {
        showAlert('DDI is not mounted', 'Please go into settings and mount the Developer Disk Image.');
        return;
      }

      try {
        const params = parseEnableJITUrl(rawUrl);
        if (hasTXM) {
          let script: ScriptDescriptor;
          if (params.script) {
            const decoded = atob(params.script);
            script = registerCustomScript(params.appName.toLowerCase(), decoded, {
              persistent: false,
            });
          } else {
            script = getScriptFromName(params.appName);
          }

          startDebugApp({
            bundleID: params.bundleId,
            appName: params.appName,
            pid: params.pid,
            useScript: true,
            script,
          });
        } else {
          startDebugApp({
            bundleID: params.bundleId,
            appName: params.appName,
            pid: params.pid,
            useScript: false,
          });
        }
      } catch (err) {
        showAlert(
          'Unable to decode URL',
          err instanceof Error ? err.message : 'Invalid stosdebug://enableJIT URL.'
        );
      }
    },
    [adapterStarted, hasTXM, isMounted.status, showAlert, startDebugApp]
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#e5e5ea] sm:p-4">
      <div className="flex h-screen w-full max-w-2xl flex-col overflow-hidden bg-white shadow-xl sm:h-[860px] sm:max-h-[92vh] sm:rounded-[28px] sm:border sm:border-black/10">
        {/* Top App Bar */}
        <header className="flex items-center justify-between border-b border-[#e5e5ea] bg-white/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2.5">
            <StosDebugIcon size={32} />
            <h1 className="text-[19px] font-bold tracking-tight text-[#1c1c1e]">
              {activeTab === 'apps' ? 'Apps' : 'Settings'}
            </h1>
          </div>

          <span className="text-[12px] font-medium text-[#8e8e93]">
            {hasTXM ? 'TXM' : 'Non-TXM'} · {adapterStarted ? '10.7.0.1:49152' : 'Offline'}
          </span>
        </header>

        {/* Active Tab View */}
        {activeTab === 'apps' ? (
          <AppsTab
            apps={apps}
            pairingFile={pairingFile}
            adapterStarted={adapterStarted}
            isLoadingApps={isLoadingApps}
            isMounted={isMounted}
            onImportPairingFile={handleImportPairingFile}
            onLoadSamplePairing={handleLoadSamplePairing}
            onRetryTunnel={handleStartOrRestartTunnel}
            onTapApp={handleTapApp}
          />
        ) : (
          <SettingsTab
            deviceModel={DEVICE_MODEL}
            alhasTXM={ALHAS_TXM}
            forceTXM={forceTXM}
            onToggleForceTXM={handleToggleForceTXM}
            pairingFile={pairingFile}
            adapterStarted={adapterStarted}
            isMounted={isMounted}
            isMounting={isMounting}
            customScripts={customScripts}
            onImportPairingFile={handleImportPairingFile}
            onLoadSamplePairing={handleLoadSamplePairing}
            onStartOrRestartTunnel={handleStartOrRestartTunnel}
            onMountDDI={() => void runMountDDI(false)}
            onShowAlert={(title, message) => showAlert(title, message)}
            onImportScriptFile={handleImportScriptFile}
            onInvokeEnableJITUrl={handleInvokeEnableJITUrl}
          />
        )}

        {/* Bottom SwiftUI-style TabView Bar */}
        <nav
          className="grid grid-cols-2 border-t border-[#c6c6c8] bg-[#f9f9f9]/95 py-1.5 backdrop-blur"
          aria-label="Main Tabs"
        >
          <button
            type="button"
            onClick={() => setActiveTab('apps')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-medium ${
              activeTab === 'apps' ? 'text-[#007aff]' : 'text-[#8e8e93]'
            }`}
          >
            <Layers className="h-5 w-5" />
            <span>Apps</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 text-[11px] font-medium ${
              activeTab === 'settings' ? 'text-[#007aff]' : 'text-[#8e8e93]'
            }`}
          >
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </button>
        </nav>
      </div>

      <LogsSheet
        isOpen={showingScript}
        scriptName={scriptTitle}
        logs={logs}
        onClose={() => setShowingScript(false)}
      />

      <AlertModal alert={alertConfig} onDismiss={() => setAlertConfig(null)} />
    </div>
  );
}
