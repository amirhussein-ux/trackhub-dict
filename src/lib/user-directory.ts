import { apiRequest } from "@/lib/api/client";
import { divisions, type Division } from "@/lib/mock-data";

type DirectoryUser = {
  name?: string;
  email?: string;
  division?: string;
};

export type DivisionMembers = Record<Division, { name: string; email: string }[]>;

export function buildEmptyDivisionMembers(): DivisionMembers {
  return divisions.reduce((acc, division) => {
    acc[division] = [];
    return acc;
  }, {} as DivisionMembers);
}

export async function fetchDivisionMembers(): Promise<DivisionMembers> {
  const users = await apiRequest<DirectoryUser[]>("/users/shareable");
  const members = buildEmptyDivisionMembers();

  users.forEach((user) => {
    if (!user.email || !user.name || !user.division) {
      return;
    }

    const division = user.division as Division;
    if (!members[division]) {
      return;
    }

    members[division].push({ name: user.name, email: user.email });
  });

  return members;
}
