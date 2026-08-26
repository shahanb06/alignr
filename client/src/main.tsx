import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import Landing from './landing/Landing';
import './index.css';

/**
 * Minimal hash router: the marketing landing page is the default view, and the
 * resume-tailoring app lives at #/app. This keeps both surfaces reachable
 * without pulling in a routing dependency.
 */
function Root() {
  const [isApp, setIsApp] = useState(() => window.location.hash.startsWith('#/app'));

  useEffect(() => {
    const onHashChange = () => setIsApp(window.location.hash.startsWith('#/app'));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return isApp ? <App /> : <Landing />;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
