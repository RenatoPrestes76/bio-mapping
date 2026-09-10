'use server';

import { redirect } from 'next/navigation';
import { apiLogin, apiLogout } from '@/lib/auth/api';
import { clearSessionCookies, getSessionTokens, setSessionCookies } from '@/lib/auth/session';

export interface LoginState {
  error?: string;
}

// Achado da Sprint 05: nenhuma credencial trafega por localStorage/JS —
// o Server Action roda inteiramente no servidor (Next.js docs: "Server
// Actions always execute on the server, they provide a secure environment
// for handling authentication logic"). O formulário de login só invoca esta
// função; ela chama a API real e grava os tokens em cookies httpOnly.
export async function loginAction(_prevState: LoginState | undefined, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const rememberMe = formData.get('rememberMe') === 'on';

  if (!email || !password) {
    return { error: 'Informe e-mail e senha.' };
  }

  const result = await apiLogin(email, password, rememberMe);
  if (!result.ok) {
    // Mensagens repassadas como a API já as formula (Sprint 03: "Credenciais
    // inválidas" tanto para e-mail inexistente quanto senha errada — não
    // permite enumeração de usuários; "Conta bloqueada ou inativa" para
    // contas BLOCKED/INACTIVE; 429 do rate limit do login).
    return { error: result.error.message };
  }

  await setSessionCookies(result.data.accessToken, result.data.refreshToken, rememberMe);
  redirect('/biobook');
}

export async function logoutAction(): Promise<void> {
  const { refreshToken } = await getSessionTokens();
  if (refreshToken) {
    await apiLogout(refreshToken);
  }
  await clearSessionCookies();
  redirect('/login');
}
