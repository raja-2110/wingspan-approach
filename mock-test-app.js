// ═══════════════════════════════════════════════════════
// Wingspan Approach — Mock Test App (Interactive Edition)
// Fix: event delegation + data-* attributes (no inline onclick strings)
// ═══════════════════════════════════════════════════════
const { jsPDF } = window.jspdf;

// ── State ─────────────────────────────────────────────
let state = {
  mode: 'config',   // 'config' | 'test' | 'review'
  questions: [],
  answers: {},      // { qIdx: selectedValue }
  submitted: false,
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

  // ── Event delegation: handle all option-card clicks from one listener ──
  document.getElementById('questionsContainer').addEventListener('click', function(e) {
    if (state.submitted) return;
    const card = e.target.closest('.opt-card');
    if (!card) return;
    const qIdx  = parseInt(card.dataset.qidx);
    const optIdx = parseInt(card.dataset.optidx);
    const value  = card.dataset.value;
    selectOption(qIdx, optIdx, value);
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
  document.getElementById('availableCount').textContent =
    n + ' question' + (n !== 1 ? 's' : '') + ' available';
}

// ── Generate Test ─────────────────────────────────────
function generateTest() {
  const pool  = getFilteredPool();
  const count = parseInt(document.getElementById('countSelect').value);

  if (pool.length === 0) {
    alert('No questions match your filters. Try picking a broader category or difficulty.');
    return;
  }

  stopTimer();

  const topicEl = document.getElementById('topicSelect');
  const diffEl  = document.getElementById('difficultySelect');
  const typeEl  = document.getElementById('typeSelect');

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  state.questions = shuffled.slice(0, Math.min(count, pool.length));
  state.answers   = {};
  state.submitted = false;
  state.elapsed   = 0;
  state.config = {
    topic:      topicEl.options[topicEl.selectedIndex].text,
    difficulty: diffEl.options[diffEl.selectedIndex].text,
    type:       typeEl.options[typeEl.selectedIndex].text,
    count:      state.questions.length,
    date:       new Date().toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }),
    time:       new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' })
  };

  setMode('test');
  renderTestHeader();
  renderQuestions();
  updateProgress();
  startTimer();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Timer ─────────────────────────────────────────────
function startTimer() {
  const startTime = Date.now() - (state.elapsed * 1000);
  state.timerInterval = setInterval(() => {
    state.elapsed = Math.floor((Date.now() - startTime) / 1000);
    const el = document.getElementById('timerDisplay');
    if (el) el.textContent = '⏱ ' + formatTime(state.elapsed);
  }, 1000);
}

function stopTimer() {
  clearInterval(state.timerInterval);
  state.timerInterval = null;
}

function formatTime(sec) {
  return Math.floor(sec / 60).toString().padStart(2,'0') + ':' +
         (sec % 60).toString().padStart(2,'0');
}

// ── Render Test ───────────────────────────────────────
function renderTestHeader() {
  document.getElementById('testHeaderTitle').textContent =
    state.config.topic + ' · ' + state.config.difficulty;
  document.getElementById('testHeaderMeta').textContent =
    state.config.count + ' Question' + (state.config.count !== 1 ? 's' : '') +
    ' · ' + state.config.type + ' · ' + state.config.date;
}

function renderQuestions() {
  const container = document.getElementById('questionsContainer');
  container.innerHTML = '';

  state.questions.forEach((q, idx) => {
    const card = document.createElement('div');
    card.className = 'card p-5';
    card.id = 'qcard-' + idx;
    card.innerHTML = buildQuestionCard(q, idx);
    container.appendChild(card);

    // Attach short-answer listener AFTER DOM insertion
    if (q.type === 'short') {
      const ta = card.querySelector('.short-input');
      if (ta) {
        ta.addEventListener('input', function() {
          const val = this.value.trim();
          if (val.length > 0) {
            state.answers[idx] = val;
            setBadge(idx, 'answered');
          } else {
            delete state.answers[idx];
            setBadge(idx, 'default');
          }
          updateProgress();
        });
      }
    }
  });
}

// Build the HTML for a single interactive question card
// NOTE: option values stored in data-value, NOT in onclick strings
function buildQuestionCard(q, idx) {
  const typeColors = { mcq:'blue', truefalse:'purple', short:'orange' };
  const typeLabels = { mcq:'MCQ', truefalse:'True/False', short:'Short Answer' };
  const typeColor  = typeColors[q.type] || 'blue';
  const typeLabel  = typeLabels[q.type] || q.type;
  const diffLabel  = q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1);
  const diffClass  = q.difficulty === 'easy'   ? 'bg-green-50 text-green-600'  :
                     q.difficulty === 'medium' ? 'bg-yellow-50 text-yellow-600' :
                                                  'bg-red-50 text-red-600';
  let optionsHTML = '';

  if (q.type === 'mcq') {
    const letters = ['A','B','C','D'];
    optionsHTML = '<div class="space-y-2 mt-3">' +
      q.options.map((opt, j) =>
        '<div class="opt-card" id="opt-' + idx + '-' + j + '"' +
          ' data-qidx="' + idx + '"' +
          ' data-optidx="' + j + '"' +
          ' data-value="' + htmlAttr(opt) + '">' +
          '<div class="opt-radio"><div class="opt-radio-dot"></div></div>' +
          '<span class="text-sm font-bold text-gray-400 w-6 flex-shrink-0">' + letters[j] + '.</span>' +
          '<span class="opt-text text-sm text-gray-800 leading-snug">' + escHtml(opt) + '</span>' +
        '</div>'
      ).join('') +
    '</div>';
  } else if (q.type === 'truefalse') {
    optionsHTML =
      '<div class="grid grid-cols-2 gap-3 mt-3">' +
        '<div class="opt-card" id="opt-' + idx + '-0"' +
          ' data-qidx="' + idx + '"' +
          ' data-optidx="0"' +
          ' data-value="True">' +
          '<div class="opt-radio"><div class="opt-radio-dot"></div></div>' +
          '<span class="text-sm font-semibold text-gray-700">✓ &nbsp;True</span>' +
        '</div>' +
        '<div class="opt-card" id="opt-' + idx + '-1"' +
          ' data-qidx="' + idx + '"' +
          ' data-optidx="1"' +
          ' data-value="False">' +
          '<div class="opt-radio"><div class="opt-radio-dot"></div></div>' +
          '<span class="text-sm font-semibold text-gray-700">✗ &nbsp;False</span>' +
        '</div>' +
      '</div>';
  } else {
    // Short answer — listener added after DOM insertion
    optionsHTML =
      '<div class="mt-3">' +
        '<textarea class="short-input" rows="2"' +
          ' placeholder="Type your answer here…"></textarea>' +
      '</div>';
  }

  return (
    '<div class="flex items-start gap-3">' +
      '<span class="q-badge" id="qbadge-' + idx + '">' + (idx + 1) + '</span>' +
      '<div class="flex-1 min-w-0">' +
        '<div class="flex flex-wrap items-center gap-2 mb-2">' +
          '<span class="text-xs font-semibold px-2 py-0.5 rounded-full' +
            ' bg-' + typeColor + '-50 text-' + typeColor + '-600' +
            ' border border-' + typeColor + '-100">' + typeLabel + '</span>' +
          '<span class="text-xs text-gray-400">' + escHtml(q.topic) + '</span>' +
          '<span class="ml-auto text-xs px-2 py-0.5 rounded-full font-medium ' + diffClass + '">' + diffLabel + '</span>' +
        '</div>' +
        '<p class="font-semibold text-gray-800 leading-relaxed text-sm md:text-base">' + escHtml(q.question) + '</p>' +
        optionsHTML +
      '</div>' +
    '</div>'
  );
}

// ── Option Selection (called by event delegation) ─────
function selectOption(qIdx, optIdx, value) {
  if (state.submitted) return;

  const q = state.questions[qIdx];
  const optCount = (q.type === 'mcq') ? q.options.length : 2;

  // Deselect all options for this question
  for (let j = 0; j < optCount; j++) {
    const el = document.getElementById('opt-' + qIdx + '-' + j);
    if (el) el.classList.remove('selected');
  }

  // Select chosen option
  const chosen = document.getElementById('opt-' + qIdx + '-' + optIdx);
  if (chosen) chosen.classList.add('selected');

  state.answers[qIdx] = value;
  setBadge(qIdx, 'answered');
  updateProgress();
}

function setBadge(qIdx, mode) {
  const b = document.getElementById('qbadge-' + qIdx);
  if (!b) return;
  b.classList.remove('answered','correct','wrong');
  if (mode === 'answered') b.classList.add('answered');
  else if (mode === 'correct') b.classList.add('correct');
  else if (mode === 'wrong')   b.classList.add('wrong');
}

// ── Progress ──────────────────────────────────────────
function updateProgress() {
  const total    = state.questions.length;
  const answered = Object.keys(state.answers).length;
  const pct      = total ? Math.round((answered / total) * 100) : 0;

  const bar      = document.getElementById('progressBar');
  const textEl   = document.getElementById('progressText');
  const pctEl    = document.getElementById('progressPct');
  const hint     = document.getElementById('submitHint');

  if (bar)    bar.style.width = pct + '%';
  if (textEl) textEl.textContent = answered + ' / ' + total + ' answered';
  if (pctEl)  pctEl.textContent  = pct + '%';

  if (!hint) return;
  const remaining = total - answered;
  if (remaining === 0) {
    hint.textContent  = '✅ All questions answered — ready to submit!';
    hint.className    = 'text-sm text-green-600 font-medium';
  } else {
    hint.textContent  = remaining + ' question' + (remaining !== 1 ? 's' : '') + ' remaining.';
    hint.className    = 'text-sm text-gray-500';
  }
}

// ── Submit ────────────────────────────────────────────
function submitTest() {
  const total    = state.questions.length;
  const answered = Object.keys(state.answers).length;

  if (answered < total) {
    const skip = total - answered;
    if (!confirm(skip + ' question' + (skip !== 1 ? 's are' : ' is') +
        ' unanswered. Submit anyway?')) return;
  }

  stopTimer();
  state.submitted = true;

  // Lock inputs
  document.querySelectorAll('.short-input').forEach(el => el.disabled = true);

  let correct = 0, wrong = 0, skipped = 0;

  state.questions.forEach((q, idx) => {
    const userAns = state.answers[idx];

    if (userAns === undefined || userAns === '') {
      skipped++;
      setBadge(idx, 'default');
      document.getElementById('qbadge-' + idx).style.background = '#9ca3af';
      return;
    }

    const isCorrect = normalise(userAns) === normalise(q.answer);
    if (isCorrect) { correct++; setBadge(idx, 'correct'); }
    else           { wrong++;   setBadge(idx, 'wrong');   }

    // Colour options
    const optCount = (q.type === 'mcq') ? q.options.length : 2;
    const optVals  = (q.type === 'mcq') ? q.options : ['True', 'False'];

    for (let j = 0; j < optCount; j++) {
      const el = document.getElementById('opt-' + idx + '-' + j);
      if (!el) continue;
      el.classList.remove('selected');
      const optVal = optVals[j];
      if (normalise(optVal) === normalise(q.answer)) el.classList.add('correct');
      else if (normalise(optVal) === normalise(userAns)) el.classList.add('wrong');
    }
  });

  saveHistory({ correct, wrong, skipped });
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

  // Score circle
  const circumference = 263.9;
  const circle = document.getElementById('scoreCircle');
  if (circle) {
    circle.style.transition = 'stroke-dashoffset 1s ease';
    circle.style.strokeDashoffset = circumference - (pct / 100) * circumference;
    circle.style.stroke = pct >= 75 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';
  }
  document.getElementById('scorePct').textContent   = pct + '%';
  document.getElementById('scoreRaw').textContent   = correct + '/' + total;
  document.getElementById('statCorrect').textContent = correct;
  document.getElementById('statWrong').textContent   = wrong;
  document.getElementById('statSkipped').textContent = skipped;
  document.getElementById('reviewMeta').textContent  =
    state.config.topic + ' · ' + state.config.difficulty +
    ' · Time: ' + formatTime(state.elapsed);

  const gEl = document.getElementById('gradeMessage');
  if (pct >= 90)      { gEl.textContent = '🏆 Outstanding!';        gEl.className = 'mt-5 inline-block px-5 py-2 rounded-full text-sm font-semibold bg-green-100 text-green-700'; }
  else if (pct >= 75) { gEl.textContent = '✈️ Great performance!';   gEl.className = 'mt-5 inline-block px-5 py-2 rounded-full text-sm font-semibold bg-blue-100 text-blue-700'; }
  else if (pct >= 50) { gEl.textContent = '📚 Needs more practice.'; gEl.className = 'mt-5 inline-block px-5 py-2 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-700'; }
  else                { gEl.textContent = '🔁 Keep studying!';        gEl.className = 'mt-5 inline-block px-5 py-2 rounded-full text-sm font-semibold bg-red-100 text-red-700'; }

  // Detailed review cards
  const container = document.getElementById('reviewContainer');
  container.innerHTML = '';
  const letters = ['A','B','C','D'];

  state.questions.forEach((q, idx) => {
    const userAns   = state.answers[idx];
    const isSkipped = (userAns === undefined || userAns === '');
    const isCorrect = !isSkipped && normalise(userAns) === normalise(q.answer);

    const icon        = isSkipped ? '🔲' : isCorrect ? '✅' : '❌';
    const statusLabel = isSkipped ? 'Skipped' : isCorrect ? 'Correct' : 'Incorrect';
    const statusColor = isSkipped ? 'text-gray-400' : isCorrect ? 'text-green-600' : 'text-red-500';
    const borderClass = isSkipped ? 'border-gray-100' : isCorrect ? 'border-green-300' : 'border-red-300';

    let answersHTML = '';
    if (q.type === 'mcq') {
      answersHTML = '<div class="space-y-1.5 mt-2">' +
        q.options.map((opt, j) => {
          const isRight = normalise(opt) === normalise(q.answer);
          const isUser  = !isSkipped && normalise(opt) === normalise(userAns);
          let cls = 'flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ';
          if (isRight)     cls += 'bg-green-50 border-green-200 text-green-800 font-semibold';
          else if (isUser) cls += 'bg-red-50 border-red-200 text-red-700';
          else             cls += 'bg-gray-50 border-gray-100 text-gray-500';
          const marker = isRight ? ' ✔' : (isUser && !isRight) ? ' ✘' : '';
          return '<div class="' + cls + '">' +
            '<span class="font-bold text-xs w-5 flex-shrink-0">' + letters[j] + '.</span>' +
            '<span class="flex-1">' + escHtml(opt) + '</span>' +
            (marker ? '<span class="font-bold flex-shrink-0">' + marker + '</span>' : '') +
            '</div>';
        }).join('') +
      '</div>';
    } else if (q.type === 'truefalse') {
      answersHTML = '<div class="grid grid-cols-2 gap-2 mt-2">' +
        ['True','False'].map((v, j) => {
          const isRight = normalise(v) === normalise(q.answer);
          const isUser  = !isSkipped && normalise(v) === normalise(userAns);
          let cls = 'px-3 py-2 rounded-lg text-sm border text-center font-medium ';
          if (isRight)     cls += 'bg-green-50 border-green-200 text-green-800';
          else if (isUser) cls += 'bg-red-50 border-red-200 text-red-700';
          else             cls += 'bg-gray-50 border-gray-100 text-gray-500';
          return '<div class="' + cls + '">' + v + (isRight ? ' ✔' : (isUser && !isRight) ? ' ✘' : '') + '</div>';
        }).join('') +
      '</div>';
    } else {
      const uAns = isSkipped ? '(no answer)' : escHtml(String(userAns));
      answersHTML = '<div class="mt-2 space-y-1.5">' +
        '<div class="px-3 py-2 rounded-lg text-sm border ' +
          (isCorrect ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700') + '">' +
          '<span class="font-semibold">Your answer:</span> ' + uAns +
        '</div>' +
        (!isCorrect ? '<div class="px-3 py-2 rounded-lg text-sm border bg-green-50 border-green-200 text-green-800">' +
          '<span class="font-semibold">Correct answer:</span> ' + escHtml(q.answer) +
        '</div>' : '') +
      '</div>';
    }

    const card = document.createElement('div');
    card.className = 'card p-5 border-2 ' + borderClass;
    card.innerHTML =
      '<div class="flex items-start gap-3">' +
        '<span class="text-xl flex-shrink-0 mt-0.5">' + icon + '</span>' +
        '<div class="flex-1 min-w-0">' +
          '<div class="flex flex-wrap items-center gap-2 mb-1.5">' +
            '<span class="text-xs font-bold ' + statusColor + '">' + statusLabel + '</span>' +
            '<span class="text-xs text-gray-400">' + escHtml(q.topic) + ' · ' +
              q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1) + '</span>' +
          '</div>' +
          '<p class="font-semibold text-gray-800 text-sm leading-relaxed">Q' + (idx+1) + '. ' + escHtml(q.question) + '</p>' +
          answersHTML +
          '<div class="mt-3 px-3 py-2.5 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-800 leading-relaxed">' +
            '<span class="font-semibold">💡 Explanation: </span>' + escHtml(q.explanation) +
          '</div>' +
        '</div>' +
      '</div>';

    container.appendChild(card);
  });
}

function scrollToReview() {
  document.getElementById('reviewAnchor').scrollIntoView({ behavior: 'smooth' });
}

// ── Mode switching ────────────────────────────────────
function setMode(mode) {
  state.mode = mode;
  document.getElementById('testSection').classList.toggle('hidden',   mode !== 'test');
  document.getElementById('reviewSection').classList.toggle('hidden', mode !== 'review');
}

// ── History ───────────────────────────────────────────
function saveHistory(results) {
  try {
    let hist = JSON.parse(localStorage.getItem('ws_test_history') || '[]');
    hist.unshift({
      topic:      state.config.topic,
      difficulty: state.config.difficulty,
      count:      state.config.count,
      correct:    results.correct,
      date:       state.config.date,
      time:       state.config.time
    });
    if (hist.length > 20) hist = hist.slice(0, 20);
    localStorage.setItem('ws_test_history', JSON.stringify(hist));
  } catch(e) { /* localStorage may be blocked in some contexts */ }
}

// ── PDF ───────────────────────────────────────────────
function downloadPDF() {
  const doc   = new jsPDF('p','mm','a4');
  const pw = 210, ph = 297, ml = 20, mr = 20;
  const cw = pw - ml - mr;
  const letters = ['A','B','C','D'];
  let y = 20;

  function checkPage(needed) {
    if (y + needed > ph - 22) { doc.addPage(); y = 20; }
  }

  // Header
  doc.setFillColor(30, 58, 95); doc.rect(0, 0, pw, 48, 'F');
  doc.setFillColor(37, 99, 235); doc.rect(0, 48, pw, 3, 'F');
  doc.setTextColor(255,255,255);
  doc.setFontSize(22); doc.setFont('helvetica','bold'); doc.text('Wingspan Approach', ml, 20);
  doc.setFontSize(12); doc.setFont('helvetica','normal'); doc.text('Aviation Mock Test — Result Report', ml, 30);
  doc.setFontSize(9); doc.setTextColor(180,210,240);
  doc.text('Topic: ' + state.config.topic + '  |  ' + state.config.difficulty +
    '  |  ' + state.config.date, ml, 40);

  y = 62;
  const total = state.questions.length;
  let correct = 0, wrong = 0, skipped = 0;
  state.questions.forEach((q, idx) => {
    const ua = state.answers[idx];
    if (!ua) { skipped++; return; }
    if (normalise(ua) === normalise(q.answer)) correct++; else wrong++;
  });
  const pct = Math.round((correct / total) * 100);

  // Score row
  doc.setTextColor(30,30,30); doc.setFontSize(13); doc.setFont('helvetica','bold');
  doc.text('Score Summary', ml, y); y += 8;

  const boxes = [
    { label:'Score',   val: pct+'%',               rgb:[37,99,235] },
    { label:'Correct', val: correct,                rgb:[22,163,74] },
    { label:'Wrong',   val: wrong,                  rgb:[220,38,38] },
    { label:'Skipped', val: skipped,                rgb:[234,179,8] },
    { label:'Time',    val: formatTime(state.elapsed), rgb:[99,102,241] }
  ];
  const bw = (cw - 8) / 5;
  boxes.forEach((b, i) => {
    const bx = ml + i * (bw + 2);
    doc.setFillColor(...b.rgb);
    doc.roundedRect(bx, y, bw, 18, 3, 3, 'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(13); doc.setFont('helvetica','bold');
    doc.text(String(b.val), bx + bw/2, y + 8, { align:'center' });
    doc.setFontSize(7); doc.setFont('helvetica','normal');
    doc.text(b.label, bx + bw/2, y + 14, { align:'center' });
  });
  y += 28;

  // Questions
  doc.setFontSize(13); doc.setFont('helvetica','bold'); doc.setTextColor(30,58,95);
  doc.text('Question Review', ml, y); y += 4;
  doc.setDrawColor(37,99,235); doc.setLineWidth(0.4);
  doc.line(ml, y, ml + 38, y); y += 8;

  state.questions.forEach((q, idx) => {
    checkPage(40);
    const ua = state.answers[idx];
    const isSkipped = !ua;
    const isCorrect = !isSkipped && normalise(ua) === normalise(q.answer);
    const [r,g,b] = isSkipped ? [156,163,175] : isCorrect ? [22,163,74] : [220,38,38];

    doc.setFillColor(r,g,b);
    doc.circle(ml+4, y-1.5, 4, 'F');
    doc.setTextColor(255,255,255); doc.setFontSize(8); doc.setFont('helvetica','bold');
    doc.text(String(idx+1), ml+4, y-0.5, { align:'center' });

    doc.setTextColor(30,30,30); doc.setFontSize(9.5); doc.setFont('helvetica','bold');
    const qLines = doc.splitTextToSize(q.question, cw - 14);
    doc.text(qLines, ml+12, y);
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
        doc.roundedRect(ml+12, y-3.5, cw-14, 7, 1.5, 1.5, 'F');
        doc.setFont('helvetica','bold'); doc.text(letters[j]+'.', ml+15, y);
        doc.setFont('helvetica','normal'); doc.text(opt, ml+22, y);
        if (isRight) doc.text('✓', ml+cw-6, y);
        y += 8;
      });
    } else if (q.type === 'truefalse') {
      ['True','False'].forEach((v, j) => {
        const isRight = normalise(v) === normalise(q.answer);
        const isUser  = !isSkipped && normalise(v) === normalise(ua);
        if (isRight)     { doc.setFillColor(220,252,231); doc.setTextColor(22,101,52); }
        else if (isUser) { doc.setFillColor(254,226,226); doc.setTextColor(153,27,27); }
        else             { doc.setFillColor(248,250,252); doc.setTextColor(80,80,80); }
        doc.roundedRect(ml+12+j*30, y-3.5, 26, 7, 1.5, 1.5, 'F');
        doc.setFont('helvetica', isRight ? 'bold' : 'normal');
        doc.text(v, ml+25+j*30, y, { align:'center' });
      });
      y += 8;
    } else {
      checkPage(10);
      const aTxt = isSkipped ? '(no answer)' : String(ua);
      doc.setFillColor(isCorrect ? 220:254, isCorrect ? 252:226, isCorrect ? 231:226);
      doc.roundedRect(ml+12, y-3.5, cw-14, 7, 1.5, 1.5, 'F');
      doc.setTextColor(isCorrect ? 22:153, isCorrect ? 101:27, isCorrect ? 52:27);
      doc.text('Your answer: ' + aTxt, ml+14, y); y += 8;
      if (!isCorrect) {
        checkPage(8);
        doc.setFillColor(220,252,231); doc.roundedRect(ml+12, y-3.5, cw-14, 7, 1.5, 1.5, 'F');
        doc.setTextColor(22,101,52); doc.text('Correct: ' + q.answer, ml+14, y); y += 8;
      }
    }

    checkPage(12);
    doc.setFillColor(239,246,255); doc.setTextColor(30,64,175); doc.setFont('helvetica','italic');
    const expLines = doc.splitTextToSize('Explanation: ' + q.explanation, cw-16);
    const expH = expLines.length * 4.5 + 4;
    doc.roundedRect(ml+12, y-3.5, cw-14, expH, 1.5, 1.5, 'F');
    doc.setFontSize(7.5); doc.text(expLines, ml+14, y);
    y += expH + 5;
  });

  // Page numbers
  const pages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(7); doc.setTextColor(160,160,160); doc.setFont('helvetica','normal');
    doc.text('Generated by Wingspan Approach', ml, ph-10);
    doc.text('Page ' + p + ' / ' + pages, pw-mr, ph-10, { align:'right' });
  }

  doc.save('Wingspan_Test_' + state.config.topic.replace(/\s/g,'_') + '_' +
    state.config.date.replace(/\s/g,'') + '.pdf');
}

// ── HTML escape helpers ───────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// For HTML attribute values (data-value="...")
function htmlAttr(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
