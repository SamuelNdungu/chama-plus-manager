export type Role = 'Chairperson' | 'Treasurer' | 'Secretary' | 'Member';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  photo?: string;
}

export interface Member extends User {
  role: Role;
  chamaId: string;
  nextOfKin?: {
    name: string;
    phone: string;
    relationship: string;
    email?: string;
    idNumber?: string;
  };
  joinedAt: string;
  idNumber?: string;
  hasUserAccount?: boolean;
  userId?: string;
}

export interface Contribution {
  id: string;
  memberId: string;
  amount: number;
  date: string;
  status: 'Paid' | 'Pending';
  paymentMethod?: string;
  notes?: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  agenda: string;
  chamaId: string;
  attendees?: string[];
  minutesUrl?: string;
}

export interface Chama {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  monthlyContributionAmount: number;
  contributionFrequency: string;
  members: Member[];
  bankBalance?: number;
  fundingGoal?: number;
  loanInterestRate?: number;
  maximumLoanAmount?: number;
}

export interface Asset {
  id: string;
  chamaId: string;
  name: string;
  assetType: 'land' | 'vehicle' | 'building' | 'equipment' | 'shares' | 'business' | 'other';
  description?: string;
  purchaseDate: string;
  purchaseValue: number;
  currentValue: number;
  location?: string;
  serialNumber?: string;
  registrationNumber?: string;
  titleDeedNumber?: string;
  landSize?: number;
  landUnit?: 'acres' | 'hectares' | 'sqm';
  make?: string;
  model?: string;
  year?: number;
  documentUrls?: string[];
  status: 'active' | 'sold' | 'damaged' | 'deprecated';
  acquiredBy?: string;
  acquiredByName?: string;
  soldDate?: string;
  soldValue?: number;
  soldTo?: string;
  notes?: string;
  valuationCount?: number;
  lastValuationDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssetValuation {
  id: string;
  assetId: string;
  valuationDate: string;
  valuationAmount: number;
  valuationMethod: 'market_assessment' | 'professional_appraisal' | 'depreciation' | 'other';
  valuerName?: string;
  valuerOrganization?: string;
  conductedBy?: string;
  conductedByName?: string;
  notes?: string;
  createdAt: string;
}

export interface AssetMaintenance {
  id: string;
  assetId: string;
  maintenanceDate: string;
  maintenanceType: 'repair' | 'service' | 'inspection' | 'upgrade';
  description: string;
  cost: number;
  performedBy?: string;
  nextMaintenanceDate?: string;
  recordedBy?: string;
  recordedByName?: string;
  notes?: string;
  createdAt: string;
}

export interface AssetSummary {
  totalAssets: number;
  activeAssets: number;
  soldAssets: number;
  totalPurchaseValue: number;
  totalCurrentValue: number;
  totalAppreciation: number;
  assetTypeCount: number;
}

export interface AssetsByType {
  assetType: string;
  count: number;
  totalValue: number;
}

export interface NetWorthSummary {
  total: number;
  breakdown: {
    bankBalance: number;
    loansOutstanding: number;
    assetsValue: number;
    investmentsValue: number;
    totalContributions: number;
  };
}

export interface Document {
  id: string;
  chamaId: string;
  name: string;
  type: 'Constitution' | 'Agreement' | 'Title' | 'Minutes' | 'Other';
  url: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface FinancialAccount {
  id: string;
  chamaId: string;
  name: string;
  type: 'bank' | 'investment' | 'cash';
  currencyCode: string;
  currentBalance: number;
  description?: string;
  accountNumber?: string;
  institutionName?: string;
  isActive: boolean;
  createdAt: string;
}

export interface AccountMovement {
  id: string;
  chamaId: string;
  accountId: string;
  movementType: 'deposit' | 'withdrawal' | 'interest' | 'fee' | 'transfer';
  amount: number;
  description?: string;
  movementDate: string;
  referenceNumber?: string;
  createdBy?: string;
  createdAt: string;
}

export interface InvestmentSummary {
  id: string;
  name: string;
  institution?: string;
  depositsTotal: number;
  currentBalance: number;
  interestEarned: number;
  feesPaid: number;
  totalGain: number;
  roiPercentage: string;
}

export interface InvestmentPortfolio {
  investments: InvestmentSummary[];
  totals: {
    totalInvestments: number;
    totalDeposits: number;
    totalCurrentValue: number;
    totalInterest: number;
    totalFees: number;
    totalGain: number;
  };
}

export interface Loan {
  id: string;
  chamaId: string;
  memberId: string;
  memberName: string;
  memberPhone?: string;
  memberIdNumber?: string;
  loanNumber: string;
  principalAmount: number;
  interestRate: number;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  loanPurpose: string;
  loanType: 'emergency' | 'development' | 'school_fees' | 'business' | 'other';
  applicationDate: string;
  approvalDate?: string;
  disbursementDate?: string;
  dueDate: string;
  repaymentPeriod: number;
  monthlyRepayment: number;
  status: 'pending' | 'approved' | 'disbursed' | 'repaying' | 'completed' | 'defaulted';
  guarantor1Id: string;
  guarantor2Id: string;
  guarantor1Name?: string;
  guarantor2Name?: string;
  approvedBy?: string;
  approvedByName?: string;
  disbursedBy?: string;
  disbursedByName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoanPayment {
  id: string;
  loanId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: 'cash' | 'mpesa' | 'bank_transfer';
  referenceNumber?: string;
  receiptNumber?: string;
  principalPaid: number;
  interestPaid: number;
  penaltyPaid: number;
  notes?: string;
  recordedBy?: string;
  recordedByName?: string;
  createdAt: string;
}

export interface LoanSummary {
  totalLoans: number;
  pendingLoans: number;
  approvedLoans: number;
  activeLoans: number;
  completedLoans: number;
  defaultedLoans: number;
  totalDisbursed: number;
  totalRepaid: number;
  totalOutstanding: number;
  totalInterestEarned: number;
}

export interface LoanApplication {
  chamaId: string;
  memberId: string;
  principalAmount: number;
  interestRate: number;
  loanPurpose: string;
  loanType: 'emergency' | 'development' | 'school_fees' | 'business' | 'other';
  repaymentPeriod: number;
  guarantor1Id: string;
  guarantor2Id: string;
  notes?: string;
}

// Report types
export interface ReportType {
  id: string;
  name: string;
  description: string;
  requiredParams: string[];
  optionalParams: string[];
}

export interface ReportGenerationParams {
  reportType: string;
  chamaId: string;
  format: 'pdf' | 'excel';
  startDate?: string;
  endDate?: string;
  memberId?: string;
  asOfDate?: string;
}

export interface ReportHistory {
  id: string;
  reportType: string;
  generatedAt: string;
  generatedBy: string;
  parameters: Record<string, string>;
}
