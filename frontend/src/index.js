import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './assets/style.css';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
