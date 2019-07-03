const { telemetry } = require('./utils/get-telemetry-for');
// everything is copy-pasteable to astexplorer.net.
// sorta. telemetry needs to be defined.
// telemtry can be populated with -mock-telemetry.json

/**
 * plugin entrypoint
 */
function transformPlugin(env, runtimeData) {
  let { builders: b } = env.syntax;

  let scopedParams = [];
  let [components, helpers] = populateInvokeables();

  let nonThises = { scopedParams, components, helpers };

  return {
    Program: {
      enter(node) {
        node.blockParams.forEach(param => {
          scopedParams.push(param);
        });
      },

      exit(node) {
        node.blockParams.forEach(() => {
          scopedParams.pop();
        });
      },
    },
    PathExpression(ast) {
      let token = ast.parts[0];

      if (token !== 'this') {
        let isThisNeeded = doesTokenNeedThis(token, nonThises, runtimeData);

        if (isThisNeeded) {
          return b.path(`this.${ast.parts.join('.')}`);
        }
      }
    },
  };
}

// Does the runtime data (for the c
// urrent file)
// contain a definition for the token?
// - yes:
//   - in-let: false
//   - in-each: false
//   - true
// - no:
//   - is-helper: false
//   - is-component: false
function doesTokenNeedThis(token, { components, helpers, scopedParams }, runtimeData) {
  // let isBlockParam = scopedParams.includes(token);

  // if (isBlockParam) {
  //   return false;
  // }

  // let isComponent = components.find(path => path.endsWith(token));

  // if (isComponent) {
  //   return false;
  // }

  // let isHelper = helpers.find(path => path.endsWith(token));

  // if (isHelper) {
  //   return false;
  // }

  // return true;
  //
  //
  let { computedProperties, ownActions, ownProperties } = runtimeData;

  let isBlockParam = (scopedParams || []).includes(token);

  if (isBlockParam) {
    return false;
  }

  let isComputed = (computedProperties || []).includes(token);
  let isAction = (ownActions || []).includes(token);
  let isProperty = (ownProperties || []).includes(token);

  let needsThis = isComputed || isAction || isProperty;

  if (needsThis) {
    return true;
  }

  // not found :(
  // search the world.
  let isComponent = components.find(path => path.endsWith(token));

  if (isComponent) {
    return false;
  }

  let isHelper = helpers.find(path => path.endsWith(token));

  if (isHelper) {
    return false;
  }

  // Hopefully local-scoped variable
  return false;
}

function populateInvokeables() {
  let components = [];
  let helpers = [];

  for (let name of Object.keys(telemetry)) {
    let entry = telemetry[name];

    switch (entry.type) {
      case 'Component':
        components.push(name);
        break;
      case 'Helper':
        helpers.push(name);
        break;
    }
  }

  return [components, helpers];
}

module.exports = transformPlugin;
