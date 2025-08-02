// js/firebase-config.js

// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyDe-YVkiX81ISLhVfRdC0srkkHi2JQQeSs",
  authDomain: "my-fitness-tracker-797e5.firebaseapp.com",
  projectId: "my-fitness-tracker-797e5",
  storageBucket: "my-fitness-tracker-797e5.firebasestorage.app",
  messagingSenderId: "651004817600",
  appId: "1:651004817600:web:3a277ea0126dfe0388bd25"
};

// Initialize Firebase if not already initialized
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Export the auth and firestore instances to be used in other files
export const auth = firebase.auth();
export const db = firebase.firestore();
