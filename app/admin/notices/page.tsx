import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Megaphone } from "lucide-react";
import { BroadcastNoticeForm } from "@/components/admin/broadcast-notice-form";
import { createClient } from "@/utils/supabase/server";

type BroadcastNoticeRow = {
  id: string;
  content: string;
  total_recipients: number;
  delivered: number;
  failed: number;
  created_at: string;
  sender?: {
    psn_id?: string | null;
  } | null;
  sender_id?: string;
};

export default async function AdminNoticesPage() {
  const supabase = await createClient();

  const { data: notices } = await supabase
    .from("broadcast_notices")
    .select(
      "id, content, total_recipients, delivered, failed, created_at, sender:sender_id(psn_id), sender_id"
    )
    .order("created_at", { ascending: false })
    .limit(20);

  const safeNotices = (notices || []) as BroadcastNoticeRow[];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Megaphone className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Broadcast Notices</h1>
          <p className="text-muted-foreground">
            Send a notice DM to every registered user.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Send Notice</CardTitle>
          <CardDescription>
            Each user will receive a direct message starting with{" "}
            <span className="font-medium">[Notice]</span>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BroadcastNoticeForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Broadcast History</CardTitle>
          <CardDescription>
            Latest 20 notices with delivery counts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {safeNotices.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No broadcast notices yet.
            </p>
          ) : (
            safeNotices.map((notice) => {
              const senderLabel =
                notice.sender?.psn_id || notice.sender_id || "Unknown";
              const sentAt = new Date(notice.created_at).toLocaleString(
                "en-US"
              );

              return (
                <div
                  key={notice.id}
                  className="space-y-2 rounded-lg border p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                    <span>Sender: {senderLabel}</span>
                    <span>{sentAt}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{notice.content}</p>
                  <div className="text-xs text-muted-foreground">
                    Delivered {notice.delivered}/{notice.total_recipients} (failed:{" "}
                    {notice.failed})
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
