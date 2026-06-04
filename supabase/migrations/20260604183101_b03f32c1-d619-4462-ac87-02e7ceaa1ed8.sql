
SELECT cron.unschedule('weekly-reminder-monday-7am-ve');

SELECT cron.schedule(
  'weekly-reminder-mon-c0',
  '0 10 * * 1',
  $$SELECT net.http_post(
    url := 'https://project--29cb77fa-e781-4931-bd63-2ff7e180ffda.lovable.app/api/public/hooks/weekly-reminder?chunk=0&of=4',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnYmdqenRwYWNyZGFxbHhkdXZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MzExNzAsImV4cCI6MjA5MzUwNzE3MH0.P4EH3OFwLnikMrcHyCZ33Tko-89Lue1rVd00wgjuYCE"}'::jsonb,
    body := '{}'::jsonb
  );$$
);

SELECT cron.schedule(
  'weekly-reminder-mon-c1',
  '15 10 * * 1',
  $$SELECT net.http_post(
    url := 'https://project--29cb77fa-e781-4931-bd63-2ff7e180ffda.lovable.app/api/public/hooks/weekly-reminder?chunk=1&of=4',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBiYXNlIiwicmVmIjoidGdiZ2p6dHBhY3JkYXFseGR1dmIiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc3NzkzMTE3MCwiZXhwIjoyMDkzNTA3MTcwfQ.P4EH3OFwLnikMrcHyCZ33Tko-89Lue1rVd00wgjuYCE"}'::jsonb,
    body := '{}'::jsonb
  );$$
);
