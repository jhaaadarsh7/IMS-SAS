export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  branchIds: string[];
  warehouseIds: string[];
  isActive?: boolean;
};
