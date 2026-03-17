
import AuthLayout from "@/components/auth/AuthLayout";
import SignupForm from "@/components/auth/SignupForm";

const Signup = () => {
  return (
    <AuthLayout 
      title="Register New User" 
      subtitle="Create a new user account for your chama organization"
    >
      <SignupForm />
    </AuthLayout>
  );
};

export default Signup;
