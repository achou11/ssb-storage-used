declare module 'trammel' {
  function trammel<TypeOption extends string>(
    dir: string,
    options?: { type?: TypeOption; stopOnError?: boolean }
  ): Promise<TypeOption extends 'raw' ? number : string>

  export = trammel
}
