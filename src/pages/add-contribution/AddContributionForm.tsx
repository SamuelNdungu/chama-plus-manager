
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useChama } from "@/context/ChamaContext";
import { useNavigate } from "react-router-dom";
import { toast } from "@/components/ui/use-toast";
import { Send } from "lucide-react";

const formSchema = z.object({
  memberId: z.string({
    required_error: "Please select a member",
  }),
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  paymentMethod: z.string({
    required_error: "Please select a payment method",
  }),
  status: z.enum(["Paid", "Pending"]),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const AddContributionForm = () => {
  const navigate = useNavigate();
  const { members, recordContribution } = useChama();
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: "Paid",
      notes: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await recordContribution(data);
      toast({
        title: "Success",
        description: "Contribution recorded successfully",
      });
      navigate("/contributions");
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to record contribution",
        variant: "destructive",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto">
        <FormField
          control={form.control}
          name="memberId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Member</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (KSh)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="Enter amount" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="paymentMethod"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Payment Method</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="M-Pesa">M-Pesa</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Add any additional notes" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/contributions")}
          >
            Cancel
          </Button>
          <Button type="submit" className="bg-chama-purple hover:bg-chama-dark-purple">
            <Send className="mr-2 h-4 w-4" />
            Record Contribution
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default AddContributionForm;
