import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, query, where, onSnapshot, updateDoc, deleteDoc, serverTimestamp, orderBy, getDocFromServer } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();

// Connection Test
async function testConnection() {
  try {
    // We use a path that doesn't necessarily exist but we check for connection errors
    await getDocFromServer(doc(db, "_connection_test_", "ping"));
  } catch (error: any) {
    // Only log if it's a connection/config error, not a permission error
    if (error.message?.includes("the client is offline") || error.code === "unavailable") {
      console.error("Firestore connection failed. Please check your Firebase configuration.");
    }
  }
}
testConnection();

export { 
  signInWithPopup, 
  onAuthStateChanged, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  orderBy
};
export type { User };
