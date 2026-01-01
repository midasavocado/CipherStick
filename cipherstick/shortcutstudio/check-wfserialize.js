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
const saveIdx = plist.indexOf('is.workflow.actions.savetocameraroll');
const snippet = plist.substring(saveIdx - 50, saveIdx + 600);

// Find and show WFInput section
const wfinputIdx = snippet.indexOf('<key>WFInput</key>');
console.log(snippet.substring(wfinputIdx, wfinputIdx + 300));
