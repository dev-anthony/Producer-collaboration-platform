import React from 'react';

console.log('===== APP.JSX LOADED =====');

function App() {
  console.log('===== APP COMPONENT RENDERING =====');
  
  return (
    <div style={{ padding: '20px', backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      <h1 style={{ color: 'blue' }}>💖 Hello World!</h1>
      <p style={{ fontSize: '18px' }}>Welcome to your Electron + React application.</p>
      <p style={{ color: 'green' }}>If you can see this, React is working!</p>
    </div>
  );
}

export default App;