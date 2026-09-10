'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { signupAction, type SignupState } from './actions';
import { TextField } from '@/components/ui/TextField';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';

const initialState: SignupState = {};

export function SignupForm() {
  const [state, action, pending] = useActionState(signupAction, initialState);

  return (
    <form action={action} className="w-full max-w-sm space-y-5" noValidate>
      <TextField id="name" name="name" label="Nome" type="text" autoComplete="name" required />
      <TextField id="email" name="email" label="E-mail" type="email" autoComplete="email" required />
      <TextField
        id="password"
        name="password"
        label="Senha"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        hint="Pelo menos 8 caracteres."
      />
      <TextField
        id="confirmPassword"
        name="confirmPassword"
        label="Confirmar senha"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
      />

      {state?.error && <Alert tone="error">{state.error}</Alert>}

      <Button type="submit" pending={pending}>
        {pending ? 'Criando conta…' : 'Criar conta'}
      </Button>

      <p className="text-center text-sm text-ink-faint">
        Já tem conta?{' '}
        <Link href="/login" className="font-semibold text-primary-700 underline-offset-2 hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
