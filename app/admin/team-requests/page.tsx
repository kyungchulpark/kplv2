import { createClient } from "@/utils/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { TeamRequestActions } from "@/components/admin/team-request-actions";

export default async function TeamRequestsPage() {
  const supabase = await createClient();

  const { data: requests } = await supabase
    .from("team_requests")
    .select(
      `
      *,
      season:seasons(name),
      requester:profiles!team_requests_requester_id_fkey(psn_id, email, avatar_url),
      reviewer:profiles!team_requests_reviewed_by_fkey(psn_id)
    `
    )
    .order("created_at", { ascending: false });

  const pendingRequests = requests?.filter((r) => r.status === "pending") || [];
  const approvedRequests = requests?.filter((r) => r.status === "approved") || [];
  const rejectedRequests = requests?.filter((r) => r.status === "rejected") || [];

  const renderRequestCard = (request: any) => (
    <Card key={request.id}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle>{request.team_name}</CardTitle>
            <CardDescription>
              {request.season?.name || "리그 참가 대기 (시즌 미배정)"}
            </CardDescription>
          </div>
          {request.status === "pending" && (
            <Badge variant="outline" className="border-orange-500 text-orange-500">
              <Clock className="mr-1 h-3 w-3" />
              Pending
            </Badge>
          )}
          {request.status === "approved" && (
            <Badge variant="outline" className="border-green-500 text-green-500">
              <CheckCircle className="mr-1 h-3 w-3" />
              Approved
            </Badge>
          )}
          {request.status === "rejected" && (
            <Badge variant="outline" className="border-red-500 text-red-500">
              <XCircle className="mr-1 h-3 w-3" />
              Rejected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Requester Info */}
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={request.requester.avatar_url || undefined} />
            <AvatarFallback className="bg-nba-red text-white">
              {request.requester.psn_id.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{request.requester.psn_id}</p>
            <p className="text-xs text-muted-foreground">
              {request.requester.email}
            </p>
          </div>
        </div>

        {/* Team Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Conference:</span>
            <p className="font-semibold">{request.conference || "N/A"}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Requested:</span>
            <p className="font-semibold">
              {new Date(request.created_at).toLocaleDateString("ko-KR")}
            </p>
          </div>
        </div>

        {/* Logo Preview */}
        {request.logo_url && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">Logo:</p>
            <img
              src={request.logo_url}
              alt={request.team_name}
              className="h-16 w-16 object-contain rounded border"
            />
          </div>
        )}

        {/* Rejection Reason */}
        {request.status === "rejected" && request.rejection_reason && (
          <div className="rounded-lg bg-destructive/10 p-3">
            <p className="text-sm font-medium text-destructive mb-1">
              Rejection Reason:
            </p>
            <p className="text-sm">{request.rejection_reason}</p>
          </div>
        )}

        {/* Reviewer Info */}
        {request.reviewed_by && request.reviewer && (
          <div className="text-xs text-muted-foreground border-t pt-3">
            Reviewed by {request.reviewer.psn_id} on{" "}
            {new Date(request.reviewed_at).toLocaleDateString("ko-KR")}
          </div>
        )}

        {/* Actions */}
        {request.status === "pending" && (
          <TeamRequestActions
            requestId={request.id}
            teamName={request.team_name}
            seasonId={request.season_id}
            requesterId={request.requester_id}
            conference={request.conference}
            logoUrl={request.logo_url}
          />
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Team Requests</h1>
        <p className="text-muted-foreground">팀 생성 요청 관리</p>
      </div>

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">
            Pending ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved ({approvedRequests.length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            Rejected ({rejectedRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {pendingRequests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingRequests.map(renderRequestCard)}
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">대기 중인 요청이 없습니다</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          {approvedRequests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {approvedRequests.map(renderRequestCard)}
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">승인된 요청이 없습니다</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="mt-6">
          {rejectedRequests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rejectedRequests.map(renderRequestCard)}
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">거부된 요청이 없습니다</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
