import * as fs from 'fs'
import { PluginConfig } from '@ayazmo/types'
import * as recast from 'recast'
import { namedTypes, visit, builders } from 'ast-types'

// Helper function to build an AST node for an object expression
function buildObjectExpression (obj: Record<string, any>): namedTypes.ObjectExpression {
  return builders.objectExpression(
    Object.entries(obj).map(([key, value]) =>
      builders.property(
        'init',
        builders.identifier(key),
        typeof value === 'object' && value !== null
          ? buildObjectExpression(value)
          : builders.literal(value)
      )
    )
  )
}

/**
 * Adds a new plugin configuration to the app config file.
 *
 * @param appConfigPath The path to the app config file.
 * @param pluginConfigPath The path to the plugin config file.
 */
export async function amendConfigFile (appConfigPath: string, pluginConfigPath: string): Promise<void> {
  try {
    const [appConfig, pluginConfigImport] = await Promise.all([
      fs.promises.readFile(appConfigPath, 'utf-8'),
      import(pluginConfigPath)
    ])

    const pluginConfig: PluginConfig = pluginConfigImport.default

    // Parse the code into an AST with recast
    const ast = recast.parse(appConfig)

    let pluginsArray: namedTypes.ArrayExpression | null = null as any

    // Traverse the AST to find the plugins array
    visit(ast, {
      // @ts-expect-error
      visitProperty (path) {
        const node = path.node
        if (
          namedTypes.Identifier.check(node.key) &&
          node.key.name === 'plugins' &&
          namedTypes.ArrayExpression.check(node.value)
        ) {
          pluginsArray = node.value
          return false
        }
        this.traverse(path)
      }
    })

    if (pluginsArray != null) {
      const pluginExists = pluginsArray.elements.some(element => {
        if (namedTypes.ObjectExpression.check(element)) {
          return element.properties.some(prop => {
            return (
              namedTypes.Property.check(prop) &&
              namedTypes.Identifier.check(prop.key) &&
              prop.key.name === 'name' &&
              namedTypes.Literal.check(prop.value) &&
              prop.value.value === pluginConfig.name
            )
          })
        }
        return false
      })

      if (!pluginExists) {
        const newPluginNode = buildObjectExpression(pluginConfig)
        pluginsArray.elements.push(newPluginNode)
      }
    } else {
      // Add the plugins array if it doesn't exist
      visit(ast, {
        // @ts-expect-error
        visitExportDefaultDeclaration (path) {
          if (
            namedTypes.ObjectExpression.check(path.node.declaration)
          ) {
            const newPluginsProperty = builders.property(
              'init',
              builders.identifier('plugins'),
              builders.arrayExpression([buildObjectExpression(pluginConfig)])
            )
            path.node.declaration.properties.push(newPluginsProperty)
            return false
          }
          this.traverse(path)
        }
      })
    }

    // // Generate the updated code from the modified AST
    let updatedCode = recast.print(ast).code
    // Post-process to remove extra new lines
    updatedCode = updatedCode.replace(
      /(\n\s*\n(\s*settings:|\s*options:))/g,
      '\n$2'
    ).replace(
      /(private:\s*true,\s*\n\s*\n)/g,
      'private: true,\n'
    )

    // // Write the updated code back to the file
    await fs.promises.writeFile(appConfigPath, updatedCode, 'utf-8')
  } catch (error) {
    console.error('Error amending config file:', error)
  }
}

/**
 * Removes a plugin configuration from the app config file.
 *
 * @param appConfigPath The path to the app config file.
 * @param pluginName The plugin name to remove from the config file.
 */
export async function removePluginConfig (appConfigPath: string, pluginName: string): Promise<void> {
  try {
    const appConfig = await fs.promises.readFile(appConfigPath, 'utf-8')

    // Parse the code into an AST with recast
    const ast = recast.parse(appConfig)

    visit(ast, {
      // @ts-expect-error
      visitProperty (path) {
        const node = path.node
        if (
          namedTypes.Identifier.check(node.key) &&
          node.key.name === 'plugins' &&
          namedTypes.ArrayExpression.check(node.value)
        ) {
          node.value.elements = node.value.elements.filter(element => {
            if (namedTypes.ObjectExpression.check(element)) {
              return !element.properties.some(prop => {
                return (
                  namedTypes.Property.check(prop) &&
                  namedTypes.Identifier.check(prop.key) &&
                  prop.key.name === 'name' &&
                  namedTypes.Literal.check(prop.value) &&
                  prop.value.value === pluginName
                )
              })
            }
            return true
          })
          return false // Stop traversing this path after modification
        }
        this.traverse(path)
      }
    })

    const updatedCode = recast.print(ast).code

    // Write the updated code back to the file
    await fs.promises.writeFile(appConfigPath, updatedCode, 'utf-8')

    console.log(`Plugin configuration for '${pluginName}' removed successfully!`)
  } catch (error) {
    console.error('Error removing plugin configuration:', error)
  }
}
