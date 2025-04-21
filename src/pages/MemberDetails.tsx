
import { useParams, useNavigate } from "react-router-dom";
import { useChama } from "@/context/ChamaContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";

const MemberDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { members } = useChama();
  const navigate = useNavigate();

  const member = members.find((m) => m.id === id);

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
            <div>
              <CardTitle>{member.name}</CardTitle>
              <div className="text-gray-500 text-sm">{member.role}</div>
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
    </div>
  );
};

export default MemberDetails;

