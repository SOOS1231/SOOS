const axios = require("axios");
const https = require("https");
const express = require("express");
const fetch = require("node-fetch");
const app = express();

const email = "SOOS1412123@gmail.com";
const password = "SOOS";
const commentText = "انمي حْرا .";

// إعدادات التحكم
const maxCommentsPerAnime = 75;
const commentsPerMinute = 60;
const delay = (60 / commentsPerMinute) * 1000;
const parallelAnimeCount = 3;

// 📝 قائمة الأنميات مع الاسم وحالة التفعيل
const animeTargets = {
  532:    { active: true, name: "One Piece" },
  11708:  { active: true, name: "Ninja to Koroshiya no" },
  11547:  { active: true, name: "Kimi to Boku no Saigo no" },
  11707:  { active: true, name: "Apocalypse Hotel" },
  11723:  { active: true, name: "Kidou Senshi Gundam" },
  11706:  { active: true, name: "Shiunji-ke no Kodomotachi" },
  11673:  { active: true, name: "Kijin Gentoushou" },
  11704:  { active: true, name: "Compass 2.0: Sentou" },
  11703:  { active: true, name: "Vigilante: Boku no Hero" },
  11702:  { active: true, name: "Summer Pockets" },
  11700:  { active: true, name: "Aharen-san wa Hakarenai" },
  11705:  { active: true, name: "Lazarus" },
  11699:  { active: true, name: "Maebashi Witches" },
  11698:  { active: true, name: "Gorilla no kami kara kago" },
  11694:  { active: true, name: "Shin Samurai-den Yaiba" },
  11697:  { active: true, name: "Witch Watch" },
  11721:  { active: true, name: "The All-devouring whale" },
  11718:  { active: true, name: "Ore wa Seikan Kokka no" },
  11693:  { active: true, name: "Shoushimin Series 2nd" },
  11692:  { active: true, name: "Classic*Stars" },
  11663:  { active: true, name: "A-Rank Party wo" },
  11710:  { active: true, name: "Hibi wa Sugiredo Meshi" },
  11711:  { active: true, name: "Mono" },
  11691:  { active: true, name: "Kuroshitsuji: Midori no Majo" },
  11689:  { active: true, name: "Katainaka no Ossan Kensei" },
  653:    { active: true, name: "Detective Conan" },
  11686:  { active: true, name: "Anne shirley" },
  11688:  { active: true, name: "Slime Taoshite 300-nen" },
  11684:  { active: true, name: "Nazotoki wa Dinner no Ato d" },
  11712:  { active: true, name: "Chuuzenji-sensei Mononoke" },
  11715:  { active: true, name: "Teogonia" },
  11658:  { active: true, name: "Kusuriya no Hitorigoto 2nd" },
  11725:  { active: true, name: "Lord of Mysteries" },
  11726:  { active: true, name: "Koujo Denka no Kateikyoushi" }
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
  const name = animeTargets[animeId]?.name || "Unknown";
  console.log(`🚀 بدء إرسال ${maxCommentsPerAnime} تعليق إلى: [${animeId}] ${name}`);
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
  const activeAnimeIds = Object.keys(animeTargets).filter(id => animeTargets[id].active);
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

    console.log(`🔄 إرسال إلى ${batch.length} أنمي: ${batch.join(", ")}`);
    await Promise.all(batch.map(id => sendCommentsToAnime(id)));

    index += parallelAnimeCount;
    if (index >= activeAnimeIds.length) {
      index = 0;
    }
  }
}

startLoop();

// 🟢 صفحة الحالة والتحكم
app.get("/", (req, res) => {
  const activeList = Object.entries(animeTargets)
    .map(([id, info]) => `🔸 [${id}] ${info.name} — ${info.active ? "✅ مفعّل" : "❌ معطّل"}`)
    .join("<br>");

  res.send(`
    <h2>🤖 البوت ${botActive ? "✅ يعمل" : "🛑 متوقف"}</h2>
    <p>🔁 السرعة: ${commentsPerMinute} تعليق/دقيقة | 🧩 عدد الأنميات في اللحظة: ${parallelAnimeCount}</p>
    <form action="/start"><button>تشغيل البوت</button></form>
    <form action="/stop"><button>إيقاف البوت</button></form>
    <hr>
    <h4>📺 الأنميات:</h4>
    ${activeList}
  `);
});

app.get("/start", (req, res) => {
  botActive = true;
  res.redirect("/");
});

app.get("/stop", (req, res) => {
  botActive = false;
  res.redirect("/");
});

// 🔁 إبقاء الخدمة حية
const KEEP_ALIVE_URL = "https://soos.onrender.com/";
setInterval(() => {
  fetch(KEEP_ALIVE_URL)
    .then(() => console.log("🔁 Keep-alive ping sent"))
    .catch(err => console.error("⚠️ Keep-alive ping failed:", err.message));
}, 5 * 60 * 1000);

// 🚪 تشغيل الخادم
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🌐 Web server running on port ${PORT}`);
});
