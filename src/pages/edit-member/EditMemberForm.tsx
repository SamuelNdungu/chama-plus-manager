
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Pencil } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useChama } from "@/context/ChamaContext";
import MemberDetailsFormSection from "./MemberDetailsFormSection";
import NextOfKinFormSection from "./NextOfKinFormSection";
import { Member, } from "@/types";
import { formSchema, MemberFormType } from "./types";

interface EditMemberFormProps {
  member: Member;
}

const EditMemberForm: React.FC<EditMemberFormProps> = ({ member }) => {
  const navigate = useNavigate();
  const { editMember } = useChama();

  const form = useForm<MemberFormType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: member.name,
      email: member.email,
      phone: member.phone,
      role: member.role,
      idNumber: member.idNumber || "",
      nextOfKin: {
        name: member.nextOfKin?.name || "",
        phone: member.nextOfKin?.phone || "",
        email: member.nextOfKin?.email || "",
        idNumber: member.nextOfKin?.idNumber || "",
        relationship: member.nextOfKin?.relationship || "",
      },
    },
  });

  const onSubmit = async (data: MemberFormType) => {
    try {
      await editMember(member.id, {
        ...member,
        ...data,
        nextOfKin: {
          name: data.nextOfKin.name,
          phone: data.nextOfKin.phone,
          relationship: data.nextOfKin.relationship,
          email: data.nextOfKin.email,
          idNumber: data.nextOfKin.idNumber
        }
      });
      toast({
        title: "Member Updated",
        description: "The member's information has been successfully updated.",
      });
      navigate(`/members/${member.id}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update member. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MemberDetailsFormSection control={form.control} />
        <NextOfKinFormSection control={form.control} />
      </div>
      <div className="flex justify-end space-x-4">
        <Button 
          type="button" 
          variant="outline"
          onClick={() => navigate(`/members/${member.id}`)}
        >
          Cancel
        </Button>
        <Button 
          type="submit"
          className="bg-chama-purple hover:bg-chama-dark-purple"
        >
          <Pencil className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>
    </form>
  );
};

export default EditMemberForm;
