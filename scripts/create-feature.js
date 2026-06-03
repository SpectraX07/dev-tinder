#!/usr/bin/env node

/**
 * Usage:
 *   npm run feature -- <folderName> <fileName> <esm|common>
 *
 * Examples:
 *   npm run feature -- auth user esm
 *   npm run feature -- request connectionRequest common
 */

import fs from 'node:fs';
import path from 'node:path';

// ── Parse args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);

if (args.length < 3) {
  console.error(
    '\n❌  Three arguments are required.\n\n' +
      '   Usage : npm run feature -- <folderName> <fileName> <esm|common>\n' +
      '   Example: npm run feature -- auth user esm\n',
  );
  process.exit(1);
}

const [folderName, fileName, moduleType] = args.map((a) => a.toLowerCase());

if (!['esm', 'common'].includes(moduleType)) {
  console.error(
    `\n❌  Third argument must be "esm" or "common", got "${moduleType}".\n`,
  );
  process.exit(1);
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const isESM = moduleType === 'esm';

// ── Output dir ────────────────────────────────────────────────────────────────
const BASE_DIR = path.join(process.cwd(), 'src', 'features', folderName);

// ── Template helpers ──────────────────────────────────────────────────────────
const imp = (def, src) =>
  isESM ? `import ${def} from '${src}';` : `const ${def} = require('${src}');`;

const exp = (name) =>
  isESM ? `export default ${name};` : `module.exports = ${name};`;

const namedExp = (obj) =>
  isESM
    ? `export const { ${Object.keys(obj).join(', ')} } = { ${Object.entries(obj)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')} };`
    : Object.entries(obj)
        .map(([k, v]) => `exports.${k} = ${v};`)
        .join('\n');

// ── File templates ─────────────────────────────────────────────────────────────
const EXT = isESM ? 'js' : 'js'; // both .js; change to .mjs if you prefer

const files = {
  // ── model ──────────────────────────────────────────────────────────────────
  [`${fileName}.model.js`]: `${imp('mongoose', 'mongoose')}

const ${fileName}Schema = new mongoose.Schema(
  {
    // TODO: define ${cap(fileName)} fields
  },
  { timestamps: true }
);

const ${cap(fileName)} = mongoose.model('${cap(fileName)}', ${fileName}Schema);

${exp(`${cap(fileName)}`)}
`,

  // ── repository ─────────────────────────────────────────────────────────────
  [`${fileName}.repository.js`]: `${isESM ? `import ${cap(fileName)} from './${fileName}.model.js';` : `const ${cap(fileName)} = require('./${fileName}.model');`}

class ${cap(fileName)}Repository {
  async create(data) {
    return ${cap(fileName)}.create(data);
  }

  async findById(id) {
    return ${cap(fileName)}.findById(id);
  }

  async findAll(filter = {}) {
    return ${cap(fileName)}.find(filter);
  }

  async updateById(id, data) {
    return ${cap(fileName)}.findByIdAndUpdate(id, data, { new: true });
  }

  async deleteById(id) {
    return ${cap(fileName)}.findByIdAndDelete(id);
  }
}

${exp(`new ${cap(fileName)}Repository()`)}
`,

  // ── service ────────────────────────────────────────────────────────────────
  [`${fileName}.service.js`]: `${isESM ? `import ${fileName}Repository from './${fileName}.repository.js';` : `const ${fileName}Repository = require('./${fileName}.repository');`}

class ${cap(fileName)}Service {
  async create(data) {
    return ${fileName}Repository.create(data);
  }

  async getById(id) {
    const item = await ${fileName}Repository.findById(id);
    if (!item) throw new Error('${cap(fileName)} not found');
    return item;
  }

  async getAll() {
    return ${fileName}Repository.findAll();
  }

  async update(id, data) {
    return ${fileName}Repository.updateById(id, data);
  }

  async delete(id) {
    return ${fileName}Repository.deleteById(id);
  }
}

${exp(`new ${cap(fileName)}Service()`)}
`,

  // ── controller ─────────────────────────────────────────────────────────────
  [`${fileName}.controller.js`]: `${isESM ? `import ${fileName}Service from './${fileName}.service.js';` : `const ${fileName}Service = require('./${fileName}.service');`}

class ${cap(fileName)}Controller {
  async create(req, res, next) {
    try {
      const data = await ${fileName}Service.create(req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getAll(req, res, next) {
    try {
      const data = await ${fileName}Service.getAll();
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const data = await ${fileName}Service.getById(req.params.id);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const data = await ${fileName}Service.update(req.params.id, req.body);
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      await ${fileName}Service.delete(req.params.id);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
}

${exp(`new ${cap(fileName)}Controller()`)}
`,

  // ── validator ──────────────────────────────────────────────────────────────
  [`${fileName}.validator.js`]: `${imp('{ body, param }', 'express-validator')}

${
  isESM
    ? `export const create${cap(fileName)}Rules = [
  // body('field').notEmpty().withMessage('field is required'),
];

export const update${cap(fileName)}Rules = [
  param('id').isMongoId().withMessage('Invalid ID'),
];`
    : `exports.create${cap(fileName)}Rules = [
  // body('field').notEmpty().withMessage('field is required'),
];

exports.update${cap(fileName)}Rules = [
  param('id').isMongoId().withMessage('Invalid ID'),
];`
}
`,

  // ── routes ─────────────────────────────────────────────────────────────────
  [`${fileName}.routes.js`]: `${
    isESM
      ? `import { Router } from 'express';
import ${fileName}Controller from './${fileName}.controller.js';
import { create${cap(fileName)}Rules, update${cap(fileName)}Rules } from './${fileName}.validator.js';
import { validate } from '../../middleware/validate.js';

const router = Router();`
      : `const { Router } = require('express');
const ${fileName}Controller = require('./${fileName}.controller');
const { create${cap(fileName)}Rules, update${cap(fileName)}Rules } = require('./${fileName}.validator');
const { validate } = require('../../middleware/validate');

const router = Router();`
  }

router.post('/',    create${cap(fileName)}Rules, validate, ${fileName}Controller.create.bind(${fileName}Controller));
router.get('/',     ${fileName}Controller.getAll.bind(${fileName}Controller));
router.get('/:id',  ${fileName}Controller.getById.bind(${fileName}Controller));
router.put('/:id',  update${cap(fileName)}Rules, validate, ${fileName}Controller.update.bind(${fileName}Controller));
router.delete('/:id', ${fileName}Controller.delete.bind(${fileName}Controller));

${exp('router')}
`,
};

// ── Write files ───────────────────────────────────────────────────────────────
fs.mkdirSync(BASE_DIR, { recursive: true });

for (const [filename, content] of Object.entries(files)) {
  fs.writeFileSync(path.join(BASE_DIR, filename), content, 'utf8');
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log(`\n✅  Feature scaffolded successfully!`);
console.log(`   Folder : src/features/${folderName}/`);
console.log(`   Files  : ${fileName}.*`);
console.log(`   Module : ${moduleType.toUpperCase()}\n`);
Object.keys(files).forEach((f) => console.log(`   📄 ${f}`));
console.log(`\n💡  Mount the router in your app:\n`);
