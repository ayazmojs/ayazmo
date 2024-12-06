import { TSMigrationGenerator } from '@ayazmo/types'

export default class AyazmoMigrationGenerator extends TSMigrationGenerator {
  private isSchemaStatement (sql: string): boolean {
    const schemaPattern = /^\s*(create|drop)\s+schema\s+if\s+(not\s+)?exists\s+"[^"]+"\s*;\s*$/i
    return schemaPattern.test(sql)
  }

  override generateMigrationFile (className: string, diff: { up: string[], down: string[] }): string {
    // Filter out schema statements from diff
    const filteredDiff = {
      up: diff.up.filter(sql => !this.isSchemaStatement(sql)),
      down: diff.down.filter(sql => !this.isSchemaStatement(sql))
    }

    return super
      .generateMigrationFile(className, filteredDiff)
      .replace("import { Migration } from '@mikro-orm/migrations';", "import { Migration } from '@ayazmo/types';")
  }

  override createStatement (sql: string, padLeft: number): string {
    // Skip schema statements
    if (this.isSchemaStatement(sql)) {
      return ''
    }

    // Remove schema prefix from table names based on DB_SCHEMA
    if (process.env.DB_SCHEMA != null) {
      // Escape special characters in the schema name for regex
      const escapedSchema = process.env.DB_SCHEMA.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      sql = sql.replace(new RegExp(`"${escapedSchema}"\\.`, 'g'), '')
    } else {
      // Fallback to removing all schema prefixes (e.g., "booking"."test" -> "test")
      sql = sql.replace(/"[^"]+"\./g, '')
    }
    return super.createStatement(sql, padLeft)
  }
}
