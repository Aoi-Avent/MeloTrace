import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initViewportFix } from './utils/viewport';
import { applyThumbPrefs, loadThumbPrefs } from './utils/thumbPrefs';
import { applyUiPrefs } from './utils/uiMode';

initViewportFix();
applyThumbPrefs(loadThumbPrefs());
applyUiPrefs();

createRoot(document.getElementById('root')!).render(<App />);
