export const log = <T extends { message: string }>(value: T) => {
  console.log(value)
}
