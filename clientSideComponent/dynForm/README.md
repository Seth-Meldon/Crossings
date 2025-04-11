# dynForm Folder Documentation

This folder contains the core components and utilities required for rendering and managing dynamic forms in the Corticon.js framework. ---

These files encapsulate the logic and styling required to create, render, and manage dynamic forms. Each file plays a specific role in ensuring the forms are interactive, maintainable, and adaptable to various use cases.

Below is a description of each file in this folder:

---

## Files Overview

### 1. **clientSetup.js**
- **Purpose**: 
  - Acts as the entry point for initializing and managing the dynamic form lifecycle.
  - Handles sample selection, language switching, and UI state restoration.
  - Coordinates the interaction between the decision service engine and the dynamic form renderer.
- **Key Responsibilities**:
  - Initialize input data for different samples.
  - Manage user interactions like starting, navigating, and switching between samples.
  - Save and restore UI state using local storage.

---

### 2. **customEvents.js**
- **Purpose**: 
  - Defines and manages custom events used throughout the dynamic form lifecycle.
  - Provides a mechanism to raise and handle events for various stages of the form process.
- **Key Responsibilities**:
  - Define custom events such as `BEFORE_START`, `NEW_STEP`, and `FORM_DONE`.
  - Allow other components to add event handlers and raise events dynamically.

---

### 3. **history.js**
- **Purpose**: 
  - Maintains a history of the form's state across multiple steps.
  - Enables navigation between steps by storing and retrieving previous states.
- **Key Responsibilities**:
  - Store decision service inputs for each step.
  - Provide methods to retrieve the previous step's data.
  - Support restarting the form from a saved state.

---

### 4. **stepsController.js**
- **Purpose**: 
  - Manages the overall flow of the dynamic form, including rendering steps and processing user inputs.
  - Interacts with the decision service engine to fetch and render the next set of UI elements.
- **Key Responsibilities**:
  - Start the dynamic form process and handle navigation between steps.
  - Validate user inputs and save them to the form data.
  - Handle form completion and post-processing (e.g., sending data to a REST API).
  - Manage background data processing and dynamic updates.

---

### 5. **uiControlsRenderers.js**
- **Purpose**: 
  - Handles the rendering of UI controls based on the decision service's output.
  - Supports various control types such as text inputs, dropdowns, checkboxes, and more.
- **Key Responsibilities**:
  - Render containers and their associated UI controls dynamically.
  - Apply styling and behavior based on the rendering mode (e.g., Kendo UI or plain HTML).
  - Provide utility functions for creating and managing input elements.

---

### 6. **UIControlsStyles.css**
- **Purpose**: 
  - Defines the styles for the dynamic form's UI components.
  - Ensures a consistent look and feel across different rendering modes.
- **Key Responsibilities**:
  - Style containers, input controls, validation messages, and other UI elements.
  - Provide overrides for third-party libraries like Kendo UI.


