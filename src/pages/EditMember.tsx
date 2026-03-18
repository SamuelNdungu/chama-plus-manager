
import React, { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useChama } from "@/context/ChamaContext";
import { useNavigate, useParams } from "react-router-dom";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import EditMemberForm from "./edit-member/EditMemberForm";
import { apiClient } from "@/services/api";
import { Member } from "@/types";

interface MemberResponse {
  id: string | number;
  name: string;
  email: string;
  phone: string;
  role: Member["role"];
  chamaId?: string | number;
  chama_id?: string | number;
  joinedAt?: string;
  idNumber?: string;
  nextOfKin?: Member["nextOfKin"];
}

// Only import types, no logic here
const EditMember = () => {
  const { id } = useParams<{ id: string }>();
  const { members, isLoading } = useChama();
  const navigate = useNavigate();
  const [member, setMember] = useState<Member | null>(null);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (!id) return;

    const found = members.find((m) => m.id === id);
    if (found) {
      setMember(found);
      return;
    }

    const fetchMember = async () => {
      try {
        setIsFetching(true);
        const data = await apiClient.get<MemberResponse>(`/members/${id}`);
        const fetchedMember: Member = {
          id: String(data.id),
          name: data.name,
          email: data.email,
          phone: data.phone,
          role: data.role,
          chamaId: String(data.chamaId || data.chama_id || ""),
          joinedAt: data.joinedAt || new Date().toISOString().split("T")[0],
          idNumber: data.idNumber,
          nextOfKin: data.nextOfKin,
        };
        setMember(fetchedMember);
      } catch (error) {
        console.error("Failed to fetch member:", error);
        setMember(null);
      } finally {
        setIsFetching(false);
      }
    };

    fetchMember();
  }, [id, members]);

  if (isLoading || isFetching) {
    return (
      <AppLayout title="Edit Member">
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <div className="text-lg">Loading member...</div>
        </div>
      </AppLayout>
    );
  }

  if (!member) {
    return (
      <AppLayout title="Edit Member">
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <User className="mb-4" size={48} />
          <div className="text-lg">Member not found</div>
          <Button className="mt-6" onClick={() => navigate("/members")}>
            Back to Members
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={`Edit Member: ${member.name}`}>
      <div className="max-w-6xl mx-auto">
        <EditMemberForm member={member} />
      </div>
    </AppLayout>
  );
};

export default EditMember;
