// js/auth.js

import { auth } from './firebase-config.js';
import { toggleContentSkeleton } from './utils.js';

/**
 * Initializes the authentication listener for the application.
 * @param {function} pageInitFunction - The specific function to run when a user is logged in.
 */
export function initializeAuth(pageInitFunction) {
    const appContent = document.getElementById('app-content');
    const signInPrompt = document.getElementById('sign-in-prompt');
    const userInfoDiv = document.getElementById('user-info');
    const userPhoto = document.getElementById('user-photo');
    const userName = document.getElementById('user-name'); // For index.html
    const signInBtn = document.getElementById('sign-in-btn'); // For index.html
    const signOutBtn = document.getElementById('sign-out-btn'); // For index.html

    auth.onAuthStateChanged(async user => {
        if (user) {
            // --- User is signed in ---
            if (userInfoDiv) userInfoDiv.style.display = 'flex';
            if (userPhoto) userPhoto.src = user.photoURL;
            if (userName) userName.textContent = user.displayName;

            if (signInBtn) signInBtn.style.display = 'none';
            if (signOutBtn) signOutBtn.style.display = 'flex';

            if (appContent) appContent.style.display = 'block';
            if (signInPrompt) signInPrompt.style.display = 'none';

            toggleContentSkeleton(true);

            // Call the page-specific initialization function
            if (typeof pageInitFunction === 'function') {
                await pageInitFunction(user);
            }
            
            toggleContentSkeleton(false);

        } else {
            // --- User is signed out ---
            if (userInfoDiv) userInfoDiv.style.display = 'none';
            if (appContent) appContent.style.display = 'none';
            if (signInPrompt) signInPrompt.style.display = 'block';

            if (signInBtn) signInBtn.style.display = 'block';
            if (signOutBtn) signOutBtn.style.display = 'none';
        }
    });

    // Add Google Sign-in provider logic if the button exists
    if (signInBtn) {
        const provider = new firebase.auth.GoogleAuthProvider();
        signInBtn.onclick = () => auth.signInWithPopup(provider).catch(error => {
            console.error("Sign-in error", error);
        });
    }

    // Add Sign-out logic if the button exists
    if (signOutBtn) {
        signOutBtn.onclick = () => auth.signOut();
    }
}
