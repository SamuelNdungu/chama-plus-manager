
import { Input } from "@/components/ui/input";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { User, Mail, Phone, IdCard } from "lucide-react";
import { Control } from "react-hook-form";
import { MemberFormType } from "../edit-member/types";

interface MemberDetailsFormSectionProps {
  control: Control<MemberFormType>;
}

const roles = [
  { value: "Member", label: "Member" },
  { value: "Chairperson", label: "Chairperson" },
  { value: "Treasurer", label: "Treasurer" },
  { value: "Secretary", label: "Secretary" },
];

const MemberDetailsFormSection = ({ control }: MemberDetailsFormSectionProps) => (
  <div className="space-y-4">
    <h3 className="text-lg font-medium">Member Details</h3>
    <div className="grid gap-4">
      <FormField
        control={control}
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
        control={control}
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
        control={control}
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
        control={control}
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
        control={control}
        name="role"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Role</FormLabel>
            <FormControl>
              <select
                {...field}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-primary"
              >
                {roles.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  </div>
);

export default MemberDetailsFormSection;
