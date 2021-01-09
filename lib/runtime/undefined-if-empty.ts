export function undefinedIfEmpty(value: string | undefined | null) {
  return !value ? undefined : value
}
