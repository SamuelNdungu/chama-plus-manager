import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useChama } from "@/context/ChamaContext";
import { apiClient } from "@/services/api";
import { Member } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error";

const ApplyLoan = () => {
  const { selectedChama, members } = useChama();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    memberId: "",
    principalAmount: "",
    loanPurpose: "",
    loanType: "other",
    repaymentPeriod: "12",
    guarantor1Id: "",
    guarantor2Id: "",
    notes: "",
  });
  
  const [calculation, setCalculation] = useState({
    principal: 0,
    interestRate: 0,
    totalInterest: 0,
    totalAmount: 0,
    monthlyRepayment: 0,
  });

  const interestRate = selectedChama?.loanInterestRate || 10;

  const calculateLoan = useCallback(() => {
    const principal = parseFloat(formData.principalAmount) || 0;
    const months = parseInt(formData.repaymentPeriod) || 12;
    const rate = interestRate;

    const totalInterest = (principal * rate * months) / 100;
    const totalAmount = principal + totalInterest;
    const monthlyRepayment = totalAmount / months;

    setCalculation({
      principal,
      interestRate: rate,
      totalInterest,
      totalAmount,
      monthlyRepayment,
    });
  }, [formData.principalAmount, formData.repaymentPeriod, interestRate]);

  useEffect(() => {
    if (formData.principalAmount && formData.repaymentPeriod) {
      calculateLoan();
    }
  }, [formData.principalAmount, formData.repaymentPeriod, calculateLoan]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.memberId) {
      toast({
        title: "Error",
        description: "Please select the member applying for the loan",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.principalAmount || parseFloat(formData.principalAmount) <= 0) {
      toast({
        title: "Error",
        description: "Please enter a valid loan amount",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.guarantor1Id || !formData.guarantor2Id) {
      toast({
        title: "Error",
        description: "Please select two guarantors",
        variant: "destructive",
      });
      return;
    }
    
    if (formData.guarantor1Id === formData.guarantor2Id) {
      toast({
        title: "Error",
        description: "Guarantors must be different members",
        variant: "destructive",
      });
      return;
    }
    
    if (formData.memberId === formData.guarantor1Id || formData.memberId === formData.guarantor2Id) {
      toast({
        title: "Error",
        description: "Guarantors cannot be the same as the loan applicant",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.loanPurpose.trim()) {
      toast({
        title: "Error",
        description: "Please describe the purpose of the loan",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      const payload = {
        chama_id: selectedChama!.id,
        member_id: formData.memberId,
        principal_amount: parseFloat(formData.principalAmount),
        interest_rate: interestRate,
        loan_purpose: formData.loanPurpose,
        loan_type: formData.loanType,
        repayment_period: parseInt(formData.repaymentPeriod),
        guarantor1_id: formData.guarantor1Id,
        guarantor2_id: formData.guarantor2Id,
        notes: formData.notes || undefined,
      };
      
      await apiClient.post("/loans", payload);
      
      toast({
        title: "Success",
        description: "Loan application submitted successfully",
      });
      
      navigate("/loans");
    } catch (error: unknown) {
      console.error("Error submitting loan application:", error);
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to submit loan application"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Filter members for guarantor selection (exclude the applicant)
  const getGuarantorMembers = (excludeId: string) => {
    return members.filter((m) => m.id !== formData.memberId && m.id !== excludeId);
  };

  if (!selectedChama) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              Please select a chama to apply for a loan
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/loans")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Apply for Loan</h1>
          <p className="text-muted-foreground">
            Complete the form below to submit a loan application
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Application Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Loan Application Form</CardTitle>
            <CardDescription>
              All fields marked with * are required
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Member Selection */}
              <div className="space-y-2">
                <Label htmlFor="memberId">
                  Applicant Member *
                </Label>
                <Select
                  value={formData.memberId}
                  onValueChange={(value) => handleChange("memberId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name} - {member.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Loan Amount */}
              <div className="space-y-2">
                <Label htmlFor="principalAmount">
                  Loan Amount (KSh) *
                </Label>
                <Input
                  id="principalAmount"
                  type="number"
                  min="1000"
                  step="1000"
                  value={formData.principalAmount}
                  onChange={(e) => handleChange("principalAmount", e.target.value)}
                  placeholder="e.g., 50000"
                  required
                />
                {selectedChama.maximumLoanAmount && (
                  <p className="text-xs text-muted-foreground">
                    Maximum loan amount: KSh {selectedChama.maximumLoanAmount.toLocaleString()}
                  </p>
                )}
              </div>

              {/* Repayment Period */}
              <div className="space-y-2">
                <Label htmlFor="repaymentPeriod">
                  Repayment Period (Months) *
                </Label>
                <Select
                  value={formData.repaymentPeriod}
                  onValueChange={(value) => handleChange("repaymentPeriod", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 months</SelectItem>
                    <SelectItem value="6">6 months</SelectItem>
                    <SelectItem value="9">9 months</SelectItem>
                    <SelectItem value="12">12 months</SelectItem>
                    <SelectItem value="18">18 months</SelectItem>
                    <SelectItem value="24">24 months</SelectItem>
                    <SelectItem value="36">36 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Loan Type */}
              <div className="space-y-2">
                <Label htmlFor="loanType">
                  Loan Type *
                </Label>
                <Select
                  value={formData.loanType}
                  onValueChange={(value) => handleChange("loanType", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="development">Development</SelectItem>
                    <SelectItem value="school_fees">School Fees</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Loan Purpose */}
              <div className="space-y-2">
                <Label htmlFor="loanPurpose">
                  Purpose of Loan *
                </Label>
                <Textarea
                  id="loanPurpose"
                  value={formData.loanPurpose}
                  onChange={(e) => handleChange("loanPurpose", e.target.value)}
                  placeholder="Describe the purpose of this loan..."
                  rows={3}
                  required
                />
              </div>

              {/* Guarantor 1 */}
              <div className="space-y-2">
                <Label htmlFor="guarantor1Id">
                  Guarantor 1 *
                </Label>
                <Select
                  value={formData.guarantor1Id}
                  onValueChange={(value) => handleChange("guarantor1Id", value)}
                  disabled={!formData.memberId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select first guarantor" />
                  </SelectTrigger>
                  <SelectContent>
                    {getGuarantorMembers(formData.guarantor2Id).map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name} - {member.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Guarantor 2 */}
              <div className="space-y-2">
                <Label htmlFor="guarantor2Id">
                  Guarantor 2 *
                </Label>
                <Select
                  value={formData.guarantor2Id}
                  onValueChange={(value) => handleChange("guarantor2Id", value)}
                  disabled={!formData.memberId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select second guarantor" />
                  </SelectTrigger>
                  <SelectContent>
                    {getGuarantorMembers(formData.guarantor1Id).map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name} - {member.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Additional Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">
                  Additional Notes (Optional)
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange("notes", e.target.value)}
                  placeholder="Any additional information..."
                  rows={2}
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/loans")}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Submitting..." : "Submit Application"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Loan Calculator */}
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Loan Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Principal Amount</span>
                <span className="font-semibold">
                  KSh {calculation.principal.toLocaleString()}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Interest Rate</span>
                <span className="font-semibold">
                  {calculation.interestRate}%
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Repayment Period</span>
                <span className="font-semibold">
                  {formData.repaymentPeriod} months
                </span>
              </div>
              
              <div className="border-t pt-3 flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Interest</span>
                <span className="font-semibold text-amber-600">
                  KSh {calculation.totalInterest.toLocaleString()}
                </span>
              </div>
              
              <div className="border-t pt-3 flex justify-between items-center">
                <span className="font-medium">Total Repayment</span>
                <span className="text-lg font-bold">
                  KSh {calculation.totalAmount.toLocaleString()}
                </span>
              </div>
              
              <div className="bg-muted p-3 rounded-lg">
                <div className="text-xs text-muted-foreground mb-1">
                  Monthly Repayment
                </div>
                <div className="text-2xl font-bold text-chama-purple">
                  KSh {calculation.monthlyRepayment.toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ApplyLoan;
