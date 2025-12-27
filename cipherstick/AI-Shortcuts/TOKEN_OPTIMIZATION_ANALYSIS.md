# Token Usage Optimization Analysis

## Executive Summary
This document identifies opportunities to reduce token usage in `secrets/src/index.js` (2579 lines) without sacrificing quality. Estimated savings: **30-40% reduction** in tokens sent to LLMs.

---

## 🔴 High Impact Optimizations (System Prompts)

### 1. ACTION_PICK_SYSTEM (Lines 273-314) - ~800 tokens
**Current:** Very verbose with repetitive explanations
**Optimization:** Condense while keeping core rules

**Savings:** ~400 tokens per request

**Key changes:**
- Remove redundant explanations
- Use abbreviations for common terms
- Consolidate similar rules
- Remove examples that are obvious

### 2. BUILD_PROGRAM_SYSTEM (Lines 406-493) - ~1200 tokens
**Current:** Extremely long with detailed example (87 lines!)
**Optimization:** 
- Remove the massive example (lines 488-490) - saves ~300 tokens
- Condense rules into tighter format
- Use shorthand notation

**Savings:** ~500 tokens per request

### 3. OUTLINE_SYSTEM (Lines 316-343) - ~400 tokens
**Optimization:** Condense to essential rules only
**Savings:** ~150 tokens

### 4. REPAIR_PROGRAM_SYSTEM (Lines 495-534) - ~500 tokens
**Optimization:** More concise rule descriptions
**Savings:** ~200 tokens

### 5. CLARIFY_SYSTEM & FOLLOW_UP_SUMMARY_SYSTEM
**Optimization:** Remove redundant instructions
**Savings:** ~100 tokens each

---

## 🟡 Medium Impact Optimizations

### 6. Payload Building Functions
**Lines 345-403, 570-605:** `actionPickUserPayload`, `outlineUserPayload`, `buildProgramUser`

**Issues:**
- Repeated `trimForPrompt` calls with similar limits
- Redundant context building
- Verbose field names in payloads

**Optimization:**
- Create shared payload builder
- Use shorter field names (e.g., `N`→`n`, `G`→`g`, `F`→`f` - already done, good!)
- Reduce trim limits where safe

**Savings:** ~50-100 tokens per request

### 7. Template Data in Prompts
**Lines 571-577:** Full template raw text included

**Optimization:**
- Only include essential template fields
- Truncate `raw` field to first 500 chars if needed
- Consider excluding `raw` entirely and only using structured data

**Savings:** Variable, but can be significant with many templates

### 8. History Normalization
**Lines 765-796:** `normalizeHistoryList` - already optimized, but check limits

**Current:** 25K token limit seems high
**Optimization:** Reduce to 15K tokens (still plenty for context)

**Savings:** ~2500 tokens per request (when history is large)

---

## 🟢 Low Impact Optimizations

### 9. Comments
**Throughout file:** Many verbose comments

**Optimization:** 
- Keep JSDoc for exported functions
- Remove obvious inline comments
- Shorten section headers

**Savings:** ~100-200 tokens (code size, not LLM tokens)

### 10. Variable Names
**Some verbose names:** Can be shortened in non-exported functions

**Example:**
- `effectivePrompt` → `prompt`
- `followUpActive` → `isFollowUp`
- `feasibilityDisclaimer` → `disclaimer`

**Savings:** Minimal, but improves readability

### 11. Redundant String Operations
**Multiple places:** Repeated `String().trim()` patterns

**Optimization:** Create helper: `const str = (v) => String(v || "").trim()`

**Savings:** Code clarity, minimal token impact

---

## 📊 Estimated Total Savings

### Per Request (Typical):
- System prompts: ~1000 tokens
- Payload optimization: ~100 tokens  
- History limit reduction: ~500 tokens (when applicable)
- **Total: ~1600 tokens per request** (30-40% reduction)

### Per Request (With Large History):
- Additional savings: ~2500 tokens
- **Total: ~4100 tokens per request**

---

## 🎯 Implementation Priority

### Phase 1 (Immediate - Highest ROI):
1. ✅ Condense `BUILD_PROGRAM_SYSTEM` (remove example, tighten rules)
2. ✅ Condense `ACTION_PICK_SYSTEM` 
3. ✅ Reduce history token limit from 25K → 15K

### Phase 2 (Quick Wins):
4. ✅ Condense other system prompts
5. ✅ Optimize payload building functions
6. ✅ Truncate template `raw` fields

### Phase 3 (Polish):
7. ✅ Clean up comments
8. ✅ Refactor redundant code patterns

---

## ⚠️ Quality Safeguards

When optimizing:
- ✅ Keep all core rules and constraints
- ✅ Maintain error handling logic
- ✅ Preserve edge case handling
- ✅ Test with real prompts to ensure quality doesn't degrade
- ✅ Monitor LLM output quality after changes

---

## 📝 Notes

- System prompts are the biggest token consumers (sent with every LLM call)
- The example in `BUILD_PROGRAM_SYSTEM` is particularly wasteful
- History normalization is already good, but limit can be reduced
- Template `raw` fields might be unnecessary if structured data is sufficient
