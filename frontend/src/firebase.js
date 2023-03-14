import firebase from "firebase/compat/app";
import "firebase/compat/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD1HKDR0j0ozzYjpipu7tlEfpIx0gPbe2k",
  authDomain: "cute-or-not-2ebb3.firebaseapp.com",
  projectId: "cute-or-not-2ebb3",
  storageBucket: "cute-or-not-2ebb3.appspot.com",
  messagingSenderId: "584524942295",
  appId: "1:584524942295:web:0ad566dfa91873bfb81992",
  measurementId: "G-7SE7M25HMC",
};

firebase.initializeApp(firebaseConfig);
export const storage = firebase.storage();
