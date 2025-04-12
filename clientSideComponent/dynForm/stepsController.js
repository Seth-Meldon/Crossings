"use strict"; // Added for best practices

corticon.util.namespace("corticon.dynForm");

// Helper function (can be outside if preferred, ensure it's accessible)
function _createEachTextEntity(outerArray, textFieldArray) {
    const convertedArray = [];
    if (!Array.isArray(outerArray) || !Array.isArray(textFieldArray)) {
        console.error("Invalid input for _createEachTextEntity: Inputs must be arrays.");
        return convertedArray;
    }
    for (let i = 0; i < outerArray.length; i++) {
        const oneItemAsAnArray = outerArray[i];
        const oneItemAsObjLit = {};
        // Ensure oneItemAsAnArray is also an array before iterating
        if (Array.isArray(oneItemAsAnArray)) {
            const len = Math.min(oneItemAsAnArray.length, textFieldArray.length); // Use the shorter length to avoid errors
            for (let j = 0; j < len; j++) {
                if (textFieldArray[j]) { // Check if field name exists
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
}


// Helper function (can be outside if preferred, ensure it's accessible)
function _createEachExpenseEntity(outerArray, expenseFieldArray) {
    const convertedArray = [];
    if (!Array.isArray(outerArray) || !Array.isArray(expenseFieldArray)) {
        console.error("Invalid input for _createEachExpenseEntity: Inputs must be arrays.");
        return convertedArray;
    }
    for (let i = 0; i < outerArray.length; i++) {
        const oneItemAsAnArray = outerArray[i];
        const oneItemAsObjLit = {};
        // Ensure oneItemAsAnArray is also an array
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
                if (!isNaN(converted)) { // Use isNaN for number check
                    oneItemAsObjLit['amount'] = converted;
                } else {
                    console.warn(`_createEachExpenseEntity: Invalid number for amount at index ${i}. Setting to 0.`);
                    oneItemAsObjLit['amount'] = 0; // Default to 0 if conversion fails
                }
            }

            oneItemAsObjLit['id'] = '' + i;  // Add a unique id
            convertedArray.push(oneItemAsObjLit);
        } else {
            console.warn(`_createEachExpenseEntity: Item at index ${i} is not an array:`, oneItemAsAnArray);
        }
    }
    return convertedArray;
}


corticon.dynForm.StepsController = function () {
    // State variables
    let itsDecisionServiceInput = [{}, {}]; // [0] = Control/Meta Data, [1] = Form Data
    let itsPathToData = null; // Path within itsDecisionServiceInput[1] where form data is nested
    let itsFormData = {}; // Reference to the actual form data object (itsDecisionServiceInput[1] or a nested object)
    let itsFlagAllDone = false;
    let itsLabelPositionAtUILevel = "Above"; // Default label position
    let itsQuestionnaireName = null;
    let itsInitialLanguage = null;
    let itsFlagRenderWithKui = false; // Kendo UI flag

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

        if (saveInputToFormData) {
            // 1. Validate Current Step Inputs
            if (!validateForm(baseDynamicUIEl)) {
                console.log("Validation failed. Staying on current step.");
                return; // Stop if validation fails
            }
            // 2. Save Current Step Inputs
            _saveEnteredInputsToFormData(baseDynamicUIEl); // Saves non-array and array types
        } else {
            console.log("Skipping input saving for this step transition.");
        }

        corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.NEW_STEP); // Event indicating transition starts

        // 4. Check if 'Done' flag was set by the *previous* DS call
        if (itsFlagAllDone) {
            console.log("Form is marked as done. Handling completion.");
            handleFormCompletion(decisionServiceEngine); // Pass engine if needed for final post
            return;
        }

        // 5. Prepare for and Execute Decision Service for the *Next* Step
        await handleDecisionServiceStep(decisionServiceEngine, baseDynamicUIEl);
    }


    /**
     * Handles the interaction with the decision service for a step transition.
     * Prepares payload, calls DS, processes response (renders UI or loops for no-UI steps), saves restart data.
     * @param {Object} decisionServiceEngine - The Corticon engine instance.
     * @param {Object} baseDynamicUIEl - The jQuery element to render UI into.
     */
    async function handleDecisionServiceStep(decisionServiceEngine, baseDynamicUIEl) {
        // Determine the next stage number (usually from the previous DS response)
        let nextStageNumber = itsDecisionServiceInput[0]?.nextStageNumber ?? (itsDecisionServiceInput[0]?.currentStageNumber + 1); // Calculate next if not provided
        console.log(`Preparing payload for stage: ${nextStageNumber}`);
        _preparePayloadForNextStage(nextStageNumber); // Sets itsDecisionServiceInput[0].currentStageNumber

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

        // After loop (or if first step had UI), check final state
        if (nextUI) { // If DS call was successful (even if it resulted in no UI render)
            // Update the 'done' flag based on the *last* DS response processed
            itsFlagAllDone = nextUI.done === true;

            // Save restart data based on the final state of itsDecisionServiceInput for this step transition
            saveRestartData(itsQuestionnaireName, JSON.stringify(itsDecisionServiceInput));
            console.log(`Restart data saved. Is form done? ${itsFlagAllDone}`);

            if (itsFlagAllDone) {
                corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.FORM_DONE); // Raise event immediately if done
                // Potentially trigger completion handling right away? Or wait for next 'Next' click?
                // Current logic triggers completion on the *next* click via processNextStep check.
            }

            // Update history status (empty/not empty) for UI buttons
            corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.HISTORY_STATUS_CHANGED, { historyEmpty: itsHistory.isHistoryEmpty() });

        } else {
            console.error("Error occurred during decision service step processing. Form flow might be interrupted.");
            // Potentially show error message in UI
            baseDynamicUIEl.empty().append('<div class="error-message">An error occurred processing the form. Please try again later.</div>');
        }
    }


    /**
     * Handles the logic for moving to the previous step using history.
     * @param {Object} baseDynamicUIEl - The jQuery element to render UI into.
     * @param {Object} decisionServiceEngine - The Corticon engine instance.
     * @param {String} language - Current language.
     */
    async function processPrevStep(baseDynamicUIEl, decisionServiceEngine, language) {
        console.log("Processing Previous Step...");
        if (itsFlagAllDone) {
            console.log("Form is marked done, cannot go back.");
            // Maybe re-enable form if going back should undo 'done'? Requires thought.
            return;
        }

        const previousStateData = itsHistory.getPreviousStageData(); // Pops from history stack

        if (!previousStateData || !previousStateData.input) {
            console.log("History is empty. Cannot go back further.");
            corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.BACK_AT_FORM_BEGINNING);
            corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.HISTORY_STATUS_CHANGED, { historyEmpty: itsHistory.isHistoryEmpty() });
            return; // At the beginning
        }

        console.log(`Restoring state for previous stage: ${previousStateData.stage}`);

        // Restore the entire state (control and form data) from history
        itsDecisionServiceInput = previousStateData.input;
        // Ensure itsFormData references the restored form data
        itsFormData = itsDecisionServiceInput[1] || {};
        // Restore path to data from the restored control data
        itsPathToData = itsDecisionServiceInput[0]?.pathToData ?? null;
        // Reset 'done' flag as we are going back
        itsFlagAllDone = false;

        console.log("State restored from history. Control Data:", JSON.stringify(itsDecisionServiceInput[0]), "Form Data:", JSON.stringify(itsDecisionServiceInput[1]));

        // Save this restored state as the current restart point BEFORE rendering
        saveRestartData(itsQuestionnaireName, JSON.stringify(itsDecisionServiceInput));

        // Re-render the UI for the restored stage
        // We use _askDecisionServiceForNextUIElementsAndRender, but the payload *is* the restored state.
        // The DS might re-evaluate based on this state, potentially changing the UI slightly
        // compared to when it was first visited (if rules depend on later data that's now gone).
        // We need to ensure the payload reflects the stage we are *going back to*.
        // The `previousStateData.input[0].currentStageNumber` should already be correct.
        const restoredStageNumber = itsDecisionServiceInput[0]?.currentStageNumber;
        console.log(`Re-rendering UI for restored stage: ${restoredStageNumber}`);

        // Directly call rendering function - bypass DS call if we just want to show history state?
        // OR call DS with the restored state to allow re-evaluation? Let's call DS for consistency.
        const renderedUI = await _askDecisionServiceForNextUIElementsAndRender(decisionServiceEngine, itsDecisionServiceInput, baseDynamicUIEl);

        if (renderedUI && renderedUI.noUiToRenderContinue === true) {
            // This scenario is tricky when going back. If the restored step was a no-UI step,
            // should we automatically go back further? For now, let's just render the next *visible* step back.
            // The current logic might just re-render the UI *after* the no-UI step because
            // _askDecisionServiceForNextUIElementsAndRender handles the continuation.
            console.warn(`Restored to a 'no-UI' step (${restoredStageNumber}). The UI for the subsequent step might be shown.`);
            // This might require more sophisticated history management if perfect back-stepping over no-UI is needed.
        }

        // Update history button state
        corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.HISTORY_STATUS_CHANGED, { historyEmpty: itsHistory.isHistoryEmpty() });

        // Check if we are now at the very beginning
        if (itsHistory.isHistoryEmpty()) {
            corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.BACK_AT_FORM_BEGINNING);
        }
    }

    /**
     * Handles the final actions when the form is completed.
     * Clears restart data, raises event, optionally posts data.
      * @param {Object} decisionServiceEngine - The Corticon engine instance (passed if needed).
     */
    function handleFormCompletion(decisionServiceEngine) { // Added engine param
        console.log("Form Completed. Final Form Data:", JSON.stringify(itsFormData, null, 2));
        clearRestartData(itsQuestionnaireName); // Clear persistence
        corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.AFTER_DONE, itsFormData); // Send final data with event

        // --- Optional: Post data based on DS instruction ---
        const postInfo = itsDecisionServiceInput[0]?.postInfo; // Look for post instructions in control data
        if (postInfo && postInfo.postType === 'REST' && postInfo.postURL) {
            console.log(`Attempting REST POST to: ${postInfo.postURL}`);
            const postData = JSON.stringify(itsFormData); // Post the form data part

            // Default headers - allow override from postInfo if needed
            const headers = {
                "Content-Type": "application/json",
                ...(postInfo.headers || {}) // Merge custom headers from DS if provided
            };

            fetch(postInfo.postURL, {
                method: "POST", // Or allow override: postInfo.method || "POST"
                headers: headers,
                body: postData
            })
                .then(response => {
                    if (!response.ok) {
                        // Include status text for better error reporting
                        return response.text().then(text => {
                            throw new Error(`HTTP error! Status: ${response.status} ${response.statusText}. Body: ${text}`);
                        });
                    }
                    return response.json(); // Or response.text() depending on expected response
                })
                .then(data => {
                    console.log("Data successfully posted:", data);
                    alert("Form submitted successfully!"); // User feedback
                    corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.POST_SUCCESS, data);
                })
                .catch(error => {
                    console.error("Error posting data:", error);
                    alert(`Error submitting form: ${error.message}`); // User feedback
                    corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.POST_ERROR, error);
                });
        } else {
            console.log("No REST post instruction found or postType is not 'REST'.");
            // Provide default success feedback if no post is configured
            alert("Form completed!");
        }

        // Disable navigation buttons after completion?
        corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.DISABLE_NAVIGATION);
    }


    // --- Public Interface ---
    return {
        startDynUI: async function (baseDynamicUIEl, decisionServiceEngine, externalData, language, questionnaireName, useKui) {
            console.log(`Starting Dynamic UI: ${questionnaireName}, Lang: ${language}, KUI: ${useKui}`);
            itsFlagRenderWithKui = useKui;
            itsQuestionnaireName = questionnaireName;
            itsInitialLanguage = language;
            itsHistory.setupHistory(); // Reset history

            // Check for restart data
            const restartData = getRestartData(questionnaireName);
            let startFromBeginning = true; // Default
            let initialStageToRender = 0; // Default start stage

            if (restartData) {
                // Use confirm() which is blocking - consider using a modal for better UX
                if (confirm("Resume previous session?")) {
                    setStateFromRestartData(questionnaireName, restartData);
                    startFromBeginning = false;
                    initialStageToRender = itsDecisionServiceInput[0]?.currentStageNumber ?? 0; // Get stage from restored data
                    console.log(`Resuming from stage: ${initialStageToRender}`);
                } else {
                    clearRestartData(questionnaireName); // Clear if user chooses not to resume
                }
            }

            if (startFromBeginning) {
                setStateForStartFromBeginning(language, externalData); // Sets up payload for stage 0
                initialStageToRender = 0;
            }

            corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.BEFORE_START);

            // --- MODIFICATION START ---
            // Initial DS call and render FOR THE CORRECT STAGE (0 or restored stage)
            // Directly call rendering logic, DO NOT call handleDecisionServiceStep here.
            console.log(`Making initial call for stage: ${initialStageToRender}`);
            const initialUiData = await _askDecisionServiceForNextUIElementsAndRender(decisionServiceEngine, itsDecisionServiceInput, baseDynamicUIEl);

            // Handle if the very first step is 'done' or 'no-UI' (less common, but possible)
            if (initialUiData) {
                itsFlagAllDone = initialUiData.done === true;
                if (itsFlagAllDone) {
                    console.log("Form marked as done on initial load.");
                    corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.FORM_DONE);
                    handleFormCompletion(decisionServiceEngine); // Handle completion immediately
                } else if (initialUiData.noUiToRenderContinue === true) {
                    console.warn("Initial step was no-UI. Attempting to process next step automatically.");
                    // This might indicate an issue with the DS logic for stage 0/initial stage
                    // Or it's intentional, so we proceed like a 'Next' click
                    await handleDecisionServiceStep(decisionServiceEngine, baseDynamicUIEl); // Now call the handler
                } else {
                    // If initial step rendered UI, save restart data for it
                    saveRestartData(itsQuestionnaireName, JSON.stringify(itsDecisionServiceInput));
                    console.log("Initial UI rendered, restart data saved.");
                }
            } else {
                console.error("Failed to get initial UI data from decision service.");
                // Show error in UI?
                baseDynamicUIEl.empty().append('<div class="error-message">Failed to initialize the form.</div>');
            }
            // --- MODIFICATION END ---


            // Initial history status event
            corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.HISTORY_STATUS_CHANGED, { historyEmpty: itsHistory.isHistoryEmpty() });
            corticon.dynForm.raiseEvent(corticon.dynForm.customEvents.AFTER_START, { historyEmpty: itsHistory.isHistoryEmpty() }); // Keep original event if needed
        },
        processNextStep: processNextStep,
        processPrevStep: processPrevStep
        // No need to expose internal functions like _saveOneFormData etc.
    }
}