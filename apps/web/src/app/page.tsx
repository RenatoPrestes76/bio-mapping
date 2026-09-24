import { redirect } from 'next/navigation';

// `/` só é alcançável por quem já está autenticado (proxy.ts redireciona
// visitantes não autenticados para /login antes de chegar aqui). A tela
// /biobook é a experiência principal do app — não faz sentido manter o
// scaffold padrão do Next.js aqui.
export default function RootPage() {
  redirect('/biobook');
}
