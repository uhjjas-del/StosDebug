import { EnableJITParams, PairingFileInfo, SideApp } from '../types/stosdebug';

export const DEVELOPER_DISK_IMAGE_URLS = {
  image:
    'https://github.com/doronz88/DeveloperDiskImage/raw/refs/heads/main/PersonalizedImages/Xcode_iOS_DDI_Personalized/Image.dmg',
  trustcache:
    'https://github.com/doronz88/DeveloperDiskImage/blob/main/PersonalizedImages/Xcode_iOS_DDI_Personalized/Image.dmg.trustcache',
  buildManifest:
    'https://github.com/doronz88/DeveloperDiskImage/raw/refs/heads/main/PersonalizedImages/Xcode_iOS_DDI_Personalized/BuildManifest.plist',
};

export const DEFAULT_SIDE_APPS: SideApp[] = [
  {
    id: 'com.amethyst.Amethyst',
    name: 'Amethyst',
    bundleIdentifier: 'com.amethyst.Amethyst',
    version: '1.2.0',
    getTaskAllow: true,
    iconBg: '#5E5CE6',
    iconAccent: '#BF5AF2',
    iconLabel: 'AM',
  },
  {
    id: 'com.geode.launcher',
    name: 'Geode',
    bundleIdentifier: 'com.geode.launcher',
    version: '4.3.1',
    getTaskAllow: true,
    iconBg: '#FF9F0A',
    iconAccent: '#FF375F',
    iconLabel: 'GD',
  },
  {
    id: 'com.manicemu.ManicEMU',
    name: 'Manic EMU',
    bundleIdentifier: 'com.manicemu.ManicEMU',
    version: '1.5.2',
    getTaskAllow: true,
    iconBg: '#FF2D55',
    iconAccent: '#008BFF',
    iconLabel: 'MN',
  },
  {
    id: 'com.melonx.MeloNX',
    name: 'MeloNX',
    bundleIdentifier: 'com.melonx.MeloNX',
    version: '2.0.4',
    getTaskAllow: true,
    iconBg: '#0A84FF',
    iconAccent: '#30D158',
    iconLabel: 'MX',
  },
  {
    id: 'com.utmapp.UTM',
    name: 'UTM',
    bundleIdentifier: 'com.utmapp.UTM',
    version: '4.6.4',
    getTaskAllow: true,
    iconBg: '#1C1C1E',
    iconAccent: '#0A84FF',
    iconLabel: 'UT',
  },
  {
    id: 'org.dolphin-emu.dolphinios',
    name: 'Dolphin iOS',
    bundleIdentifier: 'org.dolphin-emu.dolphinios',
    version: '4.0.0',
    getTaskAllow: true,
    iconBg: '#32ADE6',
    iconAccent: '#007AFF',
    iconLabel: 'DL',
  },
  {
    id: 'org.flycast.Flycast',
    name: 'Flycast',
    bundleIdentifier: 'org.flycast.Flycast',
    version: '2.4.0',
    getTaskAllow: true,
    iconBg: '#FF6723',
    iconAccent: '#5856D6',
    iconLabel: 'FC',
  },
].sort((a, b) => a.bundleIdentifier.localeCompare(b.bundleIdentifier));

function extractPlistString(xml: string, key: string): string | undefined {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`<key>${escaped}</key>\\s*<(?:string|integer)>([^<]+)</(?:string|integer)>`, 'i');
  const match = regex.exec(xml);
  return match?.[1]?.trim();
}

export async function parsePairingFile(file: File): Promise<PairingFileInfo> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const header = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 8));

  if (header.startsWith('bplist00')) {
    return {
      fileName: file.name,
      rawContentPreview: `Binary Property List (${bytes.byteLength} bytes)`,
      format: 'binary-plist',
      importedAt: new Date().toISOString(),
    };
  }

  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  if (!text.includes('<plist') && !text.includes('HostID') && !text.includes('SystemBUID')) {
    throw new Error('Pairing read failed: -1 Invalid pairing plist structure.');
  }

  return {
    fileName: file.name,
    rawContentPreview: text.slice(0, 320),
    format: 'xml-plist',
    hostId: extractPlistString(text, 'HostID') ?? '4F8E2A91-C3D0-4A7B-9E11-884012AB34CD',
    systemBuid: extractPlistString(text, 'SystemBUID') ?? '9A10BC22-77E4-4F09-8C12-001122334455',
    deviceId: extractPlistString(text, 'UDID') ?? extractPlistString(text, 'DeviceID'),
    importedAt: new Date().toISOString(),
  };
}

export function createSamplePairingFile(): PairingFileInfo {
  return {
    fileName: 'pairingFile.plist',
    rawContentPreview: 'Simulated iOS Remote Pairing File (10.7.0.1:49152)',
    format: 'sample',
    hostId: '8D3A1F04-6B29-4C8E-A152-901E7B44D102',
    systemBuid: '3C71E910-55D2-4A98-B601-2290F841C3A7',
    deviceId: '00008140-001A2B3C4D5E6F00',
    importedAt: new Date().toISOString(),
  };
}

export function parseEnableJITUrl(rawUrl: string): EnableJITParams {
  const trimmed = rawUrl.trim();
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error('Unable to decode URL.');
  }

  if (parsed.protocol !== 'stosdebug:' || parsed.hostname !== 'enableJIT') {
    throw new Error('Expected URL scheme stosdebug://enableJIT?bundleId=...&appName=...');
  }

  const bundleId = parsed.searchParams.get('bundleId');
  const appName = parsed.searchParams.get('appName');
  if (!bundleId || !appName) {
    throw new Error("Missing required query key 'bundleId' or 'appName'.");
  }

  const pidRaw = parsed.searchParams.get('pid');
  const relaunchRaw = parsed.searchParams.get('relaunchApp');
  const forcePidRaw = parsed.searchParams.get('forcePID');
  const scriptRaw = parsed.searchParams.get('script');

  return {
    bundleId,
    appName,
    pid: pidRaw !== null ? Number.parseInt(pidRaw, 10) : undefined,
    relaunchApp: relaunchRaw !== null ? relaunchRaw === 'true' : undefined,
    forcePID: forcePidRaw !== null ? forcePidRaw === 'true' : undefined,
    script: scriptRaw ?? undefined,
  };
}
