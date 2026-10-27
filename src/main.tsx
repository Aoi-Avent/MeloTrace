import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initViewportFix } from './utils/viewport';

initViewportFix();

createRoot(document.getElementById('root')!).render(<App />);
