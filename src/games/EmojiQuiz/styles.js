// Foglio di stile CSS-in-JS per Emoji Quiz, scoped al root `.eq-root`.
// Mantiene la palette neon-purple/lime/pink del prototipo per caratterizzare
// l'identità del minigame (gli altri giochi hanno palette diverse).
// Tutte le classi sono prefissate con `eq-` per evitare collisioni globali.

export const EMOJI_QUIZ_CSS = `
.eq-root *{ box-sizing:border-box; margin:0; padding:0; }
.eq-root{
  --eq-bg-0:#150b2e; --eq-bg-1:#251447; --eq-panel:#2e1a55; --eq-panel-2:#3a2168;
  --eq-ink:#fdf4ff; --eq-muted:#b8a6dc;
  --eq-lime:#c8ff32; --eq-pink:#ff4d97; --eq-cyan:#43e8df; --eq-yellow:#ffce3a;
  --eq-orange:#ff7a3d; --eq-danger:#ff5d5d;
  font-family:'Fredoka',system-ui,-apple-system,'Segoe UI',sans-serif;
  flex:1; width:100%;
  display:flex; align-items:center; justify-content:center;
  background:
    radial-gradient(900px 540px at 18% -8%, #3a1f6e 0%, transparent 60%),
    radial-gradient(760px 600px at 108% 16%, #4a1f5e 0%, transparent 58%),
    linear-gradient(170deg,var(--eq-bg-1),var(--eq-bg-0));
  color:var(--eq-ink); padding:18px; overflow:hidden; position:relative;
}
.eq-bg-blob{ position:absolute; border-radius:50%; filter:blur(46px); opacity:.32; pointer-events:none; }
.eq-b1{ width:240px; height:240px; background:var(--eq-pink); top:-70px; left:-60px; animation:eqFloat 13s ease-in-out infinite; }
.eq-b2{ width:200px; height:200px; background:var(--eq-cyan); bottom:-60px; right:-50px; animation:eqFloat 16s ease-in-out infinite reverse; }
.eq-b3{ width:160px; height:160px; background:var(--eq-lime); top:42%; right:-70px; animation:eqFloat 19s ease-in-out infinite; }
@keyframes eqFloat{ 0%,100%{ transform:translate(0,0) scale(1);} 50%{ transform:translate(20px,-26px) scale(1.12);} }

.eq-app{
  position:relative; width:100%; max-width:430px;
  background:linear-gradient(180deg,rgba(58,33,104,.92),rgba(46,26,85,.95));
  border:1.5px solid rgba(200,255,50,.16);
  border-radius:34px; padding:26px 22px 24px;
  box-shadow:0 32px 70px -22px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.06);
  max-height:calc(100dvh - 36px); overflow-y:auto; scrollbar-width:none;
}
.eq-app::-webkit-scrollbar{ display:none; }
.eq-mute{
  position:absolute; top:14px; right:14px; z-index:5;
  width:38px; height:38px; border:none; border-radius:50%;
  background:rgba(255,255,255,.07); color:var(--eq-ink); font-size:16px;
  cursor:pointer; transition:transform .15s, background .15s;
}
.eq-mute:hover{ transform:scale(1.1); background:rgba(255,255,255,.14); }
.eq-exit{
  position:absolute; top:14px; left:14px; z-index:5;
  width:38px; height:38px; border:none; border-radius:50%;
  background:rgba(255,255,255,.07); color:var(--eq-ink); font-size:20px;
  cursor:pointer; transition:transform .15s, background .15s;
}
.eq-exit:hover{ transform:scale(1.1); background:rgba(255,255,255,.14); }

.eq-screen{ display:flex; flex-direction:column; align-items:center; text-align:center; animation:eqPop .4s cubic-bezier(.2,1.1,.3,1); }
@keyframes eqPop{ from{ opacity:0; transform:translateY(14px) scale(.97);} to{ opacity:1; transform:none;} }

/* ---------- home ---------- */
.eq-eyebrow{ font-size:11px; letter-spacing:2.5px; font-weight:600; color:var(--eq-cyan); margin-bottom:8px; }
.eq-title{ font-size:58px; line-height:.92; font-weight:700; letter-spacing:-1px; }
.eq-title-accent{
  background:linear-gradient(95deg,var(--eq-lime),var(--eq-cyan));
  -webkit-background-clip:text; background-clip:text; color:transparent;
}
.eq-hero-emoji{ display:flex; gap:6px; font-size:40px; margin:16px 0 4px; }
.eq-hero-emoji span{ animation:eqBob 2.4s ease-in-out infinite; }
.eq-hero-emoji span:nth-child(2){ animation-delay:.3s; }
.eq-hero-emoji span:nth-child(3){ animation-delay:.6s; }
@keyframes eqBob{ 0%,100%{ transform:translateY(0) rotate(-4deg);} 50%{ transform:translateY(-9px) rotate(4deg);} }
.eq-lede{ font-size:15px; color:var(--eq-muted); line-height:1.5; margin:14px 6px 18px; }
.eq-lede b{ color:var(--eq-ink); }
.eq-chips{ display:flex; flex-wrap:wrap; gap:8px; justify-content:center; margin-bottom:22px; }
.eq-chip{
  background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.1);
  padding:7px 13px; border-radius:999px; font-size:12.5px; font-weight:500; color:var(--eq-ink);
}
.eq-cta{
  font-family:inherit; font-weight:700; font-size:18px; color:#1a0c33;
  background:linear-gradient(100deg,var(--eq-lime),#9be800);
  border:none; border-radius:18px; padding:16px 38px; cursor:pointer; width:100%;
  box-shadow:0 12px 26px -8px rgba(200,255,50,.6); transition:transform .14s, box-shadow .14s;
}
.eq-cta:hover{ transform:translateY(-3px); box-shadow:0 18px 32px -8px rgba(200,255,50,.7); }
.eq-cta:active{ transform:translateY(0) scale(.98); }
.eq-cta:disabled{ opacity:.6; cursor:not-allowed; transform:none; box-shadow:none; }
.eq-cta.small{ font-size:16px; padding:13px 30px; }
.eq-cta-secondary{
  font-family:inherit; font-weight:700; font-size:15px; color:var(--eq-ink);
  background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.14);
  border-radius:14px; padding:12px 18px; cursor:pointer; flex:1;
  transition:background .14s;
}
.eq-cta-secondary:hover{ background:rgba(255,255,255,.12); }
.eq-end-actions{ display:flex; gap:10px; width:100%; }
.eq-end-actions .eq-cta{ flex:1.2; }
.eq-vs-line{ display:flex; align-items:center; gap:9px; margin-top:16px; font-weight:600; font-size:14px; color:var(--eq-ink); }
.eq-footnote{ font-size:11.5px; color:var(--eq-muted); margin-top:7px; opacity:.8; }

/* ---------- blob avatar ---------- */
.eq-blob-av{
  position:relative; flex:none; border-radius:46% 54% 58% 42% / 52% 44% 56% 48%;
  animation:eqMorph 6s ease-in-out infinite; box-shadow:0 4px 12px -2px rgba(0,0,0,.4);
}
@keyframes eqMorph{
  0%,100%{ border-radius:46% 54% 58% 42% / 52% 44% 56% 48%; }
  50%{ border-radius:58% 42% 44% 56% / 44% 56% 48% 52%; }
}
.eq-blob-av .eq-eye{
  position:absolute; top:34%; width:15%; height:18%; background:#1a0c33; border-radius:50%;
}
.eq-blob-av .eq-eye:nth-child(1){ left:26%; }
.eq-blob-av .eq-eye:nth-child(2){ right:26%; }
.eq-blob-av .eq-mouth{
  position:absolute; bottom:24%; left:50%; transform:translateX(-50%);
  width:30%; height:15%; border-radius:0 0 999px 999px; background:#1a0c33;
}
.eq-blob-av .eq-mouth-sad{ bottom:18%; border-radius:999px 999px 0 0; height:11%; }

/* ---------- playing ---------- */
.eq-round-tag{ font-size:11px; letter-spacing:2px; font-weight:600; color:var(--eq-muted); margin-bottom:12px; }
.eq-scores{ display:flex; align-items:center; gap:8px; width:100%; margin-bottom:16px; }
.eq-score-card{
  flex:1; display:flex; align-items:center; gap:9px;
  background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.09);
  border-radius:16px; padding:9px 11px; position:relative;
}
.eq-score-card.right{ flex-direction:row-reverse; text-align:right; }
.eq-sc-text{ display:flex; flex-direction:column; line-height:1.05; min-width:0; }
.eq-sc-name{ font-size:12px; color:var(--eq-muted); font-weight:500; display:flex; align-items:center; gap:4px; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.eq-score-card.right .eq-sc-name{ flex-direction:row-reverse; }
.eq-combo-flame{ font-size:11px; animation:eqBob 1s ease-in-out infinite; }
.eq-sc-num{ font-size:23px; font-weight:700; }
.eq-vs-badge{
  font-size:12px; font-weight:700; color:var(--eq-bg-0);
  background:var(--eq-yellow); border-radius:9px; padding:4px 7px; flex:none;
}
.eq-thinking{ position:absolute; bottom:5px; right:9px; display:flex; gap:3px; }
.eq-score-card.right .eq-thinking{ right:auto; left:9px; }
.eq-thinking i{ width:5px; height:5px; border-radius:50%; background:var(--eq-pink); animation:eqDotty 1s infinite; }
.eq-thinking i:nth-child(2){ animation-delay:.18s; } .eq-thinking i:nth-child(3){ animation-delay:.36s; }
@keyframes eqDotty{ 0%,100%{ transform:translateY(0); opacity:.4;} 50%{ transform:translateY(-4px); opacity:1;} }

.eq-timer-track{
  width:100%; height:24px; background:rgba(0,0,0,.32); border-radius:999px;
  position:relative; overflow:hidden; margin-bottom:16px;
}
.eq-timer-fill{ height:100%; border-radius:999px; transition:width .1s linear; }
.eq-timer-fill.low{ animation:eqPulseBar .6s ease-in-out infinite; }
@keyframes eqPulseBar{ 0%,100%{ opacity:1;} 50%{ opacity:.55;} }
.eq-timer-num{
  position:absolute; top:50%; right:12px; transform:translateY(-50%);
  font-size:12px; font-weight:700; color:var(--eq-ink); text-shadow:0 1px 3px rgba(0,0,0,.6);
}

.eq-cat-badge{
  font-size:12px; font-weight:700; letter-spacing:1.5px; padding:6px 14px;
  border-radius:999px; margin-bottom:14px;
}
.eq-cat-badge.film{ background:rgba(67,232,223,.16); color:var(--eq-cyan); border:1px solid rgba(67,232,223,.34); }
.eq-cat-badge.song{ background:rgba(255,206,58,.16); color:var(--eq-yellow); border:1px solid rgba(255,206,58,.34); }

.eq-emoji-stage{ position:relative; width:100%; display:flex; align-items:center; justify-content:center; margin-bottom:16px; }
.eq-emoji-blob{
  position:absolute; width:190px; height:150px;
  background:linear-gradient(140deg,rgba(200,255,50,.16),rgba(67,232,223,.14));
  border:1.5px solid rgba(255,255,255,.1);
  border-radius:46% 54% 58% 42% / 52% 44% 56% 48%;
  animation:eqMorph 7s ease-in-out infinite;
}
.eq-emoji-puzzle{
  position:relative; font-size:62px; letter-spacing:4px; padding:24px 10px;
  animation:eqPopEmoji .5s cubic-bezier(.2,1.4,.4,1);
}
@keyframes eqPopEmoji{ from{ transform:scale(.3); opacity:0;} to{ transform:scale(1); opacity:1;} }

.eq-hint-box{
  width:100%; background:rgba(255,206,58,.1); border:1px dashed rgba(255,206,58,.4);
  border-radius:13px; padding:9px 12px; font-size:13px; color:var(--eq-ink);
  margin-bottom:12px; animation:eqPop .3s ease;
}
.eq-hint-box b{ color:var(--eq-yellow); }

.eq-input-wrap{
  display:flex; gap:8px; width:100%;
  border-radius:16px; padding:5px; background:rgba(0,0,0,.28);
  border:1.5px solid rgba(255,255,255,.12); transition:border-color .15s, background .15s;
}
.eq-input-wrap.wrong{ border-color:var(--eq-danger); background:rgba(255,93,93,.16); }
.eq-guess-input{
  flex:1; background:transparent; border:none; outline:none;
  font-family:inherit; font-size:16px; font-weight:500; color:var(--eq-ink); padding:10px 12px;
}
.eq-guess-input::placeholder{ color:var(--eq-muted); opacity:.7; }
.eq-guess-input:disabled{ opacity:.5; }
.eq-guess-btn{
  font-family:inherit; font-weight:700; font-size:14.5px; color:#1a0c33;
  background:linear-gradient(100deg,var(--eq-cyan),#2bd0c6);
  border:none; border-radius:12px; padding:0 18px; cursor:pointer;
  transition:transform .12s;
}
.eq-guess-btn:hover{ transform:scale(1.04); }
.eq-guess-btn:active{ transform:scale(.96); }
.eq-guess-btn:disabled{ opacity:.5; cursor:not-allowed; transform:none; }

.eq-hint-btn{
  margin-top:11px; font-family:inherit; font-size:13px; font-weight:500;
  background:rgba(255,255,255,.05); color:var(--eq-muted);
  border:1px solid rgba(255,255,255,.1); border-radius:11px;
  padding:9px 16px; cursor:pointer; transition:background .15s, color .15s;
}
.eq-hint-btn:hover:not(:disabled){ background:rgba(255,206,58,.12); color:var(--eq-yellow); }
.eq-hint-btn.used,.eq-hint-btn:disabled{ opacity:.6; cursor:default; }

/* ---------- round end ---------- */
.eq-result-ring{
  width:92px; height:92px; border-radius:50%; display:flex; align-items:center; justify-content:center;
  margin-bottom:14px; animation:eqRingPop .5s cubic-bezier(.2,1.4,.4,1);
}
@keyframes eqRingPop{ from{ transform:scale(0) rotate(-40deg);} to{ transform:scale(1) rotate(0);} }
.eq-result-ring.win{ background:radial-gradient(circle,rgba(200,255,50,.32),rgba(200,255,50,.05)); border:2.5px solid var(--eq-lime); }
.eq-result-ring.lose{ background:radial-gradient(circle,rgba(255,77,151,.3),rgba(255,77,151,.05)); border:2.5px solid var(--eq-pink); }
.eq-result-ring.timeout{ background:radial-gradient(circle,rgba(184,166,220,.25),transparent); border:2.5px solid var(--eq-muted); }
.eq-result-icon{ font-size:42px; }
.eq-result-head{ font-size:30px; font-weight:700; }
.eq-result-head.win{ color:var(--eq-lime); }
.eq-result-head.lose{ color:var(--eq-pink); }
.eq-result-head.timeout{ color:var(--eq-muted); }
.eq-result-sub{ font-size:14px; color:var(--eq-muted); margin:3px 0 16px; }

.eq-answer-card{
  display:flex; align-items:center; gap:14px; width:100%;
  background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1);
  border-radius:16px; padding:13px 16px; margin-bottom:14px;
}
.eq-answer-emoji{ font-size:34px; flex:none; }
.eq-answer-meta{ text-align:left; }
.eq-answer-cat{ font-size:11px; letter-spacing:1.5px; color:var(--eq-cyan); font-weight:600; }
.eq-answer-title{ font-size:19px; font-weight:700; }

.eq-pts-line{ font-size:19px; font-weight:700; display:flex; align-items:center; gap:9px; margin-bottom:16px; }
.eq-pts-line.you{ color:var(--eq-lime); }
.eq-pts-line.opp{ color:var(--eq-pink); }
.eq-pts-line.neutral{ color:var(--eq-muted); font-size:16px; }
.eq-combo-pill{
  font-size:11px; font-weight:700; letter-spacing:.5px; color:#1a0c33;
  background:var(--eq-yellow); padding:3px 9px; border-radius:999px;
  animation:eqBob 1.1s ease-in-out infinite;
}
.eq-combo-pill.opp{ background:var(--eq-pink); color:#fff; }
.eq-autonext{ font-size:11px; color:var(--eq-muted); margin-top:9px; opacity:.7; }

/* ---------- game over ---------- */
.eq-trophy{ font-size:64px; animation:eqBob 2s ease-in-out infinite; }
.eq-go-head{ font-size:34px; font-weight:700; margin:4px 0 18px; }
.eq-go-head.win{ color:var(--eq-lime); } .eq-go-head.tie{ color:var(--eq-yellow); } .eq-go-head.lose{ color:var(--eq-pink); }
.eq-final-scores{ display:flex; align-items:center; gap:18px; margin-bottom:20px; }
.eq-fs-col{
  display:flex; flex-direction:column; align-items:center; gap:5px;
  padding:14px 22px; border-radius:18px; background:rgba(255,255,255,.04);
  border:1.5px solid transparent;
}
.eq-fs-col.winner{ border-color:var(--eq-lime); background:rgba(200,255,50,.08); }
.eq-fs-name{ font-size:13px; color:var(--eq-muted); font-weight:500; }
.eq-fs-num{ font-size:34px; font-weight:700; }
.eq-fs-dash{ font-size:22px; color:var(--eq-muted); }
.eq-recap{ display:flex; gap:7px; margin-bottom:8px; flex-wrap:wrap; justify-content:center; }
.eq-recap-dot{ width:14px; height:14px; border-radius:50%; display:inline-block; }
.eq-recap-dot.win{ background:var(--eq-lime); }
.eq-recap-dot.lose{ background:var(--eq-pink); }
.eq-recap-dot.tie{ background:rgba(255,255,255,.18); }
.eq-recap-legend{ display:flex; gap:14px; font-size:11.5px; color:var(--eq-muted); margin-bottom:20px; }
.eq-recap-legend span{ display:flex; align-items:center; gap:5px; }

/* ---------- confetti ---------- */
.eq-confetti{ position:absolute; inset:0; overflow:hidden; pointer-events:none; z-index:9; }
.eq-confetti span{
  position:absolute; top:-20px; border-radius:2px;
  animation:eqFall linear forwards;
}
@keyframes eqFall{
  to{ transform:translateY(560px) rotate(640deg); opacity:0; }
}

/* ---------- countdown (Fase 3) ---------- */
.eq-countdown{
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  gap:14px; padding:40px 0;
}
.eq-countdown-num{ font-size:120px; font-weight:700; line-height:1;
  background:linear-gradient(95deg,var(--eq-lime),var(--eq-cyan));
  -webkit-background-clip:text; background-clip:text; color:transparent;
  animation:eqPopEmoji .5s cubic-bezier(.2,1.4,.4,1);
}
.eq-countdown-label{ font-size:14px; color:var(--eq-muted); letter-spacing:2px; }
`
