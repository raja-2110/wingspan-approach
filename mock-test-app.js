// ═══════════════════════════════════════════════════════
// Wingspan Approach — Mock Test App (Interactive Edition)
// ═══════════════════════════════════════════════════════
const { jsPDF } = window.jspdf;

// ── State ─────────────────────────────────────────────
let state = {
  mode: 'config',   // 'config' | 'test' | 'review'
  questions: [],
  answers: {},       // { idx: selectedValue }
  submitted: false,
  startTime: null,
  elapsed: 0,
  timerInterval: null,
  config: {}
};

// ── Init ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  populateTopicDropdown();
  updateAvailableCount();

  ['topicSelect','difficultySelect','typeSelect','countSelect'].forEach(id => {
    document.getElementById(id).addEventListener('change', updateAvailableCount);
  });
});

function toggleMobileMenu() {
  document.getElementById('mobileMenu').classList.toggle('hidden');
}

function populateTopicDropdown() {
  const sel = document.getElementById('topicSelect');
  AVAILABLE_TOPICS.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t; opt.textContent = t;
    sel.appendChild(opt);
  });
}

function getFilteredPool() {
  const topic = document.getElementById('topicSelect').value;
  const diff  = document.getElementById('difficultySelect').value;
  const type  = document.getElementById('typeSelect').value;
  return QUESTION_BANK.filter(q =>
    (topic === 'all' || q.topic === topic) &&
    (diff  === 'all' || q.difficulty === diff) &&
    (type  === 'all' || q.type === type)
  );
}

function updateAvailableCount() {
  const n = getFilteredPool().length;
  document.getElementById('availableCount').textContent = `${n} question${n !== 1 ? 's' : ''} available`;
}

// ── Generate Test ─────────────────────────────────────
function generateTest() {
  const pool  = getFilteredPool();
  const count = parseInt(document.getElementById('countSelect').value);

  if (pool.length === 0) {
    alert('No questions match your filters. Try picking a broader category or difficulty.');
    return;
  }

  // Stop any existing timer
  stopTimer();

  const topicEl = document.getElementById('topicSelect');
  const diffEl  = document.getElementById('difficultySelect');
  const typeEl  = document.getElementById('typeSelect');

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  state.questions = shuffled.slice(0, Math.min(count, pool.length));
  state.answers   = {};
  state.submitted = false;
  state.config = {
    topic:      topicEl.options[topicEl.selectedIndex].text,
    difficulty: diffEl.options[diffEl.selectedIndex].text,
    type:       typeEl.options[typeEl.selectedIndex].text,
    count:      state.questions.length,
    date:       new Date().toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }),
    time:       new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })
  };

  // Show test section
  setMode('test');
  renderTestHeader();
  renderQuestions();
  updateProgress();
  startTimer();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Timer ─────────────────────────────────────────────
function startTimer() {
  state.startTime = Date.now();
  state.elapsed   = 0;
  state.timerInterval = setInterval(() => {
    state.elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    document.getElementById('timerDisplay').textContent = '⏱ ' + formatTime(state.elapsed);
  }, 1000);
}

function stopTimer() {
  clearInterval(state.timerInterval);
  state.timerInterval = null;
}

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ── Render Test ───────────────────────────────────────
function renderTestHeader() {
  document.getElementById('testHeaderTitle').textContent =
    `${state.config.topic} · ${state.config.difficulty}`;
  document.getElementById('testHeaderMeta').textContent =
    `${state.config.count} Question${state.config.count !== 1 ? 's' : ''} · ${state.config.type} · ${state.config.date}`;
}

function renderQuestions() {
  const container = document.getElementById('questionsContainer');
  container.innerHTML = '';

  state.questions.forEach((q, idx) => {
    const card = document.createElement('div');
    card.className = 'card p-5 fade-in';
    card.id = `qcard-${idx}`;
    card.style.animationDelay = `${idx * 0.03}s`;
    card.innerHTML = buildQuestionCard(q, idx);
    container.appendChild(card);
  });
}

// Build the HTML for a single interactive question card
function buildQuestionCard(q, idx) {
  const typeBadgeColor = { mcq:'blue', truefalse:'purple', short:'orange' };
  const typeBadgeLabel = { mcq:'MCQ', truefalse:'True/False', short:'Short Answer' };
  const color = typeBadgeColor[q.type] || 'blue';

  let optionsHTML = '';

  if (q.type === 'mcq') {
    const letters = ['A','B','C','D'];
    optionsHTML = `<div class="space-y-2 mt-3">
      ${q.options.map((opt, j) => `
        <div class="opt-card" id="opt-${idx}-${j}" onclick="selectOption(${idx},${j},'${escStr(opt)}')">
          <div class="opt-radio"><div class="opt-radio-dot"></div></div>
          <span class="text-sm font-semibold text-gray-500 w-5 flex-shrink-0">${letters[j]}.</span>
          <span class="text-sm text-gray-800 leading-snug">${escHtml(opt)}</span>
        </div>
      `).join('')}
    </div>`;
  } else if (q.type === 'truefalse') {
    optionsHTML = `<div class="grid grid-cols-2 gap-3 mt-3">
      <div class="opt-card" id="opt-${idx}-0" onclick="selectOption(${idx},0,'True')">
        <div class="opt-radio"><div class="opt-radio-dot"></div></div>
        <span class="text-sm font-semibold text-gray-700">✓ True</span>
      </div>
      <div class="opt-card" id="opt-${idx}-1" onclick="selectOption(${idx},1,'False')">
        <div class="opt-radio"><div class="opt-radio-dot"></div></div>
        <span class="text-sm font-semibold text-gray-700">✗ False</span>
      </div>
    </div>`;
  } else {
    optionsHTML = `<div class="mt-3">
      <textarea class="short-input" id="short-${idx}" rows="2"
        placeholder="Type your answer here…"
        oninput="recordShortAnswer(${idx}, this.value)"></textarea>
    </div>`;
  }

  return `
    <div class="flex items-start gap-3">
      <span class="q-badge" id="qbadge-${idx}">${idx + 1}</span>
      <div class="flex-1 min-w-0">
        <div class="flex flex-wrap items-center gap-2 mb-2">
          <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-${color}-50 text-${color}-600 border border-${color}-100">${typeBadgeLabel[q.type]}</span>
          <span class="text-xs text-gray-400">${q.topic}</span>
          <span class="ml-auto text-xs px-2 py-0.5 rounded-full font-medium
            ${q.difficulty === 'easy' ? 'bg-green-50 text-green-600' :
              q.difficulty === 'medium' ? 'bg-yellow-50 text-yellow-600' :
              'bg-red-50 text-red-600'}">${cap(q.difficulty)}</span>
        </div>
        <p class="font-semibold text-gray-800 leading-relaxed text-sm md:text-base">${escHtml(q.question)}</p>
        ${optionsHTML}
      </div>
    </div>
  `;
}

// ── Option Selection ──────────────────────────────────
function selectOption(qIdx, optIdx, value) {
  if (state.submitted) return;

  const q = state.questions[qIdx];
  const optCount = q.type === 'mcq' ? q.options.length : 2;

  // Deselect all options for this question
  for (let j = 0; j < optCount; j++) {
    const el = document.getElementById(`opt-${qIdx}-${j}`);
    if (el) el.classList.remove('selected');
  }

  // Select chosen option
  const chosen = document.getElementById(`opt-${qIdx}-${optIdx}`);
  if (chosen) chosen.classList.add('selected');

  state.answers[qIdx] = value;

  // Update q-badge to show answered
  const badge = document.getElementById(`qbadge-${qIdx}`);
  if (badge) badge.classList.add('answered');

  updateProgress();
}

function recordShortAnswer(qIdx, value) {
  if (state.submitted) return;
  const trimmed = value.trim();
  if (trimmed.length > 0) {
    state.answers[qIdx] = trimmed;
    const badge = document.getElementById(`qbadge-${qIdx}`);
    if (badge) badge.classList.add('answered');
  } else {
    delete state.answers[qIdx];
    const badge = document.getElementById(`qbadge-${qIdx}`);
    if (badge) badge.classList.remove('answered');
  }
  updateProgress();
}

// ── Progress ──────────────────────────────────────────
function updateProgress() {
  const total    = state.questions.length;
  const answered = Object.keys(state.answers).length;
  const pct      = total ? Math.round((answered / total) * 100) : 0;

  document.getElementById('progressBar').style.width = pct + '%';
  document.getElementById('progressText').textContent = `${answered} / ${total} answered`;
  document.getElementById('progressPct').textContent  = pct + '%';

  const hint = document.getElementById('submitHint');
  if (answered === total) {
    hint.textContent = '✅ All questions answered. Ready to submit!';
    hint.className   = 'text-sm text-green-600 font-medium';
  } else {
    hint.textContent = `${total - answered} question${total - answered !== 1 ? 's' : ''} remaining.`;
    hint.className   = 'text-sm text-gray-500';
  }
}

// ── Submit ────────────────────────────────────────────
function submitTest() {
  const total    = state.questions.length;
  const answered = Object.keys(state.answers).length;

  if (answered < total) {
    const skip = total - answered;
    if (!confirm(`You have ${skip} unanswered question${skip !== 1 ? 's' : ''}. Submit anyway?`)) return;
  }

  stopTimer();
  state.submitted = true;

  // Lock all inputs
  document.querySelectorAll('.opt-card').forEach(el => el.style.cursor = 'default');
  document.querySelectorAll('.short-input').forEach(el => el.disabled = true);

  // Score
  let correct = 0, wrong = 0, skipped = 0;

  state.questions.forEach((q, idx) => {
    const userAns = state.answers[idx];
    const badge   = document.getElementById(`qbadge-${idx}`);

    if (userAns === undefined || userAns === '') {
      skipped++;
      if (badge) { badge.classList.remove('answered'); badge.style.background = '#9ca3af'; }
      return;
    }

    const isCorrect = normalise(userAns) === normalise(q.answer);

    if (isCorrect) {
      correct++;
      if (badge) { badge.classList.remove('answered'); badge.classList.add('correct'); }
    } else {
      wrong++;
      if (badge) { badge.classList.remove('answered'); badge.classList.add('wrong'); }
    }

    // Colour options
    if (q.type === 'mcq') {
      q.options.forEach((opt, j) => {
        const el = document.getElementById(`opt-${idx}-${j}`);
        if (!el) return;
        el.classList.remove('selected');
        if (normalise(opt) === normalise(q.answer)) {
          el.classList.add('correct');
        } else if (normalise(opt) === normalise(userAns)) {
          el.classList.add('wrong');
        }
      });
    } else if (q.type === 'truefalse') {
      const vals = ['True','False'];
      vals.forEach((v, j) => {
        const el = document.getElementById(`opt-${idx}-${j}`);
        if (!el) return;
        el.classList.remove('selected');
        if (normalise(v) === normalise(q.answer))  el.classList.add('correct');
        else if (normalise(v) === normalise(userAns)) el.classList.add('wrong');
      });
    }

    // Show inline explanation
    const expId = `exp-${idx}`;
    const expEl = document.getElementById(expId);
    if (expEl) expEl.classList.add('show');
  });

  // Save result to history
  saveHistory({ correct, wrong, skipped });

  // Render review section
  renderReview(correct, wrong, skipped);
  setMode('review');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function normalise(str) {
  return String(str).toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

// ── Review Mode ───────────────────────────────────────
function renderReview(correct, wrong, skipped) {
  const total = state.questions.length;
  const pct   = Math.round((correct / total) * 100);

  // Score circle animation
  const circumference = 263.9;
  const offset = circumference - (pct / 100) * circumference;
  const circle = document.getElementById('scoreCircle');
  if (circle) {
    setTimeout(() => { circle.style.strokeDashoffset = offset; }, 100);
    // Colour by score
    circle.style.stroke = pct >= 75 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';
  }

  document.getElementById('scorePct').textContent = pct + '%';
  document.getElementById('scoreRaw').textContent = `${correct}/${total}`;
  document.getElementById('statCorrect').textContent = correct;
  document.getElementById('statWrong').textContent   = wrong;
  document.getElementById('statSkipped').textContent = skipped;
  document.getElementById('reviewMeta').textContent  =
    `${state.config.topic} · ${state.config.difficulty} · Time: ${formatTime(state.elapsed)}`;

  // Grade message
  const gMsg = document.getElementById('gradeMessage');
  if (pct >= 90)      { gMsg.textContent = '🏆 Outstanding!';        gMsg.className = 'mt-5 inline-block px-5 py-2 rounded-full text-sm font-semibold bg-green-100 text-green-700'; }
  else if (pct >= 75) { gMsg.textContent = '✈️ Great performance!';   gMsg.className = 'mt-5 inline-block px-5 py-2 rounded-full text-sm font-semibold bg-blue-100 text-blue-700'; }
  else if (pct >= 50) { gMsg.textContent = '📚 Needs more practice.'; gMsg.className = 'mt-5 inline-block px-5 py-2 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-700'; }
  else                { gMsg.textContent = '🔁 Keep studying!';        gMsg.className = 'mt-5 inline-block px-5 py-2 rounded-full text-sm font-semibold bg-red-100 text-red-700'; }

  // Detailed review cards
  const container = document.getElementById('reviewContainer');
  container.innerHTML = '';
  const letters = ['A','B','C','D'];

  state.questions.forEach((q, idx) => {
    const userAns  = state.answers[idx];
    const isSkipped = (userAns === undefined || userAns === '');
    const isCorrect = !isSkipped && normalise(userAns) === normalise(q.answer);

    const borderClass = isSkipped ? 'border-gray-200' : isCorrect ? 'border-green-300' : 'border-red-300';
    const bgClass     = isSkipped ? 'bg-white'        : isCorrect ? 'bg-green-50/40'   : 'bg-red-50/30';
    const icon        = isSkipped ? '🔲' : isCorrect  ? '✅' : '❌';
    const statusLabel = isSkipped ? 'Skipped'  : isCorrect ? 'Correct'   : 'Incorrect';
    const statusColor = isSkipped ? 'text-gray-500' : isCorrect ? 'text-green-600' : 'text-red-600';

    let answersHTML = '';
    if (q.type === 'mcq') {
      answersHTML = `<div class="space-y-1.5 mt-2">
        ${q.options.map((opt, j) => {
          const isRight  = normalise(opt) === normalise(q.answer);
          const isUser   = !isSkipped && normalise(opt) === normalise(userAns);
          let cls = 'flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ';
          if (isRight)       cls += 'bg-green-50 border-green-200 text-green-800 font-semibold';
          else if (isUser)   cls += 'bg-red-50 border-red-200 text-red-700';
          else               cls += 'bg-gray-50 border-gray-100 text-gray-600';
          const marker = isRight ? '✔' : (isUser && !isRight) ? '✘' : '';
          return `<div class="${cls}">
            <span class="font-bold text-xs w-6 flex-shrink-0">${letters[j]}.</span>
            <span class="flex-1">${escHtml(opt)}</span>
            ${marker ? `<span class="font-bold">${marker}</span>` : ''}
          </div>`;
        }).join('')}
      </div>`;
    } else if (q.type === 'truefalse') {
      answersHTML = `<div class="grid grid-cols-2 gap-2 mt-2">
        ${['True','False'].map((v,j) => {
          const isRight = normalise(v) === normalise(q.answer);
          const isUser  = !isSkipped && normalise(v) === normalise(userAns);
          let cls = 'px-3 py-2 rounded-lg text-sm border text-center ';
          if (isRight)       cls += 'bg-green-50 border-green-200 text-green-800 font-semibold';
          else if (isUser)   cls += 'bg-red-50 border-red-200 text-red-700';
          else               cls += 'bg-gray-50 border-gray-100 text-gray-600';
          return `<div class="${cls}">${v}${isRight ? ' ✔' : (isUser && !isRight) ? ' ✘' : ''}</div>`;
        }).join('')}
      </div>`;
    } else {
      const uAns = isSkipped ? '(no answer)' : escHtml(String(userAns));
      answersHTML = `<div class="mt-2 space-y-1.5">
        <div class="px-3 py-2 rounded-lg text-sm border ${isCorrect ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'}">
          <span class="font-semibold">Your answer:</span> ${uAns}
        </div>
        ${!isCorrect ? `<div class="px-3 py-2 rounded-lg text-sm border bg-green-50 border-green-200 text-green-800">
          <span class="font-semibold">Correct:</span> ${escHtml(q.answer)}
        </div>` : ''}
      </div>`;
    }

    const card = document.createElement('div');
    card.className = `card p-5 border-2 ${borderClass} ${bgClass} fade-in`;
    card.style.animationDelay = `${idx * 0.03}s`;
    card.innerHTML = `
      <div class="flex items-start gap-3">
        <span class="text-xl flex-shrink-0">${icon}</span>
        <div class="flex-1 min-w-0">
          <div class="flex flex-wrap items-center gap-2 mb-1.5">
            <span class="text-xs font-bold ${statusColor}">${statusLabel}</span>
            <span class="text-xs text-gray-400">${q.topic} · ${cap(q.difficulty)}</span>
          </div>
          <p class="font-semibold text-gray-800 text-sm leading-relaxed mb-1">Q${idx+1}. ${escHtml(q.question)}</p>
          ${answersHTML}
          <div class="mt-3 px-3 py-2.5 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-800">
            <span class="font-semibold">💡 Explanation:</span> ${escHtml(q.explanation)}
          </div>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function scrollToReview() {
  document.getElementById('reviewAnchor').scrollIntoView({ behavior:'smooth' });
}

// ── Mode switching ────────────────────────────────────
function setMode(mode) {
  state.mode = mode;
  document.getElementById('testSection').classList.toggle('hidden',   mode !== 'test');
  document.getElementById('reviewSection').classList.toggle('hidden', mode !== 'review');
}

// ── History ───────────────────────────────────────────
function saveHistory(results) {
  let hist = JSON.parse(localStorage.getItem('ws_test_history') || '[]');
  hist.unshift({
    topic: state.config.topic, difficulty: state.config.difficulty,
    count: state.config.count, correct: results.correct,
    date: state.config.date, time: state.config.time
  });
  if (hist.length > 20) hist = hist.slice(0, 20);
  localStorage.setItem('ws_test_history', JSON.stringify(hist));
}

// ── PDF Download ──────────────────────────────────────
function downloadPDF() {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pw = 210, ph = 297, ml = 20, mr = 20;
  const cw = pw - ml - mr;
  const letters = ['A','B','C','D'];
  let y = 20;

  function checkPage(needed) {
    if (y + needed > ph - 22) { doc.addPage(); y = 20; }
  }

  // === RESULT SUMMARY PAGE ===
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pw, 50, 'F');
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 50, pw, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22); doc.setFont('helvetica','bold');
  doc.text('Wingspan Approach', ml, 20);
  doc.setFontSize(12); doc.setFont('helvetica','normal');
  doc.text('Aviation Mock Test — Result Report', ml, 30);
  doc.setFontSize(9); doc.setTextColor(180, 210, 240);
  doc.text(`Topic: ${state.config.topic}  |  Difficulty: ${state.config.difficulty}  |  Date: ${state.config.date}`, ml, 42);

  y = 65;
  const total   = state.questions.length;
  let correct = 0, wrong = 0, skipped = 0;
  state.questions.forEach((q, idx) => {
    const ua = state.answers[idx];
    if (!ua) { skipped++; return; }
    if (normalise(ua) === normalise(q.answer)) correct++; else wrong++;
  });
  const pct = Math.round((correct / total) * 100);

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(14); doc.setFont('helvetica','bold');
  doc.text('Score Summary', ml, y); y += 8;

  const scoreBoxes = [
    { label:'Score', val: pct + '%', color:[37,99,235] },
    { label:'Correct', val: correct, color:[22,163,74] },
    { label:'Wrong', val: wrong, color:[220,38,38] },
    { label:'Skipped', val: skipped, color:[234,179,8] },
    { label:'Time', val: formatTime(state.elapsed), color:[99,102,241] }
  ];
  const bw = (cw - 8) / 5;
  scoreBoxes.forEach((b, i) => {
    const bx = ml + i * (bw + 2);
    doc.setFillColor(...b.color);
    doc.roundedRect(bx, y, bw, 18, 3, 3, 'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(13); doc.setFont('helvetica','bold');
    doc.text(String(b.val), bx + bw/2, y + 8, { align:'center' });
    doc.setFontSize(7); doc.setFont('helvetica','normal');
    doc.text(b.label, bx + bw/2, y + 14, { align:'center' });
  });
  y += 28;

  // === QUESTION REVIEW ===
  doc.setFontSize(13); doc.setFont('helvetica','bold'); doc.setTextColor(30, 58, 95);
  doc.text('Question Review', ml, y); y += 4;
  doc.setDrawColor(37,99,235); doc.setLineWidth(0.4);
  doc.line(ml, y, ml + 36, y); y += 8;

  state.questions.forEach((q, idx) => {
    checkPage(40);
    const ua = state.answers[idx];
    const isSkipped = !ua;
    const isCorrect = !isSkipped && normalise(ua) === normalise(q.answer);

    const [rC, gC, bC] = isSkipped ? [156,163,175] : isCorrect ? [22,163,74] : [220,38,38];
    doc.setFillColor(rC, gC, bC);
    doc.circle(ml + 4, y - 1.5, 4, 'F');
    doc.setTextColor(255,255,255); doc.setFontSize(8); doc.setFont('helvetica','bold');
    doc.text(`${idx+1}`, ml + 4, y - 0.5, { align:'center' });

    doc.setTextColor(30,30,30); doc.setFontSize(9.5); doc.setFont('helvetica','bold');
    const qLines = doc.splitTextToSize(q.question, cw - 14);
    doc.text(qLines, ml + 12, y);
    y += qLines.length * 5 + 2;

    doc.setFont('helvetica','normal'); doc.setFontSize(8.5);
    if (q.type === 'mcq') {
      q.options.forEach((opt, j) => {
        checkPage(8);
        const isRight = normalise(opt) === normalise(q.answer);
        const isUser  = !isSkipped && normalise(opt) === normalise(ua);
        if (isRight)     { doc.setFillColor(220,252,231); doc.setTextColor(22,101,52); }
        else if (isUser) { doc.setFillColor(254,226,226); doc.setTextColor(153,27,27); }
        else             { doc.setFillColor(248,250,252); doc.setTextColor(80,80,80); }
        doc.roundedRect(ml + 12, y - 3.5, cw - 14, 7, 1.5, 1.5, 'F');
        doc.setFont('helvetica','bold');
        doc.text(`${letters[j]}.`, ml + 15, y);
        doc.setFont('helvetica','normal');
        doc.text(opt, ml + 22, y);
        if (isRight) doc.text('✓', ml + cw - 6, y);
        y += 8;
      });
    } else if (q.type === 'truefalse') {
      const vals = ['True','False'];
      vals.forEach((v, j) => {
        const isRight = normalise(v) === normalise(q.answer);
        const isUser  = !isSkipped && normalise(v) === normalise(ua);
        if (isRight)    { doc.setFillColor(220,252,231); doc.setTextColor(22,101,52); }
        else if(isUser) { doc.setFillColor(254,226,226); doc.setTextColor(153,27,27); }
        else            { doc.setFillColor(248,250,252); doc.setTextColor(80,80,80); }
        doc.roundedRect(ml + 12 + j*30, y - 3.5, 26, 7, 1.5, 1.5, 'F');
        doc.setFont('helvetica',isRight ? 'bold' : 'normal');
        doc.text(v, ml + 25 + j*30, y, { align:'center' });
      });
      y += 8;
    } else {
      const aTxt = isSkipped ? '(no answer)' : String(ua);
      doc.setFillColor(isCorrect ? 220:254, isCorrect ? 252:226, isCorrect ? 231:226);
      doc.roundedRect(ml + 12, y - 3.5, cw - 14, 7, 1.5, 1.5, 'F');
      doc.setTextColor(isCorrect ? 22:153, isCorrect ? 101:27, isCorrect ? 52:27);
      doc.text(`Your answer: ${aTxt}`, ml + 14, y);
      y += 8;
      if (!isCorrect) {
        doc.setFillColor(220,252,231); doc.roundedRect(ml + 12, y - 3.5, cw - 14, 7, 1.5, 1.5, 'F');
        doc.setTextColor(22,101,52); doc.text(`Correct: ${q.answer}`, ml + 14, y); y += 8;
      }
    }

    // Explanation
    checkPage(10);
    doc.setFillColor(239,246,255); doc.setTextColor(30,64,175); doc.setFont('helvetica','italic');
    const expLines = doc.splitTextToSize('💡 ' + q.explanation, cw - 16);
    doc.roundedRect(ml + 12, y - 3.5, cw - 14, expLines.length * 4.5 + 3, 1.5, 1.5, 'F');
    doc.setFontSize(8); doc.text(expLines, ml + 14, y);
    y += expLines.length * 4.5 + 7;
  });

  // Page footers
  const pages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(7); doc.setTextColor(160,160,160); doc.setFont('helvetica','normal');
    doc.text('Generated by Wingspan Approach', ml, ph - 10);
    doc.text(`Page ${p} / ${pages}`, pw - mr, ph - 10, { align:'right' });
  }

  doc.save(`Wingspan_Test_${state.config.topic.replace(/\s/g,'_')}_${state.config.date.replace(/\s/g,'')}.pdf`);
}

// ── Utilities ─────────────────────────────────────────
function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function escStr(str) {
  return String(str).replace(/'/g,"&#39;").replace(/"/g,'&quot;');
}
