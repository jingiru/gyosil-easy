import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from './lib/api.js';
import ClassroomScreen from './screens/ClassroomScreen.jsx';
import LandingScreen from './screens/LandingScreen.jsx';
import TeacherScreen from './screens/TeacherScreen.jsx';

const environmentRoom = import.meta.env.VITE_DEFAULT_ROOM || 'classroom-1';

function currentRoute() {
  return window.location.hash.slice(1).split('?')[0] || '/';
}

export default function App() {
  const [route, setRoute] = useState(currentRoute);
  const [config, setConfig] = useState(null);
  const [configError, setConfigError] = useState('');

  const loadConfig = useCallback(async () => {
    try {
      const value = await apiRequest('/api/config');
      setConfig(value);
      setConfigError('');
    } catch (error) {
      setConfigError(error.message);
    }
  }, []);

  useEffect(() => {
    loadConfig();
    function handleHashChange() {
      setRoute(currentRoute());
    }
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [loadConfig]);

  const room = config?.defaultRoom || environmentRoom;

  if (!config) {
    return (
      <main className="startup-screen">
        <div className="startup-card">
          <div className="startup-logo">교실이지</div>
          {configError ? (
            <>
              <h1>중앙 서버에 연결할 수 없습니다.</h1>
              <p>{configError}</p>
              <button className="button primary" type="button" onClick={loadConfig}>다시 연결</button>
            </>
          ) : (
            <><div className="loader" /><p>중앙 서버에 연결하고 있습니다…</p></>
          )}
        </div>
      </main>
    );
  }

  if (route === '/teacher') {
    return <TeacherScreen config={config} room={room} />;
  }
  if (route === '/classroom') {
    return <ClassroomScreen room={room} />;
  }
  return <LandingScreen />;
}
