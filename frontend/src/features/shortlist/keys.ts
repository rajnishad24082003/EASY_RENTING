export const shortlistKeys = {
  all: ["shortlist"] as const,
  list: (page: number) => [...shortlistKeys.all, "list", page] as const,
};
