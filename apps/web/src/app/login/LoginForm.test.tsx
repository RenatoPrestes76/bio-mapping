import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('./actions', () => ({
  loginAction: vi.fn(async (_prev: unknown, formData: FormData) => {
    const email = formData.get('email');
    if (email === 'blocked@example.com') return { error: 'Conta bloqueada ou inativa' };
    if (email === 'wrong@example.com') return { error: 'Credenciais inválidas' };
    return {};
  }),
}));

import { LoginForm } from './LoginForm';

describe('LoginForm', () => {
  it('renderiza campos de e-mail, senha e o botão de entrar', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText('E-mail')).toBeTruthy();
    expect(screen.getByLabelText('Senha')).toBeTruthy();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeTruthy();
  });

  it('nunca usa type diferente de password no campo de senha (não vaza em texto puro)', () => {
    render(<LoginForm />);
    const passwordInput = screen.getByLabelText('Senha') as HTMLInputElement;
    expect(passwordInput.type).toBe('password');
  });

  it('exibe a mensagem de erro retornada pela action quando a credencial é inválida', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText('E-mail'), 'wrong@example.com');
    await user.type(screen.getByLabelText('Senha'), 'senha-errada');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Credenciais inválidas');
  });

  it('exibe a mensagem de conta bloqueada sem mascarar (achado da Sprint 03, agora visível no Web)', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText('E-mail'), 'blocked@example.com');
    await user.type(screen.getByLabelText('Senha'), 'qualquer');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Conta bloqueada ou inativa');
  });

  it('SPRINT EXTRA: botão mostrar/ocultar alterna o type do campo Senha (padrão oculto)', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const passwordInput = screen.getByLabelText('Senha') as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    await user.click(screen.getByRole('button', { name: 'Mostrar senha' }));
    expect(passwordInput.type).toBe('text');

    await user.click(screen.getByRole('button', { name: 'Ocultar senha' }));
    expect(passwordInput.type).toBe('password');
  });
});
