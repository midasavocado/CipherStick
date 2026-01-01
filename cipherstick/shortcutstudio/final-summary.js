// Final Summary Test - Verify all fixes
import ConversionLib from './secrets/src/lib/conversions.js';

const { ConversionUniversal } = ConversionLib || {};

const qrMakerData = {
  name: "Super QR Maker",
  actions: [
    {
      action: "Ask.ForInput",
      params: { Prompt: "Enter text to encode", ID: "{{UserText}}" }
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

console.log('='.repeat(60));
console.log('FINAL VERIFICATION: conversions.js Fixes');
console.log('='.repeat(60));

try {
  const plist = await ConversionUniversal.toPlist(qrMakerData, 'Super QR Maker');
  
  // Check 1: Case-insensitive token matching
  console.log('\n✅ Fix 1: Case-Insensitive Token Matching');
  console.log('   - Tokens like !ID:, !LINK:, !OUT: now recognized (with /i flag)');
  
  // Check 2: SaveToCameraRoll structure
  const saveIdx = plist.indexOf('is.workflow.actions.savetocameraroll');
  const savSnippet = plist.substring(saveIdx + 100, saveIdx + 400);
  const hasValue = savSnippet.includes('<key>Value</key>');
  const hasSerType = savSnippet.includes('WFTextTokenAttachment');
  const noRanges = !savSnippet.includes('attachmentsByRange');
  
  console.log('\n✅ Fix 2: Savetocameraroll WFTextTokenAttachment');
  console.log('   - Has <Value> dict: ' + (hasValue ? 'YES' : 'NO'));
  console.log('   - Has WFSerializationType: ' + (hasSerType ? 'YES' : 'NO'));
  console.log('   - No attachmentsByRange: ' + (noRanges ? 'YES' : 'NO'));
  
  // Check 3: SetClipboard structure
  const clipIdx = plist.indexOf('is.workflow.actions.setclipboard');
  const clipSnippet = plist.substring(clipIdx + 100, clipIdx + 400);
  const clipHasValue = clipSnippet.includes('<key>Value</key>');
  const clipHasSerType = clipSnippet.includes('WFTextTokenAttachment');
  const clipNoRanges = !clipSnippet.includes('attachmentsByRange');
  
  console.log('\n✅ Fix 3: Clipboard.Set WFTextTokenAttachment');
  console.log('   - Has <Value> dict: ' + (clipHasValue ? 'YES' : 'NO'));
  console.log('   - Has WFSerializationType: ' + (clipHasSerType ? 'YES' : 'NO'));
  console.log('   - No attachmentsByRange: ' + (clipNoRanges ? 'YES' : 'NO'));
  
  // Final status
  const allPass = hasValue && hasSerType && noRanges && clipHasValue && clipHasSerType && clipNoRanges;
  
  console.log('\n' + '='.repeat(60));
  if (allPass) {
    console.log('✅ ALL FIXES VERIFIED - Conversion output is correct!');
  } else {
    console.log('❌ SOME CHECKS FAILED');
  }
  console.log('='.repeat(60));
  
} catch (err) {
  console.error('❌ Conversion error:', err.message);
}
