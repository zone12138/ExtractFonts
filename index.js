const fs = require("fs");
const opentype = require("opentype.js");
const ttf2woff2 = require("ttf2woff2");
const ora = require("ora");
const path = require("path");
/**
 * 获取特定段的Unicode码点
 * @param {*} startHex  段开始
 * @param {*} endHex    段结束
 * @returns
 */
function unicodeRangeToDecimals(startHex, endHex) {
  const startDec = parseInt(startHex, 16);
  const endDec = parseInt(endHex, 16);
  const decimals = [];

  for (let i = startDec; i <= endDec; i++) {
    decimals.push(i);
  }

  return decimals;
}

/**
 * 提取字体
 * @param {String} fontPath 字体文件路径
 * @param {String} textPath 文字文件路径
 * @param {String} fontName 字体文件名
 * @param {Boolean} toWoff2 是否转成woff2
 */
const subsetFont = async function (
  fontPath,
  textPath,
  fontName,
  toWoff2 = true
) {
  const spinner = ora("提取文字中，请稍候！ Loading...").start();
  try {
    const fontExt = path.extname(fontPath).toLocaleLowerCase();
    if (![".ttf", ".otf"].includes(fontExt))
      throw new Error("字体文件格式错误,仅支持提取.ttf或者.otf的字体文件！");

    if (typeof fontName === "undefined")
      fontName = path.basename(fontPath, fontExt);

    // 读取需要提取的文字 （.txt）
    const textBuffer = await fs.promises.readFile(textPath);
    // 读取需要提取的字体文件 (.ttf / .otf)
    const fontBuffer = await fs.promises.readFile(fontPath);

    // 解析字体
    const font = opentype.parse(fontBuffer.buffer);
    // 定义要提取的字符（将提取的文字文件由buffer转成string）
    const extractedFont = textBuffer.toString();
    // 提取字符的Unicode码点 (加上cjk部首区 - 苹方字体需要)
    const charCodes = extractedFont
      .split("")
      .map((char) => char.charCodeAt(0))
      .concat(unicodeRangeToDecimals("2E80", "2FDF"));
    // 创建子集字体描述
    const subsetFont = new opentype.Font({
      familyName: font.names.fontFamily.en,
      styleName: font.names.fontSubfamily.en,
      ascender: font.ascender,
      descender: font.descender,
      unitsPerEm: font.unitsPerEm,
      ascent: font.ascent,
      descent: font.descent,
      glyphs: Object.values(font.glyphs.glyphs).filter((glyph) =>
        charCodes.includes(Number(glyph.unicode))
      ),
    });

    if (toWoff2) {
      const buffer = Buffer.from(subsetFont.toArrayBuffer());
      fs.writeFileSync(`${fontName}.woff2`, ttf2woff2(buffer));
    } else {
      subsetFont.download(`${fontName}${fontExt}`);
    }

    spinner.succeed(`成功！`);
  } catch (err) {
    spinner.fail(`失败！${err.message}`);
  } finally {
    spinner.clear();
  }
};

subsetFont("./PingFang_SC.ttf", "./7500字.txt");
