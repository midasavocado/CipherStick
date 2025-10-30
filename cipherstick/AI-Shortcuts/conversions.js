(() => {
  // -------------------------------------------
  // Conversion.js — JSON/DSL → Shortcuts PLIST
  // Embedded conversions library for action dict templates
  // -------------------------------------------

  const Conversion = {};
  window.Conversion = Conversion;

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
        <dict>
          <key>Value</key>
          <dict>
            <key>Type</key>
            {{Image}}
          </dict>
          <key>WFSerializationType</key>
          <string>WFTextTokenAttachment</string>
        </dict>
        <key>WFInputGIF</key>
        <dict>
          <key>Value</key>
          <dict>
            <key>Type</key>
            {{InputGIF}}
          </dict>
          <key>WFSerializationType</key>
          <string>WFTextTokenAttachment</string>
        </dict>
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
        <dict>
          <key>Value</key>
          <dict>
            <key>Type</key>
            {{ContactPhoto}}
          </dict>
          <key>WFSerializationType</key>
          <string>WFTextTokenAttachment</string>
        </dict>
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
        <dict>
          <key>Value</key>
          <dict>
            <key>Type</key>
            {{Images}}
          </dict>
          <key>WFSerializationType</key>
          <string>WFTextTokenAttachment</string>
        </dict>
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
        <dict>
          <key>Value</key>
            {{input}}
          <key>WFSerializationType</key>
          <string>WFTextTokenAttachment</string>
        </dict>
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
        <dict>
          <key>Value</key>
          <dict>
            <key>attachmentsByRange</key>
            <dict>
              <key>{0, 1}</key>
              {{attachments}}
            </dict>
            <key>string</key>
            {{LLMPrompt}}
          </dict>
          <key>WFSerializationType</key>
          <string>WFTextTokenString</string>
        </dict>
        <key>WFFollowUp</key>
        {{FollowUp}}
      </dict>
  `,
  'Calendar.CreateCalendar': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.addnewcalendar</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>CalendarName</key>
        {{CalendarName}}
        <key>UUID</key>
        {{UUID}}
      </dict>
    </dict>
  `,
  'Chrome.AddBookmark': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>com.google.chrome.ios.AddBookmarkToChromeIntent</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
        <key>url</key>
        {{URL}}
      </dict>
    </dict>
  `,
  'Clipboard.Set': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.setclipboard</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        <string>CF7513CC-44BE-493F-A5CD-A1871B335735</string>
        <key>WFExpirationDate</key>
        {{ExpirationDate}}
        <key>WFInput</key>
        <dict>
          <key>Value</key>
          {{input}}
          <key>WFSerializationType</key>
          <string>WFTextTokenAttachment</string>
        </dict>
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
        <dict>
          <key>Value</key>
          <dict>
            <key>Magnitude</key>
            {{Duration}}
            <key>Unit</key>
            {{Unit}}
          </dict>
          <key>WFSerializationType</key>
          <string>WFQuantityFieldValue</string>
        </dict>
      </dict>
    </dict>
  `,
  'Clock.CreateAlarm': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>com.apple.clock.AddWorldClockIntent</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>AppIntentDescriptor</key>
        <dict>
          <key>AppIntentIdentifier</key>
          <string>AddWorldClockIntent</string>
          <key>BundleIdentifier</key>
          <string>com.apple.mobiletimer</string>
          <key>Name</key>
          <string>Clock</string>
          <key>TeamIdentifier</key>
          <string>0000000000</string>
        </dict>
        <key>OpenWhenRun</key>
        <false />
        <key>UUID</key>
        {{UUID}}
        <key>city</key>
        <dict>
          <key>identifier</key>
          <string>0</string>
          <key>subtitle</key>
          <dict>
            <key>key</key>
            <string>Abidjan</string>
          </dict>
          <key>title</key>
          <dict>
            <key>key</key>
            <string>Abidjan</string>
          </dict>
        </dict>
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
        <dict>
          <key>Value</key>
          <dict>
            <key>Magnitude</key>
            {{Duration}}
            <key>Unit</key>
            {{Unit}}
          </dict>
          <key>WFSerializationType</key>
          <string>WFQuantityFieldValue</string>
        </dict>
      </dict>
    </dict>
  `,
  'Com.AddReadingListItemToChromeIntent': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>com.google.chrome.ios.AddBookmarkToChromeIntent</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
        <key>url</key>
        {{URL}}
      </dict>
    </dict>
  `,
  'Control.Comment': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.comment</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>WFCommentActionText</key>
        {{CommentActionText}}
      </dict>
    </dict>
  `,
  'Correctspelling': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.correctspelling</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key>
        {{UUID}}
        <key>text</key>
        {{Text}}
      </dict>
    </dict>
  `,
  'Count': `
  <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.count</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>Input</key>
        <dict>
          <key>Value</key>
          {{input}}
          <key>WFSerializationType</key>
          <string>WFTextTokenAttachment</string>
        </dict>
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
        <dict>
          <key>Value</key>
          <dict>
            <key>Type</key>
            {{VARIABLE}}
          </dict>
          <key>WFSerializationType</key>
          <string>WFTextTokenAttachment</string>
        </dict>
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
        <dict>
          <key>Value</key>
          {{image}}
          <key>WFSerializationType</key>
          <string>WFTextTokenAttachment</string>
        </dict>
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
        <dict>
          <key>Value</key>
          {{input}}
          <key>WFSerializationType</key>
          <string>WFTextTokenAttachment</string>
        </dict>
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
        <dict>
          <key>Value</key>
          {{folder}}
          <key>WFSerializationType</key>
          <string>WFTextTokenAttachment</string>
        </dict>
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
        <dict>
          <key>Value</key>
          {{file}}
          <key>WFSerializationType</key>
          <string>WFTextTokenAttachment</string>
        </dict>
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
        <dict>
          <key>Value</key>
          {{list}}
          <key>WFSerializationType</key>
          <string>WFTextTokenAttachment</string>
        </dict>
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
        <dict>
          <key>Value</key>
          {{input}}
          <key>WFSerializationType</key>
          <string>WFTextTokenAttachment</string>
        </dict>
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
        <dict>
          <key>Value</key>
          {{input}}
          <key>WFSerializationType</key>
          <string>WFTextTokenAttachment</string>
        </dict>
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
        <dict>
          <key>Value</key>
          <dict>
            <key>Type</key>
            <string>Variable</string>
            <key>VariableName</key>
            {{Variable}}
          </dict>
          <key>WFSerializationType</key>
          <string>WFTextTokenAttachment</string>
        </dict>
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
    <dict>
      <key>Value</key>
      {{image}}
      <key>WFSerializationType</key>
      <string>WFTextTokenAttachment</string>
    </dict>
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
    <dict>
      <key>Value</key>
      {{image}}
      <key>WFSerializationType</key>
      <string>WFTextTokenAttachment</string>
    </dict>
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
    <dict>
      <key>Value</key>
      {{list}}
      <key>WFSerializationType</key>
      <string>WFTextTokenAttachment</string>
    </dict>
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
    <dict>
      <key>Value</key>
      {{input}}
      <key>WFSerializationType</key>
      <string>WFTextTokenAttachment</string>
    </dict>
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
        <dict>
          <key>Value</key>
          {{file}}
          <key>WFSerializationType</key>
          <string>WFTextTokenAttachment</string>
        </dict>
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
        <dict>
          <key>Value</key>
          {{input}}
          <key>WFSerializationType</key>
          <string>WFTextTokenAttachment</string>
        </dict>
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
        <dict>
          <key>Value</key>
          <dict>
            <key>OutputName</key>
            {{OutputName}}
            <key>OutputUUID</key>
            {{UUID}}
            <key>Type</key>
            <string>ActionOutput</string>
          </dict>
          <key>WFSerializationType</key>
          <string>WFTextTokenAttachment</string>
        </dict>
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
				<real>1.1231572690217393</real>
				<key>WFSpeakTextRate</key>
				<real>0.41338315217391303</real>
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
			<string>is.workflow.actions.takephoto</string>
			<key>WFWorkflowActionParameters</key>
			<dict>
				<key>UUID</key>
				{{UUID}}
				<key>WFCameraCaptureDevice</key>
				{{Camera}}
				<key>WFCameraCaptureShowPreview</key>
				{{OpenWhenRun}}
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
        <dict>
          <key>Value</key>
          {{audio}}
          <key>WFSerializationType</key>
          <string>WFTextTokenAttachment</string>
        </dict>
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
        <dict>
          <key>Value</key>
          <dict>
            <key>OutputName</key>
            {{OutputName}}
            <key>OutputUUID</key>
            {{Input}}
            <key>Type</key>
            <string>ActionOutput</string>
          </dict>
          <key>WFSerializationType</key>
          <string>WFTextTokenAttachment</string>
        </dict>
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
  const linkRegistry = new Map(); // link label -> metadata about producing action

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

  const OUTPUT_FIELD_REGEX = /(uuid|outputuuid|startuuid|enduuid|elseuuid|groupingidentifier)$/i;
  const ATTACHMENT_SENTINEL = '\uFFFC';

  function humanizeActionName(raw) {
    if (!raw) return '';
    const parts = String(raw)
      .split(/[./]/)
      .map((segment) => segment
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ') )
      .map((segment) => segment.trim())
      .filter(Boolean);
    const joined = parts.join(' ');
    return joined
      .split(' ')
      .map((word) => word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : '')
      .join(' ')
      .trim();
  }

  function normalizeLinkLabel(label) {
    if (label == null) return null;
    const normalized = String(label).trim();
    return normalized ? normalized : null;
  }

  function ensureLinkEntry(label) {
    const normalized = normalizeLinkLabel(label);
    if (!normalized) return null;
    let entry = linkRegistry.get(normalized);
    if (!entry) {
      entry = {
        label: normalized,
        action: null,
        friendly: null,
        uuid: null
      };
      linkRegistry.set(normalized, entry);
    }
    return entry;
  }

  function registerLinkLabel(label, actionName) {
    const entry = ensureLinkEntry(label);
    if (!entry) return;
    if (actionName && !entry.action) entry.action = actionName;
    if (actionName) {
      const friendly = humanizeActionName(actionName);
      if (friendly) entry.friendly = friendly;
    }
  }

  function lookupLinkMetadata(label) {
    const normalized = normalizeLinkLabel(label);
    if (!normalized) return null;
    return linkRegistry.get(normalized) ?? null;
  }

  function resolveLinkUUID(label) {
    const entry = ensureLinkEntry(label);
    if (!entry) return null;
    if (!entry.uuid) entry.uuid = genUUID();
    return entry.uuid;
  }

  function parseTokenizedText(raw) {
    const input = String(raw ?? '');
    let cursor = 0;
    let text = '';
    const attachments = [];
    const tokenRegex = /!var:([A-Za-z0-9_.-]+)|!link:([A-Za-z0-9_.-]+)/gi;
    let match;
    while ((match = tokenRegex.exec(input))) {
      const [all, varName, linkLabel] = match;
      const start = match.index;
      if (start > cursor) {
        text += input.slice(cursor, start);
      }
      const rangeStart = text.length;
      text += ATTACHMENT_SENTINEL;
      const range = `{${rangeStart}, 1}`;
      if (varName) {
        attachments.push({ range, type: 'Variable', VariableName: varName });
      } else if (linkLabel) {
        const uuid = resolveLinkUUID(linkLabel);
        const meta = lookupLinkMetadata(linkLabel) || {};
        const attachment = {
          range,
          type: 'ActionOutput',
          OutputUUID: uuid || linkLabel
        };
        const friendly =
          (meta && meta.friendly) ||
          humanizeActionName((meta && meta.action) || linkLabel) ||
          linkLabel;
        if (friendly) attachment.OutputName = friendly;
        attachments.push(attachment);
      }
      cursor = match.index + all.length;
    }
    if (cursor < input.length) {
      text += input.slice(cursor);
    }
    return { text, attachments };
  }

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

  function interpretQuickReference(raw) {
    if (typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (trimmed.startsWith('!link:')) {
      const target = trimmed.slice(6).trim();
      if (!target) return { type: 'string', value: '' };
      return { type: 'link', value: target };
    }
    if (trimmed.startsWith('!var:')) {
      const name = trimmed.slice(5).trim().replace(/[{}]/g, '');
      if (!name) return { type: 'string', value: '' };
      return { type: 'variable', value: name };
    }
    return null;
  }

  function renderValue(value) {
    if (value && value[SPECIAL_VALUE]) {
      return renderSpecialValue(value);
    }
    if (value == null) return XML.str('');
    if (typeof value === 'string') {
      const quick = interpretQuickReference(value);
      if (quick) {
        if (quick.type === 'link') {
          const label = quick.value;
          const uuid = resolveLinkUUID(label);
          const meta = lookupLinkMetadata(label) || {};
          const friendly =
            (meta && meta.friendly) ||
            humanizeActionName((meta && meta.action) || label) ||
            label;
          const attachment = {
            type: 'ActionOutput',
            outputUUID: uuid || label,
            outputName: friendly
          };
          return buildWFTextTokenString('', [attachment]);
        }
        if (quick.type === 'variable') return XML.str(`{{${quick.value}}}`);
        return XML.str(quick.value || '');
      }
      const parsed = parseTokenizedText(value);
      if (parsed.attachments.length) {
        const attachmentSpecs = parsed.attachments.map((entry) => {
          if (entry.type === 'Variable') {
            return { range: entry.range, type: 'Variable', VariableName: entry.VariableName };
          }
          const spec = { range: entry.range, type: 'ActionOutput', OutputUUID: entry.OutputUUID };
          if (entry.OutputName) spec.OutputName = entry.OutputName;
          return spec;
        });
        return renderValue(textTokenValue(parsed.text, attachmentSpecs));
      }
      return XML.str(value);
    }
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

  function mergeParams(...sources) {
    const out = {};
    for (const src of sources) {
      if (!src || typeof src !== 'object') continue;
      const obj = src[SPECIAL_VALUE] ? src : src;
      for (const [key, val] of Object.entries(obj)) {
        if (val === undefined) continue;
        out[key] = val;
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
        {
          const quick = interpretQuickReference(value);
          if (quick) {
            if (quick.type === 'link') {
              const uuid = resolveLinkUUID(quick.value);
              return XML.str(uuid || quick.value);
            }
            if (quick.type === 'variable') return XML.str(`{{${quick.value}}}`);
            return XML.str(quick.value || '');
          }
        }
        if (value == null || value === true) return XML.str(genUUID());
        return XML.str(String(value));
      default:
        return renderValue(value);
    }
  }

  function renderAutoPlaceholder(key, value) {
    const upperKey = String(key || '').toUpperCase();
    if (upperKey === 'ALERTACTIONMESSAGE') {
      return renderAlertMessage(value);
    }
    if (upperKey === 'SHOWCANCELBUTTON') {
      if (value === undefined) return XML.bool(false);
      return renderValue(value);
    }
    if (upperKey === 'UUID') {
      const quick = interpretQuickReference(value);
      if (quick) {
        if (quick.type === 'link') {
          const uuid = resolveLinkUUID(quick.value);
          return XML.str(uuid || quick.value);
        }
        if (quick.type === 'variable') return XML.str(`{{${quick.value}}}`);
        return XML.str(quick.value || '');
      }
      if (value === undefined || value === null || value === true) return XML.str(genUUID());
      return XML.str(String(value));
    }
    if (value === undefined) {
      return XML.str('');
    }
    return renderValue(value);
  }

  function renderAlertMessage(value) {
    if (value && value[SPECIAL_VALUE]) return renderValue(value);
    if (value == null) return XML.str('');
    if (typeof value !== 'string') return renderValue(value);
    const { text, attachments } = parseTokenizedText(value);
    if (!attachments.length) return XML.str(text);
    const attachmentSpecs = attachments.map((entry) => {
      if (entry.type === 'Variable') {
        return { range: entry.range, type: 'Variable', VariableName: entry.VariableName };
      }
      const spec = { range: entry.range, type: 'ActionOutput', OutputUUID: entry.OutputUUID };
      if (entry.OutputName) spec.OutputName = entry.OutputName;
      return spec;
    });
    return renderValue(textTokenValue(text, attachmentSpecs));
  }

  function substitutePlaceholders(dictXML, params = {}) {
    if (!dictXML) return '';
    const normalizedParams = params && params.__normalized ? params : applyParamAliases(dictXML, params);
    let out = String(dictXML);
    out = out.replace(/\{\{\s*([A-Za-z]+)\s*:\s*([A-Za-z0-9_.-]+)\s*\}\}/g, (_m, type, keyRaw) => {
      const key = String(keyRaw);
      const value = normalizedParams[key];
      return renderTypedPlaceholder(type, key, value);
    });
    out = out.replace(/\{\{\s*([A-Za-z0-9_.-]+)\s*\}\}/g, (_m, keyRaw) => {
      const key = String(keyRaw);
      const value = normalizedParams[key];
      return renderAutoPlaceholder(key, value);
    });
    return out;
  }

  function applyParamAliases(dictXML, params = {}) {
    if (!params || typeof params !== 'object') return {};
    const out = { ...params };
    const lowerKeyByCanonical = new Map();
    for (const key of Object.keys(out)) {
      lowerKeyByCanonical.set(key.toLowerCase(), key);
    }

    const getValue = (candidate) => {
      if (out[candidate] !== undefined) return out[candidate];
      const mapped = lowerKeyByCanonical.get(candidate.toLowerCase());
      if (mapped && out[mapped] !== undefined) return out[mapped];
      return undefined;
    };

    const setValue = (target, value) => {
      out[target] = value;
      lowerKeyByCanonical.set(target.toLowerCase(), target);
    };

    const hasPlaceholder = (name) => new RegExp(`\\{\\{\\s*${name}\\s*\\}\}`, 'i').test(dictXML);
    const isLinkToken = (val) => typeof val === 'string' && /^\s*!link:/i.test(val);
    const isVariableToken = (val) => typeof val === 'string' && /^\s*!var:/i.test(val);

    const ensure = (target, candidates, predicate) => {
      if (getValue(target) !== undefined) return;
      for (const candidate of candidates) {
        const val = getValue(candidate);
        if (val === undefined) continue;
        if (predicate && !predicate(val, candidate)) continue;
        setValue(target, val);
        break;
      }
    };

    // Case-insensitive duplicates (TitleCase convenience)
    for (const key of Object.keys(out)) {
      const proper = key.length ? key[0].toUpperCase() + key.slice(1) : key;
      if (out[proper] === undefined && key !== proper) {
        setValue(proper, out[key]);
      }
    }

    if (hasPlaceholder('UUID')) {
      ensure('UUID', ['OutputUUID', 'Uuid', 'Value', 'Variable'], (val, source) => {
        if (isLinkToken(val)) return true;
        if (source.toLowerCase() === 'variable' && isVariableToken(val)) return true;
        return false;
      });
    }
    if (hasPlaceholder('OutputUUID')) {
      ensure('OutputUUID', ['UUID', 'Value'], (val) => isLinkToken(val));
    }
    if (hasPlaceholder('VariableName')) {
      ensure('VariableName', ['Name', 'VarName', 'Variable']);
    }
    if (hasPlaceholder('WFVariableName')) {
      ensure('WFVariableName', ['VariableName', 'Name']);
    }
    if (hasPlaceholder('Text')) {
      ensure('Text', ['text', 'Value']);
    }
    if (hasPlaceholder('URL')) {
      ensure('URL', ['url', 'Link', 'Input', 'WFInput'], (val) => !isLinkToken(val) || true);
    }
    if (hasPlaceholder('WFInput')) {
      ensure('WFInput', ['Input', 'URL', 'Value', 'Text']);
    }
    if (hasPlaceholder('AlertActionMessage')) {
      ensure('AlertActionMessage', ['Message', 'Text']);
    }
    if (hasPlaceholder('AlertActionTitle')) {
      ensure('AlertActionTitle', ['Title']);
    }
    if (hasPlaceholder('ShowCancelButton')) {
      ensure('ShowCancelButton', ['Cancel', 'ShowCancelButton', 'ShowCancel']);
    }

    if (hasPlaceholder('OutputName')) {
      const currentUUID = getValue('UUID') || getValue('OutputUUID');
      let friendly = null;
      if (typeof currentUUID === 'string') {
        const trimmed = currentUUID.trim();
        if (/^!link:/i.test(trimmed)) {
          const label = trimmed.slice(6).trim();
          const meta = lookupLinkMetadata(label);
          friendly = meta?.friendly || humanizeActionName(meta?.action || label);
        } else if (/^!var:/i.test(trimmed)) {
          friendly = trimmed.slice(5).trim().replace(/[{}]/g, '').toUpperCase();
        }
      }
      if (friendly == null && typeof getValue('VariableName') === 'string') {
        friendly = getValue('VariableName');
      }
      if (friendly == null && typeof getValue('Name') === 'string') {
        friendly = getValue('Name');
      }
      if (friendly == null && typeof getValue('Label') === 'string') {
        friendly = getValue('Label');
      }
      if (friendly == null && typeof currentUUID === 'string' && currentUUID) {
        friendly = currentUUID.replace(/^!link:/i, '').replace(/^!var:/i, '');
      }
      if (friendly == null) friendly = 'Value';
      setValue('OutputName', friendly);
    }

    Object.defineProperty(out, '__normalized', { value: true, enumerable: false });
    return out;
  }

  // ---- Ask LLM prompt post-processing (conditional text-token vs plain string) ----
  function normalizeAttachmentSpec(raw) {
    if (raw == null) return null;

    let spec;
    if (typeof raw === 'string') {
      spec = { __raw: raw };
      const quick = interpretQuickReference(raw);
      if (quick?.type === 'link') {
        const label = quick.value;
        const resolved = resolveLinkUUID(label);
        const meta = lookupLinkMetadata(label) || {};
        spec.outputUUID = resolved || label;
        spec.outputName =
          meta?.friendly ??
          humanizeActionName(meta?.action || label) ??
          label;
        spec.type = 'ActionOutput';
      } else if (quick?.type === 'variable') {
        spec.variableName = quick.value;
        spec.type = 'Variable';
      } else {
        spec.value = raw;
      }
    } else if (typeof raw === 'object') {
      spec = { ...raw, __raw: raw };
    } else {
      spec = { value: raw, __raw: raw };
    }

    if (spec.range == null && spec.Range != null) spec.range = spec.Range;
    if (spec.range != null) spec.range = String(spec.range);

    const startCandidate = spec.start ?? spec.Start ?? spec.begin ?? spec.Begin;
    if (startCandidate != null) spec.start = Number(startCandidate) || 0;

    const lenCandidate = spec.len ?? spec.length ?? spec.Len ?? spec.count ?? spec.Count;
    if (lenCandidate != null) spec.len = Number(lenCandidate) || 1;
    if (spec.start != null && spec.len == null) spec.len = 1;

    let outputUUID =
      spec.outputUUID ??
      spec.OutputUUID ??
      spec.uuid ??
      spec.UUID ??
      spec.id ??
      null;
    let outputName =
      spec.outputName ??
      spec.OutputName ??
      spec.label ??
      spec.name ??
      null;

    if (typeof outputUUID === 'string') {
      const trimmed = outputUUID.trim();
      if (/^!link:/i.test(trimmed)) {
        const label = trimmed.slice(6).trim();
        const resolved = resolveLinkUUID(label);
        outputUUID = resolved || label;
        if (!outputName) {
          const meta = lookupLinkMetadata(label) || {};
          outputName =
            meta?.friendly ??
            humanizeActionName(meta?.action || label) ??
            label;
        }
      }
    }

    if (outputUUID != null) spec.outputUUID = outputUUID;
    if (outputName != null) spec.outputName = outputName;

    const variableName = spec.variableName ?? spec.VariableName ?? null;
    if (variableName != null) spec.variableName = String(variableName);

    if (!spec.type) {
      if (spec.Type) spec.type = spec.Type;
      else if (outputUUID != null) spec.type = 'ActionOutput';
      else if (variableName != null) spec.type = 'Variable';
    }

    if (spec.type != null) spec.type = String(spec.type);
    if (spec.Type == null && spec.type != null) spec.Type = spec.type;

    spec.__autoRange = !(spec.range || spec.start != null);
    return spec;
  }

  function buildWFTextTokenString(promptText, attachments) {
    const normalizedList = (attachments || [])
      .map((entry) => normalizeAttachmentSpec(entry))
      .filter(Boolean);

    let text = String(promptText ?? '');
    const entries = [];

    for (const spec of normalizedList) {
      let rangeKey;
      if (spec.range) {
        rangeKey = String(spec.range);
      } else if (spec.start != null) {
        const start = Number(spec.start) || 0;
        const len = Number(spec.len ?? 1) || 1;
        rangeKey = `{${start}, ${len}}`;
      } else {
        const start = text.length;
        text += ATTACHMENT_SENTINEL;
        rangeKey = `{${start}, 1}`;
      }

      const payload = {};

      const typeValue = spec.type ?? spec.Type ?? null;
      if (typeValue != null) payload.Type = XML.str(String(typeValue));

      const outputName = spec.outputName ?? spec.OutputName ?? null;
      if (outputName != null) payload.OutputName = XML.str(String(outputName));

      const outputUUID = spec.outputUUID ?? spec.OutputUUID ?? null;
      if (outputUUID != null) payload.OutputUUID = XML.str(String(outputUUID));

      const variableValue = spec.Variable ?? spec.variable ?? null;
      if (variableValue != null) payload.Variable = renderValue(variableValue);

      const variableName = spec.variableName ?? spec.VariableName ?? null;
      if (variableName != null) payload.VariableName = XML.str(String(variableName));

      const val = spec.value ?? spec.Value ?? null;
      if (val != null) payload.Value = renderValue(val);

      const serializationType = spec.serializationType ?? spec.WFSerializationType ?? null;
      if (serializationType != null) {
        payload.WFSerializationType = XML.str(String(serializationType));
      }

      if (!Object.keys(payload).length) {
        payload.Type = XML.str('Variable');
      }

      entries.push(`<key>${XML.esc(rangeKey)}</key>${XML.dict(payload)}`);
    }

    if (!entries.length) return XML.str(text);

    return XML.dict({
      Value: XML.dict({
        attachmentsByRange: `<dict>${entries.join('')}</dict>`,
        string: XML.str(text)
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
      return varsLike.filter((entry) => entry != null);
    }
    if (typeof varsLike === 'string') {
      return [varsLike];
    }
    if (typeof varsLike === 'object') {
      return Object.entries(varsLike).map(([range, meta]) => {
        if (meta == null || typeof meta !== 'object') {
          return { range, type: meta };
        }
        if (meta.range == null && meta.Range == null) {
          return { range, ...meta };
        }
        return { ...meta };
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
    const promptText =
      params?.PROMPT ??
      params?.WFLLMPrompt ??
      params?.LLMPrompt ??
      params?.Prompt ??
      '';
    const varsRaw = params?.AttachmentsByRange ?? params?.attachmentsByRange ?? params?.VARIABLES ?? params?.variables ?? params?.Attachments ?? params?.attachments;
    const attachments = normalizeAskLLMAttachments(varsRaw);

    const promptBlockPattern = /(<key>\s*WFLLMPrompt\s*<\/key>\s*)(?:<dict>[\s\S]*?<key>\s*WFSerializationType\s*<\/key>\s*<string>\s*WFTextTokenString\s*<\/string>\s*<\/dict>|<string>[\s\S]*?<\/string>|{{\s*LLMPrompt\s*}})/i;

    if (!attachments || !attachments.length) {
      const fallbackValue =
        params?.LLMPrompt ??
        params?.WFLLMPrompt ??
        params?.PROMPT ??
        params?.Prompt ??
        '';
      const fallbackNode = renderAutoPlaceholder('LLMPrompt', fallbackValue);
      const fallbackReplaced = dictXML.replace(
        promptBlockPattern,
        `$1${fallbackNode}`
      );
      if (fallbackReplaced !== dictXML) return fallbackReplaced;
      return dictXML;
    }

    // Build the right WFLLMPrompt node (plain string if no attachments; WFTextTokenString otherwise)
    const promptNode = buildWFTextTokenString(promptText, attachments);

    // Replace any existing WFLLMPrompt block (either &lt;dict&gt;...&lt;/dict&gt; or &lt;string&gt;...&lt;/string&gt;)
    const replaced = dictXML.replace(promptBlockPattern, `$1${promptNode}`);

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
  Conversion.toPlist = async ({ name, text, program }) => {
    try {
      const safeName = (name || 'My Shortcut').trim() || 'My Shortcut';
      let prog = null;

      if (program && typeof program === 'object') {
        prog = program;
      } else if (typeof text === 'string' && text.trim()) {
        if (!looksLikeJSON(text)) {
          fail('Expected JSON input that starts with { or [}.');
        }
        prog = tryParseJSON(text);
      } else {
        fail('Nothing to convert. Provide JSON string "text" or a "program" object.');
      }

      return await Conversion.toPlistFromJSON({ name: safeName, program: prog });
    } catch (e) {
      const detail = (e && e.detail) ? `\nDetail: ${JSON.stringify(e.detail).slice(0,400)}` : '';
      throw new Error((e && e.message) ? `Conversion failed: ${e.message}${detail}` : 'Conversion failed');
    }
  };

  Conversion.toPlistFromJSON = async ({ name, program }) => {
    linkRegistry.clear();
    const prog = coerceProgram(program, name);
    const wfName = String(prog.name || name || 'My Shortcut');
    const actions = prog.actions;

    const plistActions = await buildActionsArrayFromJSON(actions);

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

  function valueIsPlaceholder(str) {
    if (typeof str !== 'string') return false;
    return /\{\{.+?\}\}/.test(str.trim());
  }

  function placeholderToken(name) {
    return `{{${name}}}`;
  }

  function ensureStringNode(value, placeholderName, fallback) {
    let v = value;
    if (v == null || (typeof v === 'string' && !v.trim())) {
      v = fallback !== undefined ? fallback : placeholderToken(placeholderName);
    }
    if (typeof v === 'string') {
      const trimmed = v.trim();
      if (!trimmed) return placeholderToken(placeholderName);
      if (valueIsPlaceholder(trimmed) || trimmed.startsWith('<')) return trimmed;
      return XML.str(v);
    }
    return XML.str(v);
  }

  function ensureAnyNode(value, placeholderName, fallback) {
    let v = value;
    if (v == null) v = fallback !== undefined ? fallback : placeholderToken(placeholderName);
    if (typeof v === 'string') {
      const trimmed = v.trim();
      if (!trimmed) return placeholderToken(placeholderName);
      if (valueIsPlaceholder(trimmed) || trimmed.startsWith('<')) return trimmed;
      return renderValue(v);
    }
    return renderValue(v);
  }

  function replaceTemplate(template, map) {
    let out = template;
    for (const [key, val] of Object.entries(map)) {
      out = out.split(`{{${key}}}`).join(val);
    }
    return out;
  }

  function comment(text) {
    return `<dict>
  <key>WFWorkflowActionIdentifier</key>
  <string>is.workflow.actions.comment</string>
  <key>WFWorkflowActionParameters</key>
  <dict>
    <key>WFCommentActionText</key>
    ${XML.str(String(text ?? ''))}
  </dict>
</dict>`;
  }

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

  const SPECIAL_ACTION_TEMPLATES = {
    IF: [
`<dict>
  <key>WFWorkflowActionIdentifier</key>
  <string>is.workflow.actions.conditional</string>
  <key>WFWorkflowActionParameters</key>
  <dict>
    <key>GroupingIdentifier</key>
    {{GroupingIdentifier}}
    {{StartUUIDBlock}}
    <key>WFCondition</key>
    {{Condition}}
    <key>WFConditionalActionString</key>
    {{CompareTo}}
    <key>WFControlFlowMode</key>
    <integer>0</integer>
    <key>WFInput</key>
    {{Input}}
    <key>WFNumberValue</key>
    {{WFNumberValue}}
  </dict>
</dict>`,
      '{{THEN}}',
`<dict>
  <key>WFWorkflowActionIdentifier</key>
  <string>is.workflow.actions.conditional</string>
  <key>WFWorkflowActionParameters</key>
  <dict>
    <key>GroupingIdentifier</key>
    {{GroupingIdentifier}}
    <key>WFControlFlowMode</key>
    <integer>1</integer>
  </dict>
</dict>`,
      '{{ELSE}}',
`<dict>
  <key>WFWorkflowActionIdentifier</key>
  <string>is.workflow.actions.conditional</string>
  <key>WFWorkflowActionParameters</key>
  <dict>
    <key>GroupingIdentifier</key>
    {{GroupingIdentifier}}
    <key>UUID</key>
    {{UUID}}
    <key>WFControlFlowMode</key>
    <integer>2</integer>
  </dict>
</dict>`
    ],
    REPEAT: [
`<dict>
  <key>WFWorkflowActionIdentifier</key>
  <string>is.workflow.actions.repeat.count</string>
  <key>WFWorkflowActionParameters</key>
  <dict>
    <key>GroupingIdentifier</key>
    {{GroupingIdentifier}}
    <key>WFControlFlowMode</key>
    <integer>0</integer>
    <key>WFRepeatCount</key>
    {{Count}}
  </dict>
</dict>`,
      '{{BODY}}',
`<dict>
  <key>WFWorkflowActionIdentifier</key>
  <string>is.workflow.actions.repeat.count</string>
  <key>WFWorkflowActionParameters</key>
  <dict>
    <key>GroupingIdentifier</key>
    {{GroupingIdentifier}}
    <key>UUID</key>
    {{UUID}}
    <key>WFControlFlowMode</key>
    <integer>2</integer>
  </dict>
</dict>`
    ],
    REPEAT_EACH: [
`<dict>
  <key>WFWorkflowActionIdentifier</key>
  <string>is.workflow.actions.repeat.each</string>
  <key>WFWorkflowActionParameters</key>
  <dict>
    <key>GroupingIdentifier</key>
    {{GroupingIdentifier}}
    <key>WFControlFlowMode</key>
    <integer>0</integer>
    <key>WFInput</key>
    {{ItemsIn}}
  </dict>
</dict>`,
      '{{BODY}}',
`<dict>
  <key>WFWorkflowActionIdentifier</key>
  <string>is.workflow.actions.repeat.each</string>
  <key>WFWorkflowActionParameters</key>
  <dict>
    <key>GroupingIdentifier</key>
    {{GroupingIdentifier}}
    <key>UUID</key>
    {{UUID}}
    <key>WFControlFlowMode</key>
    <integer>2</integer>
  </dict>
</dict>`
    ]
  };

  async function buildSpecialIf(item) {
    const params = (item && typeof item === 'object') ? (item.params || {}) : {};

    const providedGroup =
      params.GroupingIdentifier ??
      params.groupingIdentifier ??
      params.group ??
      params.Group ??
      null;
    const groupingIdentifier = ensureStringNode(providedGroup ?? genUUID(), 'GroupingIdentifier');

    const startUUID = params.StartUUID ?? params.UUIDStart ?? params.startUUID ?? null;
    const startUUIDBlock = startUUID == null
      ? ''
      : `<key>UUID</key>\n    ${ensureStringNode(startUUID, 'StartUUID')}`;

    const conditionParam = params.WFCondition ?? params.Condition ?? params.condition;
    let conditionNode;
    if (conditionParam == null) {
      conditionNode = placeholderToken('Condition');
    } else if (typeof conditionParam === 'string' && valueIsPlaceholder(conditionParam.trim())) {
      conditionNode = conditionParam;
    } else {
      conditionNode = XML.int(resolveConditionMode(conditionParam));
    }

    const compareValue =
      params.WFConditionalActionString ??
      params.CompareTo ??
      params.compareTo ??
      null;
    const compareNode = ensureAnyNode(compareValue, 'CompareTo', placeholderToken('CompareTo'));

    const inputValue =
      params.WFInput ??
      params.Input ??
      params.input ??
      null;
    const inputNode = ensureAnyNode(inputValue, 'Input', placeholderToken('Input'));

    const numberValue = params.WFNumberValue ?? params.NumberValue ?? params.numberValue ?? '124';
    const numberNode = ensureAnyNode(numberValue, 'WFNumberValue', '124');

    const endUUID = params.EndUUID ?? params.UUIDEnd ?? params.endUUID ?? params.UUID ?? null;
    const endUUIDNode = ensureStringNode(endUUID ?? genUUID(), 'UUID');

    const thenActions = Array.isArray(item?.then) && item.then.length
      ? await buildActionsArrayFromJSON(item.then)
      : [comment('If (then) has no actions')];

    const elseActions = Array.isArray(item?.else) && item.else.length
      ? await buildActionsArrayFromJSON(item.else)
      : [comment('If (else) has no actions')];

    const templateValues = {
      GroupingIdentifier: groupingIdentifier,
      StartUUIDBlock: startUUIDBlock,
      Condition: conditionNode,
      CompareTo: compareNode,
      Input: inputNode,
      WFNumberValue: numberNode,
      UUID: endUUIDNode,
      THEN: thenActions.join('\n'),
      ELSE: elseActions.join('\n')
    };

    return SPECIAL_ACTION_TEMPLATES.IF.map((part) => replaceTemplate(part, templateValues));
  }

  async function buildSpecialRepeatCount(item) {
    const params = (item && typeof item === 'object') ? (item.params || {}) : {};

    const providedGroup =
      params.GroupingIdentifier ??
      params.groupingIdentifier ??
      params.group ??
      params.Group ??
      null;
    const groupingIdentifier = ensureStringNode(providedGroup ?? genUUID(), 'GroupingIdentifier');

    const countValue =
      params.WFRepeatCount ??
      params.Count ??
      params.count ??
      null;
    const countNode = ensureAnyNode(countValue, 'Count', placeholderToken('Count'));

    const endUUID = params.EndUUID ?? params.UUIDEnd ?? params.endUUID ?? params.UUID ?? null;
    const endUUIDNode = ensureStringNode(endUUID ?? genUUID(), 'UUID');

    const bodyActions = Array.isArray(item?.do) && item.do.length
      ? await buildActionsArrayFromJSON(item.do)
      : [comment('Repeat has no actions')];

    const templateValues = {
      GroupingIdentifier: groupingIdentifier,
      Count: countNode,
      UUID: endUUIDNode,
      BODY: bodyActions.join('\n')
    };

    return SPECIAL_ACTION_TEMPLATES.REPEAT.map((part) => replaceTemplate(part, templateValues));
  }

  async function buildSpecialRepeatEach(item) {
    const params = (item && typeof item === 'object') ? (item.params || {}) : {};

    const providedGroup =
      params.GroupingIdentifier ??
      params.groupingIdentifier ??
      params.group ??
      params.Group ??
      null;
    const groupingIdentifier = ensureStringNode(providedGroup ?? genUUID(), 'GroupingIdentifier');

    const itemsValue =
      params.WFInput ??
      params.Items ??
      params.List ??
      params.items ??
      params.ItemsIn ??
      null;
    const itemsNode = ensureAnyNode(itemsValue, 'ItemsIn', placeholderToken('ItemsIn'));

    const endUUID = params.EndUUID ?? params.UUIDEnd ?? params.endUUID ?? params.UUID ?? null;
    const endUUIDNode = ensureStringNode(endUUID ?? genUUID(), 'UUID');

    const bodyActions = Array.isArray(item?.do) && item.do.length
      ? await buildActionsArrayFromJSON(item.do)
      : [comment('Repeat Each has no actions')];

    const templateValues = {
      GroupingIdentifier: groupingIdentifier,
      ItemsIn: itemsNode,
      UUID: endUUIDNode,
      BODY: bodyActions.join('\n')
    };

    return SPECIAL_ACTION_TEMPLATES.REPEAT_EACH.map((part) => replaceTemplate(part, templateValues));
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
  async function buildActionsArrayFromJSON(list) {
    const out = [];
    for (const item of list) {
      if (typeof item === 'string') {
        out.push(await buildActionFromConversions(item, {}));
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
        try {
          out.push(...await specialBuilder(item));
        } catch (err) {
          if (typeof console !== 'undefined' && console.warn) {
            console.warn('SPECIAL_ACTION_BUILDERS failed', kind, err);
          }
          out.push(buildFallbackAction(kind, item.params || {}));
        }
        continue;
      }

      // Regular action
      try {
        out.push(await buildActionFromConversions(kind, item.params || {}));
      } catch (err) {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('buildActionsArrayFromJSON fallback', kind, err);
        }
        out.push(buildFallbackAction(kind, item.params || {}));
      }
    }
    return out;
  }

  function guessActionIdentifier(actionName) {
    if (!actionName) return 'is.workflow.actions.comment';
    const trimmed = String(actionName).trim();
    if (/^is\.workflow\./i.test(trimmed)) return trimmed.toLowerCase();
    const sanitized = trimmed
      .replace(/\.json$/i, '')
      .replace(/[^A-Za-z0-9.]+/g, '')
      .replace(/\s+/g, '');
    if (!sanitized) return 'is.workflow.actions.comment';
    return `is.workflow.actions.${sanitized.toLowerCase()}`;
  }

  function buildFallbackParameters(params, actionName) {
    if (!params || typeof params !== 'object' || Array.isArray(params)) return '<dict/>';
    const normalized = applyParamAliases('', params);
    for (const [key, value] of Object.entries(normalized)) {
      if (typeof value !== 'string') continue;
      const trimmed = value.trim();
      if (!/^!link:/i.test(trimmed)) continue;
      const label = trimmed.slice(6).trim();
      if (label) registerLinkLabel(label, actionName);
    }
    const rendered = renderValue(normalized);
    const trimmedRendered = rendered.trim();
    if (!trimmedRendered) return '<dict/>';
    if (/^<dict[\s>]/i.test(trimmedRendered)) return rendered;
    return renderValue({ Value: normalized });
  }

  function buildFallbackAction(actionName, params) {
    const identifier = guessActionIdentifier(actionName);
    const parameters = buildFallbackParameters(params, actionName);
    return `<dict>
  <key>WFWorkflowActionIdentifier</key>
  ${XML.str(identifier)}
  <key>WFWorkflowActionParameters</key>
  ${parameters}
</dict>`;
  }

  // ---- Build one action from Conversions/ dict template ----
  async function buildActionFromConversions(actionName, params) {
    try {
      // Find file
      const filename = await lookupConversionFileForAction(actionName);
      if (!filename) {
        if (typeof console !== 'undefined' && console.warn) {
          console.warn('lookupConversionFileForAction missing template', actionName);
        }
        return buildFallbackAction(actionName, params);
      }
      // Load <dict>…</dict> snippet
      const dictXML = await loadConvFile(filename);

      const normalizedParams = applyParamAliases(dictXML, params || {});
      for (const [key, value] of Object.entries(normalizedParams)) {
        if (typeof value !== 'string') continue;
        const trimmed = value.trim();
        if (!/^!link:/i.test(trimmed)) continue;
        if (!OUTPUT_FIELD_REGEX.test(key)) continue;
        const label = trimmed.slice(6).trim();
        registerLinkLabel(label, actionName);
      }
      // Substitutions
      let substituted = substitutePlaceholders(dictXML, normalizedParams);
      substituted = postProcessAskLLM(substituted, normalizedParams);

      // Ensure it *looks* like a dict (we won't attempt to validate fully)
      if (!/^\s*<dict>[\s\S]*<\/dict>\s*$/i.test(substituted)) {
        // Wrap if the file accidentally contains only inner content
        return `<dict>${substituted}</dict>`;
      }
      return substituted;
    } catch (err) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('buildActionFromConversions failed', actionName, err);
      }
      return buildFallbackAction(actionName, params);
    }
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

  function comment(text) {
    return makeAction('is.workflow.actions.comment', {
      WFCommentActionText: String(text ?? '')
    });
  }

  async function buildRepeatCountBlock(item) {
    const params = (item && typeof item === 'object') ? (item.params || {}) : {};
    const groupId =
      params.GroupingIdentifier ??
      params.groupingIdentifier ??
      params.grouping ??
      params.group ??
      genUUID();

    let repeatCountValue;
    if (Object.prototype.hasOwnProperty.call(params, 'WFRepeatCount')) repeatCountValue = params.WFRepeatCount;
    else if (Object.prototype.hasOwnProperty.call(params, 'Count')) repeatCountValue = params.Count;
    else if (Object.prototype.hasOwnProperty.call(params, 'repeatCount')) repeatCountValue = params.repeatCount;
    else repeatCountValue = 1;

    const startUUID = params.StartUUID ?? params.UUIDStart ?? params.UUID ?? null;

    const startParams = mergeParams(
      { GroupingIdentifier: groupId, WFControlFlowMode: 0, WFRepeatCount: repeatCountValue },
      startUUID != null ? { UUID: startUUID } : null,
      params.StartParams,
      params.Start,
      params.start,
      params.StartParameters
    );

    const startAction = makeAction(IDS.REPEAT_COUNT, startParams);

    const bodyActions = Array.isArray(item?.do)
      ? await buildActionsArrayFromJSON(item.do)
      : [comment('Repeat has no "do" array')];

    const endUUID = params.EndUUID ?? params.UUIDEnd ?? null;
    const endParams = mergeParams(
      { GroupingIdentifier: groupId, WFControlFlowMode: 2 },
      endUUID != null ? { UUID: endUUID } : null,
      params.EndParams,
      params.End,
      params.end,
      params.EndParameters
    );
    const endAction = makeAction(IDS.REPEAT_COUNT, endParams);

    return [startAction, ...bodyActions, endAction];
  }

  async function buildRepeatEachBlock(item) {
    const params = (item && typeof item === 'object') ? (item.params || {}) : {};
    const groupId =
      params.GroupingIdentifier ??
      params.groupingIdentifier ??
      params.grouping ??
      params.group ??
      genUUID();

    let itemsValue;
    if (Object.prototype.hasOwnProperty.call(params, 'WFInput')) itemsValue = params.WFInput;
    else if (Object.prototype.hasOwnProperty.call(params, 'Items')) itemsValue = params.Items;
    else if (Object.prototype.hasOwnProperty.call(params, 'List')) itemsValue = params.List;
    else if (Object.prototype.hasOwnProperty.call(params, 'items')) itemsValue = params.items;

    const startUUID = params.StartUUID ?? params.UUIDStart ?? params.UUID ?? null;
    const baseStart = { GroupingIdentifier: groupId, WFControlFlowMode: 0 };
    if (itemsValue !== undefined) baseStart.WFInput = itemsValue;
    if (startUUID != null) baseStart.UUID = startUUID;
    const startParams = mergeParams(
      baseStart,
      params.StartParams,
      params.Start,
      params.start,
      params.StartParameters
    );
    const startAction = makeAction(IDS.REPEAT_EACH, startParams);

    const bodyActions = Array.isArray(item?.do)
      ? await buildActionsArrayFromJSON(item.do)
      : [comment('RepeatEach has no "do" array')];

    const endUUID = params.EndUUID ?? params.UUIDEnd ?? null;
    const endParams = mergeParams(
      { GroupingIdentifier: groupId, WFControlFlowMode: 2 },
      endUUID != null ? { UUID: endUUID } : null,
      params.EndParams,
      params.End,
      params.end,
      params.EndParameters
    );
    const endAction = makeAction(IDS.REPEAT_EACH, endParams);

    return [startAction, ...bodyActions, endAction];
  }

  async function buildIfBlock(item) {
    const params = (item && typeof item === 'object') ? (item.params || {}) : {};
    const groupId =
      params.GroupingIdentifier ??
      params.groupingIdentifier ??
      params.group ??
      genUUID();

    let conditionMode;
    if (Object.prototype.hasOwnProperty.call(params, 'WFCondition')) conditionMode = params.WFCondition;
    else if (Object.prototype.hasOwnProperty.call(params, 'ConditionMode')) conditionMode = params.ConditionMode;
    else if (Object.prototype.hasOwnProperty.call(params, 'conditionMode')) conditionMode = params.conditionMode;

    let conditionString;
    if (Object.prototype.hasOwnProperty.call(params, 'WFConditionalActionString')) {
      conditionString = params.WFConditionalActionString;
    } else if (Object.prototype.hasOwnProperty.call(params, 'Condition')) {
      conditionString = normalizeCondition(params.Condition);
    } else if (Object.prototype.hasOwnProperty.call(params, 'condition')) {
      conditionString = normalizeCondition(params.condition);
    }

    const inputValue =
      Object.prototype.hasOwnProperty.call(params, 'WFInput') ? params.WFInput :
      Object.prototype.hasOwnProperty.call(params, 'Input') ? params.Input :
      Object.prototype.hasOwnProperty.call(params, 'input') ? params.input :
      undefined;

    if (conditionMode === undefined) conditionMode = 4;
    if (conditionString === undefined) conditionString = 'Anything';

    const startUUID = params.StartUUID ?? params.UUIDStart ?? params.UUID ?? null;
    const baseStart = {
      GroupingIdentifier: groupId,
      WFControlFlowMode: 0,
      WFCondition: conditionMode,
      WFConditionalActionString: conditionString
    };
    if (inputValue !== undefined) baseStart.WFInput = inputValue;
    if (startUUID != null) baseStart.UUID = startUUID;
    const startParams = mergeParams(
      baseStart,
      params.StartParams,
      params.Start,
      params.start,
      params.StartParameters
    );
    const startAction = makeAction(IDS.IF, startParams);

    const elseUUID = params.ElseUUID ?? params.UUIDElse ?? null;
    const elseParams = mergeParams(
      { GroupingIdentifier: groupId, WFControlFlowMode: 1 },
      elseUUID != null ? { UUID: elseUUID } : null,
      params.ElseParams,
      params.Else,
      params.else,
      params.ElseParameters
    );
    const elseAction = makeAction(IDS.IF, elseParams);

    const endUUID = params.EndUUID ?? params.UUIDEnd ?? null;
    const endParams = mergeParams(
      { GroupingIdentifier: groupId, WFControlFlowMode: 2 },
      endUUID != null ? { UUID: endUUID } : null,
      params.EndParams,
      params.End,
      params.end,
      params.EndParameters
    );
    const endAction = makeAction(IDS.IF, endParams);

    const thenActions = Array.isArray(item?.then)
      ? await buildActionsArrayFromJSON(item.then)
      : [comment('If has no "then" array')];

    const elseActions = Array.isArray(item?.else)
      ? await buildActionsArrayFromJSON(item.else)
      : [];

    return [startAction, ...thenActions, elseAction, ...elseActions, endAction];
  }

  // ---- Condition normalization (human-display only; internal fields omitted) ----
  function normalizeCondition(s) {
    const t = String(s||'').trim()
      .replace(/\s+/g,' ')
      .replace(/\{\{\s*/g,'{{')
      .replace(/\s*\}\}/g,'}}');
    // Expected shapes, e.g.:
    // "{{VAR}} is 3", "{{VAR}} is not 0", "{{VAR}} has any value", etc.
    return t;
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
  function tryParseJSON(text){
    try {
      const t = String(text || '').trim();
      if (!(t.startsWith('{') || t.startsWith('['))) return null;
      return JSON.parse(t);
    } catch { return null; }
  }

  function previewValue(value, max = 400) {
    if (typeof value === 'string') return value.slice(0, max);
    try {
      return JSON.stringify(value, null, 2).slice(0, max);
    } catch {
      return String(value ?? '').slice(0, max);
    }
  }

  function normalizeInput(input, name){
    if (typeof input === 'string'){
      const s = input.trim();
      if (!s) return { error: 'Empty input string.', name, preview: '' };
      if (s.startsWith('<?xml')) return { plist: s, name };
      const maybe = tryParseJSON(s);
      if (maybe !== null) return { program: maybe, name };
      return {
        error: 'Expected JSON input (string did not start with { or [).',
        name,
        preview: previewValue(s)
      };
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
      return {
        error: 'Unsupported program object shape.',
        name,
        preview: previewValue(input)
      };
    }
    return {
      error: 'Unsupported input type.',
      name,
      preview: previewValue(input)
    };
  }

  // --- Shims for legacy callers ---
  // Some callers expect a ConversionJSON facade. Provide it if missing.
  if (!global.ConversionJSON && global.Conversion && typeof global.Conversion.toPlistFromJSON === 'function') {
    global.ConversionJSON = {
      toPlist: ({ name, program }) => global.Conversion.toPlistFromJSON({ name, program })
    };
  }

  async function toPlistUniversal(input, name){
    const norm = normalizeInput(input, name);
    const n = norm.name || name || 'My Shortcut';

    if (norm.plist) return norm.plist;
    if (norm.error) {
      const err = new Error(norm.error);
      err.detail = { name: n, preview: norm.preview };
      throw err;
    }

    if (!norm.program) {
      const err = new Error('No program provided.');
      err.detail = { name: n, preview: previewValue(input) };
      throw err;
    }

    const prog = norm.program;
    const bundle = { name: prog.name || n, program: prog };
    const attemptErrors = [];

    if (global.Conversion && typeof global.Conversion.toPlistFromJSON === 'function'){
      try { return await global.Conversion.toPlistFromJSON(bundle); }
      catch (e){ attemptErrors.push({ source: 'Conversion.toPlistFromJSON', message: e?.message || String(e) }); }
    }

    if (global.ConversionJSON && typeof global.ConversionJSON.toPlist === 'function'){
      try { return await global.ConversionJSON.toPlist(bundle); }
      catch (e){ attemptErrors.push({ source: 'ConversionJSON.toPlist', message: e?.message || String(e) }); }
    }

    if (global.Conversion && typeof global.Conversion.toPlist === 'function'){
      try { return await global.Conversion.toPlist({ name: bundle.name, text: JSON.stringify(prog) }); }
      catch (e){ attemptErrors.push({ source: 'Conversion.toPlist', message: e?.message || String(e) }); }
    }

    const err = new Error('JSON conversion failed.');
    err.detail = {
      name: n,
      attempts: attemptErrors,
      programPreview: previewValue(prog)
    };
    throw err;
  }

  global.ConversionUniversal = {
    toPlist: toPlistUniversal
  };
})(window);
