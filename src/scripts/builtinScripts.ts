export const CLASSIC_JS = `function littleEndianHexStringToNumber(hexStr) {
    const bytes = [];
    for (let i = 0; i < hexStr.length; i += 2) {
        bytes.push(parseInt(hexStr.substr(i, 2), 16));
    }
    let num = 0n;
    for (let i = 4; i >= 0; i--) {
        num = (num << 8n) | BigInt(bytes[i]);
    }
    return num;
}

function numberToLittleEndianHexString(num) {
    const bytes = [];
    for (let i = 0; i < 5; i++) {
        bytes.push(Number(num & 0xFFn));
        num >>= 8n;
    }
    while (bytes.length < 8) {
        bytes.push(0);
    }
    return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

function littleEndianHexToU32(hexStr) {
    return parseInt(hexStr.match(/../g).reverse().join(''), 16);
}

function extractBrkImmediate(u32) {
    return (u32 >> 5) & 0xFFFF;
}

function attach(breakpointcount) {
    let pid = get_pid();
    log(\`pid = \${pid}\`);
    let attachResponse = send_command(\`vAttach;\${pid.toString(16)}\`);
    log(\`attach_response = \${attachResponse}\`);
    
    let validBreakpoints = 0;
    let totalBreakpoints = 0;

    while (validBreakpoints < breakpointcount) {
        totalBreakpoints++;
        log(\`Handling breakpoint \${totalBreakpoints} (looking for valid breakpoint \${validBreakpoints + 1}/\${breakpointcount})\`);
        
        let brkResponse = send_command(\`c\`);
        log(\`brkResponse = \${brkResponse}\`);
        
        let tidMatch = /T[0-9a-f]+thread:(?<tid>[0-9a-f]+);/.exec(brkResponse);
        let tid = tidMatch ? tidMatch.groups['tid'] : null;
        let pcMatch = /20:(?<reg>[0-9a-f]{16});/.exec(brkResponse);
        let pc = pcMatch ? pcMatch.groups['reg'] : null;
        let x0Match = /00:(?<reg>[0-9a-f]{16});/.exec(brkResponse);
        let x0 = x0Match ? x0Match.groups['reg'] : null;
        let x1Match = /01:(?<reg>[0-9a-f]{16});/.exec(brkResponse);
        let x1 = x1Match ? x1Match.groups['reg'] : null;
        
        if (!tid || !pc || !x0 || !x1) {
            log(\`Failed to extract registers: tid=\${tid}, pc=\${pc}, x0=\${x0}, x1=\${x1}\`);
            continue;
        }
        
        const pcNum = littleEndianHexStringToNumber(pc);
        const x0Num = littleEndianHexStringToNumber(x0);
        const x1Num = littleEndianHexStringToNumber(x1);
        log(\`tid = \${tid}, pc = \${pcNum.toString(16)}, x0 = \${x0Num.toString(16)}, x1 = \${x1Num.toString(16)}\`);
        
        let instructionResponse = send_command(\`m\${pcNum.toString(16)},4\`);
        log(\`instruction at pc: \${instructionResponse}\`);
        let instrU32 = littleEndianHexToU32(instructionResponse);
        let brkImmediate = extractBrkImmediate(instrU32);
        log(\`BRK immediate: 0x\${brkImmediate.toString(16)} (\${brkImmediate})\`);
        
        if (brkImmediate !== 0x69) {
            log(\`Skipping breakpoint: brk immediate was not 0x69 (was 0x\${brkImmediate.toString(16)})\`);
            continue;
        }
        
        log(\`BRK immediate matches expected value 0x69 - processing valid breakpoint \${validBreakpoints + 1}/\${breakpointcount}\`);
        
        log(\`Allocated JIT page at address: 0x\${x0Num.toString(16)}\`);
        
        let prepareJITPageResponse = prepare_memory_region(x0Num, x1Num);
        log(\`prepareJITPageResponse = \${prepareJITPageResponse}\`);
        
        let pcPlus4 = numberToLittleEndianHexString(pcNum + 4n);
        let pcPlus4Response = send_command(\`P20=\${pcPlus4};thread:\${tid};\`);
        log(\`pcPlus4Response = \${pcPlus4Response}\`);
        
        validBreakpoints++;
        log(\`Completed valid breakpoint \${validBreakpoints}/\${breakpointcount}\`);
    }
    
    let detachResponse = send_command(\`D\`);
    log(\`detachResponse = \${detachResponse}\`);
}

attach(1);
`;

export const CLASSIC_GEODE_JS = `function littleEndianHexStringToNumber(hexStr) {
	const bytes = [];
	for (let i = 0; i < hexStr.length; i += 2) {
		bytes.push(parseInt(hexStr.substr(i, 2), 16));
	}
	let num = 0n;
	for (let i = 4; i >= 0; i--) {
		num = (num << 8n) | BigInt(bytes[i]);
	}
	return num;
}

function numberToLittleEndianHexString(num) {
	const bytes = [];
	for (let i = 0; i < 5; i++) {
		bytes.push(Number(num & 0xFFn));
		num >>= 8n;
	}
	while (bytes.length < 8) {
		bytes.push(0);
	}
	return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

function littleEndianHexToU32(hexStr) {
	return parseInt(hexStr.match(/../g).reverse().join(''), 16);
}

function extractBrkImmediate(u32) {
	return (u32 >> 5) & 0xFFFF;
}

let pid = get_pid();
log(\`pid = \${pid}\`);
let attachResponse = send_command(\`vAttach;\${pid.toString(16)}\`);
log(\`attach_response = \${attachResponse}\`);

let validBreakpoints = 0;
let totalBreakpoints = 0;
let invalidBreakpoints = 0;

while (invalidBreakpoints < 10) {
	totalBreakpoints++;
	log(\`Handling breakpoint \${totalBreakpoints} (valid: \${validBreakpoints})\`);
	
	let brkResponse = send_command(\`c\`);
	log(\`brkResponse = \${brkResponse}\`);
	
	let tidMatch = /T[0-9a-f]+thread:(?<tid>[0-9a-f]+);/.exec(brkResponse);
	let tid = tidMatch ? tidMatch.groups['tid'] : null;
	let pcMatch = /20:(?<reg>[0-9a-f]{16});/.exec(brkResponse);
	let pc = pcMatch ? pcMatch.groups['reg'] : null;
	let x0Match = /00:(?<reg>[0-9a-f]{16});/.exec(brkResponse);
	let x0 = x0Match ? x0Match.groups['reg'] : null;
	let x1Match = /01:(?<reg>[0-9a-f]{16});/.exec(brkResponse);
	let x1 = x1Match ? x1Match.groups['reg'] : null;
	
	if (!tid || !pc || !x0) {
		log(\`Failed to extract registers: tid=\${tid}, pc=\${pc}, x0=\${x0}, x1=\${x1}\`);
		invalidBreakpoints++;
		continue;
	}

	const pcNum = littleEndianHexStringToNumber(pc);
	const x0Num = littleEndianHexStringToNumber(x0);
	const x1Num = x1 ? littleEndianHexStringToNumber(x1) : 0n;
	log(\`tid = \${tid}, pc = \${pcNum.toString(16)}, x0 = \${x0Num.toString(16)}, x1 = \${x1Num.toString(16)}\`);
	
	let instructionResponse = send_command(\`m\${pcNum.toString(16)},4\`);
	log(\`instruction at pc: \${instructionResponse}\`);
	let instrU32 = littleEndianHexToU32(instructionResponse);
	let brkImmediate = extractBrkImmediate(instrU32);
	log(\`BRK immediate: 0x\${brkImmediate.toString(16)} (\${brkImmediate})\`);
	
	if (brkImmediate !== 0x69 && brkImmediate !== 0x70 && brkImmediate !== 0x71) {
		log(\`Skipping: BRK immediate not 0x69 or 0x70 or 0x71 (was 0x\${brkImmediate.toString(16)})\`);
		invalidBreakpoints++;
		continue;
	}
	invalidBreakpoints = 0;
	
	if (brkImmediate === 0x69) {
		log(\`Received command to process JIT mapping (0x69)\`);
		
		let jitPageAddress = x0Num;
		let size = x1Num > 0n ? x1Num : 0x10000n;
		log(\`Got RX page address: 0x\${jitPageAddress.toString(16)}, preparing region with 0x\${size.toString(16)} bytes!\`);
		
		let prepareJITPageResponse = prepare_memory_region(Number(jitPageAddress), Number(size));
		log(\`prepareJITPageResponse = \${prepareJITPageResponse}\`);
		
		let pcPlus4 = numberToLittleEndianHexString(pcNum + 4n);
		let pcPlus4Response = send_command(\`P20=\${pcPlus4};thread:\${tid};\`);
		log(\`pcPlus4Response = \${pcPlus4Response}\`);
		validBreakpoints++;
	} else if (brkImmediate === 0x70) {
		log(\`Received command to patch instructions (0x70)\`);
		
		let x2Match = /02:(?<reg>[0-9a-f]{16});/.exec(brkResponse);
		let x2 = x2Match ? x2Match.groups['reg'] : null;

		if (!x1 || !x2) {
			log(\`Missing x1 or x2 for function patching\`);
			continue;
		}

		let destAddr = x0Num;
		let srcAddr = x1Num;
		let size = x2 ? littleEndianHexStringToNumber(x2) : 10n;
		log(\`Patching: dest=0x\${destAddr.toString(16)}, src=0x\${srcAddr.toString(16)}, size=0x\${size.toString(16)}\`);
		
		if (size > 0x400000n) {
			log(\`Size too large (0x\${size.toString(16)}), skipping\`);
			let pcPlus4 = numberToLittleEndianHexString(pcNum + 4n);
			let pcPlus4Response = send_command(\`P20=\${pcPlus4};thread:\${tid};\`);
			log(\`pcPlus4Response = \${pcPlus4Response}\`);
			validBreakpoints++;
			continue;
		}
		try {
			const CHUNK_SIZE = 0x4000n;
			for (let i = 0n; i < size; i += CHUNK_SIZE) {
				let chunkSize = i + CHUNK_SIZE <= size ? CHUNK_SIZE : size - i;
				let readAddr = srcAddr + i;
				let writeAddr = destAddr + i;
				let readRes = send_command(\`m\${readAddr.toString(16)},\${chunkSize.toString(16)}\`);
				if (readRes && readRes.length > 0) {
					let writeResponse = send_command(\`M\${writeAddr.toString(16)},\${chunkSize.toString(16)}:\${readRes}\`);
					if (writeResponse !== "OK") {
						log(\`Write failed at offset \${i.toString(16)}\`);
						break;
					}
				}
				if (Number(i / CHUNK_SIZE) % 10 === 0) {
					log(\`Progress: 0x\${i.toString(16)}/0x\${size.toString(16)}\`);
				}
			}
			log(\`Memory write completed!\`);
		} catch (e) {
            log(\`Memory write failed: \${e}\`);
		}
		
		let pcPlus4 = numberToLittleEndianHexString(pcNum + 4n);
		let pcPlus4Response = send_command(\`P20=\${pcPlus4};thread:\${tid};\`);
		log(\`pcPlus4Response = \${pcPlus4Response}\`);
		validBreakpoints++;
	} else if (brkImmediate === 0x71) {
		break;
	}
	
	log(\`Completed breakpoint \${validBreakpoints}\`);
}
log(\`Stopping script (Received 0x71 or too many invalid breakpoints)\`);
let detachResponse = send_command(\`D\`);
log(\`detachResponse = \${detachResponse}\`);
`;

export const UNIVERSAL_JS = `// Universal JIT Script, last updated 2026-29-03 (YYYY-DD-MM)
const CMD_DETACH = 0;
const CMD_PREPARE_REGION = 1;
const CMD_NEW_BREAKPOINTS = 2;
const commands = {
    [CMD_DETACH]: JIT26Detach,
    [CMD_PREPARE_REGION]: JIT26PrepareRegion,
    [CMD_NEW_BREAKPOINTS]: JIT26NewBreakpoints
};
const legacyCommands = {
    [0x68]: JIT26NewBreakpoints,
    [0x69]: JIT26HandleBrk0x69,
    [0xf00d]: JIT26HandleBrk0xf00d
};

const LOG_INFO = 1;
const LOG_VERBOSE = 2;
let logLevel = LOG_VERBOSE;
function log_verbose(msg) {
    if (logLevel >= LOG_VERBOSE) {
        log(msg);
    }
}

let tid, x0, x1, x16, pc;
let detached = false;
let continuesWithSignal = true;
let pid = get_pid();
let attachResponse = send_command(\`vAttach;\${pid.toString(16)}\`);

log(\`pid = \${pid}\`);
log(\`attach_response = \${attachResponse}\`);
    
let totalBreakpoints = 0;
while (!detached) {
    totalBreakpoints++;
    log(\`Handling signal \${totalBreakpoints}\`);
    
    let brkResponse = send_command(\`c\`);
    log_verbose(\`brkResponse = \${brkResponse}\`);
    
    let tmpMatch = /T[0-9a-f]+thread:(?<tid>[0-9a-f]+);/.exec(brkResponse);
    tid = tmpMatch ? tmpMatch.groups['tid'] : null;
    tmpMatch = /20:(?<reg>[0-9a-f]{16});/.exec(brkResponse);
    pc = tmpMatch ? tmpMatch.groups['reg'] : null;
    tmpMatch = /10:(?<reg>[0-9a-f]{16});/.exec(brkResponse);
    x16 = tmpMatch ? tmpMatch.groups['reg'] : null;
    if (!tid || !pc || !x16) {
        log(\`Failed to extract registers: tid=\${tid}, pc=\${pc}, x16=\${x16}\`);
        continue;
    }
    pc = littleEndianHexStringToNumber(pc);
    x16 = littleEndianHexStringToNumber(x16);
    
    let instructionResponse = send_command(\`m\${pc.toString(16)},4\`);
    log(\`instruction at pc: \${instructionResponse}\`);
    let instrU32 = littleEndianHexToU32(instructionResponse);
    
    if ((instrU32 & 0xFFE0001F)>>>0 != 0xD4200000) {
        log(\`Skipping: instruction was not a brk (was 0x\${instrU32.toString(16)})\`);
        if (continuesWithSignal) {
            let signum = /^T(?<sig>[a-z0-9;]{2})/.exec(brkResponse);
            signum = signum ? signum.groups['sig'] : null;
            if (!signum) {
                log(\`Failed to extract signal number: \${signum}\`);
                continue;
            }
            log(\`Continuing with signal 0x\${signum}\`);
            send_command(\`vCont;S\${signum}:\${tid}\`);
        }
        continue;
    }
    
    let brkImmediate = extractBrkImmediate(instrU32);
    log(\`BRK immediate: 0x\${brkImmediate.toString(16)} (\${brkImmediate})\`);
    if (legacyCommands[brkImmediate] != undefined) {
        tmpMatch = /00:(?<reg>[0-9a-f]{16});/.exec(brkResponse);
        x0 = tmpMatch ? tmpMatch.groups['reg'] : null;
        tmpMatch = /01:(?<reg>[0-9a-f]{16});/.exec(brkResponse);
        x1 = tmpMatch ? tmpMatch.groups['reg'] : null;
        if (!x0 || !x1) {
            log(\`Failed to extract registers: x0=\${x0}, x1=\${x1}\`);
            continue;
        }
        x0 = littleEndianHexStringToNumber(x0);
        x1 = littleEndianHexStringToNumber(x1);
        
        let pcPlus4 = numberToLittleEndianHexString(pc + 4n);
        let pcPlus4Response = send_command(\`P20=\${pcPlus4};thread:\${tid};\`);
        log(\`pcPlus4Response = \${pcPlus4Response}\`);
        
        const command = legacyCommands[brkImmediate];
        command(brkResponse);
    } else {
        log(\`Skipping breakpoint: brk immediate 0x\${brkImmediate.toString(16)} was not handled by this script. You could add it by evaluating legacyCommands[0x\${brkImmediate.toString(16)}] = yourFunction;\`);
        continue;
    }
}

function JIT26Detach() {
    let detachResponse = send_command(\`D\`);
    log_verbose(\`detachResponse = \${detachResponse}\`);
    detached = true;
}

function JIT26NewBreakpoints(brkResponse) {
    let instructionResponse = send_command(\`m\${pc.toString(16)},4\`);
    log(\`instruction at pc: \${instructionResponse}\`);
    let instrU32 = littleEndianHexToU32(instructionResponse);
    let brkImmediate = extractBrkImmediate(instrU32);
    
    let memResponse = send_command(\`m\${x0.toString(16)},\${x1}\`);

    let scriptText = hexToAscii(memResponse);
    log_verbose(\`Script text: \${scriptText}\`);

    const res = runScriptAndCapture(scriptText);
    if (res.ok) {
        log('Script succeeded:', res.value);
    } else {
        log('Script failed:', res.name, res.message);
        log(res.stack);
    }
}

function JIT26HandleBrk0x69(brkResponse) {
    log(\`Error: It seems you are using legacy breakpoint 0x69. Please set your legacy handler using \\\`legacyCommands[0x69] = yourHandler;\\\` or migrate to universal jitcalls to use this script. The function will now return 0xE0000069.\`);
    let putX0Response = send_command(\`P0=E0000069;thread:\${tid};\`);
    log(\`putX0Response = \${putX0Response}\`);
}

function JIT26HandleBrk0xf00d(brkResponse) {
    const command = commands[x16];
    if (command === undefined) {
        log(\`Unknown command \${x16.toString(16)}\`);
        return;
    }
    log(\`Invoking command \${x16.toString(16)}\`);
    command(brkResponse);
}

function JIT26PrepareRegion(brkResponse) {
    let instructionResponse = send_command(\`m\${pc.toString(16)},4\`);
    log(\`instruction at pc: \${instructionResponse}\`);
    let instrU32 = littleEndianHexToU32(instructionResponse);
    let brkImmediate = extractBrkImmediate(instrU32);
    
    if (x0 == 0n && x1 == 0n) {
        return;
    }

    let jitPageAddress = x0;
    if (x0 == 0n) {
        let requestRXResponse = send_command(\`_M\${x1.toString(16)},rx\`);
        log_verbose(\`requestRXResponse = \${requestRXResponse}\`);
        
        if (!requestRXResponse || requestRXResponse.length === 0) {
            log(\`Failed to allocate RX memory\`);
            return;
        }
        
        jitPageAddress = BigInt(\`0x\${requestRXResponse}\`);
        log(\`Allocated JIT page at address: 0x\${jitPageAddress.toString(16)}\`);
    }

    let prepareJITPageResponse = prepare_memory_region(jitPageAddress, x1);
    log(\`prepareJITPageResponse = \${prepareJITPageResponse}\`);

    let putX0Response = send_command(\`P0=\${numberToLittleEndianHexString(jitPageAddress)};thread:\${tid};\`);
    log(\`putX0Response = \${putX0Response}\`);
}

function littleEndianHexStringToNumber(hexStr) {
    const bytes = [];
    for (let i = 0; i < hexStr.length; i += 2) {
        bytes.push(parseInt(hexStr.substr(i, 2), 16));
    }
    let num = 0n;
    for (let i = 4; i >= 0; i--) {
        num = (num << 8n) | BigInt(bytes[i]);
    }
    return num;
}

function numberToLittleEndianHexString(num) {
    const bytes = [];
    for (let i = 0; i < 5; i++) {
        bytes.push(Number(num & 0xFFn));
        num >>= 8n;
    }
    while (bytes.length < 8) {
        bytes.push(0);
    }
    return bytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

function littleEndianHexToU32(hexStr) {
    return parseInt(hexStr.match(/../g).reverse().join(''), 16);
}

function extractBrkImmediate(u32) {
    return (u32 >> 5) & 0xFFFF;
}

function hexToAscii(hexStr) {
    let str = '';
    for (let i = 0; i < hexStr.length; i += 2) {
        const byte = parseInt(hexStr.substr(i, 2), 16);
        if (byte === 0) break;
        str += String.fromCharCode(byte);
    }
    return str;
}

function runScriptAndCapture(scriptText) {
    try {
        const value = eval(scriptText);
        return { ok: true, value };
    } catch (err) {
        return {
            ok: false,
            name: err && err.name,
            message: err && err.message,
            stack: err && err.stack
        };
    }
}
`;

export const UNIVERSAL_MANIC_JITRPL = `//
//  universal+manic.stosrpl
//  StosDebug
//
//  Created by Stossy11 on 28/3/2026.
//

:RPL
function JIT26HandleBrk0x69(brkResponse) {
    log(\`Error: It seems you are using legacy breakpoint 0x69. Please set your legacy handler using \\\`legacyCommands[0x69] = yourHandler;\\\` or migrate to universal jitcalls to use this script. The function will now return 0xE0000069.\`);
    let putX0Response = send_command(\`P0=E0000069;thread:\${tid};\`);
    log(\`putX0Response = \${putX0Response}\`);
}
:WITH
function JIT26HandleBrk0x69(brkResponse) {
    let jitPageAddress = x0;
    // If x1 is 0, use the default size of 64KB (0x10000).
    // Manic EMU's CodeBlock typically requests large memory chunks (tens of MB for CPU JIT)
    // but also asks for smaller ones (like 4KB/16KB for SpinLock and Shader JIT).
    let size = x1 > 0n ? x1 : 0x10000n;
    
    log(\`[Manic EMU] ----------------------------------------\`);
    log(\`[Manic EMU] JIT Request\`);
    log(\`[Manic EMU]   Address: 0x\${jitPageAddress.toString(16)}\`);
    log(\`[Manic EMU]   Size: 0x\${size.toString(16)}\`);
    
    // Call prepare_memory_region to mark the memory as executable.
    let prepareJITPageResponse = prepare_memory_region(Number(jitPageAddress), Number(size));
    log(\`[Manic EMU]   prepare_memory_region result: \${prepareJITPageResponse}\`);

    // Set PC+4 to continue program execution
    let pcPlus4 = numberToLittleEndianHexString(pc + 4n);
    send_command(\`P20=\${pcPlus4};thread:\${tid};\`);
    
    log(\`[Manic EMU]   Resumed execution at PC=0x\${(pc + 4n).toString(16)}\`);
    log(\`[Manic EMU] ----------------------------------------\`);
}
:ENDRPL
`;

export function applyJitPatch(template: string, patchContent: string): string {
  let result = template;
  const lines = patchContent.replace(/\r\n/g, '\n').split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    i++;
    if (line === ':RPL') {
      const findLines: string[] = [];
      const replaceLines: string[] = [];
      while (i < lines.length && lines[i] !== ':WITH') {
        findLines.push(lines[i]);
        i++;
      }
      i++; // skip :WITH
      while (i < lines.length && lines[i] !== ':ENDRPL') {
        replaceLines.push(lines[i]);
        i++;
      }
      i++; // skip :ENDRPL
      const find = findLines.join('\n');
      const replace = replaceLines.join('\n');
      result = result.split(find).join(replace);
    }
  }
  return result;
}

export interface ScriptDescriptor {
  name: string;
  scriptName: string;
  persistent: boolean;
  code: string;
  isPatch: boolean;
}

const BUILTIN_TEMPLATES: Record<string, string> = {
  classic: CLASSIC_JS,
  classic_geode: CLASSIC_GEODE_JS,
  universal: UNIVERSAL_JS,
};

const customScripts = new Map<string, ScriptDescriptor>();

export function registerCustomScript(
  name: string,
  content: string,
  options: { isPatch?: boolean; persistent?: boolean } = {}
): ScriptDescriptor {
  const persistent = options.persistent ?? true;
  if (options.isPatch && name.includes('+')) {
    const [prefix, suffix] = name.split('+', 2);
    const base = BUILTIN_TEMPLATES[prefix] ?? UNIVERSAL_JS;
    const patched = applyJitPatch(base, content);
    const descriptor: ScriptDescriptor = {
      name,
      scriptName: suffix || name,
      persistent,
      code: patched,
      isPatch: true,
    };
    customScripts.set(suffix.toLowerCase(), descriptor);
    return descriptor;
  }

  const parts = name.split('+', 2);
  const descriptor: ScriptDescriptor = {
    name,
    scriptName: parts[1] ?? name,
    persistent,
    code: content,
    isPatch: false,
  };
  customScripts.set(name.toLowerCase(), descriptor);
  return descriptor;
}

export function removeTransientScript(name: string): void {
  const key = name.toLowerCase();
  const entry = customScripts.get(key);
  if (entry && !entry.persistent) {
    customScripts.delete(key);
  }
}

export function listRegisteredCustomScripts(): ScriptDescriptor[] {
  return Array.from(customScripts.values());
}

export function getScriptFromName(appName: string): ScriptDescriptor {
  const lower = appName.toLowerCase();
  for (const [key, value] of customScripts.entries()) {
    if (lower.includes(key) || key === lower) {
      return value;
    }
  }

  if (lower.includes('manic')) {
    return {
      name: 'universal+manic',
      scriptName: 'manic',
      persistent: true,
      code: applyJitPatch(UNIVERSAL_JS, UNIVERSAL_MANIC_JITRPL),
      isPatch: true,
    };
  }
  if (lower.includes('utm') || lower.includes('dolphin') || lower.includes('flycast')) {
    return {
      name: 'classic',
      scriptName: 'classic',
      persistent: true,
      code: CLASSIC_JS,
      isPatch: false,
    };
  }
  if (lower.includes('geode')) {
    return {
      name: 'classic_geode',
      scriptName: 'classic_geode',
      persistent: true,
      code: CLASSIC_GEODE_JS,
      isPatch: false,
    };
  }
  return {
    name: 'universal',
    scriptName: 'universal',
    persistent: true,
    code: UNIVERSAL_JS,
    isPatch: false,
  };
}
