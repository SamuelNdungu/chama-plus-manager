
import React from "react";
import AppLayout from "@/components/layout/AppLayout";
import AddMemberForm from "./add-member/AddMemberForm";

const AddMember = () => (
  <AppLayout title="Add New Member">
    <div className="max-w-6xl mx-auto">
      <AddMemberForm />
    </div>
  </AppLayout>
);

export default AddMember;
