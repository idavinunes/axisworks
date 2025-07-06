import { useSession } from "@/contexts/SessionContext";
import { Nav } from "./Nav";
import { cn } from "@/lib/utils";
import { Briefcase } from "lucide-react";

export function Sidebar({ className }: { className?: string }) {
  const { profile } = useSession();

  return (
    <div className={cn("hidden border-r bg-muted/40 md:block", className)}>
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <a href="/" className="flex items-center gap-2 font-semibold">
            <Briefcase className="h-6 w-6" />
            <span className="">Sistema de Ponto</span>
          </a>
        </div>
        <div className="flex-1 overflow-auto py-2">
          <Nav profile={profile} />
        </div>
      </div>
    </div>
  );
}