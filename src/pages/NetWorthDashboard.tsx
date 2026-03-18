import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useChama } from "@/context/ChamaContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NetWorthSummary } from "@/types";
import { DollarSign, TrendingUp, Wallet, PieChart, Building, Landmark, Coins, CreditCard } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const NetWorthDashboard = () => {
  const { chama } = useChama();
  const [netWorth, setNetWorth] = useState<NetWorthSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNetWorth = useCallback(async () => {
    if (!chama?.id) {
      return;
    }

    try {
      setIsLoading(true);
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/assets/networth?chama_id=${chama.id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch net worth');
      }

      const data = await response.json();
      setNetWorth(data.networth);
    } catch (error) {
      console.error('Error fetching net worth:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch net worth data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [chama?.id]);

  useEffect(() => {
    fetchNetWorth();
  }, [fetchNetWorth]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const calculatePercentage = (part: number, total: number) => {
    if (total === 0) return '0.0';
    return ((part / total) * 100).toFixed(1);
  };

  if (isLoading) {
    return (
      <AppLayout title="Net Worth">
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse-subtle">Loading net worth data...</div>
        </div>
      </AppLayout>
    );
  }

  if (!netWorth) {
    return (
      <AppLayout title="Net Worth">
        <div className="text-center py-12">
          <p className="text-gray-500">Unable to load net worth data</p>
        </div>
      </AppLayout>
    );
  }

  const assets = [
    {
      label: 'Bank Balance',
      value: netWorth.breakdown.bankBalance,
      icon: Wallet,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Loans Outstanding',
      value: netWorth.breakdown.loansOutstanding,
      icon: CreditCard,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Assets Value',
      value: netWorth.breakdown.assetsValue,
      icon: Building,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      label: 'Investments Value',
      value: netWorth.breakdown.investmentsValue,
      icon: TrendingUp,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
  ];

  return (
    <AppLayout title="Net Worth">
      {/* Total Net Worth Card */}
      <Card className="mb-6 border-2 border-chama-purple">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-muted-foreground">Total Net Worth</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-4xl font-bold text-chama-purple">
                {formatCurrency(netWorth.total)}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Total value of all chama assets and investments
              </p>
            </div>
            <div className="hidden md:flex items-center justify-center w-24 h-24 rounded-full bg-chama-purple/10">
              <DollarSign className="h-12 w-12 text-chama-purple" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {assets.map((asset) => {
          const Icon = asset.icon;
          const percentage = calculatePercentage(asset.value, netWorth.total);
          
          return (
            <Card key={asset.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{asset.label}</CardTitle>
                <div className={`p-2 rounded-full ${asset.bgColor}`}>
                  <Icon className={`h-4 w-4 ${asset.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(asset.value)}</div>
                <div className="flex items-center mt-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                    <div
                      className="bg-chama-purple h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{percentage}%</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Breakdown */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Composition Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Net Worth Composition
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {assets.map((asset) => {
                const percentage = calculatePercentage(asset.value, netWorth.total);
                const Icon = asset.icon;
                
                return (
                  <div key={asset.label} className="flex items-center">
                    <div className={`p-2 rounded-lg ${asset.bgColor} mr-3`}>
                      <Icon className={`h-4 w-4 ${asset.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">{asset.label}</span>
                        <span className="text-sm font-bold">{percentage}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${asset.color.replace('text-', 'bg-')}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {formatCurrency(asset.value)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5" />
              Financial Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">Total Contributions</span>
                </div>
                <span className="font-bold">
                  {formatCurrency(netWorth.breakdown.totalContributions)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Liquid Assets</span>
                </div>
                <span className="font-bold text-green-600">
                  {formatCurrency(netWorth.breakdown.bankBalance)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium">Receivables (Loans)</span>
                </div>
                <span className="font-bold text-blue-600">
                  {formatCurrency(netWorth.breakdown.loansOutstanding)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">Fixed Assets</span>
                </div>
                <span className="font-bold text-purple-600">
                  {formatCurrency(netWorth.breakdown.assetsValue)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-amber-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-amber-600" />
                  <span className="text-sm font-medium">Investments</span>
                </div>
                <span className="font-bold text-amber-600">
                  {formatCurrency(netWorth.breakdown.investmentsValue)}
                </span>
              </div>

              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-lg">Total Net Worth</span>
                  <span className="font-bold text-xl text-chama-purple">
                    {formatCurrency(netWorth.total)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights Card */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Financial Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
              <div className="text-sm text-green-800 font-medium mb-1">Liquidity Ratio</div>
              <div className="text-2xl font-bold text-green-900">
                {netWorth.total > 0
                  ? `${((netWorth.breakdown.bankBalance / netWorth.total) * 100).toFixed(1)}%`
                  : '0%'}
              </div>
              <p className="text-xs text-green-700 mt-1">Cash available vs total assets</p>
            </div>

            <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <div className="text-sm text-blue-800 font-medium mb-1">Assets Diversification</div>
              <div className="text-2xl font-bold text-blue-900">
                {assets.filter(a => a.value > 0).length} / 4
              </div>
              <p className="text-xs text-blue-700 mt-1">Active asset categories</p>
            </div>

            <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
              <div className="text-sm text-purple-800 font-medium mb-1">Growth Potential</div>
              <div className="text-2xl font-bold text-purple-900">
                {netWorth.total > 0
                  ? `${(
                      ((netWorth.breakdown.investmentsValue + netWorth.breakdown.assetsValue) /
                        netWorth.total) *
                      100
                    ).toFixed(1)}%`
                  : '0%'}
              </div>
              <p className="text-xs text-purple-700 mt-1">Investment & asset allocation</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default NetWorthDashboard;
