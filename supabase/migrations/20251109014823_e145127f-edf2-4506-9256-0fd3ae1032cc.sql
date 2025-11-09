-- Enable realtime for Instagram jobs and company data tables
ALTER TABLE instagram_jobs REPLICA IDENTITY FULL;
ALTER TABLE instagram_company_data REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE instagram_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE instagram_company_data;