
import AppLayout from "@/components/layout/AppLayout";
import ContributionsList from "@/components/contributions/ContributionsList";
import { useChama } from "@/context/ChamaContext";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Contributions = () => {
  const { isLoading } = useChama();
  const navigate = useNavigate();
  
  if (isLoading) {
    return (
      <AppLayout title="Contributions">
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse-subtle">Loading contributions...</div>
        </div>
      </AppLayout>
    );
  }
  
  return (
    <AppLayout title="Contributions">
      <div className="mb-4 flex justify-end">
        <Button 
          variant="outline" 
          onClick={() => navigate('/arrears')}
          className="gap-2"
        >
          <AlertCircle className="h-4 w-4" />
          View Arrears
        </Button>
      </div>
      <ContributionsList />
    </AppLayout>
  );
};

export default Contributions;
