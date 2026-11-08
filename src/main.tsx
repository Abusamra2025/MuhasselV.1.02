// تصميم م. أبو أحمد — مصمم ومنفذ Claude — © الحقوق محفوظة
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { installFetchAuth } from './lib/apiAuth';

installFetchAuth();

createRoot(document.getElementById('root')!).render(<App />);
