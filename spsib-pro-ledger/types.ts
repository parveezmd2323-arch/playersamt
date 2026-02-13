
export interface MemberContribution {
  amount: number;
}

export interface Member {
  name: string;
  contributions: Record<string, MemberContribution>;
}

export interface Expenditure {
  id: string;
  date: string;
  description: string;
  amount: number;
  images: string[];
}

export interface AppState {
  mainTitle: string;
  subTitle: string;
  logo: string;
  members: Member[];
  expenditures: Expenditure[];
  lastBackup: string;
}

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
