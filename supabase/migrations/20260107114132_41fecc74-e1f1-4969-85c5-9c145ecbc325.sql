-- Fix RLS policies for experiences, education, and skills tables
-- The INSERT/UPDATE/DELETE policies were using 'public' role instead of 'authenticated'

-- Drop the incorrect policies for experiences
DROP POLICY IF EXISTS "Users can manage their own experiences" ON experiences;

-- Create proper INSERT, UPDATE, DELETE policies for experiences (for authenticated users)
CREATE POLICY "Users can insert own experiences" 
ON experiences FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own experiences" 
ON experiences FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own experiences" 
ON experiences FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Check and fix education policies
DROP POLICY IF EXISTS "Users can manage their own education" ON education;

CREATE POLICY "Users can insert own education" 
ON education FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own education" 
ON education FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own education" 
ON education FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);

-- Check and fix skills policies  
DROP POLICY IF EXISTS "Users can manage their own skills" ON skills;

CREATE POLICY "Users can insert own skills" 
ON skills FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own skills" 
ON skills FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own skills" 
ON skills FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);