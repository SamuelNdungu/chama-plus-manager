
import { useState } from "react";
import { useChama } from "@/context/ChamaContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, MapPin, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import type { Meeting } from "@/types";

const MeetingsList = () => {
  const navigate = useNavigate();
  const { meetings } = useChama();
  const [search, setSearch] = useState("");

  // Filter meetings based on search
  const filteredMeetings = meetings.filter(meeting => {
    return (
      meeting.title.toLowerCase().includes(search.toLowerCase()) ||
      meeting.location.toLowerCase().includes(search.toLowerCase()) ||
      meeting.date.includes(search) ||
      meeting.agenda.toLowerCase().includes(search.toLowerCase())
    );
  });

  // Separate upcoming and past meetings
  const today = new Date();
  const upcomingMeetings = filteredMeetings.filter(
    meeting => new Date(meeting.date) >= today
  ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const pastMeetings = filteredMeetings.filter(
    meeting => new Date(meeting.date) < today
  ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const isMeetingToday = (date: string) => {
    const meetingDate = new Date(date);
    return (
      meetingDate.getDate() === today.getDate() &&
      meetingDate.getMonth() === today.getMonth() &&
      meetingDate.getFullYear() === today.getFullYear()
    );
  };

  const renderMeetingCard = (meeting: Meeting) => {
    const isToday = isMeetingToday(meeting.date);
    
    return (
      <div 
        key={meeting.id}
        className="border rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => navigate(`/meetings/${meeting.id}`)}
      >
        <div className="p-4">
          <div className="flex justify-between items-start">
            <h3 className="font-medium text-lg">{meeting.title}</h3>
            {isToday && (
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                Today
              </Badge>
            )}
          </div>
          
          <div className="mt-2 space-y-2">
            <div className="flex items-center text-gray-600">
              <Clock size={16} className="mr-2" />
              <span>{meeting.date} at {meeting.time}</span>
            </div>
            
            <div className="flex items-center text-gray-600">
              <MapPin size={16} className="mr-2" />
              <span>{meeting.location}</span>
            </div>
          </div>
          
          {meeting.agenda && (
            <div className="mt-4">
              <h4 className="text-sm font-medium mb-1">Agenda</h4>
              <p className="text-sm text-gray-600 line-clamp-2">{meeting.agenda}</p>
            </div>
          )}
          
          {meeting.attendees && (
            <div className="mt-4 flex items-center">
              <span className="text-sm text-gray-500">
                {meeting.attendees.length} attendees
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Meetings</CardTitle>
        <Button 
          size="sm" 
          className="bg-chama-purple hover:bg-chama-dark-purple"
          onClick={() => navigate('/meetings/add')}
        >
          <Plus className="mr-2 h-4 w-4" />
          Schedule Meeting
        </Button>
      </CardHeader>
      <CardContent>
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input 
            placeholder="Search meetings..." 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {upcomingMeetings.length > 0 && (
          <>
            <h3 className="font-medium text-lg mb-4">Upcoming Meetings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {upcomingMeetings.map(renderMeetingCard)}
            </div>
          </>
        )}

        {pastMeetings.length > 0 && (
          <>
            <h3 className="font-medium text-lg mb-4">Past Meetings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pastMeetings.map(renderMeetingCard)}
            </div>
          </>
        )}

        {filteredMeetings.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No meetings found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MeetingsList;
