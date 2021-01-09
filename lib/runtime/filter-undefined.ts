type RequiredKeys<T> = { [K in keyof T]-?:
  ({} extends { [P in K]: T[K] } ? never : K)
}[keyof T]

type NonUndefinedKeys<T> = { [K in keyof T]:
  (undefined extends T[K]  ? never : K)
}[keyof T]

type ExcludeOptionalProps<T> = Pick<T, RequiredKeys<T> & NonUndefinedKeys<T>>

export function filterUndefined<T>(object: T): ExcludeOptionalProps<T> {
  return Object.keys(object).reduce((acc, cur) => {
    const valueAtKey = (object as any)[cur];
    if (valueAtKey !== undefined) {
      (acc as any)[cur] = valueAtKey;
    }
    return acc
  }, {} as ExcludeOptionalProps<T>)
}
