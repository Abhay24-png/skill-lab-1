const STORAGE_KEY = 'personal-task-manager-history';

const form = document.getElementById('activityForm');
const historyList = document.getElementById('historyList');
const breakdownList = document.getElementById('breakdownList');
const scoreRing = document.getElementById('scoreRing');
const healthScoreEl = document.getElementById('healthScore');
const healthTitle = document.getElementById('healthTitle');
const healthMessage = document.getElementById('healthMessage');
const healthAvatar = document.getElementById('healthAvatar');
const todayDate = document.getElementById('todayDate');

const resetBtn = document.getElementById('resetBtn');

const today = new Date();
todayDate.textContent = today.toLocaleDateString('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric'
});

function getFormData() {
  return {
    breakfast: form.mealBreakfast.checked,
    lunch: form.mealLunch.checked,
    dinner: form.mealDinner.checked,
    wakeUpTime: form.wakeUpTime.value || '07:00',
    morningWalk: Number(form.morningWalk.value || 0),
    workHours: Number(form.workHours.value || 0),
    physicalActivity: form.physicalActivity.value || 'none',
    activityMinutes: Number(form.activityMinutes.value || 0),
    waterIntake: Number(form.waterIntake.value || 0),
    sleepHours: Number(form.sleepHours.value || 0),
  };
}

function timeToMinutes(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function calculateMealScore(data) {
  const totalMeals = [data.breakfast, data.lunch, data.dinner].filter(Boolean).length;
  return (totalMeals / 3) * 20;
}

function calculateWakeUpScore(data) {
  const wakeMinutes = timeToMinutes(data.wakeUpTime);
  const idealRange = 6 * 60 + 30;
  const latestRange = 8 * 60 + 30;

  if (wakeMinutes <= idealRange) return 15;
  if (wakeMinutes <= latestRange) return 12;
  if (wakeMinutes <= 9 * 60 + 30) return 8;
  return 4;
}

function calculateWalkScore(data) {
  const ratio = clamp(data.morningWalk / 30, 0, 1);
  return ratio * 15;
}

function calculateWorkScore(data) {
  const ratio = clamp((data.workHours - 4) / 5, 0, 1);
  return ratio * 15;
}

function calculateActivityScore(data) {
  const ratio = clamp(data.activityMinutes / 45, 0, 1);
  return ratio * 15;
}

function calculateWaterScore(data) {
  const ratio = clamp(data.waterIntake / 3, 0, 1);
  return ratio * 10;
}

function calculateSleepScore(data) {
  const ratio = clamp(data.sleepHours / 8, 0, 1);
  return ratio * 10;
}

function calculateHealthScore(data) {
  const breakdown = {
    Meals: calculateMealScore(data),
    Wakeup: calculateWakeUpScore(data),
    Walk: calculateWalkScore(data),
    Work: calculateWorkScore(data),
    Activity: calculateActivityScore(data),
    Water: calculateWaterScore(data),
    Sleep: calculateSleepScore(data),
  };

  const total = Object.values(breakdown).reduce((acc, curr) => acc + curr, 0);
  const score = Math.round(total);

  return { score: clamp(score, 0, 100), breakdown };
}

function getHealthMessage(score) {
  if (score >= 85) return 'Excellent balance. You are maintaining a strong and consistent routine.';
  if (score >= 70) return 'Great progress. A few adjustments can make your healthy habits even better.';
  if (score >= 55) return 'Fair day. Focus on routine consistency and recovery to improve your score.';
  return 'Needs attention. Prioritize sleep, hydration, movement, and healthy meals.';
}

function getHealthTitle(score) {
  if (score >= 85) return 'Amazing day';
  if (score >= 70) return 'Strong routine';
  if (score >= 55) return 'Steady progress';
  return 'Needs improvement';
}

function updateAvatarState(score) {
  healthAvatar.classList.remove('state-good', 'state-medium', 'state-low');

  if (score >= 70) {
    healthAvatar.classList.add('state-good');
  } else if (score >= 55) {
    healthAvatar.classList.add('state-medium');
  } else {
    healthAvatar.classList.add('state-low');
  }
}

function updateOverview(data) {
  const { score, breakdown } = calculateHealthScore(data);

  scoreRing.style.background = `conic-gradient(#ff2c2c 0 ${score * 3.6}deg, rgba(255,255,255,0.06) ${score * 3.6}deg 360deg)`;
  healthScoreEl.textContent = `${score}%`;
  healthTitle.textContent = getHealthTitle(score);
  healthMessage.textContent = getHealthMessage(score);
  updateAvatarState(score);

  document.getElementById('wakeUpSummary').textContent = formatTime(data.wakeUpTime);
  document.getElementById('walkSummary').textContent = `${data.morningWalk} min`;
  document.getElementById('workSummary').textContent = `${data.workHours} hrs`;
  document.getElementById('sleepSummary').textContent = `${data.sleepHours} hrs`;

  renderBreakdown(breakdown);

  return { score, breakdown };
}

function formatTime(value) {
  if (!value) return '--:--';
  const [hours, minutes] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function renderBreakdown(breakdown) {
  const entries = [
    ['Meals', breakdown.Meals],
    ['Wake up', breakdown.Wakeup],
    ['Walk', breakdown.Walk],
    ['Work', breakdown.Work],
    ['Activity', breakdown.Activity],
    ['Water', breakdown.Water],
    ['Sleep', breakdown.Sleep],
  ];

  breakdownList.innerHTML = entries
    .map(([label, value]) => `
      <li class="breakdown-item">
        <div class="breakdown-label">
          <span class="breakdown-dot"></span>
          <span>${label}</span>
        </div>
        <span class="breakdown-score">${Math.round(value)}%</span>
      </li>
    `)
    .join('');
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}

function saveHistory(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function renderHistory() {
  const entries = loadHistory();

  if (!entries.length) {
    historyList.innerHTML = '<div class="empty-history">No saved activity yet. Save your first day to begin tracking your progress.</div>';
    return;
  }

  historyList.innerHTML = entries
    .slice()
    .reverse()
    .map((entry) => `
      <div class="history-item">
        <div class="history-meta">
          <span class="history-date">${entry.date}</span>
          <span class="history-note">${entry.summary}</span>
        </div>
        <span class="history-score">${entry.score}%</span>
      </div>
    `)
    .join('');
}

function createHistorySummary(data, score) {
  const meals = [data.breakfast, data.lunch, data.dinner].filter(Boolean).length;
  return `${meals}/3 meals • ${data.morningWalk} min walk • ${data.waterIntake}L water`;
}

function saveDailyProgress(event) {
  event.preventDefault();
  const data = getFormData();
  const { score } = updateOverview(data);

  const entries = loadHistory();
  const entry = {
    date: new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }),
    summary: createHistorySummary(data, score),
    score,
  };

  entries.push(entry);
  saveHistory(entries);
  renderHistory();
}

function resetForm() {
  form.reset();
  form.wakeUpTime.value = '07:00';
  form.physicalActivity.value = 'gym';
  form.activityMinutes.value = '45';
  form.morningWalk.value = '30';
  form.workHours.value = '8';
  form.waterIntake.value = '2.5';
  form.sleepHours.value = '8';

  const data = getFormData();
  updateOverview(data);
}

form.addEventListener('submit', saveDailyProgress);
resetBtn.addEventListener('click', resetForm);

window.addEventListener('DOMContentLoaded', () => {
  const data = getFormData();
  updateOverview(data);
  renderHistory();
});
