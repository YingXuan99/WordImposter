import { useState, useEffect, useRef, useCallback } from "react";
import './WordImposter.css';
import { WORD_CATEGORIES } from "./data/wordCategories.js";
import { createWordHistory, pickSneakyWordPair } from "./lib/wordSelection.js";

const COLORS = {
  bg: "#030a03",
  bgCard: "#060f06",
  bgDeep: "#020802",
  accent: "#00cc44",
  accentBright: "#00ff46",
  accentCyan: "#00eeff",
  accentDim: "#00882e",
  textPrimary: "#a0e8a0",
  textMid: "#529a52",
  textDim: "#3a7a3a",
  textFaint: "#357135",
  border: "#0d2a0d",
  borderActive: "#00cc44",
};

// Blind mode reuses the same categorized word bank as sneaky mode (flattened),
// so there's a single source of truth for word content — see src/data/wordCategories.js.
const BLIND_WORDS = Object.values(WORD_CATEGORIES).flat();


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
            <span style={{ color: COLORS.textPrimary }}>AGENTS</span> — {rules[mode].civilian}
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
  const [imposterCount, setImposterCount] = useState(1);

  // Imposters must always be a minority — max grows by 1 every 2 agents
  // (3-4 agents -> 1, 5-6 -> 2, 7-8 -> 3, ...).
  const maxImposters = Math.max(1, Math.floor((playerCount - 1) / 2));
  const clampedImposterCount = Math.min(imposterCount, maxImposters);

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
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button onClick={() => setImposterCount(Math.max(1, clampedImposterCount - 1))}
              disabled={clampedImposterCount <= 1}
              style={{ width: 44, height: 44, background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.textMid, fontSize: 20, cursor: clampedImposterCount <= 1 ? "not-allowed" : "pointer", fontFamily: "var(--mono)", opacity: clampedImposterCount <= 1 ? 0.4 : 1 }}>−</button>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div className="vt" style={{ fontSize: 52, color: COLORS.accent, lineHeight: 1 }}>{clampedImposterCount}</div>
              <SysTag>imposters</SysTag>
            </div>
            <button onClick={() => setImposterCount(Math.min(maxImposters, clampedImposterCount + 1))}
              disabled={clampedImposterCount >= maxImposters}
              style={{ width: 44, height: 44, background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 8, color: COLORS.textMid, fontSize: 20, cursor: clampedImposterCount >= maxImposters ? "not-allowed" : "pointer", fontFamily: "var(--mono)", opacity: clampedImposterCount >= maxImposters ? 0.4 : 1 }}>+</button>
          </div>
          <div className="mono" style={{ fontSize: 11, color: COLORS.textDim, marginTop: 10, textAlign: "center", letterSpacing: "0.05em" }}>
            max {maxImposters} for {playerCount} agents
          </div>
        </Section>
      </div>

      <button className="btn-primary" style={{ marginTop: 8 }} onClick={() => onNext({ playerCount, imposterCount: clampedImposterCount })}>
        &gt; Enter agent names
      </button>
    </Shell>
  );
}

// ── Screen 3: PLAYER NAMES ────────────────────────────────────────────────────
function PlayerNamesScreen({ playerCount, onNext, onBack }) {
  const [names, setNames] = useState(Array(playerCount).fill(""));
  const [current, setCurrent] = useState(0);
  const [inputVal, setInputVal] = useState("");
  const [nameError, setNameError] = useState("");
  const submitted = useRef(false);
  const inputRef = useRef(null);
  const isLast = current === playerCount - 1;

  // Layout constants — scale with player count
  const NAMED_GAP = 6;
  const NAMED = Math.min(80, Math.floor((368 - (playerCount - 1) * NAMED_GAP) / playerCount));
  const ICON = Math.max(NAMED + 14, 56);
  const QUEUE_PEEK = Math.round(ICON * 0.36);
  const NAME_H = Math.max(14, Math.round(NAMED * 0.28));
  const QUEUE_TOP = NAME_H + NAMED + 16;
  const CONTAINER_H = QUEUE_TOP + ICON + 6;

  useEffect(() => { inputRef.current?.focus(); }, [current]);

  const handleNext = () => {
    const trimmed = inputVal.trim();
    if (!trimmed || submitted.current) return;
    const isDuplicate = names.slice(0, current).some(
      n => n.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setNameError("name already taken");
      return;
    }
    setNameError("");
    const updated = [...names];
    updated[current] = trimmed;
    if (isLast) {
      submitted.current = true;
      setNames(updated);
      setInputVal("");
      setTimeout(() => onNext(updated), 480);
    } else {
      setNames(updated);
      setCurrent(c => c + 1);
      setInputVal("");
    }
  };

  const handleBack = () => {
    setNameError("");
    if (current === 0) { onBack(); return; }
    const updated = [...names];
    updated[current - 1] = "";
    setNames(updated);
    setCurrent(c => c - 1);
    setInputVal(names[current - 1] || "");
  };

  return (
    <Shell screenKey="names">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 28, paddingBottom: 20, borderBottom: `1px solid ${COLORS.border}`, marginBottom: 24 }}>
        <button onClick={handleBack} style={{ background: "none", border: "none", cursor: "pointer", color: COLORS.textDim, fontFamily: "var(--mono)", fontSize: 12 }}>&lt; back</button>
        <SysTag>agent_registration</SysTag>
      </div>

      <div className="vt" style={{ fontSize: 40, color: COLORS.accent, marginBottom: 6 }}>IDENTIFY</div>
      <SysTag color={COLORS.textDim}>register all agents before mission start</SysTag>

      {/* Animated icon area — two rows: done (top) + queue (bottom) */}
      <div style={{ position: "relative", height: CONTAINER_H, marginTop: 28, marginBottom: 20 }}>
        {Array.from({ length: playerCount }).map((_, i) => {
          const isNamed = i < current;
          const isActive = i === current;
          const queueDepth = i - current; // 0 = active, 1 = first behind, etc.

          let top, left, width, height, rotateY, scaleVal, opacity, bg, border, iSize, iColor, zIdx;

          if (isNamed) {
            top = NAME_H;
            left = i * (NAMED + NAMED_GAP);
            width = NAMED;
            height = NAMED;
            rotateY = 0;
            scaleVal = 1;
            opacity = 1;
            bg = COLORS.bgCard;
            border = `1px solid #1a4a1a`;
            iSize = Math.max(12, Math.round(NAMED * 0.44));
            iColor = COLORS.accentDim;
            zIdx = playerCount + 10;
          } else {
            top = QUEUE_TOP;
            left = queueDepth * QUEUE_PEEK;
            width = ICON;
            height = ICON;
            rotateY = isActive ? -28 : -45;
            scaleVal = isActive ? 1 : Math.max(1 - queueDepth * 0.04, 0.80);
            opacity = isActive ? 1 : Math.max(0.88 - queueDepth * 0.12, 0.38);
            bg = isActive ? "rgba(0,204,68,0.07)" : COLORS.bgDeep;
            border = `1px solid ${isActive ? COLORS.accent : "#1a3a1a"}`;
            iSize = isActive ? Math.round(ICON * 0.48) : Math.max(Math.round(ICON * 0.40) - queueDepth * 2, 12);
            iColor = isActive ? COLORS.accent : COLORS.textMid;
            zIdx = playerCount - queueDepth;
          }

          return (
            <div
              key={i}
              style={{
                position: "absolute",
                top,
                left,
                width,
                height,
                zIndex: zIdx,
                background: bg,
                border,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transform: `perspective(280px) rotateY(${rotateY}deg) scale(${scaleVal})`,
                opacity,
                transition: [
                  "top 0.45s cubic-bezier(0.4,0,0.2,1)",
                  "left 0.45s cubic-bezier(0.4,0,0.2,1)",
                  "transform 0.45s cubic-bezier(0.34,1.1,0.64,1)",
                  "width 0.35s ease",
                  "height 0.35s ease",
                  "opacity 0.3s ease",
                  "background 0.3s ease",
                  "border-color 0.3s ease",
                ].join(", "),
              }}
            >
              <i
                className="ti ti-user"
                style={{
                  fontSize: iSize,
                  color: iColor,
                  transition: "font-size 0.35s ease, color 0.3s ease",
                  pointerEvents: "none",
                }}
              />
              {isNamed && names[i] && (
                <div
                  className="mono"
                  style={{
                    position: "absolute",
                    top: -NAME_H,
                    left: "50%",
                    transform: "translateX(-50%)",
                    fontSize: Math.max(8, Math.min(11, Math.round(NAMED * 0.22))),
                    color: COLORS.textPrimary,
                    whiteSpace: "nowrap",
                    letterSpacing: "0.04em",
                    maxWidth: NAMED + 10,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    textAlign: "center",
                    animation: "fadeInFast 0.3s ease 0.32s both",
                    pointerEvents: "none",
                  }}
                >
                  {names[i]}
                </div>
              )}
              {isActive && (
                <div style={{
                  position: "absolute",
                  bottom: 5,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: COLORS.accent,
                  animation: "pulse 1.4s ease infinite",
                  pointerEvents: "none",
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Progress pips */}
      <div style={{ display: "flex", gap: 5, marginBottom: 18 }}>
        {Array.from({ length: playerCount }).map((_, i) => (
          <div
            key={i}
            className="pip"
            style={{
              flex: 1,
              background: i <= current ? COLORS.accent : "#0d2a0d",
              opacity: i < current ? 0.45 : i === current ? 1 : 0.2,
              transition: "all 0.3s ease",
            }}
          />
        ))}
      </div>

      <div className="mono" style={{ fontSize: 11, color: COLORS.accent, letterSpacing: "0.1em", marginBottom: 10 }}>
        &gt; agent {current + 1} of {playerCount}
      </div>

      <input
        ref={inputRef}
        type="text"
        placeholder="Enter name..."
        value={inputVal}
        onChange={e => { setInputVal(e.target.value); if (nameError) setNameError(""); }}
        onKeyDown={e => e.key === "Enter" && handleNext()}
        maxLength={16}
        style={{ marginBottom: nameError ? 6 : 14, borderColor: nameError ? "#cc4400" : undefined }}
      />
      {nameError && (
        <div className="mono" style={{ fontSize: 11, color: "#cc4400", letterSpacing: "0.08em", marginBottom: 10, animation: "fadeInFast 0.2s ease" }}>
          ✕ {nameError}
        </div>
      )}

      <button
        className="btn-primary"
        disabled={!inputVal.trim()}
        style={{ opacity: inputVal.trim() ? 1 : 0.4, cursor: inputVal.trim() ? "pointer" : "not-allowed" }}
        onClick={handleNext}
      >
        {isLast ? "> receive your word" : "> next"}
      </button>
    </Shell>
  );
}

// ── Screen 4: WORD REVEAL ─────────────────────────────────────────────────────
function WordRevealScreen({ players, onNext, onBack }) {
  const [current, setCurrent] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const player = players[current];
  const isLast = current === players.length - 1;

  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [current]);

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
          <div className="mono" style={{ fontSize: 12, color: COLORS.textDim, letterSpacing: "0.2em", marginBottom: 8 }}>// classified — eyes only</div>
          <div className="mono" style={{ fontSize: 12, color: COLORS.textDim, letterSpacing: "0.15em", marginBottom: 16 }}>your assigned word</div>
          {player.isImposterBlind ? (
            <div>
              <div className="vt" style={{ fontSize: 64, color: COLORS.textDim, letterSpacing: "0.05em", textShadow: "none" }}>???</div>
              <div style={{ marginTop: 16 }}>
                <div className="mono" style={{ fontSize: 11, color: COLORS.textMid, letterSpacing: "0.12em" }}>you are the</div>
                <div className="vt" style={{ fontSize: 52, color: COLORS.accentBright, letterSpacing: "0.08em", lineHeight: 1, textShadow: `0 0 24px rgba(0,255,70,0.5)` }}>IMPOSTER</div>
                <div className="mono" style={{ fontSize: 11, color: COLORS.textDim, marginTop: 8, letterSpacing: "0.08em" }}>you have no word — deceive them</div>
              </div>
            </div>
          ) : (
            <div>
              <div className="vt" style={{ fontSize: 64, color: COLORS.accent, letterSpacing: "0.05em", textShadow: `0 0 30px rgba(0,204,68,0.3)` }}>
                <DecryptText text={player.word.toUpperCase()} />
              </div>
            </div>
          )}
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

// ── Suspicion Feed ────────────────────────────────────────────────────────────
const SUSPICION_TEMPLATES = [
  n => `I think ${n} is the imposter`,
  n => `${n} is acting suspicious`,
  n => `something's off about ${n}...`,
  n => `don't trust ${n}`,
  n => `${n}'s clues don't add up`,
  n => `keep your eye on ${n}`,
  n => `${n} is being too vague`,
  n => `are you sure thats the right word ${n}?`,
  n => `why is ${n} so quiet?`,
  n => `${n} seemed nervous just now`,
  n => `${n} is taking too long`,
  n => `${n}'s story keeps changing`,
  n => `I don't believe ${n}`,
  n => `vote ${n} out`,
  n => `why is ${n} sweating so much`,
  () => `cross-referencing testimony...`,
  () => `trust no one`,
  () => `scanning for deception patterns`,
  () => `something doesnt add up`,
];

function pickSuspicionPhrase(players) {
  const t = SUSPICION_TEMPLATES[Math.floor(Math.random() * SUSPICION_TEMPLATES.length)];
  const p = players[Math.floor(Math.random() * players.length)];
  return t(p.name);
}

function SuspicionText({ players }) {
  const playersRef = useRef(players);
  const [phrase, setPhrase] = useState(() => pickSuspicionPhrase(players));
  const [chars, setChars] = useState(0);
  const [phase, setPhase] = useState("typing");

  useEffect(() => {
    let t;
    if (phase === "typing") {
      if (chars < phrase.length) {
        t = setTimeout(() => setChars(c => c + 1), 52);
      } else {
        t = setTimeout(() => setPhase("deleting"), 7000 + Math.floor(Math.random() * 8000));
      }
    } else {
      if (chars > 0) {
        t = setTimeout(() => setChars(c => c - 1), 24);
      } else {
        t = setTimeout(() => {
          setPhrase(pickSuspicionPhrase(playersRef.current));
          setPhase("typing");
        }, 550);
      }
    }
    return () => clearTimeout(t);
  }, [phase, chars, phrase]);

  return (
    <div style={{
      background: COLORS.bgDeep,
      borderLeft: `2px solid ${COLORS.accentDim}`,
      borderRadius: "0 8px 8px 0",
      padding: "12px 16px",
      marginBottom: 20,
      minHeight: 48,
      display: "flex",
      alignItems: "center",
    }}>
      <div className="mono" style={{ fontSize: 12, color: COLORS.textMid, lineHeight: 1.5 }}>
        <span style={{ color: COLORS.accentDim, marginRight: 6 }}>&gt;</span>
        {phrase.slice(0, chars)}
        <span className="cursor" style={{ width: 7, height: 12, background: COLORS.accentDim }} />
      </div>
    </div>
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

        <SuspicionText players={players} />

        <button className="btn-outline" onClick={() => { timer.stop(); onReveal(); }}>
          &gt; Reveal result
        </button>
      </div>
    </Shell>
  );
}

// ── Screen 7: FINAL ───────────────────────────────────────────────────────────
function FinalScreen({ players, mode, onPlaySameMode, onChangeMode, onHome }) {
  const [wordsRevealed, setWordsRevealed] = useState(false);

  const imposters = players.filter(p => p.isImposter || p.isImposterBlind);
  const civilians = players.filter(p => !p.isImposter && !p.isImposterBlind);
  const imposterWord = imposters[0]?.word || "???";
  const civilianWord = civilians[0]?.word;
  const otherMode = mode === "sneaky" ? "blind" : "sneaky";

  return (
    <Shell screenKey="final">
      <div style={{ paddingTop: 28 }}>
        <div style={{ paddingBottom: 20, borderBottom: `1px solid ${COLORS.border}`, marginBottom: 24 }}>
          <SysTag color={COLORS.textDim}>mission_debrief</SysTag>
          <div className="vt" style={{ fontSize: 44, color: COLORS.accent, marginTop: 6, lineHeight: 1, textShadow: `0 0 20px rgba(0,204,68,0.2)` }}>
            IDENTITY<br />REVEALED
          </div>
        </div>

        <div style={{ animation: "slideUp 0.4s ease", marginBottom: 16 }}>
          <div style={{ background: COLORS.bgDeep, border: `1px solid #1a4a1a`, borderRadius: 12, padding: "20px", position: "relative" }}>
            <div className="corner corner-tl" /><div className="corner corner-tr" />
            <div className="corner corner-bl" /><div className="corner corner-br" />
            <div className="mono" style={{ fontSize: 13, color: COLORS.textDim, letterSpacing: "0.2em", marginBottom: 12 }}>// imposter{imposters.length > 1 ? "s" : ""} unmasked</div>
            {imposters.map((p, i) => (
              <div key={i} style={{ marginBottom: i < imposters.length - 1 ? 8 : 0 }}>
                <div className="vt" style={{ fontSize: 36, color: COLORS.accent, letterSpacing: "0.05em" }}>
                  <DecryptText text={p.name.toUpperCase()} duration={800} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ animation: "slideUp 0.4s ease 0.15s both", marginBottom: 16 }}>
          <div style={{ background: COLORS.bgCard, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "20px", position: "relative" }}>
            <div className="corner corner-tl" /><div className="corner corner-tr" />
            <div className="corner corner-bl" /><div className="corner corner-br" />
            <div className="mono" style={{ fontSize: 13, color: COLORS.textDim, letterSpacing: "0.2em", marginBottom: 12 }}>// classified words</div>

            {!wordsRevealed ? (
              <button className="btn-ghost" style={{ color: COLORS.textMid, borderColor: "#1a3a1a" }} onClick={() => setWordsRevealed(true)}>
                [ reveal words ]
              </button>
            ) : (
              <div style={{ animation: "fadeInFast 0.4s ease" }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1, background: COLORS.bgDeep, border: `1px solid #1a3a1a`, borderRadius: 8, padding: "12px 14px" }}>
                    <div className="mono" style={{ fontSize: 10, color: COLORS.textDim, letterSpacing: "0.12em", marginBottom: 6 }}>AGENTS</div>
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

        <div style={{ animation: "slideUp 0.4s ease 0.3s both", display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
          <button className="btn-primary" onClick={onPlaySameMode}>&gt; Play {mode.toUpperCase()} mode again</button>
          <button className="btn-outline" onClick={onChangeMode}>&gt; Change to {otherMode.toUpperCase()} mode</button>
          <button className="btn-ghost" onClick={onHome}>[ return to home ]</button>
        </div>
      </div>
    </Shell>
  );
}

// ── Game Logic ────────────────────────────────────────────────────────────────
function assignWords(names, mode, imposterCount, wordHistory) {
  // Keep original name order — randomize only which positions become imposters
  const shuffledIndices = shuffle(names.map((_, i) => i));
  const imposterSet = new Set(shuffledIndices.slice(0, imposterCount));

  let civilianWord, imposterWord;

  if (mode === "blind") {
    civilianWord = BLIND_WORDS[Math.floor(Math.random() * BLIND_WORDS.length)];
    imposterWord = null;
  } else {
    const pair = pickSneakyWordPair(wordHistory);
    civilianWord = pair.civilianWord;
    imposterWord = pair.imposterWord;
  }

  return names.map((name, i) => {
    const isImposter = imposterSet.has(i);
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
  // Tracks recently-used words so sneaky mode avoids repeats. In-memory
  // only — survives "Play again" (App never unmounts) but resets on page reload.
  const wordHistoryRef = useRef(createWordHistory(Object.values(WORD_CATEGORIES).flat()));

  const go = (s) => setScreen(s);

  // Reuses the current team (players.map(p => p.name)) — used by the "play
  // again" / "change mode" replay flow to skip straight back to reveal
  // without re-entering names.
  const startRound = (mode, imposterCount) => {
    const assigned = assignWords(players.map(p => p.name), mode, imposterCount, wordHistoryRef.current);
    setPlayers(assigned);
    go("reveal");
  };

  return (
    <>
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
            const assigned = assignWords(names, gameMode, config.imposterCount, wordHistoryRef.current);
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
          onPlaySameMode={() => startRound(gameMode, config.imposterCount)}
          onChangeMode={() => {
            const newMode = gameMode === "sneaky" ? "blind" : "sneaky";
            setGameMode(newMode);
            startRound(newMode, config.imposterCount);
          }}
          onHome={() => { setConfig(null); setPlayers([]); go("home"); }} />
      )}
    </>
  );
}
