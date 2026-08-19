export type ContactRow = {
  id: string;
  phone: string;
  fullName: string | null;
  city: string | null;
  profession: string | null;
  category: string | null;
  status: string | null;
  tags: string[];
  notes: string | null;
};
