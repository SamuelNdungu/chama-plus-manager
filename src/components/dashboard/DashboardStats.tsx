
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useChama } from "@/context/ChamaContext";
import { Users, DollarSign, TrendingUp, Calendar } from "lucide-react";

const DashboardStats = () => {
  const { chama, members, contributions, meetings, assets } = useChama();
  
  // Calculate total paid contributions
  const totalPaid = contributions
    .filter(c => c.status === 'Paid')
    .reduce((acc, curr) => acc + curr.amount, 0);
  
  // Calculate progress percentage towards funding goal
  const progressPercentage = chama?.fundingGoal 
    ? Math.min(Math.round((totalPaid / chama.fundingGoal) * 100), 100)
    : 0;
  
  // Get next meeting
  const upcomingMeetings = meetings
    .filter(m => new Date(m.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const nextMeeting = upcomingMeetings.length > 0 ? upcomingMeetings[0] : null;
  
  // Calculate total assets value
  const totalAssetsValue = assets.reduce((acc, curr) => acc + curr.currentValue, 0);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="dashboard-stat-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">{members.length}</div>
            <div className="p-2 bg-chama-light-purple bg-opacity-30 rounded-full">
              <Users className="h-6 w-6 text-chama-purple" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="dashboard-stat-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Bank Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">
              KSh {chama?.bankBalance?.toLocaleString() || 0}
            </div>
            <div className="p-2 bg-green-100 rounded-full">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="dashboard-stat-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Assets Value
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="text-3xl font-bold">
              KSh {totalAssetsValue.toLocaleString()}
            </div>
            <div className="p-2 bg-blue-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="dashboard-stat-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Next Meeting
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              {nextMeeting ? (
                <div>
                  <div className="text-lg font-medium">{nextMeeting.date}</div>
                  <div className="text-sm text-muted-foreground">{nextMeeting.time}</div>
                </div>
              ) : (
                <div className="text-lg">No upcoming meetings</div>
              )}
            </div>
            <div className="p-2 bg-orange-100 rounded-full">
              <Calendar className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {chama?.fundingGoal && chama.fundingGoal > 0 && (
        <Card className="dashboard-stat-card md:col-span-2 lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Funding Goal Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  KSh {totalPaid.toLocaleString()} of KSh {chama.fundingGoal.toLocaleString()}
                </span>
                <span className="text-sm font-medium">{progressPercentage}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DashboardStats;
