"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type BroadcastResponse = {
  success: boolean;
  totalRecipients: number;
  delivered: number;
  failed: number;
  failures?: Array<{ userId: string; error: string }>;
  error?: string;
};

const NOTICE_PREFIX = "[Notice] ";
const MAX_TOTAL_LENGTH = 2000;

export function BroadcastNoticeForm() {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<BroadcastResponse | null>(null);

  const trimmedContent = content.trim();
  const remainingChars = useMemo(() => {
    const totalLength = NOTICE_PREFIX.length + trimmedContent.length;
    return MAX_TOTAL_LENGTH - totalLength;
  }, [trimmedContent]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!trimmedContent) {
      toast.error("Please enter a notice message.");
      return;
    }

    if (remainingChars < 0) {
      toast.error("Notice is too long.");
      return;
    }

    const confirmed = window.confirm(
      "Send this notice to all users? This cannot be undone."
    );

    if (!confirmed) return;

    setSending(true);
    setResult(null);

    try {
      const res = await fetch("/api/admin/messages/broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content: trimmedContent }),
      });

      const data = (await res.json()) as BroadcastResponse;

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to send broadcast notice.");
      }

      setResult(data);
      setContent("");
      router.refresh();

      toast.success(
        `Notice sent to ${data.delivered}/${data.totalRecipients} users.`
      );
    } catch (err: any) {
      console.error("[BroadcastNoticeForm] send error:", err);
      toast.error(err?.message || "Failed to send broadcast notice.");
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="notice-content">Notice Message</Label>
        <Textarea
          id="notice-content"
          placeholder="This will be delivered as a DM to every user."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          disabled={sending}
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Prefix: {NOTICE_PREFIX}</span>
          <span className={remainingChars < 0 ? "text-destructive" : ""}>
            {remainingChars} characters remaining
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={sending}>
          {sending ? "Sending..." : "Send Notice to All Users"}
        </Button>
        {result && (
          <span className="text-sm text-muted-foreground">
            Delivered {result.delivered}/{result.totalRecipients} (failed:{" "}
            {result.failed})
          </span>
        )}
      </div>

      {result?.failures && result.failures.length > 0 && (
        <div className="rounded border border-destructive/30 bg-destructive/5 p-3 text-sm">
          Some messages failed. Check server logs for details.
        </div>
      )}
    </form>
  );
}
