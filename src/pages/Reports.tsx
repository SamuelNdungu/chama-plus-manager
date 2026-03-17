import { useState, useEffect } from 'react';
import { useChama } from '@/context/ChamaContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Download, Calendar as CalendarIcon, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { format as formatDate } from 'date-fns';
import { apiClient } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import type { ReportType, Member } from '@/types';

const Reports = () => {
  const { chama, members } = useChama();
  const { toast } = useToast();

  const [reportTypes, setReportTypes] = useState<ReportType[]>([]);
  const [selectedReport, setSelectedReport] = useState<string>('');
  const [reportFormat, setReportFormat] = useState<'pdf' | 'excel'>('pdf');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [asOfDate, setAsOfDate] = useState<Date>(new Date());
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch available report types
  useEffect(() => {
    const fetchReportTypes = async () => {
      try {
        const response = await apiClient.get<{ reports: ReportType[] }>('/reports/types');
        setReportTypes(response.reports);
      } catch (error) {
        console.error('Failed to fetch report types:', error);
        toast({
          title: 'Error',
          description: 'Failed to load report types',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchReportTypes();
  }, [toast]);

  // Get selected report details
  const getSelectedReportType = () => {
    return reportTypes.find(r => r.id === selectedReport);
  };

  // Check if all required parameters are filled
  const canGenerate = () => {
    if (!chama || !selectedReport) return false;

    const reportType = getSelectedReportType();
    if (!reportType) return false;

    // Check required params
    if (reportType.requiredParams.includes('start_date') && !startDate) return false;
    if (reportType.requiredParams.includes('end_date') && !endDate) return false;
    if (reportType.requiredParams.includes('member_id') && !selectedMember) return false;
    if (reportType.requiredParams.includes('as_of_date') && !asOfDate) return false;

    return true;
  };

  // Generate report
  const handleGenerateReport = async () => {
    if (!chama || !canGenerate()) return;

    setIsGenerating(true);

    try {
      // Build URL with query parameters
      const params = new URLSearchParams({
        chama_id: chama.id,
        format: reportFormat
      });

      if (startDate) params.append('start_date', formatDate(startDate, 'yyyy-MM-dd'));
      if (endDate) params.append('end_date', formatDate(endDate, 'yyyy-MM-dd'));
      if (asOfDate) params.append('as_of_date', formatDate(asOfDate, 'yyyy-MM-dd'));
      if (selectedMember) params.append('member_id', selectedMember);

      // Fetch report (will be a blob)
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'https://akibaplus.bima-connect.co.ke'}/api/reports/${selectedReport}?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      // Get filename from Content-Disposition header or create one
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename=([^;]+)/);
      const filename = filenameMatch 
        ? filenameMatch[1].replace(/['"]/g, '')
        : `report-${selectedReport}-${Date.now()}.${reportFormat === 'pdf' ? 'pdf' : 'xlsx'}`;

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Success',
        description: `Report generated and downloaded successfully`,
      });

    } catch (error) {
      console.error('Report generation error:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate report. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading reports...</div>
        </div>
      </div>
    );
  }

  if (!chama) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Please select a Chama to generate reports</AlertDescription>
        </Alert>
      </div>
    );
  }

  const reportType = getSelectedReportType();
  const requiresDateRange = reportType?.requiredParams.includes('start_date') || reportType?.requiredParams.includes('end_date');
  const requiresAsOfDate = reportType?.requiredParams.includes('as_of_date') || reportType?.optionalParams.includes('as_of_date');
  const requiresMember = reportType?.requiredParams.includes('member_id');
  const optionalMember = reportType?.optionalParams.includes('member_id');

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground mt-2">
          Generate financial reports and export data for {chama.name}
        </p>
      </div>

      {/* Report Generation Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Report
          </CardTitle>
          <CardDescription>
            Select a report type and configure parameters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Report Type Selection */}
          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select value={selectedReport} onValueChange={setSelectedReport}>
              <SelectTrigger>
                <SelectValue placeholder="Select a report type" />
              </SelectTrigger>
              <SelectContent>
                {reportTypes.map((report) => (
                  <SelectItem key={report.id} value={report.id}>
                    {report.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {reportType && (
              <p className="text-sm text-muted-foreground">{reportType.description}</p>
            )}
          </div>

          {/* Parameters (shown when report type is selected) */}
          {selectedReport && (
            <>
              {/* Date Range (if required) */}
              {requiresDateRange && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? formatDate(startDate, 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? formatDate(endDate, 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              )}

              {/* As Of Date (if required) */}
              {requiresAsOfDate && (
                <div className="space-y-2">
                  <Label>As Of Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {asOfDate ? formatDate(asOfDate, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={asOfDate}
                        onSelect={(date) => date && setAsOfDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Member Selection (if required or optional) */}
              {(requiresMember || optionalMember) && (
                <div className="space-y-2">
                  <Label>
                    Member {requiresMember ? '' : '(Optional)'}
                  </Label>
                  <Select value={selectedMember} onValueChange={setSelectedMember}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a member" />
                    </SelectTrigger>
                    <SelectContent>
                      {optionalMember && (
                        <SelectItem value="">All Members</SelectItem>
                      )}
                      {members.map((member: Member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Format Selection */}
              <div className="space-y-2">
                <Label>Export Format</Label>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={reportFormat === 'pdf' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setReportFormat('pdf')}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                  <Button
                    type="button"
                    variant={reportFormat === 'excel' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setReportFormat('excel')}
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4" />
                    Excel
                  </Button>
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerateReport}
                disabled={!canGenerate() || isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Generate & Download Report
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Available Reports Info */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reportTypes.map((report) => (
          <Card key={report.id} className="hover:border-primary cursor-pointer transition-colors" onClick={() => setSelectedReport(report.id)}>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {report.name}
              </CardTitle>
              <CardDescription className="text-sm">
                {report.description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                  <span className="text-muted-foreground">
                    {reportFormat === 'pdf' ? 'PDF' : 'Excel'} export supported
                  </span>
                </div>
                {report.requiredParams.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Required: {report.requiredParams.join(', ').replace(/_/g, ' ')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Reports;
