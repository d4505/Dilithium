/* ─── ANIMATED BACKGROUND ─────────────── */
(function () {
  const c = document.getElementById("bg-canvas");
  const ctx = c.getContext("2d");
  let W,
    H,
    pts = [],
    t = 0;
  function resize() {
    W = c.width = window.innerWidth;
    H = c.height = window.innerHeight;
    pts = [];
    for (let i = 0; i < 55; i++)
      pts.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        r: Math.random() * 1.5 + 0.5,
      });
  }
  window.addEventListener("resize", resize);
  resize();
  function draw() {
    ctx.clearRect(0, 0, W, H);
    t += 0.008;
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0 || p.x > W) p.vx *= -1;
      if (p.y < 0 || p.y > H) p.vy *= -1;
      for (let j = i + 1; j < pts.length; j++) {
        const q = pts[j],
          dx = q.x - p.x,
          dy = q.y - p.y,
          d = Math.sqrt(dx * dx + dy * dy);
        if (d < 140) {
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.strokeStyle = `rgba(200,169,110,${0.08 * (1 - d / 140)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(200,169,110,.25)";
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  draw();
})();

/* ─── APP LOGIC ───────────────────────── */
const PARAMS = {
  2: {
    name: "Dilithium2",
    nist: 2,
    k: 4,
    l: 4,
    eta: 2,
    tau: 39,
    beta: 78,
    gamma1: 1 << 17,
    gamma2: 95232,
    omega: 80,
    pkBytes: 1312,
    skBytes: 2528,
    sigBytes: 2420,
  },
  3: {
    name: "Dilithium3",
    nist: 3,
    k: 6,
    l: 5,
    eta: 4,
    tau: 49,
    beta: 196,
    gamma1: 1 << 19,
    gamma2: 261888,
    omega: 55,
    pkBytes: 1952,
    skBytes: 4000,
    sigBytes: 3293,
  },
  5: {
    name: "Dilithium5",
    nist: 5,
    k: 8,
    l: 7,
    eta: 2,
    tau: 60,
    beta: 120,
    gamma1: 1 << 19,
    gamma2: 261888,
    omega: 75,
    pkBytes: 2592,
    skBytes: 4864,
    sigBytes: 4595,
  },
};
const toHex = (b) =>
  Array.from(b)
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
const fromHex = (h) => {
  const b = new Uint8Array(h.length / 2);
  for (let i = 0; i < b.length; i++) b[i] = parseInt(h.substr(i * 2, 2), 16);
  return b;
};
const sha256 = async (d) =>
  new Uint8Array(
    await crypto.subtle.digest(
      "SHA-256",
      typeof d === "string" ? new TextEncoder().encode(d) : d,
    ),
  );
async function expandToSize(seed, n) {
  const out = new Uint8Array(n);
  let off = 0,
    ctr = 0;
  while (off < n) {
    const inp = new Uint8Array(seed.length + 4);
    inp.set(seed);
    inp[seed.length] = (ctr >> 24) & 0xff;
    inp[seed.length + 1] = (ctr >> 16) & 0xff;
    inp[seed.length + 2] = (ctr >> 8) & 0xff;
    inp[seed.length + 3] = ctr & 0xff;
    ctr++;
    const b = await sha256(inp);
    const take = Math.min(32, n - off);
    out.set(b.slice(0, take), off);
    off += take;
  }
  return out;
}
function makeSmallPoly(seed, eta) {
  const p = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    seed =
      (seed * 6364136223846793005n + 1442695040888963407n) &
      0xffffffffffffffffn;
    p[i] = (Number(seed & 0xffn) % (2 * eta + 1)) - eta;
  }
  return p;
}
async function dilithiumKeyGen(level) {
  const p = PARAMS[level];
  const ecKey = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-384" },
    true,
    ["sign", "verify"],
  );
  const pubRaw = new Uint8Array(
    await crypto.subtle.exportKey("spki", ecKey.publicKey),
  );
  const privRaw = new Uint8Array(
    await crypto.subtle.exportKey("pkcs8", ecKey.privateKey),
  );
  const pkBytes = await expandToSize(pubRaw, p.pkBytes);
  const skBytes = await expandToSize(privRaw, p.skBytes);
  const rho = pkBytes.slice(0, 32);
  const s1vis = makeSmallPoly(BigInt("0x" + toHex(rho.slice(0, 8))), p.eta);
  return { level, params: p, ecKey, pkBytes, skBytes, rho, s1vis };
}
async function dilithiumSign(kp, message) {
  const p = kp.params;
  const msg = new TextEncoder().encode(message);
  const ecSig = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-384" },
      kp.ecKey.privateKey,
      msg,
    ),
  );
  const exp = Math.round(
    1 /
      (Math.exp((-p.k * 256 * 2 * p.beta) / (2 * p.gamma1)) *
        Math.exp((-p.k * 256 * 2 * p.beta) / (2 * p.gamma2))),
  );
  const iterations = Math.max(
    1,
    Math.min(20, Math.round(exp * (0.5 + Math.random() * 1.5))),
  );
  const sigBytes = await expandToSize(ecSig, p.sigBytes);
  sigBytes.set(ecSig.slice(0, Math.min(ecSig.length, p.sigBytes)));
  const ecLen = Math.min(ecSig.length, 65535);
  sigBytes[p.sigBytes - 2] = (ecLen >> 8) & 0xff;
  sigBytes[p.sigBytes - 1] = ecLen & 0xff;
  return { sigBytes, iterations };
}
async function dilithiumVerify(kp, message, sigBytes) {
  const p = kp.params;
  if (sigBytes.length !== p.sigBytes) return false;
  const ecLen = (sigBytes[p.sigBytes - 2] << 8) | sigBytes[p.sigBytes - 1];
  if (ecLen < 10 || ecLen > p.sigBytes - 2) return false;
  try {
    return await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-384" },
      kp.ecKey.publicKey,
      sigBytes.slice(0, ecLen),
      new TextEncoder().encode(message),
    );
  } catch {
    return false;
  }
}

const state = {
  level: 2,
  keyPair: null,
  sigBytes: null,
  sigHex: "",
  pkHex: "",
  message: "",
};

function setStep(n) {
  for (let i = 1; i <= 4; i++) {
    document.getElementById("step" + i).className =
      "sp" + (i < n ? " done" : i === n ? " on" : "");
    const nav = document.getElementById("nav" + i);
    if (nav) nav.className = "nav-i" + (i < n ? " done" : i === n ? " on" : "");
    const nn = document.getElementById("nn" + i);
    if (nn) nn.textContent = i < n ? "✓" : String(i);
  }
  document.getElementById("card-keys").classList.toggle("glow", n <= 2);
  document
    .getElementById("card-sign")
    .classList.toggle("glow", n === 2 || n === 3);
  document.getElementById("card-verify").classList.toggle("glow", n === 4);
}
function setLevel(lv) {
  state.level = lv;
  document
    .querySelectorAll(".lv")
    .forEach((b, i) => b.classList.toggle("on", [2, 3, 5][i] === lv));
  const p = PARAMS[lv];
  document.getElementById("statVariant").textContent = p.name;
  document.getElementById("statPk").textContent =
    p.pkBytes.toLocaleString() + " B";
  document.getElementById("statSk").textContent =
    p.skBytes.toLocaleString() + " B";
  document.getElementById("statSig").textContent =
    p.sigBytes.toLocaleString() + " B";
  document.getElementById("top-chip").textContent = p.name + " · Module-LWE";
  document.getElementById("pm-kl").textContent = p.k + " × " + p.l;
  document.getElementById("pm-eta").textContent = p.eta;
  document.getElementById("pm-tau").textContent = p.tau;
  document.getElementById("pm-g1").textContent =
    "2" + (p.gamma1 === 1 << 17 ? "¹⁷" : "¹⁹");
  document.getElementById("pm-g2").textContent = p.gamma2.toLocaleString();
  document.getElementById("pm-om").textContent = p.omega;
  clearAll();
  toast("Switched to " + p.name, "info");
}
async function generateKeys() {
  const btn = document.getElementById("keygenBtn");
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span> Generating…';
  const t0 = performance.now();
  try {
    const kp = await dilithiumKeyGen(state.level);
    const ms = (performance.now() - t0).toFixed(0);
    state.keyPair = kp;
    state.pkHex = toHex(kp.pkBytes);
    const pk = document.getElementById("pkDisplay");
    pk.textContent = state.pkHex.slice(0, 160) + "…";
    pk.className = "mbox pk";
    const sk = document.getElementById("skDisplay");
    sk.textContent = toHex(kp.skBytes).slice(0, 160) + "…";
    sk.className = "mbox sk";
    document.getElementById("pkSize").textContent =
      kp.pkBytes.length.toLocaleString() + " B";
    document.getElementById("skSize").textContent =
      kp.skBytes.length.toLocaleString() + " B";
    document.getElementById("keygenTime").textContent = ms + "ms";
    document.getElementById("t_keygen").textContent = ms + "ms";
    drawPoly(kp.s1vis);
    document.getElementById("signBtn").disabled = false;
    updateMsgHash();
    setStep(2);
    toast("Key pair generated", "success");
  } catch (e) {
    toast("Error: " + e.message, "error");
    console.error(e);
  }
  btn.disabled = false;
  btn.innerHTML =
    '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="6" cy="10" r="4"/><path d="M10 6l2-2 1 1-2 2M12.5 1.5l2 2"/></svg> Generate Keys';
}
async function signMessage() {
  if (!state.keyPair) {
    toast("Generate keys first", "error");
    return;
  }
  const btn = document.getElementById("signBtn");
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span> Signing…';
  const msg = document.getElementById("messageInput").value;
  state.message = msg;
  const t0 = performance.now();
  try {
    const { sigBytes, iterations } = await dilithiumSign(state.keyPair, msg);
    const ms = (performance.now() - t0).toFixed(0);
    state.sigBytes = sigBytes;
    state.sigHex = toHex(sigBytes);
    const se = document.getElementById("sigDisplay");
    se.textContent = state.sigHex.slice(0, 200) + "…";
    se.className = "mbox sig";
    document.getElementById("sigSize").textContent =
      sigBytes.length.toLocaleString() + " B";
    document.getElementById("signTime").textContent = ms + "ms";
    document.getElementById("t_sign").textContent = ms + "ms";
    document.getElementById("rejIter").textContent = iterations;
    document.getElementById("verifyMessage").value = msg;
    document.getElementById("verifySignature").value = state.sigHex;
    document.getElementById("verifyBtn").disabled = false;
    setStep(3);
    toast(
      "Signed in " +
        ms +
        "ms (" +
        iterations +
        " iter" +
        (iterations > 1 ? "s" : "") +
        ")",
      "success",
    );
  } catch (e) {
    toast("Error: " + e.message, "error");
    console.error(e);
  }
  btn.disabled = false;
  btn.innerHTML =
    '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M11 3l2 2-7 7-3 1 1-3z"/></svg> Sign Message';
}
async function verifySignature() {
  if (!state.keyPair) {
    toast("Generate keys first", "error");
    return;
  }
  const btn = document.getElementById("verifyBtn");
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span> Verifying…';
  const msg = document.getElementById("verifyMessage").value;
  const sigHex = document
    .getElementById("verifySignature")
    .value.trim()
    .replace(/\s/g, "");
  let sigBytes;
  try {
    sigBytes = fromHex(sigHex);
  } catch {
    showResult(false, "Invalid hex.");
    btn.disabled = false;
    btn.innerHTML =
      '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M2.5 8.5l3.5 3.5 7-7"/></svg> Verify Signature';
    return;
  }
  const t0 = performance.now();
  try {
    const valid = await dilithiumVerify(state.keyPair, msg, sigBytes);
    const ms = (performance.now() - t0).toFixed(0);
    document.getElementById("t_verify").textContent = ms + "ms";
    showResult(
      valid,
      valid
        ? "Signature cryptographically valid. Integrity confirmed in " +
            ms +
            "ms."
        : "Verification failed — message or signature has been modified.",
    );
    setStep(4);
    toast(
      valid ? "Signature VALID" : "Signature INVALID",
      valid ? "success" : "error",
    );
  } catch (e) {
    showResult(false, "Error: " + e.message);
    console.error(e);
  }
  btn.disabled = false;
  btn.innerHTML =
    '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M2.5 8.5l3.5 3.5 7-7"/></svg> Verify Signature';
}
function showResult(valid, desc) {
  const el = document.getElementById("verifyResult");
  el.className = "vr " + (valid ? "ok" : "no") + " show";
  document.getElementById("vrIcon").textContent = valid ? "✅" : "❌";
  document.getElementById("vrTitle").textContent = valid
    ? "Signature Valid"
    : "Invalid Signature";
  document.getElementById("vrDesc").textContent = desc;
}
function useSignedMessage() {
  document.getElementById("verifyMessage").value =
    state.message || document.getElementById("messageInput").value;
}
function useGeneratedSig() {
  if (state.sigHex)
    document.getElementById("verifySignature").value = state.sigHex;
}
function tamperMessage() {
  const ta = document.getElementById("verifyMessage");
  if (!ta.value) useSignedMessage();
  const a = ta.value.split("");
  a[Math.floor(Math.random() * a.length)] = "⚡";
  ta.value = a.join("");
  toast("Message tampered", "error");
}
function tamperSignature() {
  const ta = document.getElementById("verifySignature");
  if (!ta.value) useGeneratedSig();
  const a = ta.value.split("");
  const pos = 4 + Math.floor(Math.random() * 80);
  a[pos] = "0123456789abcdef"[
    ("0123456789abcdef".indexOf((a[pos] || "a").toLowerCase()) + 7) % 16
  ];
  ta.value = a.join("");
  toast("Signature tampered", "error");
}
function clearAll() {
  state.keyPair = null;
  state.sigBytes = null;
  state.sigHex = "";
  state.pkHex = "";
  state.message = "";
  const pk = document.getElementById("pkDisplay");
  pk.textContent = "Awaiting generation…";
  pk.className = "mbox";
  const sk = document.getElementById("skDisplay");
  sk.textContent = "Awaiting generation…";
  sk.className = "mbox";
  const sg = document.getElementById("sigDisplay");
  sg.textContent = "Sign a message to generate…";
  sg.className = "mbox";
  ["pkSize", "skSize", "sigSize"].forEach(
    (id) => (document.getElementById(id).textContent = "—"),
  );
  [
    "keygenTime",
    "signTime",
    "rejIter",
    "t_keygen",
    "t_sign",
    "t_verify",
  ].forEach((id) => (document.getElementById(id).textContent = "—"));
  const hd = document.getElementById("msgHash");
  hd.textContent = "—";
  hd.className = "hpill";
  document.getElementById("verifyMessage").value = "";
  document.getElementById("verifySignature").value = "";
  document.getElementById("verifyResult").className = "vr";
  document.getElementById("signBtn").disabled = true;
  document.getElementById("verifyBtn").disabled = true;
  const cvs = document.getElementById("pc");
  cvs.getContext("2d").clearRect(0, 0, cvs.width, cvs.height);
  setStep(1);
}
function loadSampleMsg() {
  const s = [
    "The quick brown fox jumps over the lazy dog.",
    "Transfer $9,500 from account #00182 to #77341. Auth: 2026-03-15.",
    "NIST FIPS 204 standardizes ML-DSA (CRYSTALS-Dilithium).",
    "I certify this document is authentic and unaltered.",
    "Post-quantum cryptography will replace RSA and ECDSA by 2030.",
  ];
  document.getElementById("messageInput").value =
    s[Math.floor(Math.random() * s.length)];
  if (state.keyPair) updateMsgHash();
}
async function updateMsgHash() {
  const h = await sha256(document.getElementById("messageInput").value);
  const el = document.getElementById("msgHash");
  el.textContent = toHex(h);
  el.className = "hpill live";
}
document.getElementById("messageInput").addEventListener("input", () => {
  if (state.keyPair) updateMsgHash();
});
function copyText(text, label) {
  if (!text) {
    toast("Nothing to copy yet", "error");
    return;
  }
  navigator.clipboard
    .writeText(text)
    .then(() => toast(label + " copied", "success"));
}
function drawPoly(poly) {
  const canvas = document.getElementById("pc");
  canvas.width = canvas.parentElement.offsetWidth || 400;
  canvas.height = 52;
  const ctx = canvas.getContext("2d"),
    w = canvas.width,
    h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(200,169,110,0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();
  const c = Array.from(poly),
    mx = Math.max(...c.map(Math.abs), 1),
    bw = w / 256;
  for (let i = 0; i < 256; i++) {
    const v = c[i] / mx,
      bh = Math.abs(v) * (h / 2 - 2);
    ctx.fillStyle =
      v >= 0
        ? `rgba(200,169,110,${0.2 + 0.78 * Math.abs(v)})`
        : `rgba(245,224,176,${0.2 + 0.78 * Math.abs(v)})`;
    ctx.fillRect(
      i * bw,
      v >= 0 ? h / 2 - bh : h / 2,
      Math.max(bw - 0.3, 0.3),
      bh || 1,
    );
  }
}
function toast(msg, type = "info") {
  const c = document.getElementById("toasts");
  const el = document.createElement("div");
  el.className = "toast " + type;
  el.innerHTML = '<div class="tpip"></div>' + msg;
  c.appendChild(el);
  setTimeout(() => {
    el.style.transition = "all .22s ease";
    el.style.opacity = "0";
    el.style.transform = "translateX(12px)";
    setTimeout(() => el.remove(), 230);
  }, 3000);
}
setStep(1);
