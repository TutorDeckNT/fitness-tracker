import { firebaseConfig } from './firebase-init.js';
import { showToast, toggleButtonLoading } from './utils.js';
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
let currentUser = null;

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

const mainContentWrapper = document.getElementById('main-content-wrapper');
const skeletonLoader = document.getElementById('skeleton-loader');

function getSelectedExercises() {
    return Array.from(exerciseListEl.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.dataset.name);
}

function updateToolbarButtonsState() {
    const selectedCount = getSelectedExercises().length;
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
    let targetName = targetNameSelect.value;

    if (targetName === '__custom__') {
        targetName = customNameInput.value.trim();
    }

    if (!targetName) {
        showToast("The new name cannot be empty.", "error");
        toggleButtonLoading(confirmMergeBtn, false);
        return;
    }
    
    const namesToUpdate = sourceNames.filter(name => name !== targetName);

    try {
        const batch = db.batch();
        const historyRef = db.collection('users').doc(currentUser.uid).collection('history');
        const snapshot = await historyRef.get();

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
        await initPage();

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

    const confirmationMessage = `Are you sure you want to permanently delete all records for the following ${namesToDelete.length} exercise(s)?\n\n- ${namesToDelete.join('\n- ')}\n\nThis action cannot be undone and will modify past workout logs.`;
    if (!confirm(confirmationMessage)) return;

    toggleButtonLoading(deleteBtn, true);

    try {
        const batch = db.batch();
        const historyRef = db.collection('users').doc(currentUser.uid).collection('history');
        const snapshot = await historyRef.get();

        let updatedDocs = 0;
        snapshot.forEach(doc => {
            const workout = doc.data();
            const originalExerciseCount = workout.exercises.length;
            const newExercises = workout.exercises.filter(ex => !namesToDelete.includes(ex.name));

            if (newExercises.length < originalExerciseCount) {
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

        await initPage();

    } catch (error) {
        console.error("Error deleting exercises:", error);
        showToast("An error occurred while deleting.", "error");
    } finally {
        toggleButtonLoading(deleteBtn, false);
    }
}

async function initPage() {
    if (!currentUser) return;
    
    // Show skeleton loader, hide content
    if (skeletonLoader && mainContentWrapper) {
        skeletonLoader.style.display = 'block';
        mainContentWrapper.style.display = 'none';
    }

    const snapshot = await db.collection('users').doc(currentUser.uid).collection('history').orderBy('date', 'desc').get();
    const userHistory = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderExerciseList(userHistory);
    updateToolbarButtonsState();

    // Hide skeleton loader, show content
    if (skeletonLoader && mainContentWrapper) {
        skeletonLoader.style.display = 'none';
        mainContentWrapper.style.display = 'block';
        mainContentWrapper.style.animation = 'fade-in 0.5s ease-out';
    }
}

auth.onAuthStateChanged(async user => {
    currentUser = user;
    const appContent = document.getElementById('app-content');
    const signInPrompt = document.getElementById('sign-in-prompt');
    const userInfoDiv = document.getElementById('user-info');
    if (user) {
        document.getElementById('user-photo').src = user.photoURL;
        appContent.style.display = 'block';
        signInPrompt.style.display = 'none';
        userInfoDiv.style.display = 'flex';
        await initPage();
    } else {
        appContent.style.display = 'none';
        signInPrompt.style.display = 'block';
        userInfoDiv.style.display = 'none';
    }
});

mergeBtn.addEventListener('click', openMergeModal);
deleteBtn.addEventListener('click', handleDelete);
closeModalBtn.addEventListener('click', () => mergeModalOverlay.classList.remove('active'));
targetNameSelect.addEventListener('change', (e) => {
    customNameGroup.style.display = e.target.value === '__custom__' ? 'block' : 'none';
});
confirmMergeBtn.addEventListener('click', handleMerge);
