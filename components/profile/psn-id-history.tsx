"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, History } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface PsnIdHistoryEntry {
  id: string;
  old_psn_id: string;
  new_psn_id: string;
  changed_at: string;
}

interface PsnIdHistoryProps {
  userId: string;
  currentPsnId: string;
}

export function PsnIdHistory({ userId, currentPsnId }: PsnIdHistoryProps) {
  const [history, setHistory] = useState<PsnIdHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [oldPsnId, setOldPsnId] = useState("");

  useEffect(() => {
    loadHistory();
  }, [userId]);

  const loadHistory = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("psn_id_history")
        .select("*")
        .eq("user_id", userId)
        .order("changed_at", { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (err) {
      console.error("Failed to load PSN ID history:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddHistory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPsnId.trim()) {
      toast.error("Please enter a previous PSN ID");
      return;
    }

    setIsAdding(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("psn_id_history").insert({
        user_id: userId,
        old_psn_id: oldPsnId.trim(),
        new_psn_id: currentPsnId,
        changed_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast.success("Previous PSN ID added successfully");
      setOldPsnId("");
      setShowAddForm(false);
      loadHistory();
    } catch (err: any) {
      console.error("Failed to add PSN ID history:", err);
      toast.error(err.message || "Failed to add PSN ID history");
    } finally {
      setIsAdding(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              PSN ID History
            </CardTitle>
            <CardDescription>
              Track your previous PSN IDs to maintain match history
            </CardDescription>
          </div>
          {!showAddForm && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Previous ID
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showAddForm && (
          <form onSubmit={handleAddHistory} className="space-y-3 rounded-lg border p-4">
            <div className="space-y-2">
              <Label htmlFor="old_psn_id">Previous PSN ID</Label>
              <Input
                id="old_psn_id"
                type="text"
                placeholder="Enter a previous PSN ID you used"
                value={oldPsnId}
                onChange={(e) => setOldPsnId(e.target.value)}
                disabled={isAdding}
                required
              />
              <p className="text-xs text-muted-foreground">
                Add PSN IDs you previously used to link your old match data
              </p>
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={isAdding || !oldPsnId.trim()}>
                {isAdding ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddForm(false);
                  setOldPsnId("");
                }}
                disabled={isAdding}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {history.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Current PSN ID:</span>
              <Badge variant="default" className="bg-emerald-600">
                {currentPsnId}
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Previous IDs:</p>
              {history.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-md border p-3 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{entry.old_psn_id}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-muted-foreground">{entry.new_psn_id}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(entry.changed_at), "MMM d, yyyy")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <History className="mx-auto h-8 w-8 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold">No history yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add previous PSN IDs you used to link your match history
            </p>
            {!showAddForm && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Previous ID
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
