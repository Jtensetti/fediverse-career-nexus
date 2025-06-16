
-- Enable RLS on ap_objects table if not already enabled
ALTER TABLE public.ap_objects ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to insert their own posts (via their actor)
CREATE POLICY "Users can create posts via their actor" 
ON public.ap_objects 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.actors 
    WHERE actors.id = ap_objects.attributed_to 
    AND actors.user_id = auth.uid()
  )
);

-- Create policy to allow users to view all public posts
CREATE POLICY "Anyone can view public posts" 
ON public.ap_objects 
FOR SELECT 
USING (true);

-- Create policy to allow users to update their own posts
CREATE POLICY "Users can update their own posts" 
ON public.ap_objects 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.actors 
    WHERE actors.id = ap_objects.attributed_to 
    AND actors.user_id = auth.uid()
  )
);

-- Create policy to allow users to delete their own posts
CREATE POLICY "Users can delete their own posts" 
ON public.ap_objects 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.actors 
    WHERE actors.id = ap_objects.attributed_to 
    AND actors.user_id = auth.uid()
  )
);
