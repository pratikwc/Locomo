/*
  # Enable Realtime on reviews table

  ## Summary
  Enables Supabase Realtime publication for the `reviews` table so the frontend
  can subscribe to INSERT, UPDATE, and DELETE events and receive live updates
  without manual refreshes.

  ## Changes
  - Adds the `reviews` table to the `supabase_realtime` publication
*/

ALTER PUBLICATION supabase_realtime ADD TABLE reviews;
