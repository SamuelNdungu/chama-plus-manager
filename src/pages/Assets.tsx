
import AppLayout from "@/components/layout/AppLayout";
import { useChama } from "@/context/ChamaContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, TrendingDown, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const Assets = () => {
  const { assets, isLoading } = useChama();
  const navigate = useNavigate();
  
  if (isLoading) {
    return (
      <AppLayout title="Assets">
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse-subtle">Loading assets...</div>
        </div>
      </AppLayout>
    );
  }
  
  const calculateROI = (purchaseValue: number, currentValue: number) => {
    const roi = ((currentValue - purchaseValue) / purchaseValue) * 100;
    return roi.toFixed(2);
  };
  
  return (
    <AppLayout title="Assets">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Assets & Investments</CardTitle>
          <Button 
            size="sm" 
            className="bg-chama-purple hover:bg-chama-dark-purple"
            onClick={() => navigate('/assets/add')}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Asset
          </Button>
        </CardHeader>
        <CardContent>
          {assets.length > 0 ? (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
              {assets.map(asset => {
                const roi = Number(calculateROI(asset.purchaseValue, asset.currentValue));
                const isPositiveROI = roi >= 0;
                
                return (
                  <div key={asset.id} className="border rounded-lg overflow-hidden">
                    <div className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-lg">{asset.name}</h3>
                          <Badge className="mt-1">
                            {asset.type}
                          </Badge>
                        </div>
                        
                        <div className={`flex items-center ${isPositiveROI ? 'text-green-600' : 'text-red-600'}`}>
                          {isPositiveROI ? (
                            <TrendingUp size={16} className="mr-1" />
                          ) : (
                            <TrendingDown size={16} className="mr-1" />
                          )}
                          <span>{roi}%</span>
                        </div>
                      </div>
                      
                      <p className="mt-2 text-sm text-gray-600">{asset.description}</p>
                      
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-500">Purchase Value</p>
                          <p className="font-medium">KSh {asset.purchaseValue.toLocaleString()}</p>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-500">Current Value</p>
                          <p className="font-medium">KSh {asset.currentValue.toLocaleString()}</p>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <p className="text-sm text-gray-500">Purchase Date</p>
                        <p>{asset.purchaseDate}</p>
                      </div>

                      {asset.location && (
                        <div className="mt-4">
                          <p className="text-sm text-gray-500">Location</p>
                          <p>{asset.location}</p>
                        </div>
                      )}
                      
                      {asset.documents && asset.documents.length > 0 && (
                        <div className="mt-4 flex items-center text-chama-purple">
                          <FileText size={16} className="mr-2" />
                          <span>{asset.documents.length} document{asset.documents.length !== 1 ? 's' : ''}</span>
                        </div>
                      )}

                      {asset.documentUrl && (
                        <div className="mt-4 flex items-center text-chama-purple">
                          <FileText size={16} className="mr-2" />
                          <a href={asset.documentUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                            View Document
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No assets or investments recorded yet</p>
              <Button 
                className="mt-4 bg-chama-purple hover:bg-chama-dark-purple"
                onClick={() => navigate('/assets/add')}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Asset
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default Assets;
