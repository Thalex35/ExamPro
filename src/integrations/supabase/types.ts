export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      chapters: {
        Row: {
          id: string
          level_id: string
          name_fr: string
          name_ht: string
          sort_order: number
          subject_id: string
          verified: boolean
        }
        Insert: {
          id?: string
          level_id: string
          name_fr: string
          name_ht: string
          sort_order?: number
          subject_id: string
          verified?: boolean
        }
        Update: {
          id?: string
          level_id?: string
          name_fr?: string
          name_ht?: string
          sort_order?: number
          subject_id?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "chapters_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapters_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          author_id: string
          body: string
          chapter_id: string | null
          created_at: string
          id: string
          language: string
          level_id: string
          published_at: string | null
          status: Database["public"]["Enums"]["content_status"]
          subject_id: string
          summary: string | null
          title: string
          topic_id: string | null
          track_id: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          body?: string
          chapter_id?: string | null
          created_at?: string
          id?: string
          language?: string
          level_id: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          subject_id: string
          summary?: string | null
          title: string
          topic_id?: string | null
          track_id?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          chapter_id?: string | null
          created_at?: string
          id?: string
          language?: string
          level_id?: string
          published_at?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          subject_id?: string
          summary?: string | null
          title?: string
          topic_id?: string | null
          track_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          author_id: string
          created_at: string
          description: string | null
          exam_year: number
          file_name: string | null
          file_path: string
          id: string
          level_id: string
          published_at: string | null
          session: string | null
          status: Database["public"]["Enums"]["content_status"]
          subject_id: string
          title: string
          track_id: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          created_at?: string
          description?: string | null
          exam_year: number
          file_name?: string | null
          file_path: string
          id?: string
          level_id: string
          published_at?: string | null
          session?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          subject_id: string
          title: string
          track_id?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          created_at?: string
          description?: string | null
          exam_year?: number
          file_name?: string | null
          file_path?: string
          id?: string
          level_id?: string
          published_at?: string | null
          session?: string | null
          status?: Database["public"]["Enums"]["content_status"]
          subject_id?: string
          title?: string
          track_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exams_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      level_subjects: {
        Row: {
          level_id: string
          subject_id: string
          verified: boolean
        }
        Insert: {
          level_id: string
          subject_id: string
          verified?: boolean
        }
        Update: {
          level_id?: string
          subject_id?: string
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "level_subjects_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "level_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      levels: {
        Row: {
          created_at: string
          id: string
          name_fr: string
          name_ht: string
          requires_track: boolean
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name_fr: string
          name_ht: string
          requires_track?: boolean
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name_fr?: string
          name_ht?: string
          requires_track?: boolean
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          department: string | null
          full_name: string | null
          id: string
          language: string
          level_id: string | null
          onboarded: boolean
          school: string | null
          phone: string | null
          track_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          full_name?: string | null
          id: string
          language?: string
          level_id?: string | null
          onboarded?: boolean
          school?: string | null
          phone?: string | null
          track_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string | null
          full_name?: string | null
          id?: string
          language?: string
          level_id?: string | null
          onboarded?: boolean
          school?: string | null
          phone?: string | null
          track_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          name_fr: string
          name_ht: string
          slug: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          name_fr: string
          name_ht: string
          slug: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          name_fr?: string
          name_ht?: string
          slug?: string
        }
        Relationships: []
      }
      teacher_academic_assignments: {
        Row: {
          created_at: string
          id: string
          level_id: string
          teacher_id: string
          track_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          level_id: string
          teacher_id: string
          track_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          level_id?: string
          teacher_id?: string
          track_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_academic_assignments_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_academic_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_academic_assignments_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_subjects: {
        Row: {
          subject_id: string
          teacher_id: string
        }
        Insert: {
          subject_id: string
          teacher_id: string
        }
        Update: {
          subject_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          chapter_id: string
          id: string
          name_fr: string
          name_ht: string
          sort_order: number
        }
        Insert: {
          chapter_id: string
          id?: string
          name_fr: string
          name_ht: string
          sort_order?: number
        }
        Update: {
          chapter_id?: string
          id?: string
          name_fr?: string
          name_ht?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "topics_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      track_subjects: {
        Row: {
          subject_id: string
          track_id: string
        }
        Insert: {
          subject_id: string
          track_id: string
        }
        Update: {
          subject_id?: string
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "track_subjects_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      tracks: {
        Row: {
          code: string
          id: string
          level_id: string
          name_fr: string
          name_ht: string
          sort_order: number
        }
        Insert: {
          code: string
          id?: string
          level_id: string
          name_fr: string
          name_ht: string
          sort_order?: number
        }
        Update: {
          code?: string
          id?: string
          level_id?: string
          name_fr?: string
          name_ht?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "tracks_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_set_role: {
        Args: {
          _enabled: boolean
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      complete_onboarding: {
        Args: {
          _department: string | null
          _full_name: string | null
          _level_id: string | null
          _role: Database["public"]["Enums"]["app_role"]
          _school: string | null
          _subject_ids: string[] | null
          _track_id: string | null
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      finish_student_onboarding: { Args: never; Returns: undefined }
      finish_teacher_onboarding: {
        Args: { _phone: string }
        Returns: undefined
      }
      save_onboarding_name: { Args: { _full_name: string }; Returns: undefined }
      save_student_onboarding_level: {
        Args: { _level_id: string }
        Returns: undefined
      }
      save_student_onboarding_track: {
        Args: { _track_id: string }
        Returns: undefined
      }
      save_teacher_onboarding_levels: {
        Args: { _level_ids: string[] }
        Returns: undefined
      }
      save_teacher_onboarding_school: {
        Args: { _school: string }
        Returns: undefined
      }
      save_teacher_onboarding_tracks: {
        Args: { _track_ids: string[] }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "teacher" | "student" | "reviewer"
      content_status: "draft" | "published" | "archived"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "teacher", "student", "reviewer"],
      content_status: ["draft", "published", "archived"],
    },
  },
} as const
