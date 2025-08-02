// js/main-app.js
import { db } from './firebase-config.js';
import { initializeAuth } from './auth.js';
import { showToast, toggleButtonLoading, lockBodyScroll, unlockBodyScroll } from './utils.js';

// --- GLOBAL STATE ---
let currentUser, userHistory = [], workouts = {}, schedule = {}, currentWorkoutName = null;

// --- DOM ELEMENTS ---
const workoutSessionOverlay = document.getElementById('workout-session-overlay');
const workoutSessionTitle = document.getElementById('workout-session-title');
const workoutSessionBody = document.getElementById('workout-session-body');
const workoutSessionFooter = document.getElementById('workout-session-footer');
const minimizeWorkoutBtn = document.getElementById('minimize-workout-btn');
const cancelWorkoutBtn = document.getElementById('cancel-workout-btn');
const ongoingWorkoutBanner = document.getElementById('ongoing-workout-banner');
const ongoingWorkoutNameEl = document.getElementById('ongoing-workout-name');
const resumeWorkoutBtn = document.getElementById('resume-workout-btn');

// --- FUNCTIONS ---
function debounce(func, delay) { let timeout; return function(...args) { const context = this; clearTimeout(timeout); timeout = setTimeout(() => func.apply(context, args), delay); }; }
function parseRestTime(restString) { if (!restString || typeof restString !== 'string') return 90; const timeValue = parseInt(restString, 10); return isNaN(timeValue) ? 90 : (restString.includes('min') ? timeValue * 60 : timeValue); }
function startTimer(durationInSeconds) { const shortcutName = "StartWorkoutTimer"; const shortcutUrl = "https://www.icloud.com/shortcuts/3d872dcd00fc440c93e5658691ef535b"; if (!localStorage.getItem('hasDownloadedShortcut')) { if (confirm("To use the timer, you need to install a free Apple Shortcut. This is a one-time setup.\n\nWould you like to download it now?")) { localStorage.setItem('hasDownloadedShortcut', 'true'); window.open(shortcutUrl, '_blank'); } } else { window.location.href = `shortcuts://run-shortcut?name=${encodeURIComponent(shortcutName)}&input=${durationInSeconds}`; } }
function findLastExercisePerformance(exerciseName, history) { if (!exerciseName) return null; const normalizedExerciseName = exerciseName.trim().toLowerCase(); for (const workout of history) { const foundExercise = workout.exercises?.find(ex => ex.name && ex.name.trim().toLowerCase() === normalizedExerciseName); if (foundExercise) return foundExercise; } return null; }
function getWarmupSetDetails(numSets, setIndex) { const protocols = { 1: ["~60% weight for ~6-10 reps"], 2: ["~50% weight for ~6-10 reps", "~70% weight for 4-6 reps"], 3: ["~45% weight for ~6-10 reps", "~65% weight for 4-6 reps", "~85% weight for 3-4 reps"], 4: ["~45% weight for ~6-10 reps", "~60% weight for 4-6 reps", "~75% weight for 3-5 reps", "~85% weight for 2-4 reps"] }; return (protocols[numSets] && protocols[numSets][setIndex]) || "Warm-up"; }
function displayWorkoutTemplate(workoutName, savedState = null) {
    if (!workoutName || !workouts[workoutName]) { showToast(`Workout "${workoutName}" not found.`, 'error'); return; }
    currentWorkoutName = workoutName;
    const workout = workouts[workoutName];
    document.getElementById('workout-select-text').textContent = workoutName;
    workoutSessionBody.innerHTML = '';
    workoutSessionFooter.innerHTML = '';
    workoutSessionTitle.textContent = workoutName;
    workoutSessionBody.innerHTML = workout.map((exercise, exIndex) => { const lastPerformance = findLastExercisePerformance(exercise.name, userHistory); const restInSeconds = parseRestTime(exercise.rest); return `<div class="exercise glass-card" id="exercise-${exIndex}" data-rest="${restInSeconds}"><div class="exercise-header"><div class="exercise-name">${exercise.name}</div><div class="exercise-rest-tag">${exercise.rest}</div></div><div class="sets-container">${Array.from({ length: exercise.warmupSets }, (_, i) => `<div class="set warmup-set"><div class="set-number">W</div><div class="set-details">${getWarmupSetDetails(exercise.warmupSets, i)}</div></div>`).join('')}${Array.from({ length: exercise.workingSets }, (_, i) => { const isLastSet = i === exercise.workingSets - 1; const rpe = isLastSet ? exercise.lastSetRPE : exercise.earlySetRPE; let prevPerformanceText = ""; const prevSet = lastPerformance?.sets?.[i]; if (prevSet) { prevPerformanceText = ` | Last: ${prevSet.weight}lbs for ${prevSet.reps || "Unknown"} reps`; } return `<div class="set" id="set-${exIndex}-${i}"><div class="set-number">${i + 1}</div><input type="number" placeholder="lbs" inputmode="decimal"><input type="number" placeholder="${exercise.reps}" inputmode="numeric"><button class="set-complete-btn"></button><div class="set-details">RPE ${rpe}${prevPerformanceText}</div></div>`; }).join('')}</div></div>`; }).join('');
    if (savedState) { document.querySelectorAll('#workout-session-body .exercise').forEach((exEl, exIndex) => { const savedExercise = savedState.exercises[exIndex]; if (savedExercise) { exEl.querySelectorAll('.set:not(.warmup-set)').forEach((setEl, setIndex) => { const savedSet = savedExercise.sets[setIndex]; if (savedSet) { setEl.querySelectorAll('input')[0].value = savedSet.weight || ''; setEl.querySelectorAll('input')[1].value = savedSet.reps || ''; if (savedSet.completed) setEl.querySelector('.set-complete-btn').classList.add('completed'); } }); } }); }
    const finishBtn = document.createElement('button'); finishBtn.id = 'finish-workout-btn'; finishBtn.className = 'action-btn btn-style-90'; finishBtn.style.cssText = 'background-color: var(--system-blue-muted); color: var(--text-on-action); width: 100%; margin-top: 20px;'; finishBtn.innerHTML = `<span class="btn-text">Finish Workout</span><div class="loader"></div>`; workoutSessionBody.appendChild(finishBtn);
    finishBtn.addEventListener('click', finishWorkout);
    const debouncedAutoSave = debounce(() => saveOngoingWorkoutState(false), 1000);
    document.querySelectorAll('#workout-session-body input').forEach(input => input.addEventListener('input', debouncedAutoSave));
    document.querySelectorAll('.set-complete-btn').forEach(btn => btn.addEventListener('click', (e) => { const button = e.currentTarget; button.classList.toggle('completed'); saveOngoingWorkoutState(false); if (button.classList.contains('completed')) { const restSeconds = parseInt(button.closest('.exercise').dataset.rest, 10); startTimer(restSeconds); } }));
    workoutSessionOverlay.classList.add('active'); ongoingWorkoutBanner.classList.remove('active'); lockBodyScroll();
}
function cancelWorkout() { if (confirm("Are you sure you want to cancel this workout? All progress will be lost.")) { localStorage.removeItem('ongoingWorkout'); workoutSessionOverlay.classList.remove('active'); ongoingWorkoutBanner.classList.remove('active'); workoutSessionBody.innerHTML = ''; workoutSessionFooter.innerHTML = ''; currentWorkoutName = null; document.getElementById('workout-select-text').textContent = 'Select a Specific Workout'; unlockBodyScroll(); showToast('Workout cancelled.'); } }
async function finishWorkout() {
    if (confirm("Are you sure you want to finish this workout? This action cannot be undone.")) {
        if (!currentWorkoutName || !currentUser) return;
        const btn = document.getElementById('finish-workout-btn'); toggleButtonLoading(btn, true);
        const workoutData = { name: currentWorkoutName, date: new Date().toISOString(), exercises: Array.from(document.querySelectorAll('#workout-session-body .exercise')).map(exEl => ({ name: exEl.querySelector('.exercise-name').textContent, sets: Array.from(exEl.querySelectorAll('.set:not(.warmup-set)')).map(setEl => ({ weight: setEl.querySelectorAll('input')[0].value, reps: setEl.querySelectorAll('input')[1].value || 'Unknown' })).filter(set => set.weight) })).filter(ex => ex.sets.length > 0) };
        await saveWorkoutToHistory(workoutData); localStorage.removeItem('ongoingWorkout');
        const totalSets = workoutData.exercises.reduce((acc, ex) => acc + ex.sets.length, 0); const totalVolume = workoutData.exercises.reduce((acc, ex) => acc + ex.sets.reduce((vol, set) => vol + (parseFloat(set.weight) || 0) * (set.reps === 'Unknown' ? 0 : (parseInt(set.reps, 10) || 0)), 0), 0);
        document.getElementById('completion-summary').innerHTML = `Great job! You completed <strong>${totalSets}</strong> sets with a total volume of <strong>${totalVolume.toLocaleString()} lbs</strong>. Your session has been saved.`;
        document.getElementById('workout-complete-overlay').classList.add('active');
        workoutSessionOverlay.classList.remove('active'); ongoingWorkoutBanner.classList.remove('active'); currentWorkoutName = null; document.getElementById('workout-select-text').textContent = 'Select a Specific Workout';
    }
}
function saveOngoingWorkoutState(showNotification = false) { if (!currentWorkoutName) return; const workoutState = { name: currentWorkoutName, exercises: Array.from(document.querySelectorAll('#workout-session-body .exercise')).map(exEl => ({ sets: Array.from(exEl.querySelectorAll('.set:not(.warmup-set)')).map(setEl => { const inputs = setEl.querySelectorAll('input'); const completeBtn = setEl.querySelector('.set-complete-btn'); return { weight: inputs[0].value, reps: inputs[1].value, completed: completeBtn ? completeBtn.classList.contains('completed') : false }; }) })) }; localStorage.setItem('ongoingWorkout', JSON.stringify(workoutState)); if (showNotification) showToast('Workout progress saved!', 'info'); }
function minimizeWorkout() { if (!currentWorkoutName) return; saveOngoingWorkoutState(true); workoutSessionOverlay.classList.remove('active'); ongoingWorkoutNameEl.textContent = currentWorkoutName; ongoingWorkoutBanner.classList.add('active'); unlockBodyScroll(); }
function resumeWorkout() { const savedStateJSON = localStorage.getItem('ongoingWorkout'); if (!savedStateJSON) { showToast("Could not find saved workout data.", "error"); ongoingWorkoutBanner.classList.remove('active'); return; } const savedState = JSON.parse(savedStateJSON); displayWorkoutTemplate(savedState.name, savedState); }
async function saveWorkoutToHistory(workoutData) { if (!currentUser) return; try { await db.collection('users').doc(currentUser.uid).collection('history').add(workoutData); showToast('Workout saved successfully!', 'success'); } catch (error) { showToast('Error saving workout.', 'error'); console.error("Error saving workout:", error); } }
function setupTodaysWorkout() {
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]; const dayKey = dayNames[new Date().getDay()].toLowerCase(); const workoutName = schedule[dayKey] || "Rest Day"; const container = document.getElementById('todays-workout-area'); container.innerHTML = `<h2>Today's Workout</h2>`;
    if (workoutName === "Rest Day") { container.innerHTML += `<div id="todays-workout-card" class="glass-card rest-day"><div class="day-of-week">${dayNames[new Date().getDay()]}</div><div class="workout-name">Rest Day</div></div>`; } else { const cardButton = document.createElement('button'); cardButton.id = 'todays-workout-card'; cardButton.className = 'glass-card'; cardButton.innerHTML = `<div class="day-of-week">${dayNames[new Date().getDay()]}</div><div class="workout-name">${workoutName}</div>`; cardButton.onclick = () => displayWorkoutTemplate(workoutName); container.appendChild(cardButton); }
}
function toggleDropdown(buttonEl, overlayEl) {
    const isActive = overlayEl.classList.contains('active'); document.querySelectorAll('.dropdown-overlay.active').forEach(d => d.classList.remove('active')); if (isActive) return;
    const rect = buttonEl.getBoundingClientRect(); overlayEl.style.left = `${rect.left}px`; overlayEl.style.top = `${rect.bottom + 5}px`; overlayEl.style.width = `${rect.width}px`; overlayEl.classList.add('active'); lockBodyScroll();
}
async function getFullHistory() { if (!currentUser) return; try { const snapshot = await db.collection('users').doc(currentUser.uid).collection('history').orderBy('date', 'desc').limit(50).get(); userHistory = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); } catch (error) { console.error("Error getting full history:", error); } }
function updateAnalyticsCard() {
    const totalWorkoutsEl = document.getElementById('stats-total-workouts'); const lastWorkoutEl = document.getElementById('stats-last-workout'); const statsPreviewEl = document.querySelector('.analytics-stats-preview');
    if (userHistory.length > 0) { totalWorkoutsEl.textContent = userHistory.length; const lastWorkout = userHistory[0]; const lastDate = new Date(lastWorkout.date); lastWorkoutEl.textContent = lastDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); } else { totalWorkoutsEl.textContent = '0'; lastWorkoutEl.textContent = 'N/A'; }
    statsPreviewEl.classList.remove('loading-stats');
}

// --- INITIALIZATION ---
async function initAppForUser(user) {
    currentUser = user;
    if (!currentUser) return;
    const userDoc = await db.collection('users').doc(currentUser.uid).get(); const userData = userDoc.data() || {}; workouts = userData.workouts || {}; schedule = userData.schedule || {};
    const savedStateJSON = localStorage.getItem('ongoingWorkout');
    if (savedStateJSON) { const savedState = JSON.parse(savedStateJSON); currentWorkoutName = savedState.name; ongoingWorkoutNameEl.textContent = currentWorkoutName; ongoingWorkoutBanner.classList.add('active'); } else if (Object.keys(workouts).length === 0 && Object.keys(schedule).length === 0) { document.getElementById('welcome-guide-overlay').classList.add('active'); lockBodyScroll(); }
    await getFullHistory(); setupTodaysWorkout(); updateAnalyticsCard();
    const pickerList = document.getElementById('workout-picker-list'); const pickerOverlay = document.getElementById('workout-picker-overlay'); pickerList.innerHTML = '';
    Object.keys(workouts).forEach(workoutName => { const btn = document.createElement('button'); btn.textContent = workoutName; btn.onclick = () => { displayWorkoutTemplate(workoutName); pickerOverlay.classList.remove('active'); unlockBodyScroll(); }; pickerList.appendChild(btn); });
}

// --- EVENT LISTENERS ---
window.addEventListener('beforeunload', () => { if (currentWorkoutName && workoutSessionOverlay.classList.contains('active')) saveOngoingWorkoutState(false); });
document.getElementById('workout-select-btn').addEventListener('click', (e) => { e.stopPropagation(); toggleDropdown(e.currentTarget, document.getElementById('workout-picker-overlay')); });
document.addEventListener('click', (e) => { const activeDropdown = document.querySelector('.dropdown-overlay.active'); if (activeDropdown && !activeDropdown.contains(e.target)) { activeDropdown.classList.remove('active'); unlockBodyScroll(); } });
document.getElementById('welcome-dismiss-btn').addEventListener('click', () => { document.getElementById('welcome-guide-overlay').classList.remove('active'); unlockBodyScroll(); });
document.getElementById('completion-done-btn').addEventListener('click', () => { document.getElementById('workout-complete-overlay').classList.remove('active'); unlockBodyScroll(); });
if(minimizeWorkoutBtn) minimizeWorkoutBtn.addEventListener('click', minimizeWorkout);
if(resumeWorkoutBtn) resumeWorkoutBtn.addEventListener('click', resumeWorkout);
if(cancelWorkoutBtn) cancelWorkoutBtn.addEventListener('click', cancelWorkout);
document.addEventListener('DOMContentLoaded', () => initializeAuth(initAppForUser));
