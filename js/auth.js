// js/auth.js
import { auth } from './firebase-config.js';
import { toggleContentSkeleton } from './utils.js';

export function initializeAuth(pageInitFunction) {
    const appContent = document.getElementById('app-content');
    const signInPrompt = document.getElementById('sign-in-prompt');
    const userInfoDiv = document.getElementById('user-info');
    const userPhoto = document.getElementById('user-photo');
    const userName = document.getElementById('user-name');
    const signInBtn = document.getElementById('sign-in-btn');
    const signOutBtn = document.getElementById('sign-out-btn');

    auth.onAuthStateChanged(async user => {
        if (user) {
            if (userInfoDiv) userInfoDiv.style.display = 'flex';
            if (userPhoto) userPhoto.src = user.photoURL;
            if (userName) userName.textContent = user.displayName;
            if (signInBtn) signInBtn.style.display = 'none';
            if (signOutBtn) signOutBtn.style.display = 'flex';
            if (appContent) appContent.style.display = 'block';
            if (signInPrompt) signInPrompt.style.display = 'none';
            toggleContentSkeleton(true);
            if (typeof pageInitFunction === 'function') {
                await pageInitFunction(user); // CRITICAL FIX: Pass user object
            }
            toggleContentSkeleton(false);
        } else {
            if (userInfoDiv) userInfoDiv.style.display = 'none';
            if (appContent) appContent.style.display = 'none';
            if (signInPrompt) signInPrompt.style.display = 'block';
            if (signInBtn) signInBtn.style.display = 'block';
            if (signOutBtn) signOutBtn.style.display = 'none';
        }
    });

    if (signInBtn) {
        const provider = new firebase.auth.GoogleAuthProvider();
        signInBtn.onclick = () => auth.signInWithPopup(provider).catch(console.error);
    }
    if (signOutBtn) {
        signOutBtn.onclick = () => auth.signOut();
    }
}
