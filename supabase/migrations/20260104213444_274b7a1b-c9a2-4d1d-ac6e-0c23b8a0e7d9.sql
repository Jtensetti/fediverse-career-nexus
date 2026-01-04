-- Drop the old overly permissive SELECT policies
DROP POLICY IF EXISTS "Anyone can view experiences" ON experiences;
DROP POLICY IF EXISTS "Anyone can view education" ON education;
DROP POLICY IF EXISTS "Anyone can view skills" ON skills;

-- Create new secure SELECT policies for experiences
-- Users can view their own experiences
CREATE POLICY "Users can view own experiences" 
ON experiences FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Connected users can view each other's experiences
CREATE POLICY "Connected users can view experiences" 
ON experiences FOR SELECT 
TO authenticated
USING (
  are_users_connected_secure(auth.uid(), user_id)
);

-- Create new secure SELECT policies for education
-- Users can view their own education
CREATE POLICY "Users can view own education" 
ON education FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Connected users can view each other's education
CREATE POLICY "Connected users can view education" 
ON education FOR SELECT 
TO authenticated
USING (
  are_users_connected_secure(auth.uid(), user_id)
);

-- Create new secure SELECT policies for skills
-- Users can view their own skills
CREATE POLICY "Users can view own skills" 
ON skills FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Connected users can view each other's skills
CREATE POLICY "Connected users can view skills" 
ON skills FOR SELECT 
TO authenticated
USING (
  are_users_connected_secure(auth.uid(), user_id)
);