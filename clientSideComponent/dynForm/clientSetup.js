let currentDecisionServiceEngine;
let allInputData = [];
let inputData; // per decision service initial data set (external data)
let itsCurrentLanguage = 'english';
let itsQuestionnaireKey = '0';
let itsFlagRenderWithKui = false;
const itsTracer = new Tracer();
const itsStepsController = new corticon.dynForm.StepsController();

// Make stepsController instance globally accessible if needed elsewhere
corticon.dynForm.stepsControllerInstance = itsStepsController;

function processSwitchSample(selectObject) {
    const index = selectObject.value;
    setDataForCurrentSample(index);
    saveStateToLocalStorage('CorticonSelectedSample', index);
}

function setDataForCurrentSample(index) {
    currentDecisionServiceEngine = window.corticonEngines[index]; // Assumes corticonEngines is populated
    inputData = allInputData[index]; // Assumes allInputData is populated
    itsQuestionnaireKey = index;
    console.log("Selected Sample Index:", index);
    console.log("Current Decision Service Engine:", currentDecisionServiceEngine);
    console.log("Input Data:", inputData);
    // Add specific sample logic if needed
}
/**
 * Attaches delegated event listeners and runs initial check for conditional controls.
 * Reads HTML attributes. Includes Kendo UI check.
 */
function setupConditionalVisibility() {
    const uiContainer = $('#dynUIContainerId');
    const useKui = itsFlagRenderWithKui;

    // Remove previous listener
    uiContainer.off('change.conditional');

    // Attach Delegated Listener
    console.log("[ConditionalVisibility] Setting up listener (KUI Mode:", useKui, ")");
    uiContainer.on('change.conditional', ':input', function (event) {
        const changedElement = $(this);
        let triggerId = changedElement.attr('id');
        let kendoWidget = null;

        // --- Kendo Check ---
        if (useKui) {
            kendoWidget = kendo.widgetInstance(changedElement);
            if (!kendoWidget && changedElement.parent().is('.k-widget')) {
                let originalElement = changedElement.parent().find('select, input').first();
                if (originalElement.length) kendoWidget = kendo.widgetInstance(originalElement);
            }
            if (kendoWidget && !triggerId && changedElement.closest('.k-widget').length > 0) {
                triggerId = changedElement.closest('.k-widget').find('select, input').first().attr('id');
            }
        }
        console.log(`[ConditionalVisibility] Change event detected on element ID: ${triggerId || 'N/A'}`);

        if (triggerId) {
            // --- Find elements using HTML attribute selector ---
            const selector = `#dynUIContainerId [data-triggered-by='${triggerId}']`; // Selector remains the same
            console.log(`[ConditionalVisibility] Using selector: "${selector}"`);
            const dependentElements = $(selector);
            console.log(`[ConditionalVisibility] Found ${dependentElements.length} dependent element(s).`); // This should now find elements

            dependentElements.each(function () {
                console.log(`[ConditionalVisibility] Processing dependent element:`, this);
                updateConditionalVisibility($(this), kendoWidget); // Pass widget instance
            });
        } else {
            console.log("[ConditionalVisibility] Change event on element without ID or non-triggering element.");
        }
    });

    // --- Initial check using HTML attribute selector ---
    console.log("[ConditionalVisibility] Running initial visibility check...");
    $('#dynUIContainerId [data-is-conditional="true"]').each(function () { // Use attribute selector here // [!code focus]
        const dependentContainer = $(this);
        const triggerId = dependentContainer.attr('data-triggered-by'); // Read attribute // [!code focus]
        let kendoWidget = null;
        if (triggerId) {
            const triggerElement = $(`#${triggerId}`);
            if (useKui && triggerElement.length) {
                kendoWidget = kendo.widgetInstance(triggerElement);
                if (!kendoWidget && triggerElement.parent().is('.k-widget')) {
                    kendoWidget = kendo.widgetInstance(triggerElement.parent().find('select, input').first());
                }
            }
        }
        updateConditionalVisibility(dependentContainer, kendoWidget);
    });

    console.log("[ConditionalVisibility] Setup complete.");
}

/**
 * Checks the trigger condition and shows/hides a single conditional control container.
 * Reads HTML attributes. Includes Kendo UI check.
 * @param {Object} conditionalContainerEl - The jQuery object for the dependent control's container div.
 * @param {Object|null} kendoWidget - The Kendo widget instance of the trigger element, if applicable.
 */
function updateConditionalVisibility(conditionalContainerEl, kendoWidget) {
    // --- Read data using .attr() ---
    const triggerId = conditionalContainerEl.attr('data-triggered-by'); // [!code focus]
    const triggerValuesStr = conditionalContainerEl.attr('data-trigger-value'); // [!code focus]
    const targetControlId = conditionalContainerEl.attr('data-target-control-id'); // [!code focus]
    // --- End Read Attributes ---

    console.log(`[UpdateVisibility] Checking: ${conditionalContainerEl.attr('id')} (Target: ${targetControlId || 'N/A'}) | Trigger ID: ${triggerId} | Trigger Values: ${triggerValuesStr}`);

    if (!triggerId || triggerValuesStr === undefined || triggerValuesStr === null) { // Check for null attribute too
        // console.warn(`[UpdateVisibility] Conditional control container missing trigger data attributes.`);
        return;
    }

    const triggerElement = $(`#${triggerId}`);
    if (triggerElement.length === 0) {
        console.warn(`[UpdateVisibility] Trigger element with ID #${triggerId} not found.`);
        conditionalContainerEl.hide().addClass('corticon-hidden-control');
        return;
    }
    // console.log(`[UpdateVisibility] Found trigger element:`, triggerElement[0]);

    // Parse expected trigger values
    let triggerValues;
    try {
        triggerValues = JSON.parse(triggerValuesStr);
        if (!Array.isArray(triggerValues)) throw new Error("Not an array");
    } catch (e) {
        console.error(`[UpdateVisibility] Could not parse trigger values attribute for control #${targetControlId || 'unknown'}. Expected JSON array string, got:`, triggerValuesStr);
        conditionalContainerEl.hide().addClass('corticon-hidden-control');
        return;
    }
    // console.log(`[UpdateVisibility] Expected trigger values:`, triggerValues);

    // --- Get Current Value (Handle Kendo) ---
    let currentValue;
    if (kendoWidget && typeof kendoWidget.value === 'function') {
        currentValue = kendoWidget.value();
        // console.log(`[UpdateVisibility] Got value from Kendo widget (${kendoWidget.options.name}):`, currentValue);
    } else {
        const triggerType = triggerElement.prop('type');
        if (triggerType === 'checkbox') { currentValue = triggerElement.is(':checked') ? 'true' : 'false'; }
        else { currentValue = triggerElement.val(); } // Works for select and text input
        // console.log(`[UpdateVisibility] Got value using jQuery .val() or .is(':checked'):`, currentValue);
    }
    console.log(`[UpdateVisibility] Current value of trigger #${triggerId}:`, currentValue);

    // --- Comparison ---
    let valueMatches = false;
    if (currentValue !== undefined && currentValue !== null) {
        valueMatches = triggerValues.some(tv =>
            String(tv).toLowerCase() === String(currentValue).toLowerCase()
        );
    }
    console.log(`[UpdateVisibility] Does current value match required?`, valueMatches);

    // --- Show/Hide Logic ---
    if (valueMatches) {
        if (!conditionalContainerEl.is(':visible')) {
            console.log(`[UpdateVisibility] Showing element: #${conditionalContainerEl.attr('id')}`);
            conditionalContainerEl.slideDown(200).removeClass('corticon-hidden-control');
        }
    } else {
        if (conditionalContainerEl.is(':visible')) {
            console.log(`[UpdateVisibility] Hiding element: #${conditionalContainerEl.attr('id')}`);
            conditionalContainerEl.slideUp(200, function () { $(this).addClass('corticon-hidden-control'); });
        }
    }
}


function processSwitchLanguage(selectObject) {
    itsCurrentLanguage = selectObject.value;
    // Potentially restart or update UI if language changes mid-form
}

function processClickStart() {
    const baseDynamicUIEl = $('#dynUIContainerId');
    // console.log("Starting Dynamic UI with Input Data:", inputData); // Keep commented unless debugging
    itsStepsController.startDynUI(baseDynamicUIEl, currentDecisionServiceEngine, inputData, itsCurrentLanguage, itsQuestionnaireKey, itsFlagRenderWithKui);
}

function processClickNext() {
    const baseDynamicUIEl = $('#dynUIContainerId');
    itsStepsController.processNextStep(baseDynamicUIEl, currentDecisionServiceEngine, itsCurrentLanguage);
}

function processClickPrev() {
    const baseDynamicUIEl = $('#dynUIContainerId');
    itsStepsController.processPrevStep(baseDynamicUIEl, currentDecisionServiceEngine, itsCurrentLanguage);
}

function saveStateToLocalStorage(key, value) {
    try {
        window.localStorage.setItem(key, value);
    } catch (e) {
        console.warn("Could not save to local storage:", e);
    }
}

function processShowTrace() {
    const traceEl = $('.allTracesContainer');
    traceEl.show();
    $("#hideTraceId").show();
    $("#showTraceId").hide();
    saveStateToLocalStorage('CorticonShowDSTrace', 'true'); // Use string
}

function processHideTrace() {
    const traceEl = $('.allTracesContainer');
    traceEl.hide();
    $("#showTraceId").show();
    $("#hideTraceId").hide();
    saveStateToLocalStorage('CorticonShowDSTrace', 'false'); // Use string
}

function processUseHtml() {
    $("#useHtmlId").hide();
    $("#useKuiId").show();
    saveStateToLocalStorage('CorticonUseKui', 'false'); // Use string
    itsFlagRenderWithKui = false;
    // Potentially re-render or restart if changed mid-form?
}

function processUseKui() {
    $("#useHtmlId").show();
    $("#useKuiId").hide();
    saveStateToLocalStorage('CorticonUseKui', 'true'); // Use string
    itsFlagRenderWithKui = true;
    // Potentially re-render or restart if changed mid-form?
}

function setupInitialInputData() {
    // Define your initial data sets here if they vary per sample
    const inDataEmpty = {}; // Example

    // Ensure the array corresponds to the select options/engines
    allInputData = [
        inDataEmpty, // Index 0
        inDataEmpty, // Index 1
        inDataEmpty, // Index 2
        inDataEmpty, // Index 3
        inDataEmpty, // Index 4
        inDataEmpty, // Index 5
        inDataEmpty, // Index 6
        inDataEmpty, // Index 7
        inDataEmpty  // Index 8 (Crossings)
    ];
    inputData = allInputData[0]; // Default to first one
}

function restoreUIState() {
    const show = window.localStorage.getItem('CorticonShowDSTrace');
    if (show === 'true') processShowTrace();
    else if (show === 'false') processHideTrace();
    // else default (hidden)

    const useKui = window.localStorage.getItem('CorticonUseKui');
    if (useKui === 'true') processUseKui();
    else if (useKui === 'false') processUseHtml();
    // else default (HTML?)

    // Restore selected sample *after* setting up allInputData
    const selectedSample = window.localStorage.getItem('CorticonSelectedSample');
    if (selectedSample !== null && allInputData[selectedSample]) { // Check if index is valid
        const selector = `#sampleSelectId option[value='${selectedSample}']`;
        $(selector).prop('selected', true);
        setDataForCurrentSample(selectedSample);
    } else {
        setDataForCurrentSample('0'); // Default to 0 if nothing stored or invalid
    }
}

// Document Ready - Main Initialization
$(document).ready(function () {
    // Ensure corticonEngines is populated before proceeding
    if (!window.corticonEngines || window.corticonEngines.length === 0) {
        console.error("Corticon Decision Service engine(s) not found. Cannot initialize.");
        $('#dynUIContainerId').html('<div style="color: red; padding: 20px;">Error: Decision Service Engine not loaded.</div>');
        return;
    }
    currentDecisionServiceEngine = window.corticonEngines[0]; // Default engine

    setupInitialInputData();
    itsTracer.setupTracing();
    restoreUIState(); // Restore selections, sets currentDecisionServiceEngine based on stored value

    // --- Event Handlers ---

    // Called AFTER the UI for a step is rendered in the DOM
    corticon.dynForm.addCustomEventHandler(corticon.dynForm.customEvents.AFTER_UI_STEP_RENDERED, (event) => { // [!code focus]
        console.log("AFTER_UI_STEP_RENDERED event caught."); // [!code focus]
        setupConditionalVisibility(); // Set up listeners and check initial state // [!code focus]
    }); // [!code focus]

    // Called BEFORE starting or restarting the form
    corticon.dynForm.addCustomEventHandler(corticon.dynForm.customEvents.BEFORE_START, (event) => { // [!code focus]
        // Clear previous conditional listeners to prevent memory leaks/multiple triggers
        $('#dynUIContainerId').off('change.conditional'); // [!code focus]
        console.log("Cleared conditional visibility listeners before start."); // [!code focus]
    }); // [!code focus]

    corticon.dynForm.addCustomEventHandler(corticon.dynForm.customEvents.AFTER_START, (event) => {
        $("#nextActionId").show();
        $("#startActionId").hide();
        $("#sampleSelectId").prop('disabled', true); // Use prop for disabling
        $("#useHtmlId").hide();
        $("#useKuiId").hide();
        if (event?.theData?.historyEmpty) { // Safely check properties
            $("#prevActionId").hide();
        } else {
            $("#prevActionId").show();
        }
        // setupConditionalVisibility(); // Removed from here, rely on AFTER_UI_STEP_RENDERED
    });

    corticon.dynForm.addCustomEventHandler(corticon.dynForm.customEvents.NEW_STEP, () => {
        $("#prevActionId").show();
    });

    corticon.dynForm.addCustomEventHandler(corticon.dynForm.customEvents.FORM_DONE, () => {
        // May need to hide prev if going directly to a final message
        // $("#prevActionId").hide();
    });

    // When navigating back makes history empty
    corticon.dynForm.addCustomEventHandler(corticon.dynForm.customEvents.HISTORY_STATUS_CHANGED, (event) => {
        if (event?.theData?.historyEmpty) {
            $("#prevActionId").hide();
        } else {
            $("#prevActionId").show();
        }
    });

    corticon.dynForm.addCustomEventHandler(corticon.dynForm.customEvents.BACK_AT_FORM_BEGINNING, () => {
        $("#prevActionId").hide();
    });

    corticon.dynForm.addCustomEventHandler(corticon.dynForm.customEvents.AFTER_DONE, () => {
        $("#nextActionId").hide();
        $("#prevActionId").hide();
        $("#startActionId").show();
        $('#dynUIContainerId').html('<div style="margin: 2em; font-size: larger;">&nbsp;<i class="bi bi-check-circle"></i>All Done</div>');
        $("#sampleSelectId").prop('disabled', false);
        // Restore KUI/HTML buttons based on the flag
        if (itsFlagRenderWithKui)
            $("#useHtmlId").show();
        else
            $("#useKuiId").show();
    });

    // Add event listener for review step display
    corticon.dynForm.addCustomEventHandler(corticon.dynForm.customEvents.REVIEW_STEP_DISPLAYED, (event) => {
        $("#nextActionId").show(); // Keep Next visible to submit
        if (event?.theData?.historyEmpty) {
            $("#prevActionId").hide();
        } else {
            $("#prevActionId").show(); // Allow going back from review
        }
    });

    // Inside the $(document).ready function in clientSetup.js

    corticon.dynForm.addCustomEventHandler(corticon.dynForm.customEvents.DISABLE_NAVIGATION, (event) => {
        $("#nextActionId").hide();
        $("#prevActionId").hide();
        // --- ADD THIS LINE ---
        console.error("DISABLE_NAVIGATION HANDLER invoked unexpectedly!"); // Keep error marker
        console.error("--> Received event object:", event); // Log the whole event object
        console.error(`--> Received event type: "${event.type}"`); // Explicitly log the event type
        console.error("--> Originating stack trace:", new Error().stack); // Keep stack trace        // --- END ADD ---
        console.log("Navigation disabled after submission."); // Keep original log too
    });


}); // End Document Ready