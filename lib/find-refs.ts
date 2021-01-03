import { flatMap, uniqBy } from "./utils";

interface Ref {
  Ref: string
}

export function findRefs(value: any): Ref[] {
  function findRefsRecursive(value: any): Ref[] {
    if (!value) {
      return []
    }

    if (Array.isArray(value)) {
      return flatMap(value, findRefsRecursive)
    }

    if (typeof value === "object") {
      const valueKeys = Object.keys(value);
      const isRef = valueKeys.length === 1 && valueKeys[0] === "Ref";
      if (isRef) {
        return [value]
      } else {
        return flatMap(Object.values(value), findRefsRecursive)
      }
    }

    return []
  }

  return uniqBy(findRefsRecursive(value), val => val.Ref);
}
