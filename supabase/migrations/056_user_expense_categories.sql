-- Allow Pro/Premium users to create their own custom expense categories.
-- Categories with user_id = NULL are global (admin-managed).
-- Categories with user_id set are owned by that user.

ALTER TABLE expense_categories
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_expense_categories_user_id
  ON expense_categories(user_id);

-- RLS: users can read global categories and their own custom ones
CREATE POLICY "expense_categories_read_own_and_global"
  ON expense_categories
  FOR SELECT
  USING (user_id IS NULL OR user_id = auth.uid());

-- RLS: users can only insert categories they own
CREATE POLICY "expense_categories_insert_own"
  ON expense_categories
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- RLS: users can only update their own categories
CREATE POLICY "expense_categories_update_own"
  ON expense_categories
  FOR UPDATE
  USING (user_id = auth.uid());

-- RLS: users can only delete their own categories
CREATE POLICY "expense_categories_delete_own"
  ON expense_categories
  FOR DELETE
  USING (user_id = auth.uid());
