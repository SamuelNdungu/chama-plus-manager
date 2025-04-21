
import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import { useChama } from "@/context/ChamaContext";
import { useNavigate, useParams } from "react-router-dom";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import EditMemberForm from "./edit-member/EditMemberForm";

// Only import types, no logic here
const EditMember = () => {
  const { id } = useParams<{ id: string }>();
  const { members } = useChama();
  const navigate = useNavigate();
  const member = members.find((m) => m.id === id);

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
