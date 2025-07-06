import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, ArrowUp } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: number;
  changeDescription?: string;
}

const StatCard = ({ title, value, icon, change, changeDescription = "em relação ao mês passado" }: StatCardProps) => {
  const isIncrease = change !== undefined && change >= 0;
  const isDecrease = change !== undefined && change < 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <p className="text-xs text-muted-foreground flex items-center">
            <span className={`flex items-center mr-1 ${isIncrease ? 'text-green-500' : 'text-red-500'}`}>
              {isIncrease && <ArrowUp className="h-4 w-4" />}
              {isDecrease && <ArrowDown className="h-4 w-4" />}
              {Math.abs(change).toFixed(1)}%
            </span>
            {changeDescription}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;