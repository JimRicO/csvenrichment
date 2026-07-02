import { ReactNode } from "react";
import { MermaidDiagram } from "./MermaidDiagram";

interface ModuleSectionProps {
  id: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  diagram: string;
}

export const ModuleSection = ({ id, title, subtitle, children, diagram }: ModuleSectionProps) => {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
      <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 space-y-3">
        {children}
      </div>
      <MermaidDiagram id={id} code={diagram} />
    </section>
  );
};

export default ModuleSection;
