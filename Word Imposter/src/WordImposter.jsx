import { useState, useEffect, useRef, useCallback } from "react";

const COLORS = {
  bg: "#030a03",
  bgCard: "#060f06",
  bgDeep: "#020802",
  accent: "#00cc44",
  accentBright: "#00ff46",
  accentCyan: "#00eeff",
  accentDim: "#00882e",
  textPrimary: "#a0e8a0",
  textMid: "#4a8a4a",
  textDim: "#1e4a1e",
  textFaint: "#0d2a0d",
  border: "#0d2a0d",
  borderActive: "#00cc44",
};

const WORD_PAIRS = [
  ["Apple", "Pear"], ["Dog", "Wolf"], ["Car", "Truck"], ["Beach", "Desert"],
  ["Coffee", "Tea"], ["Guitar", "Violin"], ["Football", "Rugby"], ["Pizza", "Pasta"],
  ["River", "Lake"], ["Jacket", "Coat"], ["Rain", "Snow"], ["Hospital", "Clinic"],
  ["Shark", "Dolphin"], ["Throne", "Chair"], ["Castle", "Fortress"], ["Candle", "Torch"],
  ["Whisper", "Murmur"], ["Sprint", "Jog"], ["Sword", "Knife"], ["Crown", "Tiara"],
];

const BLIND_WORDS = [
  "Lighthouse", "Avalanche", "Telescope", "Monsoon", "Cathedral",
  "Submarine", "Volcano", "Labyrinth", "Hurricane", "Compass",
  "Mirage", "Eclipse", "Glacier", "Phantom", "Horizon",
];

// ── Fonts ────────────────────────────────────────────────────────────────────
const FontLoader = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=VT323&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #030a03; }
    :root {
      --accent: #00cc44;
      --accent-bright: #00ff46;
      --accent-cyan: #00eeff;
      --bg: #030a03;
      --bg-card: #060f06;
      --bg-deep: #020802;
      --text-primary: #a0e8a0;
      --text-mid: #4a8a4a;
      --text-dim: #2a5a2a;
      --text-faint: #1a3a1a;
      --border: #0d2a0d;
      --border-active: #00cc44;
      --mono: 'Share Tech Mono', monospace;
      --display: 'VT323', monospace;
    }
    .vt { font-family: var(--display); }
    .mono { font-family: var(--mono); }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
    @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
    @keyframes fadeInFast { from{opacity:0} to{opacity:1} }
    @keyframes scanPulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
    @keyframes glitch {
      0%{transform:translateX(0)} 10%{transform:translateX(-2px)} 20%{transform:translateX(2px)}
      30%{transform:translateX(-1px)} 40%{transform:translateX(1px)} 50%{transform:translateX(0)}
      100%{transform:translateX(0)}
    }
    @keyframes decrypt {
      0%{opacity:0.3} 25%{opacity:0.7} 50%{opacity:0.5} 75%{opacity:0.9} 100%{opacity:1}
    }
    @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
    .screen-enter { animation: fadeIn 0.35s ease forwards; }
    .glitch { animation: glitch 0.4s ease; }
    .cursor {
      display: inline-block; width: 10px; height: 16px;
      background: var(--accent); vertical-align: middle;
      animation: blink 1s step-end infinite; margin-left: 3px;
    }
    .scanlines {
      position: absolute; inset: 0; pointer-events: none; z-index: 10; border-radius: 16px;
      background: repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,70,0.012) 2px,rgba(0,255,70,0.012) 4px);
    }
    .btn-primary {
      display: block; width: 100%; padding: 15px;
      background: var(--accent); color: #000;
      font-family: var(--mono); font-size: 13px; letter-spacing: 0.1em;
      border: none; border-radius: 8px; cursor: pointer;
      text-transform: uppercase; transition: background 0.15s, transform 0.1s;
    }
    .btn-primary:hover { background: var(--accent-bright); }
    .btn-primary:active { transform: scale(0.98); }
    .btn-ghost {
      display: block; width: 100%; padding: 13px;
      background: transparent; color: var(--text-mid);
      font-family: var(--mono); font-size: 12px; letter-spacing: 0.08em;
      border: 1px solid #1a3a1a; border-radius: 8px; cursor: pointer;
      text-transform: uppercase; transition: border-color 0.15s, color 0.15s;
    }
    .btn-ghost:hover { border-color: var(--accent); color: var(--accent); }
    .btn-outline {
      display: block; width: 100%; padding: 14px;
      background: transparent; color: var(--accent);
      font-family: var(--mono); font-size: 12px; letter-spacing: 0.1em;
      border: 1px solid var(--accent); border-radius: 8px; cursor: pointer;
      text-transform: uppercase; transition: background 0.15s;
    }
    .btn-outline:hover { background: rgba(0,204,68,0.08); }
    .corner { position: absolute; width: 12px; height: 12px; border-color: #1a4a1a; border-style: solid; }
    .corner-tl { top: 8px; left: 8px; border-width: 1px 0 0 1px; }
    .corner-tr { top: 8px; right: 8px; border-width: 1px 1px 0 0; }
    .corner-bl { bottom: 8px; left: 8px; border-width: 0 0 1px 1px; }
    .corner-br { bottom: 8px; right: 8px; border-width: 0 1px 1px 0; }
    input[type=text], input[type=number] {
      background: var(--bg-card); color: var(--text-primary);
      border: 1px solid #1a3a1a; border-radius: 8px;
      font-family: var(--mono); font-size: 14px;
      padding: 12px 14px; width: 100%; outline: none;
      transition: border-color 0.15s;
    }
    input[type=text]:focus, input[type=number]:focus { border-color: var(--accent); }
    input[type=text]::placeholder { color: var(--text-faint); }
    .tag {
      font-family: var(--mono); font-size: 10px; letter-spacing: 0.15em;
      text-transform: uppercase; color: var(--text-faint);
    }
    .mode-card {
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: 10px; padding: 16px 14px; cursor: pointer;
      transition: border-color 0.2s, background 0.2s;
    }
    .mode-card:hover { border-color: #1a5a1a; }
    .mode-card.active { border-color: var(--accent); background: #060f06; }
    .pip { width: 22px; height: 3px; background: #0d2a0d; border-radius: 2px; transition: background 0.3s; }
    .pip.on { background: var(--accent); }
  `}</style>
);

// ── Helpers ───────────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function useTimer() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (running) { ref.current = setInterval(() => setSeconds(s => s + 1), 1000); }
    else clearInterval(ref.current);
    return () => clearInterval(ref.current);
  }, [running]);
  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  return { seconds, fmt: fmt(seconds), start: () => setRunning(true), stop: () => setRunning(false), reset: () => { setRunning(false); setSeconds(0); } };
}

function DecryptText({ text, duration = 800 }) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%";
  const [display, setDisplay] = useState(() => text.split("").map(() => chars[Math.floor(Math.random() * chars.length)]).join(""));
  useEffect(() => {
    let frame = 0;
    const total = 20;
    const iv = setInterval(() => {
      frame++;
      setDisplay(text.split("").map((c, i) => {
        if (c === " ") return " ";
        if (frame / total > i / text.length) return c;
        return chars[Math.floor(Math.random() * chars.length)];
      }).join(""));
      if (frame >= total) clearInterval(iv);
    }, duration / total);
    return () => clearInterval(iv);
  }, [text]);
  return <span>{display}</span>;
}

function GlitchTitle({ text }) {
  const [glitch, setGlitch] = useState(false);
  useEffect(() => {
    const iv = setInterval(() => { setGlitch(true); setTimeout(() => setGlitch(false), 400); }, 4000 + Math.random() * 3000);
    return () => clearInterval(iv);
  }, []);
  return (
    <div className={`vt ${glitch ? "glitch" : ""}`} style={{ fontSize: 52, color: COLORS.accent, letterSpacing: "0.05em", lineHeight: 1, textShadow: `0 0 20px rgba(0,204,68,0.25)` }}>
      WORD IMPOSTER
    </div>
  );
}

// ── Layout Shell ──────────────────────────────────────────────────────────────
function Shell({ children, screenKey }) {
  return (
    <div style={{ background: COLORS.bg, minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "0 0 40px" }}>
      <div style={{ width: "100%", maxWidth: 420, position: "relative" }}>
        <div className="scanlines" />
        <div key={screenKey} className="screen-enter" style={{ padding: "0 24px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

function SysTag({ children, color }) {
  return <div className="tag" style={{ color: color || COLORS.textFaint }}>{children}</div>;
}

function Prompt({ children }) {
  return <div className="mono" style={{ fontSize: 11, color: COLORS.accent, letterSpacing: "0.1em" }}>{children}</div>;
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, height: 1, background: COLORS.border }} />
        <SysTag>// {label}</SysTag>
        <div style={{ flex: 1, height: 1, background: COLORS.border }} />
      </div>
      {children}
    </div>
  );
}

// ── Screen 1: HOME ────────────────────────────────────────────────────────────
function HomeScreen({ onStart }) {
  const [mode, setMode] = useState("blind");
  const [showHow, setShowHow] = useState(false);

  const rules = {
    blind: {
      civilian: "Vote out the imposter. If caught, imposter must then fail to guess the word.",
      imposter: "Survive the vote — or correctly guess the word after being caught.",
    },
    sneaky: {
      civilian: "Vote out the odd-word player. They have a similar but different word.",
      imposter: "Survive the vote. If you do, you've already won. Guessing is just for fun.",
    },
  };

  return (
    <Shell screenKey="home">
      <div style={{ paddingTop: 32, paddingBottom: 12 }}>
        <Prompt>&gt;_ system initialised<span className="cursor" /></Prompt>
      </div>

      <div style={{ paddingBottom: 24, borderBottom: `1px solid ${COLORS.border}`, marginBottom: 24 }}>
        <GlitchTitle />
        <SysTag color={COLORS.textDim} style={{ marginTop: 8 }}>v2.1.0 // identity unknown // trust no one</SysTag>
      </div>

      <Section label="select_mode">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { id: "blind", icon: "ti-eye-off", label: "BLIND", desc: "Imposter has no word. Pure deception." },
            { id: "sneaky", icon: "ti-spy", label: "SNEAKY", desc: "Imposter has a similar word. Harder to catch." },
          ].map(m => (
            <div key={m.id} className={`mode-card ${mode === m.id ? "active" : ""}`} onClick={() => setMode(m.id)}>
              <i className={`ti ${m.icon}`} style={{ fontSize: 28, color: mode === m.id ? COLORS.accent : COLORS.textDim, display: "block", marginBottom: 8 }} />
              <div className="vt" style={{ fontSize: 26, color: mode === m.id ? COLORS.accent : COLORS.textMid, letterSpacing: "0.05em", marginBottom: 4 }}>{m.label}</div>
              <div className="mono" style={{ fontSize: 11, color: COLORS.textMid, lineHeight: 1.5 }}>{m.desc}</div>
            </div>
          ))}
        </div>

        <div style={{ background: COLORS.bgCard, borderLeft: `2px solid ${COLORS.accent}`, borderRadius: "0 8px 8px 0", padding: "14px 16px", marginTop: 14 }}>
          <div className="mono" style={{ fontSize: 10, color: COLORS.accent, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 8 }}>&gt; {mode} // win conditions</div>
          <div className="mono" style={{ fontSize: 12, color: COLORS.textMid, lineHeight: 1.7, marginBottom: 8 }}>
            <span style={{ color: COLORS.textPrimary }}>CIVILIANS</span> — {rules[mode].civilian}
          </div>
          <div className="mono" style={{ fontSize: 12, color: COLORS.textMid, lineHeight: 1.7 }}>
            <span style={{ color: COLORS.accent }}>IMPOSTER</span> — {rules[mode].imposter}
          </div>
        </div>
      </Section>

      {showHow && (
        <Section label="how_to_play">
          <div className="mono" style={{ fontSize: 12, color: COLORS.textMid, lineHeight: 1.8 }}>
            <div style={{ marginBottom: 10 }}>1. Enter player names and configure the game.</div>
            <div style={{ marginBottom: 10 }}>2. Each agent receives their word privately — pass the phone around.</div>
            <div style={{ marginBottom: 10 }}>3. Everyone gives clues. Don't be too obvious — or the imposter catches on.</div>
            <div style={{ marginBottom: 10 }}>4. Discuss, argue, point fingers. Then vote IRL.</div>
            <div>5. Hit <span style={{ color: COLORS.accent }}>REVEAL RESULT</span> to unmask the imposter.</div>
          </div>
        </Section>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 16 }}>
        <button className="btn-primary" onClick={() => onStart(mode)}>&gt; Start game</button>
        <button className="btn-ghost" onClick={() => setShowHow(h => !h)}>
          {showHow ? "[ hide instructions ]" : "[ how to play ]"}
        </button>
      </div>
    </Shell>
  );
}

// ── Screen 2: ROOM SETUP ──────────────────────────────────────────────────────
function RoomSetupScreen({ mode, onNext, onBack }) {
  const [playerCount, setPlayerCount] = useState(5);
  const [multiImposter, setMultiImposter] = useState(false);

  const imposterCount = multiImposter && playerCount >= 6 ? 2 : 1;

  return (
    <Shell screenKey="setup">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 28, paddingBottom: 20, borderBottom: `1px solid ${COLORS.border}`, marginBottom: 24 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textDim, fontFamily: "var(--mono)", fontSize: 12, letterSpacing: "0.08em" }}>
          &lt; back
        </button>
        <SysTag>mission_config</SysTag>
      </div>

      <div className="vt" style={{ fontSize: 40, color: COLORS.accent, marginBottom: 6 }}>CONFIGURE</div>
      <SysTag color={COLORS.textDim}>set parameters before deployment</SysTag>

      <div style={{ marginTop: 28 }}>
        <Section label="agent_count">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button onClick={() => setPlayerCount(p => Math.max(3, p - 1))}
              style={{ width: 44, height: 44, background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.textMid, fontSize: 20, cursor: "pointer", fontFamily: "var(--mono)" }}>−</button>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div className="vt" style={{ fontSize: 52, color: COLORS.accent, lineHeight: 1 }}>{playerCount}</div>
              <SysTag>agents</SysTag>
            </div>
            <button onClick={() => setPlayerCount(p => Math.min(10, p + 1))}
              style={{ width: 44, height: 44, background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.textMid, fontSize: 20, cursor: "pointer", fontFamily: "var(--mono)" }}>+</button>
          </div>
        </Section>

        <Section label="imposter_count">
          <div style={{ background: COLORS.bgCard, border: `1px solid ${playerCount < 6 ? COLORS.border : COLORS.borderActive}`, borderRadius: 10, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", opacity: playerCount < 6 ? 0.4 : 1 }}>
            <div>
              <div className="mono" style={{ fontSize: 13, color: COLORS.textPrimary, marginBottom: 3 }}>Multi-imposter</div>
              <div className="mono" style={{ fontSize: 11, color: COLORS.textMid }}>2 imposters — requires 6+ agents</div>
            </div>
            <div onClick={() => playerCount >= 6 && setMultiImposter(m => !m)}
              style={{ width: 44, height: 24, background: multiImposter && playerCount >= 6 ? COLORS.accent : COLORS.bgDeep, border: `1px solid ${multiImposter && playerCount >= 6 ? COLORS.accent : COLORS.border}`, borderRadius: 12, cursor: playerCount >= 6 ? "pointer" : "not-allowed", position: "relative", transition: "all 0.2s" }}>
              <div style={{ position: "absolute", top: 3, left: multiImposter && playerCount >= 6 ? 22 : 3, width: 16, height: 16, background: multiImposter && playerCount >= 6 ? "#000" : COLORS.textDim, borderRadius: "50%", transition: "left 0.2s" }} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
            {[
              { icon: "ti-users", label: "Agents", val: playerCount, color: COLORS.textMid },
              { icon: "ti-user-question", label: "Imposters", val: imposterCount, color: COLORS.accent },
            ].map(s => (
              <div key={s.label} style={{ background: COLORS.bgCard, border: `1px solid ${s.color === COLORS.accent ? "#1a4a1a" : COLORS.border}`, borderRadius: 8, padding: "12px 14px" }}>
                <div className="mono" style={{ fontSize: 10, color: s.color, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>
                  <i className={`ti ${s.icon}`} style={{ marginRight: 4, fontSize: 12 }} />{s.label}
                </div>
                <div className="vt" style={{ fontSize: 34, color: s.color }}>{s.val}</div>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <button className="btn-primary" style={{ marginTop: 8 }} onClick={() => onNext({ playerCount, imposterCount })}>
        &gt; Enter agent names
      </button>
    </Shell>
  );
}

// ── Screen 3: PLAYER NAMES ────────────────────────────────────────────────────
function PlayerNamesScreen({ playerCount, onNext, onBack }) {
  const [names, setNames] = useState(Array(playerCount).fill(""));
  const inputs = useRef([]);

  const allFilled = names.every(n => n.trim().length > 0);

  return (
    <Shell screenKey="names">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 28, paddingBottom: 20, borderBottom: `1px solid ${COLORS.border}`, marginBottom: 24 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textDim, fontFamily: "var(--mono)", fontSize: 12 }}>&lt; back</button>
        <SysTag>agent_registration</SysTag>
      </div>

      <div className="vt" style={{ fontSize: 40, color: COLORS.accent, marginBottom: 6 }}>IDENTIFY</div>
      <SysTag color={COLORS.textDim}>register all agents before mission start</SysTag>

      <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 10 }}>
        {names.map((n, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="vt" style={{ fontSize: 22, color: COLORS.textDim, minWidth: 28, textAlign: "right" }}>{String(i + 1).padStart(2, "0")}</div>
            <input
              ref={el => inputs.current[i] = el}
              type="text"
              placeholder={`Agent ${i + 1}`}
              value={n}
              onChange={e => setNames(ns => ns.map((v, j) => j === i ? e.target.value : v))}
              onKeyDown={e => e.key === "Enter" && inputs.current[i + 1]?.focus()}
              maxLength={16}
            />
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        <button className="btn-primary" disabled={!allFilled} style={{ opacity: allFilled ? 1 : 0.4, cursor: allFilled ? "pointer" : "not-allowed" }}
          onClick={() => allFilled && onNext(names.map(n => n.trim()))}>
          &gt; Assign words
        </button>
      </div>
    </Shell>
  );
}

// ── Screen 4: WORD REVEAL ─────────────────────────────────────────────────────
function WordRevealScreen({ players, onNext, onBack }) {
  const [current, setCurrent] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const player = players[current];
  const isLast = current === players.length - 1;

  const handleReveal = () => setRevealed(true);
  const handleNext = () => {
    if (isLast) { onNext(); return; }
    setRevealed(false);
    setTimeout(() => setCurrent(c => c + 1), 100);
  };

  return (
    <Shell screenKey={`reveal-${current}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 28, paddingBottom: 20, borderBottom: `1px solid ${COLORS.border}`, marginBottom: 20 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textDim, fontFamily: "var(--mono)", fontSize: 12 }}>&lt; back</button>
        <SysTag>identity_check // {current + 1}/{players.length}</SysTag>
      </div>

      <div style={{ marginBottom: 6 }}>
        <SysTag color={COLORS.textDim}>passing device to</SysTag>
        <div className="vt" style={{ fontSize: 40, color: COLORS.textPrimary, marginTop: 4, letterSpacing: "0.05em" }}>{player.name.toUpperCase()}</div>
      </div>

      {!revealed ? (
        <div onClick={handleReveal} style={{ background: COLORS.bgDeep, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "52px 20px", textAlign: "center", marginTop: 20, cursor: "pointer", position: "relative" }}>
          <div className="corner corner-tl" /><div className="corner corner-tr" />
          <div className="corner corner-bl" /><div className="corner corner-br" />
          <i className="ti ti-lock" style={{ fontSize: 32, color: COLORS.textDim, display: "block", marginBottom: 12 }} />
          <div className="mono" style={{ fontSize: 12, color: COLORS.textDim, letterSpacing: "0.1em" }}>TAP TO DECRYPT YOUR WORD</div>
        </div>
      ) : (
        <div style={{ background: COLORS.bgDeep, border: `1px solid #1a4a1a`, borderRadius: 12, padding: "36px 20px", textAlign: "center", marginTop: 20, position: "relative", animation: "fadeInFast 0.3s ease" }}>
          <div className="corner corner-tl" /><div className="corner corner-tr" />
          <div className="corner corner-bl" /><div className="corner corner-br" />
          <div className="mono" style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: "0.2em", marginBottom: 8 }}>// classified — eyes only</div>
          <div className="mono" style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: "0.15em", marginBottom: 16 }}>your assigned word</div>
          {player.isImposterBlind ? (
            <div>
              <div className="vt" style={{ fontSize: 64, color: COLORS.textDim, letterSpacing: "0.05em", textShadow: "none" }}>???</div>
              <div className="mono" style={{ fontSize: 11, color: COLORS.accentDim, marginTop: 8, lineHeight: 1.6 }}>
                you are the imposter<br />
                <span style={{ color: COLORS.textDim }}>you have no word — deceive them</span>
              </div>
            </div>
          ) : (
            <div>
              <div className="vt" style={{ fontSize: 64, color: COLORS.accent, letterSpacing: "0.05em", textShadow: `0 0 30px rgba(0,204,68,0.3)` }}>
                <DecryptText text={player.word.toUpperCase()} />
              </div>
              {player.isImposter && (
                <div className="mono" style={{ fontSize: 11, color: COLORS.accentDim, marginTop: 10, lineHeight: 1.6 }}>
                  you are the imposter<br />
                  <span style={{ color: COLORS.textDim }}>there {players.filter(p => p.isImposter).length > 1 ? `is 1 other imposter` : "are no other imposters"}</span>
                </div>
              )}
            </div>
          )}
          <div className="mono" style={{ fontSize: 10, color: COLORS.textFaint, marginTop: 20, letterSpacing: "0.1em" }}>[ tap anywhere to redact ]</div>
        </div>
      )}

      {revealed && (
        <div style={{ marginTop: 20, animation: "slideUp 0.3s ease" }}>
          <button className={isLast ? "btn-primary" : "btn-outline"} onClick={handleNext}>
            {isLast ? "> word redacted — begin mission" : `> word redacted — pass to ${players[current + 1]?.name.toUpperCase()} >`}
          </button>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 20 }}>
        {players.map((_, i) => <div key={i} className={`pip ${i <= current ? "on" : ""}`} />)}
      </div>
    </Shell>
  );
}

// ── Screen 5: PRE-ROUND ───────────────────────────────────────────────────────
function PreRoundScreen({ players, imposterCount, onStart }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { setTimeout(() => setVisible(true), 100); }, []);

  return (
    <Shell screenKey="preround">
      <div style={{ paddingTop: 40, textAlign: "center", minHeight: "80vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ opacity: visible ? 1 : 0, transition: "opacity 0.5s", marginBottom: 32 }}>
          <SysTag color={COLORS.textDim}>mission_briefing</SysTag>
          <div className="vt" style={{ fontSize: 48, color: COLORS.accent, marginTop: 8, lineHeight: 1, textShadow: `0 0 20px rgba(0,204,68,0.2)` }}>MISSION<br />BEGINS</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 32, opacity: visible ? 1 : 0, transition: "opacity 0.5s 0.3s" }}>
          {[
            { icon: "ti-users", label: "Agents", val: players.length, color: COLORS.textMid },
            { icon: "ti-user-question", label: "Imposters", val: imposterCount, color: COLORS.accent },
          ].map(s => (
            <div key={s.label} style={{ background: COLORS.bgCard, border: `1px solid ${s.color === COLORS.accent ? "#1a4a1a" : COLORS.border}`, borderRadius: 10, padding: "16px" }}>
              <i className={`ti ${s.icon}`} style={{ fontSize: 22, color: s.color, display: "block", marginBottom: 6 }} />
              <div className="mono" style={{ fontSize: 10, color: s.color, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 2 }}>{s.label}</div>
              <div className="vt" style={{ fontSize: 40, color: s.color }}>{s.val}</div>
            </div>
          ))}
        </div>

        <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "16px", marginBottom: 32, opacity: visible ? 1 : 0, transition: "opacity 0.5s 0.6s" }}>
          <div className="mono" style={{ fontSize: 12, color: COLORS.textMid, lineHeight: 1.8 }}>
            <span style={{ color: COLORS.accent }}>Among you</span> is {imposterCount === 1 ? "an imposter" : "imposters"}.<br />
            Give clues. Stay vague. Trust no one.
          </div>
        </div>

        <div style={{ opacity: visible ? 1 : 0, transition: "opacity 0.5s 0.9s" }}>
          <button className="btn-primary" onClick={onStart} style={{ animation: "pulse 2s ease infinite" }}>
            &gt; Start discussion
          </button>
        </div>
      </div>
    </Shell>
  );
}

// ── Screen 6: DISCUSSION ──────────────────────────────────────────────────────
function DiscussionScreen({ players, imposterCount, onReveal }) {
  const timer = useTimer();
  useEffect(() => { timer.start(); }, []);

  return (
    <Shell screenKey="discussion">
      <div style={{ paddingTop: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${COLORS.border}` }}>
          <div>
            <SysTag color={COLORS.textDim}>operation_status</SysTag>
            <div className="vt" style={{ fontSize: 38, color: COLORS.textPrimary, lineHeight: 1.1, marginTop: 6 }}>IDENTIFY<br />THE MOLE</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <SysTag color={COLORS.textDim}>elapsed</SysTag>
            <div className="vt" style={{ fontSize: 44, color: COLORS.accent, letterSpacing: "0.05em", marginTop: 2, animation: "scanPulse 2s ease infinite" }}>{timer.fmt}</div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}>
          {[
            { icon: "ti-users", label: "Agents", val: players.length, color: COLORS.textMid, border: COLORS.border },
            { icon: "ti-user-question", label: "Imposters", val: imposterCount, color: COLORS.accent, border: "#1a4a1a" },
          ].map(s => (
            <div key={s.label} style={{ background: COLORS.bgCard, border: `1px solid ${s.border}`, borderRadius: 8, padding: "12px 14px" }}>
              <div className="mono" style={{ fontSize: 10, color: s.color, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>
                <i className={`ti ${s.icon}`} style={{ marginRight: 4 }} />{s.label}
              </div>
              <div className="vt" style={{ fontSize: 36, color: s.color }}>{s.val}</div>
            </div>
          ))}
        </div>

        <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
          <SysTag color={COLORS.textDim}>agent_roster</SysTag>
          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
            {players.map((p, i) => (
              <div key={i} className="mono" style={{ fontSize: 12, color: COLORS.textMid, background: COLORS.bgDeep, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "5px 10px" }}>
                {p.name}
              </div>
            ))}
          </div>
        </div>

        <button className="btn-outline" onClick={() => { timer.stop(); onReveal(); }}>
          &gt; Reveal result
        </button>
      </div>
    </Shell>
  );
}

// ── Screen 7: FINAL ───────────────────────────────────────────────────────────
function FinalScreen({ players, mode, onPlayAgain, onHome }) {
  const [wordsRevealed, setWordsRevealed] = useState(false);
  const [namesRevealed, setNamesRevealed] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setStep(1), 300);
    return () => clearTimeout(t);
  }, []);

  const imposters = players.filter(p => p.isImposter || p.isImposterBlind);
  const civilians = players.filter(p => !p.isImposter && !p.isImposterBlind);
  const imposterWord = imposters[0]?.word || "???";
  const civilianWord = civilians[0]?.word;

  return (
    <Shell screenKey="final">
      <div style={{ paddingTop: 28 }}>
        <div style={{ paddingBottom: 20, borderBottom: `1px solid ${COLORS.border}`, marginBottom: 24 }}>
          <SysTag color={COLORS.textDim}>mission_debrief</SysTag>
          <div className="vt" style={{ fontSize: 44, color: COLORS.accent, marginTop: 6, lineHeight: 1, textShadow: `0 0 20px rgba(0,204,68,0.2)` }}>
            IDENTITY<br />REVEALED
          </div>
        </div>

        <div style={{ opacity: step >= 1 ? 1 : 0, transition: "opacity 0.5s", marginBottom: 16 }}>
          <div style={{ background: COLORS.bgDeep, border: `1px solid #1a4a1a`, borderRadius: 12, padding: "20px", position: "relative" }}>
            <div className="corner corner-tl" /><div className="corner corner-tr" />
            <div className="corner corner-bl" /><div className="corner corner-br" />
            <div className="mono" style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: "0.2em", marginBottom: 12 }}>// imposter{imposters.length > 1 ? "s" : ""} unmasked</div>
            {imposters.map((p, i) => (
              <div key={i} style={{ marginBottom: i < imposters.length - 1 ? 8 : 0 }}>
                <div className="vt" style={{ fontSize: 36, color: COLORS.accent, letterSpacing: "0.05em" }}>
                  {namesRevealed ? <DecryptText text={p.name.toUpperCase()} duration={600} /> : "██████"}
                </div>
              </div>
            ))}
            {!namesRevealed && (
              <button className="btn-outline" style={{ marginTop: 14 }} onClick={() => setNamesRevealed(true)}>
                &gt; Unmask imposter{imposters.length > 1 ? "s" : ""}
              </button>
            )}
          </div>
        </div>

        {namesRevealed && (
          <div style={{ animation: "slideUp 0.4s ease", marginBottom: 16 }}>
            <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "20px", position: "relative" }}>
              <div className="corner corner-tl" /><div className="corner corner-tr" />
              <div className="corner corner-bl" /><div className="corner corner-br" />
              <div className="mono" style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: "0.2em", marginBottom: 12 }}>// classified words</div>

              {!wordsRevealed ? (
                <button className="btn-ghost" style={{ color: COLORS.textMid, borderColor: "#1a3a1a" }} onClick={() => setWordsRevealed(true)}>
                  [ reveal words ]
                </button>
              ) : (
                <div style={{ animation: "fadeInFast 0.4s ease" }}>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ flex: 1, background: COLORS.bgDeep, border: `1px solid #1a3a1a`, borderRadius: 8, padding: "12px 14px" }}>
                      <div className="mono" style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: "0.12em", marginBottom: 6 }}>CIVILIANS</div>
                      <div className="vt" style={{ fontSize: 28, color: COLORS.textPrimary }}>{civilianWord?.toUpperCase() || "—"}</div>
                    </div>
                    <div style={{ flex: 1, background: COLORS.bgDeep, border: `1px solid #1a4a1a`, borderRadius: 8, padding: "12px 14px" }}>
                      <div className="mono" style={{ fontSize: 10, color: COLORS.accentDim, letterSpacing: "0.12em", marginBottom: 6 }}>IMPOSTER</div>
                      <div className="vt" style={{ fontSize: 28, color: COLORS.accent }}>
                        {mode === "blind" ? "NONE" : imposterWord?.toUpperCase()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {namesRevealed && (
          <div style={{ animation: "slideUp 0.4s ease 0.2s both", display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
            <button className="btn-primary" onClick={onPlayAgain}>&gt; Play again</button>
            <button className="btn-ghost" onClick={onHome}>[ return to home ]</button>
          </div>
        )}
      </div>
    </Shell>
  );
}

// ── Game Logic ────────────────────────────────────────────────────────────────
function assignWords(names, mode, imposterCount) {
  const shuffledNames = shuffle(names);
  const imposterIndices = shuffledNames.slice(0, imposterCount).map((_, i) => i);

  let civilianWord, imposterWord;

  if (mode === "blind") {
    civilianWord = BLIND_WORDS[Math.floor(Math.random() * BLIND_WORDS.length)];
    imposterWord = null;
  } else {
    const pair = WORD_PAIRS[Math.floor(Math.random() * WORD_PAIRS.length)];
    const [w1, w2] = Math.random() > 0.5 ? pair : [pair[1], pair[0]];
    civilianWord = w1;
    imposterWord = w2;
  }

  return shuffledNames.map((name, i) => {
    const isImposter = imposterIndices.includes(i);
    return {
      name,
      isImposter: mode === "sneaky" && isImposter,
      isImposterBlind: mode === "blind" && isImposter,
      word: isImposter ? (mode === "sneaky" ? imposterWord : null) : civilianWord,
    };
  });
}

// ── App Root ──────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("home");
  const [gameMode, setGameMode] = useState("blind");
  const [config, setConfig] = useState(null);
  const [players, setPlayers] = useState([]);

  const go = (s) => setScreen(s);

  return (
    <>
      <FontLoader />
      {screen === "home" && (
        <HomeScreen onStart={(mode) => { setGameMode(mode); go("setup"); }} />
      )}
      {screen === "setup" && (
        <RoomSetupScreen mode={gameMode} onBack={() => go("home")}
          onNext={(cfg) => { setConfig(cfg); go("names"); }} />
      )}
      {screen === "names" && config && (
        <PlayerNamesScreen playerCount={config.playerCount} onBack={() => go("setup")}
          onNext={(names) => {
            const assigned = assignWords(names, gameMode, config.imposterCount);
            setPlayers(assigned);
            go("reveal");
          }} />
      )}
      {screen === "reveal" && (
        <WordRevealScreen players={players} onBack={() => go("names")} onNext={() => go("preround")} />
      )}
      {screen === "preround" && (
        <PreRoundScreen players={players} imposterCount={config.imposterCount} onStart={() => go("discussion")} />
      )}
      {screen === "discussion" && (
        <DiscussionScreen players={players} imposterCount={config.imposterCount} onReveal={() => go("final")} />
      )}
      {screen === "final" && (
        <FinalScreen players={players} mode={gameMode}
          onPlayAgain={() => { setConfig(null); setPlayers([]); go("setup"); }}
          onHome={() => { setConfig(null); setPlayers([]); go("home"); }} />
      )}
    </>
  );
}
