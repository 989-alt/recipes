// StatiCrypt helper for index.html, reusing the crypto engine embedded in the page itself.
//   node tools/crypt.js dec index.html .work/book.html     (password from RECIPE_PW)
//   node tools/crypt.js enc index.html .work/book.html     (re-encrypts with the same salt, verifies)
const fs = require('fs');
const [, , mode, file, plainPath] = process.argv;
const pw = process.env.RECIPE_PW;
if (!pw || !['dec', 'enc'].includes(mode)) { console.error('usage: RECIPE_PW=... node tools/crypt.js dec|enc index.html plain.html'); process.exit(2); }
const page = fs.readFileSync(file, 'utf8');
const a = page.indexOf('const cryptoEngine = ((function(){'), b = page.indexOf('const decode = codec.init(cryptoEngine).decode;');
const src = page.slice(a, b);
const cfg = JSON.parse(page.match(/staticryptConfig = (\{.*?\});\n/s)[1]);
const { cryptoEngine, codec } = new Function('crypto', src + '\nreturn {cryptoEngine, codec};')(globalThis.crypto);
const c = codec.init(cryptoEngine);
const salt = cfg.staticryptSaltUniqueVariableName;
(async () => {
  const hashed = await cryptoEngine.hashPassword(pw, salt);
  if (mode === 'dec') {
    const r = await c.decode(cfg.staticryptEncryptedMsgUniqueVariableName, hashed, salt);
    if (!r.success) { console.error('wrong password'); process.exit(1); }
    fs.writeFileSync(plainPath, r.decoded);
    console.log('decrypted', r.decoded.length, 'chars ->', plainPath);
  } else {
    const plain = fs.readFileSync(plainPath, 'utf8');
    const enc = await c.encode(plain, pw, salt);
    fs.writeFileSync(file, page.replace(cfg.staticryptEncryptedMsgUniqueVariableName, () => enc));
    const r = await c.decode(enc, hashed, salt);
    if (!(r.success && r.decoded === plain)) { console.error('verify failed'); process.exit(1); }
    console.log('encrypted + verified ->', file);
  }
})();
