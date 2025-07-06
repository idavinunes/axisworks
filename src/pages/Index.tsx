import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Users } from "lucide-react";

const Index = () => {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Funcionários
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <CardDescription>
            Cadastre e gerencie os funcionários da sua equipe.
          </CardDescription>
          <Button asChild className="mt-4">
            <Link to="/employees">Gerenciar Funcionários</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;