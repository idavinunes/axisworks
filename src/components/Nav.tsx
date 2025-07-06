import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { LayoutDashboard, MapPin, Users, BarChart3 } from "lucide-react";
import { Profile } from "@/types";

interface NavProps {
  profile: Profile | null;
  onLinkClick?: () => void; // Para fechar o menu mobile ao navegar
}

const getLinks = (profile: Profile | null) => [
  {
    title: "Painel",
    href: "/",
    icon: LayoutDashboard,
    show: true,
  },
  {
    title: "Locais",
    href: "/locations",
    icon: MapPin,
    show: true,
  },
  {
    title: "Equipe",
    href: "/employees",
    icon: Users,
    show: profile?.role === "admin" || profile?.role === "supervisor",
  },
  {
    title: "Relatórios",
    href: "/reports/users",
    icon: BarChart3,
    show: profile?.role === "admin" || profile?.role === "supervisor",
  },
];

export function Nav({ profile, onLinkClick }: NavProps) {
  const links = getLinks(profile);

  return (
    <nav className="grid items-start gap-1 px-2 text-sm font-medium lg:px-4">
      {links
        .filter(link => link.show)
        .map((link, index) => (
          <NavLink
            key={index}
            to={link.href}
            className={({ isActive }) =>
              cn(
                buttonVariants({ variant: isActive ? "default" : "ghost", size: "sm" }),
                "justify-start"
              )
            }
            onClick={onLinkClick}
          >
            <link.icon className="mr-2 h-4 w-4" />
            {link.title}
          </NavLink>
        ))}
    </nav>
  );
}