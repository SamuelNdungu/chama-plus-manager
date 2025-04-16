
import AuthLayout from "@/components/auth/AuthLayout";
import LoginForm from "@/components/auth/LoginForm";

const Login = () => {
  return (
    <AuthLayout 
      title="Welcome Back to ChamaPlus" 
      subtitle="Sign in to access your Chama dashboard"
    >
      <LoginForm />
    </AuthLayout>
  );
};

export default Login;
