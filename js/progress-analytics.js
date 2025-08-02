// js/progress-analytics.js
import { db } from './firebase-config.js';
import { initializeAuth } from './auth.js';
import { showToast, toggleButtonLoading } from './utils.js';

// --- GLOBAL STATE ---
let currentUser, userHistory = [], dateToWorkoutIdMap = {}, progressChart = null, calendarDate = new Date();

// --- DOM ELEMENTS ---
const prExerciseSelect = document.getElementById('pr-exercise-select');
const resultArea = document.getElementById('pr-result-area');
const historyCarousel = document.getElementById('history-carousel');
const modalOverlay = document.getElementById('history-detail-overlay');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalCloseBtn = document.getElementById('modal-close-btn');
const modalDeleteBtn = document.getElementById('modal-delete-btn');
const chooseDateBtn = document.getElementById('choose-date-btn');
const calendarPopup = document.getElementById('calendar-popup');
const calendarGrid = document.getElementById('calendar-grid');
const chartMetricSelect = document.getElementById('chart-metric-select');
const chartExerciseSelectContainer = document.getElementById('chart-exercise-select-container');
const chartExerciseSelect = document.getElementById('chart-exercise-select');

// --- FUNCTIONS ---
function formatLargeNumber(num) { if (num >= 1000000) return parseFloat((num / 1000000).toFixed(1)) + 'M'; if (num >= 1000) return parseFloat((num / 1000).toFixed(1)) + 'k'; return num.toLocaleString(); }
function calculateEstimated1RM(weight, reps) { const w = parseFloat(weight); const r = parseInt(reps, 10); if (!w || !r || r < 1 || r > 12) return 0; return w * (1 + r / 30); }
function calculatePR(exerciseName) {
    let bestSet = null, prDate = null, max1RM = 0;
    userHistory.forEach(workout => { workout.exercises.forEach(exercise => { if (exercise.name === exerciseName) { exercise.sets.forEach(set => { const estimated1RM = calculateEstimated1RM(set.weight, set.reps); if (estimated1RM > max1RM) { max1RM = estimated1RM; bestSet = set; prDate = workout.date; } }); } }); });
    return bestSet ? { ...bestSet, date: prDate, estimated1RM: max1RM } : null;
}
function displayPR() {
    const selectedExercise = prExerciseSelect.value;
    if (!selectedExercise) { resultArea.innerHTML = '<p class="pr-prompt">Select an exercise to see your all-time personal record.</p>'; } else {
        const prData = calculatePR(selectedExercise);
        if (prData) { const dateString = new Date(prData.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); resultArea.innerHTML = `<p class="pr-result-value">${prData.weight} lbs x ${prData.reps} reps</p><p class="pr-prompt" style="font-size: 1.1rem; color: var(--text-primary);">Est. 1RM: <strong>${Math.round(prData.estimated1RM)} lbs</strong></p><p class="pr-result-date">Achieved on ${dateString}</p>`; } else { resultArea.innerHTML = `<p class="pr-prompt">No PR found for this exercise.</p>`; }
    }
}
function openHistoryModal(workoutId) {
    const workout = userHistory.find(w => w.id === workoutId); if (!workout) return;
    const dateString = new Date(workout.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    modalTitle.textContent = `${workout.name} - ${dateString}`;
    modalBody.innerHTML = workout.exercises.map(ex => `<div class="detail-exercise-item"><p class="detail-exercise-name">${ex.name}</p><ul class="detail-set-list">${ex.sets.map((set, index) => `<li>Set ${index + 1}: ${set.weight} lbs for ${set.reps} reps</li>`).join('')}</ul></div>`).join('');
    modalDeleteBtn.dataset.workoutId = workoutId; modalOverlay.classList.add('active');
}
function closeHistoryModal() { modalOverlay.classList.remove('active'); }
async function deleteWorkoutFromHistory(workoutId) {
    if (!currentUser || !workoutId) return; if (confirm("Are you sure you want to permanently delete this workout from your history?")) {
        toggleButtonLoading(modalDeleteBtn, true);
        try { await db.collection('users').doc(currentUser.uid).collection('history').doc(workoutId).delete(); closeHistoryModal(); await initAnalyticsPage(currentUser); showToast("Workout deleted successfully.", "success"); } catch (error) { showToast("Could not delete workout.", "error"); } finally { toggleButtonLoading(modalDeleteBtn, false); }
    }
}
function populateHistoryCarousel() {
    if (userHistory.length === 0) { historyCarousel.innerHTML = `<p style="color: var(--text-tertiary); padding-left: 10px;">No workout history found.</p>`; return; }
    historyCarousel.innerHTML = userHistory.map(workout => `<div class="history-card glass-card" data-workout-id="${workout.id}"><h3 class="history-card-title">${workout.name}</h3><p class="history-card-date">${new Date(workout.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p></div>`).join('');
    document.querySelectorAll('.history-card').forEach(card => { card.addEventListener('click', () => openHistoryModal(card.dataset.workoutId)); });
}
function renderProgressCharts() {
    const ctx = document.getElementById('progress-chart').getContext('2d'), chartMetric = chartMetricSelect.value;
    if (progressChart) progressChart.destroy();
    let chartConfig;
    if (chartMetric === 'volume') {
        chartExerciseSelectContainer.style.display = 'none';
        const volumeByWeek = userHistory.reduce((acc, workout) => { const workoutDate = new Date(workout.date); const year = workoutDate.getFullYear(); const weekStart = new Date(workoutDate.setDate(workoutDate.getDate() - workoutDate.getDay())); const weekKey = `${year}-${(weekStart.getMonth() + 1).toString().padStart(2, '0')}-${weekStart.getDate().toString().padStart(2, '0')}`; const workoutVolume = workout.exercises.reduce((vol, ex) => vol + ex.sets.reduce((setVol, set) => setVol + (parseFloat(set.weight) || 0) * (set.reps === 'Unknown' ? 0 : (parseInt(set.reps, 10) || 0)), 0), 0); acc[weekKey] = (acc[weekKey] || 0) + workoutVolume; return acc; }, {});
        const sortedWeeks = Object.keys(volumeByWeek).sort((a, b) => new Date(a) - new Date(b)), labels = sortedWeeks.map(w => new Date(w)), realData = sortedWeeks.map(week => volumeByWeek[week]);
        chartConfig = { type: 'bar', data: { labels: labels, datasets: [{ label: 'Total Weekly Weight Lifted (lbs)', data: realData, backgroundColor: 'rgba(10, 132, 255, 0.6)', borderColor: 'rgba(10, 132, 255, 1)', borderWidth: 1, borderRadius: 15 }] }, options: { animation: { duration: 1000 }, scales: { x: { type: 'time', time: { unit: 'week' }, ticks: { color: 'white' } }, y: { beginAtZero: true, ticks: { color: 'white' } } }, plugins: { legend: { labels: { color: 'white' } } } } };
    } else {
        chartExerciseSelectContainer.style.display = 'block'; const selectedExercise = chartExerciseSelect.value;
        if (!selectedExercise) { ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height); ctx.font = "16px -apple-system, sans-serif"; ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'; ctx.textAlign = 'center'; ctx.fillText('Select an exercise to see 1RM progress.', ctx.canvas.width / 2, 50); return; }
        const oneRMHistory = []; userHistory.forEach(workout => { let best1RMForWorkout = 0; workout.exercises.forEach(ex => { if (ex.name === selectedExercise) { ex.sets.forEach(set => { const est1RM = calculateEstimated1RM(set.weight, set.reps); if (est1RM > best1RMForWorkout) best1RMForWorkout = est1RM; }); } }); if (best1RMForWorkout > 0) oneRMHistory.push({ x: new Date(workout.date), y: Math.round(best1RMForWorkout) }); });
        oneRMHistory.sort((a, b) => a.x - b.x);
        chartConfig = { type: 'line', data: { datasets: [{ label: `Est. 1RM for ${selectedExercise} (lbs)`, data: oneRMHistory, backgroundColor: 'rgba(10, 132, 255, 0.6)', borderColor: 'rgba(10, 132, 255, 1)', tension: 0.1 }] }, options: { animation: { duration: 1000 }, scales: { x: { type: 'time', time: { unit: 'month' }, ticks: { color: 'white' } }, y: { beginAtZero: false, ticks: { color: 'white' } } }, plugins: { legend: { labels: { color: 'white' } } } } };
    }
    if(chartConfig) progressChart = new Chart(ctx, chartConfig);
}
function renderMiniCalendar() {
    const monthYearEl = document.getElementById('calendar-month-year'); calendarGrid.innerHTML = ''; const year = calendarDate.getFullYear(), month = calendarDate.getMonth(); monthYearEl.textContent = `${calendarDate.toLocaleString('default', { month: 'long' })} ${year}`;
    const firstDayOfMonth = new Date(year, month, 1).getDay(); const startDate = new Date(year, month, 1); startDate.setDate(startDate.getDate() - firstDayOfMonth);
    for (let i = 0; i < 42; i++) { const dayEl = document.createElement('div'); const thisDate = new Date(startDate); thisDate.setDate(startDate.getDate() + i); dayEl.textContent = thisDate.getDate(); dayEl.className = 'calendar-day'; const dateKey = thisDate.toISOString().split('T')[0]; const workoutId = dateToWorkoutIdMap[dateKey]; if (thisDate.getMonth() !== month) dayEl.classList.add('other-month'); if (workoutId) { dayEl.classList.add('has-workout'); dayEl.addEventListener('click', () => { openHistoryModal(workoutId); calendarPopup.classList.remove('active'); }); } if (thisDate.toDateString() === new Date().toDateString() && thisDate.getMonth() === month) dayEl.classList.add('current-day'); calendarGrid.appendChild(dayEl); }
}

// --- INITIALIZATION ---
async function initAnalyticsPage(user) {
    currentUser = user;
    if (!currentUser) return;
    const snapshot = await db.collection('users').doc(currentUser.uid).collection('history').orderBy('date', 'desc').get(); userHistory = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    dateToWorkoutIdMap = userHistory.reduce((acc, workout) => { acc[new Date(workout.date).toISOString().split('T')[0]] = workout.id; return acc; }, {});
    let totalVolume = 0, totalSets = 0; const exerciseSet = new Set();
    userHistory.forEach(workout => { workout.exercises.forEach(ex => { exerciseSet.add(ex.name); ex.sets.forEach(set => { totalVolume += (parseFloat(set.weight) || 0) * (parseInt(set.reps, 10) || 0); totalSets++; }); }); });
    document.getElementById('total-workouts').textContent = userHistory.length; document.getElementById('total-volume').textContent = formatLargeNumber(totalVolume); document.getElementById('total-sets').textContent = totalSets;
    const exerciseOptionsHTML = '<option value="">-- Choose an exercise --</option>' + Array.from(exerciseSet).sort().map(exName => `<option value="${exName}">${exName}</option>`).join('');
    prExerciseSelect.innerHTML = exerciseOptionsHTML; chartExerciseSelect.innerHTML = exerciseOptionsHTML;
    displayPR(); renderProgressCharts(); populateHistoryCarousel();
}

// --- EVENT LISTENERS ---
modalCloseBtn.addEventListener('click', closeHistoryModal);
modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeHistoryModal(); });
modalDeleteBtn.addEventListener('click', (e) => { const workoutId = e.currentTarget.dataset.workoutId; if (workoutId) deleteWorkoutFromHistory(workoutId); });
prExerciseSelect.addEventListener('change', displayPR);
chartMetricSelect.addEventListener('change', renderProgressCharts);
chartExerciseSelect.addEventListener('change', renderProgressCharts);
chooseDateBtn.addEventListener('click', (e) => { e.stopPropagation(); const isActive = calendarPopup.classList.toggle('active'); if (isActive) renderMiniCalendar(); });
document.addEventListener('click', (e) => { if (!calendarPopup.contains(e.target) && e.target !== chooseDateBtn) calendarPopup.classList.remove('active'); });
document.getElementById('prev-month-btn').addEventListener('click', () => { calendarDate.setMonth(calendarDate.getMonth() - 1); renderMiniCalendar(); });
document.getElementById('next-month-btn').addEventListener('click', () => { calendarDate.setMonth(calendarDate.getMonth() + 1); renderMiniCalendar(); });
document.addEventListener('DOMContentLoaded', () => initializeAuth(initAnalyticsPage));
