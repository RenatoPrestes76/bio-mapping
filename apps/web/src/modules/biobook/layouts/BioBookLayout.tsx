interface BioBookLayoutProps {
  children: React.ReactNode;
}

export function BioBookLayout({ children }: BioBookLayoutProps) {
  return (
    <main className="min-h-screen bg-canvas-50">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        {children}
      </div>
    </main>
  );
}
