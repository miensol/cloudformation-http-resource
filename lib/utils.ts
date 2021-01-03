export function flatMap<T, R>(items: T[], mapper: (item: T) => R[]): R[] {
  return items.reduce((acc, cur) => acc.concat(mapper(cur)), [] as R[])
}

export function uniqBy<T, K = T>(items: T[], keySelector: (item: T) => K): T[] {
  const map = new Map<K, T>(items.map(item => [keySelector(item), item]))
  return Array.from(map.values())
}

export function filterIsInstance<T>(items: any[], instanceType: new (...args: any) => T): T[] {
  return items.filter(item => item instanceof instanceType)
}

export function associateBy<T>(items: T[], keySelector: (item: T) => string): { [key: string]: T } {
  return items.reduce((acc, cur) => {
    acc[keySelector(cur)] = cur
    return acc
  }, {} as { [key: string]: T })
}

