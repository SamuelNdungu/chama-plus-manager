
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BarChart3, Users, Calendar, DollarSign, Shield } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-chama-light-purple to-white">
      {/* Header/Nav */}
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-chama-dark-purple">ChamaPlus</h1>
        <div className="space-x-2">
          <Button 
            variant="outline" 
            className="border-chama-purple text-chama-purple hover:bg-chama-light-purple"
            onClick={() => navigate('/login')}
          >
            Sign In
          </Button>
          <Button 
            className="bg-chama-purple hover:bg-chama-dark-purple"
            onClick={() => navigate('/signup')}
          >
            Get Started
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
            Modernize Your Chama Management
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            ChamaPlus helps your investment group track contributions, manage meetings, monitor investments, and store documents - all in one place.
          </p>
          <Button 
            className="bg-chama-purple hover:bg-chama-dark-purple text-lg py-6 px-8"
            onClick={() => navigate('/signup')}
          >
            Start Your Chama Journey
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-6 border rounded-xl card-hover">
              <div className="p-3 bg-chama-light-purple rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Users className="text-chama-purple" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Member Management</h3>
              <p className="text-gray-600">
                Track members, assign roles, and maintain detailed profiles including contribution history.
              </p>
            </div>
            
            <div className="p-6 border rounded-xl card-hover">
              <div className="p-3 bg-chama-light-purple rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <DollarSign className="text-chama-purple" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Financial Tracking</h3>
              <p className="text-gray-600">
                Manage contributions, track payments, and send reminders to ensure timely payments.
              </p>
            </div>
            
            <div className="p-6 border rounded-xl card-hover">
              <div className="p-3 bg-chama-light-purple rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Calendar className="text-chama-purple" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Meeting Management</h3>
              <p className="text-gray-600">
                Schedule meetings, track attendance, and store minutes for future reference.
              </p>
            </div>
            
            <div className="p-6 border rounded-xl card-hover">
              <div className="p-3 bg-chama-light-purple rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <BarChart3 className="text-chama-purple" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Investment Tracking</h3>
              <p className="text-gray-600">
                Record and monitor group assets such as land, shares, SACCOs, and calculate returns.
              </p>
            </div>
            
            <div className="p-6 border rounded-xl card-hover">
              <div className="p-3 bg-chama-light-purple rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-chama-purple">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3">Document Storage</h3>
              <p className="text-gray-600">
                Securely store and access important documents like constitutions, agreements, and titles.
              </p>
            </div>
            
            <div className="p-6 border rounded-xl card-hover">
              <div className="p-3 bg-chama-light-purple rounded-full w-12 h-12 flex items-center justify-center mb-4">
                <Shield className="text-chama-purple" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Security & Control</h3>
              <p className="text-gray-600">
                Role-based access ensures only authorized members can view or edit sensitive information.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-chama-dark-purple text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Transform Your Chama?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Join thousands of Chamas across Kenya who are using ChamaPlus to streamline their operations and grow their investments.
          </p>
          <div className="space-x-4">
            <Button 
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-chama-dark-purple"
              onClick={() => navigate('/login')}
            >
              Sign In
            </Button>
            <Button 
              className="bg-white text-chama-dark-purple hover:bg-gray-200"
              onClick={() => navigate('/signup')}
            >
              Create Account
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-gray-800 text-gray-300">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h2 className="text-xl font-bold text-white">ChamaPlus</h2>
              <p className="text-sm">Empowering investment groups across Kenya</p>
            </div>
            <div className="flex space-x-6">
              <a href="#" className="hover:text-white">About</a>
              <a href="#" className="hover:text-white">Features</a>
              <a href="#" className="hover:text-white">Support</a>
              <a href="#" className="hover:text-white">Privacy Policy</a>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-gray-700 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} ChamaPlus. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
