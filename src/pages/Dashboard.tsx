
import AppLayout from "@/components/layout/AppLayout";
import DashboardStats from "@/components/dashboard/DashboardStats";
import RecentActivities from "@/components/dashboard/RecentActivities";
import { useChama } from "@/context/ChamaContext";

const Dashboard = () => {
  const { chama, isLoading } = useChama();
  
  if (isLoading) {
    return (
      <AppLayout title="Dashboard">
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse-subtle">Loading dashboard...</div>
        </div>
      </AppLayout>
    );
  }
  
  return (
    <AppLayout title="Dashboard">
      <div className="space-y-8">
        {/* Dashboard stats */}
        <DashboardStats />
        
        {/* Recent activities */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RecentActivities />
          </div>
          
          <div>
            {chama && (
              <div className="bg-white p-5 rounded-lg shadow-sm">
                <h2 className="text-lg font-medium mb-4">About {chama.name}</h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Description</p>
                    <p>{chama.description || "No description available"}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Established</p>
                    <p>{chama.createdAt}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Monthly Contribution</p>
                    <p>KSh {chama.monthlyContributionAmount.toLocaleString()}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500">Contribution Frequency</p>
                    <p>{chama.contributionFrequency}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
