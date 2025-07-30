// src/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyD5pi_TcYFNd-MToREWrknRVoe_DzLilOM",

  authDomain: "selfpay-olivier.firebaseapp.com",

  projectId: "selfpay-olivier",

  storageBucket: "selfpay-olivier.firebasestorage.app",

  messagingSenderId: "711921363351",

  appId: "1:711921363351:web:b70c398ca9216ee3ec7cd2"

};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
