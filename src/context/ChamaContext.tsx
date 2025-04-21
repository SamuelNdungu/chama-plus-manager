import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Chama, Member, Contribution, Meeting, Asset, Document, Role } from '@/types';
import { useAuth } from './AuthContext';
import { toast } from '@/components/ui/use-toast';

interface ChamaContextType {
  chama: Chama | null;
  members: Member[];
  contributions: Contribution[];
  meetings: Meeting[];
  assets: Asset[];
  documents: Document[];
  isLoading: boolean;
  createChama: (chamaData: Partial<Chama>) => Promise<void>;
  addMember: (memberData: Partial<Member>) => Promise<void>;
  recordContribution: (contributionData: Partial<Contribution>) => Promise<void>;
  scheduleMeeting: (meetingData: Partial<Meeting>) => Promise<void>;
  addAsset: (assetData: Partial<Asset>) => Promise<void>;
  uploadDocument: (documentData: Partial<Document>) => Promise<void>;
  editMember: (memberId: string, updatedData: Partial<Member>) => Promise<void>;
}

const ChamaContext = createContext<ChamaContextType | undefined>(undefined);

// Mock data
const mockChama: Chama = {
  id: 'chama1',
  name: 'Tujenge Investment Group',
  description: 'A group focused on real estate investments in Nairobi',
  createdAt: '2025-01-15',
  monthlyContributionAmount: 5000,
  contributionFrequency: 'Monthly',
  members: [],
  bankBalance: 275000,
  fundingGoal: 500000,
};

const mockMembers: Member[] = [
  {
    id: 'member1',
    name: 'John Kamau',
    email: 'john@example.com',
    phone: '+254712345678',
    role: 'Chairperson',
    chamaId: 'chama1',
    joinedAt: '2025-01-15',
  },
  {
    id: 'member2',
    name: 'Mary Wanjiku',
    email: 'mary@example.com',
    phone: '+254723456789',
    role: 'Treasurer',
    chamaId: 'chama1',
    joinedAt: '2025-01-15',
  },
  {
    id: 'member3',
    name: 'Peter Omondi',
    email: 'peter@example.com',
    phone: '+254734567890',
    role: 'Secretary',
    chamaId: 'chama1',
    joinedAt: '2025-01-15',
  },
  {
    id: 'member4',
    name: 'Sarah Akinyi',
    email: 'sarah@example.com',
    phone: '+254745678901',
    role: 'Member',
    chamaId: 'chama1',
    joinedAt: '2025-01-20',
  },
  {
    id: 'member5',
    name: 'David Njoroge',
    email: 'david@example.com',
    phone: '+254756789012',
    role: 'Member',
    chamaId: 'chama1',
    joinedAt: '2025-01-25',
  },
];

const mockContributions: Contribution[] = [
  {
    id: 'contrib1',
    memberId: 'member1',
    amount: 5000,
    date: '2025-01-15',
    status: 'Paid',
    paymentMethod: 'M-Pesa',
  },
  {
    id: 'contrib2',
    memberId: 'member2',
    amount: 5000,
    date: '2025-01-15',
    status: 'Paid',
    paymentMethod: 'M-Pesa',
  },
  {
    id: 'contrib3',
    memberId: 'member3',
    amount: 5000,
    date: '2025-01-16',
    status: 'Paid',
    paymentMethod: 'Bank Transfer',
  },
  {
    id: 'contrib4',
    memberId: 'member4',
    amount: 5000,
    date: '2025-01-20',
    status: 'Paid',
    paymentMethod: 'M-Pesa',
  },
  {
    id: 'contrib5',
    memberId: 'member5',
    amount: 5000,
    date: '2025-02-15',
    status: 'Pending',
  },
];

const mockMeetings: Meeting[] = [
  {
    id: 'meeting1',
    title: 'January Monthly Meeting',
    date: '2025-01-30',
    time: '18:00',
    location: 'Virtual - Zoom',
    agenda: 'Review annual goals and investment opportunities',
    chamaId: 'chama1',
    attendees: ['member1', 'member2', 'member3', 'member4'],
  },
  {
    id: 'meeting2',
    title: 'February Monthly Meeting',
    date: '2025-02-27',
    time: '18:00',
    location: 'Java House, Westlands',
    agenda: 'Discuss potential property investment in Kitengela',
    chamaId: 'chama1',
  },
  {
    id: 'meeting3',
    title: 'Emergency Meeting',
    date: '2025-03-05',
    time: '19:00',
    location: 'Virtual - Zoom',
    agenda: 'Urgent discussion on emerging investment opportunity',
    chamaId: 'chama1',
  },
];

const mockAssets: Asset[] = [
  {
    id: 'asset1',
    chamaId: 'chama1',
    name: 'Kitengela Plot',
    type: 'Land',
    purchaseDate: '2025-02-10',
    purchaseValue: 2500000,
    currentValue: 2800000,
    description: '1/4 acre plot in Kitengela, near tarmac road',
  }
];

const mockDocuments: Document[] = [
  {
    id: 'doc1',
    chamaId: 'chama1',
    name: 'Group Constitution',
    type: 'Constitution',
    url: '#',
    uploadedAt: '2025-01-15',
    uploadedBy: 'member1',
  },
  {
    id: 'doc2',
    chamaId: 'chama1',
    name: 'January Meeting Minutes',
    type: 'Minutes',
    url: '#',
    uploadedAt: '2025-01-30',
    uploadedBy: 'member3',
  },
  {
    id: 'doc3',
    chamaId: 'chama1',
    name: 'Kitengela Land Title',
    type: 'Title',
    url: '#',
    uploadedAt: '2025-02-10',
    uploadedBy: 'member2',
  },
];

export const ChamaProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [chama, setChama] = useState<Chama | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      // Load data from localStorage or initialize with mock data for demo
      const loadData = () => {
        setIsLoading(true);
        
        // In a real app, this would be API calls to fetch data
        // For now, we'll use mock data and simulate a delay
        setTimeout(() => {
          // Check localStorage first, otherwise use mock data
          const storedChama = localStorage.getItem('chamaData');
          if (storedChama) {
            setChama(JSON.parse(storedChama));
          } else {
            setChama(mockChama);
          }

          const storedMembers = localStorage.getItem('chamaMembers');
          if (storedMembers) {
            setMembers(JSON.parse(storedMembers));
          } else {
            setMembers(mockMembers);
          }

          const storedContributions = localStorage.getItem('chamaContributions');
          if (storedContributions) {
            setContributions(JSON.parse(storedContributions));
          } else {
            setContributions(mockContributions);
          }

          const storedMeetings = localStorage.getItem('chamaMeetings');
          if (storedMeetings) {
            setMeetings(JSON.parse(storedMeetings));
          } else {
            setMeetings(mockMeetings);
          }

          const storedAssets = localStorage.getItem('chamaAssets');
          if (storedAssets) {
            setAssets(JSON.parse(storedAssets));
          } else {
            setAssets(mockAssets);
          }

          const storedDocuments = localStorage.getItem('chamaDocuments');
          if (storedDocuments) {
            setDocuments(JSON.parse(storedDocuments));
          } else {
            setDocuments(mockDocuments);
          }

          setIsLoading(false);
        }, 1000);
      };

      loadData();
    }
  }, [isAuthenticated]);

  // Save data to localStorage when it changes
  useEffect(() => {
    if (chama) localStorage.setItem('chamaData', JSON.stringify(chama));
  }, [chama]);

  useEffect(() => {
    if (members.length) localStorage.setItem('chamaMembers', JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    if (contributions.length) localStorage.setItem('chamaContributions', JSON.stringify(contributions));
  }, [contributions]);

  useEffect(() => {
    if (meetings.length) localStorage.setItem('chamaMeetings', JSON.stringify(meetings));
  }, [meetings]);

  useEffect(() => {
    if (assets.length) localStorage.setItem('chamaAssets', JSON.stringify(assets));
  }, [assets]);

  useEffect(() => {
    if (documents.length) localStorage.setItem('chamaDocuments', JSON.stringify(documents));
  }, [documents]);

  const createChama = async (chamaData: Partial<Chama>) => {
    try {
      setIsLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newChama: Chama = {
        id: Math.random().toString(36).substr(2, 9),
        name: chamaData.name || 'New Chama',
        description: chamaData.description || '',
        createdAt: new Date().toISOString().split('T')[0],
        monthlyContributionAmount: chamaData.monthlyContributionAmount || 0,
        contributionFrequency: chamaData.contributionFrequency || 'Monthly',
        members: [],
        bankBalance: 0,
        fundingGoal: chamaData.fundingGoal || 0,
      };
      
      setChama(newChama);
      toast({
        title: 'Success',
        description: 'Chama created successfully',
      });
    } catch (error) {
      console.error('Failed to create chama:', error);
      toast({
        title: 'Error',
        description: 'Failed to create chama',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addMember = async (memberData: Partial<Member>) => {
    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!chama) throw new Error('No active chama');
      
      const newMember: Member = {
        id: Math.random().toString(36).substr(2, 9),
        name: memberData.name || '',
        email: memberData.email || '',
        phone: memberData.phone || '',
        role: memberData.role || 'Member',
        chamaId: chama.id,
        joinedAt: new Date().toISOString().split('T')[0],
      };
      
      setMembers([...members, newMember]);
      toast({
        title: 'Success',
        description: 'Member added successfully',
      });
    } catch (error) {
      console.error('Failed to add member:', error);
      toast({
        title: 'Error',
        description: 'Failed to add member',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const recordContribution = async (contributionData: Partial<Contribution>) => {
    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newContribution: Contribution = {
        id: Math.random().toString(36).substr(2, 9),
        memberId: contributionData.memberId || '',
        amount: contributionData.amount || 0,
        date: new Date().toISOString().split('T')[0],
        status: contributionData.status || 'Pending',
        paymentMethod: contributionData.paymentMethod,
        notes: contributionData.notes,
      };
      
      setContributions([...contributions, newContribution]);
      
      // Update chama balance if contribution is marked as paid
      if (newContribution.status === 'Paid' && chama) {
        setChama({
          ...chama,
          bankBalance: (chama.bankBalance || 0) + newContribution.amount,
        });
      }
      
      toast({
        title: 'Success',
        description: 'Contribution recorded successfully',
      });
    } catch (error) {
      console.error('Failed to record contribution:', error);
      toast({
        title: 'Error',
        description: 'Failed to record contribution',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const scheduleMeeting = async (meetingData: Partial<Meeting>) => {
    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!chama) throw new Error('No active chama');
      
      const newMeeting: Meeting = {
        id: Math.random().toString(36).substr(2, 9),
        title: meetingData.title || 'New Meeting',
        date: meetingData.date || new Date().toISOString().split('T')[0],
        time: meetingData.time || '18:00',
        location: meetingData.location || 'TBD',
        agenda: meetingData.agenda || '',
        chamaId: chama.id,
      };
      
      setMeetings([...meetings, newMeeting]);
      toast({
        title: 'Success',
        description: 'Meeting scheduled successfully',
      });
    } catch (error) {
      console.error('Failed to schedule meeting:', error);
      toast({
        title: 'Error',
        description: 'Failed to schedule meeting',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addAsset = async (assetData: Partial<Asset>) => {
    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!chama) throw new Error('No active chama');
      
      const newAsset: Asset = {
        id: Math.random().toString(36).substr(2, 9),
        chamaId: chama.id,
        name: assetData.name || '',
        type: assetData.type || 'Other',
        purchaseDate: assetData.purchaseDate || new Date().toISOString().split('T')[0],
        purchaseValue: assetData.purchaseValue || 0,
        currentValue: assetData.currentValue || assetData.purchaseValue || 0,
        description: assetData.description || '',
        documents: assetData.documents || [],
      };
      
      setAssets([...assets, newAsset]);
      toast({
        title: 'Success',
        description: 'Asset added successfully',
      });
    } catch (error) {
      console.error('Failed to add asset:', error);
      toast({
        title: 'Error',
        description: 'Failed to add asset',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const uploadDocument = async (documentData: Partial<Document>) => {
    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!chama) throw new Error('No active chama');
      
      const newDocument: Document = {
        id: Math.random().toString(36).substr(2, 9),
        chamaId: chama.id,
        name: documentData.name || 'Untitled Document',
        type: documentData.type || 'Other',
        url: documentData.url || '#',
        uploadedAt: new Date().toISOString().split('T')[0],
        uploadedBy: documentData.uploadedBy || 'Unknown',
      };
      
      setDocuments([...documents, newDocument]);
      toast({
        title: 'Success',
        description: 'Document uploaded successfully',
      });
    } catch (error) {
      console.error('Failed to upload document:', error);
      toast({
        title: 'Error',
        description: 'Failed to upload document',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const editMember = async (memberId: string, updatedData: Partial<Member>) => {
    try {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));

      setMembers((prevMembers) =>
        prevMembers.map((m) =>
          m.id === memberId
            ? { ...m, ...updatedData, nextOfKin: { ...m.nextOfKin, ...updatedData.nextOfKin } }
            : m
        )
      );
      toast({
        title: 'Success',
        description: 'Member updated successfully',
      });
    } catch (error) {
      console.error('Failed to update member:', error);
      toast({
        title: 'Error',
        description: 'Failed to update member',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ChamaContext.Provider value={{
      chama,
      members,
      contributions,
      meetings,
      assets,
      documents,
      isLoading,
      createChama,
      addMember,
      recordContribution,
      scheduleMeeting,
      addAsset,
      uploadDocument,
      editMember,
    }}>
      {children}
    </ChamaContext.Provider>
  );
};

export const useChama = () => {
  const context = useContext(ChamaContext);
  
  if (context === undefined) {
    throw new Error('useChama must be used within a ChamaProvider');
  }
  
  return context;
};
