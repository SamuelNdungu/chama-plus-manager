
import AppLayout from "@/components/layout/AppLayout";
import MembersList from "@/components/members/MembersList";
import { useChama } from "@/context/ChamaContext";

const Members = () => {
  const { isLoading } = useChama();
  
  if (isLoading) {
    return (
      <AppLayout title="Members">
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse-subtle">Loading members...</div>
        </div>
      </AppLayout>
    );
  }
  
  return (
    <AppLayout title="Members">
      <MembersList />
    </AppLayout>
  );
};

export default Members;
