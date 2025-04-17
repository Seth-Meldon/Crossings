"use strict"; // Added for best practices

corticon.util.namespace("corticon.dynForm");

// Helper function (can be outside if preferred, ensure it's accessible)
function _createEachTextEntity(outerArray, textFieldArray) {
    const convertedArray = [];
    if (!Array.isArray(outerArray) || !Array.isArray(textFieldArray)) {
        console.error("Invalid input for _createEachTextEntity: Inputs must be arrays.");
        return convertedArray; // Return empty array for invalid input
    }
    // The main logic (for loop) should be OUTSIDE the 'if' block.
    for (let i = 0; i < outerArray.length; i++) {
        const oneItemAsAnArray = outerArray[i];
        const oneItemAsObjLit = {};
        if (Array.isArray(oneItemAsAnArray)) {
            const len = Math.min(oneItemAsAnArray.length, textFieldArray.length);
            for (let j = 0; j < len; j++) {
                if (textFieldArray[j]) {
                    oneItemAsObjLit[textFieldArray[j]] = oneItemAsAnArray[j];
                } else {
                    console.warn(`_createEachTextEntity: Missing field name at index ${j}`);
                }
            }
            if (oneItemAsAnArray.length !== textFieldArray.length) {
                console.warn(`_createEachTextEntity: Array lengths mismatch for item at index ${i}. Expected ${textFieldArray.length}, got ${oneItemAsAnArray.length}`);
            }
            convertedArray.push(oneItemAsObjLit);
        } else {
            console.warn(`_createEachTextEntity: Item at index ${i} is not an array:`, oneItemAsAnArray);
        }
    }
    return convertedArray;
} // Final return with the processed array    


// Helper function (can be outside if preferred, ensure it's accessible)
function _createEachExpenseEntity(outerArray, expenseFieldArray) {
    const convertedArray = [];
    if (!Array.isArray(outerArray) || !Array.isArray(expenseFieldArray)) {
        console.error("Invalid input for _createEachExpenseEntity: Inputs must be arrays.");
        return convertedArray;
    } // Return empty array for invalid input

    // The main logic (for loop) should be OUTSIDE the 'if' block.
    for (let i = 0; i < outerArray.length; i++) {
        const oneItemAsAnArray = outerArray[i];
        const oneItemAsObjLit = {};
        if (Array.isArray(oneItemAsAnArray)) {
            const len = Math.min(oneItemAsAnArray.length, expenseFieldArray.length);
            for (let j = 0; j < len; j++) {
                if (expenseFieldArray[j]) {
                    oneItemAsObjLit[expenseFieldArray[j]] = oneItemAsAnArray[j];
                } else {
                    console.warn(`_createEachExpenseEntity: Missing field name at index ${j}`);
                }
            }
            if (oneItemAsAnArray.length !== expenseFieldArray.length) {
                console.warn(`_createEachExpenseEntity: Array lengths mismatch for item at index ${i}. Expected ${expenseFieldArray.length}, got ${oneItemAsAnArray.length}`);
            }

            // Specific conversion for 'amount'
            if (oneItemAsObjLit.hasOwnProperty('amount')) {
                const converted = Number(oneItemAsObjLit['amount']);
                if (!isNaN(converted)) {
                    oneItemAsObjLit['amount'] = converted;
                } else {
                    console.warn(`_createEachExpenseEntity: Invalid number for amount at index ${i}. Setting to 0.`);
                    oneItemAsObjLit['amount'] = 0;
                }
            }

            oneItemAsObjLit['id'] = '' + i; // Add a unique id
            convertedArray.push(oneItemAsObjLit);
        } else {
            console.warn(`_createEachExpenseEntity: Item at index ${i} is not an array:`, oneItemAsAnArray);
        }
    } return convertedArray;
}


corticon.dynForm.StepsController = function () {
    // State variables
    let itsDecisionServiceInput = [{}, {}]; // [0] = Control/Meta Data, [1] = Form Data
    let itsPathToData = null; // Path within itsDecisionServiceInput[1] where form data is nested
    let itsFormData = {}; // Reference to the actual form data object (itsDecisionServiceInput[1] or a nested object)
    let itsFlagAllDone = false;
    let itsFlagReportRequested = false;
    let itsLabelPositionAtUILevel = "Above"; // Default label position
    let itsQuestionnaireName = null;
    let itsInitialLanguage = null;
    let itsFlagRenderWithKui = false; // Kendo UI flag
    let isReviewStepDisplayed = false; // Add this line

    const itsHistory = new corticon.dynForm.History();
    const itsUIControlsRenderer = new corticon.dynForm.UIControlsRenderer();


    /**
     * Saves a single piece of data (string, number, boolean, or object) into the form data state.
     * Handles nesting based on itsPathToData.
     * @param {String} formDataFieldName - The key/name of the field to save.
     * @param {*} val - The value to save. Can be any type, including an object for Geolocation.
     */
    function _saveOneFormData(formDataFieldName, val) {
        console.log(`Saving to - path: ${itsPathToData}, field: ${formDataFieldName}, value:`, val);
        if (val === undefined || formDataFieldName === undefined || formDataFieldName === null) {
            console.warn("Attempted to save undefined value or fieldName:", { fieldName: formDataFieldName, value: val });
            return; // Don't save undefined value or if fieldName is missing
        }

        let targetObject;
        // Determine the target object based on itsPathToData
        if (itsPathToData !== undefined && itsPathToData !== null && itsPathToData !== "") {
            if (itsDecisionServiceInput[1][itsPathToData] === undefined) {
                console.log(`Initializing path: ${itsPathToData}`);
                itsDecisionServiceInput[1][itsPathToData] = {}; // Initialize if path doesn't exist
            } else if (typeof itsDecisionServiceInput[1][itsPathToData] !== 'object' || itsDecisionServiceInput[1][itsPathToData] === null) {
                console.warn(`Path ${itsPathToData} exists but is not an object. Overwriting.`);
                itsDecisionServiceInput[1][itsPathToData] = {};
            }
            targetObject = itsDecisionServiceInput[1][itsPathToData];
        } else {
            targetObject = itsDecisionServiceInput[1]; // Save at the root level
        }

        // Save the value (which could be a string, number, boolean, or OBJECT)
        targetObject[formDataFieldName] = val;

        // Update the itsFormData reference AFTER modifying itsDecisionServiceInput[1]
        itsFormData = itsDecisionServiceInput[1];

        console.log("Saved Data State:", JSON.stringify(itsFormData, null, 2)); // Log the updated state
    }


    /**
    * Saves array data (simple or complex) into the form data state.
    * Handles nesting based on itsPathToData.
    * @param {String} formDataFieldName - The key/name of the field to save the array under.
    * @param {Array} outerArray - The array of objects to save.
    */
    function _saveArrayElFormData(formDataFieldName, outerArray) {
        console.log(`Saving array to - path: ${itsPathToData}, field: ${formDataFieldName}, array:`, outerArray);
        if (outerArray === undefined || !Array.isArray(outerArray) || formDataFieldName === undefined || formDataFieldName === null) {
            console.warn("Attempted to save invalid array data:", { fieldName: formDataFieldName, array: outerArray });
            return; // Don't save undefined, non-arrays, or if fieldName is missing
        }

        let targetObject;
        // Determine the target object based on itsPathToData
        if (itsPathToData !== undefined && itsPathToData !== null && itsPathToData !== "") {
            if (itsDecisionServiceInput[1][itsPathToData] === undefined) {
                console.log(`Initializing path: ${itsPathToData}`);
                itsDecisionServiceInput[1][itsPathToData] = {}; // Initialize if path doesn't exist
            } else if (typeof itsDecisionServiceInput[1][itsPathToData] !== 'object' || itsDecisionServiceInput[1][itsPathToData] === null) {
                console.warn(`Path ${itsPathToData} exists but is not an object. Overwriting.`);
                itsDecisionServiceInput[1][itsPathToData] = {};
            }
            targetObject = itsDecisionServiceInput[1][itsPathToData];
        } else {
            targetObject = itsDecisionServiceInput[1]; // Save at the root level
        }

        // Save the array
        targetObject[formDataFieldName] = outerArray;

        // Update the itsFormData reference AFTER modifying itsDecisionServiceInput[1]
        itsFormData = itsDecisionServiceInput[1];

        console.log("Saved Array Data State:", JSON.stringify(itsFormData, null, 2));
    }


    /**
     * Processes all simple array-type controls (Text, Number, DateTime arrays) found in the base element.
     * @param {Object} baseEl - The jQuery object representing the container for the current step's UI.
     */
    function _processAllSimpleArrayControls(baseEl) {
        const allSimpleUiControlsOfArrayType = _getAllSimpleArrayTypeInputs(baseEl);

        for (let j = 0; j < allSimpleUiControlsOfArrayType.length; j++) {
            const oneControlData = allSimpleUiControlsOfArrayType[j];
            const uiControlType = oneControlData['type'];
            const formDataFieldName = oneControlData['fieldName'];
            const valuesForOneControl = oneControlData['values'];
            if (uiControlType === 'Text' || uiControlType === 'Number' || uiControlType === 'DateTime') {
                const convertedArray = _createEachItemEntity(valuesForOneControl, uiControlType);
                if (convertedArray.length > 0) { // Only save if there's data
                    _saveArrayElFormData(formDataFieldName, convertedArray);
                }
            } else {
                console.warn('This simple array type is not yet supported for saving: ' + uiControlType);
            }
        }
    }


    /**
     * Gathers data from all simple array-type controls within the base element.
     * @param {Object} baseEl - The jQuery object representing the container for the current step's UI.
     * @returns {Array} - An array of objects, each containing fieldName, type, and values for one simple array control.
     */
    function _getAllSimpleArrayTypeInputs(baseEl) {
        let allUiControlsOfArrayType = [];
        let groupedControls = {}; // Group inputs by fieldName

        let allArrayControlContainers = baseEl.find('.simpleArrayTypeControl'); // Find the containers

        allArrayControlContainers.each(function (index, container) {
            const containerEl = $(container);
            const uiControlType = containerEl.data("uicontroltype");
            const allFormEls = containerEl.find(':input:not(:checkbox)'); // Find inputs within *this* container

            allFormEls.each(function (inputIndex, inputItem) {
                const oneInputEl = $(inputItem);
                const formDataFieldName = oneInputEl.data("fieldName");
                const val = oneInputEl.val();

                if (formDataFieldName) {
                    if (!groupedControls[formDataFieldName]) {
                        groupedControls[formDataFieldName] = {
                            fieldName: formDataFieldName,
                            type: uiControlType, // Assume type is consistent for a fieldName
                            values: []
                        };
                    }
                    // Only add non-empty values, maybe? Or let DS handle validation.
                    if (val !== undefined && val !== null && val !== "") {
                        groupedControls[formDataFieldName].values.push(val);
                    }
                } else {
                    console.warn("Simple array input missing fieldName:", inputItem);
                }
            });
        });

        // Convert grouped controls object back to an array
        for (const fieldName in groupedControls) {
            if (groupedControls.hasOwnProperty(fieldName)) {
                allUiControlsOfArrayType.push(groupedControls[fieldName]);
            }
        }

        console.log("Grouped Simple Array Inputs:", allUiControlsOfArrayType);
        return allUiControlsOfArrayType;

    }

    /**
    * Creates an array of objects for simple array types (Text, Number, DateTime).
    * Each object has a key like 'itemText', 'itemNumber', or 'itemDateTime'.
    * @param {Array} valuesForOneControl - Array of raw string values from the inputs.
    * @param {String} uiControlType - The type of the control ('Text', 'Number', 'DateTime').
    * @returns {Array} - Array of objects, e.g., [{itemText: 'value1'}, {itemText: 'value2'}].
    */
    function _createEachItemEntity(valuesForOneControl, uiControlType) {
        const convertedArray = [];
        let fieldName;

        switch (uiControlType) {
            case 'Text':
                fieldName = 'itemText';
                break;
            case 'Number':
                fieldName = 'itemNumber';
                break;
            case 'DateTime':
                fieldName = 'itemDateTime';
                break;
            default:
                console.error('Unsupported uiControl type for simple array entity creation: ' + uiControlType);
                return convertedArray; // Return empty array if type is unsupported
        }

        for (let i = 0; i < valuesForOneControl.length; i++) {
            const val = valuesForOneControl[i];
            if (val !== undefined && val !== null && val !== "") { // Only process non-empty values
                const oneItemAsObjLit = {};
                // Potentially add type conversion here if needed (e.g., for Number, DateTime)
                if (uiControlType === 'Number') {
                    const numVal = Number(val);
                    oneItemAsObjLit[fieldName] = isNaN(numVal) ? null : numVal; // Store null if not a valid number
                } else if (uiControlType === 'DateTime') {
                    // Assuming DateTime needs ISO string conversion similar to non-array dates
                    try {
                        const theDate = new Date(val);
                        if (!isNaN(theDate.getTime())) { // Check if date is valid
                            // Decide if UTC conversion is needed like in _saveEnteredInputsToFormData
                            oneItemAsObjLit[fieldName] = theDate.toISOString();
                        } else {
                            oneItemAsObjLit[fieldName] = null; // Store null if date is invalid
                        }
                    } catch (e) {
                        console.warn("Error parsing date for simple array:", val, e);
                        oneItemAsObjLit[fieldName] = null;
                    }
                }
                else { // Text
                    oneItemAsObjLit[fieldName] = val;
                }

                // Only push if the value is not null (or handle nulls as needed by DS)
                if (oneItemAsObjLit[fieldName] !== null) {
                    convertedArray.push(oneItemAsObjLit);
                }
            }
        }
        console.log(`Converted simple array for ${fieldName}:`, convertedArray);
        return convertedArray;
    }


    /**
     * Processes all complex array-type controls (MultiExpenses, MultiText) found in the base element.
     * @param {Object} baseEl - The jQuery object representing the container for the current step's UI.
     */
    function _processAllComplexArrayControls(baseEl) {
        let groupedComplexControls = {}; // Group by fieldName

        // Find containers for complex array controls
        let allComplexArrayContainers = baseEl.find(".complexArrayTypeControl");

        allComplexArrayContainers.each(function (index, container) {
            const containerEl = $(container);
            // The uicontroltype should ideally be on the container added by the renderer
            const uiControlType = containerEl.data("uicontroltype");
            let currentFieldName = null; // Track fieldName for this container

            // Find all input/select elements *within this specific container*
            let allFormEls = containerEl.find(":input:not(:checkbox)");
            let innerArray = [];

            allFormEls.each(function (inputIndex, inputItem) {
                const oneInputEl = $(inputItem);
                // All inputs within a complex array item should ideally share the same fieldName
                const fieldName = oneInputEl.data("fieldName");
                if (!currentFieldName && fieldName) {
                    currentFieldName = fieldName; // Latch onto the first fieldName found
                } else if (fieldName && currentFieldName !== fieldName) {
                    // This might indicate a structure issue if fieldNames differ within one item container
                    console.warn(`Inconsistent fieldName within complex array container ${index}. Expected ${currentFieldName}, found ${fieldName}.`);
                }
                const val = oneInputEl.val();
                innerArray.push(val);
            });


            if (currentFieldName && innerArray.length > 0) {
                if (!groupedComplexControls[currentFieldName]) {
                    groupedComplexControls[currentFieldName] = {
                        fieldName: currentFieldName,
                        type: uiControlType, // Assume type is consistent for the fieldName
                        outerArray: []
                    };
                }
                groupedComplexControls[currentFieldName].outerArray.push(innerArray);

            } else if (innerArray.length > 0) {
                console.warn("Complex array container found with inputs but no fieldName:", container);
            }
        });


        // Now process the grouped data
        for (const fieldName in groupedComplexControls) {
            if (groupedComplexControls.hasOwnProperty(fieldName)) {
                const controlData = groupedComplexControls[fieldName];
                const outerArray = controlData.outerArray;
                const uiControlType = controlData.type;
                let convertedArray;

                if (uiControlType === "MultiExpenses") {
                    const expenseFieldArray = ["expenseCode", "amount", "currency"]; // Define the expected order/names
                    convertedArray = _createEachExpenseEntity(outerArray, expenseFieldArray);
                } else if (uiControlType === "MultiText") {
                    const textFieldArray = ["textInput"]; // Define the expected order/names
                    convertedArray = _createEachTextEntity(outerArray, textFieldArray);
                } else {
                    console.warn("This complex array type is not yet supported for saving: " + uiControlType);
                    continue; // Skip to next fieldName
                }

                if (convertedArray && convertedArray.length > 0) { // Only save if conversion successful and has data
                    _saveArrayElFormData(fieldName, convertedArray);
                }
            }
        }
    }


    /**
     * Saves data entered in non-array input fields (Text, Number, DateTime, YesNo, Geolocation, Checkboxes)
     * to the form data state.
     * @param {Object} baseEl - The jQuery object representing the container for the current step's UI.
     */
    function _saveNonArrayInputsToFormData(baseEl) {
        if (!baseEl || baseEl.length === 0) {
            console.error("Error: baseEl is null or empty in _saveNonArrayInputsToFormData");
            return;
        }

        // Find relevant inputs within containers marked as non-array controls
        let allFormEls = baseEl.find('.nonarrayTypeControl :input').not('.markerFileUploadExpense'); // Select inputs/selects/textareas

        allFormEls.each(function (index, item) {
            const oneInputEl = $(item);
            const tagName = oneInputEl.prop("tagName").toLowerCase();
            const inputType = oneInputEl.prop("type").toLowerCase();
            const isCheckbox = inputType === 'checkbox';
            const isSelect = tagName === 'select';

            let formDataFieldName = oneInputEl.data("fieldName");
            const uiControlType = oneInputEl.data("uicontroltype"); // Get potential specific type

            // --- Geolocation Handling ---
            if (uiControlType === "Geolocation") {
                const locationData = oneInputEl.data('geolocationData'); // Get stored object
                if (locationData && formDataFieldName) {
                    _saveOneFormData(formDataFieldName, locationData); // Save the whole object
                } else if (!locationData && formDataFieldName) {
                    // Handle case where input might have text but no valid selection was made
                    // Maybe save the raw text? Or null? Depends on requirements.
                    console.warn(`Geolocation field '${formDataFieldName}' has no structured data. Saving null.`);
                    _saveOneFormData(formDataFieldName, null); // Save null if no valid place selected
                }
                return true; // Continue to the next element
            }
            // --- END Geolocation Handling ---

            // Skip if fieldName is missing (already handled Geolocation)
            if (!formDataFieldName) {
                // Avoid logging for every label or element without fieldName
                // console.warn("Input element missing fieldName:", item);
                return true; // Skip this element
            }

            // --- Handle Checkboxes ---
            if (isCheckbox) {
                const val = oneInputEl.is(':checked');
                _saveOneFormData(formDataFieldName, val);
                return true; // Continue to next element
            }

            // --- Handle Other Inputs (Text, Number, Date, Select) ---
            const val = oneInputEl.val();
            const dataType = oneInputEl.data("type"); // Get specific type if set (e.g., decimal, datetag)

            if (dataType === "decimal" || dataType === "rating" || dataType === "number") { // Includes Number, Rating
                const converted = Number(val);
                if (isNaN(converted)) {
                    console.warn(`Value "${val}" in field "${formDataFieldName}" is not a valid number. Saving null.`);
                    _saveOneFormData(formDataFieldName, null); // Or handle as error / default value
                } else {
                    _saveOneFormData(formDataFieldName, converted);
                }
            } else if (dataType === "datetimetag" || dataType === "datetag") {
                if (val !== undefined && val !== null && val !== "") {
                    try {
                        const theDate = new Date(val);
                        if (isNaN(theDate.getTime())) { // Check if date is valid
                            console.warn(`Invalid date value "${val}" for field "${formDataFieldName}". Saving null.`);
                            _saveOneFormData(formDataFieldName, null);
                        } else {
                            let theDateISOString;
                            // Handle potential UTC conversion for 'date' only inputs
                            if (dataType === "datetag") {
                                // Convert local date input to UTC date midnight representation
                                const tzOffsetMns = theDate.getTimezoneOffset();
                                const localMs = theDate.getTime();
                                // Important: Avoid adding offset if date was already UTC midnight e.g. from DatePicker
                                // This simple addition might be incorrect depending on exact widget behavior.
                                // A safer approach might be to get year, month, day and construct UTC date.
                                // const utcMs = localMs + tzOffsetMns * 60 * 1000; // This assumes input is local time
                                // const utcDate = new Date(utcMs);
                                // theDateISOString = utcDate.toISOString();

                                // Alternative: Just format as YYYY-MM-DD (might be sufficient if DS expects date only)
                                const year = theDate.getFullYear();
                                const month = String(theDate.getMonth() + 1).padStart(2, '0');
                                const day = String(theDate.getDate()).padStart(2, '0');
                                theDateISOString = `${year}-${month}-${day}`; // Save as date string

                            } else { // datetime-local input is typically ISO format without Z
                                theDateISOString = theDate.toISOString(); // Convert to full ISO string (includes Z)
                            }
                            _saveOneFormData(formDataFieldName, theDateISOString);
                        }
                    } catch (e) {
                        console.error(`Error processing date field "${formDataFieldName}" with value "${val}":`, e);
                        _saveOneFormData(formDataFieldName, null); // Save null on error
                    }
                } else {
                    _saveOneFormData(formDataFieldName, null); // Save null if input is empty
                }
            } else { // Default case (Text, TextArea, Select)
                // Save the value, even if it's an empty string, unless specific requirement to save null
                if (val !== undefined && val !== null) {
                    _saveOneFormData(formDataFieldName, val);
                } else {
                    _saveOneFormData(formDataFieldName, null); // Save null if value is undefined/null
                }
            }
        });

        // Separate handling for file uploads if needed (using markerFileUploadExpense)
        _saveFileUploadExpenses(baseEl);
    }


    /**
     * Collects and saves data from all input types (non-array, simple array, complex array).
     * @param {Object} baseEl - The jQuery object representing the container for the current step's UI.
     */
    function _saveEnteredInputsToFormData(baseEl) {
        console.log("Starting to save form data...");
        _saveNonArrayInputsToFormData(baseEl);
        _processAllSimpleArrayControls(baseEl); // Renamed from _saveArrayTypeInputsToFormData
        _processAllComplexArrayControls(baseEl); // Added call
        console.log("Finished saving form data. Current state:", JSON.stringify(itsFormData, null, 2));
        // Raise event *after* all saving is done
        corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.NEW_FORM_DATA_SAVED, itsFormData);
    }


    /**
     * Saves data specifically for file uploads linked to expenses (if applicable).
     * @param {Object} baseEl - The jQuery object representing the container for the current step's UI.
     */
    function _saveFileUploadExpenses(baseEl) {
        // Example: Find inputs with a specific class used for expense file uploads
        let allFormEls = baseEl.find('.nonarrayTypeControl .markerFileUploadExpense'); // Adjust selector as needed

        allFormEls.each(function (index, item) {
            const oneInputEl = $(item);
            const formDataFieldName = oneInputEl.data("fieldName"); // Should match the expense array field name
            const fileInputId = oneInputEl.attr('id'); // Get the ID of the file input itself
            const files = oneInputEl.prop('files'); // Get the FileList object

            if (files && files.length > 0 && formDataFieldName) {
                const file = files[0]; // Assuming single file upload per input
                const fileName = file.name;
                // TODO: How to link this file/fileName to the correct expense item?
                // This requires a strategy. Maybe the file input's ID or another data attribute
                // needs to correspond to the 'id' generated in _createEachExpenseEntity.
                // For now, just logging. Needs implementation based on linking strategy.
                console.log(`File selected for expense field '${formDataFieldName}': ${fileName}. ID: ${fileInputId}. Linking needed.`);

                // Placeholder for linking logic:
                // _saveOneFileUploadExpenseData(formDataFieldName, fileName, fileInputId /* or linked expense ID */);
            }
        });
    }


    // Placeholder - Implement linking based on ID matching between file input and expense item
    function _saveOneFileUploadExpenseData(formDataFieldName, fileName, linkedExpenseId) {
        if (fileName === undefined || formDataFieldName === undefined || linkedExpenseId === undefined) {
            return;
        }
        console.log(`Attempting to link file '${fileName}' to expense ID '${linkedExpenseId}' in field '${formDataFieldName}'`);

        let theExpenses;
        let targetObject = (itsPathToData && itsDecisionServiceInput[1][itsPathToData]) ? itsDecisionServiceInput[1][itsPathToData] : itsDecisionServiceInput[1];

        if (targetObject && targetObject[formDataFieldName] && Array.isArray(targetObject[formDataFieldName])) {
            theExpenses = targetObject[formDataFieldName];
            let found = false;
            for (let i = 0; i < theExpenses.length; i++) {
                const oneExpense = theExpenses[i];
                // Assuming the file input ID or a data attribute matches the expense 'id'
                if (oneExpense.id === linkedExpenseId) { // Match based on the linked ID
                    oneExpense['fileUpload'] = fileName; // Or save file object/details as needed
                    found = true;
                    console.log(`Linked file '${fileName}' to expense item:`, oneExpense);
                    break;
                }
            }
            if (!found) {
                console.warn(`Could not find expense item with ID '${linkedExpenseId}' to link file '${fileName}'.`);
            }
            // Update itsFormData reference
            itsFormData = itsDecisionServiceInput[1];
        } else {
            console.warn(`Expense array '${formDataFieldName}' not found or not an array in target object.`);
        }

    }


    /**
     * Validates required fields in the current step.
     * @param {Object} baseDynamicUIEl - The base jQuery element containing the step's UI controls.
     * @returns {Boolean} - True if all required fields are filled, false otherwise.
     */
    function validateForm(baseDynamicUIEl) {
        let isValid = true;
        // Find all visible input/select/textarea elements that have the data-required attribute
        const requiredInputs = baseDynamicUIEl.find(':input[data-required="true"]:visible').not(':disabled');

        requiredInputs.each(function (index, item) {
            const inputEl = $(item);
            const value = inputEl.val();
            let fieldHasError = false;

            // Basic check for empty value (works for text, select, textarea)
            if (!value || (typeof value === 'string' && value.trim() === '')) {
                fieldHasError = true;
            }
            // Add specific checks if needed (e.g., for custom controls)

            // --- Visual Feedback ---
            const container = inputEl.closest('.inputContainer'); // Find the parent container
            const errorMsgClass = 'error-message-validation'; // Specific class for validation errors
            container.find(`.${errorMsgClass}`).remove(); // Remove previous error messages for this field

            if (fieldHasError) {
                isValid = false;
                // Add error message near the input
                const errorMessage = $(`<span class="${errorMsgClass}">This field is required.</span>`);
                // Append after the input or in a designated error area within the container
                inputEl.after(errorMessage);
                container.addClass('has-error'); // Optional: Add class to container for styling
                console.warn("Validation failed for required field:", inputEl.data("fieldName") || inputEl.attr("id"));
            } else {
                container.removeClass('has-error'); // Remove error styling if valid
            }
        });

        if (!isValid) {
            alert("Please fill in all required fields."); // Simple global alert
        }
        return isValid;
    }


    /**
     * Runs the Corticon decision service with the current payload.
     * @param {Object} decisionServiceEngine - The Corticon decision service engine instance.
     * @param {Array} payload - The payload array (control data and form data).
     * @returns {Promise<Object|null>} - The result from the decision service, or null on failure.
     */
    async function _runDecisionService(decisionServiceEngine, payload) {
        try {
            const eventData = { "input": payload, "stage": payload[0]?.currentStageNumber };
            corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.BEFORE_DS_EXECUTION, eventData);

            const configuration = { logLevel: 0 }; // Adjust log level as needed
            console.log("** Calling Decision Service with payload:", JSON.stringify(payload));
            const t1 = performance.now();
            const result = await decisionServiceEngine.execute(payload, configuration);
            const t2 = performance.now();
            console.log("** Decision Service Execution Result:", JSON.stringify(result));

            const eventResultData = {
                "output": result,
                "execTimeMs": t2 - t1,
                "stage": payload[0]?.currentStageNumber
            };

            if (result && result.corticon) {
                if (result.corticon.status === 'success') {
                    const newStepUI = result.payload && result.payload[0];
                    if (newStepUI && newStepUI.currentStageDescription) {
                        eventResultData["stageDescription"] = newStepUI.currentStageDescription;
                    }
                    corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.NEW_DS_EXECUTION, eventResultData);
                    return result; // Return the successful result
                } else {
                    const errorMsg = `Error executing rules: ${result.corticon.message || 'Unknown error'}`;
                    console.error(errorMsg, result);
                    alert(errorMsg + '\nSee console for details.');
                    corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.DS_EXECUTION_ERROR, { error: result, stage: payload[0]?.currentStageNumber });
                    return null; // Indicate failure
                }
            } else {
                const errorMsg = 'Invalid response structure from decision service.';
                console.error(errorMsg, result);
                alert(errorMsg);
                corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.DS_EXECUTION_ERROR, { error: 'Invalid response structure', stage: payload[0]?.currentStageNumber });
                return null; // Indicate failure
            }
        } catch (e) {
            const errorMsg = `Exception executing decision service: ${e.message || e}`;
            console.error(errorMsg, e);
            alert(errorMsg);
            corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.DS_EXECUTION_ERROR, { error: e, stage: payload[0]?.currentStageNumber });
            return null; // Indicate failure
        }
    }

    /**
     * Prepares the control data payload (itsDecisionServiceInput[0]) for the next stage.
     * Clears previous step-specific data while retaining state like language, labelPosition.
     * @param {Number} nextStage - The stage number to prepare for.
     * @param {String} [language] - Optional language override.
     */
    function _preparePayloadForNextStage(nextStage, language) {
        const currentState = itsDecisionServiceInput[0] || {}; // Use existing or empty object
        const nextPayload = {};
        // Properties to potentially carry over
        const stateProperties = ['stageOnExit', 'language', 'labelPosition', 'pathToData'];

        stateProperties.forEach(prop => {
            if (currentState[prop] !== undefined) {
                nextPayload[prop] = currentState[prop];
            }
        });

        // Set the target stage number
        nextPayload.currentStageNumber = nextStage;

        // Handle language: Override if provided, else use existing, else use initial
        if (language) {
            nextPayload['language'] = language;
        } else if (!nextPayload['language'] && itsInitialLanguage) {
            nextPayload['language'] = itsInitialLanguage; // Fallback to initial if not set
        }

        // Update the control data part of the main state
        itsDecisionServiceInput[0] = nextPayload;
        console.log("Prepared payload for next stage:", JSON.stringify(itsDecisionServiceInput[0]));
    }


    /**
     * Updates the default label position based on decision service response.
     * @param {String} newLabelPosition - The label position from the DS response.
     */
    function _processLabelPositionSetting(newLabelPosition) {
        if (newLabelPosition && typeof newLabelPosition === 'string') {
            itsLabelPositionAtUILevel = newLabelPosition;
            console.log("Label position set to:", itsLabelPositionAtUILevel);
        }
    }

    /**
     * Processes background data instructions from the decision service response.
     * Fetches data from a URL and saves it to the form data.
     * @param {Object} backgroundData - The background data configuration object from DS.
     */
    async function _processBackgroundData(backgroundData) {
        const {
            url,
            arrayToSet, arrayToCollection, collectionName,
            fieldName1, labelName1, pathToValue1 // Assuming structure from previous context
            // Add other fieldNameX, labelNameX, pathToValueX as needed
        } = backgroundData;

        if (!url) {
            console.warn("Background data instruction missing URL:", backgroundData);
            return;
        }

        console.log(`Processing background data from URL: ${url}`);

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            console.log("Background data received:", data);

            let valueToSave;
            let fieldToSave = fieldName1; // Default field

            if (arrayToSet && labelName1 && Array.isArray(data)) {
                // Extract specific field from each item in the array and join as string
                valueToSave = data.map(item => item[labelName1] !== undefined ? item[labelName1] : '').join(', ');
                fieldToSave = arrayToSet; // Save under the name specified by arrayToSet
            } else if (arrayToCollection && collectionName && Array.isArray(data)) {
                // Map array items to new objects based on field/label mappings
                valueToSave = data.map(item => {
                    const newObj = {};
                    // Iterate through potential field/label/path mappings (1 to 10 or more)
                    for (let i = 1; i <= 10; i++) { // Adjust limit as needed
                        const fieldName = backgroundData[`fieldName${i}`];
                        const labelName = backgroundData[`labelName${i}`];
                        // const pathToValue = backgroundData[`pathToValue${i}`]; // Use if needed for complex extraction

                        if (fieldName && labelName && item[labelName] !== undefined) {
                            // Simple mapping from labelName in source item to fieldName in target object
                            newObj[fieldName] = item[labelName];
                        }
                        // Add logic using pathToValue and JSONPath if required for complex objects
                    }
                    return newObj;
                });
                fieldToSave = collectionName; // Save the array under the collectionName
            } else if (fieldName1 && pathToValue1) { // Single value extraction using JSONPath
                // Ensure JSONPath library is available (e.g., loaded via script tag)
                if (typeof JSONPath !== 'undefined') {
                    try {
                        const result = JSONPath.JSONPath(pathToValue1, data);
                        valueToSave = result.length > 0 ? result[0] : null; // Get the first result or null
                        fieldToSave = fieldName1;
                    } catch (e) {
                        console.error(`JSONPath error for path "${pathToValue1}":`, e);
                        valueToSave = null; // Save null on JSONPath error
                    }
                } else {
                    console.error("JSONPath library is not available for background data processing.");
                    valueToSave = null;
                }
            } else if (fieldName1 && labelName1 && !pathToValue1 && typeof data === 'object' && data !== null && data[labelName1] !== undefined) {
                // Simple single value extraction by key (labelName1) if data is an object
                valueToSave = data[labelName1];
                fieldToSave = fieldName1;
            }
            else {
                console.warn("Background data format not recognized or insufficient mapping provided:", backgroundData);
                valueToSave = data; // Save the raw data as fallback? Or null?
                fieldToSave = fieldName1 || 'backgroundDataResult'; // Default field name
            }


            // Save the extracted/processed value
            if (fieldToSave) {
                _saveOneFormData(fieldToSave, valueToSave);
                console.log(`Saved background data under field '${fieldToSave}'.`);
            } else {
                console.warn("No field name specified to save background data result.");
            }

        } catch (error) {
            console.error(`Error processing background data from ${url}:`, error);
            // Optionally save an error indicator to the form data
            // _saveOneFormData(fieldName1 || 'backgroundDataError', `Error fetching: ${error.message}`);
        }
    }


    /**
     * Calls the decision service to get the next UI step and renders it.
     * Handles background data processing and "no UI" steps.
     * @param {Object} decisionServiceEngine - The Corticon engine instance.
     * @param {Array} payload - The payload for the decision service.
     * @param {Object} baseEl - The jQuery element to render the UI into.
     * @returns {Promise<Object|null>} - The final decision service response object for the UI step rendered, or null if errors occurred.
     */
    async function _askDecisionServiceForNextUIElementsAndRender(decisionServiceEngine, payload, baseEl) {
        const result = await _runDecisionService(decisionServiceEngine, payload);

        if (!result || result.corticon?.status !== 'success') {
            console.error("Decision service execution failed or returned invalid status.");
            // Potentially stop the flow or show an error UI
            return null; // Indicate failure
        }

        const nextUI = result.payload[0]; // Assuming result structure is correct

        if (!nextUI) {
            console.error("Decision service response missing payload[0].");
            alert("Received invalid response from decision service.");
            return null;
        }

        // --- Update State from DS Response ---
        // Save context of where form data should be nested
        if (nextUI.pathToData !== undefined && nextUI.pathToData !== null) { // Allow empty string path ""
            itsPathToData = nextUI.pathToData;
            console.log("Data path set to:", itsPathToData === "" ? "(root)" : itsPathToData);
        }

        // Save the default label position
        _processLabelPositionSetting(nextUI.labelPosition);

        // IMPORTANT: Refresh itsFormData reference as DS might have modified itsDecisionServiceInput[1]
        itsFormData = itsDecisionServiceInput[1];
        console.log("Form data state after DS call:", JSON.stringify(itsFormData, null, 2));

        // --- Handle Background Data ---
        if (nextUI.backgroundData && Array.isArray(nextUI.backgroundData)) {
            console.log("Processing background data instructions:", nextUI.backgroundData);
            // Process instructions sequentially (await each fetch)
            for (const backgroundDataInstruction of nextUI.backgroundData) {
                await _processBackgroundData(backgroundDataInstruction);
            }
            console.log("Finished processing background data. Current form data:", JSON.stringify(itsFormData, null, 2));
            // IMPORTANT: Refresh itsFormData reference AGAIN as background processing modified it
            itsFormData = itsDecisionServiceInput[1];
        }

        // --- Handle "No UI" Steps ---
        // If this step was just computation/background data, DS signals to continue
        if (nextUI.noUiToRenderContinue === true) {
            console.log(`Step ${payload[0]?.currentStageNumber} is a 'no UI' step. Continuing...`);
            return nextUI; // Return the response, signaling the loop in handleDecisionServiceStep to continue
        }

        // --- Render UI ---
        const containers = nextUI.containers;
        if (!containers || !Array.isArray(containers)) {
            console.error('Decision service response missing valid "containers" array for UI rendering.');
            alert('Error: Invalid UI structure received.');
            // Optionally render an error message in baseEl
            baseEl.empty().append('<div class="error-message">Failed to load UI content.</div>');
            return null; // Indicate failure
        }

        console.log(`Rendering UI for stage ${payload[0]?.currentStageNumber}`);
        itsUIControlsRenderer.renderUI(containers, baseEl, itsLabelPositionAtUILevel, nextUI.language || itsInitialLanguage, itsFlagRenderWithKui);

        // --- Post-Render Event ---
        const eventData = { "input": payload, "output": result.payload, "stage": payload[0]?.currentStageNumber };
        corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.AFTER_UI_STEP_RENDERED, eventData);

        return nextUI; // Return the response for the step that was actually rendered
    }


    /**
     * Initializes the state for starting the form from the beginning.
     * @param {String} language - The initial language for the UI.
     * @param {Object} externalData - External data to pre-populate the form data (itsDecisionServiceInput[1]).
     */
    function setStateForStartFromBeginning(language, externalData) {
        console.log("Setting state for start from beginning. Language:", language, "ExternalData:", externalData);
        _resetDecisionServiceInput(language); // Sets stage 0, language, clears control data[0], ensures form data[1] is {}

        itsFlagAllDone = false;
        itsPathToData = null; // Reset path to data
        itsLabelPositionAtUILevel = "Above"; // Reset label position to default

        // Deep copy external data into the form data state (itsDecisionServiceInput[1])
        if (externalData && typeof externalData === 'object') {
            try {
                // Ensure we are copying into the fresh object created by _resetDecisionServiceInput
                itsDecisionServiceInput[1] = JSON.parse(JSON.stringify(externalData));
                console.log("External data applied:", JSON.stringify(itsDecisionServiceInput[1]));
            } catch (error) {
                console.error("Error parsing/copying externalData:", error);
                itsDecisionServiceInput[1] = {}; // Reset to empty object on error
            }
        } else {
            console.log("No valid external data provided, starting with empty form data.");
            itsDecisionServiceInput[1] = {}; // Ensure it's an empty object if no/invalid external data
        }

        // Ensure itsFormData reference points to the correct object after potential external data load
        itsFormData = itsDecisionServiceInput[1];

        // REMOVED Call to undefined function: _updateContainerTitleDisplay(baseDynamicUIEl, language);
        console.log("Initial state set. Control Data:", JSON.stringify(itsDecisionServiceInput[0]), "Form Data:", JSON.stringify(itsDecisionServiceInput[1]));
    }


    /**
     * Resets the decision service input state, preparing for stage 0.
     * Ensures itsDecisionServiceInput[1] (form data) is a clean object.
     * @param {String} language - The initial language.
     */
    function _resetDecisionServiceInput(language) {
        _preparePayloadForNextStage(0, language); // Sets up control data [0] for stage 0

        // Explicitly ensure the form data part [1] is a new, empty object
        itsDecisionServiceInput[1] = {};

        // Ensure the main itsFormData reference points to this new empty object
        itsFormData = itsDecisionServiceInput[1];
        console.log("Decision service input reset. Form data [1] cleared.");
    }

    /**
     * Sets the controller's state based on previously saved restart data.
     * @param {String} questionnaireName - Identifier for the questionnaire.
     * @param {Object} restartData - The parsed JSON object containing the saved state ([controlData, formData]).
     */
    function setStateFromRestartData(questionnaireName, restartData) {
        console.log("Setting state from restart data for:", questionnaireName);
        itsLabelPositionAtUILevel = "Above"; // Reset to default, DS response will override if needed
        itsPathToData = getPathToData(questionnaireName); // Load saved path

        // Directly assign the saved state
        itsDecisionServiceInput = restartData;

        // Ensure itsFormData references the loaded form data object
        itsFormData = itsDecisionServiceInput[1] || {}; // Use empty object if saved data is malformed

        console.log("State restored. Control Data:", JSON.stringify(itsDecisionServiceInput[0]), "Form Data:", JSON.stringify(itsDecisionServiceInput[1]), "Path:", itsPathToData);

        // History setup
        itsHistory.setRestartHistory(getRestartHistory(questionnaireName));
        const lastStageData = itsHistory.getPreviousStageData(); // Pop the last saved state from history stack
        if (lastStageData) {
            console.log(`Popped stage ${lastStageData.stage} data from history for re-execution.`);
            // We don't set state from this, just remove it so the next execution adds it back correctly.
        } else {
            console.warn("Restart history was empty or corrupted after loading.");
        }
        itsFlagAllDone = false; // Assume not done when restarting
    }


    // --- Local Storage Persistence ---

    function saveRestartData(decisionServiceName, payloadString) { // Expect stringified payload
        if (!decisionServiceName) return;
        try {
            window.localStorage.setItem(`CorticonRestartPayload_${decisionServiceName}`, payloadString);
            // Save path and history along with payload
            if (itsPathToData !== null) { // Only save if not null
                window.localStorage.setItem(`CorticonRestartPathToData_${decisionServiceName}`, itsPathToData);
            } else {
                window.localStorage.removeItem(`CorticonRestartPathToData_${decisionServiceName}`); // Clean up if path becomes null
            }
            window.localStorage.setItem(`CorticonRestartHistory_${decisionServiceName}`, itsHistory.getRestartHistory());
            // console.log(`Saved restart data for ${decisionServiceName}`);
        } catch (e) {
            console.warn("Could not save restart data to local storage (Private Browse? Storage Full?)", e);
        }
    }

    function getRestartData(decisionServiceName) {
        if (!decisionServiceName) return null;
        const payloadString = window.localStorage.getItem(`CorticonRestartPayload_${decisionServiceName}`);
        if (payloadString) {
            try {
                return JSON.parse(payloadString);
            } catch (e) {
                console.error(`Error parsing restart payload for ${decisionServiceName}:`, e);
                clearRestartData(decisionServiceName); // Clear corrupted data
                return null;
            }
        }
        return null;
    }

    function getPathToData(decisionServiceName) {
        if (!decisionServiceName) return null;
        return window.localStorage.getItem(`CorticonRestartPathToData_${decisionServiceName}`); // Returns null if not found
    }

    function getRestartHistory(decisionServiceName) {
        if (!decisionServiceName) return null;
        return window.localStorage.getItem(`CorticonRestartHistory_${decisionServiceName}`); // Returns null if not found
    }

    function clearRestartData(decisionServiceName) {
        if (!decisionServiceName) return;
        try {
            window.localStorage.removeItem(`CorticonRestartPayload_${decisionServiceName}`);
            window.localStorage.removeItem(`CorticonRestartPathToData_${decisionServiceName}`);
            window.localStorage.removeItem(`CorticonRestartHistory_${decisionServiceName}`);
            console.log(`Cleared restart data for ${decisionServiceName}`);
        } catch (e) {
            console.warn("Could not clear restart data from local storage.", e);
        }
    }

    // --- Step Navigation Logic ---

    /**
     * Handles the logic for moving to the next step.
     * Validates current step, saves data, calls DS, handles response (UI render or continue).
     * @param {Object} baseDynamicUIEl - The jQuery element containing the current UI.
     * @param {Object} decisionServiceEngine - The Corticon engine instance.
     * @param {String} language - Current language (might be needed for DS call?).
     * @param {Boolean} [saveInputToFormData=true] - Whether to save input data before calling DS.
     */
    async function processNextStep(baseDynamicUIEl, decisionServiceEngine, language, saveInputToFormData = true) {
        console.log("Processing Next Step...");
        // Capture the review state *before* doing anything else for this transition
        const currentlyOnReviewStep = isReviewStepDisplayed;

        // Optionally skip saving/validation when leaving the review step
        if (saveInputToFormData && !currentlyOnReviewStep) {
            // 1. Validate Current Step Inputs
            if (!validateForm(baseDynamicUIEl)) {
                console.log("Validation failed. Staying on current step.");
                return; // Stop if validation fails
            }
            // 2. Save Current Step Inputs
            _saveEnteredInputsToFormData(baseDynamicUIEl);
        } else if (currentlyOnReviewStep) {
            console.log(`Skipping input saving/validation for this step transition (Leaving Review Step).`);
        } else {
            console.log("Skipping input saving because saveInputToFormData is false.");
        }

        corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.NEW_STEP);

        // --- MODIFIED CHECK ---
        // Only handle completion here if the form was marked done *before* this step
        // AND we are *not* currently on the review step (because leaving the review step
        // needs to proceed to the next stage (e.g., stage 7) to get postInfo).
        if (itsFlagAllDone && !currentlyOnReviewStep) {
            console.log("Form is marked as done (and not on review step). Handling completion.");
            handleFormCompletion(decisionServiceEngine);
            return; // Exit early, completion handled
        }
        // --- END MODIFIED CHECK ---

        // 4. Determine the target stage for the NEXT step execution.
        //    This should come from the 'nextStageNumber' attribute set in the control data
        //    by the PREVIOUS decision service execution.
        const targetStage = itsDecisionServiceInput[0]?.nextStageNumber;

        if (targetStage === undefined) {
            console.error("Cannot determine next stage number from previous step's response. Stopping.", itsDecisionServiceInput[0]);
            alert("An error occurred determining the next step. Please check the decision service response.");
            return;
        }

        // 5. Prepare the payload FOR the target stage BEFORE calling handleDecisionServiceStep
        //    This updates itsDecisionServiceInput[0].currentStageNumber
        console.log(`processNextStep: Preparing payload for target stage: ${targetStage}`);
        _preparePayloadForNextStage(targetStage, language); // Pass language too

        // 6. Execute Decision Service for the *Prepared* Target Step
        //    handleDecisionServiceStep will use the currentStageNumber set by _preparePayloadForNextStage
        await handleDecisionServiceStep(decisionServiceEngine, baseDynamicUIEl);
    }


    /**
     * Handles the interaction with the decision service for a step transition.
     * Prepares payload, calls DS, processes response (renders UI or loops for no-UI steps), saves restart data.
     * @param {Object} decisionServiceEngine - The Corticon engine instance.
     * @param {Object} baseDynamicUIEl - The jQuery element to render UI into.
     */
    async function handleDecisionServiceStep(decisionServiceEngine, baseDynamicUIEl) {
        // --- MODIFIED LOGIC ---
        // The correct stage to EXECUTE is already in the control payload prepared by the caller
        // (either startDynUI preparing stage 0, or processNextStep preparing the next stage from DS response)
        const stageToExecute = itsDecisionServiceInput[0]?.currentStageNumber ?? 0; // Use the stage already set in the payload
        console.log(`Executing decision service for stage: ${stageToExecute}`);
        // No need to call _preparePayloadForNextStage again here, the payload is already prepared.

        // Pass the current payload (which has the correct stageToExecute as currentStageNumber)
        let nextUI = await _askDecisionServiceForNextUIElementsAndRender(decisionServiceEngine, itsDecisionServiceInput, baseDynamicUIEl);

        // Loop if the step had no UI and indicated to continue
        while (nextUI && nextUI.noUiToRenderContinue === true) {
            console.log(`Handling continuation from no-UI step. Next stage from DS: ${nextUI.nextStageNumber}`);
            if (nextUI.done) {
                console.log("DS indicated 'done' during no-UI loop.");
                itsFlagAllDone = true;
                break; // Exit loop if done
            }
            if (nextUI.nextStageNumber === undefined) {
                console.error("DS indicated continue but didn't provide nextStageNumber. Stopping.");
                // Handle error - maybe alert user or stop flow
                baseDynamicUIEl.empty().append('<div class="error-message">An error occurred processing the form steps.</div>');
                return; // Exit processing
            }

            // Push the state of the no-UI step to history BEFORE preparing for the next
            const noUiStateToSave = JSON.parse(JSON.stringify(itsDecisionServiceInput));
            const noUiStageNumber = itsDecisionServiceInput[0]?.currentStageNumber ?? 'N/A';
            console.log(`Pushed no-UI stage ${noUiStageNumber} state to history.`);

            // Prepare payload for the *next* stage indicated by the no-UI step response
            _preparePayloadForNextStage(nextUI.nextStageNumber);

            // Save restart data *before* the next DS call in the loop
            saveRestartData(itsQuestionnaireName, JSON.stringify(itsDecisionServiceInput));

            // Call DS again for the subsequent step
            nextUI = await _askDecisionServiceForNextUIElementsAndRender(decisionServiceEngine, itsDecisionServiceInput, baseDynamicUIEl);
        }

        // Process the final result (could be UI step, error, or the 'done' step)
        if (nextUI) {
            // Update flags based on the *final* response for this transition
            itsFlagAllDone = nextUI.done === true;
            itsFlagReportRequested = nextUI.report === true;
            console.log(`Internal flags set from step data: done=${itsFlagAllDone}, report=${itsFlagReportRequested}`);

            // *** NEW LOGIC: Check for Review Step Condition ***
            if (itsFlagAllDone && itsFlagReportRequested) {
                console.log("Final step reached, report requested. Rendering Review Step.");
                isReviewStepDisplayed = true; // Set the review flag

                // Format data for the report
                const formattedDataForReport = itsFormData ? [itsFormData] : [];
                console.log("Formatted data for report:", JSON.stringify(formattedDataForReport));

                // Render the report into the container
                const containerId = baseDynamicUIEl.attr('id'); // Get container ID
                if (typeof renderAssessmentReport === 'function') {
                    try {
                        console.log(`Calling renderAssessmentReport for Review Step in container #${containerId}...`);
                        renderAssessmentReport(formattedDataForReport, containerId);
                        console.log("renderAssessmentReport called successfully for Review Step.");
                        // Add a title/instruction for the review step
                        baseDynamicUIEl.prepend('<h3>Review Your Assessment</h3><p>Please review the information below. Click Previous to make changes or Next to submit.</p>');
                    } catch (error) {
                        console.error("Error during review step report generation:", error);
                        if (baseDynamicUIEl && typeof baseDynamicUIEl.empty === 'function') {
                            baseDynamicUIEl.empty().append(`<p style="color: red;">Error generating review: ${error.message}</p>`);
                        } else if (baseDynamicUIEl instanceof HTMLElement) {
                            baseDynamicUIEl.innerHTML = `<p style="color: red;">Error generating review: ${error.message}</p>`;
                        }
                    }
                } else {
                    console.error("renderAssessmentReport function is not defined.");
                    if (baseDynamicUIEl && typeof baseDynamicUIEl.empty === 'function') {
                        baseDynamicUIEl.empty().append('<p style="color: red;">Error: Cannot display review. Report function not found.</p>');
                    } else if (baseDynamicUIEl instanceof HTMLElement) {
                        baseDynamicUIEl.innerHTML = '<p style="color: red;">Error: Cannot display review. Report function not found.</p>';
                    }
                }

                // Update button states for review (e.g., enable Prev/Next, change Next text)
                // This might need external calls depending on how buttons are managed
                corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.REVIEW_STEP_DISPLAYED, { historyEmpty: itsHistory.isHistoryEmpty() });

            } else if (itsFlagAllDone && !itsFlagReportRequested) {
                // Handle case where form is done but no report needed (immediately complete)
                console.log("Form marked as done, no report requested. Handling completion directly.");
                handleFormCompletion(decisionServiceEngine);
                isReviewStepDisplayed = false; // Ensure review flag is false
            } else {
                // Normal step (not done, or done without report) - UI was already rendered by _ask...
                isReviewStepDisplayed = false; // Ensure review flag is false
                // Update button states for normal step
                corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.HISTORY_STATUS_CHANGED, { historyEmpty: itsHistory.isHistoryEmpty() });
            }

            // Save restart data including the latest flags and review state
            saveRestartData(itsQuestionnaireName, JSON.stringify(itsDecisionServiceInput));
            console.log(`Restart data saved. Is form done? ${itsFlagAllDone}. Is review step? ${isReviewStepDisplayed}`);

        } else {
            console.error("Error occurred during decision service step processing. Form flow might be interrupted.");
            if (baseDynamicUIEl && typeof baseDynamicUIEl.empty === 'function') {
                baseDynamicUIEl.empty().append('<div class="error-message">An error occurred processing the form step. Please try again later.</div>');
            } else if (baseDynamicUIEl instanceof HTMLElement) {
                baseDynamicUIEl.innerHTML = '<div class="error-message">An error occurred processing the form step. Please try again later.</div>';
            }
        }
    }

    /**
     * Handles the final actions when the form is completed *after* the review step (or directly if no review).
     * Clears restart data, raises event, optionally posts data, and displays completion message.
     * @param {Object} decisionServiceEngine - The Corticon engine instance (passed if needed).
     */
    function handleFormCompletion(decisionServiceEngine) {
        console.log("--- handleFormCompletion called ---");
        console.log("Final Form Data (itsFormData):", JSON.stringify(itsFormData, null, 2));
        const finalControlData = itsDecisionServiceInput[0] || {}; // Get final control data

        clearRestartData(itsQuestionnaireName); // Clear persistence
        isReviewStepDisplayed = false; // Ensure review flag is reset
        corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.AFTER_DONE, itsFormData); // Send final data with event

        // --- Optional: Post data based on DS instruction ---

        // Read post details directly from the final control data object
        const postType = finalControlData.postType;
        const postURL = finalControlData.postURL;
        const postHeadersRaw = finalControlData.headers; // Get the headers array/object from DS response

        let postAttempted = false;
        let postSuccessful = false;

        // Check directly using the variables read from finalControlData
        if (postType === 'REST' && postURL) {
            postAttempted = true;
            console.log(`Attempting REST POST to: ${postURL}`);
            const postData = JSON.stringify(itsFormData); // Post the form data part

            // Start with base headers
            const finalHeaders = {
                "Content-Type": "application/json"
            };

            // Process headers - expecting an array containing one object based on DS response
            if (postHeadersRaw && Array.isArray(postHeadersRaw) && postHeadersRaw.length > 0) {
                const headerObj = postHeadersRaw[0]; // Get the first (and likely only) object from the array
                console.log("Raw header object from DS:", headerObj); // Optional debug log
                console.log("Type of header object:", typeof headerObj); // Optional debug log

                if (typeof headerObj === 'object' && headerObj !== null) {
                    // --- MODIFIED ITERATION START ---
                    // Use Object.keys() and forEach for safer iteration
                    Object.keys(headerObj).forEach(key => {
                        const value = headerObj[key]; // Get value using the key

                        // Map known camelCase keys to HTTP header format
                        if (key === 'xMasterKey') {
                            finalHeaders['X-Master-key'] = value;
                            console.log("Mapping header: xMasterKey -> X-Master-key");
                        } else if (key === 'xCollectionId') {
                            finalHeaders['X-Collection-Id'] = value;
                            console.log("Mapping header: xCollectionId -> X-Collection-Id");
                        } else {
                            // Pass through any other headers directly
                            finalHeaders[key] = value;
                            console.log(`Mapping header: ${key} -> ${key}`);
                        }
                    });
                    // --- MODIFIED ITERATION END ---
                } else {
                    console.warn("Headers object within array was not valid:", headerObj);
                }
            } else {
                console.log("No additional headers provided or headers format not recognized/empty.");
            }

            console.log("Final headers for fetch:", finalHeaders);

            fetch(postURL, {
                // Read method directly from control data if present, otherwise default to POST
                method: finalControlData.method || "POST",
                headers: finalHeaders, // Use the processed headers
                body: postData
            })
                .then(response => {
                    if (!response.ok) {
                        return response.text().then(text => {
                            throw new Error(`HTTP error! Status: ${response.status} ${response.statusText}. Body: ${text}`);
                        });
                    }
                    const contentType = response.headers.get("content-type");
                    if (contentType && contentType.indexOf("application/json") !== -1) {
                        return response.json();
                    } else {
                        return response.text();
                    }
                })
                .then(data => {
                    console.log("Data successfully posted:", data);
                    postSuccessful = true;
                    _displayCompletionMessage("Form submitted successfully!");
                    corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.POST_SUCCESS, data);
                })
                .catch(error => {
                    console.error("Error posting data:", error);
                    _displayCompletionMessage(`Error submitting form: ${error.message}`, true);
                    corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.POST_ERROR, error);
                })
                .finally(() => {
                    corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.DISABLE_NAVIGATION);
                });
        } else {
            // Update log message for clarity
            console.log(`No REST post instruction found or postType is not 'REST'. postType: ${postType}, postURL: ${postURL}`);
            _displayCompletionMessage("Form Completed!");
            corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.DISABLE_NAVIGATION);
        }

        console.log("--- handleFormCompletion finished ---");
    }

    /**
     * Helper to display the final completion/error message in the UI container.
     * @param {string} message - The message to display.
     * @param {boolean} [isError=false] - Whether the message is an error.
     */
    function _displayCompletionMessage(message, isError = false) {
        const container = document.getElementById('dynUIContainerId'); // Assuming same container ID
        if (container) {
            container.innerHTML = `<div class="report-section"><p class="${isError ? 'error-message' : 'success-message'}">${message}</p></div>`;
        } else {
            // Fallback to alert if container not found
            alert(message);
        }
    }


    /**
     * Calls the decision service to get the next UI step and renders it.
     * Handles background data processing, "no UI" steps, and "done" state.
     * @param {Object} decisionServiceEngine - The Corticon engine instance.
     * @param {Array} payload - The payload for the decision service.
     * @param {Object} baseEl - The jQuery element to render the UI into.
     * @returns {Promise<Object|null>} - The control data object (payload[0]) from the decision service response, or null if errors occurred.
     */
    async function _askDecisionServiceForNextUIElementsAndRender(decisionServiceEngine, payload, baseEl) {
        const result = await _runDecisionService(decisionServiceEngine, payload);

        if (!result || result.corticon?.status !== 'success') {
            console.error("Decision service execution failed or returned invalid status.");
            return null; // Indicate failure
        }

        const nextUI = result.payload[0]; // Assuming result structure is correct

        if (!nextUI) {
            console.error("Decision service response missing payload[0].");
            alert("Received invalid response from decision service.");
            return null;
        }

        // --- Update State from DS Response (Do this regardless of 'done' status) ---
        if (nextUI.pathToData !== undefined && nextUI.pathToData !== null) {
            itsPathToData = nextUI.pathToData;
            console.log("Data path set to:", itsPathToData === "" ? "(root)" : itsPathToData);
        }
        _processLabelPositionSetting(nextUI.labelPosition);
        itsFormData = itsDecisionServiceInput[1]; // Refresh itsFormData reference
        console.log("Form data state after DS call:", JSON.stringify(itsFormData, null, 2));

        // *** Check for 'done' state EARLY - if done, we just return the control data ***
        if (nextUI.done === true) {
            console.log(`_askDecisionServiceForNextUIElementsAndRender: Detected 'done: true' for stage ${payload[0]?.currentStageNumber}. Skipping UI processing.`);
            return nextUI; // Return control data (contains done/report flags)
        }
        // *** END 'done' CHECK ***

        // --- Process Background Data (Only if not done) ---
        if (nextUI.backgroundData && Array.isArray(nextUI.backgroundData)) {
            console.log("Processing background data instructions:", nextUI.backgroundData);
            for (const backgroundDataInstruction of nextUI.backgroundData) {
                await _processBackgroundData(backgroundDataInstruction);
            }
            console.log("Finished processing background data. Current form data:", JSON.stringify(itsFormData, null, 2));
            itsFormData = itsDecisionServiceInput[1]; // Refresh itsFormData reference AGAIN
        }

        // --- Handle "No UI" Steps (Only if not done) ---
        if (nextUI.noUiToRenderContinue === true) {
            console.log(`Step ${payload[0]?.currentStageNumber} is a 'no UI' step. Continuing...`);
            return nextUI; // Return control data, signaling the loop in handleDecisionServiceStep
        }

        // --- Render UI (Only if not done and not 'no UI') ---
        const containers = nextUI.containers;
        if (!containers || !Array.isArray(containers)) {
            console.error('Decision service response missing valid "containers" array for UI rendering.');
            alert('Error: Invalid UI structure received.');
            if (baseEl && typeof baseEl.empty === 'function') {
                baseEl.empty().append('<div class="error-message">Failed to load UI content.</div>');
            } else if (baseEl instanceof HTMLElement) {
                baseEl.innerHTML = '<div class="error-message">Failed to load UI content.</div>';
            }
            return null; // Indicate failure
        }

        console.log(`Rendering UI for stage ${payload[0]?.currentStageNumber}`);
        // Ensure baseEl is cleared before rendering new content
        if (baseEl && typeof baseEl.empty === 'function') {
            baseEl.empty();
        } else if (baseEl instanceof HTMLElement) {
            baseEl.innerHTML = '';
        }
        // Proceed with rendering
        itsUIControlsRenderer.renderUI(containers, baseEl, itsLabelPositionAtUILevel, nextUI.language || itsInitialLanguage, itsFlagRenderWithKui);

        // --- Post-Render Event ---
        const eventData = { "input": payload, "output": result.payload, "stage": payload[0]?.currentStageNumber };
        corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.AFTER_UI_STEP_RENDERED, eventData);

        return nextUI; // Return the control data for the step that was actually rendered
    }


    /**
     * Handles the logic for moving to the previous step using history.
     * @param {Object} baseDynamicUIEl - The jQuery element to render UI into.
     * @param {Object} decisionServiceEngine - The Corticon engine instance.
     * @param {String} language - Current language.
     */
    async function processPrevStep(baseDynamicUIEl, decisionServiceEngine, language) {
        console.log("Processing Previous Step...");
        isReviewStepDisplayed = false; // Going back always exits review mode

        const previousStateData = itsHistory.getPreviousStageData(); // Pops from history stack

        if (!previousStateData || !previousStateData.input) {
            console.log("History is empty. Cannot go back further.");
            corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.BACK_AT_FORM_BEGINNING);
            corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.HISTORY_STATUS_CHANGED, { historyEmpty: itsHistory.isHistoryEmpty() });
            return; // At the beginning
        }

        const restoredStageNumber = previousStateData.stage; // Get stage number from history item
        console.log(`Restoring state for previous stage: ${restoredStageNumber}`);

        // Restore the entire state (control and form data) from history
        itsDecisionServiceInput = previousStateData.input;
        // Ensure itsFormData references the restored form data
        itsFormData = itsDecisionServiceInput[1] || {};
        // Restore path to data from the restored control data
        itsPathToData = itsDecisionServiceInput[0]?.pathToData ?? null;
        // Restore flags from control data (important!)
        itsFlagAllDone = itsDecisionServiceInput[0]?.done === true;
        itsFlagReportRequested = itsDecisionServiceInput[0]?.report === true;

        console.log("State restored from history. Control Data:", JSON.stringify(itsDecisionServiceInput[0]), "Form Data:", JSON.stringify(itsDecisionServiceInput[1]));

        // Save this restored state as the current restart point BEFORE rendering
        saveRestartData(itsQuestionnaireName, JSON.stringify(itsDecisionServiceInput));

        // Re-render the UI for the restored stage
        // Call _askDecisionServiceForNextUIElementsAndRender with the restored state payload.
        const renderedUI = await _askDecisionServiceForNextUIElementsAndRender(decisionServiceEngine, itsDecisionServiceInput, baseDynamicUIEl);

        if (renderedUI && renderedUI.noUiToRenderContinue === true) {
            console.warn(`Restored to a 'no-UI' step (${restoredStageNumber}). The UI for the subsequent step might be shown if it auto-advanced.`);
        } else if (renderedUI) {
            console.log(`UI for restored stage ${restoredStageNumber} rendered.`);
        } else {
            console.error(`Failed to render UI for restored stage ${restoredStageNumber}.`);
        }

        // Update history button state
        corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.HISTORY_STATUS_CHANGED, { historyEmpty: itsHistory.isHistoryEmpty() });

        // Check if we are now at the very beginning
        if (itsHistory.isHistoryEmpty()) {
            corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.BACK_AT_FORM_BEGINNING);
        }
    }


    // --- Public Interface ---
    return {
        startDynUI: async function (baseDynamicUIEl, decisionServiceEngine, externalData, language, questionnaireName, useKui) {
            console.log(`Starting Dynamic UI: ${questionnaireName}, Lang: ${language}, KUI: ${useKui}`);
            itsFlagRenderWithKui = useKui;
            itsQuestionnaireName = questionnaireName;
            itsInitialLanguage = language;
            itsHistory.setupHistory(); // Reset history
            itsFlagAllDone = false; // Reset internal flags on start
            itsFlagReportRequested = false; // Reset internal flags on start
            isReviewStepDisplayed = false; // Reset review flag

            // Check for restart data
            const restartData = getRestartData(questionnaireName);
            let startFromBeginning = true; // Default
            let initialStageToRender = 0; // Default start stage

            if (restartData) {
                // Use confirm() which is blocking - consider using a modal for better UX
                if (confirm("Resume previous session?")) {
                    setStateFromRestartData(questionnaireName, restartData); // This now restores flags too
                    startFromBeginning = false;
                    initialStageToRender = itsDecisionServiceInput[0]?.currentStageNumber ?? 0; // Get stage from restored data
                    console.log(`Resuming from stage: ${initialStageToRender}. Flags: done=${itsFlagAllDone}, report=${itsFlagReportRequested}, review=${isReviewStepDisplayed}`);

                    // If resuming directly onto the review step, render the report
                    if (isReviewStepDisplayed) {
                        console.log("Resuming directly onto Review Step.");
                        const formattedDataForReport = itsFormData ? [itsFormData] : [];
                        const containerId = baseDynamicUIEl.attr('id');
                        if (typeof renderAssessmentReport === 'function') {
                            try {
                                renderAssessmentReport(formattedDataForReport, containerId);
                                baseDynamicUIEl.prepend('<h3>Review Your Assessment</h3><p>Please review the information below. Click Previous to make changes or Next to submit.</p>');
                                corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.REVIEW_STEP_DISPLAYED, { historyEmpty: itsHistory.isHistoryEmpty() });
                            } catch (error) {
                                console.error("Error rendering review step report on resume:", error);
                                if (baseDynamicUIEl && typeof baseDynamicUIEl.empty === 'function') {
                                    baseDynamicUIEl.empty().append(`<p style="color: red;">Error generating review: ${error.message}</p>`);
                                } else if (baseDynamicUIEl instanceof HTMLElement) {
                                    baseDynamicUIEl.innerHTML = `<p style="color: red;">Error generating review: ${error.message}</p>`;
                                }
                            }
                        } else {
                            console.error("renderAssessmentReport function is not defined for resume.");
                            if (baseDynamicUIEl && typeof baseDynamicUIEl.empty === 'function') {
                                baseDynamicUIEl.empty().append('<p style="color: red;">Error: Cannot display review. Report function not found.</p>');
                            } else if (baseDynamicUIEl instanceof HTMLElement) {
                                baseDynamicUIEl.innerHTML = '<p style="color: red;">Error: Cannot display review. Report function not found.</p>';
                            }
                        }
                        // Update history status event after potentially rendering review step
                        corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.HISTORY_STATUS_CHANGED, { historyEmpty: itsHistory.isHistoryEmpty() });
                        corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.AFTER_START, { historyEmpty: itsHistory.isHistoryEmpty() });
                        return; // Stop further processing as review step is shown
                    }

                } else {
                    clearRestartData(questionnaireName); // Clear if user chooses not to resume
                }
            }

            if (startFromBeginning) {
                setStateForStartFromBeginning(language, externalData); // Sets up payload for stage 0
                initialStageToRender = 0;
            }

            corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.BEFORE_START);

            // --- Initial DS call and render (only if not resuming to review step) ---
            console.log(`Making initial call for stage: ${initialStageToRender}`);
            await handleDecisionServiceStep(decisionServiceEngine, baseDynamicUIEl); // Use the main handler

            // --- End Initial DS call handling ---

            // Initial history status event (already raised in handleDecisionServiceStep or processPrevStep if resuming)
            // corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.HISTORY_STATUS_CHANGED, { historyEmpty: itsHistory.isHistoryEmpty() });
            corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.AFTER_START, { historyEmpty: itsHistory.isHistoryEmpty() }); // Keep original event if needed
        },
        processNextStep: processNextStep,
        processPrevStep: processPrevStep
        // No need to expose internal functions like _saveOneFormData etc.
    }
}
