import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Pencil, UserPlus, UserCheck } from "lucide-react";
import { useState, useEffect } from "react";
import { apiClient } from "@/services/api";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage } from "@/lib/error";

interface MemberDetail {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  idNumber?: string;
  joinedAt: string;
  hasUserAccount?: boolean;
  userId?: string;
  nextOfKin?: {
    name: string;
    phone: string;
    email: string;
    relationship: string;
    idNumber: string;
  };
}

const MemberDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [member, setMember] = useState<MemberDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch member details on mount
  useEffect(() => {
    const fetchMemberDetails = async () => {
      if (!id) return;
      
      try {
        const response = await apiClient.get<MemberDetail>(`/members/${id}`);
        setMember(response);
      } catch (error) {
        console.error("Error fetching member details:", error);
        toast({
          title: "Error",
          description: "Failed to load member details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMemberDetails();
  }, [id, toast]);

  const validatePassword = (password: string): { isValid: boolean; error?: string } => {
    if (password.length < 8) {
      return { isValid: false, error: 'Password must be at least 8 characters long' };
    }
    if (!/[A-Z]/.test(password)) {
      return { isValid: false, error: 'Password must contain at least 1 uppercase letter' };
    }
    if (!/[a-z]/.test(password)) {
      return { isValid: false, error: 'Password must contain at least 1 lowercase letter' };
    }
    if (!/[0-9]/.test(password)) {
      return { isValid: false, error: 'Password must contain at least 1 number' };
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      return { isValid: false, error: 'Password must contain at least 1 special character' };
    }
    return { isValid: true };
  };

  const handleConvertToUser = async () => {
    if (!username || !password || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      toast({
        title: "Invalid Password",
        description: passwordValidation.error,
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    setIsConverting(true);
    try {
      const response = await apiClient.post(`/members/${id}/convert-to-user`, {
        username,
        password,
      });

      toast({
        title: "Success",
        description: `Member converted to user successfully. Username: ${response.credentials.username}`,
      });

      setShowConvertDialog(false);
      // Refresh member data
      const updatedMember = await apiClient.get<MemberDetail>(`/members/${id}`);
      setMember(updatedMember);
      setUsername("");
      setPassword("");
      setConfirmPassword("");
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(error, "Failed to convert member to user"),
        variant: "destructive",
      });
    } finally {
      setIsConverting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <div className="animate-pulse-subtle">Loading member details...</div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <Users className="mb-4" size={48} />
        <div className="text-lg">Member not found</div>
        <Button className="mt-6" onClick={() => navigate("/members")}>
          Back to Members
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-chama-purple text-white text-2xl">
                {member.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle>{member.name}</CardTitle>
                {member.hasUserAccount ? (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    <UserCheck className="h-3 w-3 mr-1" />
                    Has Login
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    No Login
                  </Badge>
                )}
              </div>
              <div className="text-gray-500 text-sm">{member.role}</div>
            </div>
            <div className="flex gap-2">
              {!member.hasUserAccount && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="border-chama-purple text-chama-purple hover:bg-chama-light-purple"
                  onClick={() => setShowConvertDialog(true)}
                >
                  <UserPlus className="mr-2 h-4 w-4" /> 
                  Convert to User
                </Button>
              )}
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => navigate(`/members/${member.id}/edit`)}
              >
                <Pencil className="mr-2 h-4 w-4" /> 
                Edit
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-400">Email</div>
              <div className="text-base">{member.email}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Phone</div>
              <div className="text-base">{member.phone}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Joined At</div>
              <div className="text-base">{member.joinedAt}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">ID Number</div>
              <div className="text-base">{member.idNumber || "–"}</div>
            </div>
            {member.nextOfKin && (
              <div className="sm:col-span-2 mt-4 border-t pt-4">
                <div className="font-semibold mb-2">Next of Kin</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>{" "}
                    {member.nextOfKin.name || "–"}
                  </div>
                  <div>
                    <span className="text-gray-500">Phone:</span>{" "}
                    {member.nextOfKin.phone || "–"}
                  </div>
                  <div>
                    <span className="text-gray-500">Relationship:</span>{" "}
                    {member.nextOfKin.relationship || "–"}
                  </div>
                  <div>
                    <span className="text-gray-500">Email:</span>{" "}
                    {member.nextOfKin.email || "–"}
                  </div>
                  <div>
                    <span className="text-gray-500">ID Number:</span>{" "}
                    {member.nextOfKin.idNumber || "–"}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end mt-8">
            <Button variant="outline" onClick={() => navigate("/members")}>
              Back to Members
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Convert to User Dialog */}
      <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert Member to User</DialogTitle>
            <DialogDescription>
              Create a login account for {member.name}. They will be able to access the system with these credentials.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Minimum 3 characters
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Must be at least 8 characters with uppercase, lowercase, number, and special character
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConvertDialog(false)}
              disabled={isConverting}
            >
              Cancel
            </Button>
            <Button
              className="bg-chama-purple hover:bg-chama-dark-purple"
              onClick={handleConvertToUser}
              disabled={isConverting}
            >
              {isConverting ? "Converting..." : "Create User Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MemberDetails;
