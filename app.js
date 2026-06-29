// app.js
// 화면 전환과 서버 통신을 담당해요.

const formScreen = document.getElementById('formScreen');
const loadingScreen = document.getElementById('loadingScreen');
const resultScreen = document.getElementById('resultScreen');
const errorMsg = document.getElementById('errorMsg');

// ---------- 티켓 번호 / 바코드 장식 ----------
document.getElementById('ticketId').textContent =
  'NO. EDR-' + Math.floor(100000 + Math.random() * 900000);

const bc = document.getElementById('barcode');
for (let i = 0; i < 40; i++) {
  const bar = document.createElement('span');
  bar.style.height = (Math.random() > 0.3 ? '100%' : '60%');
  bar.style.opacity = Math.random() > 0.5 ? '1' : '0.6';
  bc.appendChild(bar);
}

// ---------- 입력 폼 보조 스텁 표시 ----------
const originEl = document.getElementById('origin');
const destEl = document.getElementById('destination');
const startEl = document.getElementById('startDate');
const stubRoute = document.getElementById('stubRoute');
const stubDate = document.getElementById('stubDate');

function updateStub() {
  const o = originEl.value.trim() || '—';
  const d = destEl.value.trim() || '—';
  stubRoute.textContent = o + ' → ' + d;

  if (startEl.value) {
    const date = new Date(startEl.value);
    stubDate.textContent = (date.getMonth() + 1) + '월 ' + date.getDate() + '일';
  } else {
    stubDate.textContent = '미정';
  }
}
originEl.addEventListener('input', updateStub);
destEl.addEventListener('input', updateStub);
startEl.addEventListener('input', updateStub);

// ---------- 카테고리 한글 표시 ----------
const CATEGORY_LABELS = {
  '이동': '이동', '식사': '식사', '관광': '관광',
  '쇼핑': '쇼핑', '휴양': '휴양', '액티비티': '액티비티'
};

// ---------- 폼 제출 ----------
const form = document.getElementById('planForm');
const submitBtn = document.getElementById('submitBtn');

form.addEventListener('submit', async function (e) {
  e.preventDefault();
  errorMsg.textContent = '';

  const payload = {
    origin: originEl.value.trim(),
    destination: destEl.value.trim(),
    startDate: startEl.value,
    endDate: document.getElementById('endDate').value,
    travelers: document.getElementById('travelers').value || '2',
    budget: document.getElementById('budget').value.replace(/[^0-9]/g, ''),
    style: document.getElementById('style').value
  };

  if (!payload.origin || !payload.destination || !payload.startDate || !payload.endDate) {
    errorMsg.textContent = '출발지, 목적지, 날짜를 모두 입력해주세요.';
    return;
  }

  showLoading();

  try {
    const res = await fetch('/api/generate-itinerary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      showForm();
      errorMsg.textContent = data.error || '일정을 만드는 데 문제가 생겼어요.';
      return;
    }

    renderResult(data.itinerary, payload);
    showResult();

  } catch (err) {
    console.error(err);
    showForm();
    errorMsg.textContent = '서버에 연결하지 못했어요. 서버가 켜져 있는지 확인해주세요.';
  }
});

function showForm() {
  formScreen.classList.remove('hidden');
  loadingScreen.classList.add('hidden');
  resultScreen.classList.add('hidden');
}
function showLoading() {
  formScreen.classList.add('hidden');
  loadingScreen.classList.remove('hidden');
  resultScreen.classList.add('hidden');
}
function showResult() {
  formScreen.classList.add('hidden');
  loadingScreen.classList.add('hidden');
  resultScreen.classList.remove('hidden');
}

document.getElementById('retryBtn').addEventListener('click', showForm);
document.getElementById('saveBtn').addEventListener('click', () => {
  alert('저장 기능은 다음 단계에서 추가할 거예요. 지금은 이 페이지를 PDF로 인쇄하거나 캡처해두세요.');
});

// ---------- 결과 렌더링 ----------
function renderResult(itinerary, payload) {
  document.getElementById('resultRoute').innerHTML =
    `${escapeHtml(payload.origin)} <span style="color:var(--stamp)">→</span> ${escapeHtml(payload.destination)}`;

  const metaParts = [];
  metaParts.push(`<span><b>${itinerary.totalDays || itinerary.days.length}일</b></span>`);
  metaParts.push(`<span><b>${payload.travelers}인</b></span>`);
  document.getElementById('resultMeta').innerHTML = metaParts.join('');

  const tabsEl = document.getElementById('dayTabs');
  const pagesEl = document.getElementById('dayPages');
  tabsEl.innerHTML = '';
  pagesEl.innerHTML = '';

  itinerary.days.forEach((day, idx) => {
    const tab = document.createElement('div');
    tab.className = 'day-tab' + (idx === 0 ? ' active' : '');
    tab.dataset.day = day.dayNumber;
    tab.textContent = `${day.dayNumber}일차 · ${day.theme || ''}`.slice(0, 18);
    tabsEl.appendChild(tab);

    const page = document.createElement('div');
    page.className = 'day-page' + (idx === 0 ? ' active' : '');
    page.dataset.day = day.dayNumber;

    const stopsHtml = (day.stops || []).map(stop => `
      <div class="stop">
        <div class="stop-card">
          <div class="stop-time">${escapeHtml(stop.time || '')}</div>
          <div class="stop-name">${escapeHtml(stop.name || '')}</div>
          <div class="stop-desc">${escapeHtml(stop.description || '')}</div>
          <div class="stop-tags">
            ${stop.category ? `<span class="tag">${escapeHtml(stop.category)}</span>` : ''}
            ${stop.budgetNote ? `<span class="tag budget">${escapeHtml(stop.budgetNote)}</span>` : ''}
          </div>
          <div class="stop-verify ${stop.verified ? '' : 'unverified'}">
            ${stop.verified
              ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#5B8A8C" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>실제 존재하는 곳으로 확인됨'
              : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#B08A3E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>현지에서 확인 필요'}
          </div>
        </div>
      </div>
    `).join('');

    page.innerHTML = `
      <div class="day-head">
        <h2>${day.dayNumber}일차 — ${escapeHtml(day.date || '')}</h2>
        <span class="day-theme">${escapeHtml(day.theme || '')}</span>
      </div>
      <div class="timeline">${stopsHtml}</div>
    `;
    pagesEl.appendChild(page);
  });

  tabsEl.querySelectorAll('.day-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const day = tab.dataset.day;
      tabsEl.querySelectorAll('.day-tab').forEach(t => t.classList.toggle('active', t === tab));
      pagesEl.querySelectorAll('.day-page').forEach(p => p.classList.toggle('active', p.dataset.day === day));
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}
