-- Update to_do_items to use Reminder-specific categories.
-- The category column is plain text so no enum change is needed.

-- 1. Change column default to 'personal' (was 'grocery' from the To-Buy era)
alter table public.to_do_items
  alter column category set default 'personal';

-- 2. Remap legacy To-Buy category values to the nearest Reminder equivalent
update public.to_do_items
set category = case category
  when 'grocery'     then 'pantry'
  when 'household'   then 'errand'
  when 'electronics' then 'other'
  when 'clothing'    then 'other'
  else category  -- 'health' and 'other' stay as-is
end
where category in ('grocery', 'household', 'electronics', 'clothing');
