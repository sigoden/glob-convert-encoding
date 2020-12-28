const glob = require("glob");
const iconv = require("iconv-lite");
const chardet = require("jschardet");
const { promisify } = require("util");
const fs = require("fs/promises");
let [globValue, toEnc, fromEnc] = process.argv.slice(2);
if (!globValue || !toEnc) {
  console.log("Usage: change-encoding <glob> <to-enc> [from-enc]")
  process.exit();
}

toEnc = toEnc.toLowerCase();
if (!iconv.encodingExists(toEnc)) {
  console.log(`to-enc ${toEnc} unsupported`);
  process.exit(1);
}

if (fromEnc) {
  fromEnc = fromEnc.toLowerCase();
  if (!iconv.encodingExists(fromEnc)) {
    console.log(`from-enc ${fromEnc} unsupported`);
    process.exit(1);
  }
}

async function main() {
  let files;
  try {
    files = await promisify(glob)(globValue);
  } catch (err) {
    console.log(err.message);
    process.exit(1);
  }
  for (const file of files) {
    try {
      const ok = await convert(file);
      console.log(`${file} ${ok ? "successed" : "skipped"}`);
    } catch (err) {
      console.log(`${file} failed, ${err.message}`);
    }
  }
}

async function convert(file) {
  const buf = await fs.readFile(file);
  const detectResult  = chardet.detect(buf)
  const detectEnc = detectResult.encoding.toLowerCase();
  if (fromEnc && detectEnc !== fromEnc) return false;
  if (detectEnc === toEnc && detectResult.confidence > 0.8)  return false;
  const newBuf = iconv.encode(iconv.decode(buf, detectEnc), toEnc)
  await fs.writeFile(file, newBuf);
  return true;
}

main();