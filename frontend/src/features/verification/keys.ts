export const verificationKeys = {
  all: ["verification"] as const,
  mine: () => [...verificationKeys.all, "mine"] as const,
};
