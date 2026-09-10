import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockApiRegister = vi.fn();
const mockSetSessionCookies = vi.fn();
const mockRedirect = vi.fn((path: string) => {
  throw new Error(`NEXT_REDIRECT:${path}`);
});

vi.mock('@/lib/auth/api', () => ({
  apiRegister: (...args: unknown[]) => mockApiRegister(...args),
}));

vi.mock('@/lib/auth/session', () => ({
  setSessionCookies: (...args: unknown[]) => mockSetSessionCookies(...args),
}));

vi.mock('next/navigation', () => ({
  redirect: (path: string) => mockRedirect(path),
}));

import { signupAction } from './actions';

function formDataOf(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe('signupAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('retorna erro quando faltam campos obrigatórios, sem chamar a API', async () => {
    const result = await signupAction(undefined, formDataOf({ name: '', email: '', password: '' }));
    expect(result.error).toBeTruthy();
    expect(mockApiRegister).not.toHaveBeenCalled();
  });

  it('rejeita senha com menos de 8 caracteres antes de chamar a API', async () => {
    const result = await signupAction(
      undefined,
      formDataOf({ name: 'Jane', email: 'jane@example.com', password: '123', confirmPassword: '123' }),
    );
    expect(result.error).toMatch(/8 caracteres/);
    expect(mockApiRegister).not.toHaveBeenCalled();
  });

  it('rejeita quando a confirmação de senha diverge, sem chamar a API', async () => {
    const result = await signupAction(
      undefined,
      formDataOf({ name: 'Jane', email: 'jane@example.com', password: 'S3nhaForte!', confirmPassword: 'outra-senha' }),
    );
    expect(result.error).toMatch(/não coincidem/);
    expect(mockApiRegister).not.toHaveBeenCalled();
  });

  it('SECURITY: repassa a mensagem de e-mail já cadastrado da API sem mascarar nem criar sessão', async () => {
    mockApiRegister.mockResolvedValue({ ok: false, error: { status: 409, message: 'E-mail já cadastrado' } });
    const result = await signupAction(
      undefined,
      formDataOf({ name: 'Jane', email: 'jane@example.com', password: 'S3nhaForte!', confirmPassword: 'S3nhaForte!' }),
    );
    expect(result.error).toBe('E-mail já cadastrado');
    expect(mockSetSessionCookies).not.toHaveBeenCalled();
  });

  it('em sucesso, grava a sessão e redireciona para /onboarding (não direto para a aplicação)', async () => {
    mockApiRegister.mockResolvedValue({
      ok: true,
      data: { user: { id: 'u1' }, accessToken: 'at', refreshToken: 'rt' },
    });

    await expect(
      signupAction(
        undefined,
        formDataOf({ name: 'Jane', email: 'jane@example.com', password: 'S3nhaForte!', confirmPassword: 'S3nhaForte!' }),
      ),
    ).rejects.toThrow('NEXT_REDIRECT:/onboarding');

    expect(mockApiRegister).toHaveBeenCalledWith('jane@example.com', 'S3nhaForte!', 'Jane');
    expect(mockSetSessionCookies).toHaveBeenCalledWith('at', 'rt', false);
  });
});
