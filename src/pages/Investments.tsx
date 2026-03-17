import { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useChama } from "@/context/ChamaContext";
import { apiClient } from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, TrendingDown, Plus, DollarSign, Percent, Building2, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import type { FinancialAccount, InvestmentPortfolio } from "@/types";

const Investments = () => {
  const { chama: selectedChama, isLoading: chamaLoading } = useChama();
  const { toast } = useToast();
  
  const [portfolio, setPortfolio] = useState<InvestmentPortfolio | null>(null);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [showRecordMovement, setShowRecordMovement] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<FinancialAccount | null>(null);
  
  const [newAccount, setNewAccount] = useState({
    name: "",
    type: "investment" as const,
    institutionName: "",
    description: ""
  });
  
  const [newMovement, setNewMovement] = useState({
    movementType: "deposit" as "deposit" | "withdrawal" | "interest" | "fee",
    amount: "",
    description: "",
    movementDate: format(new Date(), "yyyy-MM-dd"),
    referenceNumber: ""
  });

  useEffect(() => {
    if (selectedChama) {
      fetchPortfolio();
      fetchAccounts();
    }
  }, [selectedChama]);

  const fetchPortfolio = async () => {
    if (!selectedChama) return;
    
    try {
      setIsLoading(true);
      const response = await apiClient.get<{ investments: any[], totals: any }>(
        `/accounts/investments/portfolio?chama_id=${selectedChama.id}`
      );
      setPortfolio(response);
      setError(null);
    } catch (err: any) {
      console.error('Portfolio fetch error:', err);
      setError(err.message || 'Failed to load investment portfolio');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAccounts = async () => {
    if (!selectedChama) return;
    
    try {
      const response = await apiClient.get<{ accounts: FinancialAccount[] }>(
        `/accounts?chama_id=${selectedChama.id}`
      );
      setAccounts(response.accounts.filter(acc => acc.type === 'investment'));
    } catch (err: any) {
      console.error('Accounts fetch error:', err);
    }
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChama) return;

    try {
      await apiClient.post('/accounts', {
        chama_id: selectedChama.id,
        ...newAccount
      });

      toast({
        title: "Success",
        description: "Investment account created successfully",
      });

      setShowCreateAccount(false);
      setNewAccount({
        name: "",
        type: "investment",
        institutionName: "",
        description: ""
      });
      
      fetchPortfolio();
      fetchAccounts();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to create account",
        variant: "destructive",
      });
    }
  };

  const handleRecordMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChama || !selectedAccount) return;

    try {
      await apiClient.post(`/accounts/${selectedAccount.id}/movements`, {
        chama_id: selectedChama.id,
        ...newMovement,
        amount: parseFloat(newMovement.amount)
      });

      toast({
        title: "Success",
        description: "Movement recorded successfully",
      });

      setShowRecordMovement(false);
      setSelectedAccount(null);
      setNewMovement({
        movementType: "deposit",
        amount: "",
        description: "",
        movementDate: format(new Date(), "yyyy-MM-dd"),
        referenceNumber: ""
      });
      
      fetchPortfolio();
      fetchAccounts();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to record movement",
        variant: "destructive",
      });
    }
  };

  if (!selectedChama) {
    return (
      <AppLayout title="Investments">
        <Alert>
          <AlertDescription>
            Please select a chama to view investment portfolio.
          </AlertDescription>
        </Alert>
      </AppLayout>
    );
  }

  if (isLoading || chamaLoading) {
    return (
      <AppLayout title="Investments">
        <div className="flex items-center justify-center h-64">
          <div className="animate-pulse">Loading investments...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Investments">
      <div className="space-y-6">
        {/* Summary Cards */}
        {portfolio && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Investments</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{portfolio.totals.totalInvestments}</div>
                <p className="text-xs text-muted-foreground">Active funds</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Deposits</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  KES {portfolio.totals.totalDeposits.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Capital invested</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Value</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  KES {portfolio.totals.totalCurrentValue.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Portfolio value</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Gain</CardTitle>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${portfolio.totals.totalGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  KES {portfolio.totals.totalGain.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  {portfolio.totals.totalDeposits > 0 
                    ? `${((portfolio.totals.totalGain / portfolio.totals.totalDeposits) * 100).toFixed(2)}% return`
                    : 'No returns yet'}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Portfolio Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Investment Portfolio</CardTitle>
              <CardDescription>Track your chama's investments and returns</CardDescription>
            </div>
            <Dialog open={showCreateAccount} onOpenChange={setShowCreateAccount}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Investment
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Investment Account</DialogTitle>
                  <DialogDescription>
                    Add a new investment account (e.g., Money Market Fund)
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateAccount} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Fund Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Mansa X Fund"
                      value={newAccount.name}
                      onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="institution">Institution</Label>
                    <Input
                      id="institution"
                      placeholder="e.g., Mansa Capital"
                      value={newAccount.institutionName}
                      onChange={(e) => setNewAccount({ ...newAccount, institutionName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Optional notes about this investment"
                      value={newAccount.description}
                      onChange={(e) => setNewAccount({ ...newAccount, description: e.target.value })}
                    />
                  </div>
                  <Button type="submit" className="w-full">Create Account</Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {portfolio && portfolio.investments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fund Name</TableHead>
                    <TableHead>Institution</TableHead>
                    <TableHead className="text-right">Deposits</TableHead>
                    <TableHead className="text-right">Current Value</TableHead>
                    <TableHead className="text-right">Interest</TableHead>
                    <TableHead className="text-right">Gain/Loss</TableHead>
                    <TableHead className="text-right">ROI</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {portfolio.investments.map((investment) => (
                    <TableRow key={investment.id}>
                      <TableCell className="font-medium">{investment.name}</TableCell>
                      <TableCell>{investment.institution || '-'}</TableCell>
                      <TableCell className="text-right">
                        KES {investment.depositsTotal.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        KES {investment.currentBalance.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        +{investment.interestEarned.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={investment.totalGain >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {investment.totalGain >= 0 ? '+' : ''}{investment.totalGain.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={parseFloat(investment.roiPercentage) >= 0 ? "default" : "destructive"}>
                          {investment.roiPercentage}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Dialog open={showRecordMovement && selectedAccount?.id === investment.id.toString()}
                                onOpenChange={(open) => {
                                  setShowRecordMovement(open);
                                  if (!open) setSelectedAccount(null);
                                }}>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
onClick={() => {
                                const account = accounts.find(a => a.id === investment.id.toString());
                                setSelectedAccount(account || null);
                                setShowRecordMovement(true);
                              }}
                            >
                              Record
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Record Movement</DialogTitle>
                              <DialogDescription>
                                Record a deposit, withdrawal, interest gain, or fee for {investment.name}
                              </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={handleRecordMovement} className="space-y-4">
                              <div>
                                <Label htmlFor="movementType">Transaction Type</Label>
                                <Select
                                  value={newMovement.movementType}
                                  onValueChange={(value: any) => setNewMovement({ ...newMovement, movementType: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="deposit">
                                      <div className="flex items-center">
                                        <ArrowUpRight className="h-4 w-4 mr-2 text-green-600" />
                                        Deposit
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="withdrawal">
                                      <div className="flex items-center">
                                        <ArrowDownRight className="h-4 w-4 mr-2 text-red-600" />
                                        Withdrawal
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="interest">
                                      <div className="flex items-center">
                                        <TrendingUp className="h-4 w-4 mr-2 text-blue-600" />
                                        Interest Gain
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="fee">
                                      <div className="flex items-center">
                                        <TrendingDown className="h-4 w-4 mr-2 text-orange-600" />
                                        Fee/Charge
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor="amount">Amount (KES)</Label>
                                <Input
                                  id="amount"
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  value={newMovement.amount}
                                  onChange={(e) => setNewMovement({ ...newMovement, amount: e.target.value })}
                                  required
                                />
                              </div>
                              <div>
                                <Label htmlFor="movementDate">Date</Label>
                                <Input
                                  id="movementDate"
                                  type="date"
                                  value={newMovement.movementDate}
                                  onChange={(e) => setNewMovement({ ...newMovement, movementDate: e.target.value })}
                                  required
                                />
                              </div>
                              <div>
                                <Label htmlFor="referenceNumber">Reference Number</Label>
                                <Input
                                  id="referenceNumber"
                                  placeholder="Optional transaction reference"
                                  value={newMovement.referenceNumber}
                                  onChange={(e) => setNewMovement({ ...newMovement, referenceNumber: e.target.value })}
                                />
                              </div>
                              <div>
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                  id="description"
                                  placeholder="Optional notes"
                                  value={newMovement.description}
                                  onChange={(e) => setNewMovement({ ...newMovement, description: e.target.value })}
                                />
                              </div>
                              <Button type="submit" className="w-full">Record Movement</Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Investments Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start tracking your chama's investments by adding your first investment account
                </p>
                <Button onClick={() => setShowCreateAccount(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Investment
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Investments;
