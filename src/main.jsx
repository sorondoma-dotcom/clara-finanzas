import React from 'react';
import { createRoot } from 'react-dom/client';
import AppRoot from './app/AppRoot';
import './styles/global.css';
import './styles/auth.css';

createRoot(document.getElementById('root')).render(<React.StrictMode><AppRoot /></React.StrictMode>);
