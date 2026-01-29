import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";

export default async function MyRequestsPage() {
  const supabase = await createClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/signin");
  }

  // Get user's team requests
  const { data: requests } = await supabase
    .from("team_requests")
    .select(
      `
      *,
      season:seasons(name),
      reviewer:profiles!team_requests_reviewed_by_fkey(psn_id)
    `
    )
    .eq("requester_id", user.id)
    .order("created_at", { ascending: false });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="border-orange-500 text-orange-500">
            <Clock className="mr-1 h-3 w-3" />
            대기중
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="outline" className="border-green-500 text-green-500">
            <CheckCircle className="mr-1 h-3 w-3" />
            승인됨
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="outline" className="border-red-500 text-red-500">
            <XCircle className="mr-1 h-3 w-3" />
            거부됨
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">내 팀 생성 신청</h1>
            <p className="text-muted-foreground">
              신청 내역 및 처리 상태를 확인하세요
            </p>
          </div>
          <Link href="/teams/create">
            <Button>새 팀 신청</Button>
          </Link>
        </div>

        {requests && requests.length > 0 ? (
          <div className="space-y-4">
            {requests.map((request) => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle>{request.team_name}</CardTitle>
                      <CardDescription>{request.season.name}</CardDescription>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Request Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">컨퍼런스:</span>
                      <p className="font-semibold">{request.conference || "미지정"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">신청일:</span>
                      <p className="font-semibold">
                        {new Date(request.created_at).toLocaleDateString("ko-KR")}
                      </p>
                    </div>
                  </div>

                  {/* Logo */}
                  {request.logo_url && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">로고:</p>
                      <img
                          src={request.logo_url}
                          alt={request.team_name}
                          className="h-16 w-16 object-contain rounded border"
                          loading="lazy"
                          decoding="async"
                        />
                    </div>
                  )}

                  {/* Rejection Reason */}
                  {request.status === "rejected" && request.rejection_reason && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <p className="font-semibold mb-1">거부 사유:</p>
                        <p className="text-sm">{request.rejection_reason}</p>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Reviewer Info */}
                  {request.reviewed_by && request.reviewer && (
                    <div className="text-xs text-muted-foreground border-t pt-3">
                      검토자: {request.reviewer.psn_id} | 처리일:{" "}
                      {new Date(request.reviewed_at).toLocaleDateString("ko-KR")}
                    </div>
                  )}

                  {/* Pending Message */}
                  {request.status === "pending" && (
                    <Alert>
                      <Clock className="h-4 w-4" />
                      <AlertDescription>
                        관리자 승인 대기 중입니다. 승인 후 자동으로 팀장으로 지정됩니다.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Approved Message */}
                  {request.status === "approved" && (
                    <Alert className="border-green-600 bg-green-50 dark:bg-green-950/20">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-600">
                        팀이 생성되었습니다! 이제 팀 관리 페이지에서 선수를 추가할 수 있습니다.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">신청 내역이 없습니다</p>
              <Link href="/teams/create">
                <Button>첫 팀 신청하기</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
