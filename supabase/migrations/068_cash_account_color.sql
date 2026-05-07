-- Update Cash account color from green to sky blue
update public.accounts
set color = '#0ea5e9'
where account_alias = 'Cash'
  and color = '#22c55e';

-- Update new-user trigger to seed Cash with sky-blue color
create or replace function public.handle_new_user()
returns trigger as $$
declare
  new_profile_id uuid;
begin
  insert into public.profiles (user_id, net_take_home, currency)
  values (new.id, 0, 'PHP')
  returning id into new_profile_id;

  insert into public.accounts (profile_id, account_alias, bank_name, tags, color)
  values (new_profile_id, 'Cash', 'Cash', array['Cash']::text[], '#0ea5e9');

  return new;
end;
$$ language plpgsql security definer;
