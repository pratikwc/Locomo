-- Q&A items synced from Google Business Profile
CREATE TABLE IF NOT EXISTS qa_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  google_question_id text NOT NULL,
  question_text text NOT NULL,
  question_author text NOT NULL DEFAULT 'Unknown',
  upvote_count integer NOT NULL DEFAULT 0,
  answer_status text NOT NULL DEFAULT 'pending'
    CHECK (answer_status IN ('pending', 'draft', 'posted', 'ignored')),
  ai_answer text,
  final_answer text,
  asked_at timestamptz NOT NULL DEFAULT now(),
  answered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT qa_items_google_question_id_key UNIQUE (business_id, google_question_id)
);

CREATE INDEX IF NOT EXISTS qa_items_business_id_idx ON qa_items (business_id);
CREATE INDEX IF NOT EXISTS qa_items_answer_status_idx ON qa_items (answer_status);
CREATE INDEX IF NOT EXISTS qa_items_asked_at_idx ON qa_items (asked_at DESC);

ALTER TABLE qa_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own Q&A items"
  ON qa_items
  FOR ALL
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );
