
import { useState } from "react";
import { useChama } from "@/context/ChamaContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const MembersList = () => {
  const navigate = useNavigate();
  const { members } = useChama();
  const [search, setSearch] = useState("");

  const filteredMembers = members.filter(member => 
    member.name.toLowerCase().includes(search.toLowerCase()) ||
    member.email.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Chairperson':
        return "bg-purple-100 text-purple-800 hover:bg-purple-100";
      case 'Treasurer':
        return "bg-green-100 text-green-800 hover:bg-green-100";
      case 'Secretary':
        return "bg-blue-100 text-blue-800 hover:bg-blue-100";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-100";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Members</CardTitle>
        <Button 
          size="sm" 
          className="bg-chama-purple hover:bg-chama-dark-purple"
          onClick={() => navigate('/members/add')}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </CardHeader>
      <CardContent>
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input 
            placeholder="Search members..." 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          {filteredMembers.length > 0 ? (
            filteredMembers.map(member => (
              <div 
                key={member.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/members/${member.id}`)}
              >
                <div className="flex items-center gap-4">
                  <Avatar>
                    <AvatarFallback className="bg-chama-purple text-white">
                      {member.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{member.name}</h3>
                    <p className="text-sm text-gray-500">{member.email}</p>
                    <p className="text-sm text-gray-500">{member.phone}</p>
                  </div>
                </div>
                <Badge className={`${getRoleBadgeColor(member.role)}`}>
                  {member.role}
                </Badge>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No members found</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MembersList;
