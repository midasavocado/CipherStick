// Detailed verification test
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
    },
    {
      action: "Clipboard.Set",
      params: { Input: "!ID:QRCode" }
    }
  ]
};

console.log('Converting...\n');

try {
  const result = await ConversionUniversal.toPlist(testData, 'Test');
  
  // Extract and display relevant sections
  const lines = result.split('\n');
  
  let inSaveToCamera = false;
  let inSetClipboard = false;
  let lineCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('is.workflow.actions.savetocameraroll') && !inSaveToCamera) {
      inSaveToCamera = true;
      console.log('\n=== SaveToCameraRoll WFInput ===');
    }
    
    if (lines[i].includes('is.workflow.actions.setclipboard') && !inSetClipboard) {
      inSaveToCamera = false;
      inSetClipboard = true;
      console.log('\n=== SetClipboard WFInput ===');
    }
    
    if (inSaveToCamera && lines[i].includes('<key>WFInput</key>')) {
      for (let j = i; j < i + 20 && j < lines.length; j++) {
        console.log(lines[j]);
        if (lines[j].includes('</dict>') && j > i + 5) break;
      }
      inSaveToCamera = false;
    }
    
    if (inSetClipboard && lines[i].includes('<key>WFInput</key>')) {
      for (let j = i; j < i + 20 && j < lines.length; j++) {
        console.log(lines[j]);
        if (lines[j].includes('</dict>') && j > i + 5) break;
      }
      inSetClipboard = false;
    }
  }
  
} catch (err) {
  console.error('Error:', err.message);
}
