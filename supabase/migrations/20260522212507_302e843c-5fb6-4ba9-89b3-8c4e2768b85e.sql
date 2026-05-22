SELECT cron.schedule(
  'weekly-reminder-monday-7am-ve',
  '0 11 * * 1',
  $$
  SELECT net.http_post(
    url := 'https://project--29cb77fa-e781-4931-bd63-2ff7e180ffda.lovable.app/api/public/hooks/weekly-reminder',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnYmdqenRwYWNyZGFxbHhkdXZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MzExNzAsImV4cCI6MjA5MzUwNzE3MH0.P4EH3OFwLnikMrcHyCZ33Tko-89Lue1rVd00wgjuYCE"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);