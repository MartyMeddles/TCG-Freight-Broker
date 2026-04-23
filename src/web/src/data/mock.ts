export type LoadStatus = 'pending' | 'accepted' | 'rejected';
export type Recommendation = 'AUTO-ACCEPT' | 'CONTRACT-BOOK' | 'REVIEW' | 'REJECT';

export interface Load {
  id: string;
  lane: string;
  carrier: string;
  carrierCost: number;
  customerRate: number;
  profit: number;
  margin: number;
  contractGP: number;
  isContract: boolean;
  src: 'DAT' | 'e2open';
  status: LoadStatus;
  rec: Recommendation;
  gpBlocked: boolean;
  clientCode: string | null;
  time: string;
}

export interface Lane {
  lane: string;
  client: string | null;
  weekMin: number;
  booked: number;
  contractRate: number;
  spotRate: number;
  avgGP: number;
}

export interface KPI {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

export const LOADS: Load[] = [
  { id: 'LD-1041', lane: 'Chicago → Dallas', carrier: 'Swift Transport', carrierCost: 2100, customerRate: 2600, profit: 500, margin: 19.2, contractGP: 19.2, isContract: true, src: 'e2open', status: 'accepted', rec: 'AUTO-ACCEPT', gpBlocked: false, clientCode: 'PFG', time: '08:14' },
  { id: 'LD-1042', lane: 'Memphis → Atlanta', carrier: 'Werner', carrierCost: 1850, customerRate: 2300, profit: 450, margin: 19.6, contractGP: 19.6, isContract: false, src: 'DAT', status: 'accepted', rec: 'AUTO-ACCEPT', gpBlocked: false, clientCode: null, time: '08:21' },
  { id: 'LD-1043', lane: 'Dallas → Phoenix', carrier: 'JB Hunt', carrierCost: 2400, customerRate: 2550, profit: 150, margin: 5.9, contractGP: 5.9, isContract: true, src: 'e2open', status: 'pending', rec: 'REVIEW', gpBlocked: true, clientCode: 'SCH', time: '08:33' },
  { id: 'LD-1044', lane: 'Atlanta → Charlotte', carrier: 'Landstar', carrierCost: 1600, customerRate: 2100, profit: 500, margin: 23.8, contractGP: 23.8, isContract: true, src: 'DAT', status: 'accepted', rec: 'CONTRACT-BOOK', gpBlocked: false, clientCode: null, time: '08:45' },
  { id: 'LD-1045', lane: 'Laredo → Houston', carrier: 'Heartland', carrierCost: 1900, customerRate: 2200, profit: 300, margin: 13.6, contractGP: 13.6, isContract: false, src: 'DAT', status: 'rejected', rec: 'REJECT', gpBlocked: false, clientCode: null, time: '08:58' },
  { id: 'LD-1046', lane: 'Chicago → Dallas', carrier: 'Prime Inc', carrierCost: 2050, customerRate: 2600, profit: 550, margin: 21.2, contractGP: 21.2, isContract: true, src: 'e2open', status: 'pending', rec: 'CONTRACT-BOOK', gpBlocked: false, clientCode: 'PFG', time: '09:02' },
  { id: 'LD-1047', lane: 'Houston → Miami', carrier: 'Old Dominion', carrierCost: 3100, customerRate: 3800, profit: 700, margin: 18.4, contractGP: 18.4, isContract: true, src: 'e2open', status: 'pending', rec: 'REVIEW', gpBlocked: false, clientCode: 'SYS', time: '09:11' },
  { id: 'LD-1048', lane: 'Memphis → Atlanta', carrier: 'US Xpress', carrierCost: 1750, customerRate: 2250, profit: 500, margin: 22.2, contractGP: 22.2, isContract: false, src: 'DAT', status: 'pending', rec: 'AUTO-ACCEPT', gpBlocked: false, clientCode: null, time: '09:19' },
];

export const LANES: Lane[] = [
  { lane: 'Chicago → Dallas', client: 'PFG', weekMin: 8, booked: 6, contractRate: 2600, spotRate: 2350, avgGP: 19.5 },
  { lane: 'Memphis → Atlanta', client: null, weekMin: 5, booked: 5, contractRate: 2250, spotRate: 2100, avgGP: 21.0 },
  { lane: 'Dallas → Phoenix', client: 'SCH', weekMin: 4, booked: 1, contractRate: 2550, spotRate: 2400, avgGP: 12.1 },
  { lane: 'Atlanta → Charlotte', client: null, weekMin: 6, booked: 4, contractRate: 2100, spotRate: 1950, avgGP: 20.3 },
  { lane: 'Laredo → Houston', client: null, weekMin: 3, booked: 3, contractRate: 2200, spotRate: 2050, avgGP: 14.8 },
  { lane: 'Houston → Miami', client: 'SYS', weekMin: 5, booked: 2, contractRate: 3800, spotRate: 3500, avgGP: 17.2 },
];

export const WEEK = { num: 17, start: 'Apr 20', end: 'Apr 26', daysRemaining: 5 };

export const KPIS: KPI[] = [
  { label: 'Fill Score', value: '71%', sub: 'Week 17 contract fill', color: '#fbbf24' },
  { label: 'Accepted', value: '2', sub: 'loads today', color: '#4ade80' },
  { label: 'Pending Review', value: '3', sub: 'awaiting decision', color: '#fbbf24' },
  { label: 'Rejected', value: '1', sub: 'loads today', color: '#f87171' },
  { label: 'Gross Profit', value: '$2,150', sub: 'today accepted', color: '#4ade80' },
  { label: 'Days Remaining', value: '5', sub: 'in Week 17', color: '#94a3b8' },
];
