// Concatenates classic (non-module) scripts listed in a *.concat file into one
// script, so top-level `var`/`function` declarations stay shared globals.
const path = require('path');
const fs = require('fs');
const { Transformer } = require('@parcel/plugin');

module.exports = new Transformer({
  async transform({ asset }) {
    const dir = path.dirname(asset.filePath);
    const files = (await asset.getCode())
      .split(/\r?\n/)
      .map((line) => line.replace(/#.*/, '').trim())
      .filter(Boolean);

    const parts = files.map((file) => {
      const filePath = path.resolve(dir, file);
      asset.invalidateOnFileChange(filePath);
      let code = fs.readFileSync(filePath, 'utf8');
      // Vendor UMD libs: shadow CommonJS names so Parcel doesn't treat them as
      // modules (`require`/`module.exports`) and they fall back to window globals.
      if (/(^|\/)vendor\//.test(file)) {
        code = `(function (module, exports, require) {\n${code}\n}).call(window);`;
      }
      // Trailing `;` guards against files that don't end with a semicolon.
      return `/* ${file} */\n${code}\n;`;
    });

    asset.type = 'js';
    asset.setCode(parts.join('\n'));
    return [asset];
  },
});
