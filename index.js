
const axios = require("axios");
const https = require("https");
const express = require("express");
const fetch = require("node-fetch");
const app = express();

const email = "GOOG1412123@gmail.com";
const password = "GOOG";
const commentText = "انمي حْرا .";

// ✳️ عدد التعليقات لكل أنمي قبل الانتقال للثاني
const maxCommentsPerAnime = 75;

// ✅ عدد التعليقات في الدقيقة
const commentsPerMinute = 60;
const delay = (60 / commentsPerMinute) * 1000;

// ✴️ عدد الأنميات التي يتم الإرسال لها في نفس اللحظة
const parallelAnimeCount = 3;

const animeTargets = {
  532: true,
  11708: true,
  11547: true,
  11707: true,
  11723: true,
  11706: true,
  11673: true,
  11704: true,
  11703: true,
  11702: true,
  11700: true,
  11705: true,
  11699: true,
  11698: true,
  11694: true,
  11697: true,
  11721: true,
  11718: true,
  11693: true,
  11692: true,
  11663: true,
  11710: true,
  11711: true,
  11691: true,
  11689: true,
  653: true,
  11686: true,
  11688: true,
  11684: true,
  11712: true,
  11715: true,
  11658: true,
  11725: true,
  11726: true,
};

const headers = {
  "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_8_3 like Mac OS X)",
  "Content-Type": "application/x-www-form-urlencoded",
  "Origin": "https://ios.sanime.net",
  "Referer": "https://ios.sanime.net/",
  "Accept": "*/*",
  "Accept-Encoding": "gzip, deflate, br",
  "Connection": "keep-alive",
  "Accept-Language": "ar"
};

const agent = new https.Agent({ keepAlive: true });

let botActive = true;

function sendComment(animeId) {
  const itemData = {
    post: commentText,
    id: animeId,
    fire: false
  };
  const itemBase64 = Buffer.from(JSON.stringify(itemData)).toString("base64");
  const payload = new URLSearchParams({
    email,
    password,
    item: itemBase64
  });

  return axios.post(
    "https://app.sanime.net/function/h10.php?page=addcmd",
    payload.toString(),
    { headers, httpsAgent: agent }
  );
}

async function sendCommentsToAnime(animeId) {
  console.log(`🚀 بدء إرسال ${maxCommentsPerAnime} تعليق إلى الأنمي: ${animeId}`);

  for (let i = 1; i <= maxCommentsPerAnime; i++) {
    if (!botActive) break;

    try {
      await sendComment(animeId);
      console.log(`✅ [${animeId}] تعليق رقم ${i}`);
    } catch (err) {
      console.error(`❌ [${animeId}] خطأ:`, err.message);
    }

    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

async function startLoop() {
  const activeAnimeIds = Object.keys(animeTargets).filter(id => animeTargets[id]);
  let index = 0;

  while (true) {
    if (!botActive) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      continue;
    }

    const batch = activeAnimeIds.slice(index, index + parallelAnimeCount);

    if (batch.length === 0) {
      index = 0;
      continue;
    }

    console.log(`🔄 إرسال إلى ${batch.length} أنمي دفعة واحدة: ${batch.join(", ")}`);

    await Promise.all(batch.map(id => sendCommentsToAnime(id)));

    index += parallelAnimeCount;
    if (index >= activeAnimeIds.length) {
      index = 0;
    }
  }
}

startLoop();

// 🟢 صفحة رئيسية
app.get("/", (req, res) => {
  res.send("🤖 Bot is running...");
});

// 🔘 إيقاف مؤقت
app.get("/stop", (req, res) => {
  botActive = false;
  res.send("🛑 Bot has been stopped.");
});

// 🔘 إعادة التشغيل
app.get("/start", (req, res) => {
  botActive = true;
  res.send("✅ Bot has been started.");
});

// 🔁 إبقاء الخدمة حية
const KEEP_ALIVE_URL = "https://auto-comment-5g7d.onrender.com/";

setInterval(() => {
  fetch(KEEP_ALIVE_URL)
    .then(() => console.log("🔁 Keep-alive ping sent"))
    .catch(err => console.error("⚠️ Keep-alive ping failed:", err.message));
}, 5 * 60 * 1000);

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🌐 Web server running on port ${PORT}`);
});
