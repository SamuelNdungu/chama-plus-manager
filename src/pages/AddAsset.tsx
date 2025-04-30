
import React from 'react';
import AppLayout from "@/components/layout/AppLayout";
import AddAssetForm from "@/pages/add-asset/AddAssetForm";

const AddAsset = () => (
  <AppLayout title="Add New Asset">
    <div className="max-w-6xl mx-auto">
      <AddAssetForm />
    </div>
  </AppLayout>
);

export default AddAsset;
