// js/progress-analytics.js

import { db } from './firebase-config.js';
import { initializeAuth } from './auth.js';
import { showToast, toggleButtonLoading } from './utils.js';

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

// --- GLOBAL STATE ---
let currentUser = null;
let userHistory = [];
let dateToWorkoutIdMap = {};
let progressChart = null;
let calendarDate = new Date();

// --- FUNCTIONS ---
function formatLargeNumber(num) {
    if (num >= 1000000) return parseFloat((num / 1000000).toFixed(1)) + 'M';
    if (num >= 1000) return parseFloat((num / 1000).toFixed(1)) + 'k';
    return num.toLocaleString();
}

function calculateEstimated1RM(weight, reps) {
    const w = parseFloat(weight);
    const r = parseInt(reps, 10);
    if (!w || !r || r < 1 || r > 12) return 0;
    return w * (1 + r / 30);
}

function calculatePR(exerciseName) {
    let bestSet = null;
    let prDate = null;
    let max1RM = 0;
    userHistory.forEach(workout => {
        workout.exercises.forEach(exercise => {
            if (exercise.name === exerciseName) {
                exercise.sets.forEach(set => {
                    const estimated1RM = calculateEstimated1RM(set.weight, set.reps);
                    if (estimated1RM > max1RM) {
                        max1RM = estimated1RM;
                        bestSet = set;
                        prDate = workout.date;
                    }
                });
            }
        });
    });
    return bestSet ? { ...bestSet, date: prDate, estimated1RM: max1RM } : null;
}

function displayPR() {
    const selectedExercise = prExerciseSelect.value;
    if (!selectedExercise) {
        resultArea.innerHTML = '<p class="pr-prompt">Select an exercise to see your personal record.</p>';
    } else {
        const prData = calculatePR(selectedExercise);
        if (prData) {
            const dateString = new Date(prData.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            resultArea.innerHTML = `<p class="pr-result-value">${prData.weight} lbs x ${prData.reps} reps</p><p class="pr-prompt" style="font-size: 1.1rem; color: var(--text-primary);">Est. 1RM: <strong>${Math.round(prData.estimated1RM)} lbs</strong></p><p class="pr-result-date">Achieved on ${dateString}</p>`;
        } else {
            resultArea.innerHTML = `<p class="pr-prompt">No PR found for this exercise.</p>`;
        }
    }
}

function openHistoryModal(workoutId) { /* ... Full function ... */ }
function closeHistoryModal() { /* ... Full function ... */ }

async function deleteWorkoutFromHistory(workoutId) {
    if (!currentUser || !workoutId) return;
    if (confirm("Are you sure you want to permanently delete this workout?")) {
        toggleButtonLoading(modalDeleteBtn, true);
        try {
            await db.collection('users').doc(currentUser.uid).collection('history').doc(workoutId).delete();
            closeHistoryModal();
            await initAnalyticsPage(currentUser);
            showToast("Workout deleted successfully.", "success");
        } catch (error) {
            showToast("Could not delete workout.", "error");
        } finally {
            toggleButtonLoading(modalDeleteBtn, false);
        }
    }
}

function populateHistoryCarousel() { /* ... Full function ... */ }
function renderProgressCharts() { /* ... All Chart.js logic ... */ }
function renderMiniCalendar() { /* ... Full function ... */ }

// --- INITIALIZATION ---
async function initAnalyticsPage(user) {
    currentUser = user;
    if (!currentUser) return;
    const snapshot = await db.collection('users').doc(currentUser.uid).collection('history').orderBy('date', 'desc').get();
    userHistory = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    dateToWorkoutIdMap = userHistory.reduce((acc, workout) => {
        acc[new Date(workout.date).toISOString().split('T')[0]] = workout.id;
        return acc;
    }, {});

    let totalVolume = 0, totalSets = 0;
    const exerciseSet = new Set();
    userHistory.forEach(w => w.exercises.forEach(ex => {
        exerciseSet.add(ex.name);
        ex.sets.forEach(s => {
            totalVolume += (parseFloat(s.weight) || 0) * (parseInt(s.reps, 10) || 0);
            totalSets++;
        });
    }));

    document.getElementById('total-workouts').textContent = userHistory.length;
    document.getElementById('total-volume').textContent = formatLargeNumber(totalVolume);
    document.getElementById('total-sets').textContent = totalSets;

    const exerciseOptionsHTML = '<option value="">-- Choose an exercise --</option>' + 
        Array.from(exerciseSet).sort().map(ex => `<option value="${ex}">${ex}</option>`).join('');
    
    prExerciseSelect.innerHTML = exerciseOptionsHTML;
    chartExerciseSelect.innerHTML = exerciseOptionsHTML;
    
    displayPR();
    renderProgressCharts();
    populateHistoryCarousel();
}

// --- EVENT LISTENERS ---
// ... All event listeners for this page ...

// Kick off the application
document.addEventListener('DOMContentLoaded', () => {
    initializeAuth(initAnalyticsPage);
});
