
import React from 'react';
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
import { Member } from "@/types";
import { useChama } from "@/context/ChamaContext";
import { useNavigate } from 'react-router-dom';
import { UserPlus } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  role: z.enum(["Chairperson", "Treasurer", "Secretary", "Member"]),
});

const AddMember = () => {
  const navigate = useNavigate();
  const { addMember } = useChama();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      role: "Member",
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      await addMember(data);
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
    <AppLayout title="Add New Member">
      <div className="max-w-md mx-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Doe" {...field} />
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
                    <Input placeholder="john@example.com" type="email" {...field} />
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
                    <Input placeholder="+254712345678" {...field} />
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
                      className="w-full p-2 border rounded"
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
      </div>
    </AppLayout>
  );
};

export default AddMember;
