import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useChama } from "@/context/ChamaContext";
import { apiClient } from "@/services/api";
import { Loan, LoanPayment, Member } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  CheckCircle,
  Send,
  DollarSign,
  Calendar,
  User,
  FileText,
  Clock,
  TrendingUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error";

const LoanDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { selectedChama, members } = useChama();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loan, setLoan] = useState<Loan | null>(null);
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Dialogs state
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [disburseDialogOpen, setDisburseDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  
  // Form data
  const [approveData, setApproveData] = useState({
    approvedBy: "",
    notes: "",
  });
  
  const [disburseData, setDisburseData] = useState({
    disbursedBy: "",
    disbursementMethod: "bank_transfer",
    referenceNumber: "",
    notes: "",
  });
  
  const [paymentData, setPaymentData] = useState({
    amount: "",
    paymentMethod: "mpesa",
    paymentDate: new Date().toISOString().split("T")[0],
    referenceNumber: "",
    receiptNumber: "",
    recordedBy: "",
    notes: "",
  });

  const fetchLoanDetails = useCallback(async () => {
    if (!id) {
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.get<{ loan: Loan; payments: LoanPayment[] }>(
        `/loans/${id}`
      );
      setLoan(response.loan);
      setPayments(response.payments || []);
    } catch (error) {
      console.error("Error fetching loan details:", error);
      toast({
        title: "Error",
        description: "Failed to fetch loan details",
        variant: "destructive",
      });
      navigate("/loans");
    } finally {
      setLoading(false);
    }
  }, [id, navigate, toast]);

  useEffect(() => {
    fetchLoanDetails();
  }, [fetchLoanDetails]);

  const handleApproveLoan = async () => {
    if (!approveData.approvedBy) {
      toast({
        title: "Error",
        description: "Please select who is approving the loan",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiClient.put(`/loans/${id}/approve`, {
        approved_by: approveData.approvedBy,
        notes: approveData.notes || undefined,
      });
      
      toast({
        title: "Success",
        description: "Loan approved successfully",
      });
      
      setApproveDialogOpen(false);
      fetchLoanDetails();
    } catch (error: unknown) {
      console.error("Error approving loan:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to approve loan"),
        variant: "destructive",
      });
    }
  };

  const handleDisburseLoan = async () => {
    if (!disburseData.disbursedBy) {
      toast({
        title: "Error",
        description: "Please select who is disbursing the loan",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiClient.put(`/loans/${id}/disburse`, {
        disbursed_by: disburseData.disbursedBy,
        disbursement_method: disburseData.disbursementMethod,
        reference_number: disburseData.referenceNumber || undefined,
        notes: disburseData.notes || undefined,
      });
      
      toast({
        title: "Success",
        description: "Loan disbursed successfully",
      });
      
      setDisburseDialogOpen(false);
      fetchLoanDetails();
    } catch (error: unknown) {
      console.error("Error disbursing loan:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to disburse loan"),
        variant: "destructive",
      });
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid payment amount",
        variant: "destructive",
      });
      return;
    }

    if (!paymentData.recordedBy) {
      toast({
        title: "Error",
        description: "Please select who is recording the payment",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiClient.post(`/loans/${id}/payments`, {
        amount: parseFloat(paymentData.amount),
        payment_method: paymentData.paymentMethod,
        payment_date: paymentData.paymentDate,
        reference_number: paymentData.referenceNumber || undefined,
        receipt_number: paymentData.receiptNumber || undefined,
        recorded_by: paymentData.recordedBy,
        notes: paymentData.notes || undefined,
      });
      
      toast({
        title: "Success",
        description: "Payment recorded successfully",
      });
      
      setPaymentDialogOpen(false);
      setPaymentData({
        amount: "",
        paymentMethod: "mpesa",
        paymentDate: new Date().toISOString().split("T")[0],
        referenceNumber: "",
        receiptNumber: "",
        recordedBy: "",
        notes: "",
      });
      fetchLoanDetails();
    } catch (error: unknown) {
      console.error("Error recording payment:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to record payment"),
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      pending: { variant: "outline", label: "Pending Approval" },
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

  const calculateProgress = (): string => {
    if (!loan) return "0";
    return ((loan.amountPaid / loan.totalAmount) * 100).toFixed(1);
  };

  if (loading || !loan) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              {loading ? "Loading loan details..." : "Loan not found"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/loans")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Loan Details</h1>
            <p className="text-muted-foreground">{loan.loanNumber}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {loan.status === "pending" && (
            <Button onClick={() => setApproveDialogOpen(true)}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve
            </Button>
          )}
          {loan.status === "approved" && (
            <Button onClick={() => setDisburseDialogOpen(true)}>
              <Send className="mr-2 h-4 w-4" />
              Disburse
            </Button>
          )}
          {(loan.status === "disbursed" || loan.status === "repaying") && (
            <Button onClick={() => setPaymentDialogOpen(true)}>
              <DollarSign className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
          )}
        </div>
      </div>

      {/* Loan Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Principal Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(loan.principalAmount)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total with Interest
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(loan.totalAmount)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {loan.interestRate}% interest
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Amount Paid
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(loan.amountPaid)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${loan.balance > 0 ? 'text-amber-600' : 'text-green-600'}`}>
              {formatCurrency(loan.balance)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Repayment Progress */}
      {loan.status !== "pending" && loan.status !== "approved" && (
        <Card>
          <CardHeader>
            <CardTitle>Repayment Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Repaid</span>
                <span className="font-semibold">{calculateProgress()}%</span>
              </div>
              <Progress value={parseFloat(calculateProgress())} className="h-3" />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Monthly Repayment</p>
                <p className="font-semibold text-lg">{formatCurrency(loan.monthlyRepayment)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Repayment Period</p>
                <p className="font-semibold text-lg">{loan.repaymentPeriod} months</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Loan Information */}
        <Card>
          <CardHeader>
            <CardTitle>Loan Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Member</p>
                  <p className="font-semibold">{loan.memberName}</p>
                  <p className="text-sm text-muted-foreground">{loan.memberPhone}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Purpose</p>
                  <p className="font-semibold capitalize">{loan.loanType.replace('_', ' ')}</p>
                  <p className="text-sm mt-1">{loan.loanPurpose}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Application Date</p>
                  <p className="font-semibold">{formatDate(loan.applicationDate)}</p>
                </div>
              </div>
              
              {loan.dueDate && (
                <>
                  <Separator />
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Due Date</p>
                      <p className="font-semibold">{formatDate(loan.dueDate)}</p>
                    </div>
                  </div>
                </>
              )}
              
              <Separator />
              
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(loan.status)}</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Guarantors & Approvals */}
        <Card>
          <CardHeader>
            <CardTitle>Guarantors & Approvals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Guarantors</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-2 bg-muted rounded">
                  <User className="h-4 w-4" />
                  <span className="text-sm">{loan.guarantor1Name || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-muted rounded">
                  <User className="h-4 w-4" />
                  <span className="text-sm">{loan.guarantor2Name || "N/A"}</span>
                </div>
              </div>
            </div>
            
            {loan.approvedByName && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Approved By</p>
                  <p className="font-semibold">{loan.approvedByName}</p>
                  <p className="text-xs text-muted-foreground">
                    {loan.approvalDate && formatDate(loan.approvalDate)}
                  </p>
                </div>
              </>
            )}
            
            {loan.disbursedByName && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Disbursed By</p>
                  <p className="font-semibold">{loan.disbursedByName}</p>
                  <p className="text-xs text-muted-foreground">
                    {loan.disbursementDate && formatDate(loan.disbursementDate)}
                  </p>
                </div>
              </>
            )}
            
            {loan.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm mt-1">{loan.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>
            {payments.length} payment{payments.length !== 1 ? 's' : ''} recorded
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="mx-auto h-12 w-12 mb-2 opacity-50" />
              <p>No payments recorded yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Principal</TableHead>
                  <TableHead>Interest</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Recorded By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                    <TableCell>{formatCurrency(payment.principalPaid)}</TableCell>
                    <TableCell>{formatCurrency(payment.interestPaid)}</TableCell>
                    <TableCell className="capitalize">
                      {payment.paymentMethod.replace('_', ' ')}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {payment.referenceNumber || payment.receiptNumber || '-'}
                    </TableCell>
                    <TableCell>{payment.recordedByName || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Loan</DialogTitle>
            <DialogDescription>
              Approve this loan application for {loan.memberName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Approved By *</Label>
              <Select
                value={approveData.approvedBy}
                onValueChange={(value) =>
                  setApproveData((prev) => ({ ...prev, approvedBy: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select approver" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name} - {member.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                value={approveData.notes}
                onChange={(e) =>
                  setApproveData((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Any notes about the approval..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleApproveLoan}>Approve Loan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disburse Dialog */}
      <Dialog open={disburseDialogOpen} onOpenChange={setDisburseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disburse Loan</DialogTitle>
            <DialogDescription>
              Record the disbursement of {formatCurrency(loan.principalAmount)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Disbursed By *</Label>
              <Select
                value={disburseData.disbursedBy}
                onValueChange={(value) =>
                  setDisburseData((prev) => ({ ...prev, disbursedBy: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select disburser" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name} - {member.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Disbursement Method</Label>
              <Select
                value={disburseData.disbursementMethod}
                onValueChange={(value) =>
                  setDisburseData((prev) => ({ ...prev, disbursementMethod: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="mpesa">M-Pesa</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reference Number</Label>
              <Input
                value={disburseData.referenceNumber}
                onChange={(e) =>
                  setDisburseData((prev) => ({ ...prev, referenceNumber: e.target.value }))
                }
                placeholder="Transaction reference"
              />
            </div>
            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                value={disburseData.notes}
                onChange={(e) =>
                  setDisburseData((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Any notes about the disbursement..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisburseDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleDisburseLoan}>Disburse Loan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Record Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a loan repayment. Balance: {formatCurrency(loan.balance)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Amount (KSh) *</Label>
              <Input
                type="number"
                min="1"
                max={loan.balance}
                value={paymentData.amount}
                onChange={(e) =>
                  setPaymentData((prev) => ({ ...prev, amount: e.target.value }))
                }
                placeholder="Payment amount"
              />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select
                value={paymentData.paymentMethod}
                onValueChange={(value) =>
                  setPaymentData((prev) => ({ ...prev, paymentMethod: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="mpesa">M-Pesa</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment Date</Label>
              <Input
                type="date"
                value={paymentData.paymentDate}
                onChange={(e) =>
                  setPaymentData((prev) => ({ ...prev, paymentDate: e.target.value }))
                }
              />
            </div>
            <div>
              <Label>Reference Number</Label>
              <Input
                value={paymentData.referenceNumber}
                onChange={(e) =>
                  setPaymentData((prev) => ({ ...prev, referenceNumber: e.target.value }))
                }
                placeholder="M-Pesa code or transaction ref"
              />
            </div>
            <div>
              <Label>Receipt Number</Label>
              <Input
                value={paymentData.receiptNumber}
                onChange={(e) =>
                  setPaymentData((prev) => ({ ...prev, receiptNumber: e.target.value }))
                }
                placeholder="Receipt number"
              />
            </div>
            <div>
              <Label>Recorded By *</Label>
              <Select
                value={paymentData.recordedBy}
                onValueChange={(value) =>
                  setPaymentData((prev) => ({ ...prev, recordedBy: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select recorder" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                value={paymentData.notes}
                onChange={(e) =>
                  setPaymentData((prev) => ({ ...prev, notes: e.target.value }))
                }
                placeholder="Any notes about the payment..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRecordPayment}>Record Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoanDetails;
