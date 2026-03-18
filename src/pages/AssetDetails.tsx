import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useChama } from "@/context/ChamaContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useParams } from "react-router-dom";
import { Asset, AssetValuation, AssetMaintenance } from "@/types";
import { ArrowLeft, TrendingUp, DollarSign, Calendar, MapPin, FileText, Plus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

const AssetDetails = () => {
  const { id } = useParams();
  const { chama } = useChama();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [valuations, setValuations] = useState<AssetValuation[]>([]);
  const [maintenance, setMaintenance] = useState<AssetMaintenance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showValuationDialog, setShowValuationDialog] = useState(false);
  const [showMaintenanceDialog, setShowMaintenanceDialog] = useState(false);

  const getAuthToken = () => localStorage.getItem('accessToken') || localStorage.getItem('token');

  // Valuation form state
  const [valuationForm, setValuationForm] = useState({
    valuationDate: new Date().toISOString().split('T')[0],
    valuationAmount: '',
    valuationMethod: 'market_assessment',
    valuerName: '',
    valuerOrganization: '',
    notes: '',
  });

  // Maintenance form state
  const [maintenanceForm, setMaintenanceForm] = useState({
    maintenanceDate: new Date().toISOString().split('T')[0],
    maintenanceType: 'repair',
    description: '',
    cost: '',
    performedBy: '',
    nextMaintenanceDate: '',
    notes: '',
  });

  const fetchAssetDetails = useCallback(async () => {
    if (!id) {
      return;
    }

    try {
      setIsLoading(true);
      const token = getAuthToken();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/assets/${id}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch asset details');
      }

      const data = await response.json();
      setAsset(data.asset);
      setValuations(data.valuations || []);
      setMaintenance(data.maintenance || []);
    } catch (error) {
      console.error('Error fetching asset details:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch asset details',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAssetDetails();
  }, [fetchAssetDetails]);

  const handleAddValuation = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/assets/${id}/valuations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            valuation_date: valuationForm.valuationDate,
            valuation_amount: parseFloat(valuationForm.valuationAmount),
            valuation_method: valuationForm.valuationMethod,
            valuer_name: valuationForm.valuerName || null,
            valuer_organization: valuationForm.valuerOrganization || null,
            notes: valuationForm.notes || null,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to add valuation');
      }

      toast({
        title: 'Success',
        description: 'Valuation added successfully',
      });

      setShowValuationDialog(false);
      setValuationForm({
        valuationDate: new Date().toISOString().split('T')[0],
        valuationAmount: '',
        valuationMethod: 'market_assessment',
        valuerName: '',
        valuerOrganization: '',
        notes: '',
      });
      fetchAssetDetails();
    } catch (error) {
      console.error('Error adding valuation:', error);
      toast({
        title: 'Error',
        description: 'Failed to add valuation',
        variant: 'destructive',
      });
    }
  };

  const handleAddMaintenance = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/assets/${id}/maintenance`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            maintenance_date: maintenanceForm.maintenanceDate,
            maintenance_type: maintenanceForm.maintenanceType,
            description: maintenanceForm.description,
            cost: maintenanceForm.cost ? parseFloat(maintenanceForm.cost) : 0,
            performed_by: maintenanceForm.performedBy || null,
            next_maintenance_date: maintenanceForm.nextMaintenanceDate || null,
            notes: maintenanceForm.notes || null,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to add maintenance record');
      }

      toast({
        title: 'Success',
        description: 'Maintenance record added successfully',
      });

      setShowMaintenanceDialog(false);
      setMaintenanceForm({
        maintenanceDate: new Date().toISOString().split('T')[0],
        maintenanceType: 'repair',
        description: '',
        cost: '',
        performedBy: '',
        nextMaintenanceDate: '',
        notes: '',
      });
      fetchAssetDetails();
    } catch (error) {
      console.error('Error adding maintenance:', error);
      toast({
        title: 'Error',
        description: 'Failed to add maintenance record',
        variant: 'destructive',
      });
    }
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

  if (isLoading) {
    return (
      <AppLayout title="Asset Details">
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse-subtle">Loading asset details...</div>
        </div>
      </AppLayout>
    );
  }

  if (!asset) {
    return (
      <AppLayout title="Asset Details">
        <div className="text-center py-12">
          <p className="text-gray-500">Asset not found</p>
          <Button
            className="mt-4"
            onClick={() => navigate('/assets')}
          >
            Back to Assets
          </Button>
        </div>
      </AppLayout>
    );
  }

  const appreciation = asset.currentValue - asset.purchaseValue;
  const appreciationPercentage = asset.purchaseValue > 0
    ? ((appreciation / asset.purchaseValue) * 100).toFixed(2)
    : '0.00';

  return (
    <AppLayout title="Asset Details">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/assets')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Assets
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Purchase Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(asset.purchaseValue)}</div>
            <p className="text-xs text-muted-foreground">
              {new Date(asset.purchaseDate).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(asset.currentValue)}</div>
            <p className="text-xs text-muted-foreground">
              Latest valuation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Appreciation</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${appreciation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(appreciation)}
            </div>
            <p className="text-xs text-muted-foreground">
              {appreciationPercentage}% {appreciation >= 0 ? 'gain' : 'loss'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valuations</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{valuations.length}</div>
            <p className="text-xs text-muted-foreground">
              Total valuations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Asset Information */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Asset Information</CardTitle>
          <Badge className={statusLabels[asset.status]?.className}>
            {statusLabels[asset.status]?.label || asset.status}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-2xl font-bold mb-2">{asset.name}</h3>
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <span className="font-medium w-32">Type:</span>
                  <Badge variant="outline">{assetTypeLabels[asset.assetType]}</Badge>
                </div>
                {asset.location && (
                  <div className="flex items-center text-sm">
                    <MapPin className="h-4 w-4 mr-2" />
                    <span className="font-medium w-32">Location:</span>
                    <span>{asset.location}</span>
                  </div>
                )}
                {asset.description && (
                  <div className="text-sm">
                    <span className="font-medium">Description:</span>
                    <p className="mt-1 text-gray-600">{asset.description}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              {asset.titleDeedNumber && (
                <div className="flex items-center text-sm">
                  <span className="font-medium w-40">Title Deed:</span>
                  <span>{asset.titleDeedNumber}</span>
                </div>
              )}
              {asset.landSize && (
                <div className="flex items-center text-sm">
                  <span className="font-medium w-40">Land Size:</span>
                  <span>{asset.landSize} {asset.landUnit}</span>
                </div>
              )}
              {asset.registrationNumber && (
                <div className="flex items-center text-sm">
                  <span className="font-medium w-40">Registration:</span>
                  <span>{asset.registrationNumber}</span>
                </div>
              )}
              {asset.make && (
                <div className="flex items-center text-sm">
                  <span className="font-medium w-40">Make:</span>
                  <span>{asset.make} {asset.model} {asset.year && `(${asset.year})`}</span>
                </div>
              )}
              {asset.serialNumber && (
                <div className="flex items-center text-sm">
                  <span className="font-medium w-40">Serial Number:</span>
                  <span>{asset.serialNumber}</span>
                </div>
              )}
              {asset.notes && (
                <div className="text-sm">
                  <span className="font-medium">Notes:</span>
                  <p className="mt-1 text-gray-600">{asset.notes}</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Valuation History */}
      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Valuation History</CardTitle>
          <Dialog open={showValuationDialog} onOpenChange={setShowValuationDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-chama-purple hover:bg-chama-dark-purple">
                <Plus className="mr-2 h-4 w-4" />
                Add Valuation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record New Valuation</DialogTitle>
                <DialogDescription>
                  Add a new valuation for this asset
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Valuation Date*</Label>
                  <Input
                    type="date"
                    value={valuationForm.valuationDate}
                    onChange={(e) => setValuationForm({ ...valuationForm, valuationDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Valuation Amount (KSh)*</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={valuationForm.valuationAmount}
                    onChange={(e) => setValuationForm({ ...valuationForm, valuationAmount: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Valuation Method*</Label>
                  <Select
                    value={valuationForm.valuationMethod}
                    onValueChange={(value) => setValuationForm({ ...valuationForm, valuationMethod: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="market_assessment">Market Assessment</SelectItem>
                      <SelectItem value="professional_appraisal">Professional Appraisal</SelectItem>
                      <SelectItem value="depreciation">Depreciation</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Valuer Name</Label>
                  <Input
                    value={valuationForm.valuerName}
                    onChange={(e) => setValuationForm({ ...valuationForm, valuerName: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Valuer Organization</Label>
                  <Input
                    value={valuationForm.valuerOrganization}
                    onChange={(e) => setValuationForm({ ...valuationForm, valuerOrganization: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={valuationForm.notes}
                    onChange={(e) => setValuationForm({ ...valuationForm, notes: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowValuationDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddValuation} className="bg-chama-purple hover:bg-chama-dark-purple">
                    Add Valuation
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {valuations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Valuer</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {valuations.map((valuation) => (
                  <TableRow key={valuation.id}>
                    <TableCell>
                      {new Date(valuation.valuationDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(valuation.valuationAmount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {valuation.valuationMethod.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {valuation.valuerName || '-'}
                      {valuation.valuerOrganization && (
                        <div className="text-xs text-muted-foreground">
                          {valuation.valuerOrganization}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{valuation.notes || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-gray-500 py-4">No valuations recorded</p>
          )}
        </CardContent>
      </Card>

      {/* Maintenance History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Maintenance History</CardTitle>
          <Dialog open={showMaintenanceDialog} onOpenChange={setShowMaintenanceDialog}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-chama-purple hover:bg-chama-dark-purple">
                <Plus className="mr-2 h-4 w-4" />
                Add Maintenance
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Maintenance</DialogTitle>
                <DialogDescription>
                  Add a maintenance record for this asset
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Maintenance Date*</Label>
                  <Input
                    type="date"
                    value={maintenanceForm.maintenanceDate}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, maintenanceDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Maintenance Type*</Label>
                  <Select
                    value={maintenanceForm.maintenanceType}
                    onValueChange={(value) => setMaintenanceForm({ ...maintenanceForm, maintenanceType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="repair">Repair</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                      <SelectItem value="inspection">Inspection</SelectItem>
                      <SelectItem value="upgrade">Upgrade</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Description*</Label>
                  <Textarea
                    value={maintenanceForm.description}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Cost (KSh)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={maintenanceForm.cost}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Performed By</Label>
                  <Input
                    value={maintenanceForm.performedBy}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, performedBy: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Next Maintenance Date</Label>
                  <Input
                    type="date"
                    value={maintenanceForm.nextMaintenanceDate}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, nextMaintenanceDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea
                    value={maintenanceForm.notes}
                    onChange={(e) => setMaintenanceForm({ ...maintenanceForm, notes: e.target.value })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowMaintenanceDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddMaintenance} className="bg-chama-purple hover:bg-chama-dark-purple">
                    Add Maintenance
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {maintenance.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead>Performed By</TableHead>
                  <TableHead>Next Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {maintenance.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {new Date(record.maintenanceDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {record.maintenanceType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{record.description}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(record.cost)}
                    </TableCell>
                    <TableCell className="text-sm">{record.performedBy || '-'}</TableCell>
                    <TableCell className="text-sm">
                      {record.nextMaintenanceDate
                        ? new Date(record.nextMaintenanceDate).toLocaleDateString()
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center text-gray-500 py-4">No maintenance records</p>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default AssetDetails;
