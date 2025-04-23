"use strict"; // Added for best practices

corticon.util.namespace("corticon.dynForm");

corticon.dynForm.UIControlsRenderer = function () {

    // --- Counters and Flags ---
    let nextUniqueInputId = 0;
    let nextExpenseId = 0;
    let nextTextId = 0;
    let itsFlagRenderWithKui = false;

    // --- HELPER: Get Base64 (defined within this scope for simplicity) ---
    /**
     * Reads a file and converts it to a Base64 encoded string (without data URL prefix).
     * @param {File} file - The File object to read.
     * @returns {Promise<Object|null>} - A promise that resolves with { filename: string, content: string } or null if error/no file.
     */
    async function getBase64FromFileHelper(file) { // Renamed slightly to avoid global conflict if included elsewhere
        if (!file) {
            return null;
        }
        // console.log(`[getBase64FromFileHelper] Processing file: ${file.name}`); // Optional logging

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const readerResult = reader.result;
                if (typeof readerResult !== 'string' || !readerResult.includes(',')) {
                    console.error(`[getBase64FromFileHelper] Invalid reader result for ${file.name}`);
                    resolve(null);
                    return;
                }
                const base64Content = readerResult.split(',')[1];
                if (!base64Content) {
                    console.error(`[getBase64FromFileHelper] Could not extract Base64 content for ${file.name}.`);
                    resolve(null);
                    return;
                }
                resolve({ filename: file.name, content: base64Content });
            };
            reader.onerror = error => {
                console.error(`[getBase64FromFileHelper] FileReader error for ${file.name}:`, error);
                reject(error);
            };
            reader.readAsDataURL(file);
        });
    }
    // --- END HELPER ---
    function getNextUniqueId() {
        nextUniqueInputId++;
        return "_" + nextUniqueInputId;
    }

    /**
     * Main entry point for rendering all containers and their UI controls.
     * Clears the base element and renders all containers and their controls.
     * @param {Array} containers - Array of container objects to render.
     * @param {Object} baseEl - The base element (jQuery object) where the UI will be rendered.
     * @param {String} labelPositionAtUILevel - Default label position for controls.
     * @param {String} language - Language for rendering (e.g., for localization).
     * @param {Boolean} useKui - Flag to determine if Kendo UI should be used.
     */
    function renderUI(containers, baseEl, labelPositionAtUILevel, language, useKui) {
        itsFlagRenderWithKui = useKui; // Set the flag

        // Clear the base element
        baseEl.empty();

        // Apply styling
        if (itsFlagRenderWithKui) {
            baseEl.addClass('k-content');
        } else {
            baseEl.addClass('dynUIContainerColors');
        }

        // Render each container
        if (containers && Array.isArray(containers)) {
            containers.forEach(container => {
                // Basic check for container validity
                if (container && typeof container === 'object' && container.id) {
                    renderUIForOneContainer(container, baseEl, labelPositionAtUILevel, language);
                } else {
                    console.warn("Skipping invalid container object:", container);
                }
            });
        } else {
            console.error("RenderUI called with invalid containers data:", containers);
            // Optionally display an error in the UI
            baseEl.append('<p class="error-message">Error loading form sections.</p>');
        }

        // Set focus to the first input element, if available
        // Use setTimeout to ensure elements are fully in DOM, especially after KUI widgets initialize
        setTimeout(() => {
            // More specific selector: first visible, enabled input/select/textarea not inside a hidden container
            const firstFocusable = baseEl.find('.inputContainer:visible :input:visible:enabled:first');
            if (firstFocusable.length > 0) {
                try {
                    firstFocusable[0].focus();
                    console.log("Focus set to:", firstFocusable[0]);
                } catch (e) {
                    console.warn("Could not set focus to first element:", e);
                }
            } else {
                console.log("No focusable input element found in the rendered UI.");
            }
        }, 100); // Small delay might be necessary for complex DOM/KUI scenarios

    }

    /**
     * Renders a single container and its UI controls.
     * @param {Object} container - The container object to render.
     * @param {Object} baseEl - The base element (jQuery object) where the container will be rendered.
     * @param {String} labelPositionAtUILevel - Default label position for controls.
     * @param {String} language - Language for rendering (e.g., for localization).
     */
    function renderUIForOneContainer(container, baseEl, labelPositionAtUILevel, language) {
        // --- Create the container element ---
        // Use jQuery for safer attribute handling and DOM manipulation
        const containerDiv = $('<div>')
            .attr('id', container.id) // Set ID
            .attr('title', container.title || ''); // Set title, default to empty string if undefined

        if (itsFlagRenderWithKui) {
            containerDiv.addClass('k-content'); // Add Kendo class if needed
        }

        // Add title heading - check if title exists
        if (container.title) {
            containerDiv.append($('<h3>').text(container.title));
        }

        // Append the container to the base element
        baseEl.append(containerDiv); // Append the created containerDiv


        // --- Render UI Controls ---
        const uiControls = container.uiControls;
        // Check if uiControls is a valid array
        if (!uiControls || !Array.isArray(uiControls)) {
            console.warn(`Container '${container.id}' has no valid UI Controls array.`);
            // Render validation message even if no controls (might be container-level message)
            renderContainerValidationMessage(container.validationMsg, containerDiv); // Append to containerDiv
            return; // Stop processing this container
        }

        // Render each UI control
        uiControls.forEach(oneUIControl => {
            // Basic check for control validity
            if (!oneUIControl || typeof oneUIControl !== 'object' || !oneUIControl.type) {
                console.warn(`Skipping invalid UI control object in container '${container.id}':`, oneUIControl);
                return; // Skip this control, continue with the next
            }

            // Select the correct rendering function based on type
            switch (oneUIControl.type) {
                case 'Text':
                    renderTextInput(oneUIControl, containerDiv, labelPositionAtUILevel); // Pass containerDiv
                    break;
                case 'TextArea':
                    renderTextAreaInput(oneUIControl, containerDiv, labelPositionAtUILevel);
                    break;
                case 'DateTime':
                    renderDateTimeInput(oneUIControl, containerDiv, labelPositionAtUILevel);
                    break;
                case 'YesNo':
                case 'YesNoBoolean':
                    renderYesNoInput(oneUIControl, containerDiv, labelPositionAtUILevel, language, oneUIControl.type);
                    break;
                case 'ReadOnlyText':
                    renderReadOnlyText(oneUIControl, containerDiv, labelPositionAtUILevel);
                    break;
                case 'Number':
                    renderNumberInput(oneUIControl, containerDiv, labelPositionAtUILevel);
                    break;
                case 'SingleChoice':
                    renderSingleChoiceInput(oneUIControl, containerDiv); // Pass containerDiv
                    break;
                case 'MultipleChoices':
                case 'MultipleChoicesMultiSelect':
                    renderMultipleChoicesInput(oneUIControl, containerDiv, labelPositionAtUILevel);
                    break;
                case 'MultiExpenses':
                    renderExpenseInput(oneUIControl, containerDiv, labelPositionAtUILevel);
                    break;
                case 'FileUpload':
                    renderFileUploadInput(oneUIControl, containerDiv, labelPositionAtUILevel);
                    break;
                case 'FileUploadExpenses':
                    renderFileUploadExpenseInput(oneUIControl, containerDiv, labelPositionAtUILevel);
                    break;
                case 'QRCode':
                    renderQRCode(oneUIControl, containerDiv, labelPositionAtUILevel);
                    break;
                case 'Geolocation': // <--- Added Geolocation
                    renderGeolocationInput(oneUIControl, containerDiv, labelPositionAtUILevel);
                    break;
                case 'Rating':
                    renderRating(oneUIControl, containerDiv, labelPositionAtUILevel);
                    break;
                case 'MultiText':
                    renderMultiTextInput(oneUIControl, containerDiv, labelPositionAtUILevel);
                    break;
                default:
                    console.warn(`UI control type not supported: ${oneUIControl.type} (ID: ${oneUIControl.id})`);
                    // Optionally render a placeholder or error message for unsupported types
                    const errorEl = createInputContainer(containerDiv);
                    appendLabel({ label: `Unsupported Control (${oneUIControl.type})`, id: oneUIControl.id }, labelPositionAtUILevel, errorEl);
                    errorEl.append(`<span class="error-message">Control type '${oneUIControl.type}' is not configured.</span>`);
            }
        });

        // Render any container-level validation message at the end of the container
        renderContainerValidationMessage(container.validationMsg, containerDiv); // Append to containerDiv
    }

    /**
     * Renders a text input control (potentially as part of an array).
     * Delegates to renderInputThatSupportsArrayType.
     * @param {Object} oneUIControl - The UI control object.
     * @param {Object} parentEl - The parent jQuery element (the specific container div).
     * @param {String} labelPositionAtContainerLevel - Default label position.
     */
    function renderTextInput(oneUIControl, parentEl, labelPositionAtContainerLevel) {
        renderInputThatSupportsArrayType(oneUIControl, parentEl, labelPositionAtContainerLevel);
    }

    /**
     * Renders a number input control (potentially as part of an array).
     * Delegates to renderInputThatSupportsArrayType.
     * @param {Object} oneUIControl - The UI control object.
     * @param {Object} parentEl - The parent jQuery element.
     * @param {String} labelPositionAtContainerLevel - Default label position.
     */
    function renderNumberInput(oneUIControl, parentEl, labelPositionAtContainerLevel) {
        renderInputThatSupportsArrayType(oneUIControl, parentEl, labelPositionAtContainerLevel);
    }

    /**
     * Renders a DateTime input control (potentially as part of an array).
     * Delegates to renderInputThatSupportsArrayType.
     * @param {Object} oneUIControl - The UI control object.
     * @param {Object} parentEl - The parent jQuery element.
     * @param {String} labelPositionAtContainerLevel - Default label position.
     */
    function renderDateTimeInput(oneUIControl, parentEl, labelPositionAtContainerLevel) {
        renderInputThatSupportsArrayType(oneUIControl, parentEl, labelPositionAtContainerLevel);
    }

    /**
     * Renders a Yes/No select dropdown control.
     * @param {Object} oneUIControl - The UI control object.
     * @param {Object} parentEl - The parent jQuery element.
     * @param {String} labelPositionAtContainerLevel - Default label position.
     * @param {String} language - Current language for 'Yes'/'No' text.
     * @param {String} type - 'YesNo' (saves 'yes'/'no') or 'YesNoBoolean' (saves 'T'/'F').
     */
    function renderYesNoInput(oneUIControl, parentEl, labelPositionAtContainerLevel, language, type) {
        const inputContainerEl = createInputContainer(parentEl, oneUIControl); // Append to the specific parentEl

        let yes = 'Yes';
        let no = 'No';
        // Basic localization example
        if (language && language.toLowerCase() === 'italian') {
            yes = 'Si';
            // No translation needed? no = 'No';
        } else if (language && language.toLowerCase() === 'french') {
            yes = 'Oui';
            no = 'Non';
        } // Add other languages as needed

        appendLabel(oneUIControl, labelPositionAtContainerLevel, inputContainerEl);

        let yesValue, noValue;
        if (type === 'YesNo') {
            yesValue = 'yes';
            noValue = 'no';
        } else if (type === 'YesNoBoolean') {
            yesValue = 'T'; // True value
            noValue = 'F'; // False value
        } else {
            console.error("Invalid type for YesNo input:", type);
            return; // Don't render if type is wrong
        }

        // Use jQuery to create select for better handling
        const selectEl = $('<select>')
            .attr("id", oneUIControl.id); // Use control ID for select ID

        // Add options
        selectEl.append($('<option>').val(yesValue).text(yes));
        selectEl.append($('<option>').val(noValue).text(no));

        // --- Set Data Attributes ---
        if (oneUIControl.fieldName) {
            selectEl.data("fieldName", oneUIControl.fieldName);
        } else {
            console.error(`Missing fieldName for YesNo control: ID ${oneUIControl.id}`);
            // Optionally add visual indicator of error
        }
        // Mark the type for saving logic if needed (e.g., if conversion differs)
        selectEl.data("controlType", type); // e.g., 'YesNo' or 'YesNoBoolean'

        // Add required attribute if specified
        if (oneUIControl.required === true) {
            selectEl.attr('data-required', true);
        }

        // --- Set Default Value ---
        if (oneUIControl.value !== undefined && oneUIControl.value !== null) {
            // Normalize potential boolean true/false to 'T'/'F' if type is YesNoBoolean
            let defaultValue = oneUIControl.value;
            if (type === 'YesNoBoolean') {
                if (defaultValue === true) defaultValue = 'T';
                if (defaultValue === false) defaultValue = 'F';
            }
            selectEl.val(defaultValue); // Set selected option based on value
        } else {
            // Default to 'No'/'F' if no value provided? Or add a placeholder?
            // selectEl.val(noValue); // Uncomment to default to No/F
        }


        inputContainerEl.append(selectEl); // Append the select element

        // Apply Kendo UI if enabled
        if (itsFlagRenderWithKui) {
            try {
                selectEl.kendoDropDownList();
            } catch (e) {
                console.error("Error applying Kendo DropDownList:", e);
            }
        }

        // Add validation message placeholder from DS
        addValidationMsgFromDecisionService(oneUIControl, inputContainerEl);
    }

    /**
     * Renders a non-editable text display.
     * @param {Object} oneUIControl - The UI control object.
     * @param {Object} parentEl - The parent jQuery element.
     * @param {String} labelPositionAtContainerLevel - Default label position.
     */
    function renderReadOnlyText(oneUIControl, parentEl, labelPositionAtContainerLevel) {
        const inputContainerEl = createInputContainer(parentEl, oneUIControl);
        appendLabel(oneUIControl, labelPositionAtContainerLevel, inputContainerEl);

        // Ensure value exists and is not empty before rendering
        if (oneUIControl.value !== undefined && oneUIControl.value !== null && String(oneUIControl.value).length > 0) {
            // Use text() for safety against HTML injection if value is user-generated
            const textDiv = $('<div>').addClass('readOnlyText').text(oneUIControl.value);
            inputContainerEl.append(textDiv);
        } else {
            // Handle missing or empty value - maybe render a placeholder or nothing
            console.warn(`ReadOnlyText control ID ${oneUIControl.id} has no value to display.`);
            // Optional: Render a placeholder like '-'
            const placeholderDiv = $('<div>').addClass('readOnlyText').text('-');
            inputContainerEl.append(placeholderDiv);
        }
        // ReadOnlyText usually doesn't have validation messages, but add if needed
        addValidationMsgFromDecisionService(oneUIControl, inputContainerEl);
    }


    //--- Renders controls that support being single or multiple (array) ---
    /**
    * Renders controls like Text, Number, DateTime that can be single or arrays.
    * Creates the initial input and adds a '+' button if it's an array type.
    * @param {Object} oneUIControl - The UI control configuration.
    * @param {Object} parentEl - The parent jQuery element to append to.
    * @param {String} labelPositionAtContainerLevel - Default label position.
    */
    function renderInputThatSupportsArrayType(oneUIControl, parentEl, labelPositionAtContainerLevel) {
        const isArray = isArrayType(oneUIControl);
        // Create main container for this control (label + inputs)
        const mainControlContainer = createInputContainer(parentEl, oneUIControl, isArray, false); // Pass parentEl
        mainControlContainer.data("uicontroltype", oneUIControl.type); // Store type for saving logic

        // Add the label to the main container
        appendLabel(oneUIControl, labelPositionAtContainerLevel, mainControlContainer);

        // Container specifically for the input elements (needed for adding more in array case)
        const inputsWrapper = $('<div>').addClass('inputs-wrapper');
        mainControlContainer.append(inputsWrapper);


        // Render the first input element
        let createFunction;
        let addFunction;

        switch (oneUIControl.type) {
            case 'Text':
                createFunction = createOneTextInput;
                addFunction = createAddTextInput; // Function to add more text inputs
                break;
            case 'Number':
                createFunction = createOneNumberInput;
                addFunction = createAddNumberInput;
                break;
            case 'DateTime':
                createFunction = createOneDateTimeInput;
                addFunction = createAddDateTimeInput;
                break;
            default:
                console.error(`Unsupported type in renderInputThatSupportsArrayType: ${oneUIControl.type}`);
                inputsWrapper.append(`<span class="error-message">Unsupported control type: ${oneUIControl.type}</span>`);
                return;
        }

        // Create the first input instance inside the inputsWrapper
        createFunction(oneUIControl, labelPositionAtContainerLevel, inputsWrapper, false); // Add first input without break

        // If it's an array type, add the '+' button
        if (isArray && addFunction) {
            // Pass the wrapper for inputs and the create function to the add button logic
            addFunction(mainControlContainer, oneUIControl, inputsWrapper, labelPositionAtContainerLevel, createFunction);
        }

        // Add DS validation message at the end of the main container
        addValidationMsgFromDecisionService(oneUIControl, mainControlContainer);
    }


    /**
     * Creates a single Text input element.
     * @param {Object} oneUIControl - Control configuration.
     * @param {String} labelPositionAtContainerLevel - Label position (not directly used here).
     * @param {Object} inputsWrapperEl - The jQuery element to append the input to.
     * @param {Boolean} [addBreak=false] - If true, wraps the input in a div (for array layout).
     */
    function createOneTextInput(oneUIControl, labelPositionAtContainerLevel, inputsWrapperEl, addBreak = false) {
        const inputId = oneUIControl.id + getNextUniqueId(); // Ensure unique ID for each input
        const attributes = {
            "type": "text",
            "id": inputId,
            "title": oneUIControl.tooltip || '', // Tooltip
            "placeholder": oneUIControl.placeholder || '' // Placeholder
        };

        const textInputEl = $('<input/>').attr(attributes);

        // --- Data Attributes ---
        if (oneUIControl.fieldName) {
            textInputEl.data("fieldName", oneUIControl.fieldName);
        } else {
            console.error(`Missing fieldName for Text input: ID ${oneUIControl.id}`);
        }
        // Mark if this is part of an array input for saving logic
        if (isArrayType(oneUIControl)) {
            textInputEl.data("isArrayElement", true);
        }
        if (oneUIControl.required === true) {
            textInputEl.attr('data-required', true);
        }

        // --- Default Value ---
        // If it's the *first* input of an array, use value. Otherwise, could leave empty.
        const isFirstElement = inputsWrapperEl.children().length === 0; // Check if it's the first being added
        if (isFirstElement && oneUIControl.value !== undefined && oneUIControl.value !== null) {
            textInputEl.val(oneUIControl.value);
        }


        // Append to wrapper, potentially inside a div for layout
        if (addBreak) {
            const breakEl = $('<div>').addClass('array-input-item'); // Add class for styling array items
            breakEl.append(textInputEl);
            // Optionally add a remove button here
            inputsWrapperEl.append(breakEl);
        } else {
            // If it's the first element and potentially an array, wrap it too for consistency
            if (isArrayType(oneUIControl)) {
                const breakEl = $('<div>').addClass('array-input-item');
                breakEl.append(textInputEl);
                inputsWrapperEl.append(breakEl);
            } else {
                inputsWrapperEl.append(textInputEl); // Append directly if not array
            }
        }

        // Apply Kendo UI if needed
        if (itsFlagRenderWithKui) {
            try {
                textInputEl.kendoTextBox();
            } catch (e) { console.error("Error applying Kendo TextBox:", e); }
        }
    }


    /**
    * Creates a single Number input element.
    * @param {Object} oneUIControl - Control configuration.
    * @param {String} labelPositionAtContainerLevel - Label position (not directly used here).
    * @param {Object} inputsWrapperEl - The jQuery element to append the input to.
    * @param {Boolean} [addBreak=false] - If true, wraps the input in a div (for array layout).
    */
    function createOneNumberInput(oneUIControl, labelPositionAtContainerLevel, inputsWrapperEl, addBreak = false) {
        const inputId = oneUIControl.id + getNextUniqueId();
        // Kendo NumericTextBox handles validation better, use type="text" for broader compatibility initially
        const attributes = {
            "type": "text", // Use "text" and let Kendo handle number specifics if KUI is used
            "id": inputId,
            "title": oneUIControl.tooltip || '',
            "placeholder": oneUIControl.placeholder || ''
            // Add min/max attributes for native HTML5 validation if not using KUI
            // "min": oneUIControl.min,
            // "max": oneUIControl.max,
            // "step": oneUIControl.step || 'any' // Allow decimals by default
        };

        const numberInputEl = $('<input/>').attr(attributes);

        // --- Data Attributes ---
        if (oneUIControl.fieldName) {
            numberInputEl.data("fieldName", oneUIControl.fieldName);
            numberInputEl.data("type", oneUIControl.dataType || "decimal"); // Store type: decimal/integer
        } else {
            console.error(`Missing fieldName for Number input: ID ${oneUIControl.id}`);
        }
        if (isArrayType(oneUIControl)) {
            numberInputEl.data("isArrayElement", true);
        }
        if (oneUIControl.required === true) {
            numberInputEl.attr('data-required', true);
        }


        // --- Default Value ---
        const isFirstElement = inputsWrapperEl.children().length === 0;
        if (isFirstElement && oneUIControl.value !== undefined && oneUIControl.value !== null) {
            numberInputEl.val(oneUIControl.value);
        }

        // --- Append ---
        const wrapperDiv = $('<div>').addClass('array-input-item'); // Always wrap for consistency
        wrapperDiv.append(numberInputEl);

        // --- Validation Hint ---
        let validationHint = '';
        if (oneUIControl.min !== undefined && oneUIControl.max !== undefined) {
            validationHint = `Enter a number between ${oneUIControl.min} and ${oneUIControl.max}.`;
        } else if (oneUIControl.min !== undefined) {
            validationHint = `Enter a number >= ${oneUIControl.min}.`;
        } else if (oneUIControl.max !== undefined) {
            validationHint = `Enter a number <= ${oneUIControl.max}.`;
        }
        if (validationHint) {
            // Add hint visually separate from DS validation message if possible
            const hintEl = $('<span>').addClass('field-validation-hint').text(validationHint).hide(); // Initially hidden
            wrapperDiv.append(hintEl);
            // Optional: Show hint on focus/interaction if desired
            numberInputEl.on('focus', () => hintEl.fadeIn());
            numberInputEl.on('blur', () => hintEl.fadeOut());
        }

        inputsWrapperEl.append(wrapperDiv);


        // --- Apply Kendo UI ---
        if (itsFlagRenderWithKui) {
            try {
                numberInputEl.kendoNumericTextBox({
                    min: oneUIControl.min,
                    max: oneUIControl.max,
                    step: oneUIControl.step, // Control step (e.g., 1 for integers)
                    format: oneUIControl.format || "n", // Kendo format string (e.g., "n0" for integer)
                    decimals: oneUIControl.decimals, // Specify decimals if needed
                    required: oneUIControl.required === true, // Pass required flag
                    value: (isFirstElement && typeof oneUIControl.value === 'number') ? oneUIControl.value : undefined // Set Kendo value
                });
            } catch (e) { console.error("Error applying Kendo NumericTextBox:", e); }
        } else {
            // Add basic input event listener for non-KUI validation feedback if needed
            numberInputEl.on("input", function () {
                // Basic client-side check (Kendo does this better)
                const inputVal = $(this).val();
                if (inputVal && isNaN(Number(inputVal))) {
                    // Maybe add/remove an error class?
                    console.warn("Non-numeric input detected (non-KUI)");
                }
            });
        }
    }


    /**
     * Creates a single DateTime input element.
     * @param {Object} oneUIControl - Control configuration.
     * @param {String} labelPositionAtContainerLevel - Label position (not directly used here).
     * @param {Object} inputsWrapperEl - The jQuery element to append the input to.
     * @param {Boolean} [addBreak=false] - If true, wraps the input in a div (for array layout).
     */
    function createOneDateTimeInput(oneUIControl, labelPositionAtContainerLevel, inputsWrapperEl, addBreak = false) {
        let inputType;
        let kendoWidget;
        let kendoFormat = 'yyyy-MM-dd'; // Default Date format
        let dataTypeTag = "datetag"; // For saving logic

        if (oneUIControl.showTime === true) {
            inputType = 'datetime-local';
            kendoWidget = 'kendoDateTimePicker';
            // Example format including time - adjust as needed
            kendoFormat = 'yyyy-MM-dd HH:mm'; // Or use 'u' for UTC pattern
            dataTypeTag = "datetimetag";
        } else {
            inputType = 'date';
            kendoWidget = 'kendoDatePicker';
            // kendoFormat remains 'yyyy-MM-dd'
            // dataTypeTag remains 'datetag'
        }

        const inputId = oneUIControl.id + getNextUniqueId();
        const attributes = {
            "type": inputType, // Use appropriate HTML5 type
            "id": inputId,
            "title": oneUIControl.tooltip || '',
            // Min/Max for native date pickers
            "min": oneUIControl.minDT ? oneUIControl.minDT.substring(0, 16) : undefined, // Format YYYY-MM-DDTHH:mm
            "max": oneUIControl.maxDT ? oneUIControl.maxDT.substring(0, 16) : undefined
        };

        const dateInputEl = $('<input/>').attr(attributes);

        // --- Data Attributes ---
        if (oneUIControl.fieldName) {
            dateInputEl.data("fieldName", oneUIControl.fieldName);
            dateInputEl.data("type", dataTypeTag); // Tag for saving logic (datetag/datetimetag)
        } else {
            console.error(`Missing fieldName for DateTime input: ID ${oneUIControl.id}`);
        }
        if (isArrayType(oneUIControl)) {
            dateInputEl.data("isArrayElement", true);
        }
        if (oneUIControl.required === true) {
            dateInputEl.attr('data-required', true);
        }

        // --- Default Value Formatting (Crucial for Date Inputs) ---
        const isFirstElement = inputsWrapperEl.children().length === 0;
        if (isFirstElement && oneUIControl.value !== undefined && oneUIControl.value !== null) {
            try {
                // Assume value might be milliseconds or ISO string from DS
                const dateValue = new Date(oneUIControl.value);
                if (!isNaN(dateValue.getTime())) { // Check if date is valid
                    let formattedValue;
                    // Format for the specific input type
                    const year = dateValue.getFullYear();
                    const month = String(dateValue.getMonth() + 1).padStart(2, '0');
                    const day = String(dateValue.getDate()).padStart(2, '0');

                    if (inputType === 'datetime-local') {
                        const hours = String(dateValue.getHours()).padStart(2, '0');
                        const minutes = String(dateValue.getMinutes()).padStart(2, '0');
                        formattedValue = `${year}-${month}-${day}T${hours}:${minutes}`;
                    } else { // 'date'
                        formattedValue = `${year}-${month}-${day}`;
                    }
                    dateInputEl.val(formattedValue);
                } else {
                    console.warn(`Invalid default date value for ${oneUIControl.id}:`, oneUIControl.value);
                }
            } catch (e) {
                console.error(`Error parsing default date value for ${oneUIControl.id}:`, oneUIControl.value, e);
            }
        }

        // --- Append ---
        const wrapperDiv = $('<div>').addClass('array-input-item');
        wrapperDiv.append(dateInputEl);

        // --- Validation Hint ---
        let validationHint = '';
        const formatDateHint = (isoDate) => isoDate ? isoDate.substring(0, 10) : ''; // Helper to format YYYY-MM-DD
        const minHint = formatDateHint(oneUIControl.minDT);
        const maxHint = formatDateHint(oneUIControl.maxDT);

        if (minHint && maxHint) {
            validationHint = `Enter date between ${minHint} and ${maxHint}.`;
        } else if (minHint) {
            validationHint = `Enter date on or after ${minHint}.`;
        } else if (maxHint) {
            validationHint = `Enter date on or before ${maxHint}.`;
        }
        if (validationHint) {
            const hintEl = $('<span>').addClass('field-validation-hint').text(validationHint).hide();
            wrapperDiv.append(hintEl);
            dateInputEl.on('focus', () => hintEl.fadeIn());
            dateInputEl.on('blur', () => hintEl.fadeOut());
        }

        inputsWrapperEl.append(wrapperDiv);


        // --- Apply Kendo UI ---
        if (itsFlagRenderWithKui) {
            try {
                // Kendo uses Date objects for min/max/value
                const kendoOptions = {
                    format: kendoFormat,
                    min: oneUIControl.minDT ? new Date(oneUIControl.minDT) : undefined,
                    max: oneUIControl.maxDT ? new Date(oneUIControl.maxDT) : undefined,
                    // Set Kendo value only if default value was valid
                    value: (isFirstElement && oneUIControl.value && !isNaN(new Date(oneUIControl.value).getTime())) ? new Date(oneUIControl.value) : undefined
                };
                dateInputEl[kendoWidget](kendoOptions); // Call kendoDatePicker or kendoDateTimePicker
            } catch (e) {
                console.error(`Error applying Kendo widget (${kendoWidget}):`, e);
            }
        }
    }


    // --- Functions to add more inputs for array types ---

    /**
     * Creates the '+' button and attaches click handler to add another TEXT input.
     * @param {Object} mainControlContainer - The main container for the control (label + inputs).
     * @param {Object} oneUIControl - The control configuration.
     * @param {Object} inputsWrapperEl - The wrapper div where new inputs should be added.
     * @param {String} labelPositionAtContainerLevel - Label position.
     * @param {Function} createInputFunction - The function used to create a single input (e.g., createOneTextInput).
     */
    function createAddTextInput(mainControlContainer, oneUIControl, inputsWrapperEl, labelPositionAtContainerLevel, createInputFunction) {
        const addButton = createPlusButton(mainControlContainer); // Append button after the inputs wrapper
        addButton.on('click', function () {
            // Call the appropriate creation function, passing true for 'addBreak'
            createInputFunction(oneUIControl, labelPositionAtContainerLevel, inputsWrapperEl, true);
        });
    }

    /**
    * Creates the '+' button and attaches click handler to add another NUMBER input.
    * @param {Object} mainControlContainer - The main container for the control (label + inputs).
    * @param {Object} oneUIControl - The control configuration.
    * @param {Object} inputsWrapperEl - The wrapper div where new inputs should be added.
    * @param {String} labelPositionAtContainerLevel - Label position.
    * @param {Function} createInputFunction - The function used to create a single input (e.g., createOneNumberInput).
    */
    function createAddNumberInput(mainControlContainer, oneUIControl, inputsWrapperEl, labelPositionAtContainerLevel, createInputFunction) {
        const addButton = createPlusButton(mainControlContainer);
        addButton.on('click', function () {
            createInputFunction(oneUIControl, labelPositionAtContainerLevel, inputsWrapperEl, true);
        });
    }

    /**
     * Creates the '+' button and attaches click handler to add another DATETIME input.
     * @param {Object} mainControlContainer - The main container for the control (label + inputs).
     * @param {Object} oneUIControl - The control configuration.
     * @param {Object} inputsWrapperEl - The wrapper div where new inputs should be added.
     * @param {String} labelPositionAtContainerLevel - Label position.
     * @param {Function} createInputFunction - The function used to create a single input (e.g., createOneDateTimeInput).
     */
    function createAddDateTimeInput(mainControlContainer, oneUIControl, inputsWrapperEl, labelPositionAtContainerLevel, createInputFunction) {
        const addButton = createPlusButton(mainControlContainer);
        addButton.on('click', function () {
            createInputFunction(oneUIControl, labelPositionAtContainerLevel, inputsWrapperEl, true);
        });
    }


    /**
     * Creates the '+' button element.
     * @param {Object} parentEl - The element to append the button to.
     * @returns {Object} - The jQuery object for the created button.
     */
    function createPlusButton(parentEl) {
        // Use a button element for better accessibility
        const addButton = $('<button>')
            .attr('type', 'button') // Important to prevent form submission
            .addClass('add-array-item-button') // Class for styling
            .attr('title', 'Add another item')
            .html('&nbsp;+&nbsp;'); // Use html() for the plus sign

        parentEl.append(addButton); // Append it to the provided parent
        return addButton;
    }


    // --- Specific Complex Array Renderers (Expenses, MultiText) ---

    /**
    * Renders the initial structure for MultiExpenses input.
    * @param {Object} oneUIControl - Control configuration.
    * @param {Object} parentEl - Parent jQuery element.
    * @param {String} labelPositionAtContainerLevel - Label position.
    */
    function renderExpenseInput(oneUIControl, parentEl, labelPositionAtContainerLevel) {
        // Main container for the whole expense control (label + inputs + add button)
        const mainContainerEl = createInputContainer(parentEl, oneUIControl, true, true); // Mark as complex array
        mainContainerEl.data("uicontroltype", oneUIControl.type);
        appendLabel(oneUIControl, labelPositionAtContainerLevel, mainContainerEl);

        // Wrapper for the list of expense item rows
        const expenseItemsWrapper = $('<div>').addClass('expense-items-wrapper');
        mainContainerEl.append(expenseItemsWrapper);

        // Render the first expense item row
        createOneExpenseInput(oneUIControl, expenseItemsWrapper);

        // Add the '+' button to add more expense rows
        createAddExpenseControl(mainContainerEl, oneUIControl, expenseItemsWrapper); // Pass wrapper

        // Add DS validation message if any
        addValidationMsgFromDecisionService(oneUIControl, mainContainerEl);
    }

    /**
     * Creates the '+' button for adding more expense rows.
     * @param {Object} mainContainerEl - The main container of the expense control.
     * @param {Object} oneUIControl - Control configuration.
     * @param {Object} expenseItemsWrapper - The wrapper where new rows are added.
     */
    function createAddExpenseControl(mainContainerEl, oneUIControl, expenseItemsWrapper) {
        const addButton = createPlusButton(mainContainerEl); // Append button to main container
        addButton.on('click', function () {
            createOneExpenseInput(oneUIControl, expenseItemsWrapper); // Add new row to the wrapper
        });
    }


    /**
     * Creates a single row for an expense item (type dropdown, amount, currency).
     * @param {Object} oneUIControl - Control configuration.
     * @param {Object} expenseItemsWrapper - The wrapper element to append the new row to.
     */
    function createOneExpenseInput(oneUIControl, expenseItemsWrapper) {
        nextExpenseId++; // Use the counter declared at the top
        // Create a container div for this specific expense item row
        const itemRowEl = createInputContainer(expenseItemsWrapper, oneUIControl, true, true); // Still complex array item
        itemRowEl.addClass('expense-input-item'); // Add specific class for styling
        itemRowEl.data("uicontroltype", oneUIControl.type); // Redundant? Already on main container.

        // --- Expense Type Dropdown ---
        const typeId = `${oneUIControl.id}_expType_${nextExpenseId}`;
        const typeSelect = $('<select>').attr('id', typeId).addClass('expense-type-select');
        // Add options
        const theOptions = oneUIControl.option;
        if (theOptions && Array.isArray(theOptions)) {
            if (theOptions.length === 0) {
                console.warn(`Expense control ${oneUIControl.id} has empty options array.`);
                typeSelect.append($('<option>').text('No types configured').val(''));
            } else {
                // Optional: Add a default placeholder option
                // typeSelect.append($('<option>').text('-- Select Type --').val(''));
                theOptions.forEach(opt => {
                    typeSelect.append($('<option>').val(opt.value).text(opt.displayName));
                });
            }
        } else {
            console.error(`Missing or invalid options array for expense control ${oneUIControl.id}`);
            typeSelect.append($('<option>').text('Error: No types').val(''));
        }
        // Data attributes for saving
        if (oneUIControl.fieldName) {
            typeSelect.data("fieldName", oneUIControl.fieldName);
            typeSelect.data("subField", "expenseCode"); // Indicate which part of the object this is
            typeSelect.data("expenseItemId", nextExpenseId); // Link to this specific item
        }
        itemRowEl.append(typeSelect);


        // --- Amount Input ---
        const amountId = `${oneUIControl.id}_expAmount_${nextExpenseId}`;
        // Use type="text" and Kendo if available for better validation/formatting
        const amountInput = $('<input>')
            .attr({ type: 'text', id: amountId })
            .addClass('expense-amount-input');
        if (oneUIControl.fieldName) {
            amountInput.data("fieldName", oneUIControl.fieldName);
            amountInput.data("subField", "amount");
            amountInput.data("expenseItemId", nextExpenseId);
        }
        itemRowEl.append(amountInput);


        // --- Currency Dropdown ---
        // Check if currency options are needed/provided (could be optional)
        if (oneUIControl.showCurrency !== false) { // Assume true if not specified
            const currencyId = `${oneUIControl.id}_Currency_${nextExpenseId}`;
            const currencySelect = $('<select>').attr('id', currencyId).addClass('expense-currency-select');
            // Example currencies - ideally make this configurable via oneUIControl
            currencySelect.append($('<option>').val('USD').text('$ USD'));
            currencySelect.append($('<option>').val('EUR').text('€ EUR'));
            currencySelect.append($('<option>').val('GBP').text('£ GBP')); // Add more as needed

            if (oneUIControl.fieldName) {
                currencySelect.data("fieldName", oneUIControl.fieldName);
                currencySelect.data("subField", "currency");
                currencySelect.data("expenseItemId", nextExpenseId);
            }
            itemRowEl.append(currencySelect);

            // Default currency?
            currencySelect.val('USD'); // Example: Default to USD
        }


        // --- Apply Kendo UI ---
        if (itsFlagRenderWithKui) {
            try { typeSelect.kendoDropDownList(); } catch (e) { console.error("Kendo error (Expense Type):", e); }
            try { amountInput.kendoNumericTextBox({ format: "c2" }); } catch (e) { console.error("Kendo error (Expense Amount):", e); } // "c2" for currency format
            if (oneUIControl.showCurrency !== false) {
                try { currencySelect.kendoDropDownList(); } catch (e) { console.error("Kendo error (Expense Currency):", e); }
            }
        }

        // Optionally add a remove button for this row
        // const removeButton = $('<button>').text('X').addClass('remove-expense-item')...
        // itemRowEl.append(removeButton);
        // removeButton.on('click', () => itemRowEl.remove());

        expenseItemsWrapper.append(itemRowEl); // Append the complete row
    }


    /**
     * Renders the initial structure for MultiText input.
     * @param {Object} oneUIControl - Control configuration.
     * @param {Object} parentEl - Parent jQuery element.
     * @param {String} labelPositionAtContainerLevel - Label position.
     */
    function renderMultiTextInput(oneUIControl, parentEl, labelPositionAtContainerLevel) {
        const mainContainerEl = createInputContainer(parentEl, oneUIControl, true, true); // Complex array
        mainContainerEl.data("uicontroltype", oneUIControl.type);
        appendLabel(oneUIControl, labelPositionAtContainerLevel, mainContainerEl);

        const textItemsWrapper = $('<div>').addClass('multitext-items-wrapper');
        mainContainerEl.append(textItemsWrapper);

        // Render the first text input item
        createOneMultiTextInput(oneUIControl, textItemsWrapper);

        // Add the '+' button
        createAddMultiTextControl(mainContainerEl, oneUIControl, textItemsWrapper); // Pass wrapper

        addValidationMsgFromDecisionService(oneUIControl, mainContainerEl);
    }


    /**
     * Creates the '+' button for adding more text input rows in MultiText.
     * @param {Object} mainContainerEl - The main container of the MultiText control.
     * @param {Object} oneUIControl - Control configuration.
     * @param {Object} textItemsWrapper - The wrapper where new rows are added.
     */
    function createAddMultiTextControl(mainContainerEl, oneUIControl, textItemsWrapper) {
        const addButton = createPlusButton(mainContainerEl); // Append button to main container
        addButton.on('click', function () {
            createOneMultiTextInput(oneUIControl, textItemsWrapper); // Add new row to wrapper
        });
    }

    /**
     * Creates a single row (just an input field) for MultiText.
     * @param {Object} oneUIControl - Control configuration.
     * @param {Object} textItemsWrapper - The wrapper element to append the new row to.
     */
    function createOneMultiTextInput(oneUIControl, textItemsWrapper) {
        nextTextId++; // Use counter from top scope
        // Create a container div for this specific text item row
        const itemRowEl = createInputContainer(textItemsWrapper, oneUIControl, true, true); // Complex array item
        itemRowEl.addClass('multitext-input-item'); // Specific class
        itemRowEl.data("uicontroltype", oneUIControl.type); // May be redundant

        const inputId = `${oneUIControl.id}_text_${nextTextId}`;
        const attributes = {
            "type": "text",
            "id": inputId,
            "placeholder": oneUIControl.placeholder || ''
        };
        const textInputEl = $('<input/>').attr(attributes);

        if (oneUIControl.fieldName) {
            textInputEl.data("fieldName", oneUIControl.fieldName);
            textInputEl.data("subField", "textInput"); // Name of field within the object
            textInputEl.data("multiTextItemId", nextTextId); // Link to this item
        } else {
            console.error(`Missing fieldName for MultiText control: ID ${oneUIControl.id}`);
        }

        itemRowEl.append(textInputEl); // Add input to the row container

        // Apply Kendo UI if needed
        if (itsFlagRenderWithKui) {
            try { textInputEl.kendoTextBox(); } catch (e) { console.error("Kendo error (MultiText Input):", e); }
        }

        // Optional remove button
        // ...

        textItemsWrapper.append(itemRowEl); // Append row to the main wrapper
    }


    // --- Single Choice (Checkbox) ---
    /**
     * Renders a single checkbox control.
     * @param {Object} oneUIControl - Control configuration.
     * @param {Object} parentEl - Parent jQuery element.
     */
    function renderSingleChoiceInput(oneUIControl, parentEl) {
        const inputContainerEl = createInputContainer(parentEl, oneUIControl); // Not an array type

        // Use the control's ID for the input element - IMPORTANT for the label's 'for' attribute
        const inputId = oneUIControl.id;
        if (!inputId) { // Add check for missing ID
            console.error("Missing id for SingleChoice control.");
            inputContainerEl.append('<span class="error-message">Checkbox configuration error: Missing ID.</span>');
            return;
        }

        const attributes = {
            "type": "checkbox",
            "id": inputId, // Use the control's main ID
            "name": oneUIControl.fieldName || inputId
        };
        const checkboxInputEl = $('<input/>').attr(attributes);

        // --- Data Attributes ---
        if (oneUIControl.fieldName) {
            checkboxInputEl.data("fieldName", oneUIControl.fieldName);
        } else {
            console.error(`Missing fieldName for SingleChoice control: ID ${oneUIControl.id}`);
        }
        checkboxInputEl.data("controlType", "SingleChoice");
        if (oneUIControl.required === true) {
            checkboxInputEl.attr('data-required', true);
        }

        // --- Default Value ---
        if (oneUIControl.value !== undefined && oneUIControl.value !== null) {
            if ([true, 'true', 'yes', 'T', 'on', 1, '1'].includes(oneUIControl.value)) {
                checkboxInputEl.prop('checked', true);
            }
        }

        // --- Append Checkbox and Call appendLabel ---
        // Append checkbox FIRST
        inputContainerEl.append(checkboxInputEl);

        // THEN call appendLabel to create the label, icon, bubble, and attach handlers
        // Pass 'Side' as the default position, though CSS might override actual layout
        appendLabel(oneUIControl, 'Side', inputContainerEl);

        // --- Kendo UI (Optional - Check if needed for checkboxes) ---
        // if (itsFlagRenderWithKui) {
        //     try {
        //         // checkboxInputEl.kendoCheckBox(); // Check Kendo docs
        //     } catch (e) {
        //         console.error("Error applying Kendo CheckBox:", e);
        //     }
        // }

        // Add DS validation message (as before)
        addValidationMsgFromDecisionService(oneUIControl, inputContainerEl);
    }
    // --- File Upload ---
    /**
    * Renders a standard file input control.
    * MODIFIED: Reads file on change and stores data via stepsControllerInstance.
    * @param {Object} oneUIControl - Control configuration.
    * @param {Object} parentEl - Parent jQuery element.
    * @param {String} labelPositionAtContainerLevel - Label position.
    */
    function renderFileUploadInput(oneUIControl, parentEl, labelPositionAtContainerLevel) {
        const inputContainerEl = createInputContainer(parentEl, oneUIControl);
        appendLabel(oneUIControl, labelPositionAtContainerLevel, inputContainerEl);

        const inputId = oneUIControl.id; // Use the ID from the UI Control definition
        if (!inputId) {
            console.error('Missing id for fileupload control.');
            inputContainerEl.append('<span class="error-message">File upload configuration error: Missing ID.</span>');
            return;
        }
        const attributes = { type: "file", id: inputId, name: oneUIControl.fieldName || inputId };
        if (oneUIControl.accept) attributes["accept"] = oneUIControl.accept;
        if (oneUIControl.allowMultiple === true) attributes["multiple"] = true; // Note: current storage only handles single file

        const fileInputEl = $('<input/>').attr(attributes);

        if (oneUIControl.fieldName) fileInputEl.data("fieldName", oneUIControl.fieldName);
        else console.error(`Missing fieldName for FileUpload control: ID ${oneUIControl.id}`);

        fileInputEl.data("controlType", "FileUpload");
        if (oneUIControl.required === true) fileInputEl.attr('data-required', true);

        inputContainerEl.append(fileInputEl);

        // --- Feedback Element (Optional) ---
        const fileInfoEl = $('<span>').addClass('file-info').css('margin-left', '10px').text('(No file chosen)');
        inputContainerEl.append(fileInfoEl);

        // --- MODIFIED Change Handler ---
        fileInputEl.on('change', async function (event) { // Make handler async
            const inputElement = event.target;
            const files = inputElement.files;

            if (files && files.length > 0) {
                const file = files[0]; // Process only the first file if multiple are selected but not allowed
                if (oneUIControl.allowMultiple !== true && files.length > 1) {
                    console.warn(`Multiple files selected for ${inputId}, but only single file upload is currently handled by storage. Using first file: ${file.name}`);
                }
                fileInfoEl.text(`Processing: ${file.name}...`).css('color', 'orange'); // Update feedback

                try {
                    // Call helper to get base64 data
                    const fileData = await getBase64FromFileHelper(file); // Use helper IN THIS SCOPE

                    if (fileData) {
                        // Call the storage function on the StepsController instance
                        if (corticon.dynForm.stepsControllerInstance && typeof corticon.dynForm.stepsControllerInstance.storeTemporaryFile === 'function') {
                            corticon.dynForm.stepsControllerInstance.storeTemporaryFile(inputId, fileData); // Use inputId as key
                            fileInfoEl.text(`Stored: ${file.name}`).css('color', 'green');
                        } else {
                            console.error("StepsController instance or storeTemporaryFile function not found!");
                            fileInfoEl.text(`Error storing ${file.name}`).css('color', 'red');
                        }
                    } else {
                        console.error(`Failed to get Base64 for file: ${file.name}`);
                        fileInfoEl.text(`Error reading ${file.name}`).css('color', 'red');
                        // Clear stored data if reading fails
                        if (corticon.dynForm.stepsControllerInstance && typeof corticon.dynForm.stepsControllerInstance.storeTemporaryFile === 'function') {
                            corticon.dynForm.stepsControllerInstance.storeTemporaryFile(inputId, null); // Store null to clear it
                        }
                    }
                } catch (error) {
                    console.error(`Error in file change handler for ${inputId}:`, error);
                    fileInfoEl.text(`Error processing ${file.name}`).css('color', 'red');
                    // Clear stored data on error
                    if (corticon.dynForm.stepsControllerInstance && typeof corticon.dynForm.stepsControllerInstance.storeTemporaryFile === 'function') {
                        corticon.dynForm.stepsControllerInstance.storeTemporaryFile(inputId, null);
                    }
                }
            } else {
                // No file selected (or file deselected)
                fileInfoEl.text('(No file chosen)').css('color', ''); // Reset feedback
                // Clear stored data if file is removed
                if (corticon.dynForm.stepsControllerInstance && typeof corticon.dynForm.stepsControllerInstance.storeTemporaryFile === 'function') {
                    corticon.dynForm.stepsControllerInstance.storeTemporaryFile(inputId, null);
                    console.log(`Temporary file data cleared for ${inputId}`);
                }
            }
        });
        // --- END MODIFIED Change Handler ---


        // Apply Kendo UI if needed (Kendo might interfere with manual change handler - test carefully)
        if (itsFlagRenderWithKui) {
            // Kendo Upload might need different event handling ('select', 'success', 'error')
            console.warn("Kendo Upload might require different event handling than the basic 'change' listener for immediate Base64 conversion. Testing needed.");
            try {
                fileInputEl.kendoUpload({
                    multiple: oneUIControl.allowMultiple === true,
                    // Kendo async upload typically handles file transfer, not Base64 conversion directly in the browser
                    // If using Kendo async, you might not need the manual Base64 conversion above.
                    // If NOT using Kendo async, the basic input and change handler is likely better.
                });
            } catch (e) { console.error("Error applying Kendo Upload:", e); }
        }

        addValidationMsgFromDecisionService(oneUIControl, inputContainerEl);
    } // End renderFileUploadInput
    /**
     * Renders a file input specifically marked for associating with expenses.
     * (Assumes linking logic happens during data saving in stepsController).
     * @param {Object} oneUIControl - Control configuration.
     * @param {Object} parentEl - Parent jQuery element.
     * @param {String} labelPositionAtContainerLevel - Label position.
     */
    function renderFileUploadExpenseInput(oneUIControl, parentEl, labelPositionAtContainerLevel) {
        // Largely similar to renderFileUploadInput, but with a specific marker class
        const inputContainerEl = createInputContainer(parentEl, oneUIControl);
        appendLabel(oneUIControl, labelPositionAtContainerLevel, inputContainerEl);

        const inputId = oneUIControl.id;
        if (!inputId) {
            console.error('Missing id for FileUploadExpenses control.');
            inputContainerEl.append('<span class="error-message">File upload configuration error: Missing ID.</span>');
            return;
        }
        const attributes = {
            "type": "file",
            "id": inputId,
            "name": oneUIControl.fieldName || inputId,
            "class": "markerFileUploadExpense" // --- Specific class for identification ---
        };
        if (oneUIControl.accept) attributes["accept"] = oneUIControl.accept;
        if (oneUIControl.allowMultiple === true) attributes["multiple"] = true; // Can expenses have multiple files?

        const fileInputEl = $('<input/>').attr(attributes);

        if (oneUIControl.fieldName) {
            fileInputEl.data("fieldName", oneUIControl.fieldName); // Should match the expenses array field name
        } else {
            console.error(`Missing fieldName for FileUploadExpenses control: ID ${oneUIControl.id}`);
        }
        fileInputEl.data("controlType", "FileUploadExpenses");
        // Required handling might be complex here - is *a* file required for *each* expense?
        if (oneUIControl.required === true) {
            fileInputEl.attr('data-required', true);
        }

        inputContainerEl.append(fileInputEl);

        // Apply Kendo UI if needed (similar options as regular file upload)
        if (itsFlagRenderWithKui) {
            try {
                fileInputEl.kendoUpload({ multiple: oneUIControl.allowMultiple === true });
            } catch (e) {
                console.error("Error applying Kendo Upload for expense file:", e);
            }
        }

        addValidationMsgFromDecisionService(oneUIControl, inputContainerEl);
    }

    // --- QR Code ---
    /**
    * Renders a QR code using Kendo UI QRCode widget.
    * @param {Object} oneUIControl - Control configuration.
    * @param {Object} parentEl - Parent jQuery element.
    * @param {String} labelPositionAtUILevel - Label position.
    */
    function renderQRCode(oneUIControl, parentEl, labelPositionAtUILevel) {
        if (!itsFlagRenderWithKui) {
            console.warn("QRCode UI control requires Kendo UI to be enabled.");
            // Render placeholder or message if KUI not used
            const inputContainerEl = createInputContainer(parentEl, oneUIControl);
            appendLabel(oneUIControl, labelPositionAtUILevel, inputContainerEl);
            inputContainerEl.append('<span class="error-message">QR Code requires Kendo UI.</span>');
            return;
        }

        if (!oneUIControl.value) {
            console.warn(`QRCode control ID ${oneUIControl.id} has no value to encode.`);
            // Render placeholder or message if no value
            const inputContainerEl = createInputContainer(parentEl, oneUIControl);
            appendLabel(oneUIControl, labelPositionAtUILevel, inputContainerEl);
            inputContainerEl.append('<span class="info-message">No data provided for QR Code.</span>');
            return;
        }

        const inputContainerEl = createInputContainer(parentEl, oneUIControl);
        appendLabel(oneUIControl, labelPositionAtUILevel, inputContainerEl);

        const qrCodeDivId = oneUIControl.id; // Use control ID for the div
        const qrCodeDiv = $('<div>')
            .attr("id", qrCodeDivId)
            .addClass("QRCode"); // Add class for potential styling

        inputContainerEl.append(qrCodeDiv);

        try {
            // Kendo QRCode options
            const kendoOptions = {
                value: String(oneUIControl.value), // Ensure value is a string
                size: oneUIControl.size || 120, // Default size
                color: oneUIControl.color || "#000000", // Default color black
                background: oneUIControl.background || "#ffffff", // Default background white
                // errorCorrection: oneUIControl.errorCorrection || "M", // L, M, Q, H
                // encoding: oneUIControl.encoding || "UTF-8", // Or "ISO_8859_1"
                // border: { // Example border
                //   color: "#000000",
                //   width: 2
                // }
            };
            // Remove optional undefined ones if needed
            if (!oneUIControl.errorCorrection) delete kendoOptions.errorCorrection;
            if (!oneUIControl.encoding) delete kendoOptions.encoding;
            if (!oneUIControl.border) delete kendoOptions.border;

            qrCodeDiv.kendoQRCode(kendoOptions);
        } catch (e) {
            console.error("Error applying Kendo QRCode:", e);
            qrCodeDiv.text('Error generating QR Code.'); // Show error in the div
        }
        // No validation message needed typically
    }


    /**
         * Renders a Geolocation input control using Google Maps Autocomplete
         * AND a "Find My Location" button using the browser's Geolocation API.
         * @param {Object} oneUIControl - The UI control object to render.
         * @param {Object} parentEl - The parent jQuery element (the specific container div).
         * @param {String} labelPositionAtContainerLevel - Default label position for the control.
         */
    function renderGeolocationInput(oneUIControl, parentEl, labelPositionAtContainerLevel) {
        const inputContainerEl = createInputContainer(parentEl, oneUIControl);
        appendLabel(oneUIControl, labelPositionAtContainerLevel, inputContainerEl);

        // Use the main control ID for the text input for association with the label
        const inputId = oneUIControl.id;
        if (!inputId) {
            console.error('Missing id for Geolocation control.');
            inputContainerEl.append('<span class="error-message">Config error: Missing ID.</span>');
            return;
        }

        const attributes = {
            "type": "text",
            "id": inputId, // Use main control ID
            "placeholder": oneUIControl.placeholder || "Enter address or click Find My Location",
            "title": oneUIControl.tooltip || ''
        };

        const textInputEl = $('<input/>').addClass('geolocation-input').attr(attributes);

        // --- Data Attributes ---
        if (oneUIControl.fieldName) {
            textInputEl.data("fieldName", oneUIControl.fieldName);
            // Store structured geo data directly on the element for saving
            textInputEl.data("geolocationData", null);
            // Indicate the type for the save logic
            textInputEl.data("uicontroltype", "Geolocation");
        } else {
            console.error(`Missing fieldName for Geolocation control: ID ${oneUIControl.id}`);
            inputContainerEl.append('<span class="error-message">Config error: Missing field name.</span>');
            return;
        }
        if (oneUIControl.required === true) {
            textInputEl.attr('data-required', true);
        }

        inputContainerEl.append(textInputEl);

        // --- Initialize Google Maps Autocomplete ---
        let autocomplete;
        try {
            if (typeof google !== 'undefined' && google.maps && google.maps.places) {
                autocomplete = new google.maps.places.Autocomplete(
                    textInputEl[0], // Pass the DOM element
                    {
                        // Optional: Add options like componentRestrictions, fields, types
                        // fields: ["address_components", "geometry", "icon", "name", "formatted_address"],
                        // types: ['geocode'] // Example: restrict to geocode results
                    }
                );

                // --- Autocomplete Event Listener ---
                autocomplete.addListener('place_changed', () => {
                    const place = autocomplete.getPlace();
                    let locationData = null;
                    let displayValue = '';

                    if (place && place.geometry && place.geometry.location) {
                        const lat = place.geometry.location.lat();
                        const lng = place.geometry.location.lng();
                        displayValue = place.formatted_address || `${lat}, ${lng}`;

                        // Prepare structured data for saving
                        locationData = {
                            // Add other components if needed from place.address_components
                            // e.g., city: ..., state: ..., postalCode: ..., street: ...
                            geo: `${lat}, ${lng}`,
                            lat: lat,
                            long: lng,
                            address: place.formatted_address || displayValue // Store formatted address
                        };

                        console.log("Place selected:", place);
                        console.log("Saving Location Data (Autocomplete):", locationData);

                    } else {
                        console.warn("Autocomplete returned place without geometry:", place);
                        displayValue = textInputEl.val(); // Keep user typed value if place is invalid
                        locationData = { address: displayValue }; // Save at least the typed text
                    }

                    textInputEl.val(displayValue); // Update input field
                    textInputEl.data('geolocationData', locationData); // Store structured data
                });
            } else {
                console.warn("Google Maps Places library not loaded. Autocomplete disabled.");
                inputContainerEl.append('<span class="warning-message">Address autocomplete is unavailable.</span>');
            }
        } catch (e) {
            console.error("Error initializing Google Maps Autocomplete:", e);
            inputContainerEl.append('<span class="error-message">Error loading address autocomplete.</span>');
        }
        // --- END Google Maps Autocomplete ---


        // --- Button for Geolocation API ---
        const findLocationButton = $('<button>')
            .text('Find My Location')
            .addClass('find-my-location-button k-button k-button-md k-rounded-md k-button-solid k-button-solid-base') // Added Kendo button classes
            .attr('type', 'button'); // Prevent form submission

        // Append button next to the input
        textInputEl.after(findLocationButton); // Place button after input

        // --- Geolocation API Functionality on Button Click ---
        findLocationButton.on('click', () => {
            if (navigator.geolocation) {
                findLocationButton.prop('disabled', true).text('Finding...'); // Disable button during lookup
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const lat = position.coords.latitude;
                        const lng = position.coords.longitude;
                        const displayValue = `${lat}, ${lng}`;
                        const locationData = { // Prepare structured data
                            geo: displayValue,
                            lat: lat,
                            long: lng,
                            address: displayValue // Store coords as address when using button
                        };

                        textInputEl.val(displayValue);
                        textInputEl.data('geolocationData', locationData); // Store structured data

                        console.log("Location found via button:", locationData);

                        // Optionally, trigger change event on the main input
                        textInputEl.trigger('change');
                        findLocationButton.prop('disabled', false).text('Find My Location');
                    },
                    (error) => {
                        let errorMessage = "Geolocation failed: ";
                        switch (error.code) {
                            case error.PERMISSION_DENIED: errorMessage += "Permission denied."; break;
                            case error.POSITION_UNAVAILABLE: errorMessage += "Position unavailable."; break;
                            case error.TIMEOUT: errorMessage += "Timeout."; break;
                            default: errorMessage += "Unknown error."; break;
                        }
                        console.error(errorMessage, error);
                        // Display error temporarily or near the button
                        const errorSpanId = inputId + "_geo_error";
                        $(`#${errorSpanId}`).remove(); // Remove previous error
                        const errorSpan = $(`<span id="${errorSpanId}" class="error-message" style="margin-left: 5px;">${errorMessage}</span>`);
                        findLocationButton.after(errorSpan);
                        setTimeout(() => errorSpan.fadeOut(500, () => errorSpan.remove()), 5000); // Hide after 5s
                        findLocationButton.prop('disabled', false).text('Find My Location');
                        textInputEl.data('geolocationData', null); // Clear data on error
                    },
                    { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 } // Slightly increased timeout
                );
            } else {
                console.error("Geolocation is not supported by this browser.");
                const errorSpanId = inputId + "_geo_error";
                $(`#${errorSpanId}`).remove();
                const errorSpan = $(`<span id="${errorSpanId}" class="error-message" style="margin-left: 5px;">Geolocation not supported.</span>`);
                findLocationButton.after(errorSpan).prop('disabled', true); // Disable button if not supported
            }
        });

        // Add validation message placeholder from DS
        addValidationMsgFromDecisionService(oneUIControl, inputContainerEl);
    }


    // --- Rating ---
    /**
    * Renders a rating input (likely as a number input 1-5).
    * @param {Object} oneUIControl - Control configuration.
    * @param {Object} parentEl - Parent jQuery element.
    * @param {String} labelPositionAtContainerLevel - Label position.
    */
    function renderRating(oneUIControl, parentEl, labelPositionAtContainerLevel) {
        const inputContainerEl = createInputContainer(parentEl, oneUIControl);
        appendLabel(oneUIControl, labelPositionAtContainerLevel, inputContainerEl);

        const inputId = oneUIControl.id + getNextUniqueId();
        const attributes = {
            "type": "number", // Use number type for native spinners/validation
            "id": inputId,
            "min": oneUIControl.min || 1, // Default min 1
            "max": oneUIControl.max || 5, // Default max 5
            "step": oneUIControl.step || 1, // Default step 1
            "title": oneUIControl.tooltip || `Enter a rating between ${attributes.min} and ${attributes.max}`,
            "placeholder": oneUIControl.placeholder || ''
        };

        const ratingInputEl = $('<input/>').attr(attributes);

        // --- Data Attributes ---
        if (oneUIControl.fieldName) {
            ratingInputEl.data("fieldName", oneUIControl.fieldName);
            ratingInputEl.data("type", "rating"); // Mark type for saving
        } else {
            console.error(`Missing fieldName for Rating control: ID ${oneUIControl.id}`);
        }
        if (oneUIControl.required === true) {
            ratingInputEl.attr('data-required', true);
        }

        // --- Default Value ---
        if (oneUIControl.value !== undefined && oneUIControl.value !== null) {
            ratingInputEl.val(oneUIControl.value);
        }

        inputContainerEl.append(ratingInputEl);

        // --- Apply Kendo UI ---
        if (itsFlagRenderWithKui) {
            try {
                ratingInputEl.kendoNumericTextBox({
                    min: attributes.min,
                    max: attributes.max,
                    step: attributes.step,
                    format: "n0", // Format as integer
                    required: oneUIControl.required === true,
                    value: (typeof oneUIControl.value === 'number') ? oneUIControl.value : undefined
                });
            } catch (e) {
                console.error("Error applying Kendo NumericTextBox for Rating:", e);
            }
        }
        // Add DS validation message
        addValidationMsgFromDecisionService(oneUIControl, inputContainerEl);
    }


    // --- Multiple Choices (Select Dropdown) ---
    /**
    * Renders a select dropdown for single or multiple choices.
    * Handles options from control config and/or external dataSource.
    * @param {Object} oneUIControl - Control configuration.
    * @param {Object} parentEl - Parent jQuery element.
    * @param {String} labelPositionAtContainerLevel - Label position.
    */
    function renderMultipleChoicesInput(oneUIControl, parentEl, labelPositionAtContainerLevel) {
        const inputContainerEl = createInputContainer(parentEl, oneUIControl);
        appendLabel(oneUIControl, labelPositionAtContainerLevel, inputContainerEl);

        // --- Select Element ---
        const selectId = oneUIControl.id;
        const isMultiSelect = oneUIControl.type === 'MultipleChoicesMultiSelect';
        const selectEl = $('<select>').attr("id", selectId);

        if (isMultiSelect) {
            selectEl.attr("multiple", true);
            // Optionally set size attribute if you want a visible list box
            // selectEl.attr("size", oneUIControl.size || 4);
        }

        // --- Data Attributes ---
        if (oneUIControl.fieldName) {
            selectEl.data("fieldName", oneUIControl.fieldName);
        } else {
            console.error(`Missing fieldName for MultipleChoices control: ID ${oneUIControl.id}`);
        }
        selectEl.data("controlType", oneUIControl.type); // Store type
        if (oneUIControl.required === true) {
            selectEl.attr('data-required', true);
        }

        // Add placeholder/default option *before* loading dynamic options
        if (oneUIControl.placeholder) {
            selectEl.append($('<option>').val("").text(oneUIControl.placeholder).prop('disabled', true).prop('selected', true));
        } else if (!isMultiSelect) {
            // Add a default empty option for single selects unless placeholder exists
            selectEl.append($('<option>').val("").text("-- Select --")); // Or just empty val("")
        }


        inputContainerEl.append(selectEl); // Append select before loading options

        // --- Load Options ---
        const staticOptions = oneUIControl.option;
        const dataSourceUrl = oneUIControl.dataSource;

        if (!staticOptions && !dataSourceUrl) {
            console.error(`Missing 'option' array or 'dataSource' URL for MultipleChoices control: ID ${oneUIControl.id}`);
            selectEl.append($('<option>').val("").text("Error: No options configured"));
            return;
        }

        // Add options (static first, then async from dataSource)
        addOptions(staticOptions, dataSourceUrl, selectEl, inputContainerEl, oneUIControl, () => {
            // Kendo Initialization Callback (called after options are potentially added)
            if (itsFlagRenderWithKui) {
                try {
                    // Choose Kendo widget based on multi-select
                    if (isMultiSelect) {
                        selectEl.kendoMultiSelect({
                            // placeholder: oneUIControl.placeholder || "Select items...",
                            // dataTextField: "text", // Default field names in Kendo items
                            // dataValueField: "value",
                            // filter: "contains" // Example filter
                        });
                    } else {
                        selectEl.kendoDropDownList({
                            // optionLabel: oneUIControl.placeholder || "-- Select --" // Placeholder for Kendo DropDown
                        });
                    }
                } catch (e) {
                    console.error("Error applying Kendo DropDownList/MultiSelect:", e);
                }
            }

            // --- Set Default Value(s) AFTER options are loaded ---
            if (oneUIControl.value !== undefined && oneUIControl.value !== null) {
                // For multi-select, value might be an array
                if (isMultiSelect && Array.isArray(oneUIControl.value)) {
                    selectEl.val(oneUIControl.value); // jQuery handles setting multiple values if value is an array
                    // Trigger Kendo refresh if needed after setting value
                    if (itsFlagRenderWithKui) selectEl.data("kendoMultiSelect")?.refresh();
                } else if (!isMultiSelect) {
                    selectEl.val(String(oneUIControl.value)); // Set single value
                    if (itsFlagRenderWithKui) selectEl.data("kendoDropDownList")?.refresh();
                } else {
                    console.warn(`Value type mismatch for MultipleChoices control ${oneUIControl.id}. Expected array for multi-select:`, oneUIControl.value);
                }
            } else if (oneUIControl.placeholder && !isMultiSelect) {
                // Ensure placeholder is selected if no value is set
                selectEl.find('option[disabled][selected]').prop('selected', true);
                if (itsFlagRenderWithKui) selectEl.data("kendoDropDownList")?.refresh();
            }
        });


        // Add DS validation message
        addValidationMsgFromDecisionService(oneUIControl, inputContainerEl);
    }

    /**
     * Adds options to a select element, handling static options and async dataSource.
     * @param {Array|null} staticOptions - Array of {value, displayName} objects from control config.
     * @param {String|null} dataSourceUrl - URL to fetch options from.
     * @param {Object} selectEl - The jQuery select element.
     * @param {Object} inputContainerEl - The container div (used for showing/hiding during load).
     * @param {Object} oneUIControl - The control configuration (for dataSourceOptions).
     * @param {Function} [kendoInitCallback] - Callback to initialize Kendo widget after options are loaded.
     */
    function addOptions(staticOptions, dataSourceUrl, selectEl, inputContainerEl, oneUIControl, kendoInitCallback) {
        let optionsAdded = false; // Flag to track if any options were added

        // 1. Add Static Options
        if (staticOptions && Array.isArray(staticOptions) && staticOptions.length > 0) {
            staticOptions.forEach(opt => {
                // Basic check for valid option structure
                if (opt && opt.value !== undefined && opt.displayName !== undefined) {
                    selectEl.append($('<option>').val(opt.value).text(opt.displayName));
                    optionsAdded = true;
                } else {
                    console.warn(`Skipping invalid static option in control ${oneUIControl.id}:`, opt);
                }
            });
            console.log(`Added ${staticOptions.length} static options for ${oneUIControl.id}`);
        }

        // 2. Fetch and Add Options from DataSource
        if (dataSourceUrl) {
            console.log(`Workspaceing options for ${oneUIControl.id} from ${dataSourceUrl}`);
            // Show loading indicator?
            // inputContainerEl.addClass('loading'); // Example class
            const loadingMsg = $('<option>').val("").text("Loading...").prop('disabled', true);
            if (!optionsAdded) selectEl.append(loadingMsg); // Show loading only if no static options yet


            $.ajax({
                url: dataSourceUrl,
                dataType: "json", // Expect JSON response
                timeout: 10000 // Set timeout (e.g., 10 seconds)
            })
                .done(function (data) {
                    console.log(`Successfully fetched data for ${oneUIControl.id}:`, data);
                    loadingMsg.remove(); // Remove loading message
                    let processedOptions = addOptionsFromDataSource(selectEl, data, oneUIControl);
                    if (processedOptions > 0) optionsAdded = true;
                })
                .fail(function (jqXHR, textStatus, errorThrown) {
                    loadingMsg.remove(); // Remove loading message
                    console.error(`Failed to fetch options for ${oneUIControl.id} from ${dataSourceUrl}: ${textStatus}, ${errorThrown}`, jqXHR);
                    selectEl.append($('<option>').val("").text("Error loading options"));
                    // Show error message in the UI?
                    inputContainerEl.append(`<span class="error-message">Failed to load options: ${textStatus}</span>`);
                })
                .always(function () {
                    // inputContainerEl.removeClass('loading'); // Remove loading indicator
                    // If no options were ever added (static or dynamic), show a message
                    if (!optionsAdded && selectEl.find('option').length <= 1) { // Check if only placeholder/error exists
                        selectEl.empty().append($('<option>').val("").text("No options available"));
                    }
                    // Call Kendo init AFTER async options might have been added
                    if (kendoInitCallback) {
                        kendoInitCallback();
                    }
                });
        } else {
            // If no dataSource, call Kendo init immediately after static options
            if (kendoInitCallback) {
                kendoInitCallback();
            }
        }
    }

    /**
     * Processes data fetched from a dataSource URL and adds options to the select element.
     * Handles data mapping and sorting based on dataSourceOptions from control config.
     * @param {Object} selectEl - The jQuery select element.
     * @param {*} data - The raw data received from the fetch.
     * @param {Object} oneUIControl - The control configuration (contains dataSourceOptions).
     * @returns {number} - The number of options successfully added.
     */
    function addOptionsFromDataSource(selectEl, data, oneUIControl) {
        let dataValueField = "value";
        let dataTextField = "displayName";
        let optionsArray = data; // Assume data is the array by default
        let sortData = true; // Default to sorting
        let sortDir = 'a'; // Default ascending
        let pathApplied = false; // Track if JSONPath was used

        // Check for dataSourceOptions overrides
        if (oneUIControl.dataSourceOptions && Array.isArray(oneUIControl.dataSourceOptions) && oneUIControl.dataSourceOptions.length > 0) {
            const dsOptions = oneUIControl.dataSourceOptions[0]; // Assuming only one options object
            if (dsOptions.dataValueField) dataValueField = dsOptions.dataValueField;
            if (dsOptions.dataTextField) dataTextField = dsOptions.dataTextField;
            if (dsOptions.sort !== undefined) sortData = dsOptions.sort; // Allow disabling sort
            if (dsOptions.sortDir === 'd') sortDir = 'd'; // Allow descending sort

            // Apply JSONPath if provided and library is available
            if (dsOptions.pathToOptionsArray) {
                if (typeof JSONPath !== 'undefined') {
                    try {
                        const result = JSONPath.JSONPath(dsOptions.pathToOptionsArray, data);
                        if (Array.isArray(result)) {
                            optionsArray = result;
                            pathApplied = true;
                            console.log(`Applied JSONPath '${dsOptions.pathToOptionsArray}', got ${optionsArray.length} potential options.`);
                        } else {
                            console.error(`JSONPath expression '${dsOptions.pathToOptionsArray}' did not return an array for ${oneUIControl.id}. Data:`, data);
                            optionsArray = []; // Reset to empty array on error
                        }
                    } catch (e) {
                        console.error(`Error evaluating JSONPath '${dsOptions.pathToOptionsArray}' for ${oneUIControl.id}:`, e);
                        optionsArray = [];
                    }
                } else {
                    console.error(`JSONPath library not available, cannot apply path '${dsOptions.pathToOptionsArray}' for ${oneUIControl.id}.`);
                    optionsArray = []; // Cannot proceed without JSONPath library
                }
            }
        }


        // Ensure optionsArray is actually an array before proceeding
        if (!Array.isArray(optionsArray)) {
            console.error(`Data source for ${oneUIControl.id} did not resolve to an array. ${pathApplied ? 'Result after JSONPath' : 'Original data'} was:`, optionsArray);
            return 0; // Return 0 options added
        }


        // --- Sorting ---
        if (sortData && optionsArray.length > 0) {
            try {
                optionsArray.sort((a, b) => {
                    // Handle potential nested properties for sorting
                    const valA = String(a && typeof a === 'object' ? a[dataTextField] : a); // Default to item itself if not object/key missing
                    const valB = String(b && typeof b === 'object' ? b[dataTextField] : b);

                    if (valA === valB) return 0;
                    // Basic case-insensitive string comparison
                    const comparison = valA.toLowerCase().localeCompare(valB.toLowerCase());
                    return sortDir === 'a' ? comparison : -comparison;
                });
                console.log(`Sorted ${optionsArray.length} options for ${oneUIControl.id}.`);
            } catch (e) {
                console.error(`Error sorting options for ${oneUIControl.id}:`, e);
                // Continue with unsorted data
            }
        }


        // --- Add Options to Select ---
        let optionsAddedCount = 0;
        optionsArray.forEach(item => {
            if (item && typeof item === 'object') {
                const value = item[dataValueField];
                const text = item[dataTextField];
                if (value !== undefined && text !== undefined) {
                    selectEl.append($('<option>').val(value).text(text));
                    optionsAddedCount++;
                } else {
                    console.warn(`Skipping dataSource item for ${oneUIControl.id} due to missing value/text field ('${dataValueField}', '${dataTextField}'):`, item);
                }
            } else {
                // Handle cases where array items are simple strings/numbers
                if (item !== undefined && item !== null) {
                    selectEl.append($('<option>').val(item).text(item));
                    optionsAddedCount++;
                } else {
                    console.warn(`Skipping invalid simple dataSource item for ${oneUIControl.id}:`, item);
                }
            }
        });

        console.log(`Added ${optionsAddedCount} options from dataSource for ${oneUIControl.id}.`);
        return optionsAddedCount;
    }


    // --- Utility Functions ---

    /**
     * Renders a container-level validation message if provided.
     * @param {String|null} validationMessage - The message text.
     * @param {Object} parentEl - The jQuery element (container div) to append to.
     */
    function renderContainerValidationMessage(validationMessage, parentEl) {
        if (validationMessage) {
            const msgDiv = $('<div>')
                .addClass('containerValidationMessage') // Specific class
                .text(validationMessage);
            parentEl.append(msgDiv);
        }
    }
    /**
         * Creates the standard container div for a single UI control.
         * Applies initial hiding and data attributes for conditional visibility.
         * @param {Object} parentEl - The jQuery element to append the container to (e.g., the main container for the step).
         * @param {Object} oneUIControl - The control's configuration data.
         * @param {Boolean} [isArray=false] - Is this control an array type?
         * @param {Boolean} [isComplexArray=false] - Is this a complex array type (like expenses)?
         * @returns {Object} - The jQuery object for the created input container div.
         */
    /**
         * Creates the standard container div for a single UI control.
         * Applies initial hiding and data attributes for conditional visibility using HTML attributes.
         * @param {Object} parentEl - The jQuery element to append the container to.
         * @param {Object} oneUIControl - The control's configuration data.
         * @param {Boolean} [isArray=false] - Is this control an array type?
         * @param {Boolean} [isComplexArray=false] - Is this a complex array type?
         * @returns {Object} - The jQuery object for the created input container div.
         */
    function createInputContainer(parentEl, oneUIControl, isArray = false, isComplexArray = false) {
        const containerDiv = $('<div>').addClass('inputContainer');
        let controlId = null;

        // --- Define controlId and set container ID FIRST ---
        if (oneUIControl && oneUIControl.id) {
            controlId = oneUIControl.id;
            containerDiv.attr('id', `container-for-${controlId}`);
        } else {
            console.warn("Control is missing an ID, required for some features like conditional visibility targeting.");
        }

        // --- Add marker classes for array types ---
        if (isArray) {
            containerDiv.addClass(isComplexArray ? 'complexArrayTypeControl' : 'simpleArrayTypeControl');
        } else {
            containerDiv.addClass('nonarrayTypeControl');
        }

        // --- Conditional Visibility Logic (Set HTML Attributes) ---
        if (oneUIControl.triggeredByControlWithId && oneUIControl.triggeredWhenSelection !== undefined) {
            containerDiv.addClass('corticon-hidden-control'); // Hide initially

            // --- Use .attr() to set HTML attributes --- // [!code focus]
            containerDiv.attr('data-triggered-by', oneUIControl.triggeredByControlWithId); // [!code focus]

            const triggerValues = Array.isArray(oneUIControl.triggeredWhenSelection) ?
                oneUIControl.triggeredWhenSelection : [oneUIControl.triggeredWhenSelection];
            containerDiv.attr('data-trigger-value', JSON.stringify(triggerValues)); // [!code focus]
            containerDiv.attr('data-is-conditional', 'true'); // [!code focus]
            // --- End Attribute Setting --- // [!code focus]


            if (controlId) {
                containerDiv.attr('data-target-control-id', controlId); // Set target ID attribute // [!code focus]
                console.log(`Marking #${containerDiv.attr('id')} as conditional, triggered by #${oneUIControl.triggeredByControlWithId} when value is ${JSON.stringify(triggerValues)}`);
            } else {
                console.warn(`Conditional control cannot store targetControlId because the control itself is missing an ID. Trigger ID: ${oneUIControl.triggeredByControlWithId}`);
            }
        }
        // --- END Conditional Visibility ---

        parentEl.append(containerDiv);
        return containerDiv;
    }

    /**
     * Appends a validation message received from the decision service response.
     * @param {Object} oneUIControl - Control configuration (contains validationErrorMsg).
     * @param {Object} inputContainerEl - The specific container for this control.
     */
    function addValidationMsgFromDecisionService(oneUIControl, inputContainerEl) {
        if (oneUIControl.validationErrorMsg) {
            const errorSpan = $('<span>')
                .addClass('controlValidationMessage') // Specific class for DS validation
                .text(oneUIControl.validationErrorMsg);
            inputContainerEl.append(errorSpan);
        }
    }

    /**
     * Determines the effective label position for a control.
     * @param {Object} oneUIControl - Control configuration.
     * @param {String} labelPositionAtContainerLevel - Default from container/step.
     * @returns {String} - 'Above' or 'Side'.
     */
    function getLabelPositionForControl(oneUIControl, labelPositionAtContainerLevel) {
        // Use control-specific setting if provided, otherwise fallback to container/step default
        return oneUIControl.labelPosition || labelPositionAtContainerLevel || 'Above'; // Default to 'Above'
    }

    /**
         * Creates and appends the label element for a control based on position.
         * Includes logic for a clickable info icon with a tooltip bubble.
         * @param {Object} oneUIControl - Control configuration (needs label, tooltip, id).
         * @param {String} labelPositionAtContainerLevel - Default label position.
         * @param {Object} inputContainerEl - The specific container for this control.
         */
    function appendLabel(oneUIControl, labelPositionAtContainerLevel, inputContainerEl) {
        // Don't add a label if the control has no label text defined
        if (!oneUIControl.label) {
            return;
        }

        let labelWrapper; // <<< --- ADD THIS LINE TO DECLARE THE VARIABLE --- <<<

        const labelPosition = getLabelPositionForControl(oneUIControl, labelPositionAtContainerLevel);
        const labelText = oneUIControl.label;
        const controlId = oneUIControl.id; // Use the main control ID here

        // Create the basic label text part AND set the 'for' attribute
        const labelEl = $('<label>')
            .attr('for', controlId)
            .text(labelText);

        // --- Create Label Wrapper ---
        if (labelPosition === 'Above') {
            labelWrapper = $('<div>').addClass('inputLabelAbove');
        } else { // 'Side' or default
            labelWrapper = $('<span>').addClass('inputLabelSide');
        }
        labelWrapper.append(labelEl); // Add the <label> with text inside the wrapper

        // --- Tooltip / Info Icon Logic ---
        let tooltipBubbleEl = null; // Initialize bubble variable
        if (oneUIControl.tooltip) {
            const infoIcon = $('<span>')
                .addClass('info-icon')
                .text('ⓘ')
                .css('cursor', 'pointer');

            labelWrapper.append('&nbsp;').append(infoIcon); // Append icon to the wrapper

            tooltipBubbleEl = $('<div>') // Assign to the declared variable
                .addClass('tooltip-bubble inline-tooltip')
                .html(oneUIControl.tooltip) // Using .html() as per previous step
                .hide();

            infoIcon.on('click', function (event) {
                event.stopPropagation();
                // Find the tooltip bubble associated with this label's container
                $(this).closest('.inputContainer').find('.tooltip-bubble.inline-tooltip').first().slideToggle(200);
            });
        }
        // --- End Tooltip Logic ---

        // Add required marker if needed
        if (oneUIControl.required === true) {
            labelWrapper.append('&nbsp;<span class="required-marker">*</span>');
        }

        // --- Append elements to the inputContainerEl ---
        // Prepend the label wrapper (contains label text + potentially icon)
        inputContainerEl.prepend(labelWrapper);

        // Append the tooltip bubble DIV *after* the label wrapper, if it exists
        if (tooltipBubbleEl) {
            labelWrapper.after(tooltipBubbleEl);
        }
    } // End of appendLabel

    /**
     * Checks if the control is configured as an array type (multiple instances).
     * @param {Object} oneUIControl - Control configuration.
     * @returns {Boolean} - True if `oneUIControl.multiple` is true.
     */
    function isArrayType(oneUIControl) {
        // Check the 'multiple' property explicitly
        return oneUIControl.multiple === true;
    }


    // --- Public Interface ---
    // Expose only the main rendering function
    return {
        renderUI: renderUI
    };

}; // End of corticon.dynForm.UIControlsRenderer