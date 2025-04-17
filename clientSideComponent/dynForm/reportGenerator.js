// reportGenerator.js

/**
 * Renders an assessment report into a specified container.
 *
 * @param {Array<Object>} data - The data array containing assessment objects.
 * Each object is expected to have a key (like 'assessment')
 * which holds the actual assessment data.
 * @param {string} containerId - The ID of the HTML element to render the report into.
 */
function renderAssessmentReport(data, containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Report container with ID "${containerId}" not found.`);
        return;
    }

    // Clear previous content
    container.innerHTML = '';

    // Check if data is valid
    if (!Array.isArray(data) || data.length === 0) {
        container.innerHTML = '<p>No assessment data provided for the report.</p>';
        console.warn("renderAssessmentReport called with invalid or empty data:", data);
        return;
    }

    // Assuming the first object in the array holds the relevant data structure
    const reportData = data[0];
    const reportKey = Object.keys(reportData)[0]; // Get the main key (e.g., 'assessment')
    const assessment = reportData[reportKey]; // Get the actual assessment object

    if (!assessment || typeof assessment !== 'object') {
        container.innerHTML = `<p>Error: Invalid data structure under key "${reportKey}".</p>`;
        console.error("Invalid assessment data structure:", assessment);
        return;
    }

    // --- Report Header ---
    const reportTitle = document.createElement('h2');
    // Use assessment.localID or a default title
    reportTitle.textContent = `Assessment Report: ${assessment.localID || 'N/A'}`;
    container.appendChild(reportTitle);

    // --- General Information Section ---
    const generalInfoSection = document.createElement('div');
    generalInfoSection.className = 'report-section'; // Add class for styling
    const generalInfoTitle = document.createElement('h3');
    generalInfoTitle.textContent = 'General Information';
    generalInfoSection.appendChild(generalInfoTitle);

    // Add general fields
    _addReportField(generalInfoSection, 'Lead Observer', assessment.leadObserver);
    _addReportField(generalInfoSection, 'Date Observed', _formatDate(assessment.dateObserved));
    _addReportField(generalInfoSection, 'Stream Name', assessment.stream);
    _addReportField(generalInfoSection, 'Road Type', assessment.roadType);

    // Location Data (handle nested object)
    if (assessment.location && typeof assessment.location === 'object') {
        const locationString = `${assessment.location.streetNumber || ''} ${assessment.location.street || ''}, ${assessment.location.city || ''}, ${assessment.location.state || ''} ${assessment.location.postalCode || ''} (Geo: ${assessment.location.geo || 'N/A'})`;
        _addReportField(generalInfoSection, 'Location', locationString);
    } else {
        _addReportField(generalInfoSection, 'Location', 'N/A');
    }
    _addReportField(generalInfoSection, 'Location Description', assessment.locationDescription);
    _addReportField(generalInfoSection, 'Crossing Comments', assessment.comments);

    container.appendChild(generalInfoSection);

    // --- Crossing Data Section ---
    // Check if crossing data exists (it's an array)
    if (assessment.crossing && Array.isArray(assessment.crossing) && assessment.crossing.length > 0) {
        // Assuming only one crossing object per assessment for this report structure
        const crossing = assessment.crossing[0];

        const crossingSection = document.createElement('div');
        crossingSection.className = 'report-section';
        const crossingTitle = document.createElement('h3');
        crossingTitle.textContent = 'Crossing Details';
        crossingSection.appendChild(crossingTitle);

        _addReportField(crossingSection, 'Crossing Type', crossing.crossingType);
        _addReportField(crossingSection, 'Number of Culverts/Cells', crossing.numberCulverts);
        _addReportField(crossingSection, 'Flow Condition', crossing.flowCondition);
        _addReportField(crossingSection, 'Crossing Condition', crossing.crossingCondition);
        _addReportField(crossingSection, 'Alignment', crossing.alignment);
        _addReportField(crossingSection, 'Road Fill Height (ft)', crossing.roadfillHeight_ft);
        _addReportField(crossingSection, 'Tailwater Scour Pool', crossing.scourPool);
        _addReportField(crossingSection, 'Constriction', crossing.constriction);
        // Add photo fields if needed (e.g., just listing names or links)
        _addReportField(crossingSection, 'Photo - Inlet', crossing.photoInlet || 'N/A');
        _addReportField(crossingSection, 'Photo - Outlet', crossing.photoOutlet || 'N/A');
        _addReportField(crossingSection, 'Photo - Upstream', crossing.photoUpstream || 'N/A');
        _addReportField(crossingSection, 'Photo - Downstream', crossing.photoDownstream || 'N/A');

        container.appendChild(crossingSection);

        // --- Structure Data Section (Nested within Crossing) ---
        if (crossing.structure && Array.isArray(crossing.structure) && crossing.structure.length > 0) {
            // Loop through each structure if multiple are possible, or just take the first
            crossing.structure.forEach((structure, index) => {
                const structureSection = document.createElement('div');
                structureSection.className = 'report-section report-subsection'; // Indent subsection
                const structureTitle = document.createElement('h4');
                structureTitle.textContent = `Structure ${index + 1} Details`;
                structureSection.appendChild(structureTitle);

                _addReportField(structureSection, 'Material', structure.material);
                _addReportField(structureSection, 'Outlet Shape', structure.outletShape);
                _addReportField(structureSection, 'Outlet Armoring', structure.outletArmoring);
                _addReportField(structureSection, 'Outlet Grade', structure.outletGrade);
                _addReportField(structureSection, 'Outlet Width (ft)', structure.outletWidthFt);
                _addReportField(structureSection, 'Outlet Height (ft)', structure.outletHeightFt);
                _addReportField(structureSection, 'Outlet Substrate/Water Width (ft)', structure.outletSubstrateWaterWidth);
                _addReportField(structureSection, 'Outlet Water Depth (ft)', structure.outletWaterDepth);
                _addReportField(structureSection, 'Outlet Drop to Surface (ft)', structure.outletDropToSurfaceFt);
                _addReportField(structureSection, 'Outlet Drop to Bottom (ft)', structure.outletDropToBottomFt);
                _addReportField(structureSection, 'Structure Length (ft)', structure.lengthFt);
                _addReportField(structureSection, 'Inlet Shape', structure.inletShape);
                _addReportField(structureSection, 'Inlet Type', structure.inletType);
                _addReportField(structureSection, 'Inlet Grade', structure.inletGrade);
                _addReportField(structureSection, 'Inlet Width (ft)', structure.inletWidthFt);
                _addReportField(structureSection, 'Inlet Height (ft)', structure.inletHeightFt);
                _addReportField(structureSection, 'Inlet Substrate/Water Width (ft)', structure.inletSubstrateWaterWidth);
                _addReportField(structureSection, 'Inlet Water Depth (ft)', structure.inletWaterDepth);
                _addReportField(structureSection, 'Internal Structures', structure.internalStructures);
                _addReportField(structureSection, 'Substrate Matches Stream', structure.substrateMatchesStream);
                _addReportField(structureSection, 'Substrate Type', structure.substrateType);
                _addReportField(structureSection, 'Substrate Coverage (%)', structure.substrateCoverage);
                _addReportField(structureSection, 'Water Depth Matches Stream', structure.waterDepthMatchesStream);
                _addReportField(structureSection, 'Water Velocity Matches Stream', structure.waterVelocityMatchesStream);
                _addReportField(structureSection, 'Dry Passage Available', structure.dryPassage);

                // Physical Barriers (handle boolean/text)
                const barriers = [];
                if (structure.physicalBarriersNone) barriers.push('None');
                if (structure.physicalBarriersDebris) barriers.push('Debris');
                if (structure.physicalBarriersDeformation) barriers.push('Deformation');
                if (structure.physicalBarriersFreefall) barriers.push('Freefall');
                if (structure.physicalBarriersFencing) barriers.push('Fencing');
                if (structure.physicalBarriersDry) barriers.push('Dry');
                if (structure.physicalBarriersOther) barriers.push(`Other: ${structure.physicalBarriersOther}`);
                _addReportField(structureSection, 'Physical Barriers Present', barriers.length > 0 ? barriers.join(', ') : 'None Indicated');
                _addReportField(structureSection, 'Barrier Severity', structure.physicalBarriersSeverity ? 'Severe' : 'Not Severe'); // Assuming boolean

                container.appendChild(structureSection);
            });
        } else {
            _addReportField(crossingSection, 'Structure Details', 'No structure data available.');
        }
    } else {
        // Handle case where there's no crossing data
        const noCrossingSection = document.createElement('div');
        noCrossingSection.className = 'report-section';
        noCrossingSection.innerHTML = '<h3>Crossing Details</h3><p>No crossing data available.</p>';
        container.appendChild(noCrossingSection);
    }

    console.log("Report rendering complete.");
}

/**
 * Helper function to add a field (label and value) to a report section.
 * Handles undefined/null values gracefully.
 * @param {HTMLElement} sectionElement - The DOM element for the section.
 * @param {string} label - The label for the field.
 * @param {*} value - The value for the field.
 */
function _addReportField(sectionElement, label, value) {
    const fieldDiv = document.createElement('div');
    fieldDiv.className = 'report-field'; // Class for styling label/value pairs

    const labelSpan = document.createElement('span');
    labelSpan.className = 'report-label';
    labelSpan.textContent = `${label}: `;
    fieldDiv.appendChild(labelSpan);

    const valueSpan = document.createElement('span');
    valueSpan.className = 'report-value';
    // Display 'N/A' for null, undefined, or empty strings, otherwise display the value
    valueSpan.textContent = (value === null || value === undefined || value === '') ? 'N/A' : value;
    fieldDiv.appendChild(valueSpan);

    sectionElement.appendChild(fieldDiv);
}

/**
 * Helper function to format date strings.
 * @param {string} dateString - The date string (potentially ISO format).
 * @returns {string} - Formatted date (e.g., YYYY-MM-DD) or 'N/A'.
 */
function _formatDate(dateString) {
    if (!dateString) {
        return 'N/A';
    }
    try {
        // Attempt to create a date object. Handles ISO strings and YYYY-MM-DD.
        const date = new Date(dateString);
        // Check if the date is valid
        if (isNaN(date.getTime())) {
            return dateString; // Return original string if invalid
        }
        // Format to YYYY-MM-DD - Adjust if time is needed
        // Adding timezone offset might be needed if the input was just YYYY-MM-DD
        // but got converted to UTC midnight by new Date(). For simplicity,
        // we format based on the browser's interpretation of the date object.
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) {
        console.warn("Error formatting date:", dateString, e);
        return dateString; // Return original string on error
    }
}
