-- Backfill canonical brand colors for all accounts whose bank_name is a known
-- institution. Accounts with bank_name = 'Other' or any unrecognised value keep
-- whatever color the user previously chose.

update public.accounts
set color = case bank_name
  when 'Cash'                                      then '#0ea5e9'
  when 'BDO Unibank'                               then '#04369B'
  when 'Bank of the Philippine Islands (BPI)'      then '#C23133'
  when 'Metrobank'                                 then '#005faa'
  when 'Philippine National Bank (PNB)'            then '#072269'
  when 'Security Bank'                             then '#9FD067'
  when 'Landbank of the Philippines'               then '#74BC44'
  when 'Development Bank of the Philippines (DBP)' then '#0152AA'
  when 'UnionBank'                                 then '#FF8000'
  when 'China Banking Corporation (Chinabank)'     then '#FE0000'
  when 'RCBC'                                      then '#4C92CD'
  when 'EastWest Bank'                             then '#D5E04D'
  when 'Maybank Philippines'                       then '#FEC32F'
  when 'Asia United Bank (AUB)'                    then '#BF161D'
  when 'Philippine Savings Bank (PSBank)'          then '#0855A5'
  when 'Robinsons Bank'                            then '#75C044'
  when 'CTBC Bank Philippines'                     then '#00A651'
  when 'ING Bank Philippines'                      then '#FF6201'
  when 'HSBC Philippines'                          then '#DA0011'
  when 'Citibank Philippines'                      then '#255BE3'
  when 'Standard Chartered Philippines'            then '#020B43'
  when 'BDO Network Bank'                          then '#043673'
  when 'Overseas Filipino Bank (OFBank)'           then '#0038A8'
  when 'GCash'                                     then '#1972F9'
  when 'Maya (PayMaya)'                            then '#75EEA5'
  when 'CIMB Bank Philippines'                     then '#780000'
  when 'Tonik Digital Bank'                        then '#785AFF'
  when 'GoTyme Bank'                               then '#01F3FA'
  when 'OwnBank'                                   then '#65E294'
  when 'Maribank'                                  then '#EA5F01'
end
where bank_name in (
  'Cash',
  'BDO Unibank',
  'Bank of the Philippine Islands (BPI)',
  'Metrobank',
  'Philippine National Bank (PNB)',
  'Security Bank',
  'Landbank of the Philippines',
  'Development Bank of the Philippines (DBP)',
  'UnionBank',
  'China Banking Corporation (Chinabank)',
  'RCBC',
  'EastWest Bank',
  'Maybank Philippines',
  'Asia United Bank (AUB)',
  'Philippine Savings Bank (PSBank)',
  'Robinsons Bank',
  'CTBC Bank Philippines',
  'ING Bank Philippines',
  'HSBC Philippines',
  'Citibank Philippines',
  'Standard Chartered Philippines',
  'BDO Network Bank',
  'Overseas Filipino Bank (OFBank)',
  'GCash',
  'Maya (PayMaya)',
  'CIMB Bank Philippines',
  'Tonik Digital Bank',
  'GoTyme Bank',
  'OwnBank',
  'Maribank'
);
