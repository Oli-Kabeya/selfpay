// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD5pi_TcYFNd-MToREWrknRVoe_DzLilOM",
  authDomain: "selfpay-olivier.firebaseapp.com",
  projectId: "selfpay-olivier",
  storageBucket: "selfpay-olivier.firebasestorage.app",
  messagingSenderId: "711921363351",
  appId: "1:711921363351:web:b70c398ca9216ee3ec7cd2"
};

// Initialisation
const app = initializeApp(firebaseConfig);

// Authentification
export const auth = getAuth(app);

// Firestore
export const db = getFirestore(app);
