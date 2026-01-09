import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface CollapsibleCardProps {
  children: React.ReactNode;
  header: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
}

export const CollapsibleCard = ({
  children,
  header,
  defaultOpen = true,
  className,
  headerClassName,
  contentClassName,
}: CollapsibleCardProps) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <div
            className={cn(
              "cursor-pointer select-none transition-colors hover:bg-secondary/30",
              headerClassName
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">{header}</div>
              <ChevronDown
                className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform duration-200 mr-4",
                  isOpen && "rotate-180"
                )}
              />
            </div>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent className={cn("data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down", contentClassName)}>
          {children}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
