// The UK's 121 geographic postcode areas: the letters at the start of a postcode, PE from PE38 9AB.
//
// The browser's copy of the server's list (src/Fenmoor.Rating/PostcodeAreas.cs, which names its
// source and the day it was read), so a postcode outside the UK is refused at the question rather
// than after "Get my quote". The server's list is the one that decides; a test in
// web/react/src/validation.test.ts reads that file and fails if the two disagree.
// Guernsey, Jersey and the Isle of Man (GY, JE, IM) are not on it.
export const ukPostcodeAreas: ReadonlySet<string> = new Set([
  'AB', 'AL', 'B', 'BA', 'BB', 'BD', 'BH', 'BL', 'BN', 'BR', 'BS', 'BT',
  'CA', 'CB', 'CF', 'CH', 'CM', 'CO', 'CR', 'CT', 'CV', 'CW',
  'DA', 'DD', 'DE', 'DG', 'DH', 'DL', 'DN', 'DT', 'DY',
  'E', 'EC', 'EH', 'EN', 'EX',
  'FK', 'FY',
  'G', 'GL', 'GU',
  'HA', 'HD', 'HG', 'HP', 'HR', 'HS', 'HU', 'HX',
  'IG', 'IP', 'IV',
  'KA', 'KT', 'KW', 'KY',
  'L', 'LA', 'LD', 'LE', 'LL', 'LN', 'LS', 'LU',
  'M', 'ME', 'MK', 'ML',
  'N', 'NE', 'NG', 'NN', 'NP', 'NR', 'NW',
  'OL', 'OX',
  'PA', 'PE', 'PH', 'PL', 'PO', 'PR',
  'RG', 'RH', 'RM',
  'S', 'SA', 'SE', 'SG', 'SK', 'SL', 'SM', 'SN', 'SO', 'SP', 'SR', 'SS', 'ST', 'SW', 'SY',
  'TA', 'TD', 'TF', 'TN', 'TQ', 'TR', 'TS', 'TW',
  'UB',
  'W', 'WA', 'WC', 'WD', 'WF', 'WN', 'WR', 'WS', 'WV',
  'YO',
  'ZE',
]);

// The letters at the start of a postcode, in capitals: PE from pe38 9ab.
export const postcodeArea = (postcode: string) => (postcode.trim().match(/^[A-Za-z]+/)?.[0] ?? '').toUpperCase();
