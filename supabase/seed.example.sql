-- Optional: load the holdings from archive/portfolios.csv.
-- The old CSV used numeric user ids (1-5); Supabase uses uuids. Map by
-- username instead. Run this after the users have signed up.

insert into public.holdings (user_id, ticker, shares)
select p.id, v.ticker, v.shares
from (values
  ('Mattheo', 'VT',    2.1347),
  ('Mattheo', 'VMFXX', 251.75),
  ('Nathan',  'VT',    2.0899),
  ('Nathan',  'VMFXX', 175.82),
  ('Zach',    'VT',    0.8557),
  ('Zach',    'VMFXX', 251.29),
  ('Noah',    'VT',    0),
  ('Noah',    'VMFXX', 0),
  ('User',    'VT',    10),
  ('User',    'VMFXX', 10)
) as v(username, ticker, shares)
join public.profiles p on p.username = v.username
on conflict (user_id, ticker) do update set shares = excluded.shares;
