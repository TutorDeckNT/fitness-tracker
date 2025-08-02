// js/edit-workouts.js
import { db } from './firebase-config.js';
import { initializeAuth } from './auth.js';
import { showToast, toggleButtonLoading, lockBodyScroll, unlockBodyScroll } from './utils.js';

// --- GLOBAL STATE ---
let currentUser, workouts = {}, schedule = {}, editingWorkoutName = null;
let draggableItem = null, pointerStart = { x: 0, y: 0 }, itemsCache = [], ITEMS_GAP = 15;

// --- DOM ELEMENTS ---
const editorOverlay = document.getElementById('editor-overlay');
const editorExercisesList = document.getElementById('editor-exercises-list');
const addOptionsOverlay = document.getElementById('add-options-overlay');
const aiTranscribeOverlay = document.getElementById('ai-transcribe-overlay');
const editorPanel = document.getElementById('editor-panel');
const reorderBtn = document.getElementById('reorder-exercises-btn');
const doneReorderingBtn = document.getElementById('done-reordering-btn');

// --- DATA FUNCTIONS ---
async function fetchData() { if (!currentUser) return; const userDoc = await db.collection('users').doc(currentUser.uid).get(); const userData = userDoc.data() || {}; workouts = userData.workouts || {}; schedule = userData.schedule || {}; }
async function saveUserData(key, data) { if (!currentUser) return; try { await db.collection('users').doc(currentUser.uid).set({ [key]: data }, { merge: true }); showToast('Changes saved successfully!', 'success'); } catch (error) { showToast(`Error saving ${key}.`, 'error'); console.error(error); } }

// --- RENDER FUNCTIONS ---
function renderAll() { renderSchedule(); renderWorkouts(); }
function renderSchedule() {
    const scheduleList = document.getElementById('schedule-list'); scheduleList.innerHTML = ''; const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    days.forEach(day => { const dayKey = day.toLowerCase(); const item = document.createElement('div'); item.className = 'schedule-item'; let optionsHTML = '<option value="Rest Day">Rest Day</option>'; Object.keys(workouts).sort().forEach(workoutName => { optionsHTML += `<option value="${workoutName}" ${schedule[dayKey] === workoutName ? 'selected' : ''}>${workoutName}</option>`; }); item.innerHTML = `<label for="schedule-${dayKey}">${day}</label><select id="schedule-${dayKey}" data-day="${dayKey}">${optionsHTML}</select>`; scheduleList.appendChild(item); item.querySelector('select').addEventListener('change', async (e) => { schedule[e.target.dataset.day] = e.target.value; await saveUserData('schedule', schedule); }); });
}
function renderWorkouts() {
    const workoutsList = document.getElementById('workouts-list'); workoutsList.innerHTML = ''; const workoutNames = Object.keys(workouts).sort();
    if (workoutNames.length === 0) { workoutsList.innerHTML = `<div class="glass-card" style="padding: 30px; text-align: center; margin-top: 10px;"><p style="margin: 0; color: var(--text-secondary); line-height: 1.5;">You don't have any workout plans yet. <br> Click the '+' button to create one!</p></div>`; return; }
    workoutNames.forEach(name => { const item = document.createElement('div'); item.className = 'workout-item glass-card'; item.innerHTML = `<span class="workout-item-name">${name}</span><div class="workout-item-actions"><button class="icon-btn options-menu-btn" data-name="${name}" data-type="workout" title="Options"><svg><use xlink:href="#icon-ellipsis-vertical"></use></svg></button></div>`; workoutsList.appendChild(item); });
}

// --- OPTIONS MENU LOGIC ---
function closeOptionsMenu() { const existingMenu = document.getElementById('active-options-menu'); if (existingMenu) existingMenu.remove(); document.querySelectorAll('[data-menu-active="true"]').forEach(btn => btn.removeAttribute('data-menu-active')); }
function openOptionsMenu(button) {
    closeOptionsMenu(); const menu = document.createElement('div'); menu.className = 'options-menu-popup glass-card'; menu.id = 'active-options-menu'; const name = button.dataset.name;
    menu.innerHTML = `<button class="menu-item" data-action="share"><svg class="share-icon-menu"><use xlink:href="#icon-share"></use></svg><span>Share</span></button><button class="menu-item" data-action="edit"><svg class="edit-icon-menu"><use xlink:href="#icon-edit-03"></use></svg><span>Edit</span></button><button class="menu-item delete-item" data-action="delete"><svg class="delete-icon-menu"><use xlink:href="#icon-cancel-circle-sharp"></use></svg><span>Delete</span></button>`;
    button.dataset.menuActive = 'true'; document.body.appendChild(menu); const buttonRect = button.getBoundingClientRect(); const menuRect = menu.getBoundingClientRect();
    menu.style.position = 'fixed'; menu.style.top = `${buttonRect.bottom + 5}px`; menu.style.left = `${buttonRect.right - menuRect.width}px`;
    menu.addEventListener('click', (e) => { const actionItem = e.target.closest('.menu-item'); if (!actionItem) return; const action = actionItem.dataset.action; if (action === 'edit') openEditor(name); else if (action === 'delete') deleteWorkout(name); else if (action === 'share') exportSingleWorkout(name); closeOptionsMenu(); });
}

// --- WORKOUT CRUD ---
async function addWorkoutManually() { const name = prompt("Enter a name for the new workout plan:"); if (name && !workouts[name]) { workouts[name] = [{ name: "", warmupSets: 0, workingSets: 3, reps: "8-12", rest: "90s", earlySetRPE: "~7", lastSetRPE: "~9" }]; await saveUserData('workouts', workouts); renderAll(); openEditor(name); } else if (name) { showToast("A workout with this name already exists.", 'error'); } }
async function deleteWorkout(name) { if (confirm(`Are you sure you want to delete the workout plan "${name}"?`)) { const newWorkouts = { ...workouts }; delete newWorkouts[name]; const newSchedule = { ...schedule }; for (const day in newSchedule) { if (newSchedule[day] === name) newSchedule[day] = "Rest Day"; } await db.collection('users').doc(currentUser.uid).update({ workouts: newWorkouts, schedule: newSchedule }); workouts = newWorkouts; schedule = newSchedule; renderAll(); showToast('Workout deleted successfully!', 'success'); } }

// --- EXERCISE EDITOR ---
function openEditor(name) { editingWorkoutName = name; const workoutData = workouts[name]; if (!workoutData) return; document.getElementById('editor-title').textContent = `Editing: ${name}`; editorExercisesList.innerHTML = ''; workoutData.forEach((ex, index) => editorExercisesList.appendChild(createExerciseEditorForm(ex, index))); editorOverlay.classList.add('active'); lockBodyScroll(); }
function closeEditor() { editorOverlay.classList.remove('active'); if (editorPanel.classList.contains('reorder-mode')) toggleReorderMode(false); unlockBodyScroll(); }
function createExerciseEditorForm(exercise, index) {
    const div = document.createElement('div'); div.className = 'editor-exercise glass-card'; const ex = { ...exercise };
    div.innerHTML = `<div class="editor-exercise-header"><h4 class="exercise-title"><span class="exercise-number">Exercise ${index + 1}</span><span class="exercise-name-title">${ex.name || 'New Exercise'}</span></h4><button class="icon-btn delete-exercise-btn" title="Remove Exercise"><svg style="fill: var(--system-red);"><use xlink:href="#icon-close"></use></svg></button></div><div class="editor-exercise-body"><div class="editor-form-group"><label>Name</label><input type="text" value="${ex.name || ''}" data-key="name" class="exercise-name-input"></div><div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;"><div class="editor-form-group"><label>Warmup Sets</label><input type="number" value="${ex.warmupSets || ''}" data-key="warmupSets"></div><div class="editor-form-group"><label>Working Sets</label><input type="number" value="${ex.workingSets || ''}" data-key="workingSets"></div><div class="editor-form-group"><label>Reps</label><input type="text" value="${ex.reps || ''}" data-key="reps"></div><div class="editor-form-group"><label>Rest</label><input type="text" value="${ex.rest || ''}" data-key="rest"></div><div class="editor-form-group"><label>Early RPE</label><input type="text" value="${ex.earlySetRPE || ''}" data-key="earlySetRPE"></div><div class="editor-form-group"><label>Last RPE</label><input type="text" value="${ex.lastSetRPE || ''}" data-key="lastSetRPE"></div></div></div>`;
    div.querySelector('.delete-exercise-btn').addEventListener('click', () => { div.remove(); updateExerciseNumbers(); });
    const nameInput = div.querySelector('.exercise-name-input'); nameInput.addEventListener('input', () => { div.querySelector('.exercise-name-title').textContent = nameInput.value || 'New Exercise'; });
    return div;
}
function updateExerciseNumbers() { document.querySelectorAll('#editor-exercises-list .editor-exercise').forEach((ex, index) => { const numSpan = ex.querySelector('.exercise-number'); if (numSpan) numSpan.textContent = `Exercise ${index + 1}`; }); }
document.getElementById('add-exercise-btn').addEventListener('click', () => { const newExercise = { name: "", warmupSets: "", workingSets: "", reps: "", rest: "", earlySetRPE: "", lastSetRPE: "" }; editorExercisesList.appendChild(createExerciseEditorForm(newExercise, editorExercisesList.children.length)); editorExercisesList.scrollTop = editorExercisesList.scrollHeight; });
document.getElementById('save-workouts-btn').addEventListener('click', async () => {
    const btn = document.getElementById('save-workouts-btn'); toggleButtonLoading(btn, true);
    const newWorkoutData = Array.from(document.querySelectorAll('#editor-exercises-list .editor-exercise')).map(form => { const exercise = {}; form.querySelectorAll('.editor-exercise-body input').forEach(input => { exercise[input.dataset.key] = input.type === 'number' ? (parseInt(input.value, 10) || 0) : input.value; }); return exercise; });
    try { workouts[editingWorkoutName] = newWorkoutData; await saveUserData('workouts', workouts); renderAll(); closeEditor(); } catch (error) { showToast("Error saving changes.", "error"); } finally { toggleButtonLoading(btn, false); }
});

// --- AI & IMPORT/EXPORT ---
function getWorkoutAiPrompt() { return `You are an expert fitness assistant...`; } // The full prompt is here
document.getElementById('transcribe-btn').addEventListener('click', async () => {
    const apiKey = document.getElementById('gemini-api-key').value, file = document.getElementById('ai-file-input').files[0], planName = document.getElementById('ai-plan-name').value.trim();
    if (!apiKey || !planName || !file) { showToast("Please fill out all AI fields.", "error"); return; } if (workouts[planName]) { showToast(`Plan "${planName}" already exists.`, "error"); return; }
    const systemPrompt = getWorkoutAiPrompt(), btn = document.getElementById('transcribe-btn'); toggleButtonLoading(btn, true); const reader = new FileReader(); reader.readAsDataURL(file);
    reader.onload = async () => {
        const dataUrl = reader.result, base64Data = dataUrl.substring(dataUrl.indexOf(',') + 1), mimeType = dataUrl.substring(dataUrl.indexOf(':') + 1, dataUrl.indexOf(';'));
        try {
            const requestBody = { contents: [{ parts: [{ text: "Analyze the attached workout file and return only the JSON data." }, { inline_data: { mime_type: mimeType, data: base64Data } }] }], generationConfig: { temperature: 0 }, systemInstruction: { parts: [{ text: systemPrompt }] } };
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) });
            if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.error.message || "API request failed."); }
            const data = await response.json(), rawText = data.candidates[0].content.parts[0].text; const jsonString = rawText.substring(rawText.indexOf('['), rawText.lastIndexOf(']') + 1); const resultData = JSON.parse(jsonString);
            workouts[planName] = resultData; await saveUserData('workouts', workouts); showToast(`Successfully added "${planName}"!`, 'success'); renderAll(); aiTranscribeOverlay.classList.remove('active'); unlockBodyScroll();
        } catch (error) { showToast(`AI Error: ${error.message}`, 'error'); console.error("AI Transcription Error:", error); } finally { toggleButtonLoading(btn, false); }
    };
    reader.onerror = () => { showToast("Error reading the file.", "error"); toggleButtonLoading(btn, false); };
});
function exportSingleWorkout(name) { if (!workouts[name]) return; const workoutToExport = { [name]: workouts[name] }; const dataStr = JSON.stringify(workoutToExport, null, 2); const dataBlob = new Blob([dataStr], { type: "application/json" }); const url = URL.createObjectURL(dataBlob); const a = document.createElement('a'); a.href = url; a.download = `workout_${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); showToast(`Exported "${name}" successfully!`, "success"); }
async function handleFileImport(event) { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = async (e) => { try { const importedData = JSON.parse(e.target.result); workouts = { ...workouts, ...importedData }; await saveUserData('workouts', workouts); renderAll(); showToast(`Workouts imported successfully!`, "success"); } catch (error) { showToast(`Import failed: ${error.message}`, "error"); } finally { event.target.value = ''; } }; reader.readAsText(file); }

// --- REORDER LOGIC ---
function toggleReorderMode(enable) { editorPanel.classList.toggle('reorder-mode', enable); }
function dragStart(e) { if (!editorPanel.classList.contains('reorder-mode')) return; draggableItem = e.target.closest('.editor-exercise'); if (!draggableItem) return; e.preventDefault(); pointerStart.x = e.clientX || e.touches[0].clientX; pointerStart.y = e.clientY || e.touches[0].clientY; draggableItem.classList.add('is-draggable'); itemsCache = Array.from(editorExercisesList.children); const draggableIndex = itemsCache.indexOf(draggableItem); itemsCache.forEach((item, index) => { if (item === draggableItem) return; item.classList.add('is-idle'); if (index < draggableIndex) item.dataset.isAbove = ''; }); document.addEventListener('mousemove', drag); document.addEventListener('touchmove', drag, { passive: false }); document.addEventListener('mouseup', dragEnd); document.addEventListener('touchend', dragEnd); }
function drag(e) { if (!draggableItem) return; e.preventDefault(); const currentX = e.clientX || e.touches[0].clientX; const currentY = e.clientY || e.touches[0].clientY; const pointerOffset = { x: currentX - pointerStart.x, y: currentY - pointerStart.y }; draggableItem.style.transform = `translate(${pointerOffset.x}px, ${pointerOffset.y}px)`; updateIdleItemsStateAndPosition(); }
function dragEnd() { if (!draggableItem) return; applyNewItemsOrder(); cleanup(); }
function cleanup() { itemsCache.forEach(item => { item.classList.remove('is-draggable', 'is-idle'); delete item.dataset.isAbove; delete item.dataset.isToggled; item.style.transform = ''; }); draggableItem = null; itemsCache = []; document.removeEventListener('mousemove', drag); document.removeEventListener('touchmove', drag); document.removeEventListener('mouseup', dragEnd); document.removeEventListener('touchend', dragEnd); updateExerciseNumbers(); }
function updateIdleItemsStateAndPosition() { const draggableRect = draggableItem.getBoundingClientRect(); const draggableCenterY = draggableRect.top + draggableRect.height / 2; itemsCache.forEach(item => { if (item === draggableItem) return; const itemRect = item.getBoundingClientRect(); const itemCenterY = itemRect.top + itemRect.height / 2; if (item.hasAttribute('data-is-above')) { if (draggableCenterY <= itemCenterY) item.dataset.isToggled = ''; else delete item.dataset.isToggled; } else { if (draggableCenterY >= itemCenterY) item.dataset.isToggled = ''; else delete item.dataset.isToggled; } }); itemsCache.forEach(item => { if (item === draggableItem) return; if (item.hasAttribute('data-is-toggled')) { const direction = item.hasAttribute('data-is-above') ? 1 : -1; item.style.transform = `translateY(${direction * (draggableRect.height + ITEMS_GAP)}px)`; } else { item.style.transform = ''; } }); }
function applyNewItemsOrder() { const reorderedItems = []; itemsCache.forEach((item, index) => { if (item === draggableItem) return; if (!item.hasAttribute('data-is-toggled')) { reorderedItems[index] = item; return; } const newIndex = item.hasAttribute('data-is-above') ? index + 1 : index - 1; reorderedItems[newIndex] = item; }); for (let i = 0; i < itemsCache.length; i++) { if (typeof reorderedItems[i] === 'undefined') { reorderedItems[i] = draggableItem; break; } } reorderedItems.forEach(item => editorExercisesList.appendChild(item)); }

// --- INITIALIZATION ---
async function initPageForUser(user) { currentUser = user; await fetchData(); renderAll(); }
document.addEventListener('DOMContentLoaded', () => initializeAuth(initPageForUser));

// --- EVENT LISTENERS ---
document.addEventListener('click', (e) => { const optionsBtn = e.target.closest('.options-menu-btn'); if (optionsBtn) { e.stopPropagation(); if (optionsBtn.dataset.menuActive === 'true') closeOptionsMenu(); else openOptionsMenu(optionsBtn); } else if (document.getElementById('active-options-menu')) { closeOptionsMenu(); } });
document.getElementById('show-add-options-btn').addEventListener('click', () => { addOptionsOverlay.classList.add('active'); lockBodyScroll(); });
document.getElementById('close-add-options-btn').addEventListener('click', () => { addOptionsOverlay.classList.remove('active'); unlockBodyScroll(); });
document.getElementById('add-manual-btn').addEventListener('click', () => { addOptionsOverlay.classList.remove('active'); unlockBodyScroll(); addWorkoutManually(); });
document.getElementById('import-from-file-btn').addEventListener('click', () => { addOptionsOverlay.classList.remove('active'); unlockBodyScroll(); document.getElementById('import-file-input').click(); });
document.getElementById('open-ai-transcribe-btn').addEventListener('click', () => { addOptionsOverlay.classList.remove('active'); aiTranscribeOverlay.classList.add('active'); lockBodyScroll(); });
document.getElementById('close-ai-transcribe-btn').addEventListener('click', () => { aiTranscribeOverlay.classList.remove('active'); unlockBodyScroll(); });
document.getElementById('import-file-input').addEventListener('change', handleFileImport);
document.getElementById('close-editor-btn').addEventListener('click', closeEditor);
reorderBtn.addEventListener('click', () => toggleReorderMode(true));
doneReorderingBtn.addEventListener('click', () => toggleReorderMode(false));
editorExercisesList.addEventListener('mousedown', dragStart);
editorExercisesList.addEventListener('touchstart', dragStart, { passive: false });
