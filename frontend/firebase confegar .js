// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAquDdsHNU3xObAkbL8_aGMrNuvPTYq3ug",
  authDomain: "college-transport-manage-546dc.firebaseapp.com",
  projectId: "college-transport-manage-546dc",
  storageBucket: "college-transport-manage-546dc.firebasestorage.app",
  messagingSenderId: "342341327341",
  appId: "1:342341327341:web:d9ce13a3044c5b7a51afe4",
  measurementId: "G-SFYF0HY525"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);