
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
  };
  joinedAt: string;
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
}

export interface Asset {
  id: string;
  chamaId: string;
  name: string;
  type: 'Land' | 'Shares' | 'SACCO' | 'Business' | 'Other';
  purchaseDate: string;
  purchaseValue: number;
  currentValue: number;
  description: string;
  documents?: string[];
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
