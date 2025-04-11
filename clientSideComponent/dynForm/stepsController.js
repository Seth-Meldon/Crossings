corticon.util.namespace("corticon.dynForm");

// Helper function moved outside the main controller function scope
// for potential reuse or clarity, but could also be inside.
function _createEachTextEntity(outerArray, textFieldArray) {
    const convertedArray = [];
    for (let i = 0; i < outerArray.length; i++) {
        const oneItemAsAnArray = outerArray[i];
        const oneItemAsObjLit = {};
        for (let j = 0; j < oneItemAsAnArray.length; j++) {
            oneItemAsObjLit[textFieldArray[j]] = oneItemAsAnArray[j];
        }
        convertedArray.push(oneItemAsObjLit);
    }
    return convertedArray;
}

// Helper function for expense entity creation
function _createEachExpenseEntity(outerArray, expenseFieldArray) {
    const convertedArray = [];
    for (let i = 0; i < outerArray.length; i++) {
        const oneItemAsAnArray = outerArray[i];
        const oneItemAsObjLit = {};
        // Ensure we have enough fields in the array
        if (oneItemAsAnArray.length !== expenseFieldArray.length) {
            console.warn("Mismatch between expense data and expected fields for item:", oneItemAsAnArray);
            continue; // Skip this malformed item
        }

        for (let j = 0; j < oneItemAsAnArray.length; j++) {
            oneItemAsObjLit[expenseFieldArray[j]] = oneItemAsAnArray[j];
        }

        // Validate and convert amount
        const amountStr = oneItemAsObjLit['amount'];
        const converted = Number(amountStr);
        if ($.isNumeric(converted)) { // Use jQuery's isNumeric for robustness
            oneItemAsObjLit['amount'] = converted;
        } else {
            console.warn(`Invalid amount '${amountStr}' converted to 0 for expense item.`);
            oneItemAsObjLit['amount'] = 0;
        }

        oneItemAsObjLit['id'] = `expense_${i}`;  // Make ID slightly more descriptive

        convertedArray.push(oneItemAsObjLit);
    }
    return convertedArray;
}


corticon.dynForm.StepsController = function () {
    // State variables
    let itsDecisionServiceInput = [{}, {}];
    let itsPathToData;
    let itsFormData;
    let itsFlagAllDone;
    let itsLabelPositionAtUILevel;
    let itsQuestionnaireName;
    let itsInitialLanguage;
    let itsFlagRenderWithKui;
    let progressBarGenerated = false;

    const itsHistory = new corticon.dynForm.History();
    const itsUIControlsRenderer = new corticon.dynForm.UIControlsRenderer();

    // --- Helper Functions defined INSIDE the closure ---

    function _generateProgressBarSteps(containers) {
        const progressBar = $('#progressbar');
        progressBar.empty();

        if (!containers || containers.length === 0) return;

        const stepWidth = (100 / containers.length).toFixed(2);

        containers.forEach((container, index) => {
            const stepText = `${index + 1}. ${container.title || `Step ${index + 1}`}`;
            const listItem = $('<li>').text(stepText);
            listItem.css('width', `${stepWidth}%`);
            listItem.attr('id', `step-${index}`);
            progressBar.append(listItem);
            listItem.addClass(`icon-fa-info`); // Default icon class
        });
        // Apply specific icons via CSS if needed, targeting .icon-fa-* classes
        // Or adjust logic here to set icons based on index/title

        progressBarGenerated = true;
    }

    function _updateProgressBarActiveStep(currentStageNumber) {
        const progressBarItems = $('#progressbar li');
        progressBarItems.removeClass('active');
        if (currentStageNumber >= 0 && currentStageNumber < progressBarItems.length) {
            for (let i = 0; i <= currentStageNumber; i++) {
                $(`#step-${i}`).addClass('active');
            }
        }
    }

    function _saveOneFormData(formDataFieldName, val) {
        console.log("Saving to - path:", itsPathToData, "field:", formDataFieldName, "value:", val);
        if (val === undefined)
            return;

        if (itsFormData === undefined || itsFormData === null) {
            itsFormData = {};
            itsDecisionServiceInput[1] = itsFormData;
            console.log("Initialized itsFormData");
        }

        if (itsPathToData !== undefined && itsPathToData !== null && itsPathToData !== "") {
            if (itsFormData[itsPathToData] === undefined) {
                itsFormData[itsPathToData] = {};
            }
            itsFormData[itsPathToData][formDataFieldName] = val;
        } else {
            itsFormData[formDataFieldName] = val;
        }
        console.log("Saved:", itsFormData);
    }

    function _saveEnteredInputsToFormData(baseEl) { // Definition INSIDE
        if (!baseEl || baseEl.length === 0) {
            console.error("Error: baseEl is null or empty in _saveEnteredInputsToFormData");
            return;
        }
        let allFormEls = baseEl.find('.nonarrayTypeControl :input').not(':checkbox').not('.markerFileUploadExpense');
        console.log("Found", allFormEls.length, "non-array input elements to save");

        allFormEls.each(function (index, item) {
            const oneInputEl = $(item);
            let formDataFieldName = oneInputEl.data("fieldName");
            if (!formDataFieldName) {
                console.error("Error: fieldName is missing for an element:", item); return;
            }
            const val = oneInputEl.val();
            const type = oneInputEl.data("type");

            if (type === "decimal") {
                const converted = Number(val);
                if (isNaN(converted)) { alert(`Value "${val}" in field "${formDataFieldName}" is not a valid number.`); }
                else { _saveOneFormData(formDataFieldName, converted); }
            } else if (type === "datetimetag" || type === "datetag") {
                if (val) {
                    const theDate = new Date(val);
                    if (!isNaN(theDate.getTime())) { // Check if date is valid
                        let theDateISOString;
                        if (type === "datetag") {
                            const tzOffsetMns = theDate.getTimezoneOffset();
                            const utcMs = theDate.getTime() + tzOffsetMns * 60 * 1000;
                            theDateISOString = new Date(utcMs).toISOString();
                        } else {
                            theDateISOString = theDate.toISOString();
                        }
                        _saveOneFormData(formDataFieldName, theDateISOString);
                    } else {
                        console.warn(`Invalid date value "${val}" for field "${formDataFieldName}"`);
                    }
                } else {
                    _saveOneFormData(formDataFieldName, null); // Save null if empty
                }
            } else {
                // Save empty strings as null or handle as needed
                _saveOneFormData(formDataFieldName, (val === "" ? null : val));
                // if (val !== undefined && val !== null && val !== "") {
                //     _saveOneFormData(formDataFieldName, val);
                // } else {
                //     _saveOneFormData(formDataFieldName, null); // Explicitly save null for empty optional fields if desired
                // }
            }
        });

        allFormEls = baseEl.find('.nonarrayTypeControl :checkbox');
        allFormEls.each(function (index, item) {
            const oneInputEl = $(item);
            const formDataFieldName = oneInputEl.data("fieldName");
            if (!formDataFieldName) {
                console.error("Error: fieldName is missing for checkbox:", item); return;
            }
            const val = oneInputEl.is(':checked');
            _saveOneFormData(formDataFieldName, val);
        });

        _saveFileUploadExpenses(baseEl);
    }

    function _saveFileUploadExpenses(baseEl) { // Definition INSIDE
        let allFormEls = baseEl.find('.nonarrayTypeControl .markerFileUploadExpense');
        allFormEls.each(function (index, item) {
            const oneInputEl = $(item);
            const formDataFieldName = oneInputEl.data("fieldName");
            const id = oneInputEl.attr('id'); // Use the input's ID, not the value
            const files = item.files; // Get the FileList

            if (files && files.length > 0) {
                const file = files[0]; // Get the first selected file
                // Store file name or other relevant info. Direct file object storage is complex.
                _saveOneFileUploadExpenseData(formDataFieldName, file.name, id);
            } else {
                _saveOneFileUploadExpenseData(formDataFieldName, null, id); // No file selected
            }
        });
    }

    function _saveOneFileUploadExpenseData(formDataFieldName, fileInfo, elementId) { // Definition INSIDE
        // This function needs to correctly associate the file info with the specific expense item
        // based on the elementId which should correspond to an expense item's ID.
        // This assumes the complex array saving logic correctly adds IDs like 'expense_0', 'expense_1' etc.
        // and the file upload input ID somehow matches or relates to this (e.g., 'expFile_expense_0').
        // This part might need refinement based on how IDs are generated and matched.

        let targetObject;
        if (!itsPathToData) {
            if (!itsFormData) itsFormData = {};
            targetObject = itsFormData;
        } else {
            if (!itsFormData) itsFormData = {};
            if (!itsFormData[itsPathToData]) itsFormData[itsPathToData] = {};
            targetObject = itsFormData[itsPathToData];
        }

        let theExpenses = targetObject[formDataFieldName]; // Assuming fieldName holds the array

        if (!Array.isArray(theExpenses)) {
            console.warn(`Target for file upload expenses '${formDataFieldName}' is not an array.`);
            return; // Or initialize as array if appropriate
        }

        // Extract the expense index/ID from the file input element ID
        // This is a potential point of failure if IDs don't match expectations.
        // Example: if elementId is 'expFile_expense_1', extract 'expense_1'
        const expenseIdMatch = elementId.match(/expense_\d+/); // Adjust regex if ID format differs
        const targetExpenseId = expenseIdMatch ? expenseIdMatch[0] : null;

        if (!targetExpenseId) {
            console.warn(`Could not determine target expense ID from file input ID: ${elementId}`);
            return;
        }


        let found = false;
        for (let i = 0; i < theExpenses.length; i++) {
            const oneExpense = theExpenses[i];
            if (typeof oneExpense === 'object' && oneExpense !== null && oneExpense.id === targetExpenseId) {
                oneExpense['fileUpload'] = fileInfo; // Store file name or info
                found = true;
                break;
            }
        }
        if (!found) {
            console.warn(`Could not find expense with id ${targetExpenseId} to save file upload data.`);
        }
    }

    function _saveArrayElFormData(formDataFieldName, outerArray, path) { // Definition INSIDE
        if (outerArray === undefined) return;
        if (!itsFormData) { itsFormData = {}; itsDecisionServiceInput[1] = itsFormData; }

        let targetObject = itsFormData;
        if (path) {
            if (!itsFormData[path]) itsFormData[path] = {};
            targetObject = itsFormData[path];
        }

        if (outerArray.length > 0) {
            targetObject[formDataFieldName] = outerArray;
        } else {
            delete targetObject[formDataFieldName];
        }
        console.log("Saved Array Data:", itsFormData);
    }

    function _createEachItemEntity(valuesForOneControl, uiControlType) { // Definition INSIDE
        const convertedArray = [];
        let fieldName;
        if (uiControlType === 'Text') fieldName = 'itemText';
        else if (uiControlType === 'Number') fieldName = 'itemNumber';
        else if (uiControlType === 'DateTime') fieldName = 'itemDateTime';
        else { alert('Unsupported simple array type: ' + uiControlType); return convertedArray; }

        for (let i = 0; i < valuesForOneControl.length; i++) {
            const val = valuesForOneControl[i];
            if (val !== undefined && val !== null && val !== "") {
                const oneItemAsObjLit = {};
                let convertedVal = val;
                if (uiControlType === 'Number') {
                    convertedVal = Number(val);
                    if (isNaN(convertedVal)) { console.warn(`Skipping non-numeric value '${val}'`); continue; }
                } else if (uiControlType === 'DateTime') {
                    const theDate = new Date(val);
                    if (!isNaN(theDate.getTime())) { convertedVal = theDate.toISOString(); }
                    else { console.warn(`Skipping invalid date value '${val}'`); continue; }
                }
                oneItemAsObjLit[fieldName] = convertedVal;
                convertedArray.push(oneItemAsObjLit);
            }
        }
        return convertedArray;
    }

    function _getAllSimpleArrayTypeInputsToFormData(baseEl) { // Definition INSIDE
        let controlsGrouped = {};
        let allArrayEls = baseEl.find('.simpleArrayTypeControl');

        allArrayEls.each(function () {
            const oneArrayEl = $(this);
            const uiControlType = oneArrayEl.data("uicontroltype");
            const allFormEls = oneArrayEl.find(':input').not(':checkbox');
            let currentFieldName = null;

            allFormEls.each(function () {
                const oneInputEl = $(this);
                const fieldName = oneInputEl.data("fieldName");
                const val = oneInputEl.val();

                if (fieldName) {
                    currentFieldName = fieldName;
                    if (!controlsGrouped[fieldName]) {
                        controlsGrouped[fieldName] = { fieldName: fieldName, type: uiControlType, values: [] };
                    }
                    if (val !== undefined && val !== null && val !== "") {
                        controlsGrouped[fieldName].values.push(val);
                    }
                } else { console.error("Missing fieldName for input", this); }
            });
        });
        return Object.values(controlsGrouped);
    }

    function _processAllSimpleArrayControls(baseEl) { // Definition INSIDE
        const allSimpleUiControlsOfArrayType = _getAllSimpleArrayTypeInputsToFormData(baseEl);
        allSimpleUiControlsOfArrayType.forEach(controlData => {
            const { fieldName, type, values } = controlData;
            if (['Text', 'Number', 'DateTime'].includes(type)) {
                const convertedArray = _createEachItemEntity(values, type);
                _saveArrayElFormData(fieldName, convertedArray, itsPathToData);
            } else {
                alert('Unsupported simple array type: ' + type);
            }
        });
    }

    function _processAllComplexArrayControls(baseEl, path) { // Definition INSIDE
        let controlsGroupedByTypeAndField = {};

        baseEl.find(".complexArrayTypeControl").each(function () {
            const oneComplexContainer = $(this);
            const uiControlType = oneComplexContainer.data("uicontroltype"); // Type from the container itself
            let currentFieldName = null;
            let innerArray = [];

            oneComplexContainer.find(":input").not(":checkbox").each(function () {
                const oneInputEl = $(this);
                currentFieldName = oneInputEl.data("fieldName"); // Assume consistent fieldName within container
                innerArray.push(oneInputEl.val());
            });

            if (currentFieldName && uiControlType) {
                if (!controlsGroupedByTypeAndField[uiControlType]) {
                    controlsGroupedByTypeAndField[uiControlType] = {};
                }
                if (!controlsGroupedByTypeAndField[uiControlType][currentFieldName]) {
                    controlsGroupedByTypeAndField[uiControlType][currentFieldName] = [];
                }
                // Push the collected values for this instance of the complex control
                if (innerArray.length > 0) {
                    controlsGroupedByTypeAndField[uiControlType][currentFieldName].push(innerArray);
                }
            } else {
                console.error("Missing fieldName or uiControlType for complex array item container", oneComplexContainer);
            }
        });


        // Process grouped data
        for (const uiControlType in controlsGroupedByTypeAndField) {
            for (const fieldName in controlsGroupedByTypeAndField[uiControlType]) {
                const outerArray = controlsGroupedByTypeAndField[uiControlType][fieldName];
                let convertedArray = [];
                if (uiControlType === "MultiExpenses") {
                    const expenseFieldArray = ["expenseCode", "amount", "currency"];
                    convertedArray = _createEachExpenseEntity(outerArray, expenseFieldArray);
                } else if (uiControlType === "MultiText") {
                    const textFieldArray = ["textInput"];
                    convertedArray = _createEachTextEntity(outerArray, textFieldArray);
                } else {
                    alert("Unsupported complex array type: " + uiControlType);
                }
                if (convertedArray.length > 0) {
                    _saveArrayElFormData(fieldName, convertedArray, path);
                }
            }
        }
    }

    function _saveArrayTypeInputsToFormData(baseEl) { // Definition INSIDE
        _processAllSimpleArrayControls(baseEl);
        _processAllComplexArrayControls(baseEl, itsPathToData);
        corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.NEW_FORM_DATA_SAVED, itsFormData);
    }

    async function _processBackgroundData(backgroundData) { // Definition INSIDE
        // ... (keep implementation from previous version) ...
        const url = backgroundData.url;
        const arrayToSet = backgroundData.arrayToSet;
        const arrayToCollection = backgroundData.arrayToCollection;
        const collectionName = backgroundData.collectionName;
        const fieldName1 = backgroundData.fieldName1;
        const labelName1 = backgroundData.labelName1;
        const pathToValue1 = backgroundData.pathToValue1;
        const labelName2 = backgroundData.labelName2;
        const pathToValue2 = backgroundData.pathToValue2;
        const fieldName3 = backgroundData.fieldName3;
        const labelName3 = backgroundData.labelName3;
        const pathToValue3 = backgroundData.pathToValue3;
        const fieldName4 = backgroundData.fieldName4;
        const labelName4 = backgroundData.labelName4;
        const pathToValue4 = backgroundData.pathToValue4;
        const fieldName5 = backgroundData.fieldName5;
        const labelName5 = backgroundData.labelName5;
        const pathToValue5 = backgroundData.pathToValue5;
        const fieldName6 = backgroundData.fieldName6;
        const labelName6 = backgroundData.labelName6;
        const pathToValue6 = backgroundData.pathToValue6;
        const fieldName7 = backgroundData.fieldName7;
        const labelName7 = backgroundData.labelName7;
        const pathToValue7 = backgroundData.pathToVaylue7;
        const fieldName8 = backgroundData.fieldName8;
        const labelName8 = backgroundData.labelName8;
        const pathToValue8 = backgroundData.pathToValue8;
        const fieldName9 = backgroundData.fieldName9;
        const labelName9 = backgroundData.labelName9;
        const pathToValue9 = backgroundData.pathToValue9;
        const fieldName10 = backgroundData.fieldName10;
        const labelName10 = backgroundData.labelName10;
        const pathToValue10 = backgroundData.pathToValue10;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();


            let value;
            if (arrayToSet) {
                value = data.map(item => item[labelName1]).join(', ');
                _saveOneFormData(fieldName1, value); // Save the joined string
            } else if (arrayToCollection) {
                // Check if data is an array before mapping
                if (!Array.isArray(data)) {
                    console.error('Expected an array for arrayToCollection, but received:', data);
                    return; // Or handle appropriately
                }
                value = data.map(item => {
                    const newObj = {};
                    for (let i = 1; i <= 10; i++) {
                        const fieldName = backgroundData[`fieldName${i}`];
                        const labelName = backgroundData[`labelName${i}`];
                        // const pathToValue = backgroundData[`pathToValue${i}`]; // pathToValue might not be needed here if labelName maps directly
                        if (fieldName && labelName && item.hasOwnProperty(labelName)) { // Check if item has the property
                            newObj[fieldName] = item[labelName];
                        }
                    }
                    return newObj;
                });
                _saveOneFormData(collectionName, value); // Save the array of objects
            } else if (fieldName1 && labelName1 && pathToValue1) {
                // Use jsonpath-plus correctly
                const results = JSONPath.JSONPath({ path: pathToValue1, json: data, wrap: false });
                value = results; // Use the first result, or handle multiple/no results
                _saveOneFormData(fieldName1, value); // Save the extracted value
            } else {
                console.warn("Background data configuration doesn't match expected patterns (arrayToSet, arrayToCollection, or single field/label/path).");
            }

        } catch (error) {
            console.error('Error processing background data from URL:', url, error);
        }
    }


    async function _runDecisionService(decisionServiceEngine, payload) { // Definition INSIDE
        try {
            const event = { "input": payload, "stage": payload[0].currentStageNumber };
            corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.BEFORE_DS_EXECUTION, event);

            const configuration = { logLevel: 0 };
            const t1 = performance.now();
            const result = await decisionServiceEngine.execute(payload, configuration);
            const t2 = performance.now();
            const event2 = {
                "output": result,
                "execTimeMs": t2 - t1,
                "stage": payload[0].currentStageNumber
            };

            if (result && result.corticon) { // Check if result and result.corticon exist
                if (result.corticon.status === 'success') {
                    const newStepUI = result.payload && result.payload[0]; // Check payload[0]
                    if (newStepUI && newStepUI.currentStageDescription) { // Check newStepUI
                        event2["stageDescription"] = newStepUI.currentStageDescription;
                    }
                } else {
                    alert('Decision Service Error:\n' + JSON.stringify(result, null, 2));
                }
                corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.NEW_DS_EXECUTION, event2);
            } else {
                // Handle cases where the result structure is unexpected
                console.error('Unexpected result structure from Decision Service:', result);
                alert('Unexpected result structure from Decision Service.');
                // Potentially return an error state or default object
                return { corticon: { status: 'error' }, payload: payload }; // Return original payload on error?
            }
            return result;
        } catch (e) {
            alert('Exception during Decision Service execution: ' + e);
            return { corticon: { status: 'error' }, payload: payload, error: e }; // Return error state
        }
    }


    // --- Main Controller Functions ---

    async function startDynUI(baseDynamicUIEl, decisionServiceEngine, externalData, language, questionnaireName, useKui) {
        itsFlagRenderWithKui = useKui;
        itsQuestionnaireName = questionnaireName;
        itsInitialLanguage = language;
        itsHistory.setupHistory();
        progressBarGenerated = false;

        const restartData = getRestartData(questionnaireName);
        if (restartData === null) {
            setStateForStartFromBeginning(language, externalData || {}); // Ensure externalData is an object
        } else {
            const dialog = confirm("Do you want to start from where you left last time?");
            if (dialog) {
                setStateFromRestartData(questionnaireName, restartData);
            } else {
                clearRestartData(questionnaireName);
                setStateForStartFromBeginning(language, externalData || {});
            }
        }

        corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.BEFORE_START);
        await _askDecisionServiceForNextUIElementsAndRender(decisionServiceEngine, itsDecisionServiceInput, baseDynamicUIEl);
        corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.AFTER_START, { historyEmpty: itsHistory.isHistoryEmpty() });
    }

    async function processNextStep(baseDynamicUIEl, decisionServiceEngine, language, saveInputToFormData = true) {
        if (saveInputToFormData) {
            if (!validateForm(baseDynamicUIEl)) {
                return;
            }
            // *** Ensure these functions are called correctly ***
            _saveEnteredInputsToFormData(baseDynamicUIEl); // Save non-array inputs
            _saveArrayTypeInputsToFormData(baseDynamicUIEl); // Save array inputs
        }

        corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.NEW_STEP);

        if (itsFlagAllDone) {
            handleFormCompletion();
        } else {
            await handleDecisionServiceStep(decisionServiceEngine, baseDynamicUIEl);
        }
    }

    async function processPrevStep(baseDynamicUIEl, decisionServiceEngine, language) {
        if (itsFlagAllDone) return;

        const allData = itsHistory.getPreviousStageData();
        if (allData === undefined) return;

        const prevStageNbr = allData['stage'];
        itsDecisionServiceInput = allData['input'];
        // Ensure itsFormData is correctly restored from the input payload
        itsFormData = itsDecisionServiceInput[1] || {};
        itsDecisionServiceInput[0].nextStageNumber = prevStageNbr; // This seems wrong, should likely just set currentStageNumber
        itsDecisionServiceInput[0].currentStageNumber = prevStageNbr; // Set current stage for rendering
        delete itsDecisionServiceInput[0].nextStageNumber; // Clean up if necessary


        progressBarGenerated = true; // Don't regenerate progress bar
        await processNextStep(baseDynamicUIEl, decisionServiceEngine, language, false); // Pass false to prevent re-saving

        if (prevStageNbr === 0)
            corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.BACK_AT_FORM_BEGINNING);
    }


    function setStateForStartFromBeginning(language, externalData) {
        _resetDecisionServiceInput(language);
        // itsFormData = null; // Let it be initialized by _saveOneFormData if needed
        itsFlagAllDone = false;
        itsPathToData = null;
        itsLabelPositionAtUILevel = "Above";
        progressBarGenerated = false;

        try {
            if (typeof externalData !== 'object' || externalData === null) {
                console.warn("externalData is not an object, initializing payload[1] to {}");
                externalData = {};
            }
            // Deep copy externalData only if it's a valid object
            itsDecisionServiceInput[1] = JSON.parse(JSON.stringify(externalData));
            itsFormData = itsDecisionServiceInput[1]; // Initialize itsFormData

        } catch (error) {
            console.error("Error processing externalData:", error);
            itsDecisionServiceInput[1] = {}; // Fallback to empty object on error
            itsFormData = itsDecisionServiceInput[1];
        }
        console.log("Initialized state:", itsDecisionServiceInput);
    }

    // ... (setStateFromRestartData, getRestartHistory, setStateFromStepData - mostly unchanged) ...

    // ... (handleFormCompletion, handleDecisionServiceStep - mostly unchanged) ...

    function clearRestartData(decisionServiceName) {
        window.localStorage.removeItem('CorticonRestartPayload_' + decisionServiceName);
        window.localStorage.removeItem('CorticonRestartPathToData_' + decisionServiceName);
        window.localStorage.removeItem('CorticonRestartHistory_' + decisionServiceName);
    }

    function saveRestartData(decisionServiceName, payload) {
        try {
            window.localStorage.setItem('CorticonRestartPayload_' + decisionServiceName, payload);
            window.localStorage.setItem('CorticonRestartPathToData_' + decisionServiceName, itsPathToData);
            window.localStorage.setItem('CorticonRestartHistory_' + decisionServiceName, itsHistory.getRestartHistory());
        } catch (e) { console.error("Failed to save restart data:", e); }
    }

    function getRestartData(decisionServiceName) {
        const payload = window.localStorage.getItem('CorticonRestartPayload_' + decisionServiceName);
        try { return payload ? JSON.parse(payload) : null; }
        catch (e) { console.error("Failed to parse restart data:", e); return null; }
    }

    function getPathToData(decisionServiceName) {
        return window.localStorage.getItem('CorticonRestartPathToData_' + decisionServiceName) || null; // Return null if not found
    }


    function _resetDecisionServiceInput(language) {
        _preparePayloadForNextStage(0, language);
        itsDecisionServiceInput[1] = {}; // Ensure second element is reset
        itsFormData = itsDecisionServiceInput[1]; // Sync itsFormData
    }

    function _preparePayloadForNextStage(currentStage, language) { // Renamed arg for clarity
        const nextPayload = {};
        const stateProperties = ['stageOnExit', 'language', 'labelPosition', 'pathToData'];

        // Copy existing state properties carefully
        if (itsDecisionServiceInput && itsDecisionServiceInput[0]) {
            stateProperties.forEach(prop => {
                if (itsDecisionServiceInput[0][prop] !== undefined) {
                    nextPayload[prop] = itsDecisionServiceInput[0][prop];
                }
            });
        }

        nextPayload.currentStageNumber = currentStage;

        if (language) {
            nextPayload['language'] = language;
        } else if (!nextPayload['language'] && itsInitialLanguage) {
            // Persist initial language if none set by DS
            nextPayload['language'] = itsInitialLanguage;
        }

        // Ensure itsDecisionServiceInput[0] exists before assigning
        if (!itsDecisionServiceInput[0]) {
            itsDecisionServiceInput[0] = {};
        }
        itsDecisionServiceInput[0] = nextPayload;
        // DO NOT reset itsDecisionServiceInput[1] here; it holds form data
    }

    // ... (_processLabelPositionSetting remains unchanged) ...
    function _processLabelPositionSetting(newLabelPosition) {
        if (newLabelPosition !== undefined && newLabelPosition !== null)
            itsLabelPositionAtUILevel = newLabelPosition;
    }


    async function _askDecisionServiceForNextUIElementsAndRender(decisionServiceEngine, payload, baseEl) {
        const result = await _runDecisionService(decisionServiceEngine, payload);

        if (!result || !result.corticon || result.corticon.status !== 'success') {
            console.error("Decision service execution failed.");
            // Decide how to handle failure - maybe stop? Show error?
            // For now, just return an object indicating failure/end
            return { done: true, error: true };
        }

        // Ensure payload[0] and payload[1] exist in the result
        const nextUI = result.payload && result.payload[0] ? result.payload[0] : {};
        const returnedData = result.payload && result.payload[1] ? result.payload[1] : {};

        // Update path and label position from the UI model
        if (nextUI.pathToData) itsPathToData = nextUI.pathToData;
        _processLabelPositionSetting(nextUI.labelPosition);

        // *** CRITICAL: Update itsFormData with the data returned from the Decision Service ***
        // This merges returned data with potentially existing data.
        // Be careful if the DS intends to *replace* data vs. augmenting it.
        // A simple merge might be: itsFormData = { ...(itsFormData || {}), ...returnedData };
        // Or, if the DS always returns the *complete* data state:
        itsFormData = returnedData || {}; // Use returned data, fallback to empty
        itsDecisionServiceInput[1] = itsFormData; // Update the payload


        // Process background data if specified
        if (Array.isArray(nextUI.backgroundData)) {
            for (const bgData of nextUI.backgroundData) {
                await _processBackgroundData(bgData);
            }
        }

        // Check if UI rendering should be skipped
        if (nextUI.noUiToRenderContinue) {
            if (!progressBarGenerated && nextUI.containers && nextUI.containers.length > 0) {
                _generateProgressBarSteps(nextUI.containers); // Generate if needed even if not rendering this step's UI
            }
            _updateProgressBarActiveStep(payload[0].currentStageNumber); // Update progress bar
            return nextUI; // Continue to next step processing
        }

        const containers = nextUI.containers;
        if (!Array.isArray(containers)) { // Check if containers is an array
            console.error('Error: Decision service response missing valid containers array.');
            _updateProgressBarActiveStep(payload[0].currentStageNumber); // Update progress bar
            return { done: true, error: true }; // Indicate error
        }

        // Generate progress bar if first time with containers
        if (!progressBarGenerated && containers.length > 0) {
            _generateProgressBarSteps(containers);
        }

        // Render UI and update progress bar
        itsUIControlsRenderer.renderUI(containers, baseEl, itsLabelPositionAtUILevel, nextUI.language, itsFlagRenderWithKui);
        _updateProgressBarActiveStep(payload[0].currentStageNumber);

        // Raise event after rendering
        corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.AFTER_UI_STEP_RENDERED, { input: payload, stage: payload[0].currentStageNumber });

        return nextUI;
    }

    // --- Public Interface ---
    return {
        startDynUI: startDynUI,
        processNextStep: processNextStep,
        processPrevStep: processPrevStep
    };

}; // End of StepsController definition