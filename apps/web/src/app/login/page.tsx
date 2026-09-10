import { LoginForm } from './LoginForm';
import { BrandMark } from '@/components/ui/BrandMark';

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-canvas-50 px-4 py-16">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center text-center">
          <BrandMark />
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">BioBoock</h1>
          <p className="mt-1 text-sm text-ink-faint">Bem-vindo(a) de volta à sua jornada.</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
