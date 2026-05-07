-- Add currency field to accounts (ISO 4217, default PHP)
alter table accounts
  add column if not exists currency text not null default 'PHP';

alter table accounts
  add constraint accounts_currency_length check (char_length(currency) between 3 and 5);
