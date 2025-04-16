
import { useState } from "react";
import { useChama } from "@/context/ChamaContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

const ContributionsList = () => {
  const navigate = useNavigate();
  const { contributions, members } = useChama();
  const [search, setSearch] = useState("");

  // Get member name for each contribution
  const getMemberName = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    return member ? member.name : "Unknown Member";
  };

  // Filter contributions based on search
  const filteredContributions = contributions.filter(contribution => {
    const memberName = getMemberName(contribution.memberId);
    return (
      memberName.toLowerCase().includes(search.toLowerCase()) ||
      contribution.amount.toString().includes(search) ||
      contribution.date.includes(search)
    );
  });

  // Sort contributions by date (most recent first)
  const sortedContributions = [...filteredContributions].sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Contributions</CardTitle>
        <Button 
          size="sm" 
          className="bg-chama-purple hover:bg-chama-dark-purple"
          onClick={() => navigate('/contributions/add')}
        >
          <Plus className="mr-2 h-4 w-4" />
          Record Contribution
        </Button>
      </CardHeader>
      <CardContent>
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input 
            placeholder="Search contributions..." 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2 font-medium">Member</th>
                <th className="pb-2 font-medium">Amount</th>
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Status</th>
                <th className="pb-2 font-medium">Payment Method</th>
              </tr>
            </thead>
            <tbody>
              {sortedContributions.length > 0 ? (
                sortedContributions.map(contribution => (
                  <tr 
                    key={contribution.id} 
                    className="border-b hover:bg-gray-50 cursor-pointer"
                    onClick={() => navigate(`/contributions/${contribution.id}`)}
                  >
                    <td className="py-3">{getMemberName(contribution.memberId)}</td>
                    <td className="py-3">KSh {contribution.amount.toLocaleString()}</td>
                    <td className="py-3">{contribution.date}</td>
                    <td className="py-3">
                      <Badge className={contribution.status === 'Paid' ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'}>
                        {contribution.status}
                      </Badge>
                    </td>
                    <td className="py-3">{contribution.paymentMethod || "–"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-500">
                    No contributions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ContributionsList;
