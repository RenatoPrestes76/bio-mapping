// URL real da API (NestJS). Usado só em código server-side (Server Actions,
// Route Handlers, proxy.ts) — nenhum service client-side toca isso
// diretamente mais; eles chamam /api/proxy/* (mesmo domínio do Web).
//
// Achado (SPRINT EXTRA): `?? 'http://localhost:3000'` não cobre o caso de
// NEXT_PUBLIC_API_URL estar definida como string vazia (`""`) — só cobre
// null/undefined. Uma env var vazia (não ausente) é exatamente o que estava
// configurado em Produção na Vercel, produzindo `API_BASE = "/api/v1"`
// (URL relativa) e um fetch() server-side que falha ao tentar resolver essa
// URL sem host — a causa raiz do login/cadastro quebrados em produção.
const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL;
const apiHost = configuredApiUrl && configuredApiUrl.trim() !== '' ? configuredApiUrl : 'http://localhost:3000';
export const API_BASE = `${apiHost}/api/v1`;

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
