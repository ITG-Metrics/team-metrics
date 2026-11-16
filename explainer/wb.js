/* How your numbers work / Cómo funcionan tus números
 * Whiteboard explainer players for the team scorecards (Dillon, Nov 16 2026).
 * One glossy board drawn live in marker; narration in the device's own voice (English or Spanish),
 * captions underneath, a chapter per metric. Formulas checked against BP-Ontrac's own figures (Nov 16).
 * Loaded on demand by the two buttons on the Overview: window.WBX.open('en' | 'es', returnFocusEl).
 */
(function () {
  'use strict';
  if (window.WBX) return;

  const INK = '#23262c', BLUE = '#2a5cb3', ORANGE = '#d97757';
  const RW = 1600, RH = 900, BW = RW * 3, BH = RH * 3;      // board = 3 × 3 regions
  const HAND = '"Caveat", "Patrick Hand", "Comic Sans MS", cursive';
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ------------------------------------------------------------------ fonts (Caveat: a marker hand with accents)
  if (!document.getElementById('wbx-font')) {
    const l = document.createElement('link'); l.id = 'wbx-font'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&display=swap'; document.head.appendChild(l);
  }

  // ------------------------------------------------------------------ the two scripts
  // Each chapter sits in one board region [col, row]; each beat = one narrated line + what the marker draws meanwhile.
  // Drawing items use region coordinates (0..1600 × 0..900). Keep the bottom ~110 units clear (captions sit over it).
  const T = (s, x, y, size, color, o = {}) => ({ k: 'text', s, x, y, size, color: color || INK, ...o });
  const LINE = (pts, color, w, o = {}) => ({ k: 'line', pts, color: color || INK, w: w || 7, ...o });
  const CIRC = (cx, cy, r, color, w) => ({ k: 'circle', cx, cy, r, color: color || INK, w: w || 6 });
  const BOX = (x, y, w, h, color, lw) => ({ k: 'box', x, y, w, h, color: color || INK, lw: lw || 6 });
  const TICK = (x, y, s, color) => LINE([[x, y], [x + s * 0.35, y + s * 0.4], [x + s, y - s * 0.5]], color || INK, 9);
  const CROSS = (x, y, s, color) => [LINE([[x, y - s / 2], [x + s, y + s / 2]], color || ORANGE, 9), LINE([[x + s, y - s / 2], [x, y + s / 2]], color || ORANGE, 9)];
  const TITLE = (n, s) => [CIRC(92, 112, 42, INK, 6), T(String(n), 92, 132, 58, INK, { align: 'center' }), T(s, 160, 136, 86, INK, { bold: true })];
  const PILL = (s, x, y) => [BOX(x, y - 50, 300, 70, ORANGE, 6), T(s, x + 150, y, 44, ORANGE, { align: 'center', bold: true })];
  // a fraction: numerator over a bar over denominator, centred on cx; optional prefix to the left
  const FRAC = (num, den, cx, y, size, pre) => {
    const out = [];
    if (pre) out.push(T(pre, cx - 30, y + size * 0.35, size * 1.05, BLUE, { align: 'right' }));
    out.push(T(num, cx + 380, y - 18, size, BLUE, { align: 'center' }));
    out.push(LINE([[cx, y + 8], [cx + 760, y + 8]], BLUE, 7));
    out.push(T(den, cx + 380, y + size + 20, size, BLUE, { align: 'center' }));
    return out;
  };
  const DOTS = (marks, x, y, gap) => marks.map((m, i) => T(m, x + i * gap, y, 54, m === '+' ? BLUE : m === '–' ? ORANGE : INK, { align: 'center', bold: true }));

  const SCRIPT = {
    en: {
      lang: 'en-US', title: 'How your numbers work', menu: ['Start', 'Tool usage', 'tNPS', 'FTR', 'Repeat rate', 'Rework rate', 'PHT pass rate', 'Appointments met', 'Wrap-up'],
      ui: { play: 'Play', pause: 'Pause', close: 'Close', voiceOn: 'Voice on', voiceOff: 'Voice off', replay: 'Watch again', chapters: 'Chapters', rotate: 'Turn your phone sideways for a bigger board.', noVoice: 'No voice on this device: read the captions.' },
      chapters: [
        { at: [0, 0], beats: [
          { say: "Here's how BP-Ontrac calculates the seven numbers on your scorecard.", draw: [T('How your numbers', 120, 300, 130, INK, { bold: true }), T('are calculated', 120, 450, 130, INK, { bold: true }), LINE([[120, 490], [980, 478]], ORANGE, 9)] },
          { say: 'Three of them have a target: tool usage, tNPS and FTR. The other four show what drives them.', draw: [T('7 metrics', 120, 620, 64, BLUE), T('3 with a target:', 420, 620, 64, INK), T('Tool usage · tNPS · FTR', 120, 730, 70, ORANGE, { bold: true })] },
        ] },
        { at: [1, 0], beats: [
          { say: 'Tool usage. On every job where the tool applies, you are expected to run it.', draw: [...TITLE(1, 'Tool usage'), T('Share of eligible jobs where you ran the tool', 110, 230, 48)] },
          { say: 'Take the jobs where you ran the tool, and divide by all the eligible jobs.', draw: FRAC('jobs where you ran the tool', 'eligible jobs', 420, 370, 54) },
          { say: "Run it on 199 out of 200 jobs, and you're at 99.5 percent. Right on the target.", draw: [T('199 ÷ 200 = 99.5%', 140, 600, 70, BLUE), TICK(730, 588, 54), ...PILL('Target 99.5%', 1150, 600)] },
          { say: 'Miss just one more, and you drop to 99. One skipped job is enough to fall below.', draw: [T('198 ÷ 200 = 99.0%', 140, 720, 70, BLUE), ...CROSS(732, 702, 50)] },
        ] },
        { at: [2, 0], beats: [
          { say: 'tNPS comes from customer surveys. A 9 or 10 is a promoter, a 7 or 8 is passive, and 0 to 6 is a detractor.', draw: [...TITLE(2, 'tNPS'), T('0 – 6', 160, 260, 54, ORANGE), T('detractor', 300, 260, 48, ORANGE), T('7 – 8', 640, 260, 54, INK), T('passive', 780, 260, 48), T('9 – 10', 1060, 260, 54, BLUE), T('promoter', 1210, 260, 48, BLUE)] },
          { say: 'Subtract the detractors from the promoters, then divide by all the surveys.', draw: FRAC('promoters − detractors', 'all surveys', 420, 400, 54) },
          { say: 'Say you have 20 surveys: 18 promoters, one passive and one detractor. That is 17 divided by 20. A score of 85.', draw: [...DOTS(['+', '+', '+', '+', '+', '+', '+', '+', '+', '+', '+', '+', '+', '+', '+', '+', '+', '+', '~', '–'], 150, 590, 46), T('(18 − 1) ÷ 20 = 85', 140, 700, 66, BLUE), ...CROSS(700, 682, 48), ...PILL('Target 95', 1150, 700)] },
          { say: 'Passives still count in the total, and with 20 surveys each detractor costs 10 points. If detractors outnumber promoters, BP-Ontrac shows zero.', draw: [T('passives count in the total · 1 detractor = −10 pts (of 20)', 140, 790, 44, INK)] },
        ] },
        { at: [0, 1], beats: [
          { say: 'FTR, first time right, is the share of jobs fixed on the first visit, with no repeat.', draw: [...TITLE(3, 'FTR · First time right'), T('Share of jobs fixed the first time, with no repeat visit', 110, 230, 48)] },
          { say: 'Take the jobs that came back, divide by all your jobs, and subtract that from one.', draw: FRAC('jobs that came back', 'all jobs', 520, 380, 54, '1 −') },
          { say: '100 jobs, and 6 come back: that is 94 percent. Above the 93 percent target.', draw: [T('1 − 6 ÷ 100 = 94%', 140, 620, 70, BLUE), TICK(700, 608, 54), ...PILL('Target 93%', 1150, 620)] },
          { say: 'Before you leave, check the drop, the connectors and the ground.', draw: [T('Tip: check the drop, the connectors and the ground before you leave', 140, 740, 44, INK)] },
        ] },
        { at: [1, 1], beats: [
          { say: 'Repeat rate is the share of trouble calls where the customer needed another visit for the same issue. Lower is better.', draw: [...TITLE(4, 'Repeat rate'), T('Trouble calls with a repeat visit for the same issue', 110, 230, 48), T('lower is better ↓', 1180, 230, 44, BLUE)] },
          { say: 'Divide the repeat visits by your trouble calls. 4 repeats out of 50 trouble calls is 8 percent.', draw: [...FRAC('repeat visits', 'trouble calls', 420, 400, 54), T('4 ÷ 50 = 8%', 140, 660, 70, BLUE)] },
        ] },
        { at: [2, 1], beats: [
          { say: 'Rework rate counts the installs and trouble calls that needed rework. Lower is better.', draw: [...TITLE(5, 'Rework rate'), T('Installs and trouble calls that needed rework', 110, 230, 48), T('lower is better ↓', 1180, 230, 44, BLUE)] },
          { say: 'Divide the rework by your installs plus trouble calls. 4 out of 30 installs plus 50 trouble calls is 5 percent.', draw: [...FRAC('rework', 'installs + trouble calls', 420, 400, 54), T('4 ÷ (30 + 50) = 5%', 140, 660, 70, BLUE)] },
        ] },
        { at: [0, 2], beats: [
          { say: 'PHT pass rate is the share of premise health tests that passed.', draw: [...TITLE(6, 'PHT pass rate'), T('Premise health tests that passed', 110, 230, 48)] },
          { say: 'Subtract the fails from the tests, then divide by the tests. One fail in 60 tests is 98.3 percent.', draw: [...FRAC('tests − fails', 'tests', 420, 400, 54), T('(60 − 1) ÷ 60 = 98.3%', 140, 640, 70, BLUE)] },
          { say: 'If the PHT fails, fix it before you close the job.', draw: [T('Tip: if the PHT fails, fix it before you close the job', 140, 750, 44, INK)] },
        ] },
        { at: [1, 2], beats: [
          { say: 'Appointments met is the share of appointments where you arrived inside the window.', draw: [...TITLE(7, 'Appointments met'), T('Appointments where you arrived in the window', 110, 230, 48)] },
          { say: 'Divide the met appointments by all your appointments. 97 out of 100 is 97 percent.', draw: [...FRAC('appointments met', 'all appointments', 420, 400, 54), T('97 ÷ 100 = 97%', 140, 660, 70, BLUE)] },
        ] },
        { at: [2, 2], full: true, beats: [
          { say: "That's all seven. The three with a target are circled.", draw: [
            { k: 'ring', ch: 1 }, { k: 'ring', ch: 2 }, { k: 'ring', ch: 3 }] },
          { say: 'Every job counts.', draw: [T('Every job counts.', 800, 470, 150, INK, { align: 'center', bold: true }), LINE([[360, 510], [1250, 498]], ORANGE, 10)] },
        ] },
      ],
    },
    es: {
      lang: 'es-US', title: 'Cómo funcionan tus números', menu: ['Inicio', 'Uso de herramienta', 'tNPS', 'FTR', 'Tasa de repetición', 'Tasa de retrabajo', 'Aprobación PHT', 'Citas cumplidas', 'Resumen'],
      ui: { play: 'Reproducir', pause: 'Pausa', close: 'Cerrar', voiceOn: 'Voz activada', voiceOff: 'Voz desactivada', replay: 'Ver otra vez', chapters: 'Capítulos', rotate: 'Gira el teléfono para ver la pizarra más grande.', noVoice: 'Este dispositivo no tiene voz en español: lee los subtítulos.' },
      chapters: [
        { at: [0, 0], beats: [
          { say: 'Así calcula BP-Ontrac los siete números de tu scorecard.', draw: [T('Cómo se calculan', 120, 300, 130, INK, { bold: true }), T('tus números', 120, 450, 130, INK, { bold: true }), LINE([[120, 490], [900, 478]], ORANGE, 9)] },
          { say: 'Tres tienen meta: uso de herramienta, tNPS y FTR. Los otros cuatro muestran qué los impulsa.', draw: [T('7 métricas', 120, 620, 64, BLUE), T('3 con meta:', 440, 620, 64, INK), T('Uso de herramienta · tNPS · FTR', 120, 730, 70, ORANGE, { bold: true })] },
        ] },
        { at: [1, 0], beats: [
          { say: 'Uso de herramienta. En cada trabajo donde aplica la herramienta, tienes que usarla.', draw: [...TITLE(1, 'Uso de herramienta'), T('Porcentaje de trabajos elegibles en los que usaste la herramienta', 110, 230, 46)] },
          { say: 'Toma los trabajos donde usaste la herramienta y divídelos entre todos los trabajos elegibles.', draw: FRAC('trabajos donde usaste la herramienta', 'trabajos elegibles', 420, 370, 52) },
          { say: 'Si la usas en 199 de 200 trabajos, tienes 99.5 por ciento. Justo en la meta.', draw: [T('199 ÷ 200 = 99.5%', 140, 600, 70, BLUE), TICK(730, 588, 54), ...PILL('Meta 99.5%', 1150, 600)] },
          { say: 'Si te falta uno más, bajas a 99. Un solo trabajo sin la herramienta basta para quedar por debajo.', draw: [T('198 ÷ 200 = 99.0%', 140, 720, 70, BLUE), ...CROSS(732, 702, 50)] },
        ] },
        { at: [2, 0], beats: [
          { say: 'El tNPS viene de las encuestas de los clientes. Un 9 o 10 es promotor, un 7 u 8 es pasivo, y de 0 a 6 es detractor.', draw: [...TITLE(2, 'tNPS'), T('0 – 6', 160, 260, 54, ORANGE), T('detractor', 300, 260, 48, ORANGE), T('7 – 8', 640, 260, 54, INK), T('pasivo', 780, 260, 48), T('9 – 10', 1060, 260, 54, BLUE), T('promotor', 1210, 260, 48, BLUE)] },
          { say: 'Resta los detractores de los promotores y divide entre todas las encuestas.', draw: FRAC('promotores − detractores', 'todas las encuestas', 420, 400, 54) },
          { say: 'Digamos que tienes 20 encuestas: 18 promotores, un pasivo y un detractor. Son 17 entre 20. Una nota de 85.', draw: [...DOTS(['+', '+', '+', '+', '+', '+', '+', '+', '+', '+', '+', '+', '+', '+', '+', '+', '+', '+', '~', '–'], 150, 590, 46), T('(18 − 1) ÷ 20 = 85', 140, 700, 66, BLUE), ...CROSS(700, 682, 48), ...PILL('Meta 95', 1150, 700)] },
          { say: 'Los pasivos también cuentan en el total, y con 20 encuestas cada detractor cuesta 10 puntos. Si hay más detractores que promotores, BP-Ontrac muestra cero.', draw: [T('los pasivos cuentan en el total · 1 detractor = −10 pts (de 20)', 140, 790, 44, INK)] },
        ] },
        { at: [0, 1], beats: [
          { say: 'FTR, resuelto a la primera, es el porcentaje de trabajos resueltos en la primera visita, sin visita repetida.', draw: [...TITLE(3, 'FTR · Resuelto a la primera'), T('Porcentaje de trabajos resueltos a la primera, sin visita repetida', 110, 230, 46)] },
          { say: 'Divide los trabajos que regresaron entre todos tus trabajos, y réstalo de uno.', draw: FRAC('trabajos que regresaron', 'todos los trabajos', 520, 380, 54, '1 −') },
          { say: '100 trabajos, y 6 regresan: eso es 94 por ciento. Por encima de la meta de 93.', draw: [T('1 − 6 ÷ 100 = 94%', 140, 620, 70, BLUE), TICK(700, 608, 54), ...PILL('Meta 93%', 1150, 620)] },
          { say: 'Antes de irte, revisa el drop, los conectores y la tierra.', draw: [T('Consejo: revisa el drop, los conectores y la tierra antes de irte', 140, 740, 44, INK)] },
        ] },
        { at: [1, 1], beats: [
          { say: 'La tasa de repetición es el porcentaje de llamadas de servicio en las que el cliente necesitó otra visita por el mismo problema. Menos es mejor.', draw: [...TITLE(4, 'Tasa de repetición'), T('Llamadas de servicio con visita repetida por el mismo problema', 110, 230, 46), T('menos es mejor ↓', 1180, 300, 44, BLUE)] },
          { say: 'Divide las visitas repetidas entre tus llamadas de servicio. 4 de 50 es 8 por ciento.', draw: [...FRAC('visitas repetidas', 'llamadas de servicio', 420, 420, 54), T('4 ÷ 50 = 8%', 140, 680, 70, BLUE)] },
        ] },
        { at: [2, 1], beats: [
          { say: 'La tasa de retrabajo cuenta las instalaciones y llamadas de servicio que necesitaron retrabajo. Menos es mejor.', draw: [...TITLE(5, 'Tasa de retrabajo'), T('Instalaciones y llamadas de servicio que necesitaron retrabajo', 110, 230, 46), T('menos es mejor ↓', 1180, 300, 44, BLUE)] },
          { say: 'Divide el retrabajo entre tus instalaciones más las llamadas de servicio. 4 de 30 instalaciones más 50 llamadas es 5 por ciento.', draw: [...FRAC('retrabajo', 'instalaciones + llamadas de servicio', 420, 420, 52), T('4 ÷ (30 + 50) = 5%', 140, 680, 70, BLUE)] },
        ] },
        { at: [0, 2], beats: [
          { say: 'La tasa de aprobación PHT es el porcentaje de pruebas de salud del domicilio que pasaron.', draw: [...TITLE(6, 'Tasa de aprobación PHT'), T('Pruebas de salud del domicilio (PHT) aprobadas', 110, 230, 46)] },
          { say: 'Resta las fallas de las pruebas y divide entre las pruebas. Una falla en 60 pruebas es 98.3 por ciento.', draw: [...FRAC('pruebas − fallas', 'pruebas', 420, 400, 54), T('(60 − 1) ÷ 60 = 98.3%', 140, 640, 70, BLUE)] },
          { say: 'Si el PHT falla, corrígelo antes de cerrar el trabajo.', draw: [T('Consejo: si el PHT falla, corrígelo antes de cerrar el trabajo', 140, 750, 44, INK)] },
        ] },
        { at: [1, 2], beats: [
          { say: 'Citas cumplidas es el porcentaje de citas en las que llegaste dentro del horario.', draw: [...TITLE(7, 'Citas cumplidas'), T('Citas en las que llegaste dentro del horario', 110, 230, 46)] },
          { say: 'Divide las citas cumplidas entre todas tus citas. 97 de 100 es 97 por ciento.', draw: [...FRAC('citas cumplidas', 'todas las citas', 420, 400, 54), T('97 ÷ 100 = 97%', 140, 660, 70, BLUE)] },
        ] },
        { at: [2, 2], full: true, beats: [
          { say: 'Esas son las siete. Las tres con meta están marcadas en círculo.', draw: [
            { k: 'ring', ch: 1 }, { k: 'ring', ch: 2 }, { k: 'ring', ch: 3 }] },
          { say: 'Cada trabajo cuenta.', draw: [T('Cada trabajo cuenta.', 800, 470, 150, INK, { align: 'center', bold: true }), LINE([[300, 510], [1300, 498]], ORANGE, 10)] },
        ] },
      ],
    },
  };

  // ------------------------------------------------------------------ helpers
  const clamp01 = (k) => (k < 0 ? 0 : k > 1 ? 1 : k);
  const hand = (u) => clamp01(u - Math.sin(2 * Math.PI * u) / (2 * Math.PI) * 0.8);   // slow-fast-slow
  const easeIO = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const seeded = (seed) => { let s = seed % 2147483647 || 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; };

  // a hand-drawn polyline: resampled, with a slow wobble along the normal and a fine tremor; circles overlap past closure
  function wobble(pts, seed, closed) {
    const r = seeded(seed * 97 + 13), out = [], amp = 2.2 + r() * 1.6, wl = 260 + r() * 200, ph = r() * 6.28;
    let dist = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[i + 1], L = Math.hypot(x2 - x1, y2 - y1) || 1, nx = -(y2 - y1) / L, ny = (x2 - x1) / L, n = Math.max(1, Math.round(L / 8));
      for (let j = 0; j < n; j++) {
        const f = j / n, d = dist + L * f, off = Math.sin(d / wl * 6.28 + ph) * amp + (r() - 0.5) * 0.9;
        out.push([x1 + (x2 - x1) * f + nx * off, y1 + (y2 - y1) * f + ny * off]);
      }
      dist += L;
    }
    const last = pts[pts.length - 1]; out.push([last[0] + (r() - 0.5) * 2, last[1] + (r() - 0.5) * 2]);
    return out;
  }
  function circlePts(cx, cy, r, sq, seed) {
    const rr = seeded(seed), a0 = -2.2 + rr() * 0.6, n = 64, out = [];
    for (let i = 0; i <= n * 1.08; i++) { const a = a0 + i / n * Math.PI * 2, rad = r * (1 + Math.sin(a * 2 + seed) * 0.03); out.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * (sq || 1)]); }
    return out;
  }

  // ------------------------------------------------------------------ player
  let ui = null, ctx = null, CW = 0, CH = 0, DPR = 1, raf = 0, S = null;

  function css() {
    if (document.getElementById('wbx-css')) return;
    const st = document.createElement('style'); st.id = 'wbx-css';
    st.textContent = `
.wbx{position:fixed;inset:0;z-index:2147483000;background:#11151b;display:flex;flex-direction:column;font:15px/1.35 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#e8ecf2}
.wbx-top{display:flex;align-items:center;gap:10px;padding:10px 14px;padding-top:max(10px,env(safe-area-inset-top))}
.wbx-top h2{flex:1;margin:0;font-size:17px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.wbx button{font:inherit;color:inherit;background:#1f2631;border:1px solid #333d4c;border-radius:999px;padding:8px 14px;cursor:pointer;min-height:40px}
.wbx button:hover{background:#29323f}.wbx button:focus-visible{outline:2px solid #8ab4ff;outline-offset:2px}
.wbx-stage{position:relative;flex:1;min-height:0}
.wbx canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.wbx-cap{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);max-width:min(92%,980px);background:rgba(250,248,242,.93);color:#23262c;border-radius:12px;padding:10px 16px 10px 22px;font:500 22px/1.25 "Caveat","Patrick Hand",system-ui,sans-serif;box-shadow:0 4px 18px rgba(0,0,0,.25);border-left:6px solid ${ORANGE};text-align:left}
.wbx-cap:empty{display:none}
.wbx-hint{position:absolute;left:50%;top:10px;transform:translateX(-50%);background:rgba(17,21,27,.8);padding:6px 12px;border-radius:999px;font-size:13px;white-space:nowrap}
.wbx-bar{display:flex;gap:8px;align-items:center;padding:10px 14px;padding-bottom:max(10px,env(safe-area-inset-bottom));overflow-x:auto}
.wbx-bar .wbx-ch{display:flex;gap:6px;flex:1;overflow-x:auto;scrollbar-width:none}
.wbx-bar .wbx-ch button{white-space:nowrap;font-size:13px;padding:6px 12px;min-height:34px}
.wbx-bar .wbx-ch button[aria-current="true"]{background:#e8ecf2;color:#11151b;border-color:#e8ecf2}
.wbx-end{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none}
.wbx-end button{pointer-events:auto;font-size:18px;padding:12px 22px;background:${ORANGE};border-color:${ORANGE};color:#fff}
@media (max-width:600px){.wbx-cap{font-size:19px;bottom:8px}.wbx-top h2{font-size:15px}}
@media (max-height:480px){.wbx-cap{font-size:16px;padding:6px 12px 6px 16px;bottom:6px;max-width:70%}.wbx-top,.wbx-bar{padding-top:6px;padding-bottom:6px}.wbx button{min-height:34px;padding:5px 11px}.wbx-top h2{font-size:14px}}`;
    document.head.appendChild(st);
  }

  function build(lang, back) {
    css();
    const L = SCRIPT[lang];
    const root = document.createElement('div'); root.className = 'wbx'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); root.setAttribute('aria-label', L.title); root.lang = lang;
    root.innerHTML = `
      <div class="wbx-top"><h2></h2><button type="button" data-a="voice"></button><button type="button" data-a="play"></button><button type="button" data-a="close" aria-label="${L.ui.close}">✕</button></div>
      <div class="wbx-stage"><canvas aria-hidden="true"></canvas><div class="wbx-cap" aria-live="polite"></div><div class="wbx-hint" hidden></div><div class="wbx-end" hidden><button type="button" data-a="replay"></button></div></div>
      <div class="wbx-bar"><div class="wbx-ch" role="group" aria-label="${L.ui.chapters}"></div></div>`;
    root.querySelector('h2').textContent = L.title;
    const ch = root.querySelector('.wbx-ch');
    L.menu.forEach((m, i) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = m; b.dataset.ch = i; ch.appendChild(b); });
    document.body.appendChild(root);
    const prevOverflow = document.documentElement.style.overflow; document.documentElement.style.overflow = 'hidden';
    const cv = root.querySelector('canvas');
    S = { lang, L, root, cv, cap: root.querySelector('.wbx-cap'), hint: root.querySelector('.wbx-hint'), end: root.querySelector('.wbx-end'),
      ci: 0, bi: 0, t: 0, playing: true, speechDone: true, est: 3, last: 0, voice: true, hasVoice: !!window.speechSynthesis, cam: null, back, prevOverflow, noiseGain: null, ac: null, items: null, seedN: 1 };
    ctx = cv.getContext('2d');
    prepItems();
    root.addEventListener('click', onClick);
    root.addEventListener('keydown', onKey);
    window.addEventListener('resize', resize);
    resize(); syncUi();
    root.querySelector('[data-a="play"]').focus();
    pickVoice();
    if (window.speechSynthesis && speechSynthesis.onvoiceschanged !== undefined) speechSynthesis.onvoiceschanged = pickVoice;
    soundInit();
    startBeat();
    S.last = performance.now(); raf = requestAnimationFrame(tick);
  }

  // flatten the chapters into drawable items with absolute board coordinates
  function prepItems() {
    let seed = 1;
    S.L.chapters.forEach((c, ci) => {
      const ox = c.at[0] * RW, oy = c.at[1] * RH;
      c.beats.forEach((b) => {
        b.items = b.draw.map((d) => {
          const it = { ...d, seed: seed++ }, dx = d.abs ? 0 : ox, dy = d.abs ? 0 : oy;
          if (it.k === 'line') it.path = wobble(d.pts.map(([x, y]) => [x + dx, y + dy]), it.seed);
          if (it.k === 'circle') it.path = circlePts(d.cx + dx, d.cy + dy, d.r, d.sq, it.seed);
          if (it.k === 'box') { const x = d.x + dx, y = d.y + dy; it.path = wobble([[x - 4, y], [x + d.w + 6, y + 2], [x + d.w, y + d.h + 4], [x + 2, y + d.h], [x, y - 6]], it.seed); }
          if (it.k === 'text') { it.ax = d.x + dx; it.ay = d.y + dy; }
          if (it.k === 'ring') {           // an orange ring around a chapter's title, measured from the title itself
            const tc = S.L.chapters[d.ch], title = tc.beats[0].draw.find((q) => q.k === 'text' && q.size === 86);
            ctx.font = `700 86px ${HAND}`; const w = ctx.measureText(title.s).width;
            const x0 = tc.at[0] * RW + 40, x1 = tc.at[0] * RW + title.x + w + 40, ccx = (x0 + x1) / 2, r = (x1 - x0) / 2 + 40;
            it.k = 'circle'; it.color = ORANGE; it.w = 9; it.path = circlePts(ccx, tc.at[1] * RH + 108, r, 95 / r, it.seed);
          }
          it.weight = it.k === 'text' ? Math.max(0.35, d.s.length * 0.045) : it.k === 'circle' ? 0.8 : 0.45;
          return it;
        });
        const tot = b.items.reduce((a, it) => a + it.weight, 0); let acc = 0;
        b.items.forEach((it) => { it.f0 = acc / tot; acc += it.weight; it.f1 = acc / tot; });
      });
    });
  }

  // ------------------------------------------------------------------ narration
  function pickVoice() {
    if (!window.speechSynthesis) return;
    const want = S && S.lang === 'es' ? /^es/i : /^en/i, vs = speechSynthesis.getVoices().filter((v) => want.test(v.lang));
    const pref = S && S.lang === 'es' ? [/es-US/i, /es-MX/i, /es-419/i, /es/i] : [/en-US/i, /en/i];
    const nice = /(Paulina|Mónica|Monica|Juan|Google español de Estados Unidos|Google español|Samantha|Alex|Google US English|Natural|Neural)/i;
    let best = null;
    for (const p of pref) { const c = vs.filter((v) => p.test(v.lang)); if (c.length) { best = c.find((v) => nice.test(v.name)) || c[0]; break; } }
    if (S) { S.v = best; if (!vs.length && speechSynthesis.getVoices().length) { S.hasVoice = false; } }
  }
  function startBeat() {
    const b = S.L.chapters[S.ci].beats[S.bi];
    S.t = 0; S.cap.textContent = b.say;
    S.est = Math.max(1.8, b.say.length / (S.lang === 'es' ? 14.5 : 15.5));
    S.speechDone = true;
    if (S.voice && S.hasVoice && window.speechSynthesis) {
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(b.say); u.lang = S.L.lang; if (S.v) u.voice = S.v; u.rate = 1; u.pitch = 1;
        const me = { b, started: false }; S.speechDone = false; S.utt = me;
        u.onstart = () => { me.started = true; };
        u.onend = u.onerror = () => { if (S && S.utt === me) S.speechDone = true; };
        speechSynthesis.speak(u);
      } catch (e) { S.speechDone = true; }
    }
    syncUi();
  }
  function stopSpeech() { try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) { /* ignore */ } if (S) S.utt = null; }

  // ------------------------------------------------------------------ marker sound (felt on gloss), quiet under the voice
  function soundInit() {
    if (S.ac || still) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      const ac = window.__wbxAC || new AC(), len = ac.sampleRate * 2, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3600; bp.Q.value = 0.9;
      const g = ac.createGain(); g.gain.value = 0;
      src.connect(bp); bp.connect(g); g.connect(ac.destination); src.start();
      S.ac = ac; S.noiseGain = g;
    } catch (e) { /* no sound */ }
  }

  // ------------------------------------------------------------------ loop
  function tick(now) {
    if (!S) return;
    const dt = Math.min(0.1, (now - S.last) / 1000); S.last = now;
    let drawing = false;
    if (S.playing) {
      S.t += dt;
      const draw = still ? 0.01 : S.est * 0.88;
      drawing = S.t < draw;
      const watchdog = S.t > S.est * 2 + 2 || (S.utt && !S.utt.started && S.t > 2.5);   // the device never started speaking: go by the captions
      if (S.t >= draw && (S.speechDone || watchdog) && S.t >= Math.min(S.est, 1.2) + 0.35) next();
    }
    if (S.noiseGain) { const g = S.noiseGain.gain; g.setTargetAtTime(drawing && S.playing ? (S.voice ? 0.025 : 0.05) : 0, S.ac.currentTime, 0.04); }
    render();
    raf = requestAnimationFrame(tick);
  }
  function next() {
    const c = S.L.chapters[S.ci];
    if (S.bi < c.beats.length - 1) { S.bi++; startBeat(); return; }
    if (S.ci < S.L.chapters.length - 1) { S.ci++; S.bi = 0; startBeat(); return; }
    S.playing = false; S.t = 99; S.end.hidden = false; syncUi();
    const r = S.end.querySelector('button'); if (r) r.focus();
  }
  function jump(ci) { stopSpeech(); S.ci = ci; S.bi = 0; S.playing = true; S.end.hidden = true; startBeat(); }

  // ------------------------------------------------------------------ rendering
  function resize() {
    if (!S) return;
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    const r = S.cv.getBoundingClientRect(); CW = Math.max(1, Math.round(r.width * DPR)); CH = Math.max(1, Math.round(r.height * DPR));
    S.cv.width = CW; S.cv.height = CH;
    const portrait = r.height > r.width * 1.1; S.hint.hidden = !portrait; S.hint.textContent = S.L.ui.rotate;
  }
  function targetCam() {
    const c = S.L.chapters[S.ci];
    if (c.full && S.bi >= 0 && S.t > 0.2) { const sf = Math.min(CW / BW, (CH * 0.82) / BH) * 0.97; return { cx: BW / 2, cy: BH / 2 + (CH * 0.09) / sf, s: sf }; }
    // keep the region in the top ~80 % of the stage so the captions never cover the writing
    const sc = Math.min(CW / RW, (CH * 0.8) / RH) * 0.98;
    const cx = c.at[0] * RW + RW / 2, cy = c.at[1] * RH + RH / 2 + (CH * 0.1) / sc;
    return { cx, cy, s: sc };
  }
  function render() {
    const tc = targetCam();
    if (!S.cam || still) S.cam = { ...tc };
    else { const k = 0.08; S.cam.cx += (tc.cx - S.cam.cx) * k; S.cam.cy += (tc.cy - S.cam.cy) * k; S.cam.s = 1 / (1 / S.cam.s + (1 / tc.s - 1 / S.cam.s) * k); }   // zoom in 1/z
    const { cx, cy, s } = S.cam;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#11151b'; ctx.fillRect(0, 0, CW, CH);
    ctx.setTransform(s, 0, 0, s, CW / 2 - cx * s, CH / 2 - cy * s);
    // board: warm white, ghost marks, region seams barely there
    const g = ctx.createLinearGradient(0, 0, BW, BH); g.addColorStop(0, '#fbfaf6'); g.addColorStop(1, '#efede7');
    ctx.fillStyle = g; ctx.fillRect(0, 0, BW, BH);
    ghosts();
    // ink (multiply, like real marker)
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 0.94;
    let pen = null;
    S.L.chapters.forEach((c, ci) => c.beats.forEach((b, bi) => {
      const done = ci < S.ci || (ci === S.ci && bi < S.bi);
      const cur = ci === S.ci && bi === S.bi;
      if (!done && !cur) return;
      const p = done ? 1 : clamp01(S.t / (still ? 0.01 : S.est * 0.88));
      for (const it of b.items) {
        const k = done ? 1 : clamp01((p - it.f0) / Math.max(0.0001, it.f1 - it.f0));
        if (k <= 0) continue;
        const h = drawItem(it, hand(k), s);
        if (cur && k < 1 && h) pen = { x: h[0], y: h[1], color: it.color };
      }
    }));
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    // window sheen, drifting slower than the camera
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    const sx = -(cx * s) * 0.35 % (CW * 1.6), sg = ctx.createLinearGradient(sx, 0, sx + CW * 0.9, CH);
    sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.45, 'rgba(255,255,255,.13)'); sg.addColorStop(0.55, 'rgba(255,255,255,.08)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg; ctx.fillRect(0, 0, CW, CH); ctx.restore();
    if (pen && !still) marker(pen.x, pen.y, pen.color, s);
  }
  let GH = null;
  function ghosts() {
    if (!GH) { const r = seeded(4242), w = ['÷', '%', '×', '=', 'Σ', '?', '→', 'avg', '≈']; GH = Array.from({ length: 40 }, () => ({ x: r() * BW, y: r() * BH, s: w[(r() * w.length) | 0], z: 60 + r() * 120, a: r() * 0.5 - 0.25 })); }
    ctx.save(); ctx.fillStyle = 'rgba(120,130,150,.07)';
    GH.forEach((q) => { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.a); ctx.font = `${q.z}px ${HAND}`; ctx.fillText(q.s, 0, 0); ctx.restore(); });
    ctx.restore();
  }
  function strokePart(path, k, color, w) {
    const n = Math.max(2, Math.ceil(path.length * k)); if (n < 2) return null;
    ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // pressure ramp at the start, taper at the end
    ctx.beginPath(); ctx.moveTo(path[0][0], path[0][1]);
    for (let i = 1; i < n; i++) ctx.lineTo(path[i][0], path[i][1]);
    ctx.lineWidth = w; ctx.stroke();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(path[0][0], path[0][1], w * 0.42, 0, 6.283); ctx.fill();   // pooled ink, inside the stroke
    return path[n - 1];
  }
  const WRAP = new Map();
  function drawItem(it, k, s) {
    if (it.k === 'box') return strokePart(it.path, k, it.color, it.lw || 6);
    if (it.k === 'line' || it.k === 'circle') return strokePart(it.path, k, it.color, it.w || 6);
    if (it.k === 'text') {
      ctx.font = `${it.bold ? 700 : 500} ${it.size}px ${HAND}`; ctx.fillStyle = it.color; ctx.textAlign = 'left';
      const w = ctx.measureText(it.s).width;
      const x0 = it.align === 'center' ? it.ax - w / 2 : it.align === 'right' ? it.ax - w : it.ax;
      if (k >= 1) { ctx.fillText(it.s, x0, it.ay); return null; }
      const r = seeded(it.seed), cut = w * k;
      ctx.save(); ctx.beginPath(); ctx.rect(x0 - 10, it.ay - it.size * 1.2, cut + 10, it.size * 1.7); ctx.clip();
      ctx.fillText(it.s, x0, it.ay); ctx.restore();
      return [x0 + cut, it.ay - it.size * 0.3 + (r() - 0.5) * it.size * 0.3];
    }
    return null;
  }
  function marker(x, y, color, s) {
    ctx.save(); ctx.globalCompositeOperation = 'source-over';
    const L = 210, W = 34;
    // shadow on the board
    ctx.save(); ctx.translate(x + 26, y + 30); ctx.rotate(-0.95); ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.filter = 'blur(6px)'; ctx.fillRect(0, -W / 2, L, W); ctx.restore();
    ctx.translate(x, y); ctx.rotate(-0.95);
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(22, -7); ctx.lineTo(22, 7); ctx.closePath(); ctx.fill();          // nib
    ctx.fillStyle = '#f4f4f2'; ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(22, -W / 2, L - 22, W, 8) : ctx.rect(22, -W / 2, L - 22, W); ctx.fill(); ctx.stroke();
    ctx.fillStyle = color; ctx.fillRect(L - 46, -W / 2, 34, W);                                                                            // colour band
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(30, -W / 2 + 5, L - 70, 5);                                                       // gloss
    ctx.restore();
  }

  // ------------------------------------------------------------------ controls
  function syncUi() {
    if (!S) return;
    const L = S.L;
    const pb = S.root.querySelector('[data-a="play"]'); pb.textContent = S.playing ? '❚❚ ' + L.ui.pause : '▶ ' + L.ui.play; pb.setAttribute('aria-pressed', String(!S.playing));
    const vb = S.root.querySelector('[data-a="voice"]'); vb.hidden = !S.hasVoice; vb.textContent = S.voice ? '🔊 ' + L.ui.voiceOn : '🔇 ' + L.ui.voiceOff; vb.setAttribute('aria-pressed', String(S.voice));
    S.root.querySelector('[data-a="replay"]').textContent = '↺ ' + L.ui.replay;
    S.root.querySelectorAll('[data-ch]').forEach((b) => b.setAttribute('aria-current', String(+b.dataset.ch === S.ci)));
    const cur = S.root.querySelector(`[data-ch="${S.ci}"]`); if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    if (!S.hasVoice && !S.warned) { S.warned = true; S.cap.textContent = L.ui.noVoice; }
  }
  function onClick(e) {
    const b = e.target.closest('button'); if (!b || !S) return;
    soundInit(); if (S.ac && S.ac.state === 'suspended') S.ac.resume().catch(() => {});
    if (b.dataset.ch !== undefined) return jump(+b.dataset.ch);
    const a = b.dataset.a;
    if (a === 'close') return close();
    if (a === 'replay') return jump(0);
    if (a === 'play') { S.playing = !S.playing; if (S.playing) { S.end.hidden = true; if (S.t >= 99) jump(0); else startBeat(); } else stopSpeech(); syncUi(); }
    if (a === 'voice') { S.voice = !S.voice; if (!S.voice) { stopSpeech(); S.speechDone = true; } else if (S.playing) startBeat(); syncUi(); }
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    if (e.key === ' ' && e.target === S.root) { e.preventDefault(); S.root.querySelector('[data-a="play"]').click(); }
    if (e.key === 'Tab') {   // keep focus inside the player
      const f = [...S.root.querySelectorAll('button:not([hidden])')].filter((x) => x.offsetParent !== null);
      if (!f.length) return; const i = f.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    }
  }
  function close() {
    if (!S) return;
    stopSpeech(); cancelAnimationFrame(raf);
    try { if (S.noiseGain) S.noiseGain.disconnect(); if (S.ac && S.ac !== window.__wbxAC) S.ac.close(); } catch (e) { /* ignore */ }
    window.removeEventListener('resize', resize);
    document.documentElement.style.overflow = S.prevOverflow;
    S.root.remove(); const back = S.back; S = null; if (back && back.focus) back.focus();
  }
  function open(lang, back) {
    if (S) close();
    const go = () => build(SCRIPT[lang] ? lang : 'en', back);
    const f = document.fonts && document.fonts.load ? Promise.race([document.fonts.load('700 40px Caveat'), new Promise((r) => setTimeout(r, 1200))]) : Promise.resolve();
    f.then(go, go);
  }

  window.WBX = { open, close, _script: SCRIPT, _seek: (ci, bi, t) => { if (!S) return; stopSpeech(); S.ci = ci; S.bi = bi; startBeat(); S.t = t; S.playing = false; syncUi(); render(); } };
})();
