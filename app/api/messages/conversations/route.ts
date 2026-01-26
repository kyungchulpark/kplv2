import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

interface CreateConversationRequest {
  otherUserId: string;
}

/**
 * GET /api/messages/conversations
 * Get all conversations for the current user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get conversations where user is participant
    const { data: conversations, error } = await supabase
      .from("dm_conversations")
      .select(`
        id,
        user1_id,
        user2_id,
        last_message_at,
        created_at,
        user1:profiles!dm_conversations_user1_id_fkey(id, psn_id, avatar_url),
        user2:profiles!dm_conversations_user2_id_fkey(id, psn_id, avatar_url)
      `)
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (error) {
      console.error("[Messages API] Error fetching conversations:", error);
      return NextResponse.json(
        { error: "Failed to fetch conversations" },
        { status: 500 }
      );
    }

    // Get unread counts for each conversation
    const { data: unreadCounts } = await supabase
      .from("dm_unread_counts")
      .select("conversation_id, unread_count")
      .eq("user_id", user.id);

    const unreadMap = new Map(
      unreadCounts?.map((uc) => [uc.conversation_id, uc.unread_count]) || []
    );

    // Get last message for each conversation
    const conversationIds = conversations?.map((c) => c.id) || [];
    const { data: lastMessages } = conversationIds.length > 0
      ? await supabase
          .from("dm_messages")
          .select("conversation_id, content, sent_at, sender_id")
          .in("conversation_id", conversationIds)
          .order("sent_at", { ascending: false })
      : { data: [] };

    // Group last messages by conversation
    const lastMessageMap = new Map();
    lastMessages?.forEach((msg) => {
      if (!lastMessageMap.has(msg.conversation_id)) {
        lastMessageMap.set(msg.conversation_id, msg);
      }
    });

    // Format conversations with other user info
    const formattedConversations = conversations?.map((conv) => {
      const otherUser =
        conv.user1_id === user.id ? conv.user2 : conv.user1;
      const lastMessage = lastMessageMap.get(conv.id);

      return {
        id: conv.id,
        otherUser,
        lastMessage: lastMessage
          ? {
              content: lastMessage.content,
              sentAt: lastMessage.sent_at,
              isFromMe: lastMessage.sender_id === user.id,
            }
          : null,
        lastMessageAt: conv.last_message_at,
        unreadCount: unreadMap.get(conv.id) || 0,
        createdAt: conv.created_at,
      };
    }) || [];

    return NextResponse.json({ conversations: formattedConversations });
  } catch (error: any) {
    console.error("[Messages API] GET error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/messages/conversations
 * Create or get existing conversation with another user
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

    const body: CreateConversationRequest = await request.json();
    const { otherUserId } = body;

    if (!otherUserId) {
      return NextResponse.json(
        { error: "otherUserId is required" },
        { status: 400 }
      );
    }

    if (otherUserId === user.id) {
      return NextResponse.json(
        { error: "Cannot create conversation with yourself" },
        { status: 400 }
      );
    }

    // Check if other user exists
    const { data: otherUserProfile } = await supabase
      .from("profiles")
      .select("id, psn_id, avatar_url")
      .eq("id", otherUserId)
      .single();

    if (!otherUserProfile) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get or create conversation using database function
    const { data: conversationId, error: rpcError } = await supabase.rpc(
      "get_or_create_conversation",
      {
        p_user1_id: user.id,
        p_user2_id: otherUserId,
      }
    );

    if (rpcError) {
      console.error("[Messages API] Error creating conversation:", rpcError);
      return NextResponse.json(
        { error: "Failed to create conversation" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      conversation: {
        id: conversationId,
        otherUser: otherUserProfile,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error("[Messages API] POST error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
