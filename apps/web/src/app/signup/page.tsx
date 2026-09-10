import { SignupForm } from './SignupForm';
import { BrandMark } from '@/components/ui/BrandMark';

export default function SignupPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-canvas-50 px-4 py-16">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center text-center">
          <BrandMark />
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">Comece sua jornada</h1>
          <p className="mt-1 text-sm text-ink-faint">Crie sua conta e acompanhe sua evolução no BioBoock.</p>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}
