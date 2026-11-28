import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { ApiRequestError } from '../api/client';
import { loginStaff } from '../api/staff';
import { useSessionStore } from './sessionStore';

function loginMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 401 || error.status === 429) return error.message;
    if (error.status === 400) return Object.values(error.fields ?? {})[0] ?? error.message;
  }
  return "Couldn't reach the server. Check the connection and try again.";
}

export function LoginScreen() {
  const signIn = useSessionStore((state) => state.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const login = useMutation({
    mutationFn: () => loginStaff(email, password),
    onSuccess: signIn,
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!login.isPending) login.mutate();
  };

  return (
    <main className="login">
      <form className="login-card" onSubmit={submit} aria-busy={login.isPending}>
        <h1>Kapé board</h1>
        <p>Sign in to see today's orders.</p>

        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" inputMode="email" required autoFocus />
        </label>

        <label className="field">
          <span>Password</span>
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
        </label>

        {login.isError && (
          <p className="form-error" role="alert">
            {loginMessage(login.error)}
          </p>
        )}

        <button type="submit" className="btn btn-primary btn-big" disabled={login.isPending}>
          {login.isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
