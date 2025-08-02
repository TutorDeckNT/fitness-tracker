/* js/core.js */

// --- Firebase Configuration ---
const firebaseConfig = {
  apiKey: "AIzaSyDe-YVkiX81ISLhVfRdC0srkkHi2JQQeSs",
  authDomain: "my-fitness-tracker-797e5.firebaseapp.com",
  projectId: "my-fitness-tracker-797e5",
  storageBucket: "my-fitness-tracker-797e5.firebasestorage.app",
  messagingSenderId: "651004817600",
  appId: "1:651004817600:web:3a277ea0126dfe0388bd25"
};

// --- Global App State ---
let currentUser = null;
let auth, db;

// --- Utility Functions ---
function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('exiting');
        toast.addEventListener('animationend', () => toast.remove());
    }, duration);
}

function toggleButtonLoading(btn, isLoading) {
    if (!btn) return;
    btn.classList.toggle('loading', isLoading);
    btn.disabled = isLoading;
}

function lockBodyScroll() {
    document.body.classList.add('has-active-modal');
}

function unlockBodyScroll() {
    setTimeout(() => {
        if (document.querySelectorAll('.modal-overlay.active').length === 0) {
            document.body.classList.remove('has-active-modal');
        }
    }, 100);
}


// --- Core App Initialization ---
function initializeCoreApp() {
    // This check prevents Firebase from being initialized multiple times.
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    auth = firebase.auth();
    db = firebase.firestore();

    auth.onAuthStateChanged(async user => {
        const appContent = document.getElementById('app-content');
        const signInPrompt = document.getElementById('sign-in-prompt');
        const userInfoDiv = document.getElementById('user-info');
        const userPhotoEl = document.getElementById('user-photo');

        if (user) {
            currentUser = user;
            if (userPhotoEl) userPhotoEl.src = user.photoURL;
            if (appContent) appContent.style.display = 'block';
            if (signInPrompt) signInPrompt.style.display = 'none';
            if (userInfoDiv) userInfoDiv.style.display = 'flex';

            // This is the key change: Check for a page-specific init function and run it.
            if (typeof initPageForUser === 'function') {
                initPageForUser();
            }
        } else {
            currentUser = null;
            if (appContent) appContent.style.display = 'none';
            if (signInPrompt) signInPrompt.style.display = 'block';
            if (userInfoDiv) userInfoDiv.style.display = 'none';
        }
    });
}

// --- Start the App ---
// We wrap the initialization in a DOMContentLoaded listener to ensure the DOM is ready.
document.addEventListener('DOMContentLoaded', initializeCoreApp);
