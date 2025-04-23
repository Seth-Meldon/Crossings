corticon.util.namespace("corticon.dynForm");

(function () {
    //https://developer.mozilla.org/en-US/docs/Web/Events/Creating_and_triggering_events

    corticon.dynForm.customEvents = {
        // --- Existing Events ---
        "BEFORE_START": "beforeStart",
        "AFTER_START": "afterStart",
        "FORM_DONE": "formDone",    // Form has reached the end (done flag received in the model)
        "AFTER_DONE": "afterDone",  // User clicked next after reaching Done. We simply display a All Done message (that is not part of the model)
        "BACK_AT_FORM_BEGINNING": "backAtFormBeginning",  // Came back to initial stage from one or more "Previous" steps.
        "NEW_STEP": "newStep",
        "NEW_FORM_DATA_SAVED": "newFormDataSaved", // Some data were saved to the form data storage
        "NEW_DS_EXECUTION": "newDsExecution", // A decision service was executed - data will contain the output
        "BEFORE_DS_EXECUTION": "beforeDSExecution", // A decision service is about to be executed - data will contain the input
        "AFTER_UI_STEP_RENDERED": "afterUIStepRendered", // A new UI step was rendered

        // --- ADDED Missing Events ---
        "HISTORY_STATUS_CHANGED": "historyStatusChanged", // Fired when history state changes (e.g., after Prev/Next) // [!code ++]
        "DISABLE_NAVIGATION": "disableNavigation",       // Fired when navigation buttons should be hidden (e.g., after final submission) // [!code ++]
        "REVIEW_STEP_DISPLAYED": "reviewStepDisplayed",  // Fired specifically when the review/report step is shown // [!code ++]
        "POST_SUCCESS": "postSuccess",                   // Fired after successful data submission to backend // [!code ++]
        "POST_ERROR": "postError",                       // Fired after failed data submission to backend // [!code ++]
        "DS_EXECUTION_ERROR": "dsExecutionError"         // Fired when the DS execution itself fails // [!code ++]
        // Add any other custom events your application might need
    };

    corticon.dynForm.addCustomEventHandler = function (name, fct) {
        // Listen for the event on the body element.
        // console.log(`[CustomEvents] Adding listener for event: "${name}"`, fct); // Optional: Keep for debugging if needed
        document.body.addEventListener(name, fct, false);
    };

    corticon.dynForm.raiseEvent = function (name, data) {
        // console.log(`[CustomEvents] Raising event: "${name}"`); // Optional: Keep for debugging if needed
        // Ensure 'name' is a valid string before creating the event
        if (typeof name !== 'string' || name === '') { // [!code ++]
            console.error(`[CustomEvents] Attempted to raise event with invalid name:`, name); // [!code ++]
            return; // [!code ++]
        } // [!code ++]

        const event = new Event(name);
        // Using a custom property 'theData' as 'detail' caused issues previously for the user
        event.theData = data;
        document.body.dispatchEvent(event);
    };

    // Optional function to remove listeners if needed
    corticon.dynForm.removeCustomEventHandler = function (name, fct) {
        // console.log(`[CustomEvents] Removing listener for event: "${name}"`, fct);
        document.body.removeEventListener(name, fct, false);
    };

})(); // Immediately invoke