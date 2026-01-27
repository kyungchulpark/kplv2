/**
 * Database type definitions for Supabase
 * Generated from the schema.sql
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          psn_id: string;
          avatar_url: string | null;
          youtube_channel: string | null;
          role: "admin" | "staff" | "captain" | "user";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          psn_id: string;
          avatar_url?: string | null;
          youtube_channel?: string | null;
          role?: "admin" | "staff" | "captain" | "user";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          psn_id?: string;
          avatar_url?: string | null;
          youtube_channel?: string | null;
          role?: "admin" | "staff" | "captain" | "user";
          created_at?: string;
          updated_at?: string;
        };
      };
      seasons: {
        Row: {
          id: string;
          name: string;
          start_date: string;
          end_date: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          start_date: string;
          end_date?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          start_date?: string;
          end_date?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      teams: {
        Row: {
          id: string;
          season_id: string;
          name: string;
          logo_url: string | null;
          conference: "West" | "East" | null;
          region: string | null;
          captain_id: string | null;
          wins: number;
          losses: number;
          points_for: number;
          points_against: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          season_id: string;
          name: string;
          logo_url?: string | null;
          conference: "West" | "East" | null;
          region: string | null;
          captain_id?: string | null;
          wins?: number;
          losses?: number;
          points_for?: number;
          points_against?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          season_id?: string;
          name?: string;
          logo_url?: string | null;
          conference?: "West" | "East";
          captain_id?: string | null;
          wins?: number;
          losses?: number;
          points_for?: number;
          points_against?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      team_rosters: {
        Row: {
          id: string;
          season_id: string;
          team_id: string;
          player_id: string;
          jersey_number: number | null;
          position: string | null;
          is_active: boolean;
          joined_at: string;
          left_at: string | null;
        };
        Insert: {
          id?: string;
          season_id: string;
          team_id: string;
          player_id: string;
          jersey_number?: number | null;
          position?: string | null;
          is_active?: boolean;
          joined_at?: string;
          left_at?: string | null;
        };
        Update: {
          id?: string;
          season_id?: string;
          team_id?: string;
          player_id?: string;
          jersey_number?: number | null;
          position?: string | null;
          is_active?: boolean;
          joined_at?: string;
          left_at?: string | null;
        };
      };
      matches: {
        Row: {
          id: string;
          season_id: string;
          home_team_id: string;
          away_team_id: string;
          match_date: string;
          status: "scheduled" | "live" | "finished" | "cancelled";
          home_score: number | null;
          away_score: number | null;
          home_stream_url: string | null;
          away_stream_url: string | null;
          result_screenshot_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          season_id: string;
          home_team_id: string;
          away_team_id: string;
          match_date: string;
          status?: "scheduled" | "live" | "finished" | "cancelled";
          home_score?: number | null;
          away_score?: number | null;
          home_stream_url?: string | null;
          away_stream_url?: string | null;
          result_screenshot_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          season_id?: string;
          home_team_id?: string;
          away_team_id?: string;
          match_date?: string;
          status?: "scheduled" | "live" | "finished" | "cancelled";
          home_score?: number | null;
          away_score?: number | null;
          home_stream_url?: string | null;
          away_stream_url?: string | null;
          result_screenshot_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      match_stats: {
        Row: {
          id: string;
          match_id: string;
          team_id: string;
          player_id: string;
          grade: string | null;
          pts: number;
          reb: number;
          ast: number;
          stl: number;
          blk: number;
          fls: number;
          turnovers: number;
          fgm: number;
          fga: number;
          three_pm: number;
          three_pa: number;
          ftm: number;
          fta: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          team_id: string;
          player_id: string;
          grade?: string | null;
          pts?: number;
          reb?: number;
          ast?: number;
          stl?: number;
          blk?: number;
          fls?: number;
          turnovers?: number;
          fgm?: number;
          fga?: number;
          three_pm?: number;
          three_pa?: number;
          ftm?: number;
          fta?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          team_id?: string;
          player_id?: string;
          grade?: string | null;
          pts?: number;
          reb?: number;
          ast?: number;
          stl?: number;
          blk?: number;
          fls?: number;
          turnovers?: number;
          fgm?: number;
          fga?: number;
          three_pm?: number;
          three_pa?: number;
          ftm?: number;
          fta?: number;
          created_at?: string;
        };
      };
      psn_id_history: {
        Row: {
          id: string;
          user_id: string;
          old_psn_id: string;
          new_psn_id: string;
          changed_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          old_psn_id: string;
          new_psn_id: string;
          changed_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          old_psn_id?: string;
          new_psn_id?: string;
          changed_at?: string | null;
          created_at?: string | null;
        };
      };
      old_profiles: {
        Row: {
          id: string;
          psn_id: string;
          psn_id_normalized: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          psn_id: string;
          psn_id_normalized: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          psn_id?: string;
          psn_id_normalized?: string;
          created_at?: string;
        };
      };
      old_match_stats: {
        Row: {
          id: string;
          legacy_row_id: string;
          match_id: string;
          team_id: string;
          old_profile_id: string;
          grade: string | null;
          pts: number;
          reb: number;
          ast: number;
          stl: number;
          blk: number;
          fls: number;
          turnovers: number;
          fgm: number;
          fga: number;
          three_pm: number;
          three_pa: number;
          ftm: number;
          fta: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          legacy_row_id: string;
          match_id: string;
          team_id: string;
          old_profile_id: string;
          grade?: string | null;
          pts?: number;
          reb?: number;
          ast?: number;
          stl?: number;
          blk?: number;
          fls?: number;
          turnovers?: number;
          fgm?: number;
          fga?: number;
          three_pm?: number;
          three_pa?: number;
          ftm?: number;
          fta?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          legacy_row_id?: string;
          match_id?: string;
          team_id?: string;
          old_profile_id?: string;
          grade?: string | null;
          pts?: number;
          reb?: number;
          ast?: number;
          stl?: number;
          blk?: number;
          fls?: number;
          turnovers?: number;
          fgm?: number;
          fga?: number;
          three_pm?: number;
          three_pa?: number;
          ftm?: number;
          fta?: number;
          created_at?: string;
        };
      };
      old_team_rosters: {
        Row: {
          id: string;
          legacy_row_id: string;
          season_id: string;
          team_id: string;
          old_profile_id: string;
          position: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          legacy_row_id: string;
          season_id: string;
          team_id: string;
          old_profile_id: string;
          position?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          legacy_row_id?: string;
          season_id?: string;
          team_id?: string;
          old_profile_id?: string;
          position?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      current_standings: {
        Row: {
          id: string;
          team_name: string;
          logo_url: string | null;
          conference: "West" | "East" | null;
          region: string | null;
          wins: number;
          losses: number;
          games_played: number;
          win_rate: number;
          points_for: number;
          points_against: number;
          margin: number;
          season_name: string;
        };
      };
      player_season_stats: {
        Row: {
          player_id: string;
          psn_id: string;
          season_id: string;
          season_name: string;
          team_id: string;
          team_name: string;
          games_played: number;
          ppg: number;
          rpg: number;
          apg: number;
          spg: number;
          bpg: number;
          tpg: number;
          total_fgm: number;
          total_fga: number;
          fg_pct: number;
          total_3pm: number;
          total_3pa: number;
          three_pct: number;
          total_ftm: number;
          total_fta: number;
          ft_pct: number;
        };
      };
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
