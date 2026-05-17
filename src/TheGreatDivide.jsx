import { useState, useEffect, useRef } from "react";
import Q from "../tgd-questions.json";

// ─── Constants ───────────────────────────────────────────────────────────────

const PROXY_URL = "https://tgd-proxy.sebastiancabello.workers.dev";
const KOFI_URL  = "https://ko-fi.com/thegreatdivide";
const SITE_URL  = "https://thegreatdivide.xyz";

const BIAS_META = {
  DEM:  { label: "Democrat",     color: "#1A56DB", desc: "You lean on government to protect the vulnerable and provide opportunity for all." },
  PROG: { label: "Progressive",  color: "#7C3AED", desc: "You believe the system is rigged and needs fundamental change, not just reform." },
  CON:  { label: "Conservative", color: "#E02424", desc: "You value individual freedom, limited government, and fiscal responsibility." },
  LIB:  { label: "Libertarian",  color: "#D97706", desc: "You want government out of both your wallet and your personal life." },
  POP:  { label: "Populist",     color: "#B45309", desc: "You're fed up with the elite and want power returned to ordinary Americans." },
  NEU:  { label: "Neutral",      color: "#64748B", desc: "You weigh each issue on its own merits — both sides have a point, sometimes." },
};

const LEFT_BIASES  = ["DEM", "PROG"];
const RIGHT_BIASES = ["CON", "LIB", "POP"];

const ARCHETYPES = [
  { min: 0,  max: 14,  label: "The Progressive Firebrand",  color: "#1A56DB", avatar: "/avatar-tgd-far-left.webp",    desc: "Social justice, systemic change, and bold progressive policy are your north star. You believe the status quo fails ordinary people." },
  { min: 15, max: 29,  label: "The Liberal Democrat",        color: "#3B82F6", avatar: "/avatar-tgd-left.webp",        desc: "You're solidly liberal. You trust government to solve big problems and you vote blue without much hesitation." },
  { min: 30, max: 44,  label: "The Center-Left Pragmatist",  color: "#14B8A6", avatar: "/avatar-tgd-center-left.webp", desc: "You lean left but you're practical. You want progress — just not overnight, and not at any cost." },
  { min: 45, max: 55,  label: "The Independent",             color: "#F59E0B", avatar: "/avatar-tgd-neutral.webp",     desc: "You don't fit neatly in a box. You pick and choose your positions, frustrating both sides equally." },
  { min: 56, max: 70,  label: "The Center-Right Moderate",   color: "#F97316", avatar: "/avatar-tgd-center-right.webp",desc: "You lean right but you're not extreme. Fiscal responsibility and personal freedom are core to your worldview." },
  { min: 71, max: 85,  label: "The Conservative",            color: "#EF4444", avatar: "/avatar-tgd-right.webp",       desc: "You're firmly on the right. Traditional values, limited government, and free markets define your politics." },
  { min: 86, max: 100, label: "The MAGA Loyalist",           color: "#B91C1C", avatar: "/avatar-tgd-far-right.webp",  desc: "You're all-in on the populist right. You distrust institutions, love America loud, and don't apologize for it." },
];

const TIPS = [
  "There are no right answers in Part B. We reveal your bias, not judge you.",
  "Your political bias shows in how you interpret facts, not just what you believe.",
  "Most Americans hold positions from multiple political traditions.",
  "Part B is about how you frame the issue, not whether you're right or wrong.",
  "Your archetype is a snapshot — bias changes based on the topic.",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pickQuestions() {
  const TOTAL   = 15;
  const TARGETS = { DEM: 3, PROG: 2, CON: 3, LIB: 2, POP: 2, NEU: 3 };
  const shuffled = [...Q].sort(() => Math.random() - 0.5);
  const counts   = { DEM: 0, PROG: 0, CON: 0, LIB: 0, POP: 0, NEU: 0 };
  const picked   = [];
  const usedIds  = new Set();
  for (const q of shuffled) {
    if (picked.length >= TOTAL) break;
    const uniq   = [...new Set(q.B.bias)];
    const useful = uniq.some(b => (counts[b] ?? 0) < (TARGETS[b] ?? 2));
    if (useful) { picked.push(q); usedIds.add(q.id); uniq.forEach(b => { if (b in counts) counts[b]++; }); }
  }
  for (const q of shuffled) {
    if (picked.length >= TOTAL) break;
    if (!usedIds.has(q.id)) picked.push(q);
  }
  return picked.slice(0, TOTAL).sort(() => Math.random() - 0.5);
}

function calcDivideOMeter(answers) {
  let left = 0, right = 0;
  answers.forEach(({ bPartBias }) => {
    if (LEFT_BIASES.includes(bPartBias))  left++;
    if (RIGHT_BIASES.includes(bPartBias)) right++;
  });
  const total = left + right;
  return total === 0 ? 50 : Math.round((right / total) * 100);
}

function calcStats(answers) {
  let factsCorrect = 0, score = 0;
  answers.forEach(a => {
    if (a.aPartChoice === a.aPartCorrect) { factsCorrect++; score += 15; }
    score += 15;
  });
  return { factsCorrect, biasAnswered: answers.length, score };
}

function getResult(gauge) {
  return ARCHETYPES.find(a => gauge >= a.min && gauge <= a.max) ?? ARCHETYPES[3];
}

function getDirectionLabel(gauge) {
  if (gauge <= 10) return "STRONGLY LEFT LEANING";
  if (gauge <= 29) return "LEFT LEANING";
  if (gauge <= 44) return "SLIGHTLY LEFT LEANING";
  if (gauge <= 55) return "CENTRIST";
  if (gauge <= 70) return "SLIGHTLY RIGHT LEANING";
  if (gauge <= 85) return "RIGHT LEANING";
  return "STRONGLY RIGHT LEANING";
}

function getGaugeSegmentColor(i, total = 40) {
  const t = i / (total - 1);
  let h, s, l;
  if (t < 0.45)      { const tt = t / 0.45;       h = 217 + (174 - 217) * tt; s = 72;               l = 48 + 5 * tt; }
  else if (t < 0.55) { const tt = (t - 0.45) / 0.1; h = 174 + (38 - 174) * tt; s = 72 + 18 * tt;     l = 53 - 5 * tt; }
  else               { const tt = (t - 0.55) / 0.45; h = 38 - 38 * tt;         s = 90 + (68 - 90) * tt; l = 48 - 8 * tt; }
  return `hsl(${Math.round(h)},${Math.round(s)}%,${Math.round(l)}%)`;
}

function trackEvent(name, params = {}) {
  try { if (typeof gtag === "function") gtag("event", name, params); } catch (_) {}
}

async function buildShareCanvas(gauge, result, stats) {
  const W = 1200, H = 630;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  const dirLabel = getDirectionLabel(gauge);

  ctx.fillStyle = "#0F1221";
  ctx.fillRect(0, 0, W, H);

  // Side gradient strips
  const lg = ctx.createLinearGradient(0, 0, W, 0);
  lg.addColorStop(0, "#1A56DB22"); lg.addColorStop(0.5, "transparent"); lg.addColorStop(1, "#B91C1C22");
  ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);

  // Top bar
  const bar = ctx.createLinearGradient(0, 0, W, 0);
  bar.addColorStop(0, "#1A56DB"); bar.addColorStop(0.5, "#F59E0B"); bar.addColorStop(1, "#B91C1C");
  ctx.fillStyle = bar; ctx.fillRect(0, 0, W, 6);

  // "I TOOK THE TEST"
  ctx.fillStyle = "#64748B"; ctx.font = "bold 28px sans-serif"; ctx.textAlign = "center";
  ctx.fillText("I TOOK THE TEST", W / 2, 90);

  // Big percentage
  ctx.fillStyle = result.color; ctx.font = `bold 130px sans-serif`;
  ctx.fillText(`${gauge}%`, W / 2, 250);

  // Direction label
  ctx.fillStyle = "#F8FAFC"; ctx.font = "bold 48px sans-serif";
  ctx.fillText(dirLabel, W / 2, 320);

  // Archetype
  ctx.fillStyle = result.color; ctx.font = "bold 34px sans-serif";
  ctx.fillText(result.label.toUpperCase(), W / 2, 390);

  // Gauge bar
  const bX = 150, bY = 440, bW = W - 300, bH = 24;
  ctx.fillStyle = "#1A1D2E"; ctx.fillRect(bX, bY, bW, bH);
  const bGrad = ctx.createLinearGradient(bX, 0, bX + bW, 0);
  bGrad.addColorStop(0, "#1A56DB"); bGrad.addColorStop(0.45, "#14B8A6");
  bGrad.addColorStop(0.5, "#F59E0B"); bGrad.addColorStop(0.7, "#F97316"); bGrad.addColorStop(1, "#B91C1C");
  ctx.fillStyle = bGrad; ctx.fillRect(bX, bY, bW, bH);
  const nX = bX + (gauge / 100) * bW;
  ctx.fillStyle = "#fff"; ctx.fillRect(nX - 3, bY - 10, 6, bH + 20);

  // Stats
  ctx.fillStyle = "#64748B"; ctx.font = "24px sans-serif";
  ctx.textAlign = "left";  ctx.fillText("← LEFT", bX, bY + bH + 32);
  ctx.textAlign = "right"; ctx.fillText("RIGHT →", bX + bW, bY + bH + 32);

  ctx.fillStyle = "#94A3B8"; ctx.font = "26px sans-serif"; ctx.textAlign = "center";
  ctx.fillText(`Score ${stats.score} pts  •  Facts ${stats.factsCorrect}/15`, W / 2, 555);

  // URL
  ctx.fillStyle = "#F59E0B"; ctx.font = "bold 30px sans-serif";
  ctx.fillText(SITE_URL, W / 2, 600);

  return canvas;
}

// ─── GlobalStyles ─────────────────────────────────────────────────────────────

function GlobalStyles() {
  return (
    <style>{`
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
      html,body{background:#0f1221;color:#f8fafc;font-family:'Inter',sans-serif;min-height:100%;-webkit-tap-highlight-color:transparent}
      #root{min-height:100vh}
      button{cursor:pointer;font-family:inherit;border:none;outline:none}
      img{display:block;max-width:100%}
      a{color:inherit;text-decoration:none}
      input,textarea{font-family:inherit}
      ::-webkit-scrollbar{width:6px}
      ::-webkit-scrollbar-track{background:#0f1221}
      ::-webkit-scrollbar-thumb{background:#2D3154;border-radius:3px}
      @keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
      @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      @keyframes progressBar{from{width:0}to{width:100%}}
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
      .fade-in{animation:fadeIn .3s ease both}
      .fade-up{animation:fadeUp .4s ease both}
    `}</style>
  );
}

// ─── Logo ─────────────────────────────────────────────────────────────────────

function Logo({ height = 44, style = {} }) {
  return (
    <img src="/tgd-logo-primary.webp" alt="The Great Divide"
      style={{ height, width: "auto", display: "block", ...style }} />
  );
}

// ─── DivideOMeterGauge ────────────────────────────────────────────────────────

function DivideOMeterGauge({ gauge, size = 300, showLabel = false }) {
  const cx = 150, cy = 130, R = 118, r = 84, N = 40, GAP = 0.5;
  const result = getResult(gauge);
  const dir    = getDirectionLabel(gauge);

  const segments = Array.from({ length: N }, (_, i) => {
    const s0 = 180 - i * (180 / N) - GAP / 2;
    const e0 = 180 - (i + 1) * (180 / N) + GAP / 2;
    const sr = (s0 * Math.PI) / 180, er = (e0 * Math.PI) / 180;
    const x1o = cx + R * Math.cos(sr), y1o = cy - R * Math.sin(sr);
    const x2o = cx + R * Math.cos(er), y2o = cy - R * Math.sin(er);
    const x2i = cx + r * Math.cos(er), y2i = cy - r * Math.sin(er);
    const x1i = cx + r * Math.cos(sr), y1i = cy - r * Math.sin(sr);
    return {
      d: `M${x1o.toFixed(1)} ${y1o.toFixed(1)} A${R} ${R} 0 0 0 ${x2o.toFixed(1)} ${y2o.toFixed(1)} L${x2i.toFixed(1)} ${y2i.toFixed(1)} A${r} ${r} 0 0 1 ${x1i.toFixed(1)} ${y1i.toFixed(1)}Z`,
      color: getGaugeSegmentColor(i),
    };
  });

  const ndeg = 180 - (gauge / 100) * 180;
  const nrad = (ndeg * Math.PI) / 180;
  const nx = cx + 76 * Math.cos(nrad), ny = cy - 76 * Math.sin(nrad);

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: size, margin: "0 auto" }}>
      <svg viewBox="0 0 300 155" style={{ width: "100%", display: "block" }}>
        {segments.map(({ d, color }, i) => <path key={i} d={d} fill={color} />)}
        <line x1={cx} y1={cy} x2={nx.toFixed(1)} y2={ny.toFixed(1)}
          stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="8" fill="#1A1D2E" stroke="#fff" strokeWidth="2" />
        <circle cx={cx} cy={cy} r="4" fill={result.color} />
        <text x="22"  y="150" fill="#64748B" fontSize="10" fontFamily="'DM Mono',monospace">LEFT</text>
        <text x="278" y="150" fill="#64748B" fontSize="10" fontFamily="'DM Mono',monospace" textAnchor="end">RIGHT</text>
      </svg>
      {showLabel && (
        <div style={{ textAlign: "center", marginTop: -8 }}>
          <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 52, color: result.color, lineHeight: 1 }}>
            {gauge}%
          </div>
          <div style={{ color: "#F8FAFC", fontSize: 15, fontWeight: 600, letterSpacing: 1, marginTop: 4 }}>
            {dir}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ShareSheet ───────────────────────────────────────────────────────────────

function ShareSheet({ gauge, result, stats, onClose }) {
  const [copied,    setCopied]    = useState(false);
  const [generating, setGenerating] = useState(false);
  const mobile = window.innerWidth < 640;
  const dir    = getDirectionLabel(gauge);
  const text   = `I took The Great Divide and scored ${gauge}% — ${dir}. My archetype: ${result.label}. What's yours?`;
  const url    = SITE_URL;
  const full   = `${text} ${url}`;

  const encoded     = encodeURIComponent(full);
  const encodedUrl  = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text + " ");

  async function handleNativeShare() {
    try { await navigator.share({ title: "The Great Divide", text, url }); trackEvent("share_success", { method: "native" }); }
    catch (_) {}
  }

  async function handleDownload() {
    setGenerating(true);
    try {
      const canvas = await buildShareCanvas(gauge, result, stats);
      canvas.toBlob(blob => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "my-divide-o-meter.png";
        a.click();
        URL.revokeObjectURL(a.href);
      }, "image/png");
      trackEvent("share_success", { method: "download" });
    } catch (_) {}
    setGenerating(false);
  }

  async function handleCopy() {
    try { await navigator.clipboard.writeText(full); setCopied(true); setTimeout(() => setCopied(false), 2500); trackEvent("share_success", { method: "copy" }); }
    catch (_) {}
  }

  const socials = [
    { label: "X / Twitter", bg: "#000", icon: "𝕏", href: `https://twitter.com/intent/tweet?text=${encoded}` },
    { label: "WhatsApp",    bg: "#25D366", icon: "💬", href: `https://wa.me/?text=${encoded}` },
    { label: "Facebook",    bg: "#1877F2", icon: "f", href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}` },
  ];

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 200, padding: mobile ? 0 : 20 }}>
      <div className="fade-up" style={{ background: "#1A1D2E", borderRadius: mobile ? "20px 20px 0 0" : 16, padding: 28, width: "100%", maxWidth: 480, border: "1px solid #252840" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontFamily: "'Anton',sans-serif", fontSize: 20 }}>SHARE YOUR RESULT</h3>
          <button onClick={onClose} style={{ background: "none", color: "#64748B", fontSize: 22, lineHeight: 1 }}>×</button>
        </div>

        {/* Social buttons */}
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          {socials.map(s => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer"
              onClick={() => trackEvent("share_click", { platform: s.label })}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 8px", borderRadius: 12, background: s.bg, color: "#fff", fontSize: 11, fontWeight: 600, textDecoration: "none" }}>
              <span style={{ fontSize: 22 }}>{s.icon}</span>
              <span>{s.label}</span>
            </a>
          ))}
        </div>

        {/* Secondary actions */}
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <button onClick={handleCopy} style={{ flex: 1, padding: "13px 0", borderRadius: 10, background: copied ? "#22C55E18" : "#252840", border: `1px solid ${copied ? "#22C55E" : "#2D3154"}`, color: copied ? "#86EFAC" : "#94A3B8", fontSize: 13, fontWeight: 500 }}>
            {copied ? "✓ Copied!" : "🔗 Copy Link"}
          </button>
          <button onClick={handleDownload} disabled={generating} style={{ flex: 1, padding: "13px 0", borderRadius: 10, background: "#252840", border: "1px solid #2D3154", color: "#94A3B8", fontSize: 13, fontWeight: 500 }}>
            {generating ? "…" : "⬇ Save Card"}
          </button>
        </div>

        {/* Native share if available */}
        {navigator.share && (
          <button onClick={handleNativeShare} style={{ width: "100%", padding: "14px 0", borderRadius: 10, background: "linear-gradient(135deg,#1A56DB,#1e40af)", color: "#fff", fontFamily: "'Anton',sans-serif", fontSize: 17, letterSpacing: 1 }}>
            MORE OPTIONS ···
          </button>
        )}
      </div>
    </div>
  );
}

// ─── DonateModal ──────────────────────────────────────────────────────────────

function DonateModal({ onClose }) {
  const mobile = window.innerWidth < 640;
  const amounts = [
    { label: "$3", sub: "Coffee",  url: `${KOFI_URL}` },
    { label: "$6", sub: "Double",  url: `${KOFI_URL}` },
    { label: "$9", sub: "Mega",    url: `${KOFI_URL}` },
  ];
  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
      <div className="fade-in" style={{ background: "#1A1D2E", borderRadius: 16, padding: 28, maxWidth: 440, width: "100%", border: "1px solid #252840" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
          <div>
            <div style={{ color: "#F59E0B", fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 2, marginBottom: 4 }}>SUPPORT THE PROJECT</div>
            <h3 style={{ fontFamily: "'Anton',sans-serif", fontSize: 22 }}>KEEP THE DIVIDE ALIVE</h3>
          </div>
          <button onClick={onClose} style={{ background: "none", color: "#64748B", fontSize: 22, lineHeight: 1, marginLeft: 16 }}>×</button>
        </div>

        <p style={{ color: "#94A3B8", fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
          Our mission is to create a fun and fair space for political dialogue and critical thinking.
          The game stays 100% free for everyone.
        </p>

        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          {amounts.map(({ label, sub, url }) => (
            <a key={label} href={url} target="_blank" rel="noopener noreferrer"
              onClick={() => trackEvent("donate_click", { amount: label })}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "16px 8px", borderRadius: 12, background: "#252840", border: "1px solid #2D3154", color: "#F8FAFC", textDecoration: "none" }}>
              <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 22, color: "#F59E0B" }}>{label}</span>
              <span style={{ fontSize: 11, color: "#64748B" }}>{sub}</span>
            </a>
          ))}
        </div>

        <a href={KOFI_URL} target="_blank" rel="noopener noreferrer"
          onClick={() => trackEvent("donate_click", { amount: "custom" })}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, width: "100%", padding: "15px 0", borderRadius: 12, background: "#FF5E5B", color: "#fff", fontFamily: "'Anton',sans-serif", fontSize: 18, letterSpacing: 1, textDecoration: "none" }}>
          ☕ BUY US A COFFEE
        </a>

        <div style={{ marginTop: 12, textAlign: "center", color: "#475569", fontSize: 12 }}>
          ko-fi.com/thegreatdivide
        </div>
      </div>
    </div>
  );
}

// ─── ContactModal ─────────────────────────────────────────────────────────────

function ContactModal({ onClose }) {
  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [message, setMessage] = useState("");
  const [status,  setStatus]  = useState("idle"); // idle | sending | success | error

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setStatus("sending");
    try {
      const res = await fetch(`${PROXY_URL}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
      });
      if (!res.ok) throw new Error();
      setStatus("success");
      trackEvent("contact_sent");
    } catch (_) {
      setStatus("error");
    }
  }

  const inputStyle = {
    width: "100%", padding: "12px 14px", borderRadius: 10,
    background: "#252840", border: "1px solid #2D3154",
    color: "#F8FAFC", fontSize: 15, outline: "none",
  };

  return (
    <div onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200, padding: 20 }}>
      <div className="fade-in" style={{ background: "#1A1D2E", borderRadius: 16, padding: 28, maxWidth: 440, width: "100%", border: "1px solid #252840" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontFamily: "'Anton',sans-serif", fontSize: 22 }}>CONTACT US</h3>
          <button onClick={onClose} style={{ background: "none", color: "#64748B", fontSize: 22, lineHeight: 1 }}>×</button>
        </div>

        {status === "success" ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✉️</div>
            <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 20, marginBottom: 8 }}>MESSAGE SENT!</div>
            <div style={{ color: "#94A3B8", fontSize: 14 }}>We'll get back to you at <strong style={{ color: "#F8FAFC" }}>hello@thegreatdivide.xyz</strong></div>
            <button onClick={onClose} style={{ marginTop: 20, padding: "12px 32px", borderRadius: 10, background: "#1A56DB", color: "#fff", fontWeight: 600 }}>Close</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" required style={inputStyle} />
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email" type="email" required style={inputStyle} />
              <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Your message" required rows={4}
                style={{ ...inputStyle, resize: "vertical", minHeight: 100 }} />
            </div>
            {status === "error" && (
              <div style={{ color: "#F87171", fontSize: 13, marginBottom: 12 }}>
                Something went wrong. Email us directly at hello@thegreatdivide.xyz
              </div>
            )}
            <button type="submit" disabled={status === "sending"}
              style={{ width: "100%", padding: "14px 0", borderRadius: 10, background: status === "sending" ? "#252840" : "linear-gradient(135deg,#1A56DB,#1e40af)", color: "#fff", fontFamily: "'Anton',sans-serif", fontSize: 18, letterSpacing: 1 }}>
              {status === "sending" ? "SENDING…" : "SEND MESSAGE"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── HomeScreen ───────────────────────────────────────────────────────────────

function HomeScreen({ onPlay, onHowTo, onDebate, onContact, onDonate }) {
  const mobile = window.innerWidth < 640;

  return (
    <div style={{ minHeight: "100vh", background: "#0f1221", display: "flex", flexDirection: "column" }}>
      {/* Hero */}
      <div style={{ position: "relative", width: "100%", height: mobile ? 320 : 460, overflow: "hidden", flexShrink: 0 }}>
        <img
          src={mobile ? "/tgd-capitol-hero-mobile.webp" : "/tgd-capitol-hero-desktop.webp"}
          alt="U.S. Capitol"
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%" }}
        />
        {/* Lighter overlay so Capitol is visible */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(15,18,33,0.15) 0%, rgba(15,18,33,0.3) 50%, #0f1221 100%)" }} />
        {/* Logo — centered in hero */}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", paddingBottom: mobile ? 40 : 60 }}>
          <Logo height={mobile ? 130 : 180} />
        </div>
      </div>

      {/* Content — tighter below hero */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: mobile ? "20px 20px 40px" : "24px 24px 60px", maxWidth: 520, margin: "0 auto", width: "100%" }}>
        <h1 style={{ fontFamily: "'Anton',sans-serif", fontSize: mobile ? 40 : 54, letterSpacing: ".5px", textAlign: "center", lineHeight: 1.05, marginBottom: 10 }}>
          HOW BIASED<br />ARE YOU?
        </h1>
        <p style={{ color: "#94A3B8", fontSize: 15, textAlign: "center", lineHeight: 1.6, marginBottom: 32, maxWidth: 380 }}>
          15 questions. No filter. Discover your political bias and your <strong style={{ color: "#F59E0B" }}>Divide-O-Meter</strong> score.
        </p>

        <button onClick={() => { trackEvent("game_start", { mode: "solo" }); onPlay(); }}
          style={{ width: "100%", padding: "18px 0", borderRadius: 12, background: "linear-gradient(135deg,#1A56DB,#1e40af)", color: "#fff", fontFamily: "'Anton',sans-serif", fontSize: 22, letterSpacing: "1px", marginBottom: 12, boxShadow: "0 4px 24px rgba(26,86,219,.35)", transition: "transform .15s" }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.02)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
          FIND OUT NOW
        </button>

        <button onClick={() => { trackEvent("game_start", { mode: "debate" }); onDebate(); }}
          style={{ width: "100%", padding: "15px 0", borderRadius: 12, background: "rgba(224,36,36,.1)", border: "1.5px solid rgba(224,36,36,.3)", color: "#F87171", fontFamily: "'Anton',sans-serif", fontSize: 17, letterSpacing: "1px", marginBottom: 28 }}>
          🎙️ DEBATE MODE — PLAY WITH FRIENDS
        </button>

        <button onClick={onHowTo} style={{ background: "none", color: "#475569", fontSize: 13, padding: 6, textDecoration: "underline" }}>
          How it works
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 24, padding: "14px 24px", borderTop: "1px solid #1A1D2E" }}>
        <button onClick={onDonate}  style={{ background: "none", color: "#F59E0B", fontSize: 12, fontWeight: 500 }}>☕ Support</button>
        <button onClick={onContact} style={{ background: "none", color: "#475569", fontSize: 12 }}>Contact</button>
      </div>
    </div>
  );
}

// ─── HowToPlayScreen ──────────────────────────────────────────────────────────

function HowToPlayScreen({ onBack, onPlay }) {
  const mobile = window.innerWidth < 640;
  const steps = [
    { icon: "📋", title: "Part A — Fact Check",   desc: "Every question starts with a factual statement about U.S. politics. Answer correctly and earn 15 points." },
    { icon: "🧠", title: "Part B — Bias Reveal",  desc: "Then comes the twist: a follow-up that reveals your political lean. There's no wrong answer — just +15 pts for engaging." },
    { icon: "📊", title: "Your Divide-O-Meter",   desc: "After 15 questions, your answers map to a political spectrum from far-left to far-right. One of 7 archetypes awaits." },
    { icon: "📤", title: "Challenge Your Friends", desc: "Share your result and see where they land. Use Debate Mode to play simultaneously and compare live." },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0f1221", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "20px 20px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onBack} style={{ background: "none", color: "#94A3B8", fontSize: 14 }}>← Back</button>
        <Logo height={34} />
        <div style={{ width: 48 }} />
      </div>

      <div style={{ flex: 1, padding: mobile ? "16px 20px 40px" : "24px 24px 60px", maxWidth: 520, margin: "0 auto", width: "100%" }}>
        <h1 style={{ fontFamily: "'Anton',sans-serif", fontSize: mobile ? 34 : 44, marginBottom: 28 }}>HOW TO PLAY</h1>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 36 }}>
          {steps.map(({ icon, title, desc }) => (
            <div key={title} style={{ background: "#1A1D2E", borderRadius: 12, padding: 18, display: "flex", gap: 14 }}>
              <span style={{ fontSize: 26, flexShrink: 0 }}>{icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{title}</div>
                <div style={{ color: "#94A3B8", fontSize: 13, lineHeight: 1.6 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: "#252840", borderRadius: 12, padding: 18, textAlign: "center", marginBottom: 28 }}>
          <div style={{ color: "#64748B", fontFamily: "'DM Mono',monospace", fontSize: 11, marginBottom: 4 }}>MAX SCORE</div>
          <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 34, color: "#F59E0B" }}>450 pts</div>
          <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>15 questions × 30 pts each</div>
        </div>
        <button onClick={onPlay} style={{ width: "100%", padding: "17px 0", borderRadius: 12, background: "linear-gradient(135deg,#1A56DB,#1e40af)", color: "#fff", fontFamily: "'Anton',sans-serif", fontSize: 21, letterSpacing: 1 }}>
          LET'S PLAY
        </button>
      </div>
    </div>
  );
}

// ─── GameScreen ───────────────────────────────────────────────────────────────

function GameScreen({ onComplete, onQuit }) {
  const [questions]    = useState(() => pickQuestions());
  const [qIndex,       setQIndex]       = useState(0);
  const [part,         setPart]         = useState("A");       // "A" | "B"
  const [selected,     setSelected]     = useState(null);
  const [confirmed,    setConfirmed]    = useState(false);
  const [inTransition, setInTransition] = useState(false);
  const [lastBias,     setLastBias]     = useState(null);
  const [answers,      setAnswers]      = useState([]);
  const [score,        setScore]        = useState(0);
  const timerRef   = useRef(null);
  const answersRef = useRef([]);
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => () => clearTimeout(timerRef.current), []);
  useEffect(() => {
    if (inTransition) {
      timerRef.current = setTimeout(advanceFromTransition, 1200);
    }
  }, [inTransition]);

  const q      = questions[qIndex];
  const mobile = window.innerWidth < 640;
  const isA    = part === "A";
  const opts   = isA ? q.A.opts : q.B.opts;
  const partColor = isA ? "#1A56DB" : "#E02424";

  const tip = TIPS[qIndex % TIPS.length];

  // ── Transition screen ──────────────────────────────────────────────────────
  if (inTransition && lastBias) {
    return (
      <div onClick={() => { clearTimeout(timerRef.current); advanceFromTransition(); }}
        style={{ minHeight: "100vh", background: "#0a0d1a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 24, userSelect: "none" }}>
        <div className="fade-in" style={{ textAlign: "center", maxWidth: 340 }}>
          <div style={{ color: "#475569", fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 3, marginBottom: 20 }}>YOUR BIAS</div>
          <div style={{ fontFamily: "'Anton',sans-serif", fontSize: mobile ? 54 : 70, color: lastBias.color, lineHeight: 1, marginBottom: 20 }}>
            {lastBias.label.toUpperCase()}
          </div>
          <p style={{ color: "#94A3B8", fontSize: 15, lineHeight: 1.65 }}>{lastBias.desc}</p>
        </div>
      </div>
    );
  }

  // ── Option style ──────────────────────────────────────────────────────────
  function getOptionStyle(idx) {
    const base = { width: "100%", padding: "14px 16px", borderRadius: 10, background: "#1A1D2E", border: "1.5px solid #252840", color: "#F8FAFC", fontSize: 15, textAlign: "left", lineHeight: 1.5, marginBottom: 10, transition: "border-color .12s" };
    if (!confirmed) return selected === idx ? { ...base, border: `1.5px solid ${partColor}`, background: partColor + "18" } : base;
    if (isA) {
      if (idx === q.A.ans) return { ...base, border: "1.5px solid #22C55E", background: "#22C55E15", color: "#86EFAC" };
      if (idx === selected) return { ...base, border: "1.5px solid #E02424", background: "#E0242415", color: "#FCA5A5" };
    } else {
      if (idx === selected) {
        const bc = BIAS_META[q.B.bias[idx]]?.color ?? "#F59E0B";
        return { ...base, border: `1.5px solid ${bc}`, background: bc + "18" };
      }
    }
    return { ...base, opacity: 0.5 };
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleSelect(idx) { if (!confirmed) setSelected(idx); }

  function handleConfirm() {
    if (selected === null || confirmed) return;
    setConfirmed(true);
    if (isA) {
      const pts = selected === q.A.ans ? 15 : 0;
      setScore(s => s + pts);
      setAnswers(prev => { const a = [...prev]; a[qIndex] = { aPartChoice: selected, aPartCorrect: q.A.ans, bPartChoice: null, bPartBias: null }; return a; });
      trackEvent("question_answered", { part: "A", q_id: q.id, correct: selected === q.A.ans });
      timerRef.current = setTimeout(() => { setPart("B"); setSelected(null); setConfirmed(false); }, 1000);
    } else {
      const bias     = q.B.bias[selected] ?? "NEU";
      const biasInfo = BIAS_META[bias] ?? { label: bias, color: "#64748B", desc: "" };
      setScore(s => s + 15);
      setAnswers(prev => { const a = [...prev]; a[qIndex] = { ...a[qIndex], bPartChoice: selected, bPartBias: bias }; return a; });
      trackEvent("question_answered", { part: "B", q_id: q.id, bias });
      setLastBias(biasInfo);
      setInTransition(true);
    }
  }

  function advanceFromTransition() {
    setInTransition(false);
    const next = qIndex + 1;
    if (next >= questions.length) {
      onComplete(answersRef.current.map((a, i) => ({ ...a, aPartCorrect: questions[i].A.ans })));
    } else {
      setQIndex(next); setPart("A"); setSelected(null); setConfirmed(false);
    }
  }

  const progress = ((qIndex + (isA ? 0 : 0.5)) / questions.length) * 100;

  return (
    <div style={{ minHeight: "100vh", background: "#0f1221", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "14px 20px 0", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onQuit} style={{ background: "none", color: "#475569", fontSize: 13, flexShrink: 0 }}>✕</button>
        <div style={{ flex: 1, height: 4, background: "#1A1D2E", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: partColor, borderRadius: 2, transition: "width .4s ease" }} />
        </div>
        <Logo height={28} style={{ flexShrink: 0 }} />
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "#64748B", flexShrink: 0 }}>{qIndex + 1}/{questions.length}</div>
      </div>

      {/* Score */}
      <div style={{ padding: "6px 20px 0", display: "flex", justifyContent: "flex-end" }}>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: "#94A3B8" }}>
          <span style={{ color: "#F59E0B", fontWeight: 600 }}>{score}</span> pts
        </div>
      </div>

      {/* Question */}
      <div style={{ flex: 1, padding: mobile ? "20px 20px 32px" : "28px 24px 40px", maxWidth: 600, margin: "0 auto", width: "100%" }}>
        {/* Part badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ padding: "4px 12px", borderRadius: 20, background: partColor + "20", border: `1px solid ${partColor}40`, color: partColor, fontSize: 11, fontFamily: "'DM Mono',monospace", letterSpacing: 1 }}>
            {isA ? "PART A — THE FACT" : "PART B — THE BIAS"}
          </div>
          <div style={{ fontSize: 11, color: "#475569", fontFamily: "'DM Mono',monospace" }}>{q.title}</div>
        </div>

        <h2 className="fade-in" key={`${qIndex}-${part}`} style={{ fontSize: mobile ? 17 : 19, fontWeight: 600, lineHeight: 1.55, marginBottom: 22, color: "#F8FAFC" }}>
          {isA ? q.A.q : q.B.q}
        </h2>

        {/* Options */}
        {opts.map((opt, idx) => (
          <button key={idx} onClick={() => handleSelect(idx)} disabled={confirmed} style={getOptionStyle(idx)}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 6, background: selected === idx ? partColor : "#252840", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: selected === idx ? "#fff" : "#64748B", fontFamily: "'DM Mono',monospace" }}>
                {String.fromCharCode(65 + idx)}
              </span>
              <span style={{ flex: 1 }}>{opt}</span>
            </div>
          </button>
        ))}

        {/* Part A: wrong answer hint */}
        {isA && confirmed && selected !== null && selected !== q.A.ans && (
          <div className="fade-in" style={{ padding: "11px 14px", background: "#22C55E12", borderRadius: 8, border: "1px solid #22C55E30", marginBottom: 10 }}>
            <span style={{ color: "#86EFAC", fontSize: 13 }}>
              Correct: <strong>{String.fromCharCode(65 + q.A.ans)}</strong> — {q.A.opts[q.A.ans]}
            </span>
          </div>
        )}

        {/* Confirm button */}
        {selected !== null && !confirmed && (
          <button onClick={handleConfirm} className="fade-in"
            style={{ marginTop: 18, width: "100%", padding: "16px 0", borderRadius: 12, background: partColor, color: "#fff", fontFamily: "'Anton',sans-serif", fontSize: 20, letterSpacing: 1 }}>
            CONFIRM
          </button>
        )}

        {/* Part A pts feedback */}
        {isA && confirmed && (
          <div style={{ marginTop: 10, textAlign: "center", color: selected === q.A.ans ? "#22C55E" : "#64748B", fontFamily: "'DM Mono',monospace", fontSize: 12 }}>
            {selected === q.A.ans ? "+15 pts ✓" : "+0 pts"}
          </div>
        )}

      </div>
    </div>
  );
}

// ─── DivideOmeterCard ─────────────────────────────────────────────────────────

function DivideOmeterCard({ answers, onPlayAgain, onContact, onDonate }) {
  const mobile    = window.innerWidth < 640;
  const gauge     = calcDivideOMeter(answers);
  const result    = getResult(gauge);
  const stats     = calcStats(answers);
  const dirLabel  = getDirectionLabel(gauge);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    trackEvent("game_complete", { gauge, archetype: result.label, score: stats.score });
  }, []);

  // Bias breakdown
  const biasCounts = {};
  answers.forEach(({ bPartBias }) => { if (bPartBias) biasCounts[bPartBias] = (biasCounts[bPartBias] ?? 0) + 1; });
  const biasEntries = Object.entries(biasCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div style={{ minHeight: "100vh", background: "#0f1221", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "18px 20px 0", display: "flex", justifyContent: "center" }}>
        <Logo height={36} />
      </div>

      <div style={{ flex: 1, padding: mobile ? "20px 20px 40px" : "28px 24px 60px", maxWidth: 520, margin: "0 auto", width: "100%" }}>

        {/* Title */}
        <div className="fade-in" style={{ textAlign: "center", marginBottom: 4 }}>
          <div style={{ color: "#64748B", fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 3, marginBottom: 4 }}>YOUR RESULT</div>
          <h1 style={{ fontFamily: "'Anton',sans-serif", fontSize: mobile ? 24 : 30, letterSpacing: 1, marginBottom: 2 }}>YOUR DIVIDE-O-METER</h1>
          <div style={{ color: "#475569", fontSize: 12 }}>Based on your answers to {answers.length} questions</div>
        </div>

        {/* Gauge with % */}
        <div className="fade-in" style={{ textAlign: "center", marginBottom: 8, marginTop: 16 }}>
          <DivideOMeterGauge gauge={gauge} size={300} showLabel={true} />
        </div>

        {/* LEFT / RIGHT bar labels */}
        <div style={{ display: "flex", justifyContent: "space-between", paddingInline: 10, marginBottom: 20 }}>
          <span style={{ color: "#1A56DB", fontFamily: "'DM Mono',monospace", fontSize: 11 }}>← LEFT</span>
          <span style={{ color: "#E02424", fontFamily: "'DM Mono',monospace", fontSize: 11 }}>RIGHT →</span>
        </div>

        {/* Archetype card */}
        <div style={{ background: "#1A1D2E", borderRadius: 16, padding: 20, marginBottom: 14, border: `1px solid ${result.color}30` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <img src={result.avatar} alt={result.label}
              style={{ width: 68, height: 68, borderRadius: "50%", border: `2.5px solid ${result.color}`, objectFit: "cover", flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ color: "#64748B", fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2, marginBottom: 4 }}>YOUR ARCHETYPE</div>
              <h2 style={{ fontFamily: "'Anton',sans-serif", fontSize: mobile ? 20 : 24, color: result.color, letterSpacing: ".5px", lineHeight: 1.1 }}>
                {result.label.toUpperCase()}
              </h2>
            </div>
          </div>
          <p style={{ color: "#94A3B8", fontSize: 13, lineHeight: 1.7, marginTop: 14, borderTop: "1px solid #252840", paddingTop: 14 }}>
            ❝ {result.desc} ❞
          </p>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
          {[
            { label: "FACTS", value: `${stats.factsCorrect}/15`, sub: `${Math.round((stats.factsCorrect / 15) * 100)}%` },
            { label: "BIAS",  value: `${stats.biasAnswered}/15`, sub: "100%" },
            { label: "SCORE", value: stats.score, sub: "pts" },
          ].map(({ label, value, sub }) => (
            <div key={label} style={{ background: "#1A1D2E", borderRadius: 12, padding: "14px 10px", textAlign: "center" }}>
              <div style={{ color: "#64748B", fontSize: 10, fontFamily: "'DM Mono',monospace", marginBottom: 4 }}>{label}</div>
              <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 22, color: "#F59E0B" }}>{value}</div>
              <div style={{ color: "#475569", fontSize: 11, fontFamily: "'DM Mono',monospace" }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Bias breakdown */}
        {biasEntries.length > 0 && (
          <div style={{ background: "#1A1D2E", borderRadius: 12, padding: 18, marginBottom: 14 }}>
            <div style={{ color: "#64748B", fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2, marginBottom: 14 }}>BIAS BREAKDOWN</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {biasEntries.map(([bias, count]) => {
                const meta = BIAS_META[bias] ?? { label: bias, color: "#64748B" };
                const pct  = Math.round((count / answers.length) * 100);
                return (
                  <div key={bias}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, color: meta.color, fontFamily: "'DM Mono',monospace" }}>{meta.label}</span>
                      <span style={{ fontSize: 11, color: "#64748B", fontFamily: "'DM Mono',monospace" }}>{count}× ({pct}%)</span>
                    </div>
                    <div style={{ height: 5, background: "#252840", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: meta.color, borderRadius: 3 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Share */}
        <button onClick={() => { setShowShare(true); trackEvent("share_click", { archetype: result.label }); }}
          style={{ width: "100%", padding: "16px 0", borderRadius: 12, background: "linear-gradient(135deg,#1A56DB,#1e40af)", color: "#fff", fontFamily: "'Anton',sans-serif", fontSize: 20, letterSpacing: 1, marginBottom: 10 }}>
          📤  SHARE RESULT
        </button>

        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <button onClick={onPlayAgain}
            style={{ flex: 1, padding: "14px 0", borderRadius: 12, background: "none", border: "1.5px solid #252840", color: "#94A3B8", fontFamily: "'Anton',sans-serif", fontSize: 16, letterSpacing: 1 }}>
            PLAY AGAIN
          </button>
          <button onClick={onDonate}
            style={{ flex: 1, padding: "14px 0", borderRadius: 12, background: "rgba(255,94,91,.12)", border: "1.5px solid rgba(255,94,91,.3)", color: "#FF7875", fontFamily: "'Anton',sans-serif", fontSize: 16, letterSpacing: 1 }}>
            ☕ SUPPORT
          </button>
        </div>

        <div style={{ textAlign: "center" }}>
          <button onClick={onContact} style={{ background: "none", color: "#475569", fontSize: 12, textDecoration: "underline" }}>Contact</button>
        </div>
      </div>

      {showShare && (
        <ShareSheet gauge={gauge} result={result} stats={stats} onClose={() => setShowShare(false)} />
      )}
    </div>
  );
}

// ─── DebateStartScreen ────────────────────────────────────────────────────────

function DebateStartScreen({ onBack, onHostGame, onJoinGame }) {
  const mobile = window.innerWidth < 640;
  const [tab,     setTab]     = useState("host");
  const [name,    setName]    = useState("");
  const [code,    setCode]    = useState("");
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  async function handleCreate() {
    if (!name.trim()) { setError("Please enter your name."); return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${PROXY_URL}/debate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ host: name.trim() }) });
      const data = await res.json();
      if (!data.code) throw new Error();
      trackEvent("debate_create", { code: data.code });
      onHostGame({ code: data.code, hostName: name.trim(), ...data });
    } catch (_) { setError("Could not create room. Try again."); }
    setLoading(false);
  }

  async function handleJoin() {
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (!code.trim()) { setError("Please enter the room code."); return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${PROXY_URL}/debate/${code.trim().toUpperCase()}/join`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim() }) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      trackEvent("debate_join", { code: code.trim() });
      onJoinGame({ code: code.trim().toUpperCase(), playerName: name.trim(), ...data });
    } catch (err) { setError(err.message || "Could not join room. Check the code."); }
    setLoading(false);
  }

  const inputStyle = { width: "100%", padding: "12px 14px", borderRadius: 10, background: "#252840", border: "1px solid #2D3154", color: "#F8FAFC", fontSize: 16, outline: "none" };

  return (
    <div style={{ minHeight: "100vh", background: "#0f1221", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "18px 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onBack} style={{ background: "none", color: "#94A3B8", fontSize: 14 }}>← Back</button>
        <Logo height={30} />
        <div style={{ width: 48 }} />
      </div>
      <div style={{ flex: 1, padding: mobile ? "24px 20px 40px" : "32px 24px", maxWidth: 460, margin: "0 auto", width: "100%" }}>
        <h1 style={{ fontFamily: "'Anton',sans-serif", fontSize: mobile ? 32 : 40, marginBottom: 6 }}>🔥 DEBATE MODE</h1>
        <p style={{ color: "#64748B", fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>Same 15 questions, everyone plays. Compare results live.</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          {["host", "join"].map(t => (
            <button key={t} onClick={() => { setTab(t); setError(""); }}
              style={{ flex: 1, padding: "12px 0", borderRadius: 10, background: tab === t ? "#1A56DB" : "#1A1D2E", border: tab === t ? "none" : "1px solid #252840", color: tab === t ? "#fff" : "#64748B", fontFamily: "'Anton',sans-serif", fontSize: 15, letterSpacing: 1 }}>
              {t === "host" ? "CREATE ROOM" : "JOIN ROOM"}
            </button>
          ))}
        </div>
        <div style={{ background: "#1A1D2E", borderRadius: 14, padding: 22 }}>
          <label style={{ display: "block", marginBottom: 14 }}>
            <div style={{ color: "#64748B", fontSize: 11, fontFamily: "'DM Mono',monospace", marginBottom: 6 }}>YOUR NAME</div>
            <input value={name} onChange={e => { setName(e.target.value); setError(""); }} placeholder="Enter your name" maxLength={20} style={inputStyle} />
          </label>
          {tab === "join" && (
            <label style={{ display: "block", marginBottom: 14 }}>
              <div style={{ color: "#64748B", fontSize: 11, fontFamily: "'DM Mono',monospace", marginBottom: 6 }}>ROOM CODE</div>
              <input value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setError(""); }} placeholder="e.g. ABCD" maxLength={6}
                style={{ ...inputStyle, fontSize: 24, fontFamily: "'DM Mono',monospace", letterSpacing: 6, textTransform: "uppercase" }} />
            </label>
          )}
          {error && <div style={{ color: "#F87171", fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <button onClick={tab === "host" ? handleCreate : handleJoin} disabled={loading}
            style={{ width: "100%", padding: "15px 0", borderRadius: 10, background: loading ? "#252840" : "linear-gradient(135deg,#1A56DB,#1e40af)", color: "#fff", fontFamily: "'Anton',sans-serif", fontSize: 18, letterSpacing: 1 }}>
            {loading ? "CONNECTING…" : tab === "host" ? "CREATE ROOM" : "JOIN GAME"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DebateHostScreen ─────────────────────────────────────────────────────────

function DebateHostScreen({ roomData, onClose }) {
  const mobile = window.innerWidth < 640;
  const { code, hostName } = roomData;
  const [state,   setState]  = useState("lobby");
  const [players, setPlayers] = useState([{ name: hostName, isHost: true }]);
  const [results, setResults] = useState(null);
  const [copied,  setCopied]  = useState(false);
  const pollRef = useRef(null);

  useEffect(() => {
    pollRef.current = setInterval(poll, 3000);
    return () => clearInterval(pollRef.current);
  }, [state]);

  async function poll() {
    try {
      const res  = await fetch(`${PROXY_URL}/debate/${code}`);
      const data = await res.json();
      if (data.players) setPlayers(data.players);
      if (data.state === "done") { setResults(data.results); setState("done"); clearInterval(pollRef.current); }
    } catch (_) {}
  }

  async function startGame() {
    try { await fetch(`${PROXY_URL}/debate/${code}/start`, { method: "POST" }); setState("playing"); trackEvent("debate_start", { code, player_count: players.length }); }
    catch (_) {}
  }

  function copyCode() { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }

  if (state === "done" && results) return <DebateResultsScreen results={results} onClose={onClose} />;

  if (state === "playing") return (
    <div style={{ minHeight: "100vh", background: "#0f1221", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
      <Logo height={36} style={{ margin: "0 auto 24px" }} />
      <div style={{ fontFamily: "'DM Mono',monospace", color: "#64748B", fontSize: 13, marginBottom: 12 }}>Game in progress…</div>
      <div style={{ color: "#94A3B8", fontSize: 14 }}>Waiting for all players to answer.</div>
      <button onClick={onClose} style={{ marginTop: 32, background: "none", color: "#475569", fontSize: 13, textDecoration: "underline" }}>Exit game</button>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0f1221", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "18px 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onClose} style={{ background: "none", color: "#94A3B8", fontSize: 14 }}>✕ Exit</button>
        <Logo height={30} />
        <div style={{ width: 48 }} />
      </div>
      <div style={{ flex: 1, padding: mobile ? "24px 20px 40px" : "32px 24px", maxWidth: 460, margin: "0 auto", width: "100%" }}>
        <h2 style={{ fontFamily: "'Anton',sans-serif", fontSize: 28, marginBottom: 20 }}>YOU'RE THE HOST</h2>
        <div onClick={copyCode} style={{ background: "#1A1D2E", borderRadius: 14, padding: 24, textAlign: "center", marginBottom: 20, border: "2px dashed #252840", cursor: "pointer" }}>
          <div style={{ color: "#64748B", fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>ROOM CODE — TAP TO COPY</div>
          <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 52, letterSpacing: 10, color: "#F59E0B" }}>{code}</div>
          {copied && <div style={{ color: "#22C55E", fontSize: 12, marginTop: 4 }}>Copied!</div>}
        </div>
        <div style={{ background: "#1A1D2E", borderRadius: 12, padding: 18, marginBottom: 20 }}>
          <div style={{ color: "#64748B", fontSize: 11, fontFamily: "'DM Mono',monospace", marginBottom: 12 }}>PLAYERS ({players.length})</div>
          {players.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < players.length - 1 ? "1px solid #252840" : "none" }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#252840", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>{p.name[0]?.toUpperCase()}</div>
              <span style={{ flex: 1, fontSize: 14 }}>{p.name}</span>
              {p.isHost && <span style={{ fontSize: 10, color: "#F59E0B", fontFamily: "'DM Mono',monospace" }}>HOST</span>}
              {!p.isHost && <span style={{ fontSize: 10, color: "#22C55E", fontFamily: "'DM Mono',monospace" }}>READY</span>}
            </div>
          ))}
        </div>
        <button onClick={startGame} disabled={players.length < 2}
          style={{ width: "100%", padding: "16px 0", borderRadius: 12, background: players.length < 2 ? "#1A1D2E" : "linear-gradient(135deg,#E02424,#991B1B)", color: players.length < 2 ? "#475569" : "#fff", fontFamily: "'Anton',sans-serif", fontSize: 20, letterSpacing: 1, border: players.length < 2 ? "1px solid #252840" : "none" }}>
          {players.length < 2 ? "WAITING FOR PLAYERS…" : "START GAME"}
        </button>
      </div>
    </div>
  );
}

// ─── DebatePlayerScreen ───────────────────────────────────────────────────────

function DebatePlayerScreen({ roomInfo, onClose }) {
  const mobile  = window.innerWidth < 640;
  const { code, playerName } = roomInfo;
  const [gameState, setGameState] = useState("waiting");
  const [qIndex,    setQIndex]    = useState(-1);
  const [questions] = useState(() => pickQuestions());
  const [part,      setPart]      = useState("A");
  const [selected,  setSelected]  = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [answers,   setAnswers]   = useState([]);
  const [results,   setResults]   = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    pollRef.current = setInterval(poll, 2000);
    return () => clearInterval(pollRef.current);
  }, [gameState, qIndex]);

  async function poll() {
    try {
      const res  = await fetch(`${PROXY_URL}/debate/${code}`);
      const data = await res.json();
      if (data.state === "playing" && data.currentQuestion !== undefined && data.currentQuestion !== qIndex) {
        setGameState("question"); setQIndex(data.currentQuestion); setPart("A"); setSelected(null); setConfirmed(false);
      }
      if (data.state === "done") { setResults(data.results); setGameState("done"); clearInterval(pollRef.current); }
    } catch (_) {}
  }

  async function submitAnswer(bias, aCorrect) {
    try { await fetch(`${PROXY_URL}/debate/${code}/answer`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: playerName, qIndex, bias, aCorrect }) }); }
    catch (_) {}
  }

  if (gameState === "done" && results) return <DebateResultsScreen results={results} onClose={onClose} />;

  if (gameState === "waiting") return (
    <div style={{ minHeight: "100vh", background: "#0f1221", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
      <Logo height={44} style={{ margin: "0 auto 28px" }} />
      <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 26, marginBottom: 10 }}>WAITING FOR HOST</div>
      <div style={{ color: "#64748B", fontSize: 14, marginBottom: 28 }}>The host will start the game shortly.</div>
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 16, color: "#F59E0B", letterSpacing: 6 }}>{code}</div>
      <button onClick={onClose} style={{ marginTop: 36, background: "none", color: "#475569", fontSize: 13, textDecoration: "underline" }}>Leave</button>
    </div>
  );

  if (qIndex < 0 || !questions[qIndex]) return (
    <div style={{ minHeight: "100vh", background: "#0f1221", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#64748B", fontFamily: "'DM Mono',monospace" }}>Loading…</div>
    </div>
  );

  const q         = questions[qIndex];
  const isA       = part === "A";
  const opts      = isA ? q.A.opts : q.B.opts;
  const partColor = isA ? "#1A56DB" : "#E02424";
  const biasBadge = (!isA && confirmed && selected !== null) ? (BIAS_META[q.B.bias[selected]] ?? { label: q.B.bias[selected], color: "#64748B", desc: "" }) : null;

  function handleSelect(idx) { if (!confirmed) setSelected(idx); }
  function handleConfirm() {
    if (selected === null || confirmed) return;
    setConfirmed(true);
    if (isA) {
      const aCorrect = selected === q.A.ans;
      setAnswers(prev => { const a = [...prev]; a[qIndex] = { aPartChoice: selected, aPartCorrect: q.A.ans, bPartChoice: null, bPartBias: null }; return a; });
      setTimeout(() => { setPart("B"); setSelected(null); setConfirmed(false); }, 900);
    } else {
      const bias = q.B.bias[selected] ?? "NEU";
      const aCorrect = answers[qIndex]?.aPartChoice === q.A.ans;
      setAnswers(prev => { const a = [...prev]; a[qIndex] = { ...(a[qIndex] || {}), bPartChoice: selected, bPartBias: bias }; return a; });
      submitAnswer(bias, aCorrect);
    }
  }
  function handleNext() { setGameState("waiting"); }

  return (
    <div style={{ minHeight: "100vh", background: "#0f1221", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "14px 20px 0", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onClose} style={{ background: "none", color: "#475569", fontSize: 13 }}>✕</button>
        <div style={{ flex: 1, height: 4, background: "#1A1D2E", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${((qIndex + (isA ? 0 : 0.5)) / questions.length) * 100}%`, background: partColor, borderRadius: 2, transition: "width .4s" }} />
        </div>
        <Logo height={26} />
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "#64748B" }}>{qIndex + 1}/{questions.length}</div>
      </div>
      <div style={{ flex: 1, padding: mobile ? "20px 20px 32px" : "28px 24px", maxWidth: 600, margin: "0 auto", width: "100%" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <div style={{ padding: "4px 12px", borderRadius: 20, background: partColor + "20", border: `1px solid ${partColor}40`, color: partColor, fontSize: 11, fontFamily: "'DM Mono',monospace" }}>
            {isA ? "PART A — THE FACT" : "PART B — THE BIAS"}
          </div>
        </div>
        <h2 style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.55, marginBottom: 20 }}>{isA ? q.A.q : q.B.q}</h2>
        {opts.map((opt, idx) => (
          <button key={idx} onClick={() => handleSelect(idx)} disabled={confirmed}
            style={{ width: "100%", padding: "14px 16px", borderRadius: 10, marginBottom: 10, background: selected === idx ? partColor + "18" : "#1A1D2E", border: `1.5px solid ${selected === idx ? partColor : "#252840"}`, color: "#F8FAFC", fontSize: 15, textAlign: "left" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ width: 24, height: 24, borderRadius: 6, background: selected === idx ? partColor : "#252840", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: selected === idx ? "#fff" : "#64748B", fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>{String.fromCharCode(65 + idx)}</span>
              <span style={{ flex: 1 }}>{opt}</span>
            </div>
          </button>
        ))}
        {selected !== null && !confirmed && (
          <button onClick={handleConfirm} className="fade-in"
            style={{ marginTop: 16, width: "100%", padding: "16px 0", borderRadius: 12, background: partColor, color: "#fff", fontFamily: "'Anton',sans-serif", fontSize: 20, letterSpacing: 1 }}>
            CONFIRM
          </button>
        )}
        {biasBadge && (
          <div className="fade-in" style={{ marginTop: 14, padding: 18, background: "#1A1D2E", borderRadius: 12, border: `2px solid ${biasBadge.color}40` }}>
            <div style={{ color: "#64748B", fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 2, marginBottom: 6 }}>YOUR BIAS</div>
            <div style={{ color: biasBadge.color, fontFamily: "'Anton',sans-serif", fontSize: 20, marginBottom: 6 }}>{biasBadge.label.toUpperCase()}</div>
            <p style={{ color: "#94A3B8", fontSize: 13, lineHeight: 1.6 }}>{biasBadge.desc}</p>
          </div>
        )}
        {!isA && confirmed && biasBadge && (
          <button onClick={handleNext} className="fade-in"
            style={{ marginTop: 12, width: "100%", padding: "15px 0", borderRadius: 12, background: "linear-gradient(135deg,#1A56DB,#1e40af)", color: "#fff", fontFamily: "'Anton',sans-serif", fontSize: 19, letterSpacing: 1 }}>
            NEXT →
          </button>
        )}
      </div>
    </div>
  );
}

// ─── DebateResultsScreen ──────────────────────────────────────────────────────

function DebateResultsScreen({ results, onClose }) {
  const mobile  = window.innerWidth < 640;
  if (!results?.players) return (
    <div style={{ minHeight: "100vh", background: "#0f1221", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 30, marginBottom: 16 }}>GAME OVER</div>
      <button onClick={onClose} style={{ background: "none", color: "#94A3B8", fontSize: 14, textDecoration: "underline" }}>Back to Home</button>
    </div>
  );
  const sorted = [...results.players].sort((a, b) => b.score - a.score);

  return (
    <div style={{ minHeight: "100vh", background: "#0f1221", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "18px 20px 0", display: "flex", justifyContent: "center" }}><Logo height={34} /></div>
      <div style={{ flex: 1, padding: mobile ? "24px 20px 40px" : "32px 24px", maxWidth: 460, margin: "0 auto", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ color: "#64748B", fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 2, marginBottom: 6 }}>DEBATE RESULTS</div>
          <h1 style={{ fontFamily: "'Anton',sans-serif", fontSize: mobile ? 28 : 36 }}>WHO'S THE MOST BIASED?</h1>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
          {sorted.map((player, i) => {
            const g = player.gauge ?? 50, r = getResult(g);
            return (
              <div key={player.name} style={{ background: "#1A1D2E", borderRadius: 12, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{["🥇","🥈","🥉"][i] ?? `${i+1}.`}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{player.name}</div>
                  <div style={{ color: r.color, fontFamily: "'DM Mono',monospace", fontSize: 10 }}>{r.label}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 20, color: "#F59E0B" }}>{player.score ?? 0}</div>
                  <div style={{ color: "#475569", fontSize: 10, fontFamily: "'DM Mono',monospace" }}>pts</div>
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={onClose} style={{ width: "100%", padding: "16px 0", borderRadius: 12, background: "linear-gradient(135deg,#1A56DB,#1e40af)", color: "#fff", fontFamily: "'Anton',sans-serif", fontSize: 20, letterSpacing: 1 }}>
          PLAY AGAIN
        </button>
      </div>
    </div>
  );
}

// ─── TheGreatDivide ───────────────────────────────────────────────────────────

export default function TheGreatDivide() {
  const [screen,       setScreen]       = useState("home");
  const [gameAnswers,  setGameAnswers]  = useState([]);
  const [showContact,  setShowContact]  = useState(false);
  const [showDonate,   setShowDonate]   = useState(false);
  const [debateRoom,   setDebateRoom]   = useState(null);
  const [debatePlayer, setDebatePlayer] = useState(null);

  function goHome() { setScreen("home"); setGameAnswers([]); setDebateRoom(null); setDebatePlayer(null); }

  return (
    <>
      <GlobalStyles />

      {screen === "home"    && <HomeScreen onPlay={() => setScreen("game")} onHowTo={() => setScreen("howto")} onDebate={() => setScreen("debate-start")} onContact={() => setShowContact(true)} onDonate={() => setShowDonate(true)} />}
      {screen === "howto"   && <HowToPlayScreen onBack={() => setScreen("home")} onPlay={() => setScreen("game")} />}
      {screen === "game"    && <GameScreen onComplete={ans => { setGameAnswers(ans); setScreen("result"); }} onQuit={goHome} />}
      {screen === "result"  && <DivideOmeterCard answers={gameAnswers} onPlayAgain={() => setScreen("game")} onContact={() => setShowContact(true)} onDonate={() => setShowDonate(true)} />}
      {screen === "debate-start"  && <DebateStartScreen onBack={() => setScreen("home")} onHostGame={d => { setDebateRoom(d); setScreen("debate-host"); }} onJoinGame={d => { setDebatePlayer(d); setScreen("debate-player"); }} />}
      {screen === "debate-host"   && debateRoom   && <DebateHostScreen   roomData={debateRoom}   onClose={goHome} />}
      {screen === "debate-player" && debatePlayer && <DebatePlayerScreen roomInfo={debatePlayer} onClose={goHome} />}

      {showContact && <ContactModal  onClose={() => setShowContact(false)} />}
      {showDonate  && <DonateModal   onClose={() => setShowDonate(false)}  />}
    </>
  );
}
