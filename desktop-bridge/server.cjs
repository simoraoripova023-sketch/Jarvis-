// JARVIS Windows Desktop Bridge Engine
// Connects Web HUD to native Windows OS capabilities via lightweight HTTP REST API

const http = require('http');
const { exec } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const PORT = 4321;

// Supabase PostgreSQL Cloud Pool
const SUPABASE_DB_URL = 'postgresql://postgres.unncxmxmcrknulznfcpx:Simoraoripova19@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres';
let pgPool = null;
try {
  pgPool = new Pool({
    connectionString: SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false }
  });
  console.log('[JARVIS SUPABASE] Cloud PostgreSQL Pool initialized.');
} catch (e) {
  console.error('[JARVIS SUPABASE] Pool error:', e.message);
}

// Allowed CORS & Private Network Access Origin
const setCorsHeaders = (res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Allow-Private-Network');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
};

// Known Windows Application Paths & Protocol Handlers
const APP_LAUNCH_MAP = {
  telegram: 'cmd /c start tg://',
  tg: 'cmd /c start tg://',
  calc: 'start calc.exe',
  calculator: 'start calc.exe',
  kalkulyator: 'start calc.exe',
  notepad: 'start notepad.exe',
  bloknot: 'start notepad.exe',
  vscode: 'code',
  code: 'code',
  chrome: 'start chrome',
  browser: 'start chrome',
  brauzer: 'start chrome',
  edge: 'start msedge',
  spotify: 'start spotify:',
  musiqa: 'start spotify:',
  zoom: 'start zoom.exe',
  word: 'start winword.exe',
  excel: 'start excel.exe',
  powerpoint: 'start powerpnt.exe',
  ppt: 'start powerpnt.exe',
  camera: 'start microsoft.windows.camera:',
  kamera: 'start microsoft.windows.camera:',
  whatsapp: 'start whatsapp:',
  paint: 'start mspaint.exe',
  youtube: 'start https://youtube.com',
  mail: 'start mailto:',
  email: 'start mailto:',
  explorer: 'start explorer.exe',
  desktop: `start explorer.exe "${path.join(os.homedir(), 'OneDrive', 'Desktop')}"`,
  ishstoli: `start explorer.exe "${path.join(os.homedir(), 'OneDrive', 'Desktop')}"`,
  downloads: `start explorer.exe "${path.join(os.homedir(), 'Downloads')}"`,
  documents: `start explorer.exe "${path.join(os.homedir(), 'OneDrive', 'Documents')}"`,
  terminal: 'start powershell.exe',
  cmd: 'start cmd.exe',
  settings: 'start ms-settings:',
  taskmanager: 'start taskmgr.exe'
};

// Hardware Battery Sensor
let cachedBattery = { levelPercent: 80, isCharging: true };
const updateBatteryInfo = () => {
  exec('powershell -NoProfile -Command "$b = Get-CimInstance Win32_Battery; if ($b) { $b.EstimatedChargeRemaining; $b.BatteryStatus }"', (err, stdout) => {
    if (!err && stdout && stdout.trim()) {
      const parts = stdout.trim().split(/\r?\n/);
      if (parts.length >= 1) {
        const lvl = parseInt(parts[0], 10);
        if (!isNaN(lvl)) cachedBattery.levelPercent = lvl;
      }
      if (parts.length >= 2) {
        const st = parseInt(parts[1], 10);
        cachedBattery.isCharging = st === 2 || st === 6 || st === 7 || st === 8;
      }
    }
  });
};
setInterval(updateBatteryInfo, 10000);
updateBatteryInfo();

// Calculate real CPU usage percentage
let lastCpuMeasure = os.cpus();
const getCpuUsage = () => {
  const currentCpus = os.cpus();
  let idleDiff = 0;
  let totalDiff = 0;

  for (let i = 0; i < currentCpus.length; i++) {
    const prev = lastCpuMeasure[i].times;
    const curr = currentCpus[i].times;

    const prevTotal = prev.user + prev.nice + prev.sys + prev.idle + prev.irq;
    const currTotal = curr.user + curr.nice + curr.sys + curr.idle + curr.irq;

    totalDiff += currTotal - prevTotal;
    idleDiff += curr.idle - prev.idle;
  }

  lastCpuMeasure = currentCpus;
  if (totalDiff === 0) return 15;
  const usage = Math.round(100 - (100 * idleDiff) / totalDiff);
  return Math.min(100, Math.max(1, usage));
};

// Take native Windows screenshot using PowerShell
const takeScreenshot = () => {
  return new Promise((resolve, reject) => {
    const screenshotsDir = path.join(os.homedir(), 'OneDrive', 'Desktop', 'Jarvis_Screenshots');
    if (!fs.existsSync(screenshotsDir)) {
      try {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      } catch (e) {
        return reject(e);
      }
    }

    const filename = `Jarvis_Screen_${Date.now()}.png`;
    const outputPath = path.join(screenshotsDir, filename);

    const psScript = `
      Add-Type -AssemblyName System.Windows.Forms
      Add-Type -AssemblyName System.Drawing
      $bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds
      $bmp = New-Object System.Drawing.Bitmap $bounds.Width, $bounds.Height
      $graphics = [System.Drawing.Graphics]::FromImage($bmp)
      $graphics.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
      $bmp.Save('${outputPath.replace(/\\/g, '\\\\')}', [System.Drawing.Imaging.ImageFormat]::Png)
      $graphics.Dispose()
      $bmp.Dispose()
    `;

    exec(`powershell -NoProfile -Command "${psScript.replace(/\n/g, ' ')}"`, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve({ path: outputPath, filename });
      }
    });
  });
};

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. Health & Real Telemetry Endpoint
  if (req.method === 'GET' && req.url === '/telemetry') {
    const totalMem = Math.round(os.totalmem() / (1024 * 1024 * 1024) * 10) / 10;
    const freeMem = Math.round(os.freemem() / (1024 * 1024 * 1024) * 10) / 10;
    const usedMem = Math.round((totalMem - freeMem) * 10) / 10;
    const memUsagePercent = Math.round((usedMem / totalMem) * 100);

    const telemetry = {
      status: 'ONLINE',
      platform: os.platform(),
      hostname: os.hostname(),
      cpuModel: os.cpus()[0]?.model || 'Processor',
      cpuCores: os.cpus().length,
      cpuUsage: getCpuUsage(),
      totalRamGb: totalMem,
      usedRamGb: usedMem,
      ramUsagePercent: memUsagePercent,
      uptimeSeconds: Math.round(os.uptime()),
      battery: cachedBattery
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(telemetry));
    return;
  }

  // 2. Action Execution Endpoint
  if (req.method === 'POST' && req.url === '/execute') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const { action, target } = payload;

        // Action: Open Application (e.g. Telegram)
        if (action === 'OPEN_APP') {
          const appKey = (target || '').toLowerCase().trim();
          const command = APP_LAUNCH_MAP[appKey] || `start ${target}`;

          exec(command, { shell: 'powershell.exe' }, (err) => {
            if (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: err.message }));
            } else {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, message: `${target} ishga tushirildi` }));
            }
          });
          return;
        }

        // Action: Take Screenshot
        if (action === 'SCREENSHOT') {
          try {
            const result = await takeScreenshot();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'Skrinshot olindi', file: result }));
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
          return;
        }

        // Action: Volume Control (Up / Down / Mute)
        if (action === 'VOLUME_UP') {
          exec("powershell -NoProfile -Command \"$w = New-Object -ComObject WScript.Shell; 1..5 | ForEach-Object { $w.SendKeys([char]175) }\"", (err) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: !err, message: 'Ovoz balandlatildi' }));
          });
          return;
        }

        if (action === 'VOLUME_DOWN') {
          exec("powershell -NoProfile -Command \"$w = New-Object -ComObject WScript.Shell; 1..5 | ForEach-Object { $w.SendKeys([char]174) }\"", (err) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: !err, message: 'Ovoz pasaytirildi' }));
          });
          return;
        }

        if (action === 'VOLUME_MUTE') {
          exec("powershell -NoProfile -Command \"$w = New-Object -ComObject WScript.Shell; $w.SendKeys([char]173)\"", (err) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: !err, message: 'Ovoz holati o\'zgartirildi' }));
          });
          return;
        }

        // Action: Screen Brightness
        if (action === 'BRIGHTNESS_UP') {
          exec("powershell -NoProfile -Command \"(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1, 90)\"", () => { });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Ekran yorqinligi oshirildi' }));
          return;
        }

        if (action === 'BRIGHTNESS_DOWN') {
          exec("powershell -NoProfile -Command \"(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods).WmiSetBrightness(1, 40)\"", () => { });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Ekran yorqinligi pasaytirildi' }));
          return;
        }

        // Action: Windows Native Notification
        if (action === 'SHOW_TOAST') {
          const title = (target || 'J.A.R.V.I.S. // Simora xonim').replace(/"/g, '\\"');
          const msg = ((payload.value && payload.value.message) || 'Yangi bildirishnoma').replace(/"/g, '\\"');
          const psNotify = `
            Add-Type -AssemblyName System.Windows.Forms;
            $notify = New-Object System.Windows.Forms.NotifyIcon;
            $notify.Icon = [System.Drawing.SystemIcons]::Information;
            $notify.Visible = $true;
            $notify.ShowBalloonTip(4000, "${title}", "${msg}", [System.Windows.Forms.ToolTipIcon]::Info);
          `;
          exec(`powershell -NoProfile -Command "${psNotify.replace(/\r?\n/g, ' ')}"`, () => { });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Xabarnoma yuborildi' }));
          return;
        }

        // Action: Lock Workstation
        if (action === 'LOCK_PC') {
          exec('rundll32.exe user32.dll,LockWorkStation', (err) => {
            if (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: err.message }));
            } else {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, message: 'Kompyuter qulflandi' }));
            }
          });
          return;
        }

        // Action: Open Specific Folder
        if (action === 'OPEN_FOLDER') {
          const folderPath = target || path.join(os.homedir(), 'OneDrive', 'Desktop');
          exec(`explorer.exe "${folderPath}"`, (err) => {
            if (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: err.message }));
            } else {
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, message: 'Papka ochildi' }));
            }
          });
          return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: `Unknown action: ${action}` }));
      } catch (parseErr) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Invalid JSON body' }));
      }
    });
    return;
  }

  // 3. Supabase Cloud Sync: GET Tasks
  if (req.method === 'GET' && req.url === '/supabase/tasks') {
    if (!pgPool) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Supabase pool not ready' }));
      return;
    }
    try {
      const result = await pgPool.query(`
        SELECT id, text, category, completed, time_str as "timeStr", created_at as "timestamp"
        FROM public.jarvis_tasks
        ORDER BY created_at ASC
      `);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, tasks: result.rows }));
    } catch (dbErr) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: dbErr.message }));
    }
    return;
  }

  // 4. Supabase Cloud Sync: UPSERT Task
  if (req.method === 'POST' && req.url === '/supabase/tasks') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
      try {
        const item = JSON.parse(body || '{}');
        if (!item.id || !item.text) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing id or text' }));
          return;
        }
        await pgPool.query(`
          INSERT INTO public.jarvis_tasks (id, text, category, completed, time_str, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
          ON CONFLICT (id) DO UPDATE
          SET text = EXCLUDED.text,
              category = EXCLUDED.category,
              completed = EXCLUDED.completed,
              time_str = EXCLUDED.time_str,
              updated_at = NOW()
        `, [item.id, item.text, item.category || 'TASK', item.completed || false, item.timeStr || '']);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 5. Supabase Cloud Sync: TOGGLE Task
  if (req.method === 'POST' && req.url === '/supabase/tasks/toggle') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
      try {
        const { id } = JSON.parse(body || '{}');
        await pgPool.query(`
          UPDATE public.jarvis_tasks
          SET completed = NOT completed, updated_at = NOW()
          WHERE id = $1
        `, [id]);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 6. Supabase Cloud Sync: DELETE Task
  if (req.method === 'POST' && req.url === '/supabase/tasks/delete') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
      try {
        const { id } = JSON.parse(body || '{}');
        await pgPool.query(`DELETE FROM public.jarvis_tasks WHERE id = $1`, [id]);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // 7. High-Fidelity Uzbek Neural Speech Synthesis (Edge TTS)
  if (req.method === 'GET' && req.url.startsWith('/tts')) {
    const urlObj = new URL(req.url, 'http://127.0.0.1:4321');
    const text = urlObj.searchParams.get('text');
    const voice = urlObj.searchParams.get('voice') || 'uz-UZ-SardorNeural';

    if (!text || !text.trim()) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Text parameter required' }));
      return;
    }

    try {
      const { EdgeTTS } = require('node-edge-tts');
      const tts = new EdgeTTS({
        voice,
        lang: 'uz-UZ',
        outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
      });

      const tempFile = path.join(os.tmpdir(), `jarvis_tts_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`);
      await tts.ttsPromise(text.trim(), tempFile);

      if (fs.existsSync(tempFile)) {
        const stat = fs.statSync(tempFile);
        res.writeHead(200, {
          'Content-Type': 'audio/mpeg',
          'Content-Length': stat.size,
          'Cache-Control': 'no-cache'
        });
        const readStream = fs.createReadStream(tempFile);
        readStream.pipe(res);
        readStream.on('close', () => {
          try { fs.unlinkSync(tempFile); } catch {}
        });
        return;
      } else {
        throw new Error('TTS fayl yaratilmadi');
      }
    } catch (ttsErr) {
      console.error('[TTS ERROR]', ttsErr.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: ttsErr.message }));
      return;
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('JARVIS Desktop Bridge 1.0 Online');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[JARVIS DESKTOP BRIDGE] Running on http://127.0.0.1:${PORT}`);
  console.log(`[JARVIS DESKTOP BRIDGE] Ready to execute native Windows tasks.`);
});

