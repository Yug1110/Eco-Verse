import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAZFrPEGWvIF-kFOEoViGvwIT66xv4QUsA",
  authDomain: "ecovoice-8dff0.firebaseapp.com",
  projectId: "ecovoice-8dff0",
  storageBucket: "ecovoice-8dff0.firebasestorage.app",
  messagingSenderId: "791515364053",
  appId: "1:791515364053:web:faa0f5c693e1bdb619c05c"
};

// 🔹 Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// 🔹 Function for Google Sign-In
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    // Check if user exists in Firestore, if not, create entry
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) {
      await setDoc(userDocRef, {
        name: user.displayName,
        email: user.email,
        total_points: 0,
        achievements: []
      });
    }
    return user;
  } catch (error) {
    console.error("Error signing in:", error);
  }
};

// 🔹 Function for Logout
export const logout = () => {
  signOut(auth);
};

// 🔹 Export Auth & Firestore
export { auth, db };
