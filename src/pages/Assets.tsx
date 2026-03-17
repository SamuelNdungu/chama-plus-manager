import { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useChama } from "@/context/ChamaContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Package, TrendingUp, DollarSign, PieChart, MapPin, Calendar, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Asset, AssetSummary, AssetsByType } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const Assets = () => {
  const { chama } = useChama();
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [summary, setSummary] = useState<AssetSummary | null>(null);
  const [breakdown, setBreakdown] = useState<AssetsByType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  useEffect(() => {
    if (chama) {
      fetchAssets();
      fetchSummary();
    }
  }, [chama, selectedType, selectedStatus]);

  const fetchAssets = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      let url = `${import.meta.env.VITE_API_URL}/api/assets?chama_id=${chama?.id}`;
      
      if (selectedType !== 'all') {
        url += `&asset_type=${selectedType}`;
      }
      if (selectedStatus !== 'all') {
        url += `&status=${selectedStatus}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch assets');
      }

      const data = await response.json();
      setAssets(data.assets || []);
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/assets/summary/stats?chama_id=${chama?.id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch summary');
      }

      const data = await response.json();
      setSummary(data.summary);
      setBreakdown(data.breakdown || []);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const calculateAppreciation = (purchaseValue: number, currentValue: number) => {
    const change = currentValue - purchaseValue;
    const percentage = purchaseValue > 0 ? ((change / purchaseValue) * 100).toFixed(2) : '0.00';
    return { change, percentage };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const assetTypeLabels: Record<string, string> = {
    land: 'Land',
    vehicle: 'Vehicle',
    building: 'Building',
    equipment: 'Equipment',
    shares: 'Shares',
    business: 'Business',
    other: 'Other',
  };

  const statusLabels: Record<string, { label: string; className: string }> = {
    active: { label: 'Active', className: 'bg-green-100 text-green-800' },
    sold: { label: 'Sold', className: 'bg-blue-100 text-blue-800' },
    damaged: { label: 'Damaged', className: 'bg-red-100 text-red-800' },
    deprecated: { label: 'Deprecated', className: 'bg-gray-100 text-gray-800' },
  };

  if (isLoading && !summary) {
    return (
      <AppLayout title="Assets">
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse-subtle">Loading assets...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Assets">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalAssets || 0}</div>
            <p className="text-xs text-muted-foreground">
              {summary?.activeAssets || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary?.totalCurrentValue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Current market value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appreciation</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(summary?.totalAppreciation || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary && summary.totalPurchaseValue > 0
                ? `${(
                    ((summary.totalAppreciation || 0) / summary.totalPurchaseValue) *
                    100
                  ).toFixed(2)}% gain`
                : '0% gain'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Asset Types</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.assetTypeCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Different categories
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Assets List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Assets Portfolio</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Asset Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="land">Land</SelectItem>
                <SelectItem value="vehicle">Vehicle</SelectItem>
                <SelectItem value="building">Building</SelectItem>
                <SelectItem value="equipment">Equipment</SelectItem>
                <SelectItem value="shares">Shares</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="damaged">Damaged</SelectItem>
                <SelectItem value="deprecated">Deprecated</SelectItem>
              </SelectContent>
            </Select>

            <Button
              size="sm"
              className="bg-chama-purple hover:bg-chama-dark-purple"
              onClick={() => navigate('/assets/add')}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Asset
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {assets.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Purchase Date</TableHead>
                    <TableHead className="text-right">Purchase Value</TableHead>
                    <TableHead className="text-right">Current Value</TableHead>
                    <TableHead className="text-right">Appreciation</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assets.map((asset) => {
                    const { change, percentage } = calculateAppreciation(
                      asset.purchaseValue,
                      asset.currentValue
                    );
                    const isPositive = change >= 0;

                    return (
                      <TableRow key={asset.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{asset.name}</div>
                            {asset.location && (
                              <div className="flex items-center text-xs text-muted-foreground mt-1">
                                <MapPin className="h-3 w-3 mr-1" />
                                {asset.location}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {assetTypeLabels[asset.assetType]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(asset.purchaseDate).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(asset.purchaseValue)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(asset.currentValue)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className={isPositive ? 'text-green-600' : 'text-red-600'}>
                            <div className="font-medium">{formatCurrency(change)}</div>
                            <div className="text-xs">
                              {isPositive ? '+' : ''}{percentage}%
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusLabels[asset.status]?.className}>
                            {statusLabels[asset.status]?.label || asset.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/assets/${asset.id}`)}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No assets found</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by adding your first asset.
              </p>
              <div className="mt-6">
                <Button
                  className="bg-chama-purple hover:bg-chama-dark-purple"
                  onClick={() => navigate('/assets/add')}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Asset
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Asset Type Breakdown */}
      {breakdown.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Portfolio Breakdown by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {breakdown.map((item) => {
                const percentage = summary
                  ? ((item.totalValue / summary.totalCurrentValue) * 100).toFixed(1)
                  : '0.0';

                return (
                  <div key={item.assetType} className="flex items-center">
                    <div className="w-32 text-sm font-medium">
                      {assetTypeLabels[item.assetType]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 mr-4">
                          <div
                            className="bg-chama-purple h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <div className="w-20 text-sm text-right">{percentage}%</div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {item.count} asset{item.count !== 1 ? 's' : ''} • {formatCurrency(item.totalValue)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </AppLayout>
  );
};

export default Assets;
