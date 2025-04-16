
import AppLayout from "@/components/layout/AppLayout";
import ContributionsList from "@/components/contributions/ContributionsList";
import { useChama } from "@/context/ChamaContext";

const Contributions = () => {
  const { isLoading } = useChama();
  
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
      <ContributionsList />
    </AppLayout>
  );
};

export default Contributions;
