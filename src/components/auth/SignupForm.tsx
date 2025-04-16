
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';

const SignupForm = () => {
  const navigate = useNavigate();
  const { signup, isLoading } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || !phone || !password || !confirmPassword) {
      return toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
    }
    
    if (password !== confirmPassword) {
      return toast({
        title: 'Error',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
    }
    
    try {
      await signup(name, email, phone, password);
      toast({
        title: 'Success',
        description: 'Account created successfully',
      });
      navigate('/dashboard');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create account',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input 
          id="name"
          type="text" 
          placeholder="John Doe" 
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input 
          id="email"
          type="email" 
          placeholder="yourname@example.com" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input 
          id="phone"
          type="tel" 
          placeholder="+254712345678" 
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input 
          id="password"
          type="password" 
          placeholder="••••••••" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input 
          id="confirmPassword"
          type="password" 
          placeholder="••••••••" 
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
      </div>
      
      <Button 
        type="submit" 
        className="w-full bg-chama-purple hover:bg-chama-dark-purple" 
        disabled={isLoading}
      >
        {isLoading ? 'Creating account...' : 'Sign Up'}
      </Button>
      
      <div className="text-center text-sm">
        Already have an account?{' '}
        <a
          onClick={() => navigate('/login')} 
          className="text-chama-purple hover:underline cursor-pointer"
        >
          Sign in
        </a>
      </div>
    </form>
  );
};

export default SignupForm;
