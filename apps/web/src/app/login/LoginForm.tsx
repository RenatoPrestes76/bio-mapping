'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { loginAction, type LoginState } from './actions';
import { TextField } from '@/components/ui/TextField';
import { PasswordField } from '@/components/ui/PasswordField';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';

const initialState: LoginState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initialState);

  return (
    <form action={action} className="w-full max-w-sm space-y-5" noValidate>
      <TextField id="email" name="email" label="E-mail" type="email" autoComplete="email" required />
      <PasswordField id="password" name="password" label="Senha" autoComplete="current-password" required />

      <div className="flex items-center gap-2">
        <input
          id="rememberMe"
          name="rememberMe"
          type="checkbox"
          className="h-4 w-4 rounded border-line-strong text-primary-600 focus:ring-primary-500"
        />
        <label htmlFor="rememberMe" className="text-sm text-ink-soft">
          Manter conectado por 90 dias
        </label>
      </div>

      {state?.error && <Alert tone="error">{state.error}</Alert>}

      <Button type="submit" pending={pending}>
        {pending ? 'Entrando…' : 'Entrar'}
      </Button>

      <p className="text-center text-sm text-ink-faint">
        Não tem conta?{' '}
        <Link href="/signup" className="font-semibold text-primary-700 underline-offset-2 hover:underline">
          Criar conta
        </Link>
      </p>
    </form>
  );
}
