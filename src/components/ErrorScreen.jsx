import React from 'react';

const ErrorScreen = ({ message }) => {
  return (
    <div style={styles.container}>
      <h2 style={styles.text}>❌ {message}</h2>
    </div>
  );
};

const styles = {
  container: {
    height: '100vh',
    backgroundColor: '#111',
    color: '#fff',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    textAlign: 'center'
  },
  text: {
    fontSize: 20,
    maxWidth: 300,
  }
};

export default ErrorScreen;
