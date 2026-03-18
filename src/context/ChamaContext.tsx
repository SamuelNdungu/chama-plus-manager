import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { Chama, Member, Contribution, Meeting, Asset, Document, Role } from '@/types';
import { useAuth } from './AuthContext';
import { toast } from '@/components/ui/use-toast';
import { apiClient } from '@/services/api';

// API Response Interfaces
interface ApiChama {
  id: number;
  name: string;
  description: string;
  created_at: string;
  contribution_amount: number;
  contribution_frequency: string;
}

interface ApiMember {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  chama_id: number;
  chamaId?: number;
  created_at: string;
  joinedAt?: string;
  id_number: string;
  idNumber?: string;
  next_of_kin_name?: string;
  next_of_kin_phone?: string;
  next_of_kin_email?: string;
  next_of_kin_relationship?: string;
  next_of_kin_id_number?: string;
  nextOfKin?: {
    name?: string;
    phone?: string;
    email?: string;
    relationship?: string;
    idNumber?: string;
  };
}

interface ApiContribution {
  id: number;
  member_id: number;
  memberId?: number;
  amount: number;
  contribution_date: string;
  status: string;
  payment_method?: string;
  notes?: string;
}

interface ApiMeeting {
  id: number;
  title?: string;
  meeting_number?: string;
  meeting_date: string;
  meeting_time: string;
  location: string;
  agenda: string;
  chama_id: number;
  chamaId?: number;
}

interface ChamaContextType {
  chama: Chama | null;
  selectedChama: Chama | null;
  members: Member[];
  contributions: Contribution[];
  meetings: Meeting[];
  assets: Asset[];
  documents: Document[];
  isLoading: boolean;
  createChama: (chamaData: Partial<Chama>) => Promise<void>;
  updateChama: (chamaData: Partial<Chama>) => Promise<void>;
  addMember: (memberData: Partial<Member>) => Promise<void>;
  recordContribution: (contributionData: Partial<Contribution>) => Promise<void>;
  scheduleMeeting: (meetingData: Partial<Meeting>) => Promise<void>;
  addAsset: (assetData: Partial<Asset>) => Promise<void>;
  uploadDocument: (documentData: Partial<Document>) => Promise<void>;
  editMember: (memberId: string, updatedData: Partial<Member>) => Promise<void>;
}

const ChamaContext = createContext<ChamaContextType | undefined>(undefined);


export const ChamaProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [chama, setChama] = useState<Chama | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const mapRoleFromApi = useCallback((role?: string): Role => {
    const normalized = (role || '').toLowerCase();
    if (normalized.includes('chair')) return 'Chairperson';
    if (normalized.includes('treas')) return 'Treasurer';
    if (normalized.includes('secre')) return 'Secretary';
    return 'Member';
  }, []);

  const mapRoleToApi = useCallback((role?: Role): string => {
    if (!role) return 'member';
    switch (role) {
      case 'Chairperson':
        return 'chairman';
      case 'Treasurer':
        return 'treasurer';
      case 'Secretary':
        return 'secretary';
      case 'Member':
      default:
        return 'member';
    }
  }, []);

  const mapApiMemberToMember = useCallback((apiMember: ApiMember): Member => {
    return {
      id: String(apiMember.id),
      name: apiMember.name || '',
      email: apiMember.email || '',
      phone: apiMember.phone || '',
      role: mapRoleFromApi(apiMember.role),
      chamaId: String(apiMember.chama_id || apiMember.chamaId || 'chama1'),
      joinedAt: apiMember.joinedAt
        ? new Date(apiMember.joinedAt).toISOString().split('T')[0]
        : apiMember.created_at
          ? new Date(apiMember.created_at).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
      idNumber: apiMember.id_number || apiMember.idNumber,
      nextOfKin: {
        name: apiMember.next_of_kin_name || apiMember.nextOfKin?.name,
        phone: apiMember.next_of_kin_phone || apiMember.nextOfKin?.phone,
        email: apiMember.next_of_kin_email || apiMember.nextOfKin?.email,
        relationship: apiMember.next_of_kin_relationship || apiMember.nextOfKin?.relationship,
        idNumber: apiMember.next_of_kin_id_number || apiMember.nextOfKin?.idNumber,
      },
    };
  }, [mapRoleFromApi]);

  const mapApiChamaToChama = useCallback((apiChama: ApiChama, fallback?: Chama): Chama => {
    return {
      id: String(apiChama.id ?? fallback?.id ?? ''),
      name: apiChama.name ?? fallback?.name ?? '',
      description: apiChama.description ?? fallback?.description ?? '',
      createdAt: apiChama.created_at
        ? new Date(apiChama.created_at).toISOString().split('T')[0]
        : fallback?.createdAt ?? new Date().toISOString().split('T')[0],
      monthlyContributionAmount:
        Number(apiChama.contribution_amount ?? fallback?.monthlyContributionAmount ?? 0),
      contributionFrequency:
        apiChama.contribution_frequency ?? fallback?.contributionFrequency ?? 'Monthly',
      members: fallback?.members ?? [],
      bankBalance: fallback?.bankBalance,
      fundingGoal: fallback?.fundingGoal ?? 0,
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const loadData = async () => {
      setIsLoading(true);

      try {
        const apiChamas = await apiClient.get<ApiChama[]>('/chamas');
        if (apiChamas.length > 0) {
          setChama(mapApiChamaToChama(apiChamas[0]));
        } else {
          setChama(null);
        }

        const apiMembers = await apiClient.get<ApiMember[]>('/members');
        setMembers(apiMembers.map(mapApiMemberToMember));

        const apiContributions = await apiClient.get<ApiContribution[]>('/contributions');
        setContributions(
          apiContributions.map((c) => ({
            id: String(c.id),
            memberId: String(c.member_id || c.memberId),
            amount: Number(c.amount || 0),
            date: c.contribution_date
              ? new Date(c.contribution_date).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0],
            status: (c.status || 'Pending') === 'completed' ? 'Paid' : 'Pending',
            paymentMethod: c.payment_method || undefined,
            notes: c.notes || undefined,
          }))
        );

        const apiMeetings = await apiClient.get<ApiMeeting[]>('/meetings');
        setMeetings(
          apiMeetings.map((m) => ({
            id: String(m.id),
            title: m.title || m.meeting_number || 'Meeting',
            date: m.meeting_date
              ? new Date(m.meeting_date).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0],
            time: m.meeting_time || '18:00',
            location: m.location || 'TBD',
            agenda: m.agenda || '',
            chamaId: String(m.chama_id || m.chamaId || ''),
            attendees: [],
          }))
        );

        setAssets([]);
        setDocuments([]);
      } catch (error) {
        console.error('Failed to load chama data:', error);
        setChama(null);
        setMembers([]);
        setContributions([]);
        setMeetings([]);
        setAssets([]);
        setDocuments([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [isAuthenticated, mapApiChamaToChama, mapApiMemberToMember]);

  // Removed localStorage persistence to avoid mock data usage

  const createChama = async (chamaData: Partial<Chama>) => {
    try {
      setIsLoading(true);

      const payload = {
        name: chamaData.name || 'New Chama',
        description: chamaData.description || '',
        contributionAmount: chamaData.monthlyContributionAmount || 0,
        contributionFrequency: chamaData.contributionFrequency || 'Monthly',
      };

      const created = await apiClient.post<ApiChama>('/chamas', payload);
      const newChama = mapApiChamaToChama(created, {
        id: '',
        name: payload.name,
        description: payload.description,
        createdAt: new Date().toISOString().split('T')[0],
        monthlyContributionAmount: payload.contributionAmount,
        contributionFrequency: payload.contributionFrequency,
        members: [],
        bankBalance: 0,
        fundingGoal: chamaData.fundingGoal || 0,
      });

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

  const updateChama = async (chamaData: Partial<Chama>) => {
    if (!chama) throw new Error('No active chama');

    try {
      setIsLoading(true);

      const payload = {
        name: chamaData.name ?? chama.name,
        description: chamaData.description ?? chama.description,
        contributionAmount: chamaData.monthlyContributionAmount ?? chama.monthlyContributionAmount,
        contributionFrequency: chamaData.contributionFrequency ?? chama.contributionFrequency,
      };

      const updated = await apiClient.put<ApiChama>(`/chamas/${chama.id}`, payload);
      const updatedChama = mapApiChamaToChama(updated, {
        ...chama,
        fundingGoal: chamaData.fundingGoal ?? chama.fundingGoal,
      });

      if (chamaData.fundingGoal !== undefined) {
        updatedChama.fundingGoal = chamaData.fundingGoal;
      }

      setChama(updatedChama);
      toast({
        title: 'Success',
        description: 'Chama settings updated successfully',
      });
    } catch (error) {
      console.error('Failed to update chama:', error);
      toast({
        title: 'Error',
        description: 'Failed to update chama settings',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const addMember = async (memberData: Partial<Member>) => {
    try {
      setIsLoading(true);

      const payload = {
        name: memberData.name || '',
        email: memberData.email || '',
        phone: memberData.phone || '',
        role: mapRoleToApi(memberData.role),
        idNumber: memberData.idNumber || '',
        nextOfKin: {
          name: memberData.nextOfKin?.name || '',
          phone: memberData.nextOfKin?.phone || '',
          email: memberData.nextOfKin?.email || '',
          relationship: memberData.nextOfKin?.relationship || '',
          idNumber: memberData.nextOfKin?.idNumber || '',
        },
      };

      const created = await apiClient.post<ApiMember>('/members', payload);
      const newMember = mapApiMemberToMember(created);
      setMembers((prev) => [newMember, ...prev]);
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
      if (!chama) throw new Error('No active chama');

      const payload = {
        chamaId: Number(chama.id),
        memberId: Number(contributionData.memberId),
        amount: contributionData.amount || 0,
        contributionType: 'regular',
        status: contributionData.status === 'Paid' ? 'completed' : 'pending',
        paymentMethod: contributionData.paymentMethod || null,
        notes: contributionData.notes || null,
      };

      const created = await apiClient.post<ApiContribution>('/contributions', payload);
      const newContribution: Contribution = {
        id: String(created.id),
        memberId: String(created.member_id || created.memberId),
        amount: Number(created.amount || payload.amount),
        date: created.contribution_date
          ? new Date(created.contribution_date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        status: created.status === 'completed' ? 'Paid' : 'Pending',
        paymentMethod: created.payment_method || contributionData.paymentMethod,
        notes: created.notes || contributionData.notes,
      };

      setContributions((prev) => [newContribution, ...prev]);

      if (newContribution.status === 'Paid') {
        setChama((prev) =>
          prev
            ? { ...prev, bankBalance: (prev.bankBalance || 0) + newContribution.amount }
            : prev
        );
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
      if (!chama) throw new Error('No active chama');

      const payload = {
        chamaId: Number(chama.id),
        title: meetingData.title || 'New Meeting',
        meetingDate: meetingData.date || new Date().toISOString().split('T')[0],
        meetingTime: meetingData.time || '18:00',
        location: meetingData.location || 'TBD',
        agenda: meetingData.agenda || '',
      };

      const created = await apiClient.post<ApiMeeting>('/meetings', payload);
      const newMeeting: Meeting = {
        id: String(created.id),
        title: created.title || created.meeting_number || payload.title,
        date: created.meeting_date
          ? new Date(created.meeting_date).toISOString().split('T')[0]
          : payload.meetingDate,
        time: created.meeting_time || payload.meetingTime,
        location: created.location || payload.location,
        agenda: created.agenda || payload.agenda,
        chamaId: String(created.chama_id || chama.id),
      };

      setMeetings((prev) => [newMeeting, ...prev]);
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

      const existing = members.find((m) => m.id === memberId);
      if (!existing) {
        throw new Error('Member not found');
      }

      const payload = {
        name: updatedData.name || existing.name || '',
        email: updatedData.email || existing.email || '',
        phone: updatedData.phone || existing.phone || '',
        role: mapRoleToApi(updatedData.role || existing.role),
        idNumber: updatedData.idNumber || existing.idNumber || '',
        nextOfKin: {
          name: updatedData.nextOfKin?.name || existing.nextOfKin?.name || '',
          phone: updatedData.nextOfKin?.phone || existing.nextOfKin?.phone || '',
          email: updatedData.nextOfKin?.email || existing.nextOfKin?.email || '',
          relationship: updatedData.nextOfKin?.relationship || existing.nextOfKin?.relationship || '',
          idNumber: updatedData.nextOfKin?.idNumber || existing.nextOfKin?.idNumber || '',
        },
      };

      const updated = await apiClient.put<ApiMember>(`/members/${memberId}`, payload);
      const mapped = mapApiMemberToMember(updated);

      setMembers((prevMembers) =>
        prevMembers.map((m) => (m.id === memberId ? mapped : m))
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
      selectedChama: chama,
      members,
      contributions,
      meetings,
      assets,
      documents,
      isLoading,
      createChama,
      updateChama,
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
