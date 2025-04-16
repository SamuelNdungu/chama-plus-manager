
import AuthLayout from "@/components/auth/AuthLayout";
import SignupForm from "@/components/auth/SignupForm";

const Signup = () => {
  return (
    <AuthLayout 
      title="Create Your Account" 
      subtitle="Join ChamaPlus to manage your investment groups"
    >
      <SignupForm />
    </AuthLayout>
  );
};

export default Signup;
