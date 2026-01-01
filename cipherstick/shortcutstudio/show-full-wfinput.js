import ConversionLib from './secrets/src/lib/conversions.js';

const { ConversionUniversal } = ConversionLib || {};

const testData = {
  name: "Test",
  actions: [
    { action: "Ask.ForInput", params: { Prompt: "Enter text", ID: "{{UserText}}" } },
    { action: "Barcode.Generate", params: { Text: "!ID:UserText", ID: "{{QRCode}}" } },
    { action: "Savetocameraroll", params: { Input: "!ID:QRCode" } }
  ]
};

const plist = await ConversionUniversal.toPlist(testData, 'Test');
const wfinputIdx = plist.indexOf('<key>WFInput</key>');
const endIdx = plist.indexOf('</dict></dict>', wfinputIdx) + 14;
console.log(plist.substring(wfinputIdx, endIdx));
