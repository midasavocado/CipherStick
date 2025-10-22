(() => {
  // -------------------------------------------
  // Conversion.js — JSON/DSL → Shortcuts PLIST
  // Embedded conversions library for action dict templates
  // -------------------------------------------

  const Conversion = {};
  window.Conversion = Conversion;

  // ---- Runtime context --------------------------------------------------
  function createContext() {
    return {
      nameToUUID: new Map(),
      uuidToName: new Map()
    };
  }

  const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  function normalizeTokenName(raw) {
    if (typeof raw !== 'string') return '';
    const trimmed = raw.trim();
    if (/^\{\{.+\}\}$/.test(trimmed)) {
      return trimmed.slice(2, -2).trim();
    }
    return trimmed;
  }

  function registerNamedUUID(ctx, rawName, suggestedUUID) {
    const name = normalizeTokenName(rawName);
    if (!name) return null;
    const key = name.toLowerCase();
    let uuid = suggestedUUID;
    if (!uuid) uuid = ctx.nameToUUID.get(key);
    if (!uuid) uuid = genUUID();
    ctx.nameToUUID.set(key, uuid);
    ctx.uuidToName.set(uuid, name);
    return { name, uuid };
  }

  function resolveNamedUUID(ctx, rawRef) {
    const ref = normalizeTokenName(rawRef);
    if (!ref) return null;
    const key = ref.toLowerCase();
    if (ctx.nameToUUID.has(key)) {
      const uuid = ctx.nameToUUID.get(key);
      return { uuid, name: ctx.uuidToName.get(uuid) || ref };
    }
    if (uuidLike.test(ref)) {
      return { uuid: ref, name: ctx.uuidToName.get(ref) || ref };
    }
    return null;
  }

  // ---- Embedded conversion templates ----
  // Generated from Conversions/*.txt so everything works offline.
  // To override or extend at runtime, set window.CONVERSIONS_LIBRARY before this script loads.
  // The original repository contained a Finder metadata file for 'Showinstore'; add your own template if you need that action.
  const BUILTIN_CONVERSIONS = Object.freeze({
  'Addframetogif': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.addframetogif</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
        <key>WFGIFAutoSize</key>
        {{AutoSize}}
        <key>WFGIFDelayTime</key>
        {{DelaySeconds}}
        <key>WFGIFManualSizeHeight</key>
        {{Height}}
        <key>WFGIFManualSizeWidth</key>
        {{Width}}
        <key>WFImage</key>
          {{Image}}
        <key>WFInputGIF</key>
          {{InputGIF}}
      </dict>
    </dict>
  `,
  'Addnewcontact': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.addnewcontact</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
        <key>ShowWhenRun</key>
        {{ShowWhenRun}}
        <key>WFContactCompany</key>
        {{ContactCompany}}
        <key>WFContactEmails</key>
        <dict>
          <key>Value</key>
          <dict>
            <key>WFContactFieldValues</key>
            <array>
              <dict>
                <key>EntryType</key>
                <integer>2</integer>
                <key>SerializedEntry</key>
                <dict>
                  <key>link.contentkit.emailaddress</key>
                  {{ContactEmail}}
                </dict>
              </dict>
            </array>
          </dict>
          <key>WFSerializationType</key>
          <string>WFContactFieldValue</string>
        </dict>
        <key>WFContactFirstName</key>
        {{ContactFirstName}}
        <key>WFContactLastName</key>
        {{ContactLastName}}
        <key>WFContactNotes</key>
        {{ContactNotes}}
        <key>WFContactPhoneNumbers</key>
        <dict>
          <key>Value</key>
          <dict>
            <key>WFContactFieldValues</key>
            <array>
              <dict>
                <key>EntryType</key>
                <integer>1</integer>
                <key>SerializedEntry</key>
                <dict>
                  <key>link.contentkit.phonenumber</key>
                  {{ContactPhoneNumber}}
                </dict>
              </dict>
            </array>
          </dict>
          <key>WFSerializationType</key>
          <string>WFContactFieldValue</string>
        </dict>
        <key>WFContactPhoto</key>
        {{ContactPhoto}}
      </dict>
    </dict>
  `,
  'Addnewevent': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.addnewevent</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
        <key>WFAlertTime</key>
        {{AlertTime}}
        <key>WFCalendarDescriptor</key>
        <dict>
          <key>Identifier</key>
          <string>B2D9A906-D6C7-4286-9503-3AF22A568499</string>
          <key>IsAllCalendar</key>
          <false />
          <key>RGBAValue</key>
          <integer>3408978175</integer>
          <key>Title</key>
          <string>Work</string>
        </dict>
        <key>WFCalendarItemAllDay</key>
        {{CalendarItemAllDay}}
        <key>WFCalendarItemCalendar</key>
        <string>Work</string>
        <key>WFCalendarItemEndDate</key>
        {{CalendarItemEndDate}}
        <key>WFCalendarItemLocation</key>
        {{CalendarItemLocation}}
        <key>WFCalendarItemNotes</key>
        {{CalendarItemNotes}}
        <key>WFCalendarItemStartDate</key>
        {{CalendarItemStartDate}}
        <key>WFCalendarItemTitle</key>
        {{CalendarItemTitle}}
        <key>ShowWhenRun</key>
        {{ShowWhenRun}}
      </dict>
    </dict>
  `,
  'Addnewreminder': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.addnewreminder</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
        <key>WFAlertCustomTime</key>
        {{AlertTime}}
        <key>WFAlertEnabled</key>
        {{AlertEnabled}}
        <key>WFCalendarItemNotes</key>
        {{CalendarItemNotes}}
        <key>WFCalendarItemTitle</key>
        {{CalendarItemTitle}}
        <key>WFFlag</key>
        {{Flag}}
        <key>WFImages</key>
          {{Images}}
        <key>WFParentTask</key>
        <dict>
          <key>Value</key>
          <dict>
            <key>Type</key>
            <string></string>
          </dict>
          <key>WFSerializationType</key>
          <string>WFTextTokenAttachment</string>
        </dict>
        <key>WFPriority</key>
        {{Priority}}
        <key>WFTags</key>
        {{Tags}}
        <key>WFURL</key>
        {{URL}}
      </dict>
    </dict>
  `,
  'Address': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.address</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        <string>5E35CD3A-DCF8-45E2-9885-2B269CDED3FC</string>
        <key>WFAddressLine1</key>
        {{AddressLine1}}
        <key>WFAddressLine2</key>
        {{AddressLine2}}
        <key>WFCity</key>
        {{City}}
        <key>WFCountry</key>
        {{Country}}
        <key>WFPostalCode</key>
        {{PostalCode}}
        <key>WFState</key>
        {{State}}
      </dict>
    </dict>
  `,
  'AirDrop.Send': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.airdropdocument</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
        <key>WFInput</key>
            {{Input}}
      </dict>
    </dict>
  `,
  'Alert': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.alert</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>WFAlertActionCancelButtonShown</key>
        {{ShowCancelButton}}
        <key>WFAlertActionMessage</key>
        {{AlertActionMessage}}
        <key>WFAlertActionTitle</key>
        {{AlertActionTitle}}
      </dict>
    </dict>
  `,
  'Ask.ForInput': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.ask</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
        <key>WFAllowsMultilineText</key>
        {{Multiline}}
        <key>WFAskActionDefaultAnswer</key>
        {{DefaultAnswer}}
        <key>WFAskActionPrompt</key>
        {{Prompt}}
      </dict>
    </dict>
  `,
  'Askllm': `
  <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.askllm</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
        <key>WFLLMModel</key>
        {{Model}}
        <key>WFLLMPrompt</key>
          {{Attachments}}
        <key>WFLocalOnly</key>
        {{LocalOnly}}
      </dict>
    </dict>
  `,
  'Clock.StartTimer': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.timer.start</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>AppIntentDescriptor</key>
        <dict>
          <key>AppIntentIdentifier</key>
          <string>INCreateTimerIntent</string>
          <key>BundleIdentifier</key>
          <string>com.apple.mobiletimer</string>
          <key>Name</key>
          <string>Clock</string>
          <key>TeamIdentifier</key>
          <string>0000000000</string>
        </dict>
        <key>IntentAppDefinition</key>
        <dict>
          <key>BundleIdentifier</key>
          <string>com.apple.clock</string>
          <key>ExtensionBundleIdentifier</key>
          <string>com.apple.mobiletimer-framework.MobileTimerIntents</string>
          <key>Name</key>
          <string>Clock</string>
          <key>TeamIdentifier</key>
          <string>0000000000</string>
        </dict>
        <key>UUID</key>
        {{UUID}}
        <key>WFDuration</key>
          {{Duration}}
        <key>UUID</key>
        {{UUID}}
        <key>WFCountType</key>
        {{CountType}}
      </dict>
    </dict>
  `,
  'Data.Base64.Encode': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.base64encode</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
        <key>WFBase64LineBreakMode</key>
        <string>Every 64 Characters</string>
        <key>WFInput</key>
        {{Input}}
      </dict>
    </dict>
  `,
  'Date.Now': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.date</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
      </dict>
    </dict>
  `,
  'Delay': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.delay</string>
      <key>WFWorkflowActionParameters</key
      <dict>
      <key>WFDelayTime</key>
      {{DelayTime}}
      </dict>
    </dict>
  `,
  'Detect.Address': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.detect.address</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        <string>06F5E714-6A4B-4EFE-B53D-C0DAC09D2E23</string>
        <key>WFInput</key>
          {{VARIABLE}}
      </dict>
    </dict>
  `,
  'Dictatetext': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.dictatetext</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
        <key>WFDictateTextStopListening</key>
        {{DictateTextStopListening}}
      </dict>
    </dict>
  `,
  'Dismisssiri': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.dismisssiri</string>
      <key>WFWorkflowActionParameters</key>
      <dict />
    </dict>
  `,
  'Dnd.Getfocus': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.dnd.getfocus</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
      </dict>
    </dict>
  `,
  'Downloadurl': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.downloadurl</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
        <key>WFURL</key>
        {{URL}}
      </dict>
    </dict>
  `,
  'Exit': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.exit</string>
      <key>WFWorkflowActionParameters</key>
      <dict />
    </dict>
  `,
  'Extracttextfromimage': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.extracttextfromimage</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
        <key>WFImage</key>
          {{Image}}
      </dict>
    </dict>
  `,
  'File.Delete': `
  <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.file.delete</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>WFDeleteImmediatelyDelete</key>
        {{ImmediatelyDelete}}
        <key>WFInput</key>
          {{Input}}
      </dict>
  `,
  'File.Getfoldercontents': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.file.getfoldercontents</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
        <key>WFFolder</key>
          {{Folder}}
      </dict>
    </dict>
  `,
  'File.Rename': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.file.rename</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
        <key>WFFile</key>
          {{File}}
        <key>WFNewFilename</key>
        {{NewFilename}}
      </dict>
    </dict>
  `,
  'Format.Number': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.format.number</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
        <key>WFNumber</key>
        {{Number}}
        <key>WFNumberFormatDecimalPlaces</key>
        {{FormatDecimalPlaces}}
      </dict>
    </dict>
  `,
  'GenerateQRCodeFromText': `
    <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.generatebarcode</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
        <key>WFText</key>
        {{Text}}
      </dict>
    </dict>
  `,
  'GetOrientation': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>com.apple.ShortcutsActions.GetOrientationAction</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>AppIntentDescriptor</key>
        <dict>
          <key>AppIntentIdentifier</key>
          <string>GetOrientationAction</string>
          <key>BundleIdentifier</key>
          <string>com.apple.ShortcutsActions</string>
          <key>Name</key>
          <string>ShortcutsActions</string>
          <key>TeamIdentifier</key>
          <string>0000000000</string>
        </dict>
        <key>UUID</key>
        {{UUID}}
      </dict>
    </dict>
  `,
  'Getbatterylevel': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.getbatterylevel</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
      </dict>
    </dict>
  `,
  'Getclipboard': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.getclipboard</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
      </dict>
    </dict>
  `,
  'Getcurrentapp': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.getcurrentapp</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
      </dict>
    </dict>
  `,
  'Getcurrentlocation': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.getcurrentlocation</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
      </dict>
    </dict>
  `,
  'Getipaddress': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.getipaddress</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
      </dict>
    </dict>
  `,
  'Getitemfromlist': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.getitemfromlist</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
        <key>WFInput</key>
          {{List}}
        <key>WFItemIndex</key>
        <string>2</string>
        <key>WFItemRangeEnd</key>
        <string>4</string>
        <key>WFItemRangeStart</key>
        <string>2</string>
        <key>WFItemSpecifier</key>
        <string>Item At Index</string>
      </dict>
    </dict>
  `,
  'Getitemname': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.getitemname</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>GetWebPageTitle</key>
        {{GetWebPageTitle}}
        <key>UUID</key>
        {{UUID}}
        <key>WFInput</key>
          {{Input}}
      </dict>
    </dict>
  `,
  'Getitemtype': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.getitemtype</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        <string>DAA2A3EC-75B6-449A-9DDA-49A7873136DF</string>
        <key>WFInput</key>
          {{Input}}
      </dict>
    </dict>
  `,
  'Getlastphoto': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.getlastphoto</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
        <key>WFGetLatestPhotosActionIncludeScreenshots</key>
        {{IncludeScreenshots}}
      </dict>
    </dict>
  `,
  'Getlastscreenshot': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.getlastscreenshot</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
      </dict>
    </dict>
  `,
  'Getlastvideo': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.getlastvideo</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
      </dict>
    </dict>
  `,
  'Getvariable': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.getvariable</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>WFVariable</key>
          {{Variable}}
      </dict>
    </dict>
  `,
  'Getwebpagecontents': `
  <dict>
  <key>WFWorkflowActionIdentifier</key>
  <string>is.workflow.actions.getwebpagecontents</string>
  <key>WFWorkflowActionParameters</key>
  <dict>
    <key>UUID</key>
    {{UUID}}
    <key>WFInput</key>
    {{Input}}
  </dict>
  </dict>
  `,
  'Hash': `
  <dict>
  <key>WFWorkflowActionIdentifier</key>
  <string>is.workflow.actions.hash</string>
  <key>WFWorkflowActionParameters</key>
  <dict>
    <key>UUID</key>
    {{UUID}}
    <key>WFInput</key>
    {{Input}}
    <key>WFHashType</key>
    {{HashType}}
  </dict>
  </dict>
  `,
  'Image.Flip': `
  <dict>
  <key>WFWorkflowActionIdentifier</key>
  <string>is.workflow.actions.image.flip</string>
  <key>WFWorkflowActionParameters</key>
  <dict>
    <key>UUID</key>
    {{UUID}}
    <key>WFInput</key>
      {{Image}}
  </dict>
  </dict>
  `,
  'Image.Removebackground': `
  <dict>
  <key>WFWorkflowActionIdentifier</key>
  <string>is.workflow.actions.image.removebackground</string>
  <key>WFWorkflowActionParameters</key>
  <dict>
    <key>UUID</key>
    {{UUID}}
    <key>WFCropToBounds</key>
    {{CropToBounds}}
    <key>WFInput</key>
      {{Image}}
  </dict>
  </dict>
  `,
  'List.ChooseFrom': `
  <dict>
  <key>WFWorkflowActionIdentifier</key>
  <string>is.workflow.actions.choosefromlist</string>
  <key>WFWorkflowActionParameters</key>
  <dict>
    <key>UUID</key>
    {{UUID}}
    <key>WFChooseFromListActionPrompt</key>
    {{Prompt}}
    <key>WFChooseFromListActionSelectAll</key>
    {{SelectAllInitally}}
    <key>WFChooseFromListActionSelectMultiple</key>
    {{SelectMultiple}}
    <key>WFInput</key>
      {{List}}
  </dict>
  </dict>
  `,
  'Lockscreen': `
  <dict>
  <key>WFWorkflowActionIdentifier</key>
  <string>is.workflow.actions.lockscreen</string>
  <key>WFWorkflowActionParameters</key>
  <dict/>
  </dict>
  `,
  'Makezip': `
  <dict>
  <key>WFWorkflowActionIdentifier</key>
  <string>is.workflow.actions.makezip</string>
  <key>WFWorkflowActionParameters</key>
  <dict>
    <key>UUID</key>
    {{UUID}}
    <key>WFInput</key>
      {{Input}}
    <key>WFZIPName</key>
    {{ZIPName}}
  </dict>
  </dict>
  `,
  'Math': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.math</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
        <key>WFInput</key>
        {{1stNumber}}
        <key>WFMathOperand</key>
        {{2ndNumber}}
        <key>WFMathOperation</key>
        {{Operation}}
      </dict>
    </dict>
  `,
  'Math.CalculateExpression': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.calculateexpression</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>Input</key>
        {{Expression}}
        <key>UUID</key>
        {{UUID}}
      </dict>
    </dict>
  `,
  'Nothing': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.nothing</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
      </dict>
    </dict>
  `,
  'Notification': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.notification</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
        <key>WFNotificationActionBody</key>
        {{NotificationActionBody}}
        <key>WFNotificationActionTitle</key>
        {{NotificationActionTitle}}
      </dict>
    </dict>
  `,
  'Number': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.detect.number</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
        <key>WFInput</key>
        {{Number}}
      </dict>
    </dict>
  `,
  'Number.Random': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.number.random</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
        <key>WFRandomNumberMaximum</key>
        {{RandomNumberMaximum}}
        <key>WFRandomNumberMinimum</key>
        {{RandomNumberMinimum}}
      </dict>
    </dict>
  `,
  'Openapp': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.openapp</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
        <key>WFSelectedApp</key>
        <dict>
          <key>BundleIdentifier</key>
          <string>App</string>
          <key>Name</key>
          {{AppName}}
        </dict>
      </dict>
    </dict>
  `,
  'Openurl': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.openurl</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
        <key>WFInput</key>
        {{URL}}
      </dict>
    </dict>
  `,
  'Pausemusic': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.pausemusic</string>
      <key>WFWorkflowActionParameters</key>
      <dict />
    </dict>
  `,
  'PlaySoundFile': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.playsound</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>WFInput</key>
          {{File}}
      </dict>
    </dict>
  `,
  'Print': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.print</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
        <key>WFInput</key>
          {{Input}}
      </dict>
    </dict>
  `,
  'Returntohomescreen': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.returntohomescreen</string>
      <key>WFWorkflowActionParameters</key>
      <dict/>
    </dict>
  `,
  'RoundNumber': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.round</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
        <key>WFInput</key>
        {{Number}}
        <key>WFRoundMode</key>
        {{Mode}}
        <key>WFRoundTo</key>
        <string>10 ^</string>
        <key>TenToThePowerOf</key>
        {{RoundTo}}
      </dict>
      </dict>
    </dict>
  `,
  'Runjavascriptonwebpage': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.runjavascriptonwebpage</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
        <key>WFInput</key>
        {{WebPage}}
        <key>WFJavaScript</key>
        {{JavaScript}}
      </dict>
    </dict>
  `,
  'Selectcontacts': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.selectcontacts</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
        <key>WFSelectMultiple</key>
        {{SelectMultiple}}
      </dict>
    </dict>
  `,
  'SelectemailAdresses': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.selectemail</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
      </dict>
    </dict>
  `,
  'SelectphoneNumber': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.selectphone</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
      </dict>
    </dict>
  `,
  'Selectphoto': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.selectphoto</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
        <key>WFSelectMultiplePhotos</key>
        {{SelectMultiple}}
      </dict>
    </dict>
  `,
  'Setbrightness': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.setbrightness</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>WFBrightness</key>
        {{Level}}
      </dict>
      <dict/>
    </dict>
  `,
  'Setvariable': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.setvariable</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>WFInput</key>
          {{UUID}}
        <key>WFVariableName</key>
        {{VariableName}}
      </dict>
    </dict>
  `,
  'Setvolume': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.setvolume</string>
      <key>WFWorkflowActionParameters</key>
  <dict>
        <key>WFVolume</key>
        {{Volume}}
      </dict>
      <dict/>
    </dict>
  `,
  'ShowControlCenter': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>com.apple.ShortcutsActions.ShowControlCenterAction</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>AppIntentDescriptor</key>
        <dict>
          <key>AppIntentIdentifier</key>
          <string>ShowControlCenterAction</string>
          <key>BundleIdentifier</key>
          <string>com.apple.ShortcutsActions</string>
          <key>Name</key>
          <string>ShortcutsActions</string>
          <key>TeamIdentifier</key>
          <string>0000000000</string>
        </dict>
      </dict>
    </dict>
  `,
  'Showdefinition': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.showdefinition</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>Word</key>
        {{Word}}
      </dict>
    </dict>
  `,
  'Showresult': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.showresult</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>Text</key>
        {{Text}}
      </dict>
    </dict>
  `,
  'Speaktext': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.speaktext</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>WFSpeakTextLanguage</key>
        {{Language}}
        <key>WFSpeakTextPitch</key>
        {{Pitch}}
        <key>WFSpeakTextRate</key>
        {{Rate}}
        <key>WFSpeakTextVoice</key>
        <string>com.apple.siri.natural.Aaron</string>
        <key>WFSpeakTextWait</key>
        {{WaitUntilFinished}}
        <key>WFText</key>
        {{Text}}
      </dict>
    </dict>
  `,
  'StopAndOutput': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.output</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
        <key>WFNoOutputSurfaceBehavior</key>
        {{NowhereToOutputBehaviour}}
        <key>WFOutput</key>
        {{Output}}
        <key>WFResponse</key>
        {{Response}}
      </dict>
    </dict>
  `,
  'Takephoto': `
    <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.text.changecase</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
        <key>WFCaseType</key>
        {{CaseType}}
        <key>text</key>
        {{Text}}
      </dict>
    </dict>
  `,
  'Takescreenshot': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.takescreenshot</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
      </dict>
    </dict>
  `,
  'Takevideo': `
    <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.takevideo</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
        <key>WFCameraCaptureQuality</key>
        {{CameraCaptureQuality}}
        <key>WFRecordingStart</key>
        {{RecordingStart}}
      </dict>
    </dict>
  `,
  'Text.ChangeCase': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.text.changecase</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
        <key>WFCaseType</key>
        {{CaseType}}
        <key>text</key>
        {{Text}}
      </dict>
    </dict>
  `,
  'TranscribeAudio': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>com.apple.ShortcutsActions.TranscribeAudioAction</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>AppIntentDescriptor</key>
        <dict>
          <key>AppIntentIdentifier</key>
          <string>TranscribeAudioAction</string>
          <key>BundleIdentifier</key>
          <string>com.apple.ShortcutsActions</string>
          <key>Name</key>
          <string>ShortcutsActions</string>
          <key>TeamIdentifier</key>
          <string>0000000000</string>
        </dict>
        <key>UUID</key>
        {{UUID}}
        <key>audioFile</key>
          {{Audio}}
      </dict>
    </dict>
  `,
  'Url.Expand': `
    <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.url.expand</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>URL</key>
        {{Url}}
        <key>UUID</key>
        {{UUID}}
      </dict>
    </dict>
  `,
  'Variable.Append': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.appendvariable</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>WFInput</key>
          {{Input}}
        <key>WFVariableName</key>
        {{VariableName}}
      </dict>
    </dict>
  `,
  'Vibrate': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.vibrate</string>
      <key>WFWorkflowActionParameters</key>
      <dict/>
    </dict>
  `,
  'Waittoreturn': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.waittoreturn</string>
      <key>WFWorkflowActionParameters</key>
      <dict/>
    </dict>
  `,
  'Weather.Currentconditions': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.weather.currentconditions</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
      </dict>
    </dict>
  `,
  'Weather.Forecast': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.weather.forecast</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
      </dict>
    </dict>
  `,
});
const userConversions = (() => {
    try {
      const override = window?.CONVERSIONS_LIBRARY ?? window?.CONVERSIONS_OVERRIDE;
      if (override && typeof override === 'object') return override;
    } catch {
      // Access can fail in certain sandboxed contexts; ignore.
    }
    return null;
  })();

  const CONVERSIONS = (() => {
    if (!userConversions) return BUILTIN_CONVERSIONS;
    const merged = { ...BUILTIN_CONVERSIONS };
    for (const [name, text] of Object.entries(userConversions)) {
      if (typeof text !== 'string') continue;
      const baseKey = String(name).replace(/\.(txt|json|plist)$/i, '');
      merged[baseKey] = text;
    }
    return Object.freeze(merged);
  })();

  const CONVERSION_FILENAMES = Object.freeze(Object.keys(CONVERSIONS));
  const actionLookupCache = new Map(); // normalized action -> filename

  // ---- XML helpers ----
  const XML = {
    esc(s) {
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
    },
    bool(b) { return b ? '<true/>' : '<false/>'; },
    int(n)  { return `<integer>${(n|0)}</integer>`; },
    num(n)  { return Number.isInteger(n) ? XML.int(n) : `<real>${String(n)}</real>`; },
    str(s)  { return `<string>${XML.esc(String(s))}</string>`; },
    dict(obj) {
      return `<dict>${Object.entries(obj)
        .map(([k,v]) => `<key>${XML.esc(k)}</key>${v}`).join('')}</dict>`;
    },
    array(items) {
      return `<array>${items.join('')}</array>`;
    }
  };

  // ---- Rich value helpers (auto XML generation) ----
  const SPECIAL_VALUE = Symbol('ConversionSpecialValue');

  function isPlainObject(v) {
    return Boolean(v) && typeof v === 'object' && !Array.isArray(v) && v[SPECIAL_VALUE] === undefined;
  }

  function makeSpecialValue(kind, payload) {
    return { [SPECIAL_VALUE]: kind, payload };
  }

  function rawXML(xmlString) {
    return makeSpecialValue('raw', { xml: String(xmlString ?? '') });
  }

  function normalizeVariableSpec(input) {
    if (typeof input === 'string') {
      return { uuid: input };
    }
    if (!input || typeof input !== 'object') {
      return {};
    }
    const spec = { ...input };
    spec.uuid ??= spec.UUID ?? spec.id ?? spec.Id ?? null;
    spec.name ??= spec.outputName ?? spec.OutputName ?? spec.label ?? null;
    spec.type ??= spec.variableType ?? spec.VariableType ?? spec.Type ?? 'ActionOutput';
    spec.serializationType ??=
      spec.WFSerializationType ?? spec.serialization ?? spec.serialization_type ?? 'WFTextTokenAttachment';
    if (spec.value == null && spec.Value != null) spec.value = spec.Value;
    if (spec.fields == null && spec.Fields != null) spec.fields = spec.Fields;
    if (spec.additionalFields == null && spec.topLevel != null) spec.additionalFields = spec.topLevel;
    if (spec.additionalValueFields == null && spec.extraValue != null) spec.additionalValueFields = spec.extraValue;
    return spec;
  }

  function variableValue(spec) {
    return makeSpecialValue('variable', normalizeVariableSpec(spec));
  }

  function textTokenValue(text, attachments) {
    return makeSpecialValue('textToken', { text, attachments });
  }

  function renderVariableValue(spec) {
    const normalized = normalizeVariableSpec(spec);
    const valueSource = normalized.value;

    let valuePayload;
    if (isPlainObject(valueSource)) {
      valuePayload = { ...valueSource };
    } else if (valueSource && valueSource[SPECIAL_VALUE]) {
      valuePayload = valueSource;
    } else if (Array.isArray(valueSource)) {
      valuePayload = valueSource.slice();
    } else if (valueSource != null) {
      valuePayload = valueSource;
    } else {
      valuePayload = {};
    }

    if (isPlainObject(valuePayload)) {
      if (normalized.name != null) valuePayload.OutputName = normalized.name;
      if (normalized.uuid != null) valuePayload.OutputUUID = normalized.uuid;
      if (normalized.type != null) valuePayload.Type = normalized.type;
      if (normalized.additionalValueFields && typeof normalized.additionalValueFields === 'object') {
        Object.assign(valuePayload, normalized.additionalValueFields);
      }
    }

    const topLevel = {};
    if (normalized.fields && typeof normalized.fields === 'object') {
      for (const [k, v] of Object.entries(normalized.fields)) {
        topLevel[k] = renderValue(v);
      }
    }

    topLevel.Value = renderValue(valuePayload);
    const serializationType =
      normalized.serializationType == null ? 'WFTextTokenAttachment' : normalized.serializationType;
    if (serializationType != null && serializationType !== false) {
      topLevel.WFSerializationType = XML.str(String(serializationType));
    }

    if (normalized.additionalFields && typeof normalized.additionalFields === 'object') {
      for (const [k, v] of Object.entries(normalized.additionalFields)) {
        topLevel[k] = renderValue(v);
      }
    }

    return XML.dict(topLevel);
  }

  function renderSpecialValue(value) {
    switch (value[SPECIAL_VALUE]) {
      case 'raw':
        return String(value.payload?.xml ?? value.payload ?? '');
      case 'variable':
        return renderVariableValue(value.payload ?? {});
      case 'textToken':
        return buildWFTextTokenString(value.payload?.text, value.payload?.attachments);
      default:
        return XML.str('');
    }
  }

  function renderValue(value) {
    if (value && value[SPECIAL_VALUE]) {
      return renderSpecialValue(value);
    }
    if (value == null) return XML.str('');
    if (typeof value === 'string') return XML.str(value);
    if (typeof value === 'number') return XML.num(value);
    if (typeof value === 'boolean') return XML.bool(value);
    if (Array.isArray(value)) {
      return XML.array(value.map((item) => renderValue(item)));
    }
    if (isPlainObject(value)) {
      const entries = {};
      for (const [k, v] of Object.entries(value)) {
        entries[k] = renderValue(v);
      }
      return XML.dict(entries);
    }
    return XML.str(String(value));
  }

  function createUUIDVariable(ctx, ref) {
    const resolved = resolveNamedUUID(ctx, ref);
    if (resolved) {
      return variableValue({ uuid: resolved.uuid, name: resolved.name, type: 'ActionOutput' });
    }
    const fallback = normalizeTokenName(ref);
    if (!fallback) return variableValue({ uuid: genUUID(), type: 'ActionOutput' });
    return variableValue({ uuid: fallback, name: fallback, type: 'ActionOutput' });
  }

  function createNamedVariable(name) {
    const clean = normalizeTokenName(name);
    if (!clean) return variableValue({ uuid: genUUID(), type: 'Variable' });
    return variableValue({
      name: clean,
      type: 'Variable',
      value: { Type: 'Variable', VariableName: clean },
      serializationType: 'WFTextTokenAttachment'
    });
  }

  function transformValueForContext(value, ctx) {
    if (!ctx) return value;
    if (value && value[SPECIAL_VALUE]) return value;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return value;
      if (trimmed.startsWith('$')) {
        return createUUIDVariable(ctx, trimmed.slice(1));
      }
      if (trimmed.startsWith('!')) {
        return createNamedVariable(trimmed.slice(1));
      }
      return value;
    }
    if (Array.isArray(value)) {
      return value.map((item) => transformValueForContext(item, ctx));
    }
    if (isPlainObject(value)) {
      const out = {};
      for (const [k, v] of Object.entries(value)) {
        out[k] = transformValueForContext(v, ctx);
      }
      return out;
    }
    return value;
  }

  function preprocessParams(rawParams, ctx) {
    if (!rawParams || typeof rawParams !== 'object') return {};
    const out = {};
    let pendingName = null;
    let providedUUID = null;

    for (const [key, value] of Object.entries(rawParams)) {
      const lower = key.toLowerCase();
      if (lower === 'idname' || lower === 'uuidname') {
        pendingName = value;
        continue;
      }
      if (lower === 'uuid') {
        providedUUID = value;
        const isPlaceholder = typeof value === 'string' && /\{\{\s*uuid\s*\}\}/i.test(value.trim());
        if (!isPlaceholder) {
          out[key] = transformValueForContext(value, ctx);
        }
        continue;
      }
      out[key] = transformValueForContext(value, ctx);
    }

    if (pendingName != null) {
      const normalizedUUID = normalizeTokenName(providedUUID);
      const suggestion = uuidLike.test(normalizedUUID || '') ? normalizedUUID : undefined;
      const record = registerNamedUUID(ctx, pendingName, suggestion);
      if (record) {
        out.UUID = record.uuid;
      }
    } else if (typeof providedUUID === 'string') {
      const normalized = normalizeTokenName(providedUUID);
      if (uuidLike.test(normalized)) {
        ctx.uuidToName.set(normalized, ctx.uuidToName.get(normalized) || normalized);
      }
    }

    return out;
  }

  // Expose helpers for template authors
  Conversion.raw = rawXML;
  Conversion.variable = variableValue;
  Conversion.textToken = textTokenValue;
  Conversion.renderValue = renderValue;
  Conversion.helpers = {
    raw: rawXML,
    variable: variableValue,
    textToken: textTokenValue
  };
  Conversion.newUUID = genUUID;

  // ---- Errors ----
  class ConvError extends Error {
    constructor(message, detail) { super(message); this.detail = detail; }
  }
  const fail = (msg, detail) => { throw new ConvError(msg, detail); };

  // ---- Small utils ----

  const normalizeName = (s) =>
    String(s || '')
      .replace(/\.(txt|json|plist)$/i, '')
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9._-]/gi, '')
      .toLowerCase();

  const looksLikeJSON = (s) => /^\s*[\[{]/.test(String(s || ''));

  function stripCodeFences(s){
    return String(s || '').replace(/^\s*```[a-z]*\s*|\s*```\s*$/gi, '');
  }

  // ---- Conversions library loading ----
  async function ensureConvIndex() {
    return CONVERSION_FILENAMES;
  }

  async function loadConvFile(filename) {
    const txt = CONVERSIONS[filename];
    if (typeof txt !== 'string') {
      fail('Missing conversion template', { filename });
    }
    return txt;
  }

  // ---- Fuzzy filename lookup by action name ----
  async function lookupConversionFileForAction(actionName) {
    const key = normalizeName(actionName);
    if (actionLookupCache.has(key)) return actionLookupCache.get(key);

    const list = await ensureConvIndex();
    // Strategy: prefer exact base-name match (normalized), else contains, else prefix
    const scored = [];
    for (const f of list) {
      const base = f.replace(/\.(txt|json|plist)$/i,'');
      const norm = normalizeName(base);
      let score = 0;
      if (norm === key) score += 100;
      if (norm.startsWith(key)) score += 20;
      if (norm.includes(key)) score += 10;
      // small boost if same folder-ish subpath token
      const keyParts = key.split('.');
      for (const p of keyParts) if (p && norm.includes(p)) score += 1;
      if (score > 0) scored.push({ f, score });
    }
    scored.sort((a,b) => b.score - a.score);
    const best = scored[0]?.f || null;
    actionLookupCache.set(key, best);
    return best;
  }

  // ---- Placeholder substitution ----
  // Supported placeholders inside conversion dicts:
  //   {{STRING:Key}}   -> <string>escaped</string>
  //   {{NUMBER:Key}}   -> <integer> / <real>
  //   {{BOOLEAN:Key}}  -> <true/> / <false/>
  //   {{VARIABLE:Key}} -> <string>{{VariableName}}</string>  (left literal)
  //   {{RAW:Key}}      -> inserted as-is (use carefully; e.g., nested <dict>…)
  //   {{UUID}}         -> generated UUID v4
  //
  // Also supports simple {{Key}} -> string (fallback)
  function renderTypedPlaceholder(type, key, value) {
    const upper = String(type || '').toUpperCase();
    switch (upper) {
      case 'STRING':
        return XML.str(value ?? '');
      case 'NUMBER':
        if (value && value[SPECIAL_VALUE]) return renderValue(value);
        if (isPlainObject(value) || Array.isArray(value)) return renderValue(value);
        if (typeof value === 'number') return XML.num(value);
        if (value == null || value === '') return XML.num(0);
        {
          const num = Number(value);
          return Number.isFinite(num) ? XML.num(num) : XML.str(String(value));
        }
      case 'BOOLEAN':
        if (value && value[SPECIAL_VALUE]) return renderValue(value);
        if (isPlainObject(value) || Array.isArray(value)) return renderValue(value);
        if (typeof value === 'string') {
          const trimmed = value.trim();
          if (/^(true|yes|1)$/i.test(trimmed)) return XML.bool(true);
          if (/^(false|no|0)$/i.test(trimmed)) return XML.bool(false);
        }
        return XML.bool(Boolean(value));
      case 'VARIABLE':
        if (value == null) return XML.str('');
        if (typeof value === 'string') {
          const trimmed = value.trim();
          const token =
            trimmed.startsWith('{{') && trimmed.endsWith('}}') ? trimmed : `{{${trimmed.replace(/[{}]/g, '')}}}`;
          return XML.str(token);
        }
        return renderValue(value);
      case 'RAW':
        if (value && value[SPECIAL_VALUE]) return renderValue(value);
        return value == null ? '' : String(value);
      case 'UUID':
        if (value == null || value === true) return XML.str(genUUID());
        return XML.str(String(value));
      default:
        return renderValue(value);
    }
  }

  function renderAutoPlaceholder(key, value) {
    const upperKey = String(key || '').toUpperCase();
    if (upperKey === 'UUID') {
      if (value === undefined || value === null || value === true) return XML.str(genUUID());
      return XML.str(String(value));
    }
    if (value === undefined) {
      return XML.str('');
    }
    return renderValue(value);
  }

  function substitutePlaceholders(dictXML, params = {}) {
    if (!dictXML) return '';
    let out = String(dictXML);
    out = out.replace(/\{\{\s*([A-Za-z]+)\s*:\s*([A-Za-z0-9_.-]+)\s*\}\}/g, (_m, type, keyRaw) => {
      const key = String(keyRaw);
      const value = params[key];
      return renderTypedPlaceholder(type, key, value);
    });
    out = out.replace(/\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g, (_m, keyRaw) => {
      const key = String(keyRaw);
      const value = params[key];
      return renderAutoPlaceholder(key, value);
    });
    return out;
  }

  // ---- Ask LLM prompt post-processing (conditional text-token vs plain string) ----
  function buildWFTextTokenString(promptText, attachments) {
    // If no attachments, return plain string node
    if (!attachments || !attachments.length) {
      return XML.str(String(promptText ?? ''));
    }

    // Build &lt;dict&gt; for attachmentsByRange
    const entries = attachments
      .map((raw) => {
        if (!raw || typeof raw !== 'object') return null;
        const rangeKey = raw.range
          ? String(raw.range)
          : `{${Number(raw.start) || 0}, ${Number(raw.len) || 1}}`;

        const payload = {};
        const typeValue = raw.type ?? raw.Type ?? raw.name;
        if (typeValue != null) payload.Type = XML.str(String(typeValue));

        const outputName = raw.outputName ?? raw.OutputName ?? raw.label ?? raw.name;
        if (outputName != null) payload.OutputName = XML.str(String(outputName));

        const outputUUID = raw.outputUUID ?? raw.OutputUUID ?? raw.uuid ?? raw.UUID;
        if (outputUUID != null) payload.OutputUUID = XML.str(String(outputUUID));

        const variableValue = raw.Variable ?? raw.variable;
        if (variableValue != null) payload.Variable = renderValue(variableValue);

        if (raw.value != null) payload.Value = renderValue(raw.value);

        const serializationType = raw.serializationType ?? raw.WFSerializationType;
        if (serializationType != null) {
          payload.WFSerializationType = XML.str(String(serializationType));
        }

        if (!Object.keys(payload).length) {
          payload.Type = XML.str('Variable');
        }

        return `<key>${XML.esc(rangeKey)}</key>${XML.dict(payload)}`;
      })
      .filter(Boolean)
      .join('');

    if (!entries) return XML.str(String(promptText ?? ''));

    return XML.dict({
      Value: XML.dict({
        attachmentsByRange: `<dict>${entries}</dict>`,
        string: XML.str(String(promptText ?? ''))
      }),
      WFSerializationType: XML.str('WFTextTokenString')
    });
  }

  function normalizeAskLLMAttachments(varsLike) {
    // Accept several shapes:
    // 1) Array of { range:"{5, 1}", type:"VariableName" }
    // 2) Array of { start:5, len:1, type:"VariableName" }
    // 3) Object map: { "{5, 1}": { type:"VariableName" }, "{10, 1}": { type:"Another" } }
    if (!varsLike) return [];
    if (Array.isArray(varsLike)) {
      return varsLike
        .map((entry) => {
          if (entry == null) return null;
          if (typeof entry === 'string') {
            return { range: String(entry) };
          }
          if (typeof entry !== 'object') return null;
          const payload = { ...entry };
          if (payload.range != null) {
            payload.range = String(payload.range);
          } else {
            payload.start = Number(payload.start) || 0;
            payload.len = Number(payload.len) || 1;
          }
          if (payload.type == null) {
            payload.type = payload.Type ?? payload.name ?? 'Variable';
          }
          return payload;
        })
        .filter(Boolean);
    }
    if (typeof varsLike === 'object') {
      return Object.entries(varsLike).map(([range, meta]) => {
        const payload = meta && typeof meta === 'object' ? { ...meta } : { type: meta };
        payload.range = String(range);
        if (payload.type == null) {
          payload.type = payload.Type ?? payload.name ?? 'Variable';
        }
        return payload;
      });
    }
    return [];
  }

  function postProcessAskLLM(dictXML, params) {
    // Only touch actions whose identifier is is.workflow.actions.askllm
    const idMatch = dictXML.match(/<key>\s*WFWorkflowActionIdentifier\s*<\/key>\s*<string>\s*([^<]+)\s*<\/string>/i);
    const identifier = idMatch?.[1]?.trim();
    if (identifier !== 'is.workflow.actions.askllm') return dictXML;

    // Normalize inputs
    const promptText = params?.PROMPT ?? params?.WFLLMPrompt ?? '';
    const varsRaw = params?.AttachmentsByRange ?? params?.attachmentsByRange ?? params?.VARIABLES ?? params?.variables ?? params?.Attachments ?? params?.attachments;
    const attachments = normalizeAskLLMAttachments(varsRaw);

    // Build the right WFLLMPrompt node (plain string if no attachments; WFTextTokenString otherwise)
    const promptNode = buildWFTextTokenString(promptText, attachments);

    // Replace any existing WFLLMPrompt block (either &lt;dict&gt;...&lt;/dict&gt; or &lt;string&gt;...&lt;/string&gt;)
    const replaced = dictXML.replace(
      /(<key>\s*WFLLMPrompt\s*<\/key>\s*)(?:<dict>[\s\S]*?<\/dict>|<string>[\s\S]*?<\/string>)/i,
      `$1${promptNode}`
    );

    if (replaced !== dictXML) return replaced;

    return dictXML.replace(
      /(<key>\s*WFWorkflowActionParameters\s*<\/key>\s*<dict>)/i,
      `$1\n  <key>WFLLMPrompt<\/key>\n  ${promptNode}`
    );
  }

  function genUUID(){
    // RFC 4122 v4
    const a = crypto.getRandomValues(new Uint8Array(16));
    a[6] = (a[6] & 0x0f) | 0x40;
    a[8] = (a[8] & 0x3f) | 0x80;
    const h = [...a].map(b => b.toString(16).padStart(2,'0'));
    return `${h[0]}${h[1]}${h[2]}${h[3]}-${h[4]}${h[5]}-${h[6]}${h[7]}-${h[8]}${h[9]}-${h[10]}${h[11]}${h[12]}${h[13]}${h[14]}${h[15]}`;
  }

  // ---- Program coercion / normalization ----
  function coerceProgram(program, nameHint){
    let prog = program;

    // If a JSON string was passed, parse it
    if (typeof prog === 'string') {
      prog = tryParseJSON(prog);
    }

    // Allow wrappers: { program: {...} }
    if (prog && typeof prog === 'object' && prog.program && typeof prog.program === 'object') {
      prog = prog.program;
    }

    // If top-level is an array, treat it as actions
    if (Array.isArray(prog)) {
      prog = { actions: prog };
    }

    // Final validation
    if (!prog || typeof prog !== 'object') {
      fail('Program must be an object', { receivedType: typeof program });
    }

    if (!Array.isArray(prog.actions)) {
      fail('Program missing "actions" array');
    }

    // Name fallback
    if (!prog.name && nameHint) prog.name = String(nameHint);

    return prog;
  }
  // expose helper
  Conversion.normalizeProgram = coerceProgram;

  // ---- Public entry points ----

  // ---- Public entry points ----
  // JSON-only entry point (no DSL auto-conversion)
  function normalizeProgramArgs(arg1, arg2) {
    if (Array.isArray(arg1)) {
      const name = arg2;
      return {
        name,
        program: { name, actions: arg1 }
      };
    }
    if (arg1 && typeof arg1 === 'object') {
      if ('program' in arg1) {
        return {
          name: arg1.name ?? arg2,
          program: arg1.program
        };
      }
      if (Array.isArray(arg1.actions)) {
        return {
          name: arg1.name ?? arg2,
          program: arg1
        };
      }
    }
    return {
      name: (arg1 && typeof arg1 === 'object' && 'name' in arg1) ? arg1.name : arg2,
      program: arg1
    };
  }

  async function convertConfigToPlist(config = {}) {
    const safeName = (config.name || 'My Shortcut').trim() || 'My Shortcut';
    const text = config.text;
    let prog = config.program;

    if (!prog && Array.isArray(config.actions)) {
      prog = { name: safeName, actions: config.actions };
    }

    if (prog && typeof prog === 'object' && !Array.isArray(prog)) {
      // already normalized
    } else if (Array.isArray(prog)) {
      prog = { name: safeName, actions: prog };
    } else {
      const candidate = typeof prog === 'string' && prog.trim() ? prog : text;
      const trimmed = typeof candidate === 'string' ? candidate.trim() : '';

      if (trimmed) {
        if (!looksLikeJSON(trimmed)) {
          fail('Expected JSON input that starts with { or [}.');
        }
        prog = tryParseJSON(trimmed);
      } else {
        fail('Nothing to convert. Provide JSON string "text" or a "program" object.');
      }
    }

    return { safeName, prog };
  }

  Conversion.toPlist = async function (...args) {
    try {
      let config = {};
      if (args.length === 1 && args[0] && typeof args[0] === 'object' && !Array.isArray(args[0])) {
        config = { ...args[0] };
      } else if (args.length >= 1) {
        if (typeof args[0] === 'string' && !Array.isArray(args[0])) {
          config = { text: args[0], name: args[1] };
        } else {
          config = { program: args[0], name: args[1] };
        }
      }

      const { safeName, prog } = await convertConfigToPlist(config);
      return await Conversion.toPlistFromJSON({ name: safeName, program: prog });
    } catch (e) {
      const detail = (e && e.detail) ? `\nDetail: ${JSON.stringify(e.detail).slice(0,400)}` : '';
      throw new Error((e && e.message) ? `Conversion failed: ${e.message}${detail}` : 'Conversion failed');
    }
  };

  Conversion.toPlistFromJSON = async function (arg1, arg2) {
    const { name, program } = normalizeProgramArgs(arg1, arg2);
    const prog = coerceProgram(program, name);
    const wfName = String(prog.name || name || 'My Shortcut');
    const actions = prog.actions;

    const ctx = createContext();
    const plistActions = await buildActionsArrayFromJSON(actions, ctx);

    const plist =
`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>WFWorkflowName</key>
  ${XML.str(wfName)}
  <key>WFWorkflowActions</key>
  ${XML.array(plistActions)}
</dict>
</plist>`;
    return plist;
  };

  // ---- Special action helpers ----
  const CONDITION_MODE_MAP = new Map([
    ['is', 4],
    ['isnot', 5],
    ['hasanyvalue', 100],
    ['doesnothaveanyvalue', 101],
    ['isgreaterthan', 2],
    ['isgreaterthanorequalto', 3],
    ['islessthan', 0],
    ['islessthanorequalto', 1],
    ['contains', 99],
    ['doesnotcontain', 999],
    ['beginswith', 8],
    ['endswith', 9]
  ]);

  function resolveConditionMode(value) {
    if (value == null) return 4;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const trimmedNumeric = value.trim();
      if (/^-?\d+$/.test(trimmedNumeric)) return Number(trimmedNumeric);
    }
    const normalized = normalizeName(String(value));
    return CONDITION_MODE_MAP.get(normalized) ?? 4;
  }

  function comment(text) {
    return makeAction('is.workflow.actions.comment', {
      WFCommentActionText: String(text ?? '')
    });
  }

  function placeholder(name) {
    return `{{${name}}}`;
  }

  function valueOrPlaceholder(raw, name, ctx) {
    if (raw == null) return rawXML(placeholder(name));
    const transformed = transformValueForContext(raw, ctx);
    if (typeof transformed === 'string' && /\{\{.+\}\}/.test(transformed.trim())) {
      return rawXML(transformed);
    }
    return transformed;
  }

  function toRenderedValue(value, ctx) {
    if (value && value[SPECIAL_VALUE]) return value;
    if (typeof value === 'string' && /\{\{.+\}\}/.test(value.trim())) {
      return rawXML(value);
    }
    return transformValueForContext(value, ctx);
  }

  async function buildSpecialIf(item, ctx) {
    const params = (item && typeof item === 'object') ? (item.params || {}) : {};

    const groupingRaw =
      params.GroupingIdentifier ??
      params.groupingIdentifier ??
      params.group ??
      params.Group ??
      null;
    const grouping = groupingRaw != null ? toRenderedValue(groupingRaw, ctx) : genUUID();

    const startUUID = params.StartUUID ?? params.UUIDStart ?? params.startUUID ?? null;

    const conditionParam = params.WFCondition ?? params.Condition ?? params.condition;
    let conditionValue;
    if (conditionParam == null) {
      conditionValue = placeholder('Condition');
    } else if (typeof conditionParam === 'string' && /^\s*\{\{.+\}\}\s*$/.test(conditionParam)) {
      conditionValue = conditionParam;
    } else {
      conditionValue = resolveConditionMode(conditionParam);
    }

    const compareValue = valueOrPlaceholder(
      params.WFConditionalActionString ?? params.CompareTo ?? params.compareTo ?? null,
      'CompareTo',
      ctx
    );

    const inputValue = valueOrPlaceholder(
      params.WFInput ?? params.Input ?? params.input ?? null,
      'Input',
      ctx
    );

    const numberValue = valueOrPlaceholder(
      params.WFNumberValue ?? params.NumberValue ?? params.numberValue ?? 124,
      'WFNumberValue',
      ctx
    );

    const thenActions = Array.isArray(item?.then) && item.then.length
      ? await buildActionsArrayFromJSON(item.then, ctx)
      : [comment('If (then) has no actions')];

    const elseActions = Array.isArray(item?.else) && item.else.length
      ? await buildActionsArrayFromJSON(item.else, ctx)
      : [comment('If (else) has no actions')];

    const endUUIDRaw = params.EndUUID ?? params.UUIDEnd ?? params.endUUID ?? params.UUID ?? null;
    const endUUID = endUUIDRaw != null ? toRenderedValue(endUUIDRaw, ctx) : genUUID();

    const startParams = {
      GroupingIdentifier: grouping,
      WFControlFlowMode: 0,
      WFCondition: conditionValue,
      WFConditionalActionString: compareValue,
      WFInput: inputValue,
      WFNumberValue: numberValue
    };
    if (startUUID != null) startParams.UUID = toRenderedValue(startUUID, ctx);

    const midParams = {
      GroupingIdentifier: grouping,
      WFControlFlowMode: 1
    };

    const endParams = {
      GroupingIdentifier: grouping,
      WFControlFlowMode: 2,
      UUID: endUUID
    };

    return [
      makeAction(IDS.IF, startParams),
      ...thenActions,
      makeAction(IDS.IF, midParams),
      ...elseActions,
      makeAction(IDS.IF, endParams)
    ];
  }

  async function buildSpecialRepeatCount(item, ctx) {
    const params = (item && typeof item === 'object') ? (item.params || {}) : {};

    const groupingRaw =
      params.GroupingIdentifier ??
      params.groupingIdentifier ??
      params.group ??
      params.Group ??
      null;
    const grouping = groupingRaw != null ? toRenderedValue(groupingRaw, ctx) : genUUID();

    const countValue = valueOrPlaceholder(
      params.WFRepeatCount ?? params.Count ?? params.count ?? null,
      'Count',
      ctx
    );

    const bodyActions = Array.isArray(item?.do) && item.do.length
      ? await buildActionsArrayFromJSON(item.do, ctx)
      : [comment('Repeat has no actions')];

    const endUUIDRaw = params.EndUUID ?? params.UUIDEnd ?? params.endUUID ?? params.UUID ?? null;
    const endUUID = endUUIDRaw != null ? toRenderedValue(endUUIDRaw, ctx) : genUUID();

    const startParams = {
      GroupingIdentifier: grouping,
      WFControlFlowMode: 0,
      WFRepeatCount: countValue
    };

    const endParams = {
      GroupingIdentifier: grouping,
      WFControlFlowMode: 2,
      UUID: endUUID
    };

    return [
      makeAction(IDS.REPEAT_COUNT, startParams),
      ...bodyActions,
      makeAction(IDS.REPEAT_COUNT, endParams)
    ];
  }

  async function buildSpecialRepeatEach(item, ctx) {
    const params = (item && typeof item === 'object') ? (item.params || {}) : {};

    const groupingRaw =
      params.GroupingIdentifier ??
      params.groupingIdentifier ??
      params.group ??
      params.Group ??
      null;
    const grouping = groupingRaw != null ? toRenderedValue(groupingRaw, ctx) : genUUID();

    const itemsValue = valueOrPlaceholder(
      params.WFInput ?? params.Items ?? params.List ?? params.items ?? params.ItemsIn ?? null,
      'ItemsIn',
      ctx
    );

    const bodyActions = Array.isArray(item?.do) && item.do.length
      ? await buildActionsArrayFromJSON(item.do, ctx)
      : [comment('Repeat Each has no actions')];

    const endUUIDRaw = params.EndUUID ?? params.UUIDEnd ?? params.endUUID ?? params.UUID ?? null;
    const endUUID = endUUIDRaw != null ? toRenderedValue(endUUIDRaw, ctx) : genUUID();

    const startParams = {
      GroupingIdentifier: grouping,
      WFControlFlowMode: 0,
      WFInput: itemsValue
    };

    const endParams = {
      GroupingIdentifier: grouping,
      WFControlFlowMode: 2,
      UUID: endUUID
    };

    return [
      makeAction(IDS.REPEAT_EACH, startParams),
      ...bodyActions,
      makeAction(IDS.REPEAT_EACH, endParams)
    ];
  }

  const SPECIAL_ACTION_BUILDERS = new Map([
    ['if', buildSpecialIf],
    ['conditional', buildSpecialIf],
    ['repeat', buildSpecialRepeatCount],
    ['repeatcount', buildSpecialRepeatCount],
    ['repeateach', buildSpecialRepeatEach],
    ['repeatwitheach', buildSpecialRepeatEach]
  ]);



  // ---- JSON program structure helpers ----

  // Action can be:
  //  - string (no-params), e.g. "Vibrate"
  //  - { action:"Openurl", params:{...} }
  //  - Repeat: { action:"Repeat", params:{ Count }, do:[...] }
  //  - RepeatEach: { action:"RepeatEach", params:{ Items }, do:[...] }
  //  - If: { action:"If", params:{ Condition }, then:[...], else:[...] }
  async function buildActionsArrayFromJSON(list, ctx) {
    const out = [];
    for (const item of list) {
      if (typeof item === 'string') {
        out.push(await buildActionFromConversions(item, {}, ctx));
        continue;
      }
      if (!item || typeof item !== 'object') {
        out.push(comment(`Unrecognized action item: ${JSON.stringify(item).slice(0,200)}`));
        continue;
      }
      const kind = String(item.action || '').trim();
      if (!kind) {
        out.push(comment(`Missing "action" in ${JSON.stringify(item).slice(0,200)}`));
        continue;
      }

      const specialBuilder = SPECIAL_ACTION_BUILDERS.get(normalizeName(kind));
      if (specialBuilder) {
        out.push(...await specialBuilder(item, ctx));
        continue;
      }

      // Regular action
      out.push(await buildActionFromConversions(kind, item.params || {}, ctx));
    }
    return out;
  }

  // ---- Build one action from Conversions/ dict template ----
  async function buildActionFromConversions(actionName, params, ctx) {
    // Find file
    const filename = await lookupConversionFileForAction(actionName);
    if (!filename) {
      // fallback comment so user sees problem
      return comment(`Unmapped action: ${actionName}\nParams: ${safePreview(params)}`);
    }
    // Load <dict>…</dict> snippet
    const dictXML = await loadConvFile(filename);

    const processed = preprocessParams(params || {}, ctx);
    // Substitutions
    let substituted = substitutePlaceholders(dictXML, processed);
    substituted = postProcessAskLLM(substituted, processed);

    // Ensure it *looks* like a dict (we won't attempt to validate fully)
    if (!/^\s*<dict>[\s\S]*<\/dict>\s*$/i.test(substituted)) {
      // Wrap if the file accidentally contains only inner content
      return `<dict>${substituted}</dict>`;
    }
    return substituted;
  }

  // ---- Control flow builders (IDs based on common Shortcuts internals) ----
  // Note: If markers: 'is.workflow.actions.conditional'
  //       Repeat count markers: 'is.workflow.actions.repeatcount'
  //       Repeat each markers:  'is.workflow.actions.repeat.each' (some builds use this identifier)
  const IDS = {
    IF: 'is.workflow.actions.conditional',
    REPEAT_COUNT: 'is.workflow.actions.repeat.count',
    REPEAT_EACH: 'is.workflow.actions.repeat.each', // if your library uses a different id, change here
  };

  function makeAction(identifier, parameters) {
    let paramsNode = '<dict/>';
    if (parameters != null) {
      const rendered = renderValue(parameters);
      const trimmed = rendered.trim();
      if (/^<dict[\s>]/i.test(trimmed)) {
        paramsNode = rendered;
      } else {
        paramsNode = renderValue({ Value: parameters });
      }
    }
    return XML.dict({
      WFWorkflowActionIdentifier: XML.str(identifier),
      WFWorkflowActionParameters: paramsNode
    });
  }


  // ---- Misc helpers ----
  function safePreview(v){
    try { return JSON.stringify(v, null, 2).slice(0, 400); } catch { return String(v); }
  }
  function tryParseJSON(text){
    const t = stripCodeFences(String(text || '').trim());
    try { return JSON.parse(t); }
    catch (e){ fail('Invalid JSON program', { error: String(e), preview: t.slice(0,400) }); }
  }

})();

/* --- Universal tolerant wrapper: accepts JSON/DSL/XML/plain text --- */
(function (global){
  function __makeCommentPlist(name, comment){
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>WFWorkflowName</key><string>${name || 'My Shortcut'}</string>
  <key>WFWorkflowActions</key>
  <array>
    <dict>
      <key>WFWorkflowActionIdentifier</key><string>is.workflow.actions.comment</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>WFCommentActionText</key><string>${String(comment || '').replace(/&/g,'&amp;').replace(/</g,'&lt;')}</string>
      </dict>
    </dict>
  </array>
</dict>
</plist>`;
  }

  function tryParseJSON(text){
    try {
      const t = String(text || '').trim();
      if (!(t.startsWith('{') || t.startsWith('['))) return null;
      return JSON.parse(t);
    } catch { return null; }
  }

  function normalizeInput(input, name){
    if (typeof input === 'string'){
      const s = input.trim();
      if (s.startsWith('<?xml')) return { plist: s, name };
      const maybe = tryParseJSON(s);
      if (maybe !== null) return { program: maybe, name };
      return { comment: 'Expected JSON input (string did not start with { or [).', name };
    }
    if (Array.isArray(input)) return { program: { name, actions: input } };
    if (input && typeof input === 'object'){
      if (input.plist && typeof input.plist === 'string') return { plist: input.plist, name: input.name || name };
      if (input.program && typeof input.program === 'object'){
        const n = input.name || name;
        return { program: { name: n, ...(input.program || {}) } };
      }
      if (input.actions && Array.isArray(input.actions)){
        return { program: { name: input.name || name, actions: input.actions } };
      }
      // last-ditch: unknown object -> JSON stringify into comment
      return { comment: JSON.stringify(input).slice(0,2000), name };
    }
    // Fallback for numbers/booleans/etc.
    return { comment: String(input), name };
  }

  // --- Shims for legacy callers ---
  // Some callers expect a ConversionJSON facade. Provide it if missing.
  if (!global.ConversionJSON && global.Conversion && typeof global.Conversion.toPlistFromJSON === 'function') {
    global.ConversionJSON = {
      toPlist: ({ name, program }) => global.Conversion.toPlistFromJSON({ name, program })
    };
  }

  function toPlistUniversal(input, name){
    const norm = normalizeInput(input, name);
    const n = norm.name || name || 'My Shortcut';

    if (norm.plist) return norm.plist;

    if (norm.program){
      const prog = norm.program;
      const bundle = { name: prog.name || n, program: prog };

      // Preferred: our Conversion JSON path (expects { name, program })
      if (global.Conversion && typeof global.Conversion.toPlistFromJSON === 'function'){
        try { return global.Conversion.toPlistFromJSON(bundle); } catch(e){}
      }

      // Optional facade if present
      if (global.ConversionJSON && typeof global.ConversionJSON.toPlist === 'function'){
        try { return global.ConversionJSON.toPlist(bundle); } catch(e){}
      }

      // As a last resort, try the generic toPlist with explicit text if caller shoved JSON as text.
      if (global.Conversion && typeof global.Conversion.toPlist === 'function'){
        try { return global.Conversion.toPlist({ name: bundle.name, text: JSON.stringify(prog) }); } catch(e){}
      }

      // Fall through to comment plist
      return __makeCommentPlist(n, 'JSON conversion failed.');
    }

    // (No DSL branch — JSON only. Non-JSON strings become comment plists.)

    if (norm.comment) {
      return __makeCommentPlist(n, norm.comment);
    }

    return __makeCommentPlist(n, 'Unrecognized input.');
  }

  global.ConversionUniversal = {
    toPlist: toPlistUniversal,
    __makeCommentPlist
  };
})(window);
