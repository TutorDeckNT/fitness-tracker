// js/manage-data.js

import { db } from './firebase-config.js';
import { initializeAuth } from './auth.js';
import { showToast, toggleButtonLoading } from './utils.js';

// --- DOM ELEMENTS ---
const exerciseListEl = document.getElementById('exercise-list');
const mergeBtn = document.getElementById('merge-btn');
const deleteBtn = document.getElementById('delete-btn');
const mergeModalOverlay = document.getElementById('merge-modal-overlay');
const closeModalBtn = document.getElementById('close-merge-modal-btn');
const targetNameSelect = document.getElementById('target-name-select');
const customNameGroup = document.getElementById('custom-name-group');
const customNameInput = document.getElementById('custom-name-input');
const confirmMergeBtn = document.getElementById('confirm-merge-btn');
const mergeSummaryEl = document.getElementById('merge-summary');

// --- GLOBAL STATE ---
let currentUser = null;

// --- FUNCTIONS ---
function getSelectedExercises() {
    return Array.from(exerciseListEl.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.dataset.name);
}

function updateToolbarButtonsState() {
    const selectedCount = getSelectedExercises().length;
    // Don't disable buttons if one is loading
    if (mergeBtn.classList.contains('loading') || deleteBtn.classList.contains('loading')) return;
    
    mergeBtn.disabled = selectedCount < 2;
    deleteBtn.disabled = selectedCount < 1;
}

function renderExerciseList(history) {
    const exerciseCounts = history.reduce((acc, workout) => {
        if (!workout.exercises) return acc;
        workout.exercises.forEach(ex => {
            if (ex.name) {
                const trimmedName = ex.name.trim();
                if (trimmedName) {
                   acc[trimmedName] = (acc[trimmedName] || 0) + 1;
                }
            }
        });
        return acc;
    }, {});
    const sortedExercises = Object.entries(exerciseCounts).sort((a, b) => a[0].toLowerCase().localeCompare(b[0].toLowerCase()));
    if (sortedExercises.length === 0) {
        exerciseListEl.innerHTML = `<p class="empty-list-prompt">No exercises found in your history.</p>`;
        return;
    }
    exerciseListEl.innerHTML = sortedExercises.map(([name, count]) => {
        const idSafeName = name.replace(/[^a-zA-Z0-9]/g, '');
        return `
            <div class="exercise-item">
                <input type="checkbox" data-name="${name}" id="ex-${idSafeName}">
                <label for="ex-${idSafeName}">${name}</label>
                <span>${count}</span>
            </div>
        `
    }).join('');
    exerciseListEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        cb.addEventListener('change', updateToolbarButtonsState);
    });
}

function openMergeModal() {
    const selectedNames = getSelectedExercises();
    if (selectedNames.length < 2) return;
    targetNameSelect.innerHTML = selectedNames.map(name => `<option value="${name}">${name}</option>`).join('') + '<option value="__custom__">-- Custom Name --</option>';
    customNameGroup.style.display = 'none';
    customNameInput.value = '';
    mergeSummaryEl.innerHTML = `This will rename all instances of <strong>${selectedNames.join(', ')}</strong>. This action cannot be undone.`;
    mergeModalOverlay.classList.add('active');
}

async function handleMerge() {
    toggleButtonLoading(confirmMergeBtn, true);
    const sourceNames = getSelectedExercises();
    let targetName = targetNameSelect.value === '__custom__' ? customNameInput.value.trim() : targetNameSelect.value;
    if (!targetName) {
        showToast("The new name cannot be empty.", "error");
        toggleButtonLoading(confirmMergeBtn, false);
        return;
    }
    const namesToUpdate = sourceNames.filter(name => name !== targetName);
    try {
        const batch = db.batch();
        const snapshot = await db.collection('users').doc(currentUser.uid).collection('history').get();
        let updatedDocs = 0;
        snapshot.forEach(doc => {
            const workout = doc.data();
            let needsUpdate = false;
            const newExercises = workout.exercises.map(ex => {
                if (namesToUpdate.includes(ex.name)) {
                    needsUpdate = true;
                    return { ...ex, name: targetName };
                }
                return ex;
            });
            if (needsUpdate) {
                batch.update(doc.ref, { exercises: newExercises });
                updatedDocs++;
            }
        });
        if (updatedDocs > 0) {
            await batch.commit();
            showToast(`Successfully merged exercises and updated ${updatedDocs} workout logs.`, 'success');
        } else {
            showToast("No workouts found that needed updating.", 'info');
        }
        mergeModalOverlay.classList.remove('active');
        await initPage(currentUser);
    } catch (error) {
        console.error("Error merging exercises:", error);
        showToast("An error occurred during the merge.", "error");
    } finally {
        toggleButtonLoading(confirmMergeBtn, false);
    }
}

async function handleDelete() {
    const namesToDelete = getSelectedExercises();
    if (namesToDelete.length === 0) return;
    const confirmationMessage = `Are you sure you want to permanently delete all records for ${namesToDelete.length} exercise(s)?\n- ${namesToDelete.join('\n- ')}\nThis cannot be undone.`;
    if (!confirm(confirmationMessage)) return;
    toggleButtonLoading(deleteBtn, true);
    try {
        const batch = db.batch();
        const snapshot = await db.collection('users').doc(currentUser.uid).collection('history').get();
        let updatedDocs = 0;
        snapshot.forEach(doc => {
            const workout = doc.data();
            const originalCount = workout.exercises.length;
            const newExercises = workout.exercises.filter(ex => !namesToDelete.includes(ex.name));
            if (newExercises.length < originalCount) {
                updatedDocs++;
                batch.update(doc.ref, { exercises: newExercises });
            }
        });
        if (updatedDocs > 0) {
            await batch.commit();
            showToast(`Successfully deleted exercises from ${updatedDocs} workout logs.`, 'success');
        } else {
            showToast("No workouts found containing the selected exercises.", 'info');
        }
        await initPage(currentUser);
    } catch (error) {
        console.error("Error deleting exercises:", error);
        showToast("An error occurred while deleting.", "error");
    } finally {
        toggleButtonLoading(deleteBtn, false);
        updateToolbarButtonsState(); // Re-evaluate after loading finishes
    }
}

// --- INITIALIZATION ---
async function initPage(user) {
    currentUser = user;
    if (!currentUser) return;
    const snapshot = await db.collection('users').doc(currentUser.uid).collection('history').orderBy('date', 'desc').get();
    const userHistory = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderExerciseList(userHistory);
    updateToolbarButtonsState();
}

// --- EVENT LISTENERS ---
mergeBtn.addEventListener('click', openMergeModal);
deleteBtn.addEventListener('click', handleDelete);
closeModalBtn.addEventListener('click', () => mergeModalOverlay.classList.remove('active'));
targetNameSelect.addEventListener('change', (e) => {
    customNameGroup.style.display = e.target.value === '__custom__' ? 'block' : 'none';
});
confirmMergeBtn.addEventListener('click', handleMerge);

// Kick off the application
document.addEventListener('DOMContentLoaded', () => {
    initializeAuth(initPage);
});
