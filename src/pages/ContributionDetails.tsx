import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useChama } from "@/context/ChamaContext";

const ContributionDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { contributions, members } = useChama();

  const contribution = contributions.find((c) => c.id === id);
  const member = members.find((m) => m.id === contribution?.memberId);

  if (!contribution) {
    return (
      <AppLayout title="Contribution Details">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contribution not found</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                The contribution you are looking for does not exist.
              </p>
              <Button
                className="mt-4 bg-chama-purple hover:bg-chama-dark-purple"
                onClick={() => navigate("/contributions")}
              >
                Back to Contributions
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Contribution Details">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Contribution #{contribution.id}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Member</p>
              <p>{member?.name || "Unknown"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Amount</p>
              <p>KSh {contribution.amount.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p>{contribution.date}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p>{contribution.status}</p>
            </div>
            {contribution.paymentMethod && (
              <div>
                <p className="text-sm text-muted-foreground">Payment Method</p>
                <p>{contribution.paymentMethod}</p>
              </div>
            )}
            {contribution.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Notes</p>
                <p>{contribution.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
        <Button
          variant="outline"
          onClick={() => navigate("/contributions")}
        >
          Back to Contributions
        </Button>
      </div>
    </AppLayout>
  );
};

export default ContributionDetails;
