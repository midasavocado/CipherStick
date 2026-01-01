// Final verification test
import ConversionLib from './secrets/src/lib/conversions.js';
import fs from 'fs';

const { ConversionUniversal } = ConversionLib || {};

// Test data
const testData = {
  name: "Test Conversion",
  actions: [
    {
      action: "Ask.ForInput",
      params: {
        Prompt: "Enter text",
        ID: "{{UserText}}"
      }
    },
    {
      action: "GenerateQRCodeFromText",
      params: {
        Text: "!ID:UserText",
        ID: "{{QRCode}}"
      }
    },
    {
      action: "Savetocameraroll",
      params: {
        Input: "!ID:QRCode"
      }
    },
    {
      action: "Clipboard.Set",
      params: {
        Input: "!ID:QRCode"
      }
    }
  ]
};

console.log('Converting to plist...\n');

try {
  const result = await ConversionUniversal.toPlist(testData, 'Test');
  
  // Check savetocameraroll
  if (result.includes('is.workflow.actions.savetocameraroll')) {
    console.log('✓ Found savetocameraroll action');
    const startIdx = result.indexOf('is.workflow.actions.savetocameraroll');
    const snippet = result.substring(startIdx, startIdx + 500);
    
    if (snippet.includes('WFTextTokenAttachment')) {
      console.log('✓ savetocameraroll uses WFTextTokenAttachment');
    }
    if (!snippet.includes('attachmentsByRange')) {
      console.log('✓ savetocameraroll does NOT use attachmentsByRange');
    }
  }
  
  // Check setclipboard
  if (result.includes('is.workflow.actions.setclipboard')) {
    console.log('\n✓ Found setclipboard action');
    const startIdx = result.indexOf('is.workflow.actions.setclipboard');
    const snippet = result.substring(startIdx, startIdx + 500);
    
    if (snippet.includes('WFTextTokenAttachment')) {
      console.log('✓ setclipboard uses WFTextTokenAttachment');
    }
    if (!snippet.includes('attachmentsByRange')) {
      console.log('✓ setclipboard does NOT use attachmentsByRange');
    }
  }
  
  console.log('\n✅ Conversion successful!');
  
} catch (err) {
  console.error('❌ Conversion failed:', err.message);
  if (err.detail) console.error('Detail:', err.detail);
}
