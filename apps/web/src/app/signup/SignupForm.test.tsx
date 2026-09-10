import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('./actions', () => ({
  signupAction: vi.fn(async (_prev: unknown, formData: FormData) => {
    if (formData.get('email') === 'taken@example.com') return { error: 'E-mail já cadastrado' };
    return {};
  }),
}));

import { SignupForm } from './SignupForm';

describe('SignupForm', () => {
  it('renderiza nome, e-mail, senha, confirmação e o botão de criar conta', () => {
    render(<SignupForm />);
    expect(screen.getByLabelText('Nome')).toBeTruthy();
    expect(screen.getByLabelText('E-mail')).toBeTruthy();
    expect(screen.getByLabelText('Senha')).toBeTruthy();
    expect(screen.getByLabelText('Confirmar senha')).toBeTruthy();
    expect(screen.getByRole('button', { name: /criar conta/i })).toBeTruthy();
  });

  it('nunca usa type diferente de password nos campos de senha', () => {
    render(<SignupForm />);
    expect((screen.getByLabelText('Senha') as HTMLInputElement).type).toBe('password');
    expect((screen.getByLabelText('Confirmar senha') as HTMLInputElement).type).toBe('password');
  });

  it('exibe um link para a tela de login', () => {
    render(<SignupForm />);
    expect(screen.getByRole('link', { name: /entrar/i })).toBeTruthy();
  });

  it('exibe a mensagem de erro retornada pela action (e-mail já cadastrado)', async () => {
    const user = userEvent.setup();
    render(<SignupForm />);

    await user.type(screen.getByLabelText('Nome'), 'Jane');
    await user.type(screen.getByLabelText('E-mail'), 'taken@example.com');
    await user.type(screen.getByLabelText('Senha'), 'S3nhaForte!');
    await user.type(screen.getByLabelText('Confirmar senha'), 'S3nhaForte!');
    await user.click(screen.getByRole('button', { name: /criar conta/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail já cadastrado');
  });
});
