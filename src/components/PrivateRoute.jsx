// src/components/PrivateRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../firebase'; // adapte le chemin selon ta config

const PrivateRoute = ({ children }) => {
  const [user, loading] = useAuthState(auth);

  if (loading) return <div>Chargement...</div>;

  if (!user) {
    return <Navigate to="/Auth" replace />;
  }

  return children;
};

export default PrivateRoute;
