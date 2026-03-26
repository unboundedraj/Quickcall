import { ReactNode } from "react";

interface SectionProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

export default function Section({ children, title, className = "" }: SectionProps) {
  return (
    <section
      className={`rounded-xl border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900/50 p-6 shadow-sm mb-6 last:mb-0 ${className}`}
    >
      {title && (
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 mb-4">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
