import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyABVYdSITk3B0zEBM4TJghdW9BUgCxhHhM",
  authDomain: "sueldo-2b36b.firebaseapp.com",
  projectId: "sueldo-2b36b",
  storageBucket: "sueldo-2b36b.firebasestorage.app",
  messagingSenderId: "767838017532",
  appId: "1:767838017532:web:d7d95a2ca35077cc540479",
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
