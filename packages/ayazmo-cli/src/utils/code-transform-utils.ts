import jscodeshift from 'jscodeshift';

export const withParser = (parser: string) => jscodeshift.withParser(parser);

export const removePluginFromConfig = (configFileSource: string, pluginName: string): string => {
  const j = withParser('babel');

  return j(configFileSource)
    .find(j.Property, {
      key: {
        type: 'Identifier',
        name: 'plugins',
      },
    })
    .forEach((path) => {
      const pluginsArray = path.node.value;
      if (pluginsArray.type === 'ArrayExpression') {
        pluginsArray.elements = pluginsArray.elements.filter((pluginNode) => {
          if (pluginNode && pluginNode.type === 'ObjectExpression') {
            const properties = pluginNode.properties;
            const pluginNameProperty = properties.find((property) =>
              (property.type === 'ObjectProperty' || property.type === 'Property') &&
              property.key.type === 'Identifier' && property.key.name === 'name'
            );
            // @ts-ignore
            return pluginNameProperty && pluginNameProperty.value.value !== pluginName;
          }
          return false;
        });
      }
    })
    .toSource({
      reuseWhitespace: true,
    });
};

// add plugin to config file
export const addPluginToConfig = (configFileSource: string, pluginName: string): string => {
  const j = withParser('babel');

  return j(configFileSource)
    .find(j.Property, {
      key: {
        type: 'Identifier',
        name: 'plugins',
      },
    })
    .forEach((path) => {
      const pluginsArray = path.node.value;
      if (pluginsArray.type === 'ArrayExpression') {
        pluginsArray.elements.push({
          type: 'ObjectExpression',
          properties: [
            {
              type: 'ObjectProperty',
              key: {
                type: 'Identifier',
                name: 'name',
              },
              value: {
                type: 'StringLiteral',
                value: pluginName,
              },
            },
            {
              type: 'ObjectProperty',
              key: {
                type: 'Identifier',
                name: 'settings',
              },
              value: {
                type: 'ObjectExpression',
                // add the plugin settings by dynamically creating a new object property from pluginSettings
                properties: [
                  {
                    type: 'ObjectProperty',
                    key: {
                      type: 'Identifier',
                      name: 'private',
                    },
                    value: {
                      type: 'BooleanLiteral',
                      value: false,
                    },
                  }
                ],
              },
            },
          ],
        });
      }
    })
    .toSource();
};