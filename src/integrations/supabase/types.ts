export type Json =
  | string
  | number
  | boolean
  | null
  | {
      [key: string]: Json | undefined;
    }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      content_reports: {
        Row: {
          admin_note: string | null;
          created_at: string;
          id: string;
          reason: string;
          reporter_id: string;
          resolved_at: string | null;
          status: string;
          target_id: string;
          target_type: string;
        };
        Insert: {
          admin_note?: string | null;
          created_at?: string;
          id?: string;
          reason: string;
          reporter_id: string;
          resolved_at?: string | null;
          status?: string;
          target_id: string;
          target_type: string;
        };
        Update: {
          admin_note?: string | null;
          created_at?: string;
          id?: string;
          reason?: string;
          reporter_id?: string;
          resolved_at?: string | null;
          status?: string;
          target_id?: string;
          target_type?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          body_fr: string;
          body_ht: string;
          category: string;
          created_at: string;
          dedupe_key: string;
          href: string;
          id: string;
          read_at: string | null;
          recipient_id: string;
          reference_id: string | null;
          reference_type: string | null;
          title_fr: string;
          title_ht: string;
        };
        Insert: {
          body_fr: string;
          body_ht: string;
          category: string;
          created_at?: string;
          dedupe_key: string;
          href: string;
          id?: string;
          read_at?: string | null;
          recipient_id: string;
          reference_id?: string | null;
          reference_type?: string | null;
          title_fr: string;
          title_ht: string;
        };
        Update: {
          body_fr?: string;
          body_ht?: string;
          category?: string;
          created_at?: string;
          dedupe_key?: string;
          href?: string;
          id?: string;
          read_at?: string | null;
          recipient_id?: string;
          reference_id?: string | null;
          reference_type?: string | null;
          title_fr?: string;
          title_ht?: string;
        };
        Relationships: [];
      };
      quiz_attempts: {
        Row: {
          chapter_id: string | null;
          correct_count: number;
          created_at: string;
          id: string;
          results: Json;
          score: number;
          student_id: string;
          subject_id: string;
          total_questions: number;
        };
        Insert: {
          chapter_id?: string | null;
          correct_count: number;
          created_at?: string;
          id?: string;
          results: Json;
          score: number;
          student_id: string;
          subject_id: string;
          total_questions?: number;
        };
        Update: {
          chapter_id?: string | null;
          correct_count?: number;
          created_at?: string;
          id?: string;
          results?: Json;
          score?: number;
          student_id?: string;
          subject_id?: string;
          total_questions?: number;
        };
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_attempts_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "quiz_attempts_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
        ];
      };
      chapters: {
        Row: {
          id: string;
          level_id: string;
          name_fr: string;
          name_ht: string;
          sort_order: number;
          subject_id: string;
          verified: boolean;
        };
        Insert: {
          id?: string;
          level_id: string;
          name_fr: string;
          name_ht: string;
          sort_order?: number;
          subject_id: string;
          verified?: boolean;
        };
        Update: {
          id?: string;
          level_id?: string;
          name_fr?: string;
          name_ht?: string;
          sort_order?: number;
          subject_id?: string;
          verified?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "chapters_level_id_fkey";
            columns: ["level_id"];
            isOneToOne: false;
            referencedRelation: "levels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "chapters_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
        ];
      };
      courses: {
        Row: {
          author_id: string;
          body: string;
          chapter_id: string | null;
          created_at: string;
          description: string | null;
          difficulty: string | null;
          duration_minutes: number | null;
          external_url: string | null;
          file_size: number | null;
          file_name: string | null;
          file_path: string | null;
          id: string;
          is_demo: boolean;
          learning_objectives: string[];
          language: string;
          level_id: string;
          prerequisites: string[];
          published_at: string | null;
          preview: string | null;
          resource_type: string;
          resource_formats: string[];
          review_status: string;
          review_note: string | null;
          skills: string[];
          status: Database["public"]["Enums"]["content_status"];
          subject_id: string;
          summary: string | null;
          title: string;
          topic_id: string | null;
          track_id: string | null;
          updated_at: string;
        };
        Insert: {
          author_id: string;
          body?: string;
          chapter_id?: string | null;
          created_at?: string;
          description?: string | null;
          difficulty?: string | null;
          duration_minutes?: number | null;
          external_url?: string | null;
          file_size?: number | null;
          file_name?: string | null;
          file_path?: string | null;
          id?: string;
          is_demo?: boolean;
          learning_objectives?: string[];
          language?: string;
          level_id: string;
          prerequisites?: string[];
          published_at?: string | null;
          preview?: string | null;
          resource_type?: string;
          resource_formats?: string[];
          review_status?: string;
          review_note?: string | null;
          skills?: string[];
          status?: Database["public"]["Enums"]["content_status"];
          subject_id: string;
          summary?: string | null;
          title: string;
          topic_id?: string | null;
          track_id?: string | null;
          updated_at?: string;
        };
        Update: {
          author_id?: string;
          body?: string;
          chapter_id?: string | null;
          created_at?: string;
          description?: string | null;
          difficulty?: string | null;
          duration_minutes?: number | null;
          external_url?: string | null;
          file_size?: number | null;
          file_name?: string | null;
          file_path?: string | null;
          id?: string;
          is_demo?: boolean;
          learning_objectives?: string[];
          language?: string;
          level_id?: string;
          prerequisites?: string[];
          published_at?: string | null;
          preview?: string | null;
          resource_type?: string;
          resource_formats?: string[];
          review_status?: string;
          review_note?: string | null;
          skills?: string[];
          status?: Database["public"]["Enums"]["content_status"];
          subject_id?: string;
          summary?: string | null;
          title?: string;
          topic_id?: string | null;
          track_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "courses_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "courses_level_id_fkey";
            columns: ["level_id"];
            isOneToOne: false;
            referencedRelation: "levels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "courses_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "courses_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "courses_track_id_fkey";
            columns: ["track_id"];
            isOneToOne: false;
            referencedRelation: "tracks";
            referencedColumns: ["id"];
          },
        ];
      };
      course_favorites: {
        Row: {
          course_id: string;
          created_at: string;
          student_id: string;
        };
        Insert: {
          course_id: string;
          created_at?: string;
          student_id: string;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "course_favorites_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "course_favorites_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      exam_favorites: {
        Row: {
          created_at: string;
          exam_id: string;
          student_id: string;
        };
        Insert: {
          created_at?: string;
          exam_id: string;
          student_id: string;
        };
        Update: {
          created_at?: string;
          exam_id?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exam_favorites_exam_id_fkey";
            columns: ["exam_id"];
            isOneToOne: false;
            referencedRelation: "exams";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exam_favorites_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      course_progress: {
        Row: {
          completed_at: string | null;
          course_id: string;
          progress_percent: number;
          student_id: string;
          updated_at: string;
        };
        Insert: {
          completed_at?: string | null;
          course_id: string;
          progress_percent?: number;
          student_id: string;
          updated_at?: string;
        };
        Update: {
          completed_at?: string | null;
          course_id?: string;
          progress_percent?: number;
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "course_progress_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "course_progress_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      course_resources: {
        Row: {
          author_id: string;
          course_id: string;
          created_at: string;
          description: string | null;
          duration_minutes: number | null;
          external_url: string | null;
          file_size: number | null;
          file_name: string | null;
          file_path: string | null;
          id: string;
          resource_type: string;
          sort_order: number;
          title: string;
        };
        Insert: {
          author_id: string;
          course_id: string;
          created_at?: string;
          description?: string | null;
          duration_minutes?: number | null;
          external_url?: string | null;
          file_size?: number | null;
          file_name?: string | null;
          file_path?: string | null;
          id?: string;
          resource_type: string;
          sort_order?: number;
          title: string;
        };
        Update: {
          author_id?: string;
          course_id?: string;
          created_at?: string;
          description?: string | null;
          duration_minutes?: number | null;
          external_url?: string | null;
          file_size?: number | null;
          file_name?: string | null;
          file_path?: string | null;
          id?: string;
          resource_type?: string;
          sort_order?: number;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "course_resources_author_id_fkey";
            columns: ["author_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "course_resources_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      demo_student_records: {
        Row: {
          course_id: string | null;
          description: string;
          exam_id: string | null;
          id: string;
          level_id: string;
          occurred_at: string;
          record_type: "favorite" | "evaluation" | "progress";
          score: number | null;
          subject_id: string;
          title: string;
          track_id: string | null;
        };
        Insert: {
          course_id?: string | null;
          description: string;
          exam_id?: string | null;
          id?: string;
          level_id: string;
          occurred_at?: string;
          record_type: "favorite" | "evaluation" | "progress";
          score?: number | null;
          subject_id: string;
          title: string;
          track_id?: string | null;
        };
        Update: {
          course_id?: string | null;
          description?: string;
          exam_id?: string | null;
          id?: string;
          level_id?: string;
          occurred_at?: string;
          record_type?: "favorite" | "evaluation" | "progress";
          score?: number | null;
          subject_id?: string;
          title?: string;
          track_id?: string | null;
        };
        Relationships: [];
      };
      exams: {
        Row: {
          author_id: string;
          chapter_id: string | null;
          created_at: string;
          description: string | null;
          exam_year: number;
          file_name: string | null;
          file_path: string;
          id: string;
          is_demo: boolean;
          level_id: string;
          published_at: string | null;
          demo_content: string | null;
          session: string | null;
          review_status: string;
          review_note: string | null;
          status: Database["public"]["Enums"]["content_status"];
          subject_id: string;
          title: string;
          track_id: string | null;
          updated_at: string;
        };
        Insert: {
          author_id: string;
          chapter_id?: string | null;
          created_at?: string;
          description?: string | null;
          exam_year: number;
          file_name?: string | null;
          file_path: string;
          id?: string;
          is_demo?: boolean;
          level_id: string;
          published_at?: string | null;
          demo_content?: string | null;
          session?: string | null;
          review_status?: string;
          review_note?: string | null;
          status?: Database["public"]["Enums"]["content_status"];
          subject_id: string;
          title: string;
          track_id?: string | null;
          updated_at?: string;
        };
        Update: {
          author_id?: string;
          chapter_id?: string | null;
          created_at?: string;
          description?: string | null;
          exam_year?: number;
          file_name?: string | null;
          file_path?: string;
          id?: string;
          is_demo?: boolean;
          level_id?: string;
          published_at?: string | null;
          demo_content?: string | null;
          session?: string | null;
          review_status?: string;
          review_note?: string | null;
          status?: Database["public"]["Enums"]["content_status"];
          subject_id?: string;
          title?: string;
          track_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "exams_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exams_level_id_fkey";
            columns: ["level_id"];
            isOneToOne: false;
            referencedRelation: "levels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exams_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "exams_track_id_fkey";
            columns: ["track_id"];
            isOneToOne: false;
            referencedRelation: "tracks";
            referencedColumns: ["id"];
          },
        ];
      };
      level_subjects: {
        Row: {
          level_id: string;
          subject_id: string;
          verified: boolean;
        };
        Insert: {
          level_id: string;
          subject_id: string;
          verified?: boolean;
        };
        Update: {
          level_id?: string;
          subject_id?: string;
          verified?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "level_subjects_level_id_fkey";
            columns: ["level_id"];
            isOneToOne: false;
            referencedRelation: "levels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "level_subjects_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
        ];
      };
      levels: {
        Row: {
          created_at: string;
          id: string;
          name_fr: string;
          name_ht: string;
          requires_track: boolean;
          slug: string;
          sort_order: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name_fr: string;
          name_ht: string;
          requires_track?: boolean;
          slug: string;
          sort_order?: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          name_fr?: string;
          name_ht?: string;
          requires_track?: boolean;
          slug?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          department: string | null;
          first_name: string | null;
          geographical_department: string | null;
          full_name: string | null;
          id: string;
          is_active: boolean;
          language: string;
          last_name: string | null;
          level_id: string | null;
          onboarded: boolean;
          school: string | null;
          school_email: string | null;
          school_id: string | null;
          school_phone: string | null;
          phone: string | null;
          teacher_school_contacts_confirmed: boolean;
          teacher_verification_note: string | null;
          teacher_verification_status: string;
          track_id: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          department?: string | null;
          first_name?: string | null;
          geographical_department?: string | null;
          full_name?: string | null;
          id: string;
          is_active?: boolean;
          language?: string;
          last_name?: string | null;
          level_id?: string | null;
          onboarded?: boolean;
          school?: string | null;
          school_email?: string | null;
          school_id?: string | null;
          school_phone?: string | null;
          phone?: string | null;
          teacher_school_contacts_confirmed?: boolean;
          teacher_verification_note?: string | null;
          teacher_verification_status?: string;
          track_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          department?: string | null;
          first_name?: string | null;
          geographical_department?: string | null;
          full_name?: string | null;
          id?: string;
          is_active?: boolean;
          language?: string;
          last_name?: string | null;
          level_id?: string | null;
          onboarded?: boolean;
          school?: string | null;
          school_email?: string | null;
          school_id?: string | null;
          school_phone?: string | null;
          phone?: string | null;
          teacher_school_contacts_confirmed?: boolean;
          teacher_verification_note?: string | null;
          teacher_verification_status?: string;
          track_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_level_id_fkey";
            columns: ["level_id"];
            isOneToOne: false;
            referencedRelation: "levels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_track_id_fkey";
            columns: ["track_id"];
            isOneToOne: false;
            referencedRelation: "tracks";
            referencedColumns: ["id"];
          },
        ];
      };
      school_contact_corrections: {
        Row: {
          created_at: string;
          id: string;
          proposed_email: string | null;
          proposed_phone: string | null;
          review_note: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          school_id: string;
          status: string;
          submitted_by: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          proposed_email?: string | null;
          proposed_phone?: string | null;
          review_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          school_id: string;
          status?: string;
          submitted_by?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          proposed_email?: string | null;
          proposed_phone?: string | null;
          review_note?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          school_id?: string;
          status?: string;
          submitted_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "school_contact_corrections_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      schools: {
        Row: {
          created_at: string;
          email: string | null;
          geographical_department: string;
          id: string;
          name: string;
          normalized_name: string;
          phone: string | null;
          submitted_by: string | null;
          updated_at: string;
          verification_status: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          geographical_department: string;
          id?: string;
          name: string;
          normalized_name?: never;
          phone?: string | null;
          submitted_by?: string | null;
          updated_at?: string;
          verification_status?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          geographical_department?: string;
          id?: string;
          name?: string;
          normalized_name?: never;
          phone?: string | null;
          submitted_by?: string | null;
          updated_at?: string;
          verification_status?: string;
        };
        Relationships: [];
      };
      subjects: {
        Row: {
          created_at: string;
          icon: string | null;
          id: string;
          name_fr: string;
          name_ht: string;
          slug: string;
        };
        Insert: {
          created_at?: string;
          icon?: string | null;
          id?: string;
          name_fr: string;
          name_ht: string;
          slug: string;
        };
        Update: {
          created_at?: string;
          icon?: string | null;
          id?: string;
          name_fr?: string;
          name_ht?: string;
          slug?: string;
        };
        Relationships: [];
      };
      teacher_academic_assignments: {
        Row: {
          created_at: string;
          id: string;
          level_id: string;
          teacher_id: string;
          track_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          level_id: string;
          teacher_id: string;
          track_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          level_id?: string;
          teacher_id?: string;
          track_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "teacher_academic_assignments_level_id_fkey";
            columns: ["level_id"];
            isOneToOne: false;
            referencedRelation: "levels";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "teacher_academic_assignments_teacher_id_fkey";
            columns: ["teacher_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "teacher_academic_assignments_track_id_fkey";
            columns: ["track_id"];
            isOneToOne: false;
            referencedRelation: "tracks";
            referencedColumns: ["id"];
          },
        ];
      };
      teacher_verification_requests: {
        Row: {
          email: string;
          id: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          review_note: string | null;
          school_id: string | null;
          status: string;
          submitted_at: string;
          teacher_id: string;
        };
        Insert: {
          email: string;
          id?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          review_note?: string | null;
          school_id?: string | null;
          status?: string;
          submitted_at?: string;
          teacher_id: string;
        };
        Update: {
          email?: string;
          id?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          review_note?: string | null;
          school_id?: string | null;
          status?: string;
          submitted_at?: string;
          teacher_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "teacher_verification_requests_school_id_fkey";
            columns: ["school_id"];
            isOneToOne: false;
            referencedRelation: "schools";
            referencedColumns: ["id"];
          },
        ];
      };
      teacher_subjects: {
        Row: {
          subject_id: string;
          teacher_id: string;
        };
        Insert: {
          subject_id: string;
          teacher_id: string;
        };
        Update: {
          subject_id?: string;
          teacher_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "teacher_subjects_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
        ];
      };
      topics: {
        Row: {
          chapter_id: string;
          id: string;
          name_fr: string;
          name_ht: string;
          sort_order: number;
        };
        Insert: {
          chapter_id: string;
          id?: string;
          name_fr: string;
          name_ht: string;
          sort_order?: number;
        };
        Update: {
          chapter_id?: string;
          id?: string;
          name_fr?: string;
          name_ht?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "topics_chapter_id_fkey";
            columns: ["chapter_id"];
            isOneToOne: false;
            referencedRelation: "chapters";
            referencedColumns: ["id"];
          },
        ];
      };
      track_subjects: {
        Row: {
          subject_id: string;
          track_id: string;
        };
        Insert: {
          subject_id: string;
          track_id: string;
        };
        Update: {
          subject_id?: string;
          track_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "track_subjects_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "track_subjects_track_id_fkey";
            columns: ["track_id"];
            isOneToOne: false;
            referencedRelation: "tracks";
            referencedColumns: ["id"];
          },
        ];
      };
      tracks: {
        Row: {
          code: string;
          id: string;
          level_id: string;
          name_fr: string;
          name_ht: string;
          sort_order: number;
        };
        Insert: {
          code: string;
          id?: string;
          level_id: string;
          name_fr: string;
          name_ht: string;
          sort_order?: number;
        };
        Update: {
          code?: string;
          id?: string;
          level_id?: string;
          name_fr?: string;
          name_ht?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: "tracks_level_id_fkey";
            columns: ["level_id"];
            isOneToOne: false;
            referencedRelation: "levels";
            referencedColumns: ["id"];
          },
        ];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_demo_quiz: {
        Args: {
          _chapter_id?: string | null;
          _subject_id: string;
        };
        Returns: Json;
      };
      submit_demo_quiz: {
        Args: {
          _answers: Json;
          _chapter_id: string | null;
          _subject_id: string;
        };
        Returns: Json;
      };
      submit_content_report: {
        Args: {
          _reason: string;
          _target_id: string;
          _target_type: string;
        };
        Returns: string;
      };
      admin_send_announcement: {
        Args: {
          _audience: string;
          _body_fr: string;
          _body_ht: string;
          _level_id?: string | null;
          _title_fr: string;
          _title_ht: string;
          _track_id?: string | null;
        };
        Returns: number;
      };
      admin_list_users: {
        Args: Record<PropertyKey, never>;
        Returns: {
          created_at: string;
          email: string;
          full_name: string | null;
          geographical_department: string | null;
          is_active: boolean;
          level_fr: string | null;
          level_ht: string | null;
          roles: Database["public"]["Enums"]["app_role"][];
          school: string | null;
          teacher_verification_status: string | null;
          track_code: string | null;
          user_id: string;
        }[];
      };
      admin_set_user_active: {
        Args: {
          _active: boolean;
          _user_id: string;
        };
        Returns: undefined;
      };

      admin_delete_demo_content: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      admin_seed_demo_content: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      admin_review_school: {
        Args: {
          _school_id: string;
          _status: string;
        };
        Returns: undefined;
      };
      admin_review_school_contact_correction: {
        Args: {
          _correction_id: string;
          _review_note?: string | null;
          _status: string;
        };
        Returns: undefined;
      };
      admin_review_teacher_verification: {
        Args: {
          _request_id: string;
          _review_note?: string | null;
          _status: string;
        };
        Returns: undefined;
      };
      admin_set_role: {
        Args: {
          _enabled: boolean;
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: undefined;
      };
      complete_onboarding: {
        Args: {
          _department: string | null;
          _full_name: string | null;
          _level_id: string | null;
          _role: Database["public"]["Enums"]["app_role"];
          _school: string | null;
          _subject_ids: string[] | null;
          _track_id: string | null;
        };
        Returns: undefined;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      finish_student_onboarding: {
        Args: never;
        Returns: undefined;
      };
      finish_teacher_onboarding: {
        Args: {
          _phone: string;
        };
        Returns: undefined;
      };
      register_onboarding_school: {
        Args: {
          _name: string;
        };
        Returns: string;
      };
      resubmit_teacher_verification: {
        Args: never;
        Returns: undefined;
      };
      save_onboarding_names: {
        Args: {
          _first_name: string;
          _last_name: string;
        };
        Returns: undefined;
      };
      save_onboarding_school: {
        Args: {
          _school_id: string;
        };
        Returns: undefined;
      };
      save_teacher_school_contacts: {
        Args: {
          _email: string | null;
          _phone: string | null;
        };
        Returns: undefined;
      };
      save_onboarding_name: {
        Args: {
          _full_name: string;
        };
        Returns: undefined;
      };
      save_student_onboarding_level: {
        Args: {
          _level_id: string;
        };
        Returns: undefined;
      };
      save_student_onboarding_department: {
        Args: {
          _geographical_department: string;
        };
        Returns: undefined;
      };
      save_student_school_information: {
        Args: {
          _email: string | null;
          _name: string;
          _phone: string | null;
        };
        Returns: undefined;
      };
      save_student_onboarding_track: {
        Args: {
          _track_id: string;
        };
        Returns: undefined;
      };
      save_teacher_onboarding_levels: {
        Args: {
          _level_ids: string[];
        };
        Returns: undefined;
      };
      save_teacher_onboarding_department: {
        Args: {
          _department: string;
        };
        Returns: undefined;
      };
      save_teacher_onboarding_school: {
        Args: {
          _school: string;
        };
        Returns: undefined;
      };
      save_teacher_onboarding_tracks: {
        Args: {
          _track_ids: string[];
        };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: "admin" | "teacher" | "student" | "reviewer";
      content_status: "draft" | "published" | "archived";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | {
        schema: keyof DatabaseWithoutInternals;
      },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | {
        schema: keyof DatabaseWithoutInternals;
      },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | {
        schema: keyof DatabaseWithoutInternals;
      },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | {
        schema: keyof DatabaseWithoutInternals;
      },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | {
        schema: keyof DatabaseWithoutInternals;
      },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "teacher", "student", "reviewer"],
      content_status: ["draft", "published", "archived"],
    },
  },
} as const;
