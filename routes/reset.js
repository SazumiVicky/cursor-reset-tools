import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { promisify } from 'util';
import { exec } from 'child_process';

const rt = express.Router();
const execPromise = promisify(exec);

const gp = () => {
  const pt = os.platform();
  const hm = os.homedir();
  const dc = path.join(hm, 'Documents', '.cursor-free-vip');
  const cf = path.join(dc, 'config.ini');
  let mp = '';
  let sp = '';
  let dp = '';
  let ap = '';
  let cp = '';
  let up = '';

  if (pt === 'win32') {
    mp = path.join(hm, 'AppData', 'Roaming', 'Cursor', 'machineId');
    sp = path.join(hm, 'AppData', 'Roaming', 'Cursor', 'User', 'globalStorage', 'storage.json');
    dp = path.join(hm, 'AppData', 'Roaming', 'Cursor', 'User', 'globalStorage', 'state.vscdb');
    ap = path.join(hm, 'AppData', 'Local', 'Programs', 'Cursor', 'resources', 'app');
    cp = path.join(hm, 'AppData', 'Roaming', 'Cursor', 'User', 'globalStorage', 'cursor.json');
    up = path.join(hm, 'AppData', 'Local', 'Programs', 'Cursor', 'resources', 'app-update.yml');
  } else if (pt === 'darwin') {
    mp = path.join(hm, 'Library', 'Application Support', 'Cursor', 'machineId');
    sp = path.join(hm, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'storage.json');
    dp = path.join(hm, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'state.vscdb');
    ap = path.join('/Applications', 'Cursor.app', 'Contents', 'Resources', 'app');
    cp = path.join(hm, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'cursor.json');
    up = path.join('/Applications', 'Cursor.app', 'Contents', 'Resources', 'app-update.yml');
  } else if (pt === 'linux') {
    mp = path.join(hm, '.config', 'cursor', 'machineId');
    sp = path.join(hm, '.config', 'cursor', 'User', 'globalStorage', 'storage.json');
    dp = path.join(hm, '.config', 'cursor', 'User', 'globalStorage', 'state.vscdb');
    ap = path.join('/usr', 'share', 'cursor', 'resources', 'app');
    cp = path.join(hm, '.config', 'cursor', 'User', 'globalStorage', 'cursor.json');
    up = path.join('/usr', 'share', 'cursor', 'resources', 'app-update.yml');
  }

  return { mp, sp, dp, ap, cp, up, pt, dc, cf };
};

const mk = () => {
  const dt = new Date();
  const yr = dt.getFullYear();
  const mn = String(dt.getMonth() + 1).padStart(2, '0');
  const dy = String(dt.getDate()).padStart(2, '0');
  const hr = String(dt.getHours()).padStart(2, '0');
  const mi = String(dt.getMinutes()).padStart(2, '0');
  const sc = String(dt.getSeconds()).padStart(2, '0');
  return `${yr}${mn}${dy}_${hr}${mi}${sc}`;
};

const bk = async (filePath) => {
  try {
    const bkPath = `${filePath}.bak.${mk()}`;
    await fs.copy(filePath, bkPath);
    return bkPath;
  } catch (error) {
    return null;
  }
};

const gh = () => {
  return crypto.randomBytes(16).toString('hex');
};

const gm = () => {
  return uuidv4().toUpperCase();
};

const cs = (seed) => {
  return crypto.createHash('sha256').update(seed).digest('hex');
};

const kc = async () => {
  if (os.platform() !== 'darwin') return false;
  
  try {
    await execPromise('security delete-generic-password -s "Cursor" -a "token" 2>/dev/null');
    await execPromise('security delete-generic-password -s "Cursor" -a "refreshToken" 2>/dev/null');
    return true;
  } catch (e) {
    return false;
  }
};

const wu = async (newGuid) => {
  if (os.platform() !== 'win32') return false;
  
  try {
    const cmds = [
      `REG ADD HKCU\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid /t REG_SZ /d ${uuidv4()} /f`,
      `REG ADD HKCU\\SOFTWARE\\Microsoft\\SQMClient /v MachineId /t REG_SZ /d ${newGuid} /f`,
      `REG ADD HKLM\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid /t REG_SZ /d ${uuidv4()} /f`,
      `REG ADD HKLM\\SOFTWARE\\Microsoft\\SQMClient /v MachineId /t REG_SZ /d ${newGuid} /f`,
      `REG ADD HKCU\\Software\\Cursor /v MachineId /t REG_SZ /d ${newGuid} /f /reg:64`
    ];
    
    for (const cmd of cmds) {
      try {
        await execPromise(cmd);
      } catch (e) {}
    }
    return true;
  } catch (e) {
    return false;
  }
};

const um = async (id) => {
  if (os.platform() !== 'darwin') return false;
  
  try {
    const p = '/Library/Preferences/SystemConfiguration/com.apple.platform.uuid.plist';
    const hp = path.join(os.homedir(), p);
    
    try {
      await execPromise(`defaults write ${hp} "UUID" "${id}"`);
      await execPromise(`sudo defaults write ${p} "UUID" "${id}"`);
      return true;
    } catch (e) {}

    return false;
  } catch (e) {
    return false;
  }
};

const rm = async () => {
  const logs = [];
  const { mp, sp, dp, ap, cp, pt, dc, cf } = gp();
  
  try {
    logs.push("ℹ️ Checking Config File...");
    
    if (!fs.existsSync(dc)) {
      await fs.ensureDir(dc);
      logs.push("ℹ️ Created config directory");
    }
    
    logs.push("📄 Reading Current Config...");
    
    if (!fs.existsSync(sp)) {
      logs.push("⚠️ Warning: Storage file not found, will create if needed");
    }
    
    if (fs.existsSync(sp)) {
      const bkPath = await bk(sp);
      logs.push(`💾 Creating Config Backup: ${bkPath}`);
    }
    
    logs.push("🔄 Generating New Machine ID...");

    const newGuid = `{${gm().replace(/-/g, '-').toUpperCase()}}`;
    const machId = uuidv4();
    const deviceId = uuidv4();
    const sqmId = newGuid;
    const macId = crypto.randomBytes(64).toString('hex');
    
    logs.push("📄 Saving New Config to JSON...");
    
    if (fs.existsSync(sp)) {
      try {
        const storageData = JSON.parse(await fs.readFile(sp, 'utf8'));
        storageData['update.mode'] = 'none';
        storageData['serviceMachineId'] = deviceId;
        storageData['telemetry.devDeviceId'] = deviceId;
        storageData['telemetry.macMachineId'] = macId;
        storageData['telemetry.machineId'] = cs(machId);
        storageData['telemetry.sqmId'] = sqmId;
        await fs.writeFile(sp, JSON.stringify(storageData, null, 2));
      } catch (err) {
        const newStorageData = {
          'update.mode': 'none',
          'serviceMachineId': deviceId,
          'telemetry.devDeviceId': deviceId,
          'telemetry.macMachineId': macId,
          'telemetry.machineId': cs(machId),
          'telemetry.sqmId': sqmId
        };
        await fs.writeFile(sp, JSON.stringify(newStorageData, null, 2));
      }
    } else {
      const newStorageData = {
        'update.mode': 'none',
        'serviceMachineId': deviceId,
        'telemetry.devDeviceId': deviceId,
        'telemetry.macMachineId': macId,
        'telemetry.machineId': cs(machId),
        'telemetry.sqmId': sqmId
      };
      await fs.ensureDir(path.dirname(sp));
      await fs.writeFile(sp, JSON.stringify(newStorageData, null, 2));
    }
    
    logs.push("ℹ️ Updating SQLite Database...");
    
    const newIds = {
      "telemetry.devDeviceId": deviceId,
      "telemetry.macMachineId": macId,
      "telemetry.machineId": cs(machId),
      "telemetry.sqmId": sqmId,
      "storage.serviceMachineId": deviceId
    };

    if (fs.existsSync(dp)) {
      await bk(dp);
      
      try {
        const db = await open({
          filename: dp,
          driver: sqlite3.Database
        });
        
        await db.exec(`
          CREATE TABLE IF NOT EXISTS ItemTable (
            key TEXT PRIMARY KEY,
            value TEXT
          )
        `);
        
        for (const [key, value] of Object.entries(newIds)) {
          await db.run(`
            INSERT OR REPLACE INTO ItemTable (key, value) 
            VALUES (?, ?)
          `, [key, JSON.stringify(value)]);
          logs.push(`ℹ️ Updating Key-Value Pair: ${key}`);
        }
        
        await db.run(`UPDATE ItemTable SET value = '{"global":{"usage":{"sessionCount":0,"tokenCount":0}}}' WHERE key LIKE '%cursor%usage%'`);
        await db.run(`UPDATE ItemTable SET value = '"pro"' WHERE key LIKE '%cursor%tier%'`);
        await db.run(`DELETE FROM ItemTable WHERE key LIKE '%cursor.lastUpdateCheck%'`);
        await db.run(`DELETE FROM ItemTable WHERE key LIKE '%cursor.trialStartTime%'`);
        await db.run(`DELETE FROM ItemTable WHERE key LIKE '%cursor.trialEndTime%'`);
        
        await db.close();
        logs.push("✅ SQLite Database Updated Successfully");
      } catch (err) {
        logs.push(`⚠️ SQLite Update Error: ${err.message}`);
      }
    } else {
      logs.push("⚠️ SQLite Database not found, skipping database updates");
    }
    
    logs.push("ℹ️ Updating System IDs...");
    
    if (fs.existsSync(mp)) {
      await bk(mp);
      await fs.writeFile(mp, machId);
      logs.push("✅ Machine ID File Updated");
    } else {
      await fs.ensureDir(path.dirname(mp));
      await fs.writeFile(mp, machId);
      logs.push("✅ Machine ID File Created");
    }
    
    if (fs.existsSync(cp)) {
      await bk(cp);
      try {
        const cursorData = JSON.parse(await fs.readFile(cp, 'utf8'));
        if (cursorData) {
          if (cursorData.global && cursorData.global.usage) {
            cursorData.global.usage.sessionCount = 0;
            cursorData.global.usage.tokenCount = 0;
          } else {
            cursorData.global = {
              usage: {
                sessionCount: 0,
                tokenCount: 0
              }
            };
          }
          cursorData.tier = "pro";
          await fs.writeFile(cp, JSON.stringify(cursorData, null, 2));
          logs.push("✅ Cursor.json Updated Successfully");
        }
      } catch (err) {
        logs.push(`⚠️ Cursor.json Update Error: ${err.message}`);
      }
    }
    
    if (pt === 'win32') {
      try {
        const wr = await wu(newGuid);
        if (wr) {
          logs.push("✅ Windows Machine GUID Updated Successfully");
          logs.push(`ℹ️ New Machine ID: ${newGuid}`);
          logs.push("✅ Windows Machine ID Updated Successfully");
          }
        } catch (err) {
        logs.push(`⚠️ Windows Registry Update Error: ${err.message}`);
      }
    } else if (pt === 'darwin') {
      try {
        const mr = await um(macId);
        if (mr) {
          logs.push("✅ macOS Platform UUID Updated Successfully");
        }
        
        const kr = await kc();
        if (kr) {
          logs.push("✅ macOS Keychain Cleared Successfully");
        }
      } catch (err) {
        logs.push(`⚠️ macOS Update Error: ${err.message}`);
      }
    }
    
    logs.push("✅ Machine ID Reset Successfully");
    logs.push("\nℹ️ New IDs:");
    for (const [key, value] of Object.entries(newIds)) {
      logs.push(`ℹ️ ${key}: ${value}`);
    }
    
    return await ld(logs, "Machine ID Reset");
  } catch (err) {
    logs.push(`❌ Process Error: ${err.message}`);
    return await ld(logs, "Machine ID Reset");
  }
};

const gw = () => {
  const { ap, pt } = gp();
  
  if (pt === 'win32') {
    return path.join(ap, 'out', 'vs', 'workbench', 'workbench.desktop.main.js');
  } else if (pt === 'darwin') {
    return path.join(ap, 'out', 'vs', 'workbench', 'workbench.desktop.main.js');
  } else if (pt === 'linux') {
    return path.join(ap, 'out', 'vs', 'workbench', 'workbench.desktop.main.js');
  }
  
  return '';
};

const bt = async () => {
  const logs = [];
  const { dp } = gp();
  const workbenchPath = gw();
  
  try {
    logs.push("ℹ️ Starting token limit bypass...");
    
    if (!fs.existsSync(workbenchPath)) {
      logs.push(`❌ Workbench file not found at: ${workbenchPath}`);
      return await ld(logs, "Bypass Token Limit");
    }
    
    const bkPath = await bk(workbenchPath);
    logs.push(`💾 Created backup: ${bkPath}`);
    
    const content = await fs.readFile(workbenchPath, 'utf8');
    
    const patterns = {
      '<div>Pro Trial': '<div>Pro',
      'py-1">Auto-select': 'py-1">Bypass-Version-Pin',
      'async getEffectiveTokenLimit(e){const n=e.modelName;if(!n)return 2e5;': 'async getEffectiveTokenLimit(e){return 9000000;const n=e.modelName;if(!n)return 9e5;',
      'var DWr=ne("<div class=settings__item_description>You are currently signed in with <strong></strong>.");': 'var DWr=ne("<div class=settings__item_description>You are currently signed in with <strong></strong>. <h1>Pro</h1>");',
      'notifications-toasts': 'notifications-toasts hidden',
      'hasReachedTokenLimit\\(\\w+\\)\\s*{[^}]+}': 'hasReachedTokenLimit(e){return false}',
      'isProUser\\(\\w*\\)\\s*{\\s*[^}]+}': 'isProUser(){return true}',
      'isPro\\(\\w*\\)\\s*{\\s*[^}]+}': 'isPro(){return true}',
      'getTokenLimit\\(\\w*\\)\\s*{\\s*[^}]+}': 'getTokenLimit(){return 999999}',
      'getTokensRemaining\\(\\w*\\)\\s*{\\s*[^}]+}': 'getTokensRemaining(){return 999999}',
      'getTokensUsed\\(\\w*\\)\\s*{\\s*[^}]+}': 'getTokensUsed(){return 0}'
    };
    
    let modified = content;
    for (const [pattern, replacement] of Object.entries(patterns)) {
      const regex = new RegExp(pattern, 'g');
      modified = modified.replace(regex, replacement);
    }
    
    await fs.writeFile(workbenchPath, modified);
    logs.push("✅ Workbench file modified successfully");
    
    if (fs.existsSync(dp)) {
      logs.push("ℹ️ Updating SQLite database for token limits...");
      await bk(dp);
      
      try {
    const db = await open({
      filename: dp,
      driver: sqlite3.Database
    });

    await db.run(`UPDATE ItemTable SET value = '{"global":{"usage":{"sessionCount":0,"tokenCount":0}}}' WHERE key LIKE '%cursor%usage%'`);
    await db.close();
        logs.push("✅ SQLite database updated for token limits");
      } catch (err) {
        logs.push(`⚠️ SQLite update error: ${err.message}`);
      }
    }
    
    logs.push("✅ Token limit bypass completed successfully");
    return await ld(logs, "Bypass Token Limit");
  } catch (err) {
    logs.push(`❌ Token limit bypass error: ${err.message}`);
    return await ld(logs, "Bypass Token Limit");
  }
};

const du = async () => {
  const { ap, pt, up } = gp();
  const logs = [];
  
  try {
    logs.push("ℹ️ Starting auto-update disabling process...");
    
    logs.push("🔄 Terminating any running Cursor processes...");
    try {
      if (pt === 'win32') {
        await execPromise('taskkill /F /IM Cursor.exe /T');
    } else {
        await execPromise('pkill -f Cursor');
      }
      logs.push("✅ Cursor processes terminated successfully");
    } catch (e) {
      logs.push("ℹ️ No running Cursor processes found");
    }
    
    let updaterPath;
    if (pt === 'win32') {
      updaterPath = path.join(os.homedir(), 'AppData', 'Local', 'cursor-updater');
    } else if (pt === 'darwin') {
      updaterPath = path.join(os.homedir(), 'Library', 'Application Support', 'cursor-updater');
    } else if (pt === 'linux') {
      updaterPath = path.join(os.homedir(), '.config', 'cursor-updater');
    }
    
    logs.push(`🔄 Removing updater directory: ${updaterPath}`);
    if (fs.existsSync(updaterPath)) {
    try {
        if (fs.statSync(updaterPath).isDirectory()) {
          await fs.rm(updaterPath, { recursive: true, force: true });
      } else {
          await fs.unlink(updaterPath);
        }
        logs.push("✅ Updater directory successfully removed");
      } catch (e) {
        logs.push(`⚠️ Updater directory is locked, skipping removal: ${e.message}`);
      }
    } else {
      logs.push("ℹ️ Updater directory not found, creating blocker file");
    }
    
    if (!up) {
      logs.push("⚠️ Update.yml path not found for this platform");
    } else {
      logs.push(`🔄 Clearing update.yml file: ${up}`);
      try {
        if (fs.existsSync(up)) {
          await bk(up);
          await fs.writeFile(up, '', 'utf8');
        logs.push("✅ Update.yml file successfully cleared");
    } else {
          logs.push("ℹ️ Update.yml file not found, creating new one");
          await fs.ensureDir(path.dirname(up));
        }
      } catch (e) {
        logs.push(`⚠️ Failed to clear update.yml file: ${e.message}`);
      }
    }
    
    logs.push("🔄 Creating blocker files to prevent auto-updates...");
    
    try {
      await fs.ensureDir(path.dirname(updaterPath));
      await fs.writeFile(updaterPath, '', 'utf8');
      
      if (pt === 'win32') {
        try {
          await execPromise(`attrib +r "${updaterPath}"`);
        } catch (e) {
          logs.push(`⚠️ Failed to set updater file as read-only: ${e.message}`);
        }
      } else {
        try {
          fs.chmodSync(updaterPath, 0o444);
        } catch (e) {
          logs.push(`⚠️ Failed to set updater file permissions: ${e.message}`);
        }
      }
      logs.push("✅ Updater blocker file created successfully");
    } catch (e) {
      logs.push(`⚠️ Failed to create updater blocker file: ${e.message}`);
    }
    
    if (up) {
      try {
        await fs.ensureDir(path.dirname(up));
        await fs.writeFile(up, '# This file is locked to prevent auto-updates\nversion: 0.0.0\n', 'utf8');
        
        if (pt === 'win32') {
          try {
            await execPromise(`attrib +r "${up}"`);
          } catch (e) {
            logs.push(`⚠️ Failed to set update.yml as read-only: ${e.message}`);
          }
        } else {
          try {
            fs.chmodSync(up, 0o444);
          } catch (e) {
            logs.push(`⚠️ Failed to set update.yml permissions: ${e.message}`);
          }
        }
        logs.push("✅ Update.yml blocker file created successfully");
      } catch (e) {
        logs.push(`⚠️ Failed to create update.yml blocker file: ${e.message}`);
      }
    }
    
    const pj = path.join(ap, 'product.json');
    if (fs.existsSync(pj)) {
      logs.push(`🔄 Modifying product.json to remove update URLs: ${pj}`);
      try {
        const bkPath = await bk(pj);
        logs.push(`💾 Created backup: ${bkPath}`);
        
        let content = await fs.readFile(pj, 'utf8');
        
        content = content.replace(/https:\/\/api2\.cursor\.sh\/aiserver\.v1\.AuthService\/DownloadUpdate/g, '')
          .replace(/https:\/\/api2\.cursor\.sh\/updates/g, '')
          .replace(/http:\/\/cursorapi\.com\/updates/g, '');
          
        await fs.writeFile(pj, content, 'utf8');
        logs.push("✅ Update URLs successfully removed from product.json");
      } catch (e) {
        logs.push(`⚠️ Failed to modify product.json: ${e.message}`);
      }
    } else {
      logs.push(`⚠️ Product.json not found at: ${pj}`);
    }
    
    logs.push("✅ Auto-updates successfully disabled");
    
    return await ld(logs, "Disable Auto-Update");
  } catch (e) {
    logs.push(`❌ Error disabling auto-updates: ${e.message}`);
    return await ld(logs, "Disable Auto-Update");
  }
};

const pc = async () => {
  const logs = [];
  const { dp } = gp();
  const workbenchPath = gw();
  
  try {
    logs.push("ℹ️ Starting Pro conversion...");
    
    if (fs.existsSync(dp)) {
      logs.push("ℹ️ Updating SQLite database for Pro features...");
      await bk(dp);
      
      try {
    const db = await open({
      filename: dp,
      driver: sqlite3.Database
    });

    await db.run(`UPDATE ItemTable SET value = '"pro"' WHERE key LIKE '%cursor%tier%'`);
    await db.close();
        logs.push("✅ Pro features enabled in SQLite database");
      } catch (err) {
        logs.push(`⚠️ SQLite update error: ${err.message}`);
      }
    } else {
      logs.push("⚠️ SQLite database not found, skipping database update");
    }
    
    if (fs.existsSync(workbenchPath)) {
      logs.push("ℹ️ Modifying workbench file for Pro UI...");
      const bkPath = await bk(workbenchPath);
      logs.push(`💾 Created backup: ${bkPath}`);
      
      const content = await fs.readFile(workbenchPath, 'utf8');
      
      const patterns = {
        '<div>Pro Trial': '<div>Pro',
        'Upgrade to Pro': 'Sazumi Github',
        'return t.pay': 'return function(){window.open("https://github.com/sazumivicky","_blank")}',
        'rocket': 'github',
        'var DWr=ne("<div class=settings__item_description>You are currently signed in with <strong></strong>.");': 'var DWr=ne("<div class=settings__item_description>You are currently signed in with <strong></strong>. <h1>Pro</h1>");',
      };
      
      let modified = content;
      for (const [pattern, replacement] of Object.entries(patterns)) {
        modified = modified.replace(new RegExp(pattern, 'g'), replacement);
      }
      
      await fs.writeFile(workbenchPath, modified);
      logs.push("✅ Workbench file modified for Pro UI");
    } else {
      logs.push(`⚠️ Workbench file not found at: ${workbenchPath}`);
    }
    
    logs.push("✅ Pro conversion completed successfully");
    return await ld(logs, "Pro Conversion + Custom UI");
  } catch (err) {
    logs.push(`❌ Pro conversion error: ${err.message}`);
    return await ld(logs, "Pro Conversion + Custom UI");
  }
};

const ld = async (logs, toolName) => {
  const hd = "==================================================";
  const t1 = `🔄 Cursor ${toolName} Tool`;
  
  let lg = [];
  lg.push(hd);
  lg.push(t1);
  lg.push(hd);
  
  logs.forEach(l => {
    lg.push(l);
  });
  
  return lg.join('\n');
};

rt.get('/reset', async (req, res) => {
  try {
    const result = await rm();
    res.json({ success: true, log: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

rt.get('/patch', async (req, res) => {
  try {
    const action = req.query.action || 'bypass';
    let result;
    
    if (action === 'bypass') {
      result = await bt();
    } else if (action === 'disable') {
      result = await du();
    } else if (action === 'pro') {
      result = await pc();
    } else {
      result = await bt();
    }
    
    res.json({ success: true, log: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

rt.get('/paths', async (req, res) => {
  try {
    const { mp, sp, dp, ap, cp, up, pt, dc } = gp();
    
    let isRunning = false;
    try {
      if (pt === 'win32') {
        const { stdout } = await execPromise('tasklist /FI "IMAGENAME eq Cursor.exe" /NH');
        isRunning = stdout.includes('Cursor.exe');
      } else {
        const { stdout } = await execPromise('ps aux | grep -i Cursor | grep -v grep');
        isRunning = stdout.trim().length > 0;
      }
    } catch (e) {
      isRunning = false;
    }
    
    const info = {
      platform: pt,
      osVersion: os.release(),
      arch: os.arch(),
      homedir: os.homedir(),
      machinePath: mp,
      storagePath: sp,
      dbPath: dp,
      appPath: ap,
      cursorPath: cp,
      updatePath: up,
      isRunning,
      exists: {
        machineId: fs.existsSync(mp),
        storage: fs.existsSync(sp),
        database: fs.existsSync(dp),
        app: fs.existsSync(ap),
        cursor: fs.existsSync(cp),
        update: fs.existsSync(up)
      }
    };
    
    if (fs.existsSync(sp)) {
      try {
        const data = await fs.readFile(sp, 'utf8');
        const json = JSON.parse(data);
        info.storage = {
          machineId: json['telemetry.machineId'] || json['serviceMachineId'],
          devDeviceId: json['telemetry.devDeviceId'],
          tier: json['cursor.tier'] || 'unknown'
        };
      } catch (e) {}
    }
    
    if (fs.existsSync(dp)) {
      try {
        const db = await open({
          filename: dp,
          driver: sqlite3.Database
        });
        const rows = await db.all('SELECT key, value FROM ItemTable WHERE key LIKE "%cursor%" OR key LIKE "%telemetry%" LIMIT 10');
        info.database = rows.reduce((acc, row) => {
          try {
            acc[row.key] = JSON.parse(row.value);
          } catch (e) {
            acc[row.key] = row.value;
          }
          return acc;
        }, {});
        await db.close();
      } catch (e) {}
    }
  
  res.json(info);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default rt;