export type DeviceErrorState =
  | { status: 'none' }
  | { status: 'loading' }
  | { status: 'success' }
  | { status: 'notMounted' }
  | { status: 'failure'; issue: string };

export interface SideApp {
  id: string;
  name: string;
  bundleIdentifier: string;
  version: string;
  getTaskAllow: boolean;
  iconBg: string;
  iconAccent: string;
  iconLabel: string;
}

export interface PairingFileInfo {
  fileName: string;
  rawContentPreview: string;
  format: 'xml-plist' | 'binary-plist' | 'sample';
  hostId?: string;
  systemBuid?: string;
  deviceId?: string;
  importedAt: string;
}

export interface EnableJITParams {
  bundleId: string;
  appName: string;
  pid?: number;
  relaunchApp?: boolean;
  forcePID?: boolean;
  script?: string;
}

export interface AlertConfig {
  title: string;
  message: string;
  actions?: string[];
  hasCancel?: boolean;
  onAction?: (action: string) => void;
}
