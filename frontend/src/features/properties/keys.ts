export const propertyKeys = {
  all: ["properties"] as const,
  detail: (id: string) => [...propertyKeys.all, "detail", id] as const,
  mine: (page: number) => [...propertyKeys.all, "mine", page] as const,
  mineAll: () => [...propertyKeys.all, "mine"] as const,
};
