import { Module } from 'module'

export default function isDefaultExport (node: typeof Module): boolean {
  return 'default' in node
}
