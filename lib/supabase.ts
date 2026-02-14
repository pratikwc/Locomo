import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          phone_number: string;
          role: 'user' | 'admin';
          status: 'active' | 'disabled' | 'pending';
          last_login: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      businesses: {
        Row: {
          id: string;
          user_id: string;
          google_account_id: string | null;
          business_id: string;
          name: string;
          category: string | null;
          additional_categories: string[];
          address: any;
          phone: string | null;
          website: string | null;
          description: string | null;
          hours: any;
          attributes: any;
          photos: any[];
          latitude: number | null;
          longitude: number | null;
          profile_completeness: number;
          last_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          business_id: string;
          google_review_id: string;
          reviewer_name: string;
          reviewer_photo_url: string | null;
          rating: number;
          review_text: string | null;
          review_date: string;
          reply_text: string | null;
          reply_date: string | null;
          ai_suggested_reply: string | null;
          reply_status: 'pending' | 'replied' | 'ignored';
          sentiment: 'positive' | 'neutral' | 'negative' | null;
          created_at: string;
          updated_at: string;
        };
      };
      posts: {
        Row: {
          id: string;
          business_id: string;
          google_post_id: string | null;
          title: string | null;
          content: string;
          images: string[];
          call_to_action: any;
          status: 'draft' | 'scheduled' | 'published' | 'failed';
          scheduled_for: string | null;
          published_at: string | null;
          ai_generated: boolean;
          ai_prompt: string | null;
          performance: any;
          created_at: string;
          updated_at: string;
        };
      };
      analytics: {
        Row: {
          id: string;
          business_id: string;
          date: string;
          views: number;
          searches: number;
          actions_phone: number;
          actions_website: number;
          actions_directions: number;
          search_queries: any;
          customer_locations: any;
          created_at: string;
        };
      };
      health_scores: {
        Row: {
          id: string;
          business_id: string;
          score: number;
          profile_score: number;
          review_score: number;
          post_score: number;
          photo_score: number;
          engagement_score: number;
          action_items: any;
          calculated_at: string;
          created_at: string;
        };
      };
    };
  };
};
