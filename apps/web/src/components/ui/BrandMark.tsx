// Marca própria do BioBoock: um pulso/folha simples em SVG inline (sem
// dependência de imagem externa, sem estética "AI" — Sprint 07 §25/§13).
export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="20" cy="20" r="20" className="fill-primary-100" />
      <path
        d="M20 30c-5-3.2-9-7.4-9-12.4C11 13.9 13.9 11 17.4 11c1.7 0 3.2.8 4.6 2.3C23.4 11.8 25 11 26.6 11 30.1 11 33 13.9 33 17.6 33 22.6 25 30 20 30z"
        className="fill-primary-600"
      />
      <path
        d="M6 21h4.2l2-4.4 3 8.8 2.4-5.4h1.8"
        stroke="currentColor"
        className="text-primary-700"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
