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
 * Should be called after a step's UI is rendered.
 */
function setupConditionalVisibility() {
    const uiContainer = $('#dynUIContainerId');

    // Remove previous listener to avoid duplicates (optional but safer)
    uiContainer.off('change.conditional');

    // Attach delegated listener for changes on inputs, selects
    uiContainer.on('change.conditional', ':input', function () {
        const changedElement = $(this);
        const triggerId = changedElement.attr('id'); // ID of the element that changed

        if (triggerId) {
            // Find controls triggered by this specific element's ID
            // Use the container ID in the selector for robustness
            $(`#dynUIContainerId [data-triggered-by='${triggerId}']`).each(function () {
                updateConditionalVisibility($(this));
            });
        }
    });

    // Initial check for all conditional controls on load
    // Use the container ID in the selector for robustness
    $('#dynUIContainerId [data-is-conditional="true"]').each(function () {
        updateConditionalVisibility($(this));
    });

    console.log("Conditional visibility setup complete.");
}

/**
 * Checks the trigger condition and shows/hides a single conditional control container.
 * @param {Object} conditionalContainerEl - The jQuery object for the dependent control's container div.
 */
function updateConditionalVisibility(conditionalContainerEl) {
    const triggerId = conditionalContainerEl.data('triggeredBy');
    const triggerValuesStr = conditionalContainerEl.data('triggerValue'); // This is a JSON string array
    const targetControlId = conditionalContainerEl.data('targetControlId'); // Get the target's own ID

    if (!triggerId || triggerValuesStr === undefined) {
        // console.warn(`Conditional control container missing trigger data:`, conditionalContainerEl); // Keep commented unless debugging
        return;
    }

    // Use the trigger ID to find the triggering element *within the current UI container*
    const triggerElement = $(`#${triggerId}`); // Use the stored ID

    if (triggerElement.length === 0) {
        // console.warn(`Trigger element with ID #${triggerId} not found for conditional control #${targetControlId || 'unknown'}`); // Keep commented unless debugging
        // Keep it hidden if the trigger isn't found (might be on a different step)
        conditionalContainerEl.hide().addClass('corticon-hidden-control'); // Ensure class is added if hiding
        return;
    }

    // Parse the expected trigger values (it's stored as a JSON string array)
    let triggerValues;
    try {
        triggerValues = JSON.parse(triggerValuesStr);
        if (!Array.isArray(triggerValues)) throw new Error("Not an array");
    } catch (e) {
        console.error(`Could not parse trigger values for control #${targetControlId || 'unknown'}. Expected JSON array string, got:`, triggerValuesStr);
        conditionalContainerEl.hide().addClass('corticon-hidden-control');
        return;
    }


    let currentValue;
    const triggerType = triggerElement.prop('type');

    // Get current value depending on trigger element type
    if (triggerType === 'checkbox') {
        currentValue = triggerElement.is(':checked') ? 'true' : 'false'; // Use string 'true'/'false'
    } else if (triggerElement.is('select')) {
        currentValue = triggerElement.val();
        // Handle multi-select case if needed
        // if (triggerElement.prop('multiple')) { currentValue = triggerElement.val() || []; } // Ensure array
    } else { // Default to text input types
        currentValue = triggerElement.val();
    }

    // Check if the currentValue matches any of the required triggerValues
    // Handle both single value and array for multi-select trigger (if implemented later)
    let valueMatches = false;
    if (Array.isArray(currentValue)) { // Handle trigger being a multi-select
        valueMatches = currentValue.some(cv =>
            triggerValues.some(tv => String(tv).toLowerCase() === String(cv).toLowerCase())
        );
    } else { // Handle single value trigger
        valueMatches = triggerValues.some(tv =>
            String(tv).toLowerCase() === String(currentValue).toLowerCase()
        );
    }


    // Show or hide the dependent control's container
    if (valueMatches) {
        conditionalContainerEl.slideDown(200).removeClass('corticon-hidden-control'); // Animate showing
        // console.log(`Showing conditional control: #${conditionalContainerEl.attr('id')} triggered by #${triggerId} (value: ${currentValue})`); // Keep commented unless debugging
    } else {
        conditionalContainerEl.slideUp(200, function () { $(this).addClass('corticon-hidden-control'); }); // Add class after animation
        // console.log(`Hiding conditional control: #${conditionalContainerEl.attr('id')} triggered by #${triggerId} (value: ${currentValue})`); // Keep commented unless debugging
        // Optional: Clear the value of the hidden control?
        // conditionalContainerEl.find(':input').val('').trigger('change'); // Clear and trigger change if needed
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

    // Add event listener for disabling nav after submission
    corticon.dynForm.addCustomEventHandler(corticon.dynForm.customEvents.DISABLE_NAVIGATION, (event) => {
        $("#nextActionId").hide();
        $("#prevActionId").hide();
        console.log("Navigation disabled after submission.");
    });


}); // End Document Ready