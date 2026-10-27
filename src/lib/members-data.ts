export interface Member {
  id: string;
  name: string;
  email: string | null;
  role: string;
  isAdmin: boolean;
  birthday?: string | null;
  spouse?: string | null;
  about?: string | null;
}

// Optional fallback list shown before the database has members.
// Leave empty; real members live in the database (see README).
export const INITIAL_MEMBERS: Member[] = [];

