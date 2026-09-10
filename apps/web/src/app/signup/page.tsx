import { SignupForm } from './SignupForm';

export default function SignupPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-zinc-950">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Criar conta</h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Comece a usar o BioBoock.</p>
        </div>
        <SignupForm />
      </div>
    </div>
  );
}
