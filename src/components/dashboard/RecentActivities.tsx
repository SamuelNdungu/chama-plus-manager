
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useChama } from "@/context/ChamaContext";
import { formatDistanceToNow } from "date-fns";
import { CreditCard, UserPlus, FilePlus, Calendar } from "lucide-react";
import type { Contribution, Document, Meeting, Member } from "@/types";

type Activity =
  | { id: string; type: "contribution"; date: Date; data: Contribution }
  | { id: string; type: "member"; date: Date; data: Member }
  | { id: string; type: "document"; date: Date; data: Document }
  | { id: string; type: "meeting"; date: Date; data: Meeting };

const RecentActivities = () => {
  const { contributions, members, documents, meetings } = useChama();

  // Create a combined array of recent activities
  const activities: Activity[] = [
    ...contributions.map(contribution => ({
      id: contribution.id,
      type: 'contribution',
      date: new Date(contribution.date),
      data: contribution,
    })),
    ...members.map(member => ({
      id: member.id,
      type: 'member',
      date: new Date(member.joinedAt),
      data: member,
    })),
    ...documents.map(document => ({
      id: document.id,
      type: 'document',
      date: new Date(document.uploadedAt),
      data: document,
    })),
    ...meetings.map(meeting => ({
      id: meeting.id,
      type: 'meeting',
      date: new Date(meeting.date),
      data: meeting,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime())
   .slice(0, 5);

  const getMemberName = (memberId: string) => {
    const member = members.find(m => m.id === memberId);
    return member?.name || 'Unknown Member';
  };

  const renderActivityIcon = (type: string) => {
    switch (type) {
      case 'contribution':
        return <CreditCard className="w-5 h-5 text-chama-purple" />;
      case 'member':
        return <UserPlus className="w-5 h-5 text-green-500" />;
      case 'document':
        return <FilePlus className="w-5 h-5 text-blue-500" />;
      case 'meeting':
        return <Calendar className="w-5 h-5 text-orange-500" />;
      default:
        return null;
    }
  };

  const renderActivityContent = (activity: Activity) => {
    switch (activity.type) {
      case 'contribution':
        return (
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium">New Contribution</p>
              <p className="text-sm text-gray-500">
                {getMemberName(activity.data.memberId)} contributed KSh {activity.data.amount.toLocaleString()}
              </p>
            </div>
            <span className={`px-2 py-1 text-xs rounded-full ${
              activity.data.status === 'Paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {activity.data.status}
            </span>
          </div>
        );
      case 'member':
        return (
          <div>
            <p className="font-medium">New Member</p>
            <p className="text-sm text-gray-500">
              {activity.data.name} joined as {activity.data.role}
            </p>
          </div>
        );
      case 'document':
        return (
          <div>
            <p className="font-medium">{activity.data.name}</p>
            <p className="text-sm text-gray-500">
              New {activity.data.type} document uploaded
            </p>
          </div>
        );
      case 'meeting':
        return (
          <div>
            <p className="font-medium">{activity.data.title}</p>
            <p className="text-sm text-gray-500">
              {new Date(activity.data.date) > new Date() ? 'Scheduled for' : 'Held on'} {activity.data.date} at {activity.data.time}
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activities</CardTitle>
        <CardDescription>Latest updates from your chama</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          {activities.length > 0 ? (
            activities.map(activity => (
              <div key={`${activity.type}-${activity.id}`} className="flex items-start gap-4">
                <div className="bg-muted p-2 rounded-full">
                  {renderActivityIcon(activity.type)}
                </div>
                <div className="flex-1">
                  {renderActivityContent(activity)}
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDistanceToNow(activity.date, { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No recent activities</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentActivities;
