
-- Create a view to expose the get_federation_queue_stats function as a queryable table
CREATE OR REPLACE VIEW federation_queue_stats AS
SELECT * FROM get_federation_queue_stats();
