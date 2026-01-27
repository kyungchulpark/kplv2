import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

type BroadcastRequest = {
  content: string;
};

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * POST /api/admin/messages/broadcast
 * Send a notice-style DM to every user from the current admin.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, psn_id")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = (await request.json()) as BroadcastRequest;
    const rawContent = body?.content?.trim();

    if (!rawContent) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    const noticeContent = `[Notice] ${rawContent}`;
    if (noticeContent.length > 2000) {
      return NextResponse.json(
        { error: "Message too long (max 2000 characters including prefix)" },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // Load all recipients except the current admin
    const recipients: { id: string }[] = [];
    const pageSize = 1000;
    let from = 0;
    while (true) {
      const to = from + pageSize - 1;
      const { data, error } = await adminClient
        .from("profiles")
        .select("id")
        .neq("id", user.id)
        .range(from, to);

      if (error) {
        console.error("[Broadcast API] Failed to load recipients:", error);
        return NextResponse.json(
          { error: "Failed to load recipients" },
          { status: 500 }
        );
      }

      const batch = (data || []) as { id: string }[];
      recipients.push(...batch);
      if (batch.length < pageSize) break;
      from += pageSize;
    }

    if (recipients.length === 0) {
      try {
        await adminClient.from("broadcast_notices").insert({
          sender_id: user.id,
          content: noticeContent,
          total_recipients: 0,
          delivered: 0,
          failed: 0,
          failure_samples: [],
        });
      } catch (historyError) {
        console.error("[Broadcast API] Failed to save notice history:", historyError);
      }

      return NextResponse.json({
        success: true,
        totalRecipients: 0,
        delivered: 0,
        failed: 0,
      });
    }

    let delivered = 0;
    const failures: Array<{ userId: string; error: string }> = [];

    // Process in chunks to avoid overwhelming the DB
    for (const recipientChunk of chunkArray(recipients, 25)) {
      // 1) Ensure conversations exist (or create them)
      const conversationResults = await Promise.all(
        recipientChunk.map(async (recipient) => {
          const { data: conversationId, error } = await adminClient.rpc(
            "get_or_create_conversation",
            {
              p_user1_id: user.id,
              p_user2_id: recipient.id,
            }
          );

          if (error || !conversationId) {
            failures.push({
              userId: recipient.id,
              error: error?.message || "Failed to create conversation",
            });
            return null;
          }

          return {
            recipient_id: recipient.id,
            conversation_id: conversationId as string,
            sender_id: user.id,
            content: noticeContent,
          };
        })
      );

      const conversationPayload = conversationResults.filter(Boolean) as Array<{
        recipient_id: string;
        conversation_id: string;
        sender_id: string;
        content: string;
      }>;

      if (conversationPayload.length === 0) continue;

      const insertPayload = conversationPayload.map(
        ({ conversation_id, sender_id, content }) => ({
          conversation_id,
          sender_id,
          content,
        })
      );

      // 2) Insert broadcast messages
      const { error: insertError, data: inserted } = await adminClient
        .from("dm_messages")
        .insert(insertPayload)
        .select("id");

      if (insertError) {
        console.error("[Broadcast API] Failed to insert messages:", insertError);
        conversationPayload.forEach((payload) => {
          failures.push({
            userId: payload.recipient_id,
            error: insertError.message,
          });
        });
        continue;
      }

      delivered += (inserted || []).length || insertPayload.length;
    }

    const failureSamples = failures.slice(0, 20);

    try {
      await adminClient.from("broadcast_notices").insert({
        sender_id: user.id,
        content: noticeContent,
        total_recipients: recipients.length,
        delivered,
        failed: failures.length,
        failure_samples: failureSamples,
      });
    } catch (historyError) {
      console.error("[Broadcast API] Failed to save notice history:", historyError);
    }

    return NextResponse.json({
      success: true,
      totalRecipients: recipients.length,
      delivered,
      failed: failures.length,
      failures: failureSamples,
    });
  } catch (error: any) {
    console.error("[Broadcast API] POST error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
