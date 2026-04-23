-- Add description and lists columns to expense_categories

alter table public.expense_categories
  add column if not exists description text,
  add column if not exists lists text[] not null default '{}';

-- Populate existing categories
update public.expense_categories set
  description = 'Day-to-day food and household items from the supermarket or palengke.',
  lists = array['Rice & grains','Vegetables & fruits','Meat & poultry','Dairy & eggs','Canned & packed goods','Cleaning & household supplies']
where id = 'grocery';

update public.expense_categories set
  description = 'Getting around — whether by commute, ride-share, or your own vehicle.',
  lists = array['Jeepney / bus fare','MRT / LRT load','Grab / taxi','Gasoline & parking','Car maintenance','Motorcycle expenses']
where id = 'transport';

update public.expense_categories set
  description = 'Monthly services that keep your home running.',
  lists = array['Electricity (Meralco)','Water (Manila Water / Maynilad)','Internet & cable','Mobile load & data','Gas / LPG']
where id = 'utilities';

update public.expense_categories set
  description = 'Protection policies covering health, life, property, or vehicles.',
  lists = array['HMO / health card','Life insurance premium','Car insurance','Home / property insurance','SSS / PhilHealth / Pag-IBIG contributions']
where id = 'insurance';

update public.expense_categories set
  description = 'Regular amortization or repayments on borrowed money.',
  lists = array['SSS / Pag-IBIG loan','Bank personal loan','Cash advance','Salary loan','Car loan amortization','Gadget / appliance installment']
where id = 'loans';

update public.expense_categories set
  description = 'Money set aside or put to work for future goals.',
  lists = array['Emergency fund','Time deposit','MP2 / Pag-IBIG Fund','Stock market / UITFs','Crypto & other investments','Goal savings']
where id = 'savings';

update public.expense_categories set
  description = 'Housing cost — whether you''re renting or paying off a property.',
  lists = array['Monthly rent','Condo dues / association fee','Pag-IBIG / bank home loan','Security deposit','Homeowners insurance']
where id = 'rent';

update public.expense_categories set
  description = 'Meals and drinks outside the home — restaurants, cafés, and delivery.',
  lists = array['Restaurant meals','Café & coffee','Fast food','Food delivery (Grab, Foodpanda)','Office lunch & snacks','Desserts & drinks']
where id = 'food_dining';

update public.expense_categories set
  description = 'Staying healthy — medical visits, medicines, and wellness.',
  lists = array['Doctor consultation','Medicines & vitamins','Laboratory & diagnostics','Hospital bills','Dental & optical','Gym & fitness membership']
where id = 'health';

update public.expense_categories set
  description = 'Learning costs for school, upskilling, or professional development.',
  lists = array['Tuition & school fees','School supplies & books','Uniform & ID','Online courses & e-learning','Tutorial / review classes','School allowance']
where id = 'education';

update public.expense_categories set
  description = 'Personal care and lifestyle items for looking and feeling good.',
  lists = array['Haircut / salon','Skincare & beauty products','Toiletries','Clothing & shoes','Laundry','Personal accessories']
where id = 'personal';

update public.expense_categories set
  description = 'Credit card monthly statement payment.',
  lists = array['Minimum amount due','Full statement balance','Installment payment','Annual fee','Interest & late charges','Cash advance fee']
where id = 'credit_card';

update public.expense_categories set
  description = 'Games, in-app purchases, and entertainment platforms.',
  lists = array['Mobile top-ups & gems','PC / console games','PlayStation Plus / Xbox Game Pass','In-game items & skins','Gaming peripherals','Streaming game services']
where id = 'gaming';

update public.expense_categories set
  description = 'Keeping your home in good shape — repairs, tools, and improvements.',
  lists = array['Plumbing repairs','Electrical work','Painting & renovation','Appliance repair','Pest control','Furniture & fixtures']
where id = 'home_maintenance';

update public.expense_categories set
  description = 'Recurring digital subscriptions and service memberships.',
  lists = array['Netflix / Viu / Disney+','Spotify / Apple Music','Cloud storage (Google One, iCloud)','Software licenses (Microsoft 365, Adobe)','News & magazines','YouTube Premium']
where id = 'subscription';

update public.expense_categories set
  description = 'Miscellaneous expenses that do not fit neatly elsewhere.',
  lists = array['Cash gifts & donations','Parties & celebrations','Pet expenses','Travel & vacation','Bank fees & charges','Miscellaneous purchases']
where id = 'other';
