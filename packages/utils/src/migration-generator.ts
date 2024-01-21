import { TSMigrationGenerator } from '@mikro-orm/migrations';

export default class AyazmoMigrationGenerator extends TSMigrationGenerator {
  override generateMigrationFile(className: string, diff: { up: string[]; down: string[] }): string {
    return super
      .generateMigrationFile(className, diff)
      .replace("import { Migration } from '@mikro-orm/migrations';", "import { Migration } from '@ayazmo/utils';")
  }

  override createStatement(sql: string, padLeft: number): string {
    return super.createStatement(sql, padLeft);
  }

}