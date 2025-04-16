
import AppLayout from "@/components/layout/AppLayout";
import MeetingsList from "@/components/meetings/MeetingsList";
import { useChama } from "@/context/ChamaContext";

const Meetings = () => {
  const { isLoading } = useChama();
  
  if (isLoading) {
    return (
      <AppLayout title="Meetings">
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse-subtle">Loading meetings...</div>
        </div>
      </AppLayout>
    );
  }
  
  return (
    <AppLayout title="Meetings">
      <MeetingsList />
    </AppLayout>
  );
};

export default Meetings;
