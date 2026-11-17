import { ScriptDescriptor, removeTransientScript } from '../scripts/builtinScripts';

interface BreakpointFrame {
  pc: bigint;
  x0: bigint;
  x1: bigint;
  x2: bigint;
  x16: bigint;
  brkImmediate: number;
}

function bigintToLittleEndianHex64(val: bigint): string {
  const bytes: number[] = [];
  let v = val;
  for (let i = 0; i < 8; i++) {
    bytes.push(Number(v & 0xffn));
    v >>= 8n;
  }
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function encodeArm64BrkLittleEndianHex(imm16: number): string {
  // ARM64 BRK #imm16 encoding: 0xD4200000 | ((imm16 & 0xFFFF) << 5)
  const u32 = (0xd4200000 | ((imm16 & 0xffff) << 5)) >>> 0;
  const b0 = u32 & 0xff;
  const b1 = (u32 >>> 8) & 0xff;
  const b2 = (u32 >>> 16) & 0xff;
  const b3 = (u32 >>> 24) & 0xff;
  return [b0, b1, b2, b3].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function buildBreakpointSequence(scriptName: string): BreakpointFrame[] {
  const lower = scriptName.toLowerCase();

  if (lower.includes('manic')) {
    return [
      {
        pc: 0x104218a40n,
        x0: 0x110000000n,
        x1: 0x200000n, // 2 MB CPU JIT block
        x2: 0n,
        x16: 0n,
        brkImmediate: 0x69,
      },
      {
        pc: 0x104218ac0n,
        x0: 0n,
        x1: 0n,
        x2: 0n,
        x16: 0n, // CMD_DETACH
        brkImmediate: 0xf00d,
      },
    ];
  }

  if (lower === 'classic') {
    return [
      {
        pc: 0x102884120n,
        x0: 0x114000000n,
        x1: 0x40000n, // 256 KB
        x2: 0n,
        x16: 0n,
        brkImmediate: 0x69,
      },
    ];
  }

  if (lower === 'classic_geode') {
    return [
      {
        pc: 0x103104080n,
        x0: 0x118000000n,
        x1: 0x80000n, // 512 KB RX mapping
        x2: 0n,
        x16: 0n,
        brkImmediate: 0x69,
      },
      {
        pc: 0x103104210n,
        x0: 0x118004000n, // dest
        x1: 0x105400000n, // src
        x2: 0x8000n, // 32 KB patched instructions (2 chunks of 0x4000)
        x16: 0n,
        brkImmediate: 0x70,
      },
      {
        pc: 0x103104300n,
        x0: 0x1n,
        x1: 0n,
        x2: 0n,
        x16: 0n,
        brkImmediate: 0x71, // detach
      },
    ];
  }

  // Universal JIT26 sequence: prepare RX region (x16=1) then detach (x16=0)
  return [
    {
      pc: 0x104800410n,
      x0: 0n, // triggers _M<size>,rx allocation
      x1: 0x100000n, // 1 MB
      x2: 0n,
      x16: 1n, // CMD_PREPARE_REGION
      brkImmediate: 0xf00d,
    },
    {
      pc: 0x104800490n,
      x0: 0n,
      x1: 0n,
      x2: 0n,
      x16: 0n, // CMD_DETACH
      brkImmediate: 0xf00d,
    },
  ];
}

export interface RunScriptResult {
  pid: number;
  scriptName: string;
  logs: string[];
  success: boolean;
  errorMessage?: string;
}

export function executeJitScript(params: {
  pid: number;
  script: ScriptDescriptor;
  onLog?: (line: string) => void;
}): RunScriptResult {
  const { pid, script, onLog } = params;
  const logs: string[] = [];
  const emit = (msg: string) => {
    logs.push(msg);
    onLog?.(msg);
  };

  const frames = buildBreakpointSequence(script.scriptName === 'manic' ? 'manic' : script.name);
  const tid = '1a2b';
  const pcToImm = new Map<string, number>();
  for (const frame of frames) {
    pcToImm.set(frame.pc.toString(16), frame.brkImmediate);
  }

  let frameIndex = 0;
  let nextRxAlloc = 0x120000000n;
  let commandCycles = 0;
  const MAX_CYCLES = 200;

  const get_pid = (): number => pid;

  const log = (...args: unknown[]): void => {
    emit(args.map((a) => (typeof a === 'string' ? a : String(a))).join(' '));
  };

  const prepare_memory_region = (startAddr: number | bigint, regionSize: number | bigint): string => {
    const size = typeof regionSize === 'bigint' ? regionSize : BigInt(Math.max(0, Math.floor(regionSize)));
    const addr = typeof startAddr === 'bigint' ? startAddr : BigInt(Math.max(0, Math.floor(startAddr)));
    const pageCount = Number(size >> 14n);
    if (addr <= 0n || pageCount < 0) {
      return '';
    }
    return 'OK';
  };

  const send_command = (commandStr: string): string => {
    commandCycles++;
    if (commandCycles > MAX_CYCLES) {
      throw new Error('Script execution interrupted: maximum debug proxy command cycles exceeded.');
    }

    if (commandStr.startsWith('vAttach;')) {
      return `T05thread:${tid};`;
    }

    if (commandStr === 'c') {
      if (frameIndex >= frames.length) {
        // Fallback detach frame to avoid infinite loops
        const fallbackPc = 0x104800fffn;
        pcToImm.set(fallbackPc.toString(16), 0xf00d);
        return (
          `T05thread:${tid};` +
          `00:${bigintToLittleEndianHex64(0n)};` +
          `01:${bigintToLittleEndianHex64(0n)};` +
          `02:${bigintToLittleEndianHex64(0n)};` +
          `10:${bigintToLittleEndianHex64(0n)};` +
          `20:${bigintToLittleEndianHex64(fallbackPc)};`
        );
      }

      const f = frames[frameIndex++];
      return (
        `T05thread:${tid};` +
        `00:${bigintToLittleEndianHex64(f.x0)};` +
        `01:${bigintToLittleEndianHex64(f.x1)};` +
        `02:${bigintToLittleEndianHex64(f.x2)};` +
        `10:${bigintToLittleEndianHex64(f.x16)};` +
        `20:${bigintToLittleEndianHex64(f.pc)};`
      );
    }

    if (commandStr.startsWith('m')) {
      const match = /^m([0-9a-fA-F]+),([0-9a-fA-F]+)$/.exec(commandStr);
      if (!match) return '';
      const addrHex = match[1].toLowerCase();
      const size = parseInt(match[2], 16);
      const imm = pcToImm.get(addrHex);
      if (imm !== undefined && size === 4) {
        return encodeArm64BrkLittleEndianHex(imm);
      }
      // Return deterministic ARM64 NOP-like bytes for memory read chunks (e.g., Geode 0x70)
      const chunkLen = Math.min(size, 64);
      return '1f2003d5'.repeat(Math.max(1, Math.floor(chunkLen / 4))).slice(0, chunkLen * 2);
    }

    if (commandStr.startsWith('M')) {
      return 'OK';
    }

    if (commandStr.startsWith('_M')) {
      const match = /^_M([0-9a-fA-F]+),rx$/.exec(commandStr);
      const size = match ? BigInt(`0x${match[1]}`) : 0x10000n;
      const allocated = nextRxAlloc;
      nextRxAlloc += size;
      return allocated.toString(16);
    }

    if (commandStr.startsWith('P') || commandStr.startsWith('vCont;') || commandStr === 'D') {
      return 'OK';
    }

    return 'OK';
  };

  let success = true;
  let errorMessage: string | undefined;

  try {
    const runner = new Function(
      'get_pid',
      'send_command',
      'prepare_memory_region',
      'log',
      `"use strict";\n${script.code}`
    );
    runner(get_pid, send_command, prepare_memory_region, log);
  } catch (err) {
    success = false;
    errorMessage = err instanceof Error ? err.message : String(err);
    emit(`JSException: ${errorMessage}`);
  } finally {
    if (!script.persistent) {
      removeTransientScript(script.name);
    }
  }

  emit('Script Execution Completed');
  emit('You are safe to close the PIP Window.');

  return {
    pid,
    scriptName: script.scriptName,
    logs,
    success,
    errorMessage,
  };
}

export function executeNonTxmAttachDetach(pid: number, bundleId: string): string[] {
  const hexPid = pid.toString(16);
  return [
    `[Non-TXM] Connecting remote server & debug proxy for ${bundleId} (pid=${pid})`,
    `[Non-TXM] -> vAttach;${hexPid}`,
    `[Non-TXM] <- T05thread:1a2b;`,
    `[Non-TXM] -> D (detach x3)`,
    `[Non-TXM] <- OK`,
  ];
}
