import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initViewportFix } from './utils/viewport';
import { applyThumbPrefs, loadThumbPrefs } from './utils/thumbPrefs';
import { applyUiPrefs } from './utils/uiMode';
import { initNative } from './utils/nativeInit';

initViewportFix();
applyThumbPrefs(loadThumbPrefs());
applyUiPrefs();
initNative();

createRoot(document.getElementById('root')!).render(<App />);
