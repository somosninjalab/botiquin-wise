
SELECT cron.unschedule('weekly-reminder-mon-c1');

SELECT cron.schedule(
  'weekly-reminder-mon-c1',
  '15 10 * * 1',
  $$SELECT net.http_post(
    url := 'https://project--29cb77fa-e781-4931-bd63-2ff7e180ffda.lovable.app/api/public/hooks/weekly-reminder?chunk=1&of=4',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnYmdqenRwYWNyZGFxbHhkdXZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MzExNzAsImV4cCI6MjA5MzUwNzE3MH0.P4EH3OFwLnikMrcHyCZ33Tko-89Lue1rVd00wgjuYCE"}'::jsonb,
    body := '{}'::jsonb
  );$$
);

SELECT cron.schedule(
  'weekly-reminder-mon-c2',
  '30 10 * * 1',
  $$SELECT net.http_post(
    url := 'https://project--29cb77fa-e781-4931-bd63-2ff7e180ffda.lovable.app/api/public/hooks/weekly-reminder?chunk=2&of=4',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnYmdqenRwYWNyZGFxbHhkdXZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MzExNzAsImV4cCI6MjA5MzUwNzE3MH0.P4EH3OFwLnikMrcHyCZ33Tko-89Lue1rVd00wgjuYCE"}'::jsonb,
    body := '{}'::jsonb
  );$$
);

SELECT cron.schedule(
  'weekly-reminder-mon-c3',
  '45 10 * * 1',
  $$SELECT net.http_post(
    url := 'https://project--29cb77fa-e781-4931-bd63-2ff7e180ffda.lovable.app/api/public/hooks/weekly-reminder?chunk=3&of=4',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnYmdqenRwYWNyZGFxbHhkdXZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MzExNzAsImV4cCI6MjA5MzUwNzE3MH0.P4EH3OFwLnikMrcHyCZ33Tko-89Lue1rVd00wgjuYCE"}'::jsonb,
    body := '{}'::jsonb
  );$$
);
