Generate a Supabase migration file for a new table called `$ARGUMENTS`.

## Steps

1. Generate the migration filename using the current timestamp:
```bash
date +%Y%m%d%H%M%S
```

2. Create `supabase/migrations/<timestamp>_add_$ARGUMENTS.sql` with this structure:

```sql
-- Create $ARGUMENTS table
CREATE TABLE IF NOT EXISTS $ARGUMENTS (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  -- ADD YOUR COLUMNS HERE
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE $ARGUMENTS ENABLE ROW LEVEL SECURITY;

-- RLS Policies (scoped via business ownership)
CREATE POLICY "$ARGUMENTS_select" ON $ARGUMENTS
  FOR SELECT USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "$ARGUMENTS_insert" ON $ARGUMENTS
  FOR INSERT WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "$ARGUMENTS_update" ON $ARGUMENTS
  FOR UPDATE USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "$ARGUMENTS_delete" ON $ARGUMENTS
  FOR DELETE USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX IF NOT EXISTS $ARGUMENTS_business_id_idx ON $ARGUMENTS (business_id);
CREATE INDEX IF NOT EXISTS $ARGUMENTS_created_at_idx ON $ARGUMENTS (created_at DESC);
```

3. Replace the `-- ADD YOUR COLUMNS HERE` comment with the actual columns needed for this feature.

4. Add any additional indexes for columns that will be filtered or sorted frequently.

5. Print the TypeScript interface for this table so it can be added to the page/component:

```typescript
interface $ARGUMENTS_PascalCase {
  id: string;
  business_id: string;
  // mirror your columns here
  created_at: string;
  updated_at: string;
}
```

6. Apply the migration via Supabase MCP:
   - Use the `mcp__claude_ai_Supabase__apply_migration` tool with the SQL content
   - Or run: `supabase db push` if CLI is available

7. Commit:
```bash
git add supabase/migrations/
git commit -m "feat: add $ARGUMENTS table migration"
```
