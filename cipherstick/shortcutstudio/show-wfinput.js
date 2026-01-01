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

const result = await ConversionUniversal.toPlist(testData, 'Test');
const wfinputIdx = result.indexOf('<key>WFInput</key>');
console.log(result.substring(wfinputIdx, wfinputIdx + 500));
