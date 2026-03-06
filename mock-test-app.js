// Wingspan Approach — Mock Test Generator App Logic
const { jsPDF } = window.jspdf;

let currentTest = null;
let answerKeyVisible = false;

// ─── Init ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  populateTopicDropdown();
  updateAvailableCount();
  renderHistory();

  // Update count on filter change
  ['topicSelect','difficultySelect','typeSelect'].forEach(id => {
    document.getElementById(id).addEventListener('change', updateAvailableCount);
  });
});

function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  menu.classList.toggle('hidden');
}

function populateTopicDropdown() {
  const sel = document.getElementById('topicSelect');
  AVAILABLE_TOPICS.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t;
    sel.appendChild(opt);
  });
}

function updateAvailableCount() {
  const filtered = getFilteredQuestions();
  const el = document.getElementById('availableCount');
  el.textContent = `${filtered.length} questions available`;
}

function getFilteredQuestions() {
  const topic = document.getElementById('topicSelect').value;
  const diff  = document.getElementById('difficultySelect').value;
  const type  = document.getElementById('typeSelect').value;
  return QUESTION_BANK.filter(q =>
    (topic === 'all' || q.topic === topic) &&
    (diff  === 'all' || q.difficulty === diff) &&
    (type  === 'all' || q.type === type)
  );
}

// ─── Generate Test ───────────────────────────────────
function generateTest() {
  const count = parseInt(document.getElementById('countSelect').value);
  const pool = getFilteredQuestions();

  if (pool.length === 0) {
    alert('No questions match your filters. Try broadening your selection.');
    return;
  }

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, pool.length));

  const topic = document.getElementById('topicSelect');
  const diff  = document.getElementById('difficultySelect');
  const type  = document.getElementById('typeSelect');

  currentTest = {
    questions: selected,
    topic: topic.options[topic.selectedIndex].text,
    difficulty: diff.options[diff.selectedIndex].text,
    type: type.options[type.selectedIndex].text,
    count: selected.length,
    date: new Date().toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }),
    time: new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }),
    timestamp: Date.now()
  };

  renderTest();
  saveToHistory();
  answerKeyVisible = false;
  document.getElementById('answerKeySection').classList.add('hidden');
  document.getElementById('answerKeyToggle').innerHTML = `
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
    Show Answer Key`;

  document.getElementById('testDisplay').classList.remove('hidden');
  document.getElementById('testDisplay').scrollIntoView({ behavior:'smooth', block:'start' });
}

// ─── Render Test ─────────────────────────────────────
function renderTest() {
  const t = currentTest;
  document.getElementById('testTitle').textContent = `Aviation Mock Test — ${t.topic}`;
  document.getElementById('testMeta').textContent = `Generated on ${t.date} at ${t.time} · ${t.count} Questions`;

  const badges = document.getElementById('testBadges');
  const diffColor = { Easy:'bg-green-100 text-green-700', Medium:'bg-yellow-100 text-yellow-700', Hard:'bg-red-100 text-red-700', 'All Levels':'bg-blue-100 text-blue-700' };
  badges.innerHTML = `
    <span class="topic-badge ${diffColor[t.difficulty] || 'bg-blue-100 text-blue-700'}">${t.difficulty}</span>
    <span class="topic-badge bg-indigo-100 text-indigo-700">${t.type}</span>
  `;

  const container = document.getElementById('questionsContainer');
  container.innerHTML = '';

  t.questions.forEach((q, i) => {
    const div = document.createElement('div');
    div.className = 'card p-5 fade-in';
    div.style.animationDelay = `${i * 0.04}s`;
    div.innerHTML = buildQuestionHTML(q, i);
    container.appendChild(div);
  });

  renderAnswerKey();
}

function buildQuestionHTML(q, idx) {
  const letters = ['A','B','C','D'];
  let optionsHTML = '';

  if (q.type === 'mcq') {
    optionsHTML = `<div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
      ${q.options.map((o, j) => `
        <div class="flex items-center px-3 py-2.5 rounded-lg border border-gray-100 bg-gray-50/50">
          <span class="option-label">${letters[j]}</span>
          <span class="text-sm text-gray-700">${o}</span>
        </div>
      `).join('')}
    </div>`;
  } else if (q.type === 'truefalse') {
    optionsHTML = `<div class="flex gap-3 mt-3">
      <div class="flex items-center px-4 py-2.5 rounded-lg border border-gray-100 bg-gray-50/50">
        <span class="option-label">T</span><span class="text-sm text-gray-700">True</span>
      </div>
      <div class="flex items-center px-4 py-2.5 rounded-lg border border-gray-100 bg-gray-50/50">
        <span class="option-label">F</span><span class="text-sm text-gray-700">False</span>
      </div>
    </div>`;
  } else {
    optionsHTML = `<div class="mt-3 border-b-2 border-dashed border-gray-300 py-4">
      <span class="text-sm text-gray-400 italic">Write your answer here…</span>
    </div>`;
  }

  const typeBadge = { mcq:'MCQ', truefalse:'True/False', short:'Short Answer' };

  return `
    <div class="flex items-start gap-3">
      <span class="q-number">${idx + 1}</span>
      <div class="flex-1">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">${typeBadge[q.type]}</span>
          <span class="text-xs text-gray-400">${q.topic}</span>
        </div>
        <p class="font-medium text-gray-800 leading-relaxed">${q.question}</p>
        ${optionsHTML}
      </div>
    </div>
  `;
}

// ─── Answer Key ──────────────────────────────────────
function renderAnswerKey() {
  const container = document.getElementById('answerKeySection');
  const letters = ['A','B','C','D'];
  let html = `<div class="card p-6 fade-in">
    <h2 class="text-xl font-bold text-blue-900 mb-5 flex items-center gap-2">
      <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      Answer Key
    </h2>
    <div class="space-y-3">`;

  currentTest.questions.forEach((q, i) => {
    let ansDisplay = q.answer;
    if (q.type === 'mcq') {
      const idx = q.options.indexOf(q.answer);
      ansDisplay = `${letters[idx]}. ${q.answer}`;
    }
    html += `
      <div class="answer-correct rounded-lg p-3.5">
        <div class="flex items-start gap-3">
          <span class="q-number" style="background:#16a34a">${i + 1}</span>
          <div>
            <p class="text-sm font-semibold text-gray-800">${q.question}</p>
            <p class="text-sm text-green-700 font-semibold mt-1">Answer: ${ansDisplay}</p>
            <p class="text-xs text-gray-500 mt-1">${q.explanation}</p>
          </div>
        </div>
      </div>`;
  });

  html += `</div></div>`;
  container.innerHTML = html;
}

function toggleAnswerKey() {
  answerKeyVisible = !answerKeyVisible;
  const section = document.getElementById('answerKeySection');
  const btn = document.getElementById('answerKeyToggle');

  if (answerKeyVisible) {
    section.classList.remove('hidden');
    section.scrollIntoView({ behavior:'smooth' });
    btn.innerHTML = `
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"/></svg>
      Hide Answer Key`;
  } else {
    section.classList.add('hidden');
    btn.innerHTML = `
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
      Show Answer Key`;
  }
}

// ─── PDF Download ────────────────────────────────────
function downloadPDF() {
  if (!currentTest) return;
  const doc = new jsPDF('p','mm','a4');
  const pw = 210, ph = 297;
  const ml = 20, mr = 20, mt = 20;
  const cw = pw - ml - mr;
  const letters = ['A','B','C','D'];
  let y = mt;

  function checkPage(needed) {
    if (y + needed > ph - 25) { doc.addPage(); y = mt; return true; }
    return false;
  }

  // ── Header ──
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pw, 42, 'F');
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 42, pw, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica','bold');
  doc.text('Wingspan Approach', ml, 18);

  doc.setFontSize(11);
  doc.setFont('helvetica','normal');
  doc.text('Aviation Mock Test', ml, 27);

  doc.setFontSize(9);
  doc.setTextColor(180, 200, 230);
  doc.text(`Topic: ${currentTest.topic}  |  Difficulty: ${currentTest.difficulty}  |  ${currentTest.count} Questions`, ml, 36);

  // Date on right
  doc.setFontSize(9);
  doc.text(currentTest.date, pw - mr, 36, { align:'right' });

  y = 55;
  doc.setTextColor(30, 30, 30);

  // ── Questions ──
  doc.setFontSize(14);
  doc.setFont('helvetica','bold');
  doc.setTextColor(30, 58, 95);
  doc.text('Questions', ml, y);
  y += 3;
  doc.setDrawColor(37, 99, 235);
  doc.setLineWidth(0.5);
  doc.line(ml, y, ml + 30, y);
  y += 8;

  currentTest.questions.forEach((q, i) => {
    checkPage(35);

    // Question number circle
    doc.setFillColor(30, 58, 95);
    doc.circle(ml + 4, y - 1.5, 4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica','bold');
    doc.text(`${i + 1}`, ml + 4, y - 0.5, { align:'center' });

    // Question text
    doc.setTextColor(30, 30, 30);
    doc.setFontSize(10);
    doc.setFont('helvetica','bold');
    const qLines = doc.splitTextToSize(q.question, cw - 14);
    doc.text(qLines, ml + 12, y);
    y += qLines.length * 5 + 2;

    // Options
    doc.setFont('helvetica','normal');
    doc.setFontSize(9);
    if (q.type === 'mcq') {
      q.options.forEach((opt, j) => {
        checkPage(8);
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(ml + 12, y - 3.5, cw - 14, 7, 1.5, 1.5, 'F');
        doc.setTextColor(30, 64, 175);
        doc.setFont('helvetica','bold');
        doc.text(`${letters[j]}.`, ml + 15, y);
        doc.setTextColor(60, 60, 60);
        doc.setFont('helvetica','normal');
        doc.text(opt, ml + 22, y);
        y += 8;
      });
    } else if (q.type === 'truefalse') {
      checkPage(8);
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(ml + 12, y - 3.5, 24, 7, 1.5, 1.5, 'F');
      doc.roundedRect(ml + 40, y - 3.5, 24, 7, 1.5, 1.5, 'F');
      doc.setTextColor(60, 60, 60);
      doc.text('True', ml + 19, y);
      doc.text('False', ml + 47, y);
      y += 8;
    } else {
      checkPage(10);
      doc.setDrawColor(200, 200, 200);
      doc.setLineDashPattern([2, 2], 0);
      doc.line(ml + 12, y + 2, ml + cw - 2, y + 2);
      doc.setLineDashPattern([], 0);
      y += 10;
    }
    y += 4;
  });

  // ── Answer Key Page ──
  doc.addPage();
  y = mt;

  doc.setFillColor(22, 163, 74);
  doc.rect(0, 0, pw, 36, 'F');
  doc.setFillColor(21, 128, 61);
  doc.rect(0, 36, pw, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica','bold');
  doc.text('Answer Key', ml, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica','normal');
  doc.text(`${currentTest.topic} · ${currentTest.date}`, ml, 28);

  y = 48;

  currentTest.questions.forEach((q, i) => {
    checkPage(22);

    doc.setFillColor(240, 253, 244);
    const blockH = 16;
    doc.roundedRect(ml, y - 4, cw, blockH, 2, 2, 'F');

    // Green left border
    doc.setFillColor(22, 163, 74);
    doc.rect(ml, y - 4, 2, blockH, 'F');

    doc.setFillColor(22, 163, 74);
    doc.circle(ml + 8, y + 1, 3.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica','bold');
    doc.text(`${i + 1}`, ml + 8, y + 2, { align:'center' });

    let ansText = q.answer;
    if (q.type === 'mcq') {
      const idx = q.options.indexOf(q.answer);
      ansText = `${letters[idx]}. ${q.answer}`;
    }

    doc.setTextColor(22, 101, 52);
    doc.setFontSize(9);
    doc.setFont('helvetica','bold');
    doc.text(ansText, ml + 15, y + 1);

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(7.5);
    doc.setFont('helvetica','normal');
    const expLines = doc.splitTextToSize(q.explanation, cw - 20);
    doc.text(expLines[0], ml + 15, y + 6);

    y += blockH + 4;
  });

  // Footer on every page
  const pages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text('Generated by Wingspan Approach · wingspanaprroach.com', ml, ph - 10);
    doc.text(`Page ${p} of ${pages}`, pw - mr, ph - 10, { align:'right' });
  }

  doc.save(`Wingspan_MockTest_${currentTest.topic.replace(/\s/g,'_')}_${currentTest.date.replace(/\s/g,'')}.pdf`);
}

// ─── History ─────────────────────────────────────────
function saveToHistory() {
  let history = JSON.parse(localStorage.getItem('ws_test_history') || '[]');
  history.unshift({
    topic: currentTest.topic,
    difficulty: currentTest.difficulty,
    type: currentTest.type,
    count: currentTest.count,
    date: currentTest.date,
    time: currentTest.time,
    timestamp: currentTest.timestamp
  });
  if (history.length > 10) history = history.slice(0, 10);
  localStorage.setItem('ws_test_history', JSON.stringify(history));
  renderHistory();
}

function renderHistory() {
  const history = JSON.parse(localStorage.getItem('ws_test_history') || '[]');
  const container = document.getElementById('historyList');

  if (history.length === 0) {
    container.innerHTML = '<p class="text-gray-400 text-sm italic">No tests generated yet. Configure and generate your first test above!</p>';
    return;
  }

  container.innerHTML = history.map((h, i) => `
    <div class="history-item flex items-center justify-between px-4 py-3 rounded-lg border border-gray-100 ${i === 0 ? 'bg-blue-50/50 border-blue-100' : ''}">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">${i + 1}</div>
        <div>
          <p class="text-sm font-semibold text-gray-800">${h.topic}</p>
          <p class="text-xs text-gray-400">${h.count} Qs · ${h.difficulty} · ${h.type}</p>
        </div>
      </div>
      <div class="text-right">
        <p class="text-xs text-gray-500">${h.date}</p>
        <p class="text-xs text-gray-400">${h.time}</p>
      </div>
    </div>
  `).join('');
}

function clearHistory() {
  localStorage.removeItem('ws_test_history');
  renderHistory();
}
