
import React, { useEffect } from 'react';
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Member } from "@/types";
import { useChama } from "@/context/ChamaContext";
import { useNavigate, useParams } from 'react-router-dom';
import { UserPlus, Phone, Mail, IdCard, User, Heart, Pencil } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  role: z.enum(["Chairperson", "Treasurer", "Secretary", "Member"]),
  idNumber: z.string().min(6, "ID number must be at least 6 characters"),
  nextOfKin: z.object({
    name: z.string().min(2, "Next of kin name must be at least 2 characters"),
    phone: z.string().min(10, "Phone number must be at least 10 digits"),
    email: z.string().email("Invalid email address"),
    idNumber: z.string().min(6, "ID number must be at least 6 characters"),
    relationship: z.string().min(2, "Relationship must be at least 2 characters"),
  }),
});

const EditMember = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { members, editMember } = useChama();
  const member = members.find((m) => m.id === id);

  const form = useForm<z.infer<typeof formSchema>>({
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

  // Prefill form with member details
  useEffect(() => {
    if (member) {
      form.reset({
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
        }
      });
    }
  }, [member, form]);

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      await editMember(member!.id, {
        ...member,
        ...data,
        nextOfKin: {
          ...data.nextOfKin
        }
      });
      toast({
        title: "Member Updated",
        description: "The member's information has been successfully updated.",
      });
      navigate(`/members/${member!.id}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update member. Please try again.",
        variant: "destructive",
      });
    }
  };

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
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Member Details Section */}
              <div className="space-y-4 md:col-span-1">
                <h3 className="text-lg font-medium">Member Details</h3>
                
                <div className="grid gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input placeholder="John Doe" {...field} />
                            <User className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input placeholder="john@example.com" type="email" {...field} />
                            <Mail className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input placeholder="+254712345678" {...field} />
                            <Phone className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="idNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID Number</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input placeholder="12345678" {...field} />
                            <IdCard className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <FormControl>
                          <select 
                            {...field} 
                            className="w-full p-2 border rounded focus:ring-2 focus:ring-primary"
                          >
                            <option value="Member">Member</option>
                            <option value="Chairperson">Chairperson</option>
                            <option value="Treasurer">Treasurer</option>
                            <option value="Secretary">Secretary</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Next of Kin Details Section */}
              <div className="space-y-4 md:col-span-1">
                <h3 className="text-lg font-medium">Next of Kin Details</h3>
                
                <div className="grid gap-4">
                  <FormField
                    control={form.control}
                    name="nextOfKin.name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input placeholder="Jane Doe" {...field} />
                            <User className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nextOfKin.email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input placeholder="jane@example.com" type="email" {...field} />
                            <Mail className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nextOfKin.phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input placeholder="+254712345678" {...field} />
                            <Phone className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="nextOfKin.idNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID Number</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input placeholder="12345678" {...field} />
                            <IdCard className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="nextOfKin.relationship"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Relationship</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input placeholder="Spouse, Parent, Child, etc" {...field} />
                            <Heart className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
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
        </Form>
      </div>
    </AppLayout>
  );
};

export default EditMember;
