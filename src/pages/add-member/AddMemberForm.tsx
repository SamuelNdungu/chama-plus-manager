
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Form } from "@/components/ui/form";
import { UserPlus } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useChama } from "@/context/ChamaContext";
import { useNavigate } from "react-router-dom";
import MemberDetailsFormSection from "./MemberDetailsFormSection";
import NextOfKinFormSection from "./NextOfKinFormSection";
import { formSchema, MemberFormType } from "../edit-member/types";

const AddMemberForm = () => {
  const navigate = useNavigate();
  const { addMember } = useChama();

  const form = useForm<MemberFormType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      role: "Member",
      idNumber: "",
      nextOfKin: {
        name: "",
        phone: "",
        email: "",
        idNumber: "",
        relationship: "",
      },
    },
  });

  const onSubmit = async (data: MemberFormType) => {
    try {
      const memberData = {
        ...data,
        joinedAt: new Date().toISOString().split('T')[0],
        nextOfKin: { ...data.nextOfKin },
      };
      await addMember(memberData);
      toast({
        title: "Member Added",
        description: "The new member has been successfully added to the Chama.",
      });
      navigate("/members");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add member. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4 md:col-span-1">
            <MemberDetailsFormSection control={form.control} />
          </div>
          <div className="space-y-4 md:col-span-1">
            <NextOfKinFormSection control={form.control} />
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/members")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-chama-purple hover:bg-chama-dark-purple"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default AddMemberForm;
