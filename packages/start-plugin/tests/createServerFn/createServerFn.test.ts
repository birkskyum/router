import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

import { compileStartOutput } from '../../src/compilers'

async function getFilenames() {
  return await readdir(path.resolve(import.meta.dirname, './test-files'))
}

describe('createServerFn compiles correctly', async () => {
  const filenames = await getFilenames()

  describe.each(filenames)('should handle "%s"', async (filename) => {
    const file = await readFile(
      path.resolve(import.meta.dirname, `./test-files/${filename}`),
    )
    const code = file.toString()

    test.each(['client', 'server'] as const)(
      `should compile for ${filename} %s`,
      async (env) => {
        const compiledResult = compileStartOutput({
          env,
          code,
          root: './test-files',
          filename,
        })

        await expect(compiledResult.code).toMatchFileSnapshot(
          `./snapshots/${env}/${filename}`,
        )
      },
    )
  })

  test('should error if created without a handler', () => {
    expect(() => {
      compileStartOutput({
        env: 'client',
        code: `
        import { createServerFn } from '@tanstack/start'
        createServerFn()`,
        root: './test-files',
        filename: 'no-fn.ts',
      })
    }).toThrowError()
  })

  test('should be assigned to a variable', () => {
    expect(() => {
      compileStartOutput({
        env: 'client',
        code: `
        import { createServerFn } from '@tanstack/start'
        createServerFn().handler(async () => {})`,
        root: './test-files',
        filename: 'no-fn.ts',
      })
    }).toThrowError()
  })

  test('should work with identifiers of functions', () => {
    const code = `
        import { createServerFn } from '@tanstack/start'
        const myFunc = () => {
          return 'hello from the server'
        }
        const myServerFn = createServerFn().handler(myFunc)`

    const compiledResultClient = compileStartOutput({
      root: '/test',
      filename: 'test.ts',
      code,
      env: 'client',
    })

    const compiledResultServer = compileStartOutput({
      root: '/test',
      filename: 'test.ts',
      code,
      env: 'server',
    })

    expect(compiledResultClient.code).toMatchInlineSnapshot(`
      "import { createServerFn } from '@tanstack/start';
      const myServerFn = createServerFn().handler(opts => {
        "use server";

        return myServerFn.__executeServer(opts);
      });"
    `)

    expect(compiledResultServer.code).toMatchInlineSnapshot(`
      "import { createServerFn } from '@tanstack/start';
      const myFunc = () => {
        return 'hello from the server';
      };
      const myServerFn = createServerFn().handler(opts => {
        "use server";

        return myServerFn.__executeServer(opts);
      }, myFunc);"
    `)
  })
})