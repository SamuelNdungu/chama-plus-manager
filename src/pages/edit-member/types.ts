
import * as z from "zod";

export const formSchema = z.object({
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

export type MemberFormType = z.infer<typeof formSchema>;
