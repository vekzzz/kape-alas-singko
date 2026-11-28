import { Board } from './Board';
import { LoginScreen } from './LoginScreen';
import { useSessionStore } from './sessionStore';

export function StaffApp() {
  const signedIn = useSessionStore((state) => state.token !== null);
  return signedIn ? <Board /> : <LoginScreen />;
}
