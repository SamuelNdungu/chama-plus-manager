
import { Input } from "@/components/ui/input";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { User, Phone, Heart, Mail, IdCard } from "lucide-react";
import * as React from "react";
import { Control } from "react-hook-form";
import { MemberFormType } from "./types";

interface NextOfKinFormSectionProps {
  control: Control<MemberFormType>;
}

const NextOfKinFormSection: React.FC<NextOfKinFormSectionProps> = ({ control }) => (
  <div className="space-y-4 md:col-span-1">
    <h3 className="text-lg font-medium">Next of Kin Details</h3>
    <div className="grid gap-4">
      <FormField
        control={control}
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
        control={control}
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
        control={control}
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
        control={control}
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
        control={control}
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
);

export default NextOfKinFormSection;
