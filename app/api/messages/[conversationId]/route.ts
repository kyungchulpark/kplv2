import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

interface SendMessageRequest {
  content: string;
}

interface MarkAsReadRequest {
  // No body needed, conversationId comes from URL
}

/**
 * GET /api/messages/[conversationId]
 * Get messages for a conversation
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is part of this conversation
    const { data: conversation } = await supabase
      .from("dm_conversations")
      .select("user1_id, user2_id")
      .eq("id", conversationId)
      .single();

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    if (conversation.user1_id !== user.id && conversation.user2_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Get messages with sender info
    const { data: messages, error } = await supabase
      .from("dm_messages")
      .select(`
        id,
        conversation_id,
        sender_id,
        content,
        is_read,
        sent_at,
        sender:profiles!dm_messages_sender_id_fkey(id, psn_id, avatar_url)
      `)
      .eq("conversation_id", conversationId)
      .order("sent_at", { ascending: true })
      .limit(100); // Load last 100 messages

    if (error) {
      console.error("[Messages API] Error fetching messages:", error);
      return NextResponse.json(
        { error: "Failed to fetch messages" },
        { status: 500 }
      );
    }

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error("[Messages API] GET error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/messages/[conversationId]
 * Send a new message in the conversation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: SendMessageRequest = await request.json();
    const { content } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { error: "Message too long (max 2000 characters)" },
        { status: 400 }
      );
    }

    // Verify user is part of this conversation
    const { data: conversation } = await supabase
      .from("dm_conversations")
      .select("user1_id, user2_id")
      .eq("id", conversationId)
      .single();

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    if (conversation.user1_id !== user.id && conversation.user2_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Send the message
    const { data: message, error: insertError } = await supabase
      .from("dm_messages")
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: content.trim(),
      })
      .select(`
        id,
        conversation_id,
        sender_id,
        content,
        is_read,
        sent_at,
        sender:profiles!dm_messages_sender_id_fkey(id, psn_id, avatar_url)
      `)
      .single();

    if (insertError) {
      console.error("[Messages API] Error sending message:", insertError);
      return NextResponse.json(
        { error: "Failed to send message" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch (error: any) {
    console.error("[Messages API] POST error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/messages/[conversationId]
 * Mark all messages in conversation as read
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify user is part of this conversation
    const { data: conversation } = await supabase
      .from("dm_conversations")
      .select("user1_id, user2_id")
      .eq("id", conversationId)
      .single();

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    if (conversation.user1_id !== user.id && conversation.user2_id !== user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Mark conversation as read using database function
    const { error: rpcError } = await supabase.rpc("mark_conversation_as_read", {
      p_conversation_id: conversationId,
      p_user_id: user.id,
    });

    if (rpcError) {
      console.error("[Messages API] Error marking as read:", rpcError);
      return NextResponse.json(
        { error: "Failed to mark as read" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Messages API] PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}
