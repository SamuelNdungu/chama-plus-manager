import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useChama } from "@/context/ChamaContext";
import { apiClient } from "@/services/api";
import { Loan, LoanSummary } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Eye, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  DollarSign,
  Wallet,
  Calendar
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Loans = () => {
  const { selectedChama } = useChama();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loans, setLoans] = useState<Loan[]>([]);
  const [summary, setSummary] = useState<LoanSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (selectedChama?.id) {
      fetchLoans();
      fetchSummary();
    }
  }, [selectedChama, statusFilter]);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = { chama_id: selectedChama!.id };
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      
      const queryString = new URLSearchParams(params).toString();
      const response = await apiClient.get<{ loans: Loan[] }>(
        `/loans?${queryString}`
      );
      
setLoans(response.loans || []);
    } catch (error) {
      console.error("Error fetching loans:", error);
      toast({
        title: "Error",
        description: "Failed to fetch loans",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await apiClient.get<{ summary: LoanSummary }>(
        `/loans/summary/stats?chama_id=${selectedChama!.id}`
      );
      setSummary(response.summary);
    } catch (error) {
      console.error("Error fetching loan summary:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "outline", label: "Pending" },
      approved: { variant: "secondary", label: "Approved" },
      disbursed: { variant: "default", label: "Disbursed" },
      repaying: { variant: "default", label: "Repaying" },
      completed: { variant: "secondary", label: "Completed" },
      defaulted: { variant: "destructive", label: "Defaulted" },
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return `KSh ${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (!selectedChama) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              Please select a chama to view loans
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Loans Management</h1>
          <p className="text-muted-foreground">
            Manage member loans and repayments
          </p>
        </div>
        <Button onClick={() => navigate("/loans/apply")}>
          <Plus className="mr-2 h-4 w-4" />
          Apply for Loan
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Loans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">
                  {summary.activeLoans}
                </div>
                <div className="p-2 bg-blue-100 rounded-full">
                  <Wallet className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                {summary.pendingLoans} pending approval
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Disbursed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold">
                  {formatCurrency(parseInt(summary.totalDisbursed?.toString() || "0"))}
                </div>
                <div className="p-2 bg-green-100 rounded-full">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Lifetime disbursements
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Outstanding Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-amber-600">
                  {formatCurrency(parseInt(summary.totalOutstanding?.toString() || "0"))}
                </div>
                <div className="p-2 bg-amber-100 rounded-full">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Total amount due
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Interest Earned
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-bold text-green-600">
                  {formatCurrency(parseInt(summary.totalInterestEarned?.toString() || "0"))}
                </div>
                <div className="p-2 bg-green-100 rounded-full">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                From completed loans
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Loans</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="disbursed">Disbursed</SelectItem>
                  <SelectItem value="repaying">Repaying</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="defaulted">Defaulted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loans Table */}
      <Card>
        <CardHeader>
          <CardTitle>Loans</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading loans...</p>
            </div>
          ) : loans.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No loans found</h3>
              <p className="text-muted-foreground mb-4">
                {statusFilter !== "all" 
                  ? `No ${statusFilter} loans at the moment.`
                  : "Get started by applying for a loan."}
              </p>
              {statusFilter === "all" && (
                <Button onClick={() => navigate("/loans/apply")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Apply for Loan
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Loan #</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Principal</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loans.map((loan) => (
                    <TableRow key={loan.id}>
                      <TableCell className="font-medium">
                        {loan.loanNumber}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{loan.memberName}</div>
                          <div className="text-xs text-muted-foreground">
                            {loan.memberPhone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatCurrency(loan.principalAmount)}
                      </TableCell>
                      <TableCell>
                        {formatCurrency(loan.totalAmount)}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            loan.balance > 0
                              ? "font-semibold text-amber-600"
                              : "text-green-600"
                          }
                        >
                          {formatCurrency(loan.balance)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {formatDate(loan.dueDate)}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(loan.status)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/loans/${loan.id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Loans;
