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
  { min: 0,  max: 14,  icon: "✊", label: "The Progressive Firebrand",  color: "#1A56DB", avatar: "/avatar-tgd-far-left.webp",    desc: "Social justice, systemic change, and bold progressive policy are your north star. You believe the status quo fails ordinary people." },
  { min: 15, max: 29,  icon: "🫏", label: "The Liberal Democrat",        color: "#3B82F6", avatar: "/avatar-tgd-left.webp",        desc: "You're solidly liberal. You trust government to solve big problems and you vote blue without much hesitation." },
  { min: 30, max: 44,  icon: "🌊", label: "The Center-Left Pragmatist",  color: "#14B8A6", avatar: "/avatar-tgd-center-left.webp", desc: "You lean left but you're practical. You want progress — just not overnight, and not at any cost." },
  { min: 45, max: 55,  icon: "⚖️", label: "The Independent",             color: "#F59E0B", avatar: "/avatar-tgd-neutral.webp",     desc: "You don't fit neatly in a box. You pick and choose your positions, frustrating both sides equally." },
  { min: 56, max: 70,  icon: "🏛️", label: "The Center-Right Moderate",   color: "#F97316", avatar: "/avatar-tgd-center-right.webp",desc: "You lean right but you're not extreme. Fiscal responsibility and personal freedom are core to your worldview." },
  { min: 71, max: 85,  icon: "🦅", label: "The Conservative",            color: "#EF4444", avatar: "/avatar-tgd-right.webp",       desc: "You're firmly on the right. Traditional values, limited government, and free markets define your politics." },
  { min: 86, max: 100, icon: "🐘", label: "The MAGA Loyalist",           color: "#B91C1C", avatar: "/avatar-tgd-far-right.webp",  desc: "You're all-in on the populist right. You distrust institutions, love America loud, and don't apologize for it." },
];

// Knowledge tier badges — one trio (LOW/MED/HIGH) per bias archetype, indexed to match ARCHETYPES above.
const KNOWLEDGE_BADGES = [
  // 0 — Progressive Firebrand
  [
    { tier: "LOW",  icon: "🔥", label: "The Vibes Revolutionary", quote: "You'll smash the system right after you find your other AirPod. Big heart, light receipts." },
    { tier: "MED",  icon: "📣", label: "The Committed Activist",  quote: "You march, you sign, you donate — and sometimes you even read the bill. Mostly." },
    { tier: "HIGH", icon: "📕", label: "The Theory Head",         quote: "You can cite Marx, Marcuse, and the latest Jacobin in one breath. Terrifying at dinner parties." },
  ],
  // 1 — Liberal Democrat
  [
    { tier: "LOW",  icon: "☕", label: "The MSNBC Sleeper",       quote: "You catch the vibes, miss the policy. You're on the right side — just don't ask which bill." },
    { tier: "MED",  icon: "📰", label: "The Reliable Blue Voter", quote: "You know your senator, your governor, and roughly when the midterms are. You're the backbone." },
    { tier: "HIGH", icon: "🧠", label: "The Enlightened Liberal", quote: "You've read the studies, cited the data, and still lost Thanksgiving. Everyone wants you on their trivia team." },
  ],
  // 2 — Center-Left Pragmatist
  [
    { tier: "LOW",  icon: "🍵", label: "The Reluctant Liberal",      quote: "You lean left mostly out of habit. Couldn't name three policy details if rent depended on it." },
    { tier: "MED",  icon: "🍃", label: "The Thoughtful Progressive", quote: "You support change — within reason, with a spreadsheet, and ideally bipartisan." },
    { tier: "HIGH", icon: "📊", label: "The Wonk's Wonk",            quote: "You live for incremental reform and footnoted policy briefs. You listen to The Daily on 1.5x." },
  ],
  // 3 — Independent
  [
    { tier: "LOW",  icon: "🌀", label: "The Politically Adrift",  quote: "You vote 'whoever' and skip every debate. Honestly? Refreshing. The political class hasn't earned your attention." },
    { tier: "MED",  icon: "🤷", label: "The Everyday Centrist",   quote: "You roll your eyes at both sides and somehow keep your friends. The middle isn't dead — you're just the last one in it." },
    { tier: "HIGH", icon: "🦉", label: "The Wise Independent",    quote: "You know too much to pick a team. Both sides find you insufferable — which usually means you're right." },
  ],
  // 4 — Center-Right Moderate
  [
    { tier: "LOW",  icon: "🪑", label: "The Country Club Conservative", quote: "You vote red because dad did. You'll figure out which red eventually." },
    { tier: "MED",  icon: "🤝", label: "The Reasonable Republican",     quote: "You believe in fiscal sanity, polite debate, and the sacred institution of brunch." },
    { tier: "HIGH", icon: "📈", label: "The WSJ Reader",                quote: "You debate tax brackets recreationally and own at least one good suit. Restrained, informed, dangerous." },
  ],
  // 5 — Conservative
  [
    { tier: "LOW",  icon: "🇺🇸", label: "The Loud Patriot",           quote: "You love your country louder than you read about it. Big flag, light footnotes." },
    { tier: "MED",  icon: "⚙️", label: "The Steady Conservative",     quote: "Low taxes, defined borders, no nonsense. You're not loud — you're consistent." },
    { tier: "HIGH", icon: "📚", label: "The Principled Conservative", quote: "You quote Burke before lunch and Buckley after. The conservative who actually read the Federalist Papers." },
  ],
  // 6 — MAGA Loyalist
  [
    { tier: "LOW",  icon: "📺", label: "The Outrage Patriot",       quote: "Big flag, big feelings, fuzzy facts. You might think the filibuster is a fish — but your conviction is bulletproof." },
    { tier: "MED",  icon: "🎙️", label: "The Talk Radio Faithful",   quote: "You catch every clip, never miss the segment, and somehow know less than when you started. But you're loud about it." },
    { tier: "HIGH", icon: "🏛️", label: "The Movement Strategist",   quote: "You've memorized the Heritage playbook and can name every justice's clerk. Bring backup to the debate." },
  ],
];

function getKnowledgeTier(facts) {
  if (facts >= 10) return 2; // HIGH (≥83%)
  if (facts >= 6)  return 1; // MED  (50–75%)
  return 0;                  // LOW  (<50%)
}

function getKnowledgeBadge(gauge, facts) {
  const archetypeIndex = ARCHETYPES.findIndex(a => gauge >= a.min && gauge <= a.max);
  const idx            = archetypeIndex >= 0 ? archetypeIndex : 3;
  return KNOWLEDGE_BADGES[idx][getKnowledgeTier(facts)];
}

const TIPS = [
  "There are no right answers in Part B. We reveal your bias, not judge you.",
  "Your political bias shows in how you interpret facts, not just what you believe.",
  "Most Americans hold positions from multiple political traditions.",
  "Part B is about how you frame the issue, not whether you're right or wrong.",
  "Your archetype is a snapshot — bias changes based on the topic.",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Shuffle each question's answer options so the bias/correct-answer position
// stops being predictable (raw JSON has D=LIB 72% and Part-A correct=B 61%).
function shuffleQuestion(q) {
  const aN     = q.A.opts.length;
  const aOrder = Array.from({ length: aN }, (_, i) => i).sort(() => Math.random() - 0.5);
  const aOpts  = aOrder.map(i => q.A.opts[i]);
  const aAns   = aOrder.indexOf(q.A.ans);

  const bN     = q.B.opts.length;
  const bOrder = Array.from({ length: bN }, (_, i) => i).sort(() => Math.random() - 0.5);
  const bOpts  = bOrder.map(i => q.B.opts[i]);
  const bBias  = bOrder.map(i => q.B.bias[i]);

  return {
    ...q,
    A: { ...q.A, opts: aOpts, ans: aAns },
    B: { ...q.B, opts: bOpts, bias: bBias },
  };
}

function pickQuestions() {
  const TOTAL   = 12;
  const TARGETS = { DEM: 2, PROG: 2, CON: 2, LIB: 2, POP: 2, NEU: 2 };
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
  return picked.slice(0, TOTAL).sort(() => Math.random() - 0.5).map(shuffleQuestion);
}

const Q_MAP = Object.fromEntries(Q.map(q => [q.id, q]));
function pickQuestionsById(ids) {
  return ids.map(id => Q_MAP[id]).filter(Boolean).map(shuffleQuestion);
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

async function buildShareCanvas(gauge, result, stats, knowledge) {
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

  // Knowledge badge
  if (knowledge) {
    ctx.fillStyle = "#F59E0B"; ctx.font = "bold 30px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`${knowledge.icon}  ${knowledge.label.toUpperCase()}`, W / 2, 530);
  }

  // Stats
  ctx.fillStyle = "#94A3B8"; ctx.font = "22px sans-serif"; ctx.textAlign = "center";
  ctx.fillText(`Facts ${stats.factsCorrect}/12  •  Score ${stats.score} pts`, W / 2, 570);

  // URL
  ctx.fillStyle = "#F59E0B"; ctx.font = "bold 28px sans-serif";
  ctx.fillText(SITE_URL, W / 2, 608);

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
      @keyframes debateGlow{0%,100%{box-shadow:0 0 10px rgba(224,36,36,.25),inset 0 0 0 1.5px rgba(224,36,36,.3)}50%{box-shadow:0 0 28px rgba(224,36,36,.55),inset 0 0 0 1.5px rgba(224,36,36,.7)}}
      .fade-in{animation:fadeIn .3s ease both}
      .fade-up{animation:fadeUp .4s ease both}
      .debate-btn{animation:debateGlow 2.4s ease-in-out infinite}
      .debate-btn:hover{animation:none;box-shadow:0 0 36px rgba(224,36,36,.7),inset 0 0 0 1.5px #E02424}
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

function ShareSheet({ gauge, result, stats, knowledge, onClose }) {
  const [copied,    setCopied]    = useState(false);
  const [generating, setGenerating] = useState(false);
  const mobile = window.innerWidth < 640;
  const dir    = getDirectionLabel(gauge);
  const text   = `I took The Great Divide and scored ${gauge}% — ${dir}. I'm ${knowledge?.label || result.label}. What's yours?`;
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
      const canvas = await buildShareCanvas(gauge, result, stats, knowledge);
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
      {/* Top nav */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, display: "flex", justifyContent: mobile ? "space-between" : "flex-end", gap: 8, padding: "14px 18px", zIndex: 10 }}>
        <button onClick={onDonate}  style={{ background: "rgba(245,158,11,.12)", border: "1px solid rgba(245,158,11,.3)", color: "#F59E0B", fontFamily: "'Anton',sans-serif", fontSize: 13, letterSpacing: ".5px", padding: "7px 16px", borderRadius: 20 }}>☕ SUPPORT</button>
        <button onClick={onContact} style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.12)", color: "#94A3B8", fontFamily: "'Anton',sans-serif", fontSize: 13, letterSpacing: ".5px", padding: "7px 16px", borderRadius: 20 }}>CONTACT</button>
      </div>
      {/* Hero — Capitol image extends through H1 */}
      <div style={{ position: "relative", width: "100%", height: mobile ? 480 : 620, overflow: "hidden", flexShrink: 0 }}>
        <img
          src={mobile ? "/tgd-capitol-hero-mobile.webp" : "/tgd-capitol-hero-desktop.webp"}
          alt="U.S. Capitol"
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%", filter: "brightness(1.5) contrast(0.92) saturate(1.05)" }}
        />
        {/* Warm lift on lower Capitol + gradual darken behind H1 for legibility, then fade into bg */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 45%, rgba(255,220,180,0.06) 60%, rgba(15,18,33,0.35) 82%, rgba(15,18,33,0.85) 96%, #0f1221 100%)" }} />
        {/* Logo top, H1 bottom — both over the image */}
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: mobile ? "70px 20px 28px" : "88px 24px 36px" }}>
          <Logo height={mobile ? 170 : 240} />
          <h1 style={{ fontFamily: "'Anton',sans-serif", fontSize: mobile ? 42 : 58, letterSpacing: ".5px", textAlign: "center", lineHeight: 1.05, color: "#F8FAFC", textShadow: "0 2px 16px rgba(0,0,0,0.75), 0 0 32px rgba(0,0,0,0.55)", margin: 0 }}>
            HOW BIASED<br />ARE YOU?
          </h1>
        </div>
      </div>

      {/* Content — description + CTAs on plain bg */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: mobile ? "20px 20px 40px" : "26px 24px 60px", maxWidth: 520, margin: "0 auto", width: "100%" }}>
        <p style={{ color: "#94A3B8", fontSize: 15, textAlign: "center", lineHeight: 1.6, marginBottom: 32, maxWidth: 380 }}>
          12 questions. No filter. Discover your political bias and your <strong style={{ color: "#F59E0B" }}>Divide-O-Meter</strong> score.
        </p>

        {/* Split CTA — blue left / red right */}
        <button onClick={() => { trackEvent("game_start", { mode: "solo" }); onPlay(); }}
          style={{ width: "100%", height: 62, borderRadius: 12, background: "linear-gradient(90deg,#1A56DB 50%,#C81E1E 50%)", color: "#fff", fontFamily: "'Anton',sans-serif", fontSize: 22, letterSpacing: "1.5px", marginBottom: 12, boxShadow: "0 4px 28px rgba(26,86,219,.3), 0 4px 28px rgba(200,30,30,.2)", position: "relative", overflow: "hidden", transition: "transform .15s, box-shadow .15s" }}
          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.02)"; e.currentTarget.style.boxShadow = "0 6px 36px rgba(26,86,219,.45), 0 6px 36px rgba(200,30,30,.35)"; }}
          onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = "0 4px 28px rgba(26,86,219,.3), 0 4px 28px rgba(200,30,30,.2)"; }}>
          {/* center divider */}
          <span style={{ position: "absolute", left: "50%", top: "20%", bottom: "20%", width: 2, background: "rgba(255,255,255,0.25)", transform: "translateX(-50%)" }} />
          FIND OUT NOW
        </button>

        {/* Debate — pulsing glow border */}
        <button onClick={() => { trackEvent("game_start", { mode: "debate" }); onDebate(); }}
          className="debate-btn"
          style={{ width: "100%", padding: "15px 0", borderRadius: 12, background: "rgba(200,30,30,.08)", color: "#F87171", fontFamily: "'Anton',sans-serif", fontSize: 17, letterSpacing: "1px", marginBottom: 28, border: "none" }}>
          🎙️ DEBATE MODE — PLAY WITH FRIENDS
        </button>

        <button onClick={onHowTo} style={{ background: "none", color: "#475569", fontFamily: "'Anton',sans-serif", fontSize: 12, letterSpacing: ".5px", padding: 6 }}>
          HOW IT WORKS ↓
        </button>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 24, padding: "14px 24px", borderTop: "1px solid #1A1D2E" }}>
        <button onClick={onDonate}  style={{ background: "none", color: "#F59E0B", fontFamily: "'Anton',sans-serif", fontSize: 12, letterSpacing: ".5px" }}>☕ SUPPORT</button>
        <button onClick={onContact} style={{ background: "none", color: "#475569", fontFamily: "'Anton',sans-serif", fontSize: 12, letterSpacing: ".5px" }}>CONTACT</button>
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
    { icon: "📊", title: "Your Divide-O-Meter",   desc: "After 12 questions, your answers map to a political spectrum from far-left to far-right. One of 7 archetypes awaits." },
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
          <div style={{ color: "#475569", fontSize: 11, marginTop: 2 }}>12 questions × 30 pts each</div>
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
  const mobile  = window.innerWidth < 640;
  const gauge   = calcDivideOMeter(answers);
  const result  = getResult(gauge);
  const stats   = calcStats(answers);
  const knowledge = getKnowledgeBadge(gauge, stats.factsCorrect);
  const [showShare,    setShowShare]    = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    trackEvent("game_complete", { gauge, archetype: result.label, score: stats.score, knowledge_tier: knowledge.tier, knowledge_label: knowledge.label });
  }, []);

  const biasCounts = {};
  answers.forEach(({ bPartBias }) => { if (bPartBias) biasCounts[bPartBias] = (biasCounts[bPartBias] ?? 0) + 1; });
  const biasEntries = Object.entries(biasCounts).sort((a, b) => b[1] - a[1]);
  const scoreStr    = stats.score.toLocaleString();

  return (
    <div style={{ minHeight: "100vh", background: "#0f1221", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "18px 20px 4px", display: "flex", justifyContent: "center" }}>
        <Logo height={52} />
      </div>

      <div style={{ flex: 1, padding: mobile ? "14px 18px 40px" : "20px 24px 60px", maxWidth: 480, margin: "0 auto", width: "100%" }}>

        {/* Title */}
        <div className="fade-in" style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={{ color: "#64748B", fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 3, marginBottom: 2 }}>YOUR RESULT</div>
          <h1 style={{ fontFamily: "'Anton',sans-serif", fontSize: mobile ? 26 : 32, letterSpacing: 1, marginBottom: 2 }}>YOUR DIVIDE-O-METER</h1>
          <div style={{ color: "#475569", fontSize: 12 }}>Based on your answers to {answers.length} questions</div>
        </div>

        {/* Gauge */}
        <div className="fade-in">
          <DivideOMeterGauge gauge={gauge} size={320} showLabel={true} />
        </div>

        {/* LEFT / RIGHT */}
        <div style={{ display: "flex", justifyContent: "space-between", paddingInline: 8, marginTop: -6, marginBottom: 16 }}>
          <span style={{ color: "#1A56DB", fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 600 }}>← LEFT</span>
          <span style={{ color: "#C81E1E", fontFamily: "'DM Mono',monospace", fontSize: 11, fontWeight: 600 }}>RIGHT →</span>
        </div>

        {/* Avatar */}
        {result.avatar && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <img src={result.avatar} alt={result.label}
              style={{ width: mobile ? 120 : 140, height: mobile ? 120 : 140, borderRadius: "50%", objectFit: "cover", border: `3px solid ${result.color}80`, boxShadow: `0 0 28px ${result.color}40`, background: "#1A1D2E" }} />
          </div>
        )}

        {/* Archetype pill */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "10px 22px", borderRadius: 40, background: result.color + "1A", border: `1.5px solid ${result.color}55` }}>
            <span style={{ fontSize: 22 }}>{result.icon}</span>
            <span style={{ fontFamily: "'Anton',sans-serif", fontSize: mobile ? 18 : 20, color: result.color, letterSpacing: 1 }}>
              {result.label.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Quote */}
        <div style={{ background: "#1A1D2E", borderRadius: 14, padding: "16px 18px", marginBottom: 12, border: `1px solid ${result.color}20` }}>
          <span style={{ color: result.color, fontSize: 22, lineHeight: 0, verticalAlign: "middle", marginRight: 8 }}>❝</span>
          <span style={{ color: "#94A3B8", fontSize: 14, lineHeight: 1.7 }}>{result.desc}</span>
          <span style={{ color: result.color, fontSize: 22, lineHeight: 0, verticalAlign: "middle", marginLeft: 8 }}>❞</span>
        </div>

        {/* Knowledge badge — flavors the archetype based on Part A correct answers */}
        <div style={{ background: "#1A1D2E", borderRadius: 14, padding: "14px 16px", marginBottom: 12, border: "1.5px solid #F59E0B33" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 24 }}>{knowledge.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#64748B", fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 2, marginBottom: 1 }}>KNOWLEDGE — {knowledge.tier}</div>
              <div style={{ fontFamily: "'Anton',sans-serif", fontSize: mobile ? 17 : 19, color: "#F59E0B", letterSpacing: ".5px", lineHeight: 1.1 }}>{knowledge.label.toUpperCase()}</div>
            </div>
          </div>
          <p style={{ color: "#94A3B8", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{knowledge.quote}</p>
        </div>

        {/* Knowledge gauge — horizontal 15-segment bar parallel to Divide-O-Meter */}
        <div style={{ background: "#1A1D2E", borderRadius: 14, padding: "14px 16px", marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
            <span style={{ color: "#64748B", fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2 }}>KNOWLEDGE LEVEL</span>
            <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 18, color: "#F59E0B" }}>{stats.factsCorrect}/12</span>
          </div>
          <div style={{ display: "flex", gap: 3, marginBottom: 6 }}>
            {Array.from({ length: 12 }, (_, i) => {
              const filled = i < stats.factsCorrect;
              return (
                <div key={i} style={{
                  flex: 1, height: 14, borderRadius: 3,
                  background: filled ? `hsl(${30 + i * 5}, 85%, ${48 + i * 0.8}%)` : "#252840",
                  transition: "background .3s"
                }} />
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'DM Mono',monospace", fontSize: 9, color: "#475569", letterSpacing: 1 }}>
            <span>LOW</span><span>MEDIUM</span><span>HIGH</span>
          </div>
        </div>

        {/* Score pill */}
        <div style={{ background: "#1A1D2E", borderRadius: 12, padding: "12px 16px", marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: "#64748B", fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2 }}>FINAL SCORE</span>
          <span style={{ fontFamily: "'Anton',sans-serif", fontSize: mobile ? 22 : 26, color: "#F59E0B", letterSpacing: 1 }}>{scoreStr} <span style={{ fontSize: 12, color: "#475569" }}>PTS</span></span>
        </div>

        {/* Donate card with coffee mug — surfaced ABOVE bias breakdown so it's visible without scrolling */}
        <div style={{ background: "linear-gradient(135deg, #1A1D2E 0%, #1F2138 100%)", borderRadius: 16, padding: "20px 20px", marginBottom: 12, border: "1.5px solid #F59E0B30", position: "relative", overflow: "hidden", boxShadow: "0 4px 30px rgba(245,158,11,0.08)" }}>
          <img src="/cafecito-logo.webp" alt=""
            style={{ position: "absolute", right: mobile ? -16 : -10, top: mobile ? -10 : -6, height: mobile ? 220 : 250, pointerEvents: "none", filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.4))" }} />
          <div style={{ paddingRight: mobile ? 150 : 190 }}>
            <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 15, marginBottom: 5, lineHeight: 1.2 }}>KEEP THE<br/>DIVIDE ALIVE</div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {[["$3","Coffee"],["$6","Double"],["$9","Mega"]].map(([amt, lbl]) => (
                <a key={amt} href={KOFI_URL} target="_blank" rel="noopener noreferrer"
                  onClick={() => trackEvent("donate_click", { amount: amt })}
                  style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 1, padding: "9px 4px", borderRadius: 10, background: "#252840", border: "1px solid #2D3154", textDecoration: "none" }}>
                  <span style={{ fontFamily: "'Anton',sans-serif", fontSize: 16, color: "#F59E0B" }}>{amt}</span>
                  <span style={{ fontSize: 9, color: "#64748B" }}>{lbl}</span>
                </a>
              ))}
            </div>
            <a href={KOFI_URL} target="_blank" rel="noopener noreferrer"
              onClick={() => trackEvent("donate_click", { amount: "custom" })}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px 0", borderRadius: 10, background: "#FF5E5B", color: "#fff", fontFamily: "'Anton',sans-serif", fontSize: 14, letterSpacing: 1, textDecoration: "none", width: "100%" }}>
              ☕ BUY A COFFEE
            </a>
          </div>
        </div>

        {/* Bias breakdown — collapsible to keep the page short */}
        {biasEntries.length > 0 && (
          <div style={{ background: "#1A1D2E", borderRadius: 12, marginBottom: 12, overflow: "hidden" }}>
            <button onClick={() => setShowBreakdown(s => !s)}
              style={{ width: "100%", padding: "14px 16px", background: "transparent", border: "none", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", color: "#F8FAFC" }}>
              <span style={{ color: "#64748B", fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2 }}>BIAS BREAKDOWN</span>
              <span style={{ color: "#94A3B8", fontSize: 12, transition: "transform .2s", transform: showBreakdown ? "rotate(180deg)" : "rotate(0deg)", display: "inline-block" }}>▾</span>
            </button>
            {showBreakdown && (
              <div className="fade-in" style={{ padding: "0 16px 14px" }}>
                {biasEntries.map(([bias, count]) => {
                  const meta = BIAS_META[bias] ?? { label: bias, color: "#64748B" };
                  const pct  = Math.round((count / answers.length) * 100);
                  return (
                    <div key={bias} style={{ marginBottom: 8 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                        <span style={{ fontSize: 12, color: meta.color }}>{meta.label}</span>
                        <span style={{ fontSize: 11, color: "#64748B", fontFamily: "'DM Mono',monospace" }}>{count}× ({pct}%)</span>
                      </div>
                      <div style={{ height: 4, background: "#252840", borderRadius: 2 }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: meta.color, borderRadius: 2 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <button onClick={onPlayAgain}
            style={{ padding: "16px 0", borderRadius: 12, background: "linear-gradient(135deg,#1A56DB,#1e40af)", color: "#fff", fontFamily: "'Anton',sans-serif", fontSize: 17, letterSpacing: 1 }}>
            PLAY AGAIN
          </button>
          <button onClick={() => { setShowShare(true); trackEvent("share_click", { archetype: result.label }); }}
            style={{ padding: "16px 0", borderRadius: 12, background: "#1A1D2E", border: "1.5px solid #2D3154", color: "#F8FAFC", fontFamily: "'Anton',sans-serif", fontSize: 15, letterSpacing: 1 }}>
            📤 SHARE →
          </button>
        </div>

        <div style={{ textAlign: "center" }}>
          <button onClick={onContact} style={{ background: "none", color: "#475569", fontFamily: "'Anton',sans-serif", fontSize: 11, letterSpacing: ".5px" }}>CONTACT</button>
        </div>
      </div>

      {showShare && (
        <ShareSheet gauge={gauge} result={result} stats={stats} knowledge={knowledge} onClose={() => setShowShare(false)} />
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
      {/* Header */}
      <div style={{ padding: "16px 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={onBack} style={{ background: "none", color: "#94A3B8", fontFamily: "'Anton',sans-serif", fontSize: 13, letterSpacing: ".5px" }}>← BACK</button>
        <div style={{ width: 48 }} />
      </div>

      <div style={{ flex: 1, padding: mobile ? "20px 20px 40px" : "24px 24px", maxWidth: 460, margin: "0 auto", width: "100%" }}>
        {/* Big logo */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <Logo height={mobile ? 90 : 110} />
        </div>

        <h1 style={{ fontFamily: "'Anton',sans-serif", fontSize: mobile ? 30 : 38, marginBottom: 6 }}>🎙️ DEBATE MODE</h1>
        <p style={{ color: "#64748B", fontSize: 14, lineHeight: 1.6, marginBottom: 22 }}>Same 12 questions, everyone plays. Compare results live.</p>

        {/* Tab buttons — styled like home CTAs */}
        <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
          <button onClick={() => { setTab("host"); setError(""); }}
            style={{ flex: 1, height: 52, borderRadius: 12, position: "relative", overflow: "hidden", fontFamily: "'Anton',sans-serif", fontSize: 15, letterSpacing: 1, color: "#fff", border: "none",
              background: tab === "host" ? "linear-gradient(90deg,#1A56DB 50%,#C81E1E 50%)" : "#1A1D2E",
              boxShadow: tab === "host" ? "0 4px 20px rgba(26,86,219,.25), 0 4px 20px rgba(200,30,30,.15)" : "none" }}>
            {tab === "host" && <span style={{ position: "absolute", left: "50%", top: "20%", bottom: "20%", width: 2, background: "rgba(255,255,255,0.2)", transform: "translateX(-50%)" }} />}
            <span style={{ color: tab === "host" ? "#fff" : "#64748B" }}>CREATE ROOM</span>
          </button>
          <button onClick={() => { setTab("join"); setError(""); }}
            className={tab === "join" ? "debate-btn" : ""}
            style={{ flex: 1, height: 52, borderRadius: 12, fontFamily: "'Anton',sans-serif", fontSize: 15, letterSpacing: 1,
              background: tab === "join" ? "rgba(200,30,30,.08)" : "#1A1D2E",
              color: tab === "join" ? "#F87171" : "#64748B",
              border: tab === "join" ? "none" : "1px solid #252840" }}>
            JOIN ROOM
          </button>
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
            style={{ width: "100%", height: 56, borderRadius: 12, position: "relative", overflow: "hidden", color: "#fff", fontFamily: "'Anton',sans-serif", fontSize: 19, letterSpacing: 1, border: "none",
              background: loading ? "#252840" : tab === "host" ? "linear-gradient(90deg,#1A56DB 50%,#C81E1E 50%)" : "linear-gradient(135deg,#C81E1E,#991B1B)",
              boxShadow: loading ? "none" : tab === "host" ? "0 4px 24px rgba(26,86,219,.3), 0 4px 24px rgba(200,30,30,.2)" : "0 4px 20px rgba(200,30,30,.35)" }}>
            {!loading && tab === "host" && <span style={{ position: "absolute", left: "50%", top: "20%", bottom: "20%", width: 2, background: "rgba(255,255,255,0.2)", transform: "translateX(-50%)" }} />}
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
  const [state,     setState]    = useState("lobby");
  const [players,   setPlayers]  = useState([{ name: hostName, isHost: true }]);
  const [results,   setResults]  = useState(null);
  const [copied,    setCopied]   = useState(false);
  // Question-playing state (host plays just like any other player)
  const [questions, setQuestions] = useState(null);
  const [qIndex,    setQIndex]   = useState(-1);
  const [part,      setPart]     = useState("A");
  const [selected,  setSelected] = useState(null);
  const [confirmed, setConfirmed]= useState(false);
  const [waiting,   setWaiting]  = useState(false); // between questions
  const pollRef    = useRef(null);
  const timerRef   = useRef(null);
  const answersRef = useRef([]);
  const qIndexRef  = useRef(-1);

  useEffect(() => { qIndexRef.current = qIndex; }, [qIndex]);

  useEffect(() => {
    pollRef.current = setInterval(poll, 2000);
    return () => { clearInterval(pollRef.current); clearTimeout(timerRef.current); };
  }, []);

  async function poll() {
    try {
      const res  = await fetch(`${PROXY_URL}/debate/${code}`);
      const data = await res.json();
      if (data.players) setPlayers(data.players);
      if (data.state === "playing" && data.currentQuestion !== undefined && data.currentQuestion !== qIndexRef.current) {
        setQIndex(data.currentQuestion);
        setPart("A"); setSelected(null); setConfirmed(false); setWaiting(false);
      }
      if (data.state === "done") { setResults(data.results); setState("done"); clearInterval(pollRef.current); }
    } catch (_) {}
  }

  async function startGame() {
    try {
      const picked      = pickQuestions();
      const questionIds = picked.map(q => q.id);
      setQuestions(picked);
      setQIndex(0);
      await fetch(`${PROXY_URL}/debate/${code}/start`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionIds }),
      });
      setState("playing");
      trackEvent("debate_start", { code, player_count: players.length });
    } catch (_) {}
  }

  async function submitAnswer(bias, aCorrect) {
    try {
      await fetch(`${PROXY_URL}/debate/${code}/answer`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: hostName, qIndex, bias, aCorrect }),
      });
    } catch (_) {}
  }

  function copyCode() { navigator.clipboard?.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }

  if (state === "done" && results) return <DebateResultsScreen results={results} onClose={onClose} />;

  // ── Playing: host answers questions like a regular player ──────────────────
  if (state === "playing" && qIndex >= 0 && questions && questions[qIndex] && !waiting) {
    const q         = questions[qIndex];
    const isA       = part === "A";
    const opts      = isA ? q.A.opts : q.B.opts;
    const partColor = isA ? "#1A56DB" : "#E02424";
    const biasBadge = (!isA && confirmed && selected !== null)
      ? (BIAS_META[q.B.bias[selected]] ?? { label: q.B.bias[selected], color: "#64748B", desc: "" })
      : null;
    const progress = ((qIndex + (isA ? 0 : 0.5)) / questions.length) * 100;

    function handleSelect(idx) { if (!confirmed) setSelected(idx); }
    function handleConfirm() {
      if (selected === null || confirmed) return;
      setConfirmed(true);
      if (isA) {
        answersRef.current[qIndex] = { aPartChoice: selected, aPartCorrect: q.A.ans };
        timerRef.current = setTimeout(() => { setPart("B"); setSelected(null); setConfirmed(false); }, 900);
      } else {
        const bias     = q.B.bias[selected] ?? "NEU";
        const aCorrect = answersRef.current[qIndex]?.aPartChoice === q.A.ans;
        submitAnswer(bias, aCorrect);
      }
    }
    function handleNext() { setWaiting(true); setSelected(null); setConfirmed(false); }

    return (
      <div style={{ minHeight: "100vh", background: "#0f1221", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "14px 20px 0", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={onClose} style={{ background: "none", color: "#475569", fontSize: 13, flexShrink: 0 }}>✕</button>
          <div style={{ flex: 1, height: 4, background: "#1A1D2E", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: partColor, borderRadius: 2, transition: "width .4s" }} />
          </div>
          <Logo height={26} style={{ flexShrink: 0 }} />
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "#64748B", flexShrink: 0 }}>{qIndex + 1}/{questions.length}</div>
        </div>
        <div style={{ flex: 1, padding: mobile ? "20px 20px 32px" : "28px 24px", maxWidth: 600, margin: "0 auto", width: "100%" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <div style={{ padding: "4px 12px", borderRadius: 20, background: partColor + "20", border: `1px solid ${partColor}40`, color: partColor, fontSize: 11, fontFamily: "'DM Mono',monospace" }}>
              {isA ? "PART A — THE FACT" : "PART B — THE BIAS"}
            </div>
            <div style={{ fontSize: 11, color: "#475569", fontFamily: "'DM Mono',monospace" }}>{q.title}</div>
          </div>
          <h2 className="fade-in" key={`${qIndex}-${part}`} style={{ fontSize: mobile ? 17 : 19, fontWeight: 600, lineHeight: 1.55, marginBottom: 22 }}>
            {isA ? q.A.q : q.B.q}
          </h2>
          {opts.map((opt, idx) => {
            let style = { width: "100%", padding: "14px 16px", borderRadius: 10, background: "#1A1D2E", border: "1.5px solid #252840", color: "#F8FAFC", fontSize: 15, textAlign: "left", marginBottom: 10 };
            if (confirmed && isA) {
              if (idx === q.A.ans) style = { ...style, border: "1.5px solid #22C55E", background: "#22C55E15", color: "#86EFAC" };
              else if (idx === selected) style = { ...style, border: "1.5px solid #E02424", background: "#E0242415", color: "#FCA5A5" };
              else style = { ...style, opacity: 0.5 };
            } else if (!confirmed && selected === idx) {
              style = { ...style, border: `1.5px solid ${partColor}`, background: partColor + "18" };
            } else if (confirmed && !isA && idx === selected) {
              const bc = BIAS_META[q.B.bias[idx]]?.color ?? "#F59E0B";
              style = { ...style, border: `1.5px solid ${bc}`, background: bc + "18" };
            } else if (confirmed) {
              style = { ...style, opacity: 0.5 };
            }
            return (
              <button key={idx} onClick={() => handleSelect(idx)} disabled={confirmed} style={style}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 6, background: selected === idx ? partColor : "#252840", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: selected === idx ? "#fff" : "#64748B", fontFamily: "'DM Mono',monospace" }}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span style={{ flex: 1 }}>{opt}</span>
                </div>
              </button>
            );
          })}
          {isA && confirmed && selected !== null && selected !== q.A.ans && (
            <div className="fade-in" style={{ padding: "11px 14px", background: "#22C55E12", borderRadius: 8, border: "1px solid #22C55E30", marginBottom: 10 }}>
              <span style={{ color: "#86EFAC", fontSize: 13 }}>Correct: <strong>{String.fromCharCode(65 + q.A.ans)}</strong> — {q.A.opts[q.A.ans]}</span>
            </div>
          )}
          {selected !== null && !confirmed && (
            <button onClick={handleConfirm} className="fade-in"
              style={{ marginTop: 18, width: "100%", padding: "16px 0", borderRadius: 12, background: partColor, color: "#fff", fontFamily: "'Anton',sans-serif", fontSize: 20, letterSpacing: 1 }}>
              CONFIRM
            </button>
          )}
          {isA && confirmed && (
            <div style={{ marginTop: 10, textAlign: "center", color: selected === q.A.ans ? "#22C55E" : "#64748B", fontFamily: "'DM Mono',monospace", fontSize: 12 }}>
              {selected === q.A.ans ? "+15 pts ✓" : "+0 pts"}
            </div>
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

  // ── Waiting between questions (host submitted, waiting for other player) ───
  if (state === "playing") return (
    <div style={{ minHeight: "100vh", background: "#0f1221", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
      <Logo height={140} style={{ margin: "0 auto 36px" }} />
      <div style={{ fontFamily: "'DM Mono',monospace", color: "#94A3B8", fontSize: 14, marginBottom: 12, letterSpacing: 1 }}>Waiting for other players…</div>
      <div style={{ color: "#F8FAFC", fontSize: 16 }}>Hang tight while others answer.</div>
      <button onClick={onClose} style={{ marginTop: 36, background: "none", color: "#64748B", fontFamily: "'Anton',sans-serif", fontSize: 13, letterSpacing: ".5px", textDecoration: "underline" }}>EXIT GAME</button>
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
  const [gameState,  setGameState]  = useState("waiting");
  const [qIndex,     setQIndex]     = useState(-1);
  const [questions,  setQuestions]  = useState(null);
  const [part,       setPart]       = useState("A");
  const [selected,   setSelected]   = useState(null);
  const [confirmed,  setConfirmed]  = useState(false);
  const [answers,    setAnswers]    = useState([]);
  const [results,    setResults]    = useState(null);
  const pollRef   = useRef(null);
  const qIndexRef = useRef(-1);

  useEffect(() => { qIndexRef.current = qIndex; }, [qIndex]);

  useEffect(() => {
    pollRef.current = setInterval(poll, 2000);
    return () => clearInterval(pollRef.current);
  }, []);

  async function poll() {
    try {
      const res  = await fetch(`${PROXY_URL}/debate/${code}`);
      const data = await res.json();
      if (data.questionIds && data.questionIds.length) {
        setQuestions(prev => prev ?? pickQuestionsById(data.questionIds));
      }
      if (data.state === "playing" && data.currentQuestion !== undefined && data.currentQuestion !== qIndexRef.current) {
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
      <Logo height={140} style={{ margin: "0 auto 36px" }} />
      <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 26, marginBottom: 10 }}>WAITING FOR HOST</div>
      <div style={{ color: "#F8FAFC", fontSize: 16 }}>The host will start the game shortly.</div>
      <button onClick={onClose} style={{ marginTop: 36, background: "none", color: "#64748B", fontFamily: "'Anton',sans-serif", fontSize: 13, letterSpacing: ".5px", textDecoration: "underline" }}>LEAVE</button>
    </div>
  );

  if (qIndex < 0 || !questions || !questions[qIndex]) return (
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
          <div style={{ height: "100%", width: `${((qIndex + (isA ? 0 : 0.5)) / (questions?.length || 15)) * 100}%`, background: partColor, borderRadius: 2, transition: "width .4s" }} />
        </div>
        <Logo height={26} />
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "#64748B" }}>{qIndex + 1}/{questions?.length || 15}</div>
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

      {/* Persistent Support button — visible on every screen except home (home has its own) */}
      {screen !== "home" && (
        <button onClick={() => setShowDonate(true)}
          style={{ position: "fixed", bottom: 20, right: 16, zIndex: 100, display: "flex", alignItems: "center", gap: 6, padding: "9px 16px", borderRadius: 24, background: "rgba(245,158,11,.15)", border: "1px solid rgba(245,158,11,.35)", color: "#F59E0B", fontFamily: "'Anton',sans-serif", fontSize: 13, letterSpacing: ".5px", backdropFilter: "blur(8px)", boxShadow: "0 2px 12px rgba(0,0,0,.3)" }}>
          ☕ SUPPORT
        </button>
      )}
    </>
  );
}
