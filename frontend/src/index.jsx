console.log('===== INDEX.JSX STARTED =====');

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

console.log('===== REACT IMPORTS DONE =====');

const rootElement = document.getElementById('root');
console.log('===== ROOT ELEMENT =====', rootElement);

if (rootElement) {
  const root = createRoot(rootElement);
  console.log('===== CREATEROOT DONE =====');
  
  root.render(<App />);
  console.log('===== APP RENDERED =====');
} else {
  console.error('===== ROOT ELEMENT NOT FOUND =====');
}