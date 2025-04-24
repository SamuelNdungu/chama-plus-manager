
import AppLayout from "@/components/layout/AppLayout";
import AddContributionForm from "@/pages/add-contribution/AddContributionForm";

const AddContribution = () => (
  <AppLayout title="Record New Contribution">
    <div className="max-w-6xl mx-auto">
      <AddContributionForm />
    </div>
  </AppLayout>
);

export default AddContribution;
