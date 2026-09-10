// URL real da API (NestJS). Usado só em código server-side (Server Actions,
// Route Handlers, proxy.ts) — nenhum service client-side toca isso
// diretamente mais; eles chamam /api/proxy/* (mesmo domínio do Web).
export const API_BASE = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'}/api/v1`;

// Nomes dos cookies httpOnly que guardam a sessão real emitida pela API.
// Nunca lidos por JS client-side — só Server Actions/Route Handlers/proxy.
export const ACCESS_TOKEN_COOKIE = 'bb_at';
export const REFRESH_TOKEN_COOKIE = 'bb_rt';
// "1"/"0" — lembra a escolha de rememberMe do login para que a renovação
// silenciosa (ver app/api/proxy/[...path]/route.ts) mantenha a mesma duração
// de sessão que o usuário escolheu, em vez de sempre assumir o padrão curto.
export const REMEMBER_ME_COOKIE = 'bb_rm';

// Espelha ACCESS_TOKEN_TTL da API (apps/api/src/modules/identity/auth/auth.constants.ts).
export const ACCESS_TOKEN_MAX_AGE_SECONDS = 15 * 60;
export const REFRESH_TOKEN_MAX_AGE_SECONDS_DEFAULT = 30 * 24 * 60 * 60;
export const REFRESH_TOKEN_MAX_AGE_SECONDS_REMEMBER_ME = 90 * 24 * 60 * 60;
