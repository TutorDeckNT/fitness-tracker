// js/edit-workouts.js

import { db } from './firebase-config.js';
import { initializeAuth } from './auth.js';
import { showToast, toggleButtonLoading, lockBodyScroll, unlockBodyScroll } from './utils.js';

// --- DOM ELEMENT GETTERS ---
const editorOverlay = document.getElementById('editor-overlay');
const editorExercisesList = document.getElementById('editor-exercises-list');
const addOptionsOverlay = document.getElementById('add-options-overlay');
const aiTranscribeOverlay = document.getElementById('ai-transcribe-overlay');

// --- GLOBAL STATE ---
let currentUser = null;
let workouts = {};
let schedule = {};
let editingWorkoutName = null;

// --- CORE DATA FUNCTIONS ---
async function fetchData() {
    if (!currentUser) return;
    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    const userData = userDoc.data() || {};
    workouts = userData.workouts || {};
    schedule = userData.schedule || {};
}

async function saveUserData(key, data) {
    if (!currentUser) return;
    try {
        await db.collection('users').doc(currentUser.uid).set({ [key]: data }, { merge: true });
        showToast('Changes saved successfully!', 'success');
    } catch (error) {
        showToast(`Error saving ${key}.`, 'error');
        console.error("Save error:", error);
    }
}

// --- RENDERING FUNCTIONS ---
function renderAll() {
    renderSchedule();
    renderWorkouts();
}

function renderSchedule() {
    const scheduleList = document.getElementById('schedule-list');
    scheduleList.innerHTML = '';
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    days.forEach(day => {
        const dayKey = day.toLowerCase();
        const item = document.createElement('div');
        item.className = 'schedule-item';
        let optionsHTML = '<option value="Rest Day">Rest Day</option>';
        Object.keys(workouts).sort().forEach(workoutName => {
            const selected = schedule[dayKey] === workoutName ? 'selected' : '';
            optionsHTML += `<option value="${workoutName}" ${selected}>${workoutName}</option>`;
        });
        item.innerHTML = `<label for="schedule-${dayKey}">${day}</label><select id="schedule-${dayKey}" data-day="${dayKey}">${optionsHTML}</select>`;
        scheduleList.appendChild(item);
        item.querySelector('select').addEventListener('change', async (e) => {
            schedule[e.target.dataset.day] = e.target.value;
            await saveUserData('schedule', schedule);
        });
    });
}

function renderWorkouts() {
    const workoutsList = document.getElementById('workouts-list');
    workoutsList.innerHTML = '';
    const workoutNames = Object.keys(workouts).sort();
    if (workoutNames.length === 0) {
        workoutsList.innerHTML = `<div class="glass-card" style="padding: 30px; text-align: center; margin-top: 10px;"><p style="margin: 0; color: var(--text-secondary); line-height: 1.5;">You don't have any workout plans yet. <br> Click the '+' button to create one!</p></div>`;
        return;
    }
    workoutNames.forEach(name => {
        const item = document.createElement('div');
        item.className = 'workout-item glass-card';
        item.innerHTML = `<span class="workout-item-name">${name}</span>
            <div class="workout-item-actions">
                <button class="icon-btn options-menu-btn" data-name="${name}" data-type="workout" title="Options">
                    <svg><use xlink:href="#icon-ellipsis-vertical"></use></svg>
                </button>
            </div>`;
        workoutsList.appendChild(item);
    });
}

// --- OPTIONS MENU LOGIC ---
function closeOptionsMenu() {
    const existingMenu = document.getElementById('active-options-menu');
    if (existingMenu) existingMenu.remove();
    document.querySelectorAll('[data-menu-active="true"]').forEach(btn => btn.removeAttribute('data-menu-active'));
}

function openOptionsMenu(button) {
    closeOptionsMenu();
    const menu = document.createElement('div');
    menu.className = 'options-menu-popup glass-card';
    menu.id = 'active-options-menu';
    const name = button.dataset.name;
    menu.innerHTML = `
        <button class="menu-item" data-action="share"><svg class="share-icon-menu"><use xlink:href="#icon-share"></use></svg><span>Share</span></button>
        <button class="menu-item" data-action="edit"><svg class="edit-icon-menu"><use xlink:href="#icon-edit-03"></use></svg><span>Edit</span></button>
        <button class="menu-item delete-item" data-action="delete"><svg class="delete-icon-menu"><use xlink:href="#icon-cancel-circle-sharp"></use></svg><span>Delete</span></button>`;
    button.dataset.menuActive = 'true';
    document.body.appendChild(menu);
    const buttonRect = button.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = `${buttonRect.bottom + 5}px`;
    menu.style.left = `${buttonRect.right - menuRect.width}px`;
    menu.style.zIndex = '2000';
    menu.addEventListener('click', (e) => {
        const actionItem = e.target.closest('.menu-item');
        if (!actionItem) return;
        const action = actionItem.dataset.action;
        if (action === 'edit') openEditor(name);
        else if (action === 'delete') deleteWorkout(name);
        else if (action === 'share') exportSingleWorkout(name);
        closeOptionsMenu();
    });
}

// --- WORKOUT CRUD ---
async function addWorkoutManually() {
    const name = prompt("Enter a name for the new workout plan:");
    if (name && !workouts[name]) {
        workouts[name] = [{ name: "", warmupSets: 0, workingSets: 3, reps: "8-12", rest: "90s", earlySetRPE: "~7", lastSetRPE: "~9" }];
        await saveUserData('workouts', workouts);
        renderAll();
        openEditor(name);
    } else if (name) {
        showToast("A workout with this name already exists.", 'error');
    }
}

async function deleteWorkout(name) {
    if (confirm(`Are you sure you want to delete the workout plan "${name}"?`)) {
        const newWorkouts = { ...workouts };
        delete newWorkouts[name];
        const newSchedule = { ...schedule };
        for (const day in newSchedule) {
            if (newSchedule[day] === name) newSchedule[day] = "Rest Day";
        }
        await db.collection('users').doc(currentUser.uid).update({
            workouts: newWorkouts,
            schedule: newSchedule
        });
        workouts = newWorkouts;
        schedule = newSchedule;
        renderAll();
        showToast('Workout deleted successfully!', 'success');
    }
}

// --- EXERCISE EDITOR ---
function openEditor(name) {
    editingWorkoutName = name;
    const workoutData = workouts[name];
    if (!workoutData) return;
    document.getElementById('editor-title').textContent = `Editing: ${name}`;
    editorExercisesList.innerHTML = '';
    workoutData.forEach((ex, index) => editorExercisesList.appendChild(createExerciseEditorForm(ex, index)));
    editorOverlay.classList.add('active');
    lockBodyScroll();
}

function closeEditor() {
    editorOverlay.classList.remove('active');
    if (document.getElementById('editor-panel').classList.contains('reorder-mode')) {
        toggleReorderMode(false);
    }
    unlockBodyScroll();
}

function createExerciseEditorForm(exercise, index) {
    const div = document.createElement('div');
    div.className = 'editor-exercise glass-card';
    const ex = { ...exercise }; // Create a shallow copy
    div.innerHTML = `
        <div class="editor-exercise-header">
            <h4 class="exercise-title"><span class="exercise-number">Exercise ${index + 1}</span><span class="exercise-name-title">${ex.name || 'New Exercise'}</span></h4>
            <button class="icon-btn delete-exercise-btn" title="Remove Exercise"><svg style="fill: var(--system-red);"><use xlink:href="#icon-close"></use></svg></button>
        </div>
        <div class="editor-exercise-body">
            <div class="editor-form-group"><label>Name</label><input type="text" value="${ex.name || ''}" data-key="name" class="exercise-name-input"></div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div class="editor-form-group"><label>Warmup Sets</label><input type="number" value="${ex.warmupSets || ''}" data-key="warmupSets"></div>
                <div class="editor-form-group"><label>Working Sets</label><input type="number" value="${ex.workingSets || ''}" data-key="workingSets"></div>
                <div class="editor-form-group"><label>Reps</label><input type="text" value="${ex.reps || ''}" data-key="reps"></div>
                <div class="editor-form-group"><label>Rest</label><input type="text" value="${ex.rest || ''}" data-key="rest"></div>
                <div class="editor-form-group"><label>Early RPE</label><input type="text" value="${ex.earlySetRPE || ''}" data-key="earlySetRPE"></div>
                <div class="editor-form-group"><label>Last RPE</label><input type="text" value="${ex.lastSetRPE || ''}" data-key="lastSetRPE"></div>
            </div>
        </div>`;
    div.querySelector('.delete-exercise-btn').addEventListener('click', () => {
        div.remove();
        updateExerciseNumbers();
    });
    const nameInput = div.querySelector('.exercise-name-input');
    nameInput.addEventListener('input', () => {
        div.querySelector('.exercise-name-title').textContent = nameInput.value || 'New Exercise';
    });
    return div;
}

function updateExerciseNumbers() {
    document.querySelectorAll('#editor-exercises-list .editor-exercise').forEach((ex, index) => {
        const numSpan = ex.querySelector('.exercise-number');
        if (numSpan) numSpan.textContent = `Exercise ${index + 1}`;
    });
}

document.getElementById('add-exercise-btn').addEventListener('click', () => {
    const newExercise = { name: "", warmupSets: "", workingSets: "", reps: "", rest: "", earlySetRPE: "", lastSetRPE: "" };
    editorExercisesList.appendChild(createExerciseEditorForm(newExercise, editorExercisesList.children.length));
    editorExercisesList.scrollTop = editorExercisesList.scrollHeight;
});

document.getElementById('save-workouts-btn').addEventListener('click', async () => {
    const btn = document.getElementById('save-workouts-btn');
    toggleButtonLoading(btn, true);
    const newWorkoutData = Array.from(document.querySelectorAll('#editor-exercises-list .editor-exercise')).map(form => {
        const exercise = {};
        form.querySelectorAll('.editor-exercise-body input').forEach(input => {
            exercise[input.dataset.key] = input.type === 'number' ? (parseInt(input.value, 10) || 0) : input.value;
        });
        return exercise;
    });
    try {
        workouts[editingWorkoutName] = newWorkoutData;
        await saveUserData('workouts', workouts);
        renderAll();
        closeEditor();
    } catch (error) {
        showToast("Error saving changes.", "error");
    } finally {
        toggleButtonLoading(btn, false);
    }
});

// --- AI & IMPORT/EXPORT (RESTORED) ---
function getWorkoutAiPrompt() {
    return `You are an expert fitness assistant. Your task is to analyze the provided user file and transcribe it into a structured JSON format. The output MUST be a single, valid JSON array of exercise objects. Your entire response must be only the JSON data. Do not include any text, explanations, or markdown formatting like \`\`\`json outside of the JSON array. Each exercise object in the array must have the following keys: "name", "warmupSets", "workingSets", "reps", "rest", "earlySetRPE", "lastSetRPE".
                        
Warm-up Sets Rule: For the "warmupSets" key, you must provide a single integer representing the *count* of warm-up sets listed for that exercise. For example, if the text says '2 warm-up sets' or lists two separate warm-up lines (e.g., 'Warm-up: 50lbs x 10, 70lbs x 5'), the value for "warmupSets" must be the number 2. If a range is provided (e.g., "1-2 warm-up sets"), you must always choose the lower number in the range (in this case, 1). If no warm-ups are mentioned, the value should be 0.

RPE Handling Rules: If no RPE is mentioned, set both "earlySetRPE" and "lastSetRPE" to an empty string "". If only ONE RPE value is mentioned (e.g., "RPE 8"), set BOTH "earlySetRPE" and "lastSetRPE" to that same value (e.g., "~8"). If two distinct RPEs are mentioned, assign them correctly. If a value is not present, use a sensible default or an empty string. Be intelligent about common abbreviations. Your entire response must be only the JSON data, starting with [ and ending with ].`;
}

document.getElementById('transcribe-btn').addEventListener('click', async () => {
    const apiKey = document.getElementById('gemini-api-key').value;
    const file = document.getElementById('ai-file-input').files[0];
    const planName = document.getElementById('ai-plan-name').value.trim();

    if (!apiKey || !planName || !file) { showToast("Please fill out all AI fields.", "error"); return; }
    if (workouts[planName]) { showToast(`Plan "${planName}" already exists.`, "error"); return; }
    
    const systemPrompt = getWorkoutAiPrompt();
    const btn = document.getElementById('transcribe-btn');
    toggleButtonLoading(btn, true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
        const dataUrl = reader.result;
        const base64Data = dataUrl.substring(dataUrl.indexOf(',') + 1);
        const mimeType = dataUrl.substring(dataUrl.indexOf(':') + 1, dataUrl.indexOf(';'));
        try {
            const requestBody = {
                contents: [{ parts: [{ text: "Analyze the attached workout file and return only the JSON data." }, { inline_data: { mime_type: mimeType, data: base64Data } }] }],
                generationConfig: { temperature: 0 },
                systemInstruction: { parts: [{ text: systemPrompt }] }
            };

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error.message || "API request failed.");
            }
            
            const data = await response.json();
            const rawText = data.candidates[0].content.parts[0].text;
            // Clean the response to get only the JSON part
            const jsonString = rawText.substring(rawText.indexOf('['), rawText.lastIndexOf(']') + 1);
            const resultData = JSON.parse(jsonString);

            workouts[planName] = resultData;
            await saveUserData('workouts', workouts);
            showToast(`Successfully added "${planName}"!`, 'success');
            
            renderAll();
            aiTranscribeOverlay.classList.remove('active');
            unlockBodyScroll();

        } catch (error) {
            showToast(`AI Error: ${error.message}`, 'error');
            console.error("AI Transcription Error:", error);
        } finally {
            toggleButtonLoading(btn, false);
        }
    };
    reader.onerror = () => {
        showToast("Error reading the file.", "error");
        toggleButtonLoading(btn, false);
    };
});

function exportSingleWorkout(name) {
    if (!workouts[name]) return;
    const workoutToExport = { [name]: workouts[name] };
    const dataStr = JSON.stringify(workoutToExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workout_${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported "${name}" successfully!`, "success");
}

async function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            workouts = { ...workouts, ...importedData };
            await saveUserData('workouts', workouts);
            renderAll();
            showToast(`Workouts imported successfully!`, "success");
        } catch (error) {
            showToast(`Import failed: ${error.message}`, "error");
        } finally {
            event.target.value = '';
        }
    };
    reader.readAsText(file);
}

// --- REORDER LOGIC ---
const editorPanel = document.getElementById('editor-panel');
const reorderBtn = document.getElementById('reorder-exercises-btn');
const doneReorderingBtn = document.getElementById('done-reordering-btn');
let draggableItem = null;

function toggleReorderMode(enable) {
    editorPanel.classList.toggle('reorder-mode', enable);
    // Add logic here to enable/disable SortableJS or other drag-drop library
}

reorderBtn.addEventListener('click', () => toggleReorderMode(true));
doneReorderingBtn.addEventListener('click', () => toggleReorderMode(false));
// Note: The detailed reorder functions (dragStart, etc.) were removed for this example, 
// as a library like SortableJS is recommended for robust drag-and-drop.

// --- INITIALIZATION ---
async function initPageForUser(user) {
    currentUser = user;
    await fetchData();
    renderAll();
}

// --- EVENT LISTENERS ---
document.addEventListener('click', (e) => {
    const optionsBtn = e.target.closest('.options-menu-btn');
    if (optionsBtn) {
        e.stopPropagation();
        if (optionsBtn.dataset.menuActive === 'true') closeOptionsMenu();
        else openOptionsMenu(optionsBtn);
    } else if (document.getElementById('active-options-menu')) {
        closeOptionsMenu();
    }
});
document.getElementById('show-add-options-btn').addEventListener('click', () => { addOptionsOverlay.classList.add('active'); lockBodyScroll(); });
document.getElementById('close-add-options-btn').addEventListener('click', () => { addOptionsOverlay.classList.remove('active'); unlockBodyScroll(); });
document.getElementById('add-manual-btn').addEventListener('click', () => { addOptionsOverlay.classList.remove('active'); unlockBodyScroll(); addWorkoutManually(); });
document.getElementById('import-from-file-btn').addEventListener('click', () => { addOptionsOverlay.classList.remove('active'); unlockBodyScroll(); document.getElementById('import-file-input').click(); });
document.getElementById('open-ai-transcribe-btn').addEventListener('click', () => { addOptionsOverlay.classList.remove('active'); aiTranscribeOverlay.classList.add('active'); lockBodyScroll(); });
document.getElementById('close-ai-transcribe-btn').addEventListener('click', () => { aiTranscribeOverlay.classList.remove('active'); unlockBodyScroll(); });
document.getElementById('import-file-input').addEventListener('change', (e) => handleFileImport(e));
document.getElementById('close-editor-btn').addEventListener('click', closeEditor);

// Kick off the application
document.addEventListener('DOMContentLoaded', () => {
    initializeAuth(initPageForUser);
});
