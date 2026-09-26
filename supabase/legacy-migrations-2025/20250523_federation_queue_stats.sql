
-- Create a function to get queue statistics per partition
CREATE OR REPLACE FUNCTION public.get_federation_queue_stats()
RETURNS TABLE (
  partition_key INTEGER,
  total_count INTEGER,
  pending_count INTEGER,
  processing_count INTEGER,
  failed_count INTEGER,
  processed_count INTEGER
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    q.partition_key,
    COUNT(*)::INTEGER AS total_count,
    COUNT(*) FILTER (WHERE q.status = 'pending')::INTEGER AS pending_count,
    COUNT(*) FILTER (WHERE q.status = 'processing')::INTEGER AS processing_count,
    COUNT(*) FILTER (WHERE q.status = 'failed')::INTEGER AS failed_count,
    COUNT(*) FILTER (WHERE q.status = 'processed')::INTEGER AS processed_count
  FROM 
    federation_queue_partitioned q
  GROUP BY 
    q.partition_key
  ORDER BY 
    q.partition_key;
END;
$$;
