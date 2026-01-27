import { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/utils/supabase/client";

export interface DMMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  sent_at: string;
  created_at: string;
}

/**
 * Subscribe to new messages in a conversation
 * @param conversationId - Conversation ID to subscribe to
 * @param onMessage - Callback when new message arrives
 * @returns Realtime channel (call unsubscribe() to cleanup)
 */
export function subscribeToConversation(
  conversationId: string,
  onMessage: (message: DMMessage) => void
): RealtimeChannel {
  const supabase = createClient();

  const channel = supabase
    .channel(`conversation:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "dm_messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        console.log("[Realtime] New message received:", payload);
        onMessage(payload.new as DMMessage);
      }
    )
    .subscribe((status) => {
      console.log(`[Realtime] Subscription status for ${conversationId}:`, status);
    });

  return channel;
}

/**
 * Subscribe to conversation list updates (for conversation list view)
 * @param userId - Current user ID
 * @param onConversationUpdate - Callback when conversation is updated
 * @returns Realtime channel
 */
export function subscribeToConversations(
  userId: string,
  onConversationUpdate: () => void
): RealtimeChannel {
  const supabase = createClient();

  const channel = supabase
    .channel(`conversations:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*", // INSERT, UPDATE, DELETE
        schema: "public",
        table: "dm_conversations",
        filter: `user1_id=eq.${userId}`,
      },
      (payload) => {
        console.log("[Realtime] Conversation updated (user1):", payload);
        onConversationUpdate();
      }
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "dm_conversations",
        filter: `user2_id=eq.${userId}`,
      },
      (payload) => {
        console.log("[Realtime] Conversation updated (user2):", payload);
        onConversationUpdate();
      }
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "dm_unread_counts",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        console.log("[Realtime] Unread counts updated:", payload);
        onConversationUpdate();
      }
    )
    .subscribe((status) => {
      console.log(`[Realtime] Conversations subscription status:`, status);
    });

  return channel;
}

/**
 * Subscribe to unread count updates
 * @param userId - Current user ID
 * @param onUnreadUpdate - Callback when unread count changes
 * @returns Realtime channel
 */
export function subscribeToUnreadCounts(
  userId: string,
  onUnreadUpdate: (totalUnread: number) => void
): RealtimeChannel {
  const supabase = createClient();

  const channel = supabase
    .channel(`unread:${userId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "dm_unread_counts",
        filter: `user_id=eq.${userId}`,
      },
      async (payload) => {
        console.log("[Realtime] Unread count updated:", payload);
        // Fetch total unread count
        const { data } = await supabase
          .from("dm_unread_counts")
          .select("unread_count")
          .eq("user_id", userId);

        const total = data?.reduce((sum, row) => sum + row.unread_count, 0) || 0;
        onUnreadUpdate(total);
      }
    )
    .subscribe((status) => {
      console.log(`[Realtime] Unread counts subscription status:`, status);
    });

  return channel;
}

/**
 * Unsubscribe from a channel and remove it
 * @param channel - Realtime channel to unsubscribe
 */
export async function unsubscribeChannel(channel: RealtimeChannel): Promise<void> {
  const supabase = createClient();
  await supabase.removeChannel(channel);
  console.log("[Realtime] Channel unsubscribed");
}

/**
 * Mark messages in a conversation as read
 * @param conversationId - Conversation ID
 * @param userId - Current user ID
 */
export async function markConversationAsRead(
  conversationId: string,
  userId: string
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc("mark_conversation_as_read", {
    p_conversation_id: conversationId,
    p_user_id: userId,
  });

  if (error) {
    console.error("[Realtime] Error marking conversation as read:", error);
  } else {
    console.log(`[Realtime] Conversation ${conversationId} marked as read`);
  }
}
