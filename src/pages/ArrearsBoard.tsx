import { useState, useEffect, useCallback } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useChama } from "@/context/ChamaContext";
import { apiClient } from "@/services/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { AlertCircle, Download, Search, TrendingUp, TrendingDown, Clock } from "lucide-react";
import { format } from "date-fns";

interface ArrearsMember {
  member_id: number;
  member_name: string;
  phone_number: string;
  chama_member_id: number;
  total_obligations: number;
  overdue_count: number;
  partial_count: number;
  total_expected: string;
  total_paid: string;
  total_outstanding: string;
}

interface ArrearsSummary {
  total_members_in_arrears: number;
  total_outstanding: number;
  total_overdue: number;
}

const ArrearsBoard = () => {
  const { chama: selectedChama, isLoading: chamaLoading } = useChama();
  const [members, setMembers] = useState<ArrearsMember[]>([]);
  const [summary, setSummary] = useState<ArrearsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [sortBy, setSortBy] = useState<"amount" | "overdue">("amount");

  const fetchArrears = useCallback(async () => {
    if (!selectedChama?.id) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams({ chama_id: String(selectedChama.id) });
      if (selectedMonth) {
        params.append('month', selectedMonth);
      }

      const response = await apiClient.get<{
        data: ArrearsMember[];
        summary: ArrearsSummary;
      }>(`/contributions/arrears?${params.toString()}`);

      setMembers(response.data);
      setSummary(response.summary);
    } catch (err) {
      console.error('Error fetching arrears:', err);
      setError('Failed to load arrears data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedChama?.id, selectedMonth]);

  useEffect(() => {
    fetchArrears();
  }, [fetchArrears]);

  const filteredMembers = members.filter((member) =>
    member.member_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.phone_number?.includes(searchTerm)
  );

  const sortedMembers = [...filteredMembers].sort((a, b) => {
    if (sortBy === "amount") {
      return parseFloat(b.total_outstanding) - parseFloat(a.total_outstanding);
    } else {
      return Number(b.overdue_count) - Number(a.overdue_count);
    }
  });

  const exportToCSV = () => {
    const headers = ["Member Name", "Phone", "Total Expected", "Total Paid", "Outstanding", "Overdue Count"];
    const rows = sortedMembers.map(m => [
      m.member_name,
      m.phone_number || "N/A",
      m.total_expected,
      m.total_paid,
      m.total_outstanding,
      m.overdue_count
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `arrears-${selectedChama?.name}-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generateMonths = () => {
    const months = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push({
        value: format(date, "yyyy-MM-dd"),
        label: format(date, "MMMM yyyy")
      });
    }
    return months;
  };

  if (chamaLoading) {
    return (
      <AppLayout title="Arrears Board">
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  if (!selectedChama) {
    return (
      <AppLayout title="Arrears Board">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please select a chama to view arrears information.
          </AlertDescription>
        </Alert>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Arrears Board">
      <div className="space-y-6">
        {/* Summary Cards */}
        {summary && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Members in Arrears</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.total_members_in_arrears}</div>
                <p className="text-xs text-muted-foreground">
                  Members with outstanding balances
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
                <TrendingDown className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  KES {parseFloat(String(summary.total_outstanding)).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total unpaid contributions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue Obligations</CardTitle>
                <Clock className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.total_overdue}</div>
                <p className="text-xs text-muted-foreground">
                  Past due obligations
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters and Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Member Arrears</CardTitle>
            <CardDescription>
              Members with outstanding contribution balances
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="All months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All months</SelectItem>
                  {generateMonths().map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(v) => setSortBy(v as "amount" | "overdue")}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="amount">Sort by Amount</SelectItem>
                  <SelectItem value="overdue">Sort by Overdue</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={exportToCSV} variant="outline" disabled={sortedMembers.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-pulse">Loading arrears data...</div>
              </div>
            ) : sortedMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchTerm ? "No members found matching your search." : "No members in arrears. Great job!"}
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-right">Expected</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Overdue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedMembers.map((member) => {
                      const outstandingAmount = parseFloat(member.total_outstanding);
                      const expectedAmount = parseFloat(member.total_expected);
                      const paymentRate = expectedAmount > 0 
                        ? ((expectedAmount - outstandingAmount) / expectedAmount * 100).toFixed(0)
                        : 0;

                      return (
                        <TableRow key={member.member_id}>
                          <TableCell className="font-medium">{member.member_name}</TableCell>
                          <TableCell>{member.phone_number || "N/A"}</TableCell>
                          <TableCell className="text-right">
                            KES {parseFloat(member.total_expected).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            KES {parseFloat(member.total_paid).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-bold text-destructive">
                            KES {outstandingAmount.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-center">
                            {Number(member.overdue_count) > 0 ? (
                              <Badge variant="destructive">Overdue</Badge>
                            ) : Number(member.partial_count) > 0 ? (
                              <Badge variant="secondary">Partial</Badge>
                            ) : (
                              <Badge variant="outline">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {member.overdue_count > 0 && (
                              <Badge variant="outline" className="bg-red-50">
                                {member.overdue_count}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="mt-4 text-sm text-muted-foreground">
              Showing {sortedMembers.length} member{sortedMembers.length !== 1 ? "s" : ""} in arrears
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default ArrearsBoard;
