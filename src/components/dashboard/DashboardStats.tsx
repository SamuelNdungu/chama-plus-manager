
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useChama } from "@/context/ChamaContext";
import { apiClient } from "@/services/api";
import { Users, DollarSign, TrendingUp, Calendar, AlertCircle, TrendingDown, Wallet } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { InvestmentPortfolio } from "@/types";

interface ArrearsSummary {
  total_members_in_arrears: number;
  total_outstanding: number;
  total_overdue: number;
}

const DashboardStats = () => {
  const { chama, members, contributions, meetings, assets, selectedChama } = useChama();
  const [arrearsSummary, setArrearsSummary] = useState<ArrearsSummary | null>(null);
  const [investmentPortfolio, setInvestmentPortfolio] = useState<InvestmentPortfolio | null>(null);
  const navigate = useNavigate();

  const fetchArrears = useCallback(async () => {
    if (!selectedChama?.id) {
      return;
    }

    try {
      const response = await apiClient.get<{
        data: unknown[];
        summary: ArrearsSummary;
      }>(`/contributions/arrears?chama_id=${selectedChama.id}`);
      setArrearsSummary(response.summary);
    } catch (error) {
      console.error("Error fetching arrears summary:", error);
    }
  }, [selectedChama?.id]);

  const fetchInvestmentPortfolio = useCallback(async () => {
    if (!selectedChama?.id) {
      return;
    }

    try {
      const response = await apiClient.get<InvestmentPortfolio>(
        `/accounts/investments/portfolio?chama_id=${selectedChama.id}`
      );
      setInvestmentPortfolio(response);
    } catch (error) {
      console.error("Error fetching investment portfolio:", error);
    }
  }, [selectedChama?.id]);

  useEffect(() => {
    fetchArrears();
    fetchInvestmentPortfolio();
  }, [fetchArrears, fetchInvestmentPortfolio]);
  
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        
        <Card 
          className="dashboard-stat-card cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/investments')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Investments Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">
                KSh {investmentPortfolio?.totals?.totalCurrentValue?.toLocaleString() || 0}
              </div>
              <div className="p-2 bg-purple-100 rounded-full">
                <Wallet className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            {investmentPortfolio && investmentPortfolio.totals.totalInvestments > 0 && (
              <div className="text-xs text-muted-foreground mt-2">
                {investmentPortfolio.totals.totalInvestments} {investmentPortfolio.totals.totalInvestments === 1 ? 'fund' : 'funds'}
              </div>
            )}
          </CardContent>
        </Card>

        <Card 
          className="dashboard-stat-card cursor-pointer hover:shadow-lg transition-shadow"
          onClick={() => navigate('/investments')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Investment Gain
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className={`text-3xl font-bold ${
                (investmentPortfolio?.totals?.totalGain || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                KSh {investmentPortfolio?.totals?.totalGain?.toLocaleString() || 0}
              </div>
              <div className={`p-2 rounded-full ${
                (investmentPortfolio?.totals?.totalGain || 0) >= 0 ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {(investmentPortfolio?.totals?.totalGain || 0) >= 0 ? (
                  <TrendingUp className="h-6 w-6 text-green-600" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-red-600" />
                )}
              </div>
            </div>
            {investmentPortfolio && investmentPortfolio.totals.totalDeposits > 0 && (
              <div className="text-xs text-muted-foreground mt-2">
                {((investmentPortfolio.totals.totalGain / investmentPortfolio.totals.totalDeposits) * 100).toFixed(2)}% ROI
              </div>
            )}
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
      </div>

      {/* Arrears Section */}
      {arrearsSummary && arrearsSummary.total_members_in_arrears > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card 
            className="dashboard-stat-card border-amber-200 bg-amber-50 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate('/arrears')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-amber-900 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Members with Arrears
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-amber-900">
                  {arrearsSummary.total_members_in_arrears}
                </div>
                <div className="text-sm text-amber-700">
                  of {members.length} members
                </div>
              </div>
              <div className="text-xs text-amber-600 mt-2">
                Click to view details →
              </div>
            </CardContent>
          </Card>

          <Card 
            className="dashboard-stat-card border-red-200 bg-red-50 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate('/arrears')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-900 flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Total Outstanding
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-red-900">
                  KSh {arrearsSummary.total_outstanding.toLocaleString()}
                </div>
              </div>
              <div className="text-sm text-red-700 mt-1">
                Unpaid contributions
              </div>
              <div className="text-xs text-red-600 mt-2">
                Click to view details →
              </div>
            </CardContent>
          </Card>

          <Card 
            className="dashboard-stat-card border-orange-200 bg-orange-50 cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => navigate('/arrears')}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-orange-900 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Overdue Obligations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-orange-900">
                  {arrearsSummary.total_overdue}
                </div>
              </div>
              <div className="text-sm text-orange-700 mt-1">
                Past due contributions
              </div>
              <div className="text-xs text-orange-600 mt-2">
                Click to view details →
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {chama?.fundingGoal && chama.fundingGoal > 0 && (
        <Card className="dashboard-stat-card">
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
