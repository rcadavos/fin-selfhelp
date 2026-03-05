-- New users get 7 days free trial by default (subscription_ends_at = now() + 7 days).

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, net_take_home, currency, subscription_ends_at)
  values (new.id, 0, 'PHP', now() + interval '7 days');
  return new;
end;
$$ language plpgsql security definer;
