console.log('===== INDEX.JSX STARTED =====');

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';



const rootElement = document.getElementById('root');

if (rootElement) {
  const root = createRoot(rootElement);
  
  root.render(<App />);
} else {
  console.error('===== ROOT ELEMENT NOT FOUND =====');
}