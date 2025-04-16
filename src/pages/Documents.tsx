
import AppLayout from "@/components/layout/AppLayout";
import { useChama } from "@/context/ChamaContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  FileText, 
  FilePlus,
  FileSpreadsheet, 
  File,
  Download,
  Calendar
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

const Documents = () => {
  const { documents, isLoading } = useChama();
  const [search, setSearch] = useState("");
  
  if (isLoading) {
    return (
      <AppLayout title="Documents">
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse-subtle">Loading documents...</div>
        </div>
      </AppLayout>
    );
  }
  
  // Filter documents based on search
  const filteredDocuments = documents.filter(doc => {
    return (
      doc.name.toLowerCase().includes(search.toLowerCase()) ||
      doc.type.toLowerCase().includes(search.toLowerCase())
    );
  });
  
  // Group documents by type
  const groupedDocuments = filteredDocuments.reduce((acc, doc) => {
    if (!acc[doc.type]) {
      acc[doc.type] = [];
    }
    acc[doc.type].push(doc);
    return acc;
  }, {} as Record<string, typeof documents>);
  
  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'Constitution':
        return <FileText className="h-6 w-6" />;
      case 'Agreement':
        return <FilePlus className="h-6 w-6" />;
      case 'Title':
        return <FileSpreadsheet className="h-6 w-6" />;
      case 'Minutes':
        return <Calendar className="h-6 w-6" />;
      default:
        return <File className="h-6 w-6" />;
    }
  };
  
  const getDocumentTypeColor = (type: string) => {
    switch (type) {
      case 'Constitution':
        return "bg-purple-100 text-purple-800";
      case 'Agreement':
        return "bg-blue-100 text-blue-800";
      case 'Title':
        return "bg-green-100 text-green-800";
      case 'Minutes':
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  return (
    <AppLayout title="Documents">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Documents</CardTitle>
          <Button 
            size="sm" 
            className="bg-chama-purple hover:bg-chama-dark-purple"
          >
            <Plus className="mr-2 h-4 w-4" />
            Upload Document
          </Button>
        </CardHeader>
        <CardContent>
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input 
              placeholder="Search documents..." 
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          {Object.keys(groupedDocuments).length > 0 ? (
            <div className="space-y-8">
              {Object.entries(groupedDocuments).map(([type, docs]) => (
                <div key={type}>
                  <h3 className="font-medium text-lg mb-4">{type} Documents</h3>
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                    {docs.map(doc => (
                      <div key={doc.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <Badge className={getDocumentTypeColor(doc.type)}>
                            {doc.type}
                          </Badge>
                          <Button variant="ghost" size="icon">
                            <Download size={16} />
                          </Button>
                        </div>
                        
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-gray-100 rounded">
                            {getDocumentIcon(doc.type)}
                          </div>
                          <div>
                            <h4 className="font-medium truncate">{doc.name}</h4>
                            <p className="text-xs text-gray-500">
                              Uploaded on {doc.uploadedAt}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No documents found</p>
              <Button 
                className="mt-4 bg-chama-purple hover:bg-chama-dark-purple"
              >
                <Plus className="mr-2 h-4 w-4" />
                Upload Your First Document
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default Documents;
