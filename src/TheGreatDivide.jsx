import { useState, useEffect, useRef, useCallback } from "react";
import Q from "../tgd-questions.json";

// ─── Constants ───────────────────────────────────────────────────────────────

const PROXY_URL = "https://tgd-proxy.sebastiancabello.workers.dev";

const BIAS_META = {
  DEM:  { label: "Democrat",     color: "#1A56DB" },
  PROG: { label: "Progressive",  color: "#7C3AED" },
  CON:  { label: "Conservative", color: "#E02424" },
  LIB:  { label: "Libertarian",  color: "#D97706" },
  POP:  { label: "Populist",     color: "#B45309" },
  NEU:  { label: "Neutral",      color: "#64748B" },
};

const LEFT_BIASES  = ["DEM", "PROG"];
const RIGHT_BIASES = ["CON", "LIB", "POP"];

const ARCHETYPES = [
  {
    min: 0, max: 14,
    label: "The Progressive Firebrand",
    color: "#1A56DB",
    avatar: "/avatar-tgd-far-left.webp",
    desc: "You lean hard left. Social justice, systemic change, and bold progressive policy are your north star.",
    share: "I scored as The Progressive Firebrand 🔵 — take The Great Divide and find out your political bias!",
  },
  {
    min: 15, max: 29,
    label: "The Liberal Democrat",
    color: "#3B82F6",
    avatar: "/avatar-tgd-left.webp",
    desc: "You're solidly liberal. You trust government to solve big problems and you vote blue without much hesitation.",
    share: "I scored as The Liberal Democrat 🔵 — take The Great Divide and find out your political bias!",
  },
  {
    min: 30, max: 44,
    label: "The Center-Left Pragmatist",
    color: "#14B8A6",
    avatar: "/avatar-tgd-center-left.webp",
    desc: "You lean left but you're practical. You want progress — just not overnight, and not at any cost.",
    share: "I scored as The Center-Left Pragmatist 🟢 — take The Great Divide and find out your political bias!",
  },
  {
    min: 45, max: 55,
    label: "The Independent",
    color: "#F59E0B",
    avatar: "/avatar-tgd-neutral.webp",
    desc: "You don't fit neatly in a box. You pick and choose your positions, frustrating both sides equally.",
    share: "I scored as The Independent 🟡 — take The Great Divide and find out your political bias!",
  },
  {
    min: 56, max: 70,
    label: "The Center-Right Moderate",
    color: "#F97316",
    avatar: "/avatar-tgd-center-right.webp",
    desc: "You lean right but you're not extreme. Fiscal responsibility and personal freedom define your worldview.",
    share: "I scored as The Center-Right Moderate 🟠 — take The Great Divide and find out your political bias!",
  },
  {
    min: 71, max: 85,
    label: "The Conservative",
    color: "#EF4444",
    avatar: "/avatar-tgd-right.webp",
    desc: "You're firmly on the right. Traditional values, limited government, and free markets define your politics.",
    share: "I scored as The Conservative 🔴 — take The Great Divide and find out your political bias!",
  },
  {
    min: 86, max: 100,
    label: "The MAGA Loyalist",
    color: "#B91C1C",
    avatar: "/avatar-tgd-far-right.webp",
    desc: "You're all-in on the populist right. You distrust institutions, love America loud, and don't apologize for it.",
    share: "I scored as The MAGA Loyalist 🔴 — take The Great Divide and find out your political bias!",
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pickQuestions() {
  const TOTAL = 15;
  const TARGETS = { DEM: 3, PROG: 2, CON: 3, LIB: 2, POP: 2, NEU: 3 };
  const shuffled = [...Q].sort(() => Math.random() - 0.5);
  const counts   = { DEM: 0, PROG: 0, CON: 0, LIB: 0, POP: 0, NEU: 0 };
  const picked   = [];
  const usedIds  = new Set();

  for (const q of shuffled) {
    if (picked.length >= TOTAL) break;
    const uniq   = [...new Set(q.B.bias)];
    const useful = uniq.some(b => (counts[b] ?? 0) < (TARGETS[b] ?? 2));
    if (useful) {
      picked.push(q);
      usedIds.add(q.id);
      uniq.forEach(b => { if (b in counts) counts[b]++; });
    }
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
    if (!bPartBias) return;
    if (LEFT_BIASES.includes(bPartBias))  left++;
    if (RIGHT_BIASES.includes(bPartBias)) right++;
  });
  const total = left + right;
  if (total === 0) return 50;
  return Math.round((right / total) * 100);
}

function calcTotalScore(answers) {
  return answers.reduce((sum, a) => {
    let pts = 15; // Part B always +15 for engaging
    if (a.aPartChoice === a.aPartCorrect) pts += 15;
    return sum + pts;
  }, 0);
}

function getResult(gauge) {
  return ARCHETYPES.find(a => gauge >= a.min && gauge <= a.max) ?? ARCHETYPES[3];
}

function getGaugeSegmentColor(i, total = 40) {
  const t = i / (total - 1);
  let h, s, l;
  if (t < 0.45) {
    const tt = t / 0.45;
    h = 217 + (174 - 217) * tt;
    s = 72;
    l = 48 + 5 * tt;
  } else if (t < 0.55) {
    const tt = (t - 0.45) / 0.10;
    h = 174 + (38 - 174) * tt;
    s = 72 + (90 - 72) * tt;
    l = 53 + (48 - 53) * tt;
  } else {
    const tt = (t - 0.55) / 0.45;
    h = 38 - 38 * tt;
    s = 90 + (68 - 90) * tt;
    l = 48 + (40 - 48) * tt;
  }
  return `hsl(${Math.round(h)},${Math.round(s)}%,${Math.round(l)}%)`;
}

function trackEvent(name, params = {}) {
  try { if (typeof gtag === "function") gtag("event", name, params); } catch (_) {}
}

async function generateShareCanvas(gauge, archetype, score) {
  const W = 1200, H = 630;
  const canvas = document.createElement("canvas");
  canvas.width  = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#0F1221";
  ctx.fillRect(0, 0, W, H);

  // Surface card
  ctx.fillStyle = "#1A1D2E";
  ctx.beginPath();
  ctx.roundRect(60, 60, W - 120, H - 120, 24);
  ctx.fill();

  // Top gradient bar
  const topGrad = ctx.createLinearGradient(60, 0, W - 60, 0);
  topGrad.addColorStop(0,   "#1A56DB");
  topGrad.addColorStop(0.5, "#F59E0B");
  topGrad.addColorStop(1,   "#B91C1C");
  ctx.fillStyle = topGrad;
  ctx.beginPath();
  ctx.roundRect(60, 60, W - 120, 8, [24, 24, 0, 0]);
  ctx.fill();

  // Title
  ctx.fillStyle = "#94A3B8";
  ctx.font = "bold 32px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("THE GREAT DIVIDE", W / 2, 140);

  // Archetype
  ctx.fillStyle = archetype.color;
  ctx.font = "bold 68px sans-serif";
  ctx.fillText(archetype.label.toUpperCase(), W / 2, 250);

  // Description
  ctx.fillStyle = "#CBD5E1";
  ctx.font = "28px sans-serif";
  const words  = archetype.desc.split(" ");
  let line = "", lines = [], maxW = 900;
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line); line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  lines.slice(0, 2).forEach((l, i) => ctx.fillText(l, W / 2, 305 + i * 38));

  // Score
  ctx.fillStyle = "#F59E0B";
  ctx.font = "bold 40px sans-serif";
  ctx.fillText(`${score} / 450 pts`, W / 2, 420);

  // Gauge bar
  const bX = 150, bY = 460, bW = W - 300, bH = 28;
  ctx.fillStyle = "#0F1221";
  ctx.fillRect(bX, bY, bW, bH);
  const barGrad = ctx.createLinearGradient(bX, 0, bX + bW, 0);
  barGrad.addColorStop(0,    "#1A56DB");
  barGrad.addColorStop(0.45, "#14B8A6");
  barGrad.addColorStop(0.5,  "#F59E0B");
  barGrad.addColorStop(0.7,  "#F97316");
  barGrad.addColorStop(1,    "#B91C1C");
  ctx.fillStyle = barGrad;
  ctx.fillRect(bX, bY, bW, bH);
  const needleX = bX + (gauge / 100) * bW;
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(needleX - 3, bY - 12, 6, bH + 24);

  ctx.fillStyle = "#64748B";
  ctx.font = "22px sans-serif";
  ctx.textAlign = "left";  ctx.fillText("← LEFT", bX, bY + bH + 30);
  ctx.textAlign = "right"; ctx.fillText("RIGHT →", bX + bW, bY + bH + 30);

  // URL
  ctx.fillStyle = "#F59E0B";
  ctx.font = "bold 30px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("thegreatdivide.xyz", W / 2, 590);

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
      ::-webkit-scrollbar{width:6px}
      ::-webkit-scrollbar-track{background:#0f1221}
      ::-webkit-scrollbar-thumb{background:#2D3154;border-radius:3px}
      @keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
      @keyframes progressBar{from{width:0}to{width:100%}}
      .fade-in{animation:fadeIn .35s ease both}
      @media(max-width:640px){
        .hide-mobile{display:none!important}
      }
    `}</style>
  );
}

// ─── DivideOMeterGauge ────────────────────────────────────────────────────────

function DivideOMeterGauge({ gauge, size = 300 }) {
  const cx = 150, cy = 130, R = 118, r = 84, N = 40, GAP = 0.5;
  const result = getResult(gauge);

  const segments = Array.from({ length: N }, (_, i) => {
    const s0 = 180 - i * (180 / N) - GAP / 2;
    const e0 = 180 - (i + 1) * (180 / N) + GAP / 2;
    const sr = (s0 * Math.PI) / 180;
    const er = (e0 * Math.PI) / 180;
    const x1o = cx + R * Math.cos(sr), y1o = cy - R * Math.sin(sr);
    const x2o = cx + R * Math.cos(er), y2o = cy - R * Math.sin(er);
    const x2i = cx + r * Math.cos(er), y2i = cy - r * Math.sin(er);
    const x1i = cx + r * Math.cos(sr), y1i = cy - r * Math.sin(sr);
    const d = `M${x1o.toFixed(1)} ${y1o.toFixed(1)} A${R} ${R} 0 0 0 ${x2o.toFixed(1)} ${y2o.toFixed(1)} L${x2i.toFixed(1)} ${y2i.toFixed(1)} A${r} ${r} 0 0 1 ${x1i.toFixed(1)} ${y1i.toFixed(1)}Z`;
    return { d, color: getGaugeSegmentColor(i) };
  });

  const ndeg = 180 - (gauge / 100) * 180;
  const nrad = (ndeg * Math.PI) / 180;
  const nx = cx + 76 * Math.cos(nrad);
  const ny = cy - 76 * Math.sin(nrad);

  return (
    <svg viewBox="0 0 300 155" style={{ width: "100%", maxWidth: size, display: "block" }}
      aria-label={`Divide-O-Meter: ${gauge} — ${result.label}`}>
      {segments.map(({ d, color }, i) => (
        <path key={i} d={d} fill={color} />
      ))}
      <line x1={cx} y1={cy} x2={nx.toFixed(1)} y2={ny.toFixed(1)}
        stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="8" fill="#1A1D2E" stroke="#fff" strokeWidth="2" />
      <circle cx={cx} cy={cy} r="4" fill={result.color} />
      <text x="22" y="150" fill="#64748B" fontSize="10" fontFamily="'DM Mono',monospace">LEFT</text>
      <text x="278" y="150" fill="#64748B" fontSize="10" fontFamily="'DM Mono',monospace" textAnchor="end">RIGHT</text>
    </svg>
  );
}

// ─── HomeScreen ───────────────────────────────────────────────────────────────

function HomeScreen({ onPlay, onHowTo, onDebate, onContact }) {
  const mobile = window.innerWidth < 640;

  return (
    <div style={{ minHeight: "100vh", background: "#0f1221", display: "flex", flexDirection: "column" }}>
      {/* Hero */}
      <div style={{ position: "relative", width: "100%", height: mobile ? 260 : 420, overflow: "hidden", flexShrink: 0 }}>
        <img
          src={mobile ? "/tgd-capitol-hero-mobile.webp" : "/tgd-capitol-hero-desktop.webp"}
          alt="U.S. Capitol"
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }}
        />
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, rgba(15,18,33,0) 40%, #0f1221 100%)",
        }} />
        <div style={{ position: "absolute", top: 24, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
          <img src="/tgd-logo-primary.webp" alt="The Great Divide" style={{ height: mobile ? 52 : 68, width: "auto" }} />
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: mobile ? "32px 20px 40px" : "40px 24px 60px", maxWidth: 560, margin: "0 auto", width: "100%" }}>
        <h1 style={{ fontFamily: "'Anton',sans-serif", fontSize: mobile ? 38 : 52, letterSpacing: ".5px", textAlign: "center", lineHeight: 1.1, marginBottom: 12 }}>
          HOW BIASED<br />ARE YOU?
        </h1>
        <p style={{ color: "#94A3B8", fontSize: 16, textAlign: "center", lineHeight: 1.6, marginBottom: 36, maxWidth: 400 }}>
          15 questions. No filter. At the end: your <strong style={{ color: "#F59E0B" }}>Divide-O-Meter</strong> score and your political archetype.
        </p>

        <button
          onClick={() => { trackEvent("game_start", { mode: "solo" }); onPlay(); }}
          style={{
            width: "100%", padding: "18px 0", borderRadius: 12,
            background: "linear-gradient(135deg, #1A56DB, #1e40af)",
            color: "#fff", fontFamily: "'Anton',sans-serif", fontSize: 22,
            letterSpacing: "1px", marginBottom: 14,
            boxShadow: "0 4px 24px rgba(26,86,219,.4)",
            transition: "transform .15s",
          }}
          onMouseEnter={e => e.currentTarget.style.transform = "scale(1.02)"}
          onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
        >
          FIND OUT NOW
        </button>

        <button
          onClick={() => { trackEvent("game_start", { mode: "debate" }); onDebate(); }}
          style={{
            width: "100%", padding: "15px 0", borderRadius: 12,
            background: "rgba(224,36,36,.12)", border: "1.5px solid rgba(224,36,36,.35)",
            color: "#F87171", fontFamily: "'Anton',sans-serif", fontSize: 18,
            letterSpacing: "1px", marginBottom: 24,
          }}
        >
          DEBATE MODE — PLAY WITH FRIENDS
        </button>

        <button
          onClick={onHowTo}
          style={{ background: "none", color: "#64748B", fontSize: 14, textDecoration: "underline", padding: 8 }}
        >
          How to Play
        </button>
      </div>

      <div style={{ textAlign: "center", padding: "16px 24px", borderTop: "1px solid #1A1D2E" }}>
        <button onClick={onContact} style={{ background: "none", color: "#475569", fontSize: 12 }}>
          Contact
        </button>
      </div>
    </div>
  );
}

// ─── HowToPlayScreen ──────────────────────────────────────────────────────────

function HowToPlayScreen({ onBack, onPlay }) {
  const mobile = window.innerWidth < 640;

  const steps = [
    {
      icon: "📋",
      title: "Part A — Fact Check",
      desc: "Every question starts with a factual statement about U.S. politics. Answer correctly and earn 15 points.",
    },
    {
      icon: "🧠",
      title: "Part B — Bias Reveal",
      desc: "Then comes the twist: a follow-up that reveals your political lean. There's no wrong answer — just +15 pts for engaging.",
    },
    {
      icon: "📊",
      title: "Your Divide-O-Meter",
      desc: "After 15 questions, your answers map to a political spectrum from far-left to far-right. One of 7 archetypes awaits.",
    },
    {
      icon: "📤",
      title: "Challenge Your Friends",
      desc: "Share your result and see where they land. Use Debate Mode to play simultaneously and compare scores live.",
    },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0f1221", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", padding: "20px 20px 0", borderBottom: "1px solid #1A1D2E" }}>
        <button onClick={onBack} style={{ background: "none", color: "#94A3B8", fontSize: 14, padding: "8px 0", marginRight: "auto" }}>
          ← Back
        </button>
        <img src="/tgd-logo-mono.webp" alt="TGD" style={{ height: 32, marginRight: "auto" }} />
      </div>

      <div style={{ flex: 1, padding: mobile ? "32px 20px 40px" : "40px 24px 60px", maxWidth: 560, margin: "0 auto", width: "100%" }}>
        <h1 style={{ fontFamily: "'Anton',sans-serif", fontSize: mobile ? 34 : 44, marginBottom: 32 }}>HOW TO PLAY</h1>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 40 }}>
          {steps.map(({ icon, title, desc }) => (
            <div key={title} style={{ background: "#1A1D2E", borderRadius: 12, padding: "20px 20px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
                <span style={{ fontSize: 28, flexShrink: 0 }}>{icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{title}</div>
                  <div style={{ color: "#94A3B8", fontSize: 14, lineHeight: 1.6 }}>{desc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: "#252840", borderRadius: 12, padding: 20, marginBottom: 32, textAlign: "center" }}>
          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, color: "#94A3B8", marginBottom: 8 }}>MAX SCORE</div>
          <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 36, color: "#F59E0B" }}>450 pts</div>
          <div style={{ color: "#64748B", fontSize: 12, marginTop: 4 }}>15 questions × 30 pts each</div>
        </div>

        <button
          onClick={onPlay}
          style={{
            width: "100%", padding: "18px 0", borderRadius: 12,
            background: "linear-gradient(135deg, #1A56DB, #1e40af)",
            color: "#fff", fontFamily: "'Anton',sans-serif", fontSize: 22, letterSpacing: "1px",
          }}
        >
          LET'S PLAY
        </button>
      </div>
    </div>
  );
}

// ─── GameScreen ───────────────────────────────────────────────────────────────

function GameScreen({ onComplete, onQuit }) {
  const [questions]   = useState(() => pickQuestions());
  const [qIndex,   setQIndex]   = useState(0);
  const [part,     setPart]     = useState("A");
  const [selected, setSelected] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [inTransition, setInTransition] = useState(false);
  const [transitionBias, setTransitionBias] = useState(null);
  const [answers,  setAnswers]  = useState([]);
  const [score,    setScore]    = useState(0);
  const timerRef   = useRef(null);
  const answersRef = useRef([]);
  useEffect(() => { answersRef.current = answers; }, [answers]);

  const q    = questions[qIndex];
  const mobile = window.innerWidth < 640;

  useEffect(() => () => clearTimeout(timerRef.current), []);

  function handleSelectA(idx) {
    if (confirmed) return;
    setSelected(idx);
  }

  function handleSelectB(idx) {
    if (confirmed) return;
    setSelected(idx);
  }

  function handleConfirmB() {
    if (selected === null || confirmed) return;
    setConfirmed(true);
    const bias = q.B.bias[selected] ?? "NEU";
    setScore(s => s + 15);
    trackEvent("question_answered", { part: "B", q_id: q.id, bias });

    setAnswers(prev => {
      const updated = [...prev];
      updated[qIndex] = { ...updated[qIndex], bPartChoice: selected, bPartBias: bias };
      return updated;
    });

    setTransitionBias(bias);
    timerRef.current = setTimeout(() => {
      setInTransition(true);
    }, 700);
  }

  // Store A answer when confirming A
  function handleConfirmAWithStore() {
    if (selected === null || confirmed) return;
    setConfirmed(true);
    const pts = selected === q.A.ans ? 15 : 0;
    setScore(s => s + pts);
    setAnswers(prev => {
      const updated = [...prev];
      updated[qIndex] = { aPartChoice: selected, aPartCorrect: q.A.ans, bPartChoice: null, bPartBias: null };
      return updated;
    });
    trackEvent("question_answered", { part: "A", q_id: q.id, correct: selected === q.A.ans });
    timerRef.current = setTimeout(() => {
      setPart("B");
      setSelected(null);
      setConfirmed(false);
    }, 900);
  }

  function handleTransitionDone() {
    clearTimeout(timerRef.current);
    setInTransition(false);
    const nextIndex = qIndex + 1;
    if (nextIndex >= questions.length) {
      onComplete(answersRef.current.map((a, i) => ({
        ...a,
        aPartCorrect: questions[i].A.ans,
      })));
    } else {
      setQIndex(nextIndex);
      setPart("A");
      setSelected(null);
      setConfirmed(false);
      setTransitionBias(null);
    }
  }

  useEffect(() => {
    if (inTransition) {
      timerRef.current = setTimeout(handleTransitionDone, 1800);
    }
    return () => clearTimeout(timerRef.current);
  }, [inTransition]);

  // ── TransitionScreen ────────────────────────────────────────────────────────
  if (inTransition && transitionBias) {
    const badge = BIAS_META[transitionBias] ?? { label: transitionBias, color: "#64748B" };
    const isLeft  = LEFT_BIASES.includes(transitionBias);
    const isRight = RIGHT_BIASES.includes(transitionBias);
    return (
      <div
        onClick={handleTransitionDone}
        style={{
          minHeight: "100vh", background: "#0f1221",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: 24, cursor: "pointer", userSelect: "none",
        }}
      >
        <div className="fade-in" style={{ textAlign: "center" }}>
          <div style={{ color: "#64748B", fontFamily: "'DM Mono',monospace", fontSize: 12, letterSpacing: 2, marginBottom: 20, textTransform: "uppercase" }}>
            Your answer leans
          </div>
          <div style={{
            display: "inline-block", padding: "10px 28px", borderRadius: 40,
            background: badge.color + "22", border: `2px solid ${badge.color}`,
            color: badge.color, fontFamily: "'Anton',sans-serif",
            fontSize: mobile ? 32 : 44, letterSpacing: 2, marginBottom: 24,
          }}>
            {badge.label.toUpperCase()}
          </div>
          {(isLeft || isRight) && (
            <div style={{ color: "#64748B", fontSize: 14 }}>
              {isLeft ? "← Left of center" : "Right of center →"}
            </div>
          )}
          {!isLeft && !isRight && (
            <div style={{ color: "#64748B", fontSize: 14 }}>Neutral position</div>
          )}
          <div style={{ marginTop: 40, color: "#475569", fontSize: 12 }}>
            {qIndex + 1 < questions.length ? `Question ${qIndex + 2} of ${questions.length} coming up…` : "Calculating your result…"}
          </div>
          {/* Progress bar */}
          <div style={{ marginTop: 16, width: 200, height: 3, background: "#1A1D2E", borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              height: "100%", background: badge.color, borderRadius: 2,
              animation: "progressBar 1.8s linear forwards",
            }} />
          </div>
        </div>
      </div>
    );
  }

  // ── Game UI ─────────────────────────────────────────────────────────────────
  const progress = ((qIndex + (part === "B" ? 0.5 : 0)) / questions.length) * 100;
  const isPartA  = part === "A";
  const opts     = isPartA ? q.A.opts : q.B.opts;

  function getOptionStyle(idx) {
    const base = {
      width: "100%", padding: "14px 16px", borderRadius: 10,
      background: "#1A1D2E", border: "1.5px solid #252840",
      color: "#F8FAFC", fontSize: 15, textAlign: "left",
      lineHeight: 1.5, transition: "border-color .15s, background .15s",
      marginBottom: 10,
    };
    if (!confirmed) {
      if (selected === idx) {
        return { ...base, border: "1.5px solid #1A56DB", background: "#1A56DB18" };
      }
      return base;
    }
    // Part A feedback
    if (isPartA) {
      if (idx === q.A.ans) return { ...base, border: "1.5px solid #22C55E", background: "#22C55E18", color: "#86EFAC" };
      if (idx === selected && idx !== q.A.ans) return { ...base, border: "1.5px solid #E02424", background: "#E0242418", color: "#FCA5A5" };
    }
    // Part B feedback
    if (!isPartA) {
      if (idx === selected) {
        const bc = BIAS_META[q.B.bias[idx]]?.color ?? "#F59E0B";
        return { ...base, border: `1.5px solid ${bc}`, background: bc + "18" };
      }
    }
    return base;
  }

  const partColor = isPartA ? "#1A56DB" : "#F59E0B";

  return (
    <div style={{ minHeight: "100vh", background: "#0f1221", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px 0", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onQuit} style={{ background: "none", color: "#475569", fontSize: 13, padding: "4px 0" }}>✕</button>
        <div style={{ flex: 1, height: 4, background: "#1A1D2E", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: partColor, borderRadius: 2, transition: "width .4s ease" }} />
        </div>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: "#64748B", whiteSpace: "nowrap" }}>
          {qIndex + 1} / {questions.length}
        </div>
      </div>

      {/* Score */}
      <div style={{ padding: "8px 20px 0", display: "flex", justifyContent: "flex-end" }}>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: "#94A3B8" }}>
          <span style={{ color: "#F59E0B", fontWeight: 600 }}>{score}</span> pts
        </div>
      </div>

      {/* Question area */}
      <div style={{ flex: 1, padding: mobile ? "24px 20px 32px" : "32px 24px 40px", maxWidth: 600, margin: "0 auto", width: "100%" }}>
        {/* Part badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{
            padding: "4px 12px", borderRadius: 20,
            background: partColor + "20", border: `1px solid ${partColor}40`,
            color: partColor, fontSize: 11, fontFamily: "'DM Mono',monospace", letterSpacing: 1,
          }}>
            {isPartA ? "PART A — FACT CHECK" : "PART B — BIAS REVEAL"}
          </div>
          <div style={{ fontSize: 12, color: "#475569", fontFamily: "'DM Mono',monospace" }}>
            {q.title}
          </div>
        </div>

        <h2 className="fade-in" key={`q-${qIndex}-${part}`} style={{
          fontSize: mobile ? 17 : 20, fontWeight: 600, lineHeight: 1.5,
          marginBottom: 24, color: "#F8FAFC",
        }}>
          {isPartA ? q.A.q : q.B.q}
        </h2>

        {/* Options */}
        <div>
          {opts.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => isPartA ? handleSelectA(idx) : handleSelectB(idx)}
              disabled={confirmed}
              style={getOptionStyle(idx)}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <span style={{
                  flexShrink: 0, width: 24, height: 24, borderRadius: 6,
                  background: selected === idx ? partColor : "#252840",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontFamily: "'DM Mono',monospace", color: selected === idx ? "#fff" : "#64748B",
                }}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <span style={{ flex: 1 }}>{opt}</span>
                {/* Bias badge on Part B when confirmed */}
                {!isPartA && confirmed && idx === selected && (
                  <span style={{
                    flexShrink: 0, padding: "2px 8px", borderRadius: 10, fontSize: 11,
                    background: (BIAS_META[q.B.bias[idx]]?.color ?? "#64748B") + "30",
                    color: BIAS_META[q.B.bias[idx]]?.color ?? "#64748B",
                    fontFamily: "'DM Mono',monospace",
                  }}>
                    {BIAS_META[q.B.bias[idx]]?.label ?? q.B.bias[idx]}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Explanation hint for Part A when confirmed */}
        {isPartA && confirmed && selected !== q.A.ans && (
          <div style={{ marginTop: 8, padding: "12px 14px", background: "#22C55E12", borderRadius: 8, border: "1px solid #22C55E30" }}>
            <span style={{ color: "#86EFAC", fontSize: 13 }}>
              Correct answer: <strong>{String.fromCharCode(65 + q.A.ans)}</strong> — {q.A.opts[q.A.ans]}
            </span>
          </div>
        )}

        {/* Confirm button */}
        {selected !== null && !confirmed && (
          <button
            onClick={isPartA ? handleConfirmAWithStore : handleConfirmB}
            className="fade-in"
            style={{
              marginTop: 20, width: "100%", padding: "16px 0", borderRadius: 12,
              background: partColor, color: "#fff",
              fontFamily: "'Anton',sans-serif", fontSize: 20, letterSpacing: "1px",
            }}
          >
            CONFIRM
          </button>
        )}

        {/* Points earned feedback */}
        {isPartA && confirmed && (
          <div style={{ marginTop: 12, textAlign: "center", color: selected === q.A.ans ? "#22C55E" : "#64748B", fontFamily: "'DM Mono',monospace", fontSize: 13 }}>
            {selected === q.A.ans ? "+15 pts ✓" : "+0 pts"}
          </div>
        )}
        {!isPartA && confirmed && (
          <div style={{ marginTop: 12, textAlign: "center", color: "#F59E0B", fontFamily: "'DM Mono',monospace", fontSize: 13 }}>
            +15 pts — bias recorded
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DivideOmeterCard ─────────────────────────────────────────────────────────

function DivideOmeterCard({ answers, onPlayAgain, onContact }) {
  const mobile  = window.innerWidth < 640;
  const gauge   = calcDivideOMeter(answers);
  const score   = calcTotalScore(answers);
  const result  = getResult(gauge);
  const [sharing, setSharing] = useState(false);
  const [copied,  setCopied]  = useState(false);

  useEffect(() => {
    trackEvent("game_complete", { gauge, archetype: result.label, score });
  }, []);

  // Bias breakdown
  const biasCounts = {};
  answers.forEach(({ bPartBias }) => {
    if (bPartBias) biasCounts[bPartBias] = (biasCounts[bPartBias] ?? 0) + 1;
  });
  const biasEntries = Object.entries(biasCounts).sort((a, b) => b[1] - a[1]);

  async function handleShare() {
    setSharing(true);
    trackEvent("share_click", { archetype: result.label });
    try {
      const canvas = await generateShareCanvas(gauge, result, score);
      const shareUrl = "https://thegreatdivide.xyz";
      const shareText = result.share + " " + shareUrl;

      if (navigator.canShare?.({ files: [] })) {
        canvas.toBlob(async (blob) => {
          const file = new File([blob], "my-divide-o-meter.png", { type: "image/png" });
          try {
            await navigator.share({ title: "The Great Divide", text: shareText, files: [file] });
            trackEvent("share_success", { method: "native_file" });
          } catch {
            await fallbackShare(shareText, canvas);
          }
        }, "image/png");
      } else if (navigator.share) {
        await navigator.share({ title: "The Great Divide", text: shareText });
        trackEvent("share_success", { method: "native_text" });
      } else {
        await fallbackShare(shareText, canvas);
      }
    } catch (_) {}
    setSharing(false);
  }

  async function fallbackShare(shareText, canvas) {
    if (canvas) {
      canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a   = document.createElement("a");
        a.href    = url;
        a.download = "my-divide-o-meter.png";
        a.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (_) {}
    trackEvent("share_success", { method: "fallback" });
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f1221", display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Logo */}
      <div style={{ padding: "20px 20px 0", width: "100%", maxWidth: 560, display: "flex", justifyContent: "center" }}>
        <img src="/tgd-logo-mono.webp" alt="TGD" style={{ height: 36 }} />
      </div>

      <div style={{ flex: 1, padding: mobile ? "24px 20px 40px" : "32px 24px 60px", maxWidth: 560, margin: "0 auto", width: "100%" }}>
        <div className="fade-in" style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ color: "#64748B", fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>
            YOUR DIVIDE-O-METER
          </div>
          <DivideOMeterGauge gauge={gauge} size={320} />
          <div style={{ marginTop: 8, fontFamily: "'DM Mono',monospace", fontSize: 13, color: "#94A3B8" }}>
            <span style={{ color: "#1A56DB" }}>LEFT</span>
            <span style={{ padding: "0 12px", color: "#475569" }}>←——→</span>
            <span style={{ color: "#E02424" }}>RIGHT</span>
          </div>
        </div>

        {/* Avatar + Archetype */}
        <div style={{ background: "#1A1D2E", borderRadius: 16, padding: 24, marginBottom: 16, textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <img
              src={result.avatar}
              alt={result.label}
              style={{ width: 80, height: 80, borderRadius: "50%", border: `3px solid ${result.color}`, objectFit: "cover" }}
            />
          </div>
          <div style={{ color: "#64748B", fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>
            YOUR ARCHETYPE
          </div>
          <h2 style={{ fontFamily: "'Anton',sans-serif", fontSize: mobile ? 26 : 32, color: result.color, letterSpacing: ".5px", marginBottom: 10 }}>
            {result.label.toUpperCase()}
          </h2>
          <p style={{ color: "#94A3B8", fontSize: 14, lineHeight: 1.7 }}>
            {result.desc}
          </p>
        </div>

        {/* Score */}
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, background: "#1A1D2E", borderRadius: 12, padding: "16px", textAlign: "center" }}>
            <div style={{ color: "#64748B", fontSize: 11, fontFamily: "'DM Mono',monospace", marginBottom: 4 }}>SCORE</div>
            <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 28, color: "#F59E0B" }}>{score}</div>
            <div style={{ color: "#475569", fontSize: 11, fontFamily: "'DM Mono',monospace" }}>/ 450 pts</div>
          </div>
          <div style={{ flex: 1, background: "#1A1D2E", borderRadius: 12, padding: "16px", textAlign: "center" }}>
            <div style={{ color: "#64748B", fontSize: 11, fontFamily: "'DM Mono',monospace", marginBottom: 4 }}>GAUGE</div>
            <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 28, color: result.color }}>{gauge}</div>
            <div style={{ color: "#475569", fontSize: 11, fontFamily: "'DM Mono',monospace" }}>/ 100</div>
          </div>
        </div>

        {/* Bias breakdown */}
        {biasEntries.length > 0 && (
          <div style={{ background: "#1A1D2E", borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ color: "#64748B", fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 2, marginBottom: 14 }}>
              BIAS BREAKDOWN
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {biasEntries.map(([bias, count]) => {
                const meta = BIAS_META[bias] ?? { label: bias, color: "#64748B" };
                const pct  = Math.round((count / answers.length) * 100);
                return (
                  <div key={bias}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 13, color: meta.color, fontFamily: "'DM Mono',monospace" }}>{meta.label}</span>
                      <span style={{ fontSize: 12, color: "#64748B", fontFamily: "'DM Mono',monospace" }}>{count}x ({pct}%)</span>
                    </div>
                    <div style={{ height: 6, background: "#252840", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: meta.color, borderRadius: 3 }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Share */}
        <button
          onClick={handleShare}
          disabled={sharing}
          style={{
            width: "100%", padding: "16px 0", borderRadius: 12, marginBottom: 12,
            background: "linear-gradient(135deg, #1A56DB, #1e40af)",
            color: "#fff", fontFamily: "'Anton',sans-serif", fontSize: 20, letterSpacing: "1px",
            opacity: sharing ? 0.7 : 1,
          }}
        >
          {sharing ? "GENERATING…" : copied ? "LINK COPIED! ✓" : "📤  SHARE YOUR RESULT"}
        </button>

        <button
          onClick={onPlayAgain}
          style={{
            width: "100%", padding: "14px 0", borderRadius: 12,
            background: "none", border: "1.5px solid #252840",
            color: "#94A3B8", fontFamily: "'Anton',sans-serif", fontSize: 18, letterSpacing: "1px",
          }}
        >
          PLAY AGAIN
        </button>

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <button onClick={onContact} style={{ background: "none", color: "#475569", fontSize: 12, textDecoration: "underline" }}>
            Contact
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ContactModal ─────────────────────────────────────────────────────────────

function ContactModal({ onClose }) {
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20,
      }}
    >
      <div className="fade-in" style={{ background: "#1A1D2E", borderRadius: 16, padding: 32, maxWidth: 440, width: "100%", border: "1px solid #252840" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontFamily: "'Anton',sans-serif", fontSize: 22 }}>CONTACT</h3>
          <button onClick={onClose} style={{ background: "none", color: "#64748B", fontSize: 20 }}>✕</button>
        </div>
        <p style={{ color: "#94A3B8", fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>
          Questions, feedback, or press inquiries? We'd love to hear from you.
        </p>
        <a
          href="mailto:hello@thegreatdivide.xyz"
          style={{
            display: "block", width: "100%", padding: "14px 0", borderRadius: 10,
            background: "linear-gradient(135deg, #1A56DB, #1e40af)",
            color: "#fff", fontFamily: "'Anton',sans-serif", fontSize: 18, textAlign: "center",
          }}
        >
          EMAIL US
        </a>
        <div style={{ marginTop: 16, textAlign: "center" }}>
          <a href="https://thegreatdivide.xyz" style={{ color: "#64748B", fontSize: 13 }}>
            thegreatdivide.xyz
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── DebateStartScreen ────────────────────────────────────────────────────────

function DebateStartScreen({ onBack, onHostGame, onJoinGame }) {
  const mobile = window.innerWidth < 640;
  const [tab,      setTab]      = useState("host"); // "host" | "join"
  const [name,     setName]     = useState("");
  const [code,     setCode]     = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  async function handleCreate() {
    if (!name.trim()) { setError("Please enter your name."); return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${PROXY_URL}/debate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ host: name.trim() }) });
      const data = await res.json();
      if (!data.code) throw new Error("No room code returned");
      trackEvent("debate_create", { code: data.code });
      onHostGame({ code: data.code, hostName: name.trim(), ...data });
    } catch (err) {
      setError("Could not create room. Try again.");
    }
    setLoading(false);
  }

  async function handleJoin() {
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (!code.trim()) { setError("Please enter the room code."); return; }
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${PROXY_URL}/debate/${code.trim().toUpperCase()}/join`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      trackEvent("debate_join", { code: code.trim() });
      onJoinGame({ code: code.trim().toUpperCase(), playerName: name.trim(), ...data });
    } catch (err) {
      setError(err.message || "Could not join room. Check the code.");
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f1221", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "20px 20px 0", display: "flex", alignItems: "center" }}>
        <button onClick={onBack} style={{ background: "none", color: "#94A3B8", fontSize: 14, padding: "8px 0" }}>← Back</button>
      </div>

      <div style={{ flex: 1, padding: mobile ? "24px 20px 40px" : "32px 24px", maxWidth: 480, margin: "0 auto", width: "100%" }}>
        <h1 style={{ fontFamily: "'Anton',sans-serif", fontSize: mobile ? 32 : 42, marginBottom: 8 }}>DEBATE MODE</h1>
        <p style={{ color: "#64748B", fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
          Play with friends. Same 15 questions, compared side by side.
        </p>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {["host", "join"].map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(""); }}
              style={{
                flex: 1, padding: "12px 0", borderRadius: 10,
                background: tab === t ? "#1A56DB" : "#1A1D2E",
                border: tab === t ? "none" : "1px solid #252840",
                color: tab === t ? "#fff" : "#64748B",
                fontFamily: "'Anton',sans-serif", fontSize: 16, letterSpacing: "1px",
              }}
            >
              {t === "host" ? "CREATE ROOM" : "JOIN ROOM"}
            </button>
          ))}
        </div>

        <div style={{ background: "#1A1D2E", borderRadius: 14, padding: 24 }}>
          <label style={{ display: "block", marginBottom: 16 }}>
            <div style={{ color: "#64748B", fontSize: 12, fontFamily: "'DM Mono',monospace", marginBottom: 6 }}>YOUR NAME</div>
            <input
              value={name}
              onChange={e => { setName(e.target.value); setError(""); }}
              placeholder="Enter your name"
              maxLength={20}
              style={{
                width: "100%", padding: "12px 14px", borderRadius: 10,
                background: "#252840", border: "1px solid #2D3154",
                color: "#F8FAFC", fontSize: 16, fontFamily: "'Inter',sans-serif", outline: "none",
              }}
            />
          </label>

          {tab === "join" && (
            <label style={{ display: "block", marginBottom: 16 }}>
              <div style={{ color: "#64748B", fontSize: 12, fontFamily: "'DM Mono',monospace", marginBottom: 6 }}>ROOM CODE</div>
              <input
                value={code}
                onChange={e => { setCode(e.target.value.toUpperCase()); setError(""); }}
                placeholder="e.g. ABCD"
                maxLength={6}
                style={{
                  width: "100%", padding: "12px 14px", borderRadius: 10,
                  background: "#252840", border: "1px solid #2D3154",
                  color: "#F8FAFC", fontSize: 22, fontFamily: "'DM Mono',monospace",
                  textTransform: "uppercase", letterSpacing: 4, outline: "none",
                }}
              />
            </label>
          )}

          {error && (
            <div style={{ color: "#F87171", fontSize: 13, marginBottom: 12 }}>{error}</div>
          )}

          <button
            onClick={tab === "host" ? handleCreate : handleJoin}
            disabled={loading}
            style={{
              width: "100%", padding: "15px 0", borderRadius: 10,
              background: loading ? "#252840" : "linear-gradient(135deg, #1A56DB, #1e40af)",
              color: "#fff", fontFamily: "'Anton',sans-serif", fontSize: 18, letterSpacing: "1px",
            }}
          >
            {loading ? "CONNECTING…" : tab === "host" ? "CREATE ROOM" : "JOIN GAME"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DebateHostScreen ─────────────────────────────────────────────────────────

function DebateHostScreen({ roomData, onClose }) {
  const mobile    = window.innerWidth < 640;
  const { code, hostName } = roomData;
  const [state,    setState]   = useState("lobby"); // "lobby" | "playing" | "defend" | "done"
  const [players,  setPlayers] = useState([{ name: hostName, isHost: true }]);
  const [qIndex,   setQIndex]  = useState(0);
  const [question, setQuestion] = useState(null);
  const [hostAnswers, setHostAnswers] = useState([]);
  const [defendData,  setDefendData]  = useState(null);
  const [results,  setResults] = useState(null);
  const pollRef   = useRef(null);

  useEffect(() => {
    pollRef.current = setInterval(poll, 3000);
    return () => clearInterval(pollRef.current);
  }, [state, qIndex]);

  async function poll() {
    try {
      const res  = await fetch(`${PROXY_URL}/debate/${code}`);
      const data = await res.json();
      if (data.players) setPlayers(data.players);
      if (data.state === "playing" && data.currentQuestion !== undefined) {
        if (state === "lobby") setState("playing");
        const qs = pickQuestions();
        setQuestion(qs[data.currentQuestion] ?? null);
        setQIndex(data.currentQuestion);
      }
      if (data.state === "defend") {
        setDefendData(data.defendData);
        setState("defend");
      }
      if (data.state === "done") {
        setResults(data.results);
        setState("done");
        clearInterval(pollRef.current);
      }
    } catch (_) {}
  }

  async function startGame() {
    try {
      await fetch(`${PROXY_URL}/debate/${code}/start`, { method: "POST" });
      setState("playing");
      trackEvent("debate_start", { code, player_count: players.length });
    } catch (_) {}
  }

  function copyCode() {
    navigator.clipboard?.writeText(code);
  }

  if (state === "lobby") return (
    <div style={{ minHeight: "100vh", background: "#0f1221", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "20px 20px 0", display: "flex", alignItems: "center" }}>
        <button onClick={onClose} style={{ background: "none", color: "#94A3B8", fontSize: 14 }}>✕ Exit</button>
      </div>
      <div style={{ flex: 1, padding: mobile ? "28px 20px 40px" : "36px 24px", maxWidth: 480, margin: "0 auto", width: "100%" }}>
        <h2 style={{ fontFamily: "'Anton',sans-serif", fontSize: 34, marginBottom: 6 }}>LOBBY</h2>
        <p style={{ color: "#64748B", fontSize: 14, marginBottom: 28 }}>Share the room code with your friends.</p>

        <div
          onClick={copyCode}
          style={{
            background: "#1A1D2E", borderRadius: 14, padding: "24px", textAlign: "center", marginBottom: 24,
            border: "2px dashed #252840", cursor: "pointer",
          }}
        >
          <div style={{ color: "#64748B", fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>ROOM CODE — TAP TO COPY</div>
          <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 52, letterSpacing: 10, color: "#F59E0B" }}>{code}</div>
        </div>

        <div style={{ background: "#1A1D2E", borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ color: "#64748B", fontSize: 12, fontFamily: "'DM Mono',monospace", marginBottom: 12 }}>
            PLAYERS ({players.length})
          </div>
          {players.map((p, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < players.length - 1 ? "1px solid #252840" : "none" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#252840", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                {p.name[0]?.toUpperCase()}
              </div>
              <span style={{ fontSize: 15 }}>{p.name}</span>
              {p.isHost && <span style={{ marginLeft: "auto", fontSize: 11, color: "#F59E0B", fontFamily: "'DM Mono',monospace" }}>HOST</span>}
            </div>
          ))}
        </div>

        <button
          onClick={startGame}
          disabled={players.length < 2}
          style={{
            width: "100%", padding: "16px 0", borderRadius: 12,
            background: players.length < 2 ? "#1A1D2E" : "linear-gradient(135deg, #E02424, #991B1B)",
            color: players.length < 2 ? "#475569" : "#fff",
            fontFamily: "'Anton',sans-serif", fontSize: 22, letterSpacing: "1px",
            border: players.length < 2 ? "1px solid #252840" : "none",
          }}
        >
          {players.length < 2 ? "WAITING FOR PLAYERS…" : "START GAME"}
        </button>
      </div>
    </div>
  );

  if (state === "done" && results) {
    return <DebateResultsScreen results={results} onClose={onClose} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f1221", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
      <div style={{ fontFamily: "'DM Mono',monospace", color: "#64748B", fontSize: 13, marginBottom: 16 }}>
        Question {qIndex + 1} in progress…
      </div>
      <div style={{ color: "#94A3B8", fontSize: 14 }}>Waiting for all players to answer.</div>
      <div style={{ marginTop: 32 }}>
        <button onClick={onClose} style={{ background: "none", color: "#475569", fontSize: 13, textDecoration: "underline" }}>Exit game</button>
      </div>
    </div>
  );
}

// ─── DebatePlayerScreen ───────────────────────────────────────────────────────

function DebatePlayerScreen({ roomInfo, onClose }) {
  const mobile  = window.innerWidth < 640;
  const { code, playerName } = roomInfo;
  const [gameState, setGameState] = useState("waiting"); // "waiting" | "question" | "transition" | "done"
  const [currentQ,  setCurrentQ]  = useState(null);
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
      if (data.state === "playing" && data.currentQuestion !== undefined) {
        if (gameState === "waiting" || data.currentQuestion !== qIndex) {
          setGameState("question");
          setQIndex(data.currentQuestion);
          setCurrentQ(questions[data.currentQuestion]);
          setPart("A");
          setSelected(null);
          setConfirmed(false);
        }
      }
      if (data.state === "done") {
        setResults(data.results);
        setGameState("done");
        clearInterval(pollRef.current);
      }
    } catch (_) {}
  }

  async function submitAnswer(bPartBias) {
    try {
      await fetch(`${PROXY_URL}/debate/${code}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: playerName, qIndex, bias: bPartBias }),
      });
    } catch (_) {}
  }

  if (gameState === "waiting") return (
    <div style={{ minHeight: "100vh", background: "#0f1221", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
      <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 28, marginBottom: 12 }}>WAITING FOR HOST</div>
      <div style={{ color: "#64748B", fontSize: 14, marginBottom: 32 }}>The host will start the game shortly.</div>
      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, color: "#F59E0B", letterSpacing: 4 }}>{code}</div>
      <div style={{ marginTop: 40 }}>
        <button onClick={onClose} style={{ background: "none", color: "#475569", fontSize: 13, textDecoration: "underline" }}>Leave</button>
      </div>
    </div>
  );

  if (gameState === "done" && results) {
    return <DebateResultsScreen results={results} onClose={onClose} />;
  }

  if (!currentQ) return (
    <div style={{ minHeight: "100vh", background: "#0f1221", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#64748B", fontFamily: "'DM Mono',monospace" }}>Loading…</div>
    </div>
  );

  const opts     = part === "A" ? currentQ.A.opts : currentQ.B.opts;
  const partColor = part === "A" ? "#1A56DB" : "#F59E0B";

  function handleSelect(idx) { if (!confirmed) setSelected(idx); }

  function handleConfirm() {
    if (selected === null || confirmed) return;
    setConfirmed(true);
    if (part === "A") {
      setAnswers(prev => {
        const a = [...prev];
        a[qIndex] = { aPartChoice: selected, aPartCorrect: currentQ.A.ans, bPartChoice: null, bPartBias: null };
        return a;
      });
      setTimeout(() => { setPart("B"); setSelected(null); setConfirmed(false); }, 900);
    } else {
      const bias = currentQ.B.bias[selected] ?? "NEU";
      setAnswers(prev => {
        const a = [...prev];
        a[qIndex] = { ...(a[qIndex] || {}), bPartChoice: selected, bPartBias: bias };
        return a;
      });
      submitAnswer(bias);
      setGameState("transition");
      setTimeout(() => { setGameState("question"); }, 1800);
    }
  }

  if (gameState === "transition") {
    const lastBias = answers[qIndex]?.bPartBias;
    const badge    = BIAS_META[lastBias] ?? { label: "Neutral", color: "#64748B" };
    return (
      <div style={{ minHeight: "100vh", background: "#0f1221", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
        <div className="fade-in">
          <div style={{ color: "#64748B", fontFamily: "'DM Mono',monospace", fontSize: 12, letterSpacing: 2, marginBottom: 16 }}>YOUR ANSWER LEANS</div>
          <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 36, color: badge.color, marginBottom: 12 }}>{badge.label.toUpperCase()}</div>
          <div style={{ color: "#475569", fontSize: 13 }}>Waiting for next question…</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f1221", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "16px 20px 0", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onClose} style={{ background: "none", color: "#475569", fontSize: 13 }}>✕</button>
        <div style={{ flex: 1, height: 4, background: "#1A1D2E", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${((qIndex + (part === "B" ? 0.5 : 0)) / questions.length) * 100}%`, background: partColor, borderRadius: 2, transition: "width .4s" }} />
        </div>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, color: "#64748B" }}>{qIndex + 1} / {questions.length}</div>
      </div>

      <div style={{ flex: 1, padding: mobile ? "24px 20px 32px" : "32px 24px", maxWidth: 600, margin: "0 auto", width: "100%" }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "inline-block", padding: "4px 12px", borderRadius: 20, background: partColor + "20", border: `1px solid ${partColor}40`, color: partColor, fontSize: 11, fontFamily: "'DM Mono',monospace", letterSpacing: 1 }}>
            {part === "A" ? "PART A — FACT CHECK" : "PART B — BIAS REVEAL"}
          </div>
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.5, marginBottom: 24 }}>
          {part === "A" ? currentQ.A.q : currentQ.B.q}
        </h2>

        {opts.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => handleSelect(idx)}
            disabled={confirmed}
            style={{
              width: "100%", padding: "14px 16px", borderRadius: 10, marginBottom: 10,
              background: selected === idx ? partColor + "18" : "#1A1D2E",
              border: `1.5px solid ${selected === idx ? partColor : "#252840"}`,
              color: "#F8FAFC", fontSize: 15, textAlign: "left", lineHeight: 1.5,
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: 6, background: selected === idx ? partColor : "#252840", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: selected === idx ? "#fff" : "#64748B", fontFamily: "'DM Mono',monospace" }}>
                {String.fromCharCode(65 + idx)}
              </span>
              <span style={{ flex: 1 }}>{opt}</span>
            </div>
          </button>
        ))}

        {selected !== null && !confirmed && (
          <button
            onClick={handleConfirm}
            className="fade-in"
            style={{ marginTop: 20, width: "100%", padding: "16px 0", borderRadius: 12, background: partColor, color: "#fff", fontFamily: "'Anton',sans-serif", fontSize: 20, letterSpacing: "1px" }}
          >
            CONFIRM
          </button>
        )}
      </div>
    </div>
  );
}

// ─── DebateResultsScreen ──────────────────────────────────────────────────────

function DebateResultsScreen({ results, onClose }) {
  const mobile = window.innerWidth < 640;

  if (!results || !results.players) return (
    <div style={{ minHeight: "100vh", background: "#0f1221", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 32, marginBottom: 16 }}>GAME OVER</div>
      <button onClick={onClose} style={{ background: "none", color: "#94A3B8", fontSize: 14, textDecoration: "underline" }}>Back to Home</button>
    </div>
  );

  const sorted = [...results.players].sort((a, b) => b.score - a.score);

  return (
    <div style={{ minHeight: "100vh", background: "#0f1221", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "20px 20px 0" }}>
        <button onClick={onClose} style={{ background: "none", color: "#94A3B8", fontSize: 14 }}>← Back to Home</button>
      </div>

      <div style={{ flex: 1, padding: mobile ? "24px 20px 40px" : "32px 24px", maxWidth: 480, margin: "0 auto", width: "100%" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ color: "#64748B", fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 2, marginBottom: 8 }}>DEBATE RESULTS</div>
          <h1 style={{ fontFamily: "'Anton',sans-serif", fontSize: mobile ? 32 : 40 }}>WHO'S THE MOST BIASED?</h1>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 }}>
          {sorted.map((player, i) => {
            const gauge   = player.gauge ?? 50;
            const result  = getResult(gauge);
            const medals  = ["🥇", "🥈", "🥉"];
            return (
              <div key={player.name} style={{ background: "#1A1D2E", borderRadius: 12, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14 }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{medals[i] ?? `${i + 1}.`}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{player.name}</div>
                  <div style={{ color: result.color, fontFamily: "'DM Mono',monospace", fontSize: 11 }}>{result.label}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "'Anton',sans-serif", fontSize: 20, color: "#F59E0B" }}>{player.score ?? 0}</div>
                  <div style={{ color: "#475569", fontSize: 11, fontFamily: "'DM Mono',monospace" }}>pts</div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={onClose}
          style={{ width: "100%", padding: "16px 0", borderRadius: 12, background: "linear-gradient(135deg, #1A56DB, #1e40af)", color: "#fff", fontFamily: "'Anton',sans-serif", fontSize: 20, letterSpacing: "1px" }}
        >
          PLAY AGAIN
        </button>
      </div>
    </div>
  );
}

// ─── DefendPositionScreen ─────────────────────────────────────────────────────

function DefendPositionScreen({ data, onNext, onClose }) {
  const mobile = window.innerWidth < 640;
  const { question, answers: playerAnswers } = data ?? {};

  if (!question) return null;

  return (
    <div style={{ minHeight: "100vh", background: "#0f1221", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "20px 20px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ color: "#F59E0B", fontFamily: "'Anton',sans-serif", fontSize: 14, letterSpacing: 1 }}>DEFEND YOUR POSITION</div>
        <button onClick={onClose} style={{ background: "none", color: "#64748B", fontSize: 18 }}>✕</button>
      </div>

      <div style={{ flex: 1, padding: mobile ? "24px 20px 40px" : "32px 24px", maxWidth: 600, margin: "0 auto", width: "100%" }}>
        <div style={{ background: "#1A1D2E", borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ color: "#64748B", fontSize: 11, fontFamily: "'DM Mono',monospace", marginBottom: 8 }}>THE QUESTION</div>
          <p style={{ fontSize: 16, lineHeight: 1.6 }}>{question.B?.q}</p>
        </div>

        {playerAnswers?.map((pa, i) => {
          const bias   = question.B?.bias?.[pa.choice] ?? "NEU";
          const badge  = BIAS_META[bias] ?? { label: bias, color: "#64748B" };
          return (
            <div key={i} style={{ background: "#1A1D2E", borderRadius: 12, padding: "16px 18px", marginBottom: 12, display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#252840", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                {pa.name?.[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{pa.name}</div>
                <div style={{ color: "#94A3B8", fontSize: 14, lineHeight: 1.5 }}>
                  {question.B?.opts?.[pa.choice]}
                </div>
              </div>
              <div style={{ padding: "4px 10px", borderRadius: 8, background: badge.color + "20", color: badge.color, fontSize: 11, fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>
                {badge.label}
              </div>
            </div>
          );
        })}

        <button
          onClick={onNext}
          style={{ marginTop: 16, width: "100%", padding: "16px 0", borderRadius: 12, background: "linear-gradient(135deg, #E02424, #991B1B)", color: "#fff", fontFamily: "'Anton',sans-serif", fontSize: 20, letterSpacing: "1px" }}
        >
          NEXT QUESTION →
        </button>
      </div>
    </div>
  );
}

// ─── TheGreatDivide — main export ─────────────────────────────────────────────

export default function TheGreatDivide() {
  const [screen,      setScreen]      = useState("home");
  const [gameAnswers, setGameAnswers] = useState([]);
  const [showContact, setShowContact] = useState(false);
  const [debateRoom,  setDebateRoom]  = useState(null); // host room data
  const [debatePlayer, setDebatePlayer] = useState(null); // player join data

  function goHome() {
    setScreen("home");
    setGameAnswers([]);
    setDebateRoom(null);
    setDebatePlayer(null);
  }

  function handleGameComplete(answers) {
    setGameAnswers(answers);
    setScreen("result");
    trackEvent("game_finish", { questions: answers.length });
  }

  function handleHostGame(roomData) {
    setDebateRoom(roomData);
    setScreen("debate-host");
  }

  function handleJoinGame(roomInfo) {
    setDebatePlayer(roomInfo);
    setScreen("debate-player");
  }

  return (
    <>
      <GlobalStyles />

      {screen === "home" && (
        <HomeScreen
          onPlay={() => setScreen("game")}
          onHowTo={() => setScreen("howto")}
          onDebate={() => setScreen("debate-start")}
          onContact={() => setShowContact(true)}
        />
      )}

      {screen === "howto" && (
        <HowToPlayScreen
          onBack={() => setScreen("home")}
          onPlay={() => setScreen("game")}
        />
      )}

      {screen === "game" && (
        <GameScreen
          onComplete={handleGameComplete}
          onQuit={goHome}
        />
      )}

      {screen === "result" && (
        <DivideOmeterCard
          answers={gameAnswers}
          onPlayAgain={() => setScreen("game")}
          onContact={() => setShowContact(true)}
        />
      )}

      {screen === "debate-start" && (
        <DebateStartScreen
          onBack={() => setScreen("home")}
          onHostGame={handleHostGame}
          onJoinGame={handleJoinGame}
        />
      )}

      {screen === "debate-host" && debateRoom && (
        <DebateHostScreen
          roomData={debateRoom}
          onClose={goHome}
        />
      )}

      {screen === "debate-player" && debatePlayer && (
        <DebatePlayerScreen
          roomInfo={debatePlayer}
          onClose={goHome}
        />
      )}

      {showContact && (
        <ContactModal onClose={() => setShowContact(false)} />
      )}
    </>
  );
}
