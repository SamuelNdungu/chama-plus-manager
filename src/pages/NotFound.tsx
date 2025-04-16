
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center p-6 bg-white rounded-lg shadow-md max-w-md">
        <h1 className="text-4xl font-bold mb-2 text-chama-purple">404</h1>
        <p className="text-xl text-gray-700 mb-6">Oops! Page not found</p>
        <p className="text-gray-500 mb-6">
          The page you are looking for might have been removed or is temporarily unavailable.
        </p>
        <Button 
          onClick={() => navigate('/dashboard')}
          className="bg-chama-purple hover:bg-chama-dark-purple"
        >
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
