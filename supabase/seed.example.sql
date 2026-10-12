-- Optional: load the holdings from archive/portfolios.csv.
-- The old CSV used numeric user ids (1-5); Supabase uses uuids. Map by
-- username instead (usernames are stored lowercased). Run after sign-ups.

insert into public.holdings (user_id, ticker, shares)
select p.id, v.ticker, v.shares
from (values
  ('mattheo', 'VT',    2.1347),
  ('mattheo', 'VMFXX', 251.75),
  ('nathan',  'VT',    2.0899),
  ('nathan',  'VMFXX', 175.82),
  ('zach',    'VT',    0.8557),
  ('zach',    'VMFXX', 251.29),
  ('noah',    'VT',    0),
  ('noah',    'VMFXX', 0),
  ('user',    'VT',    10),
  ('user',    'VMFXX', 10)
) as v(username, ticker, shares)
join public.profiles p on p.username = v.username
on conflict (user_id, ticker) do update set shares = excluded.shares;
