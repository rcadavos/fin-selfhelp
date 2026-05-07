-- Normalize existing accounts whose bank_name is a case-variant or near-match of
-- "Maribank" so they resolve to the canonical name and pick up the logo/badge.
-- Covers accounts created before "Maribank" was added to the bank dropdown, where
-- users may have typed a variant or selected "Other" with an alias containing the name.

update public.accounts
set bank_name = 'Maribank'
where
  -- bank_name itself is a case/spacing variant (e.g. "MariBank", "Mari Bank")
  (lower(replace(bank_name, ' ', '')) = 'maribank' and bank_name <> 'Maribank')
  or
  -- bank was set to Other but the account alias clearly identifies it
  (bank_name = 'Other' and lower(account_alias) like '%maribank%');
