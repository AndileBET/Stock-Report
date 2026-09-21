export type VarianceStatus = "Shortage" | "Remaining" | "Balanced";

export interface RegionalSummary {
  region: string;
  transaction_count: number;
  opening_quantity: number;
  opening_value: number;
  intake_quantity: number;
  intake_value: number;
  movement_in_quantity: number;
  movement_in_value: number;
  movement_out_quantity: number;
  movement_out_value: number;
  used_quantity: number;
  usage_value: number;
  expected_quantity: number;
  expected_value: number;
  closing_quantity: number;
  closing_value: number;
  remaining_quantity: number;
  remaining_value: number;
  shortage_quantity: number;
  shortage_value: number;
  variance_quantity: number;
  variance_value: number;
  variance_status: VarianceStatus;
}

export interface ItemSummary {
  item_code: string;
  item_name: string;
  category: string;
  sub_category: string;
  unit: string;
  transaction_count: number;
  opening_events: number;
  opening_quantity: number;
  opening_value: number;
  latest_opening_quantity: number;
  latest_opening_value: number;
  intake_quantity: number;
  intake_value: number;
  movement_in_quantity: number;
  movement_in_value: number;
  movement_out_quantity: number;
  movement_out_value: number;
  used_quantity: number;
  usage_value: number;
  expected_quantity: number;
  expected_value: number;
  closing_quantity: number;
  closing_value: number;
  remaining_quantity: number;
  remaining_value: number;
  shortage_quantity: number;
  shortage_value: number;
  variance_quantity: number;
  variance_value: number;
  variance_status: VarianceStatus;
}

export interface TeamSummary extends Omit<ItemSummary, "item_code" | "item_name" | "category" | "sub_category" | "unit"> {
  team: string;
  items: ItemSummary[];
}

export interface RegionTeamItemSummary extends Omit<TeamSummary, "team" | "items"> {
  region: string;
  teams: TeamSummary[];
}

export interface ItemUsage {
  region: string;
  team: string;
  item_code: string;
  item_name: string;
  category: string;
  sub_category: string;
  unit: string;
  request_count: number;
  usage_transaction_count: number;
  used_quantity: number;
  usage_value: number;
  average_quantity_per_request: number;
  average_value_per_request: number;
  first_usage_date: string | null;
  last_usage_date: string | null;
}

export interface VarianceRecord {
  region: string;
  team: string;
  item_code: string;
  item_name: string;
  category: string;
  sub_category: string;
  unit: string;
  expected_quantity: number;
  expected_value: number;
  closing_quantity: number;
  closing_value: number;
  remaining_quantity: number;
  remaining_value: number;
  shortage_quantity: number;
  shortage_value: number;
  used_quantity: number;
  usage_value: number;
  variance_quantity: number;
  variance_value: number;
  variance_percentage: number;
  variance_status: VarianceStatus;
}

export interface RequestComparison {
  region: string;
  team: string;
  item_code: string;
  item_name: string;
  category: string;
  sub_category: string;
  unit: string;
  transaction_type: string;
  previous_job_reference: string;
  previous_request_date: string | null;
  previous_quantity: number;
  previous_value: number;
  previous_remaining_quantity: number;
  previous_remaining_value: number;
  current_job_reference: string;
  current_request_date: string | null;
  current_quantity: number;
  current_value: number;
  current_remaining_quantity: number;
  current_remaining_value: number;
  quantity_difference: number;
  quantity_percentage_change: number;
  value_difference: number;
  value_percentage_change: number;
  remaining_difference: number;
}

export interface DashboardReports {
  regionalSummary: RegionalSummary[];
  regionTeamItemSummary: RegionTeamItemSummary[];
  itemUsage: ItemUsage[];
  varianceReport: VarianceRecord[];
  requestComparison: RequestComparison[];
}

export interface DatasetMeta {
  loaded: boolean;
  transaction_count: number;
  from_date: string | null;
  to_date: string | null;
  regions: string[];
  teams: string[];
  items: string[];
}

export interface UploadResult {
  file_names: string[];
  reports: DashboardReports;
  ingestion: {
    files_received: number;
    files_processed: number;
    files_skipped: string[];
    input_rows: number;
    transactions: number;
    duplicates_removed: number;
  };
  meta: DatasetMeta;
}

export interface ExecutiveSummary {
  scope: "team" | "province" | "item";
  filters: {
    regions: string[];
    teams: string[];
    item_codes: string[];
    from_date: string | null;
    to_date: string | null;
  };
  metrics: {
    expected_quantity: number;
    used_quantity: number;
    usage_value: number;
    closing_quantity: number;
    shortage_quantity: number;
    shortage_value: number;
    teams: number;
    items: number;
    regions: number;
  };
  usage_by_item: ItemUsage[];
  usage_by_region: { region: string; used_quantity: number; usage_value: number; request_count: number }[];
  usage_by_team: { team: string; used_quantity: number; usage_value: number; request_count: number }[];
  variance_records: VarianceRecord[];
  generated_at: string;
}
