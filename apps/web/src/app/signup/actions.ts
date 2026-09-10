'use server';

import { redirect } from 'next/navigation';
import { apiRegister } from '@/lib/auth/api';
import { setSessionCookies } from '@/lib/auth/session';

export interface SignupState {
  error?: string;
}

// A API já retorna tokens ao registrar (POST /auth/register), então o
// cadastro estabelece sessão imediatamente — sem exigir um login manual
// logo em seguida, que seria um passo redundante. Depois do cadastro, o
// usuário vai para /onboarding (não direto para /biobook), pois ainda não
// tem Profile (ver apps/api/src/modules/profiles) — a Sprint 06 trata
// "conta" e "perfil" como duas coisas distintas, do jeito que a API já modela.
export async function signupAction(_prevState: SignupState | undefined, formData: FormData): Promise<SignupState> {
  const name = String(formData.get('name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const confirmPassword = String(formData.get('confirmPassword') ?? '');

  if (!name || !email || !password) {
    return { error: 'Preencha nome, e-mail e senha.' };
  }
  if (password.length < 8) {
    return { error: 'A senha precisa ter pelo menos 8 caracteres.' };
  }
  if (password !== confirmPassword) {
    return { error: 'As senhas não coincidem.' };
  }

  const result = await apiRegister(email, password, name);
  if (!result.ok) {
    // A API responde 409 para e-mail já cadastrado, com mensagem própria —
    // repassada como está, sem adicionar detalhe extra que ajude a
    // enumerar contas além do que a própria API já decidiu expor.
    return { error: result.error.message };
  }

  await setSessionCookies(result.data.accessToken, result.data.refreshToken, false);
  redirect('/onboarding');
}
