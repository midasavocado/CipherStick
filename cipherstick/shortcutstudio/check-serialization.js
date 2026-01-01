// Check for WFSerializationType
import ConversionLib from './secrets/src/lib/conversions.js';

const { ConversionUniversal } = ConversionLib || {};

const testData = {
  name: "Test",
  actions: [
    {
      action: "Ask.ForInput",
      params: { Prompt: "Enter text", ID: "{{UserText}}" }
    },
    {
      action: "Barcode.Generate",
      params: { Text: "!ID:UserText", ID: "{{QRCode}}" }
    },
    {
      action: "Savetocameraroll",
      params: { Input: "!ID:QRCode" }
    }
  ]
};

const result = await ConversionUniversal.toPlist(testData, 'Test');

// Find SaveToCameraRoll WFInput section
const startIdx = result.indexOf('is.workflow.actions.savetocameraroll');
const endIdx = result.indexOf('</dict>', startIdx) + 7;
const section = result.substring(startIdx - 100, endIdx + 100);

// Show around the WFInput key
const wfinputIdx = section.indexOf('<key>WFInput</key>');
console.log(section.substring(wfinputIdx, wfinputIdx + 400));
