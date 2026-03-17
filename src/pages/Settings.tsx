
import AppLayout from "@/components/layout/AppLayout";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useChama } from "@/context/ChamaContext";
import { useEffect, useState } from "react";
import { toast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { UserPlus } from "lucide-react";

const Settings = () => {
  const { chama, createChama, updateChama, isLoading } = useChama();
  const navigate = useNavigate();
  const [chamaSettings, setChamaSettings] = useState({
    name: chama?.name || '',
    description: chama?.description || '',
    contributionAmount: chama?.monthlyContributionAmount || 0,
    contributionFrequency: chama?.contributionFrequency || 'Monthly',
    fundingGoal: chama?.fundingGoal || 0,
  });
  
  const [notificationSettings, setNotificationSettings] = useState({
    meetingReminders: true,
    contributionReminders: true,
    contributionConfirmations: true,
    newMemberNotifications: true,
    documentUploads: false,
  });

  useEffect(() => {
    setChamaSettings({
      name: chama?.name || '',
      description: chama?.description || '',
      contributionAmount: chama?.monthlyContributionAmount || 0,
      contributionFrequency: chama?.contributionFrequency || 'Monthly',
      fundingGoal: chama?.fundingGoal || 0,
    });
  }, [chama]);

  const handleSaveChamaSettings = async () => {
    try {
      if (chama) {
        await updateChama({
          name: chamaSettings.name,
          description: chamaSettings.description,
          monthlyContributionAmount: chamaSettings.contributionAmount,
          contributionFrequency: chamaSettings.contributionFrequency,
          fundingGoal: chamaSettings.fundingGoal,
        });
      } else {
        await createChama({
          name: chamaSettings.name,
          description: chamaSettings.description,
          monthlyContributionAmount: chamaSettings.contributionAmount,
          contributionFrequency: chamaSettings.contributionFrequency,
          fundingGoal: chamaSettings.fundingGoal,
        });
      }
    } catch (error) {
      console.error('Failed to save chama settings:', error);
      toast({
        title: 'Error',
        description: 'Unable to save chama settings',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <AppLayout title="Settings">
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Chama Settings</CardTitle>
              <CardDescription>
                Configure your chama details and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="chamaName">Chama Name</Label>
                <Input 
                  id="chamaName" 
                  value={chamaSettings.name} 
                  onChange={(e) => setChamaSettings({...chamaSettings, name: e.target.value})} 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="chamaDescription">Description</Label>
                <Input 
                  id="chamaDescription" 
                  value={chamaSettings.description} 
                  onChange={(e) => setChamaSettings({...chamaSettings, description: e.target.value})}
                />
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="contributionAmount">Monthly Contribution (KSh)</Label>
                <Input 
                  id="contributionAmount" 
                  type="number"
                  value={chamaSettings.contributionAmount}
                  onChange={(e) => setChamaSettings({...chamaSettings, contributionAmount: Number(e.target.value)})} 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fundingGoal">Annual Funding Goal (KSh)</Label>
                <Input 
                  id="fundingGoal" 
                  type="number"
                  value={chamaSettings.fundingGoal}
                  onChange={(e) => setChamaSettings({...chamaSettings, fundingGoal: Number(e.target.value)})} 
                />
              </div>
              
              <Button
                className="bg-chama-purple hover:bg-chama-dark-purple"
                onClick={handleSaveChamaSettings}
                disabled={isLoading}
              >
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure when and how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Meeting Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications about upcoming meetings
                  </p>
                </div>
                <Switch 
                  checked={notificationSettings.meetingReminders}
                  onCheckedChange={(checked) => 
                    setNotificationSettings({...notificationSettings, meetingReminders: checked})
                  }
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Contribution Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive reminders when your contribution is due
                  </p>
                </div>
                <Switch 
                  checked={notificationSettings.contributionReminders}
                  onCheckedChange={(checked) => 
                    setNotificationSettings({...notificationSettings, contributionReminders: checked})
                  }
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Contribution Confirmations</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive confirmations when your contribution is recorded
                  </p>
                </div>
                <Switch 
                  checked={notificationSettings.contributionConfirmations}
                  onCheckedChange={(checked) => 
                    setNotificationSettings({...notificationSettings, contributionConfirmations: checked})
                  }
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>New Member Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when new members join the chama
                  </p>
                </div>
                <Switch 
                  checked={notificationSettings.newMemberNotifications}
                  onCheckedChange={(checked) => 
                    setNotificationSettings({...notificationSettings, newMemberNotifications: checked})
                  }
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Document Uploads</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when new documents are uploaded
                  </p>
                </div>
                <Switch 
                  checked={notificationSettings.documentUploads}
                  onCheckedChange={(checked) => 
                    setNotificationSettings({...notificationSettings, documentUploads: checked})
                  }
                />
              </div>
              
              <Button className="mt-4 bg-chama-purple hover:bg-chama-dark-purple">
                Save Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Register new users for your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-chama-light-purple rounded-full">
                    <UserPlus className="h-5 w-5 text-chama-purple" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Register New User</h3>
                    <p className="text-sm text-muted-foreground">
                      Create new user accounts for chama members
                    </p>
                  </div>
                </div>
                <Button 
                  className="bg-chama-purple hover:bg-chama-dark-purple"
                  onClick={() => navigate('/signup')}
                >
                  Register User
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Manage your personal account information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" />
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input id="currentPassword" type="password" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input id="newPassword" type="password" />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
                <Input id="confirmNewPassword" type="password" />
              </div>
              
              <Button className="bg-chama-purple hover:bg-chama-dark-purple">
                Update Account
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default Settings;
