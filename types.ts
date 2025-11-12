export type Profile = {
  name: string;
  fontFamily: string;
  color: string;        // text color
  status: string;
  customStatuses: string[];
  bubble: string;       // bubble color
  // Legacy/compat fields used by older components:
  display_name?: string;
  current_status?: string;
  show_status_bar?: boolean;
  textColor?: string;
};
