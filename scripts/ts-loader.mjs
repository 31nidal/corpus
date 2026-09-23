import { access } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('.') && context.parentURL?.startsWith('file:') && !/\.[a-z]+$/i.test(specifier)) {
    const base = new URL(specifier, context.parentURL)
    for (const candidate of [
      ...['.ts', '.tsx', '.js', '.jsx'].map(extension => `${base.href}${extension}`),
      ...['.ts', '.tsx', '.js', '.jsx'].map(extension => `${base.href}/index${extension}`)
    ]) {
      try {
        await access(fileURLToPath(new URL(candidate)))
        return nextResolve(candidate, context)
      } catch {
        // Try the next source extension or directory index.
      }
    }
  }
  return nextResolve(specifier, context)
}
