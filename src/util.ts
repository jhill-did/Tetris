export const objectKeys = <T extends object>(x: T): (keyof T)[] => (
  Object.keys(x) as any
);
