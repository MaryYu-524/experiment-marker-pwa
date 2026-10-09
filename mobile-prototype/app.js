"use strict";


/* =========================================================
   CONFIG
   ========================================================= */

const STORAGE_KEY =
    "experiment-marker-mobile-prototype-v1";


const STATE_VERSION =
    3;


const DEFAULT_EVENTS = [
    "induce",
    "muscle relaxant",
    "intubation",
    "drape_out",
    "surgery_ready",
    "needle",
    "gas_start",
    "gas_ready",
    "trocar1",
    "trocar2",
    "trocar3",
    "empty_event",
];


const CSV_COLUMNS = [
    "case_id",
    "experiment_type",
    "event_preset",
    "experiment_start_datetime",
    "experiment_end_datetime",
    "event_index",
    "event_original",
    "event",
    "event_status",
    "note",
    "reference_datetime",
    "eeg_datetime",
    "elapsed_seconds",
    "elapsed_time",
    "renamed_at",
    "removed_at",
    "restored_at",
    "correction_count",
    "clock_offset_s",
    "calibration_reference_time",
    "calibration_eeg_time",
];


/* =========================================================
   STATE
   ========================================================= */

function createInitialState() {

    return {
        version:
            STATE_VERSION,

        state:
            "READY",

        case_id:
            "",

        experiment_type:
            "",

        /*
        Reserved for the preset system
        planned for a later version.
        */
        event_preset:
            "",

        event_types:
            [...DEFAULT_EVENTS],

        experiment_start_datetime:
            null,

        experiment_end_datetime:
            null,

        elapsed_checkpoint_ms:
            0,

        saved_at_epoch_ms:
            null,

        clock_offset_seconds:
            null,

        calibration_reference_time:
            null,

        calibration_eeg_time:
            null,

        events:
            [],

        removed_stack:
            [],
    };
}


function normalizeEvent(
    event
) {

    return {
        event_original:
            event.event_original
            ??
            event.event
            ??
            "",

        event:
            event.event
            ??
            event.event_original
            ??
            "",

        reference_datetime:
            event.reference_datetime
            ??
            null,

        elapsed_seconds:
            Number(
                event.elapsed_seconds
                ??
                0
            ),

        note:
            event.note
            ??
            "",

        status:
            event.status
            ===
            "removed"
                ? "removed"
                : "active",

        renamed_at:
            event.renamed_at
            ??
            null,

        removed_at:
            event.removed_at
            ??
            null,

        restored_at:
            event.restored_at
            ??
            null,

        correction_count:
            Number(
                event.correction_count
                ??
                0
            ),
    };
}


function loadState() {

    const initial =
        createInitialState();


    const raw =
        localStorage.getItem(
            STORAGE_KEY
        );


    if (!raw) {
        return initial;
    }


    try {

        const parsed =
            JSON.parse(
                raw
            );


        const merged = {
            ...initial,
            ...parsed,
        };


        merged.version =
            STATE_VERSION;


        if (
            !Array.isArray(
                merged.event_types
            )
            ||
            merged.event_types.length
            ===
            0
        ) {

            merged.event_types =
                [...DEFAULT_EVENTS];
        }


        merged.events =
            Array.isArray(
                merged.events
            )
                ?
                merged.events.map(
                    normalizeEvent
                )
                :
                [];


        if (
            merged.clock_offset_seconds
            ===
            null
            ||
            merged.clock_offset_seconds
            ===
            undefined
            ||
            merged.clock_offset_seconds
            ===
            ""
        ) {

            merged.clock_offset_seconds =
                null;

        } else {

            const parsedOffset =
                Number(
                    merged.clock_offset_seconds
                );


            merged.clock_offset_seconds =
                Number.isFinite(
                    parsedOffset
                )
                    ?
                    parsedOffset
                    :
                    null;
        }


        if (
            Array.isArray(
                parsed.removed_stack
            )
        ) {

            merged.removed_stack =
                parsed.removed_stack
                    .filter(
                        index =>
                            Number.isInteger(
                                index
                            )
                            &&
                            index >= 0
                            &&
                            index <
                                merged.events.length
                            &&
                            merged.events[index]
                                .status
                                ===
                                "removed"
                    );

        } else {

            merged.removed_stack =
                merged.events
                    .map(
                        (
                            event,
                            index
                        ) =>
                            event.status
                            ===
                            "removed"
                                ?
                                index
                                :
                                null
                    )
                    .filter(
                        index =>
                            index
                            !==
                            null
                    );
        }


        if (
            ![
                "READY",
                "RUNNING",
                "COMPLETE",
            ].includes(
                merged.state
            )
        ) {

            merged.state =
                "READY";
        }


        return merged;

    } catch (error) {

        console.error(
            "Unable to load saved state:",
            error
        );


        return initial;
    }
}


let caseState =
    loadState();


let runtime = {
    elapsedBaseMs:
        0,

    perfAnchor:
        null,
};


/* =========================================================
   DOM
   ========================================================= */

const readyView =
    document.querySelector(
        "#readyView"
    );

const runningView =
    document.querySelector(
        "#runningView"
    );

const completeView =
    document.querySelector(
        "#completeView"
    );


const statusBadge =
    document.querySelector(
        "#statusBadge"
    );


const caseIdInput =
    document.querySelector(
        "#caseIdInput"
    );

const experimentTypeInput =
    document.querySelector(
        "#experimentTypeInput"
    );


const startButton =
    document.querySelector(
        "#startButton"
    );

const endButton =
    document.querySelector(
        "#endButton"
    );

const newCaseButton =
    document.querySelector(
        "#newCaseButton"
    );

const exportCsvButton =
    document.querySelector(
        "#exportCsvButton"
    );


const runningCaseId =
    document.querySelector(
        "#runningCaseId"
    );

const eventCount =
    document.querySelector(
        "#eventCount"
    );

const eventNoteInput =
    document.querySelector(
        "#eventNoteInput"
    );

const eventGrid =
    document.querySelector(
        "#eventGrid"
    );

const lastRecorded =
    document.querySelector(
        "#lastRecorded"
    );

const lastEventName =
    document.querySelector(
        "#lastEventName"
    );

const lastEventElapsed =
    document.querySelector(
        "#lastEventElapsed"
    );

const timeline =
    document.querySelector(
        "#timeline"
    );


const undoButton =
    document.querySelector(
        "#undoButton"
    );

const restoreButton =
    document.querySelector(
        "#restoreButton"
    );


const runningReferenceTime =
    document.querySelector(
        "#runningReferenceTime"
    );

const runningEegTime =
    document.querySelector(
        "#runningEegTime"
    );

const runningApplyCalibration =
    document.querySelector(
        "#runningApplyCalibration"
    );

const runningClearCalibration =
    document.querySelector(
        "#runningClearCalibration"
    );

const runningCalibrationStatus =
    document.querySelector(
        "#runningCalibrationStatus"
    );


const completeCaseId =
    document.querySelector(
        "#completeCaseId"
    );

const completeSummary =
    document.querySelector(
        "#completeSummary"
    );

const completeTimeline =
    document.querySelector(
        "#completeTimeline"
    );


const completeReferenceTime =
    document.querySelector(
        "#completeReferenceTime"
    );

const completeEegTime =
    document.querySelector(
        "#completeEegTime"
    );

const completeApplyCalibration =
    document.querySelector(
        "#completeApplyCalibration"
    );

const completeClearCalibration =
    document.querySelector(
        "#completeClearCalibration"
    );

const completeCalibrationStatus =
    document.querySelector(
        "#completeCalibrationStatus"
    );


/* =========================================================
   STORAGE
   ========================================================= */

function saveState() {

    caseState.version =
        STATE_VERSION;


    if (
        caseState.state
        ===
        "RUNNING"
    ) {

        caseState.elapsed_checkpoint_ms =
            getCurrentElapsedMs();


        caseState.saved_at_epoch_ms =
            Date.now();
    }


    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
            caseState
        )
    );
}


function clearSavedState() {

    localStorage.removeItem(
        STORAGE_KEY
    );
}


/* =========================================================
   TIMER
   ========================================================= */

function initializeRuntimeTimer() {

    if (
        caseState.state
        !==
        "RUNNING"
    ) {

        runtime.elapsedBaseMs =
            Number(
                caseState
                    .elapsed_checkpoint_ms
                ||
                0
            );


        runtime.perfAnchor =
            null;


        return;
    }


    const savedElapsed =
        Number(
            caseState
                .elapsed_checkpoint_ms
            ||
            0
        );


    const savedAt =
        Number(
            caseState
                .saved_at_epoch_ms
            ||
            Date.now()
        );


    const downtime =
        Math.max(
            0,
            Date.now()
            -
            savedAt
        );


    runtime.elapsedBaseMs =
        savedElapsed
        +
        downtime;


    runtime.perfAnchor =
        performance.now();
}


function getCurrentElapsedMs() {

    if (
        caseState.state
        !==
        "RUNNING"
    ) {

        return Number(
            caseState
                .elapsed_checkpoint_ms
            ||
            0
        );
    }


    if (
        runtime.perfAnchor
        ===
        null
    ) {

        return runtime
            .elapsedBaseMs;
    }


    return (
        runtime.elapsedBaseMs
        +
        (
            performance.now()
            -
            runtime.perfAnchor
        )
    );
}


/* =========================================================
   TIME FORMAT
   ========================================================= */

function pad2(
    value
) {

    return String(
        value
    ).padStart(
        2,
        "0"
    );
}


function pad3(
    value
) {

    return String(
        value
    ).padStart(
        3,
        "0"
    );
}


function formatElapsed(
    ms
) {

    const safeMs =
        Math.max(
            0,
            Number(ms)
            ||
            0
        );


    const totalSeconds =
        safeMs
        /
        1000;


    const hours =
        Math.floor(
            totalSeconds
            /
            3600
        );


    const minutes =
        Math.floor(
            (
                totalSeconds
                %
                3600
            )
            /
            60
        );


    const seconds =
        Math.floor(
            totalSeconds
            %
            60
        );


    const milliseconds =
        Math.floor(
            safeMs
            %
            1000
        );


    return (
        `${pad2(hours)}:`
        +
        `${pad2(minutes)}:`
        +
        `${pad2(seconds)}.`
        +
        `${pad3(milliseconds)}`
    );
}


function formatClock(
    value
) {

    if (!value) {
        return "";
    }


    const date =
        value instanceof Date
            ?
            value
            :
            new Date(
                value
            );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "";
    }


    return (
        `${pad2(date.getHours())}:`
        +
        `${pad2(date.getMinutes())}:`
        +
        `${pad2(date.getSeconds())}.`
        +
        `${pad3(date.getMilliseconds())}`
    );
}


function formatDateTimeLocal(
    value
) {

    if (!value) {
        return "";
    }


    const date =
        value instanceof Date
            ?
            value
            :
            new Date(
                value
            );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return "";
    }


    return (
        `${date.getFullYear()}-`
        +
        `${pad2(
            date.getMonth()
            +
            1
        )}-`
        +
        `${pad2(
            date.getDate()
        )} `
        +
        `${pad2(
            date.getHours()
        )}:`
        +
        `${pad2(
            date.getMinutes()
        )}:`
        +
        `${pad2(
            date.getSeconds()
        )}.`
        +
        `${pad3(
            date.getMilliseconds()
        )}`
    );
}


/* =========================================================
   CALIBRATION
   ========================================================= */

function parseClockText(
    rawValue
) {

    const value =
        rawValue
            .trim();


    const match =
        value.match(
            /^(\d{1,2}):([0-5]\d):([0-5]\d)(?:\.(\d{1,3}))?$/
        );


    if (!match) {
        return null;
    }


    const hours =
        Number(
            match[1]
        );


    const minutes =
        Number(
            match[2]
        );


    const seconds =
        Number(
            match[3]
        );


    if (
        hours < 0
        ||
        hours > 23
    ) {
        return null;
    }


    const milliseconds =
        Number(
            (
                match[4]
                ||
                "0"
            )
                .padEnd(
                    3,
                    "0"
                )
        );


    return (
        (
            (
                hours
                *
                60
                *
                60
            )
            +
            (
                minutes
                *
                60
            )
            +
            seconds
        )
        *
        1000
        +
        milliseconds
    );
}


function formatClockMsOfDay(
    ms
) {

    const dayMs =
        24
        *
        60
        *
        60
        *
        1000;


    let safe =
        (
            Number(ms)
            %
            dayMs
            +
            dayMs
        )
        %
        dayMs;


    const hours =
        Math.floor(
            safe
            /
            3600000
        );


    safe %=
        3600000;


    const minutes =
        Math.floor(
            safe
            /
            60000
        );


    safe %=
        60000;


    const seconds =
        Math.floor(
            safe
            /
            1000
        );


    const milliseconds =
        Math.floor(
            safe
            %
            1000
        );


    return (
        `${pad2(hours)}:`
        +
        `${pad2(minutes)}:`
        +
        `${pad2(seconds)}.`
        +
        `${pad3(milliseconds)}`
    );
}


function normalizeClockDifferenceMs(
    difference
) {

    const dayMs =
        24
        *
        60
        *
        60
        *
        1000;


    const halfDayMs =
        dayMs
        /
        2;


    let result =
        difference;


    if (
        result
        >
        halfDayMs
    ) {

        result -=
            dayMs;

    } else if (
        result
        <
        -halfDayMs
    ) {

        result +=
            dayMs;
    }


    return result;
}


function applyCalibration(
    referenceInput,
    eegInput
) {

    const referenceMs =
        parseClockText(
            referenceInput.value
        );


    const eegMs =
        parseClockText(
            eegInput.value
        );


    if (
        referenceMs
        ===
        null
        ||
        eegMs
        ===
        null
    ) {

        alert(
            "Please enter both clocks as HH:MM:SS or HH:MM:SS.mmm."
        );

        return;
    }


    const rawDifference =
        referenceMs
        -
        eegMs;


    const offsetMs =
        normalizeClockDifferenceMs(
            rawDifference
        );


    caseState.clock_offset_seconds =
        offsetMs
        /
        1000;


    caseState.calibration_reference_time =
        formatClockMsOfDay(
            referenceMs
        );


    caseState.calibration_eeg_time =
        formatClockMsOfDay(
            eegMs
        );


    saveState();

    render();
}


function clearCalibration() {

    caseState.clock_offset_seconds =
        null;


    caseState.calibration_reference_time =
        null;


    caseState.calibration_eeg_time =
        null;


    saveState();

    render();
}


function hasCalibration() {

    return Number.isFinite(
        caseState
            .clock_offset_seconds
    );
}


function getEegDatetime(
    referenceDatetime
) {

    if (
        !referenceDatetime
        ||
        !hasCalibration()
    ) {

        return null;
    }


    const reference =
        new Date(
            referenceDatetime
        );


    if (
        Number.isNaN(
            reference.getTime()
        )
    ) {

        return null;
    }


    return new Date(
        reference.getTime()
        -
        (
            caseState
                .clock_offset_seconds
            *
            1000
        )
    );
}


function formatSignedOffset(
    seconds
) {

    const value =
        Number(
            seconds
        );


    if (
        !Number.isFinite(
            value
        )
    ) {

        return "Not calibrated";
    }


    const sign =
        value > 0
            ?
            "+"
            :
            "";


    return (
        `${sign}${value.toFixed(3)} s`
    );
}


function renderCalibration(
    referenceInput,
    eegInput,
    statusElement
) {

    referenceInput.value =
        caseState
            .calibration_reference_time
        ||
        "";


    eegInput.value =
        caseState
            .calibration_eeg_time
        ||
        "";


    if (
        !hasCalibration()
    ) {

        statusElement.textContent =
            "Not calibrated";

        return;
    }


    statusElement.textContent =
        `Offset ${formatSignedOffset(
            caseState
                .clock_offset_seconds
        )} · EEG time = Reference time − offset`;
}


/* =========================================================
   CASE ACTIONS
   ========================================================= */

function startExperiment() {

    const caseId =
        caseIdInput.value
            .trim();


    const experimentType =
        experimentTypeInput.value
            .trim();


    if (!caseId) {

        alert(
            "Please enter a Case ID."
        );

        return;
    }


    /*
    Capture the experiment start timestamp
    before storage work.
    */

    const now =
        new Date();


    caseState.case_id =
        caseId;


    caseState.experiment_type =
        experimentType;


    caseState.state =
        "RUNNING";


    caseState.experiment_start_datetime =
        now.toISOString();


    caseState.experiment_end_datetime =
        null;


    caseState.elapsed_checkpoint_ms =
        0;


    caseState.saved_at_epoch_ms =
        Date.now();


    caseState.events =
        [];


    caseState.removed_stack =
        [];


    runtime.elapsedBaseMs =
        0;


    runtime.perfAnchor =
        performance.now();


    saveState();

    render();
}


function recordEvent(
    eventName
) {

    if (
        caseState.state
        !==
        "RUNNING"
    ) {
        return;
    }


    /*
    Timestamp first.

    Scientific timing values are captured
    before localStorage work.
    */

    const now =
        new Date();


    const elapsedMs =
        getCurrentElapsedMs();


    const note =
        eventNoteInput.value
            .trim();


    const event = {

        event_original:
            eventName,

        event:
            eventName,

        reference_datetime:
            now.toISOString(),

        elapsed_seconds:
            elapsedMs
            /
            1000,

        note:
            note,

        status:
            "active",

        renamed_at:
            null,

        removed_at:
            null,

        restored_at:
            null,

        correction_count:
            0,
    };


    caseState.events.push(
        event
    );


    eventNoteInput.value =
        "";


    saveState();

    render();
}


function endExperiment() {

    if (
        caseState.state
        !==
        "RUNNING"
    ) {
        return;
    }


    const elapsed =
        getCurrentElapsedMs();


    const now =
        new Date();


    caseState.elapsed_checkpoint_ms =
        elapsed;


    caseState.experiment_end_datetime =
        now.toISOString();


    caseState.state =
        "COMPLETE";


    caseState.saved_at_epoch_ms =
        Date.now();


    runtime.elapsedBaseMs =
        elapsed;


    runtime.perfAnchor =
        null;


    saveState();

    render();
}


function newCase() {

    const confirmed =
        window.confirm(
            "Start a new case? "
            +
            "The current local prototype record "
            +
            "will be cleared."
        );


    if (!confirmed) {
        return;
    }


    clearSavedState();


    caseState =
        createInitialState();


    runtime = {
        elapsedBaseMs:
            0,

        perfAnchor:
            null,
    };


    render();
}


/* =========================================================
   RUNNING UNDO / RESTORE
   ========================================================= */

function undoLastEvent() {

    if (
        caseState.state
        !==
        "RUNNING"
    ) {
        return;
    }


    for (
        let index =
            caseState.events.length
            -
            1;

        index >= 0;

        index--
    ) {

        const event =
            caseState.events[
                index
            ];


        if (
            event.status
            !==
            "active"
        ) {
            continue;
        }


        event.status =
            "removed";


        event.removed_at =
            new Date()
                .toISOString();


        event.correction_count =
            Number(
                event.correction_count
                ||
                0
            )
            +
            1;


        if (
            !caseState
                .removed_stack
                .includes(
                    index
                )
        ) {

            caseState
                .removed_stack
                .push(
                    index
                );
        }


        saveState();

        render();

        return;
    }
}


function restoreLastRemovedEvent() {

    if (
        caseState.state
        !==
        "RUNNING"
    ) {
        return;
    }


    while (
        caseState
            .removed_stack
            .length
        >
        0
    ) {

        const index =
            caseState
                .removed_stack
                .pop();


        const event =
            caseState.events[
                index
            ];


        if (
            !event
            ||
            event.status
            !==
            "removed"
        ) {
            continue;
        }


        event.status =
            "active";


        event.restored_at =
            new Date()
                .toISOString();


        event.correction_count =
            Number(
                event.correction_count
                ||
                0
            )
            +
            1;


        saveState();

        render();

        return;
    }
}


/* =========================================================
   COMPLETE QC ACTIONS
   ========================================================= */

function renameEventAtIndex(
    index
) {

    if (
        caseState.state
        !==
        "COMPLETE"
    ) {
        return;
    }


    const event =
        caseState.events[
            index
        ];


    if (!event) {
        return;
    }


    const newName =
        window.prompt(
            "Correct event label:",
            event.event
        );


    if (
        newName
        ===
        null
    ) {
        return;
    }


    const cleanName =
        newName
            .trim();


    if (!cleanName) {

        alert(
            "Event label cannot be empty."
        );

        return;
    }


    if (
        cleanName
        ===
        event.event
    ) {
        return;
    }


    /*
    Only the interpreted label changes.

    Original event label,
    reference timestamp and elapsed time
    remain untouched.
    */

    event.event =
        cleanName;


    event.renamed_at =
        new Date()
            .toISOString();


    event.correction_count =
        Number(
            event.correction_count
            ||
            0
        )
        +
        1;


    saveState();

    render();
}


function toggleEventStatusAtIndex(
    index
) {

    if (
        caseState.state
        !==
        "COMPLETE"
    ) {
        return;
    }


    const event =
        caseState.events[
            index
        ];


    if (!event) {
        return;
    }


    if (
        event.status
        ===
        "active"
    ) {

        event.status =
            "removed";


        event.removed_at =
            new Date()
                .toISOString();


        event.correction_count =
            Number(
                event.correction_count
                ||
                0
            )
            +
            1;


        if (
            !caseState
                .removed_stack
                .includes(
                    index
                )
        ) {

            caseState
                .removed_stack
                .push(
                    index
                );
        }

    } else {

        event.status =
            "active";


        event.restored_at =
            new Date()
                .toISOString();


        event.correction_count =
            Number(
                event.correction_count
                ||
                0
            )
            +
            1;


        caseState.removed_stack =
            caseState
                .removed_stack
                .filter(
                    savedIndex =>
                        savedIndex
                        !==
                        index
                );
    }


    saveState();

    render();
}


/* =========================================================
   EVENT HELPERS
   ========================================================= */

function getLatestActiveEvent() {

    for (
        let index =
            caseState.events.length
            -
            1;

        index >= 0;

        index--
    ) {

        const event =
            caseState.events[
                index
            ];


        if (
            event.status
            ===
            "active"
        ) {

            return event;
        }
    }


    return null;
}


function hasActiveEvent() {

    return caseState.events.some(
        event =>
            event.status
            ===
            "active"
    );
}


function hasRestorableEvent() {

    return caseState
        .removed_stack
        .some(
            index =>
                caseState.events[
                    index
                ]
                &&
                caseState.events[
                    index
                ].status
                ===
                "removed"
        );
}


/* =========================================================
   CSV EXPORT
   ========================================================= */

function csvEscape(
    value
) {

    if (
        value
        ===
        null
        ||
        value
        ===
        undefined
    ) {

        return "";
    }


    const text =
        String(
            value
        );


    if (
        text.includes(",")
        ||
        text.includes("\"")
        ||
        text.includes("\n")
        ||
        text.includes("\r")
    ) {

        return (
            "\""
            +
            text.replace(
                /"/g,
                "\"\""
            )
            +
            "\""
        );
    }


    return text;
}


function makeCsvRow(
    values
) {

    return values
        .map(
            csvEscape
        )
        .join(
            ","
        );
}


function buildCsv() {

    const rows = [
        makeCsvRow(
            CSV_COLUMNS
        ),
    ];


    caseState.events.forEach(
        (
            event,
            index
        ) => {

            const eegDatetime =
                getEegDatetime(
                    event.reference_datetime
                );


            const record = {

                case_id:
                    caseState.case_id,

                experiment_type:
                    caseState
                        .experiment_type,

                event_preset:
                    caseState
                        .event_preset
                    ||
                    "",

                experiment_start_datetime:
                    formatDateTimeLocal(
                        caseState
                            .experiment_start_datetime
                    ),

                experiment_end_datetime:
                    formatDateTimeLocal(
                        caseState
                            .experiment_end_datetime
                    ),

                event_index:
                    index
                    +
                    1,

                event_original:
                    event.event_original,

                event:
                    event.event,

                event_status:
                    event.status,

                note:
                    event.note,

                reference_datetime:
                    formatDateTimeLocal(
                        event.reference_datetime
                    ),

                eeg_datetime:
                    eegDatetime
                        ?
                        formatDateTimeLocal(
                            eegDatetime
                        )
                        :
                        "",

                elapsed_seconds:
                    Number(
                        event.elapsed_seconds
                    ).toFixed(
                        3
                    ),

                elapsed_time:
                    formatElapsed(
                        Number(
                            event.elapsed_seconds
                        )
                        *
                        1000
                    ),

                renamed_at:
                    formatDateTimeLocal(
                        event.renamed_at
                    ),

                removed_at:
                    formatDateTimeLocal(
                        event.removed_at
                    ),

                restored_at:
                    formatDateTimeLocal(
                        event.restored_at
                    ),

                correction_count:
                    event.correction_count,

                clock_offset_s:
                    hasCalibration()
                        ?
                        Number(
                            caseState
                                .clock_offset_seconds
                        ).toFixed(
                            3
                        )
                        :
                        "",

                calibration_reference_time:
                    caseState
                        .calibration_reference_time
                    ||
                    "",

                calibration_eeg_time:
                    caseState
                        .calibration_eeg_time
                    ||
                    "",
            };


            rows.push(
                makeCsvRow(
                    CSV_COLUMNS.map(
                        column =>
                            record[
                                column
                            ]
                    )
                )
            );
        }
    );


    return rows.join(
        "\r\n"
    );
}


function safeFilenamePart(
    value
) {

    const text =
        String(
            value
            ||
            "case"
        )
            .trim();


    return (
        text
            .replace(
                /[\\/:*?"<>|]/g,
                "_"
            )
            .replace(
                /\s+/g,
                "_"
            )
        ||
        "case"
    );
}


function formatFilenameTimestamp(
    value
) {

    const date =
        new Date(
            value
            ||
            Date.now()
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "unknown_time";
    }


    return (
        `${date.getFullYear()}`
        +
        `${pad2(
            date.getMonth()
            +
            1
        )}`
        +
        `${pad2(
            date.getDate()
        )}`
        +
        "_"
        +
        `${pad2(
            date.getHours()
        )}`
        +
        `${pad2(
            date.getMinutes()
        )}`
        +
        `${pad2(
            date.getSeconds()
        )}`
    );
}


function exportCsv() {

    if (
        caseState.state
        !==
        "COMPLETE"
    ) {
        return;
    }


    const csv =
        buildCsv();


    /*
    UTF-8 BOM improves compatibility
    with Excel and Chinese text.
    */

    const blob =
        new Blob(
            [
                "\uFEFF",
                csv,
            ],
            {
                type:
                    "text/csv;charset=utf-8",
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement(
            "a"
        );


    const filename =
        safeFilenamePart(
            caseState.case_id
        )
        +
        "_"
        +
        formatFilenameTimestamp(
            caseState
                .experiment_start_datetime
        )
        +
        ".csv";


    link.href =
        url;


    link.download =
        filename;


    document.body
        .appendChild(
            link
        );


    link.click();


    link.remove();


    setTimeout(
        () => {

            URL.revokeObjectURL(
                url
            );
        },
        1000
    );
}


/* =========================================================
   RENDER
   ========================================================= */

function render() {

    readyView.classList.add(
        "hidden"
    );

    runningView.classList.add(
        "hidden"
    );

    completeView.classList.add(
        "hidden"
    );


    statusBadge.textContent =
        caseState.state;


    if (
        caseState.state
        ===
        "READY"
    ) {

        renderReady();

        return;
    }


    if (
        caseState.state
        ===
        "RUNNING"
    ) {

        renderRunning();

        return;
    }


    renderComplete();
}


function renderReady() {

    readyView.classList.remove(
        "hidden"
    );


    caseIdInput.value =
        caseState.case_id
        ||
        "";


    experimentTypeInput.value =
        caseState
            .experiment_type
        ||
        "LC_multi";
}


function renderRunning() {

    runningView.classList.remove(
        "hidden"
    );


    runningCaseId.textContent =
        caseState.case_id;


    eventCount.textContent =
        String(
            caseState.events
                .filter(
                    event =>
                        event.status
                        ===
                        "active"
                )
                .length
        );


    renderEventButtons();

    renderLastRecorded();


    renderTimeline(
        timeline,
        false
    );


    renderCalibration(
        runningReferenceTime,
        runningEegTime,
        runningCalibrationStatus
    );


    undoButton.disabled =
        !hasActiveEvent();


    restoreButton.disabled =
        !hasRestorableEvent();
}


function renderEventButtons() {

    eventGrid.innerHTML =
        "";


    const latestActive =
        getLatestActiveEvent();


    const latestName =
        latestActive
            ?
            latestActive.event
            :
            null;


    caseState.event_types.forEach(
        eventName => {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "event-button";


            button.textContent =
                eventName;


            if (
                eventName
                ===
                latestName
            ) {

                button.classList.add(
                    "selected"
                );
            }


            button.addEventListener(
                "click",
                () => {

                    recordEvent(
                        eventName
                    );
                }
            );


            eventGrid.appendChild(
                button
            );
        }
    );
}


function renderLastRecorded() {

    const event =
        getLatestActiveEvent();


    if (!event) {

        lastRecorded.classList.add(
            "hidden"
        );

        return;
    }


    lastRecorded.classList.remove(
        "hidden"
    );


    lastEventName.textContent =
        event.event;


    lastEventElapsed.textContent =
        formatElapsed(
            event.elapsed_seconds
            *
            1000
        );
}


function renderTimeline(
    target,
    allowCorrections
) {

    target.innerHTML =
        "";


    if (
        caseState.events.length
        ===
        0
    ) {

        const empty =
            document.createElement(
                "div"
            );


        empty.className =
            "timeline-empty";


        empty.textContent =
            "No events recorded yet.";


        target.appendChild(
            empty
        );


        return;
    }


    caseState.events.forEach(
        (
            event,
            index
        ) => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "timeline-item";


            if (
                event.status
                ===
                "removed"
            ) {

                item.classList.add(
                    "removed"
                );
            }


            const mainRow =
                document.createElement(
                    "div"
                );


            mainRow.className =
                "timeline-main-row";


            const left =
                document.createElement(
                    "div"
                );


            left.className =
                "timeline-main";


            const nameRow =
                document.createElement(
                    "div"
                );


            nameRow.className =
                "timeline-name-row";


            const name =
                document.createElement(
                    "div"
                );


            name.className =
                "timeline-name";


            name.textContent =
                `${String(
                    index + 1
                ).padStart(
                    2,
                    "0"
                )} · `
                +
                event.event;


            nameRow.appendChild(
                name
            );


            if (
                event.status
                ===
                "removed"
            ) {

                const chip =
                    document.createElement(
                        "span"
                    );


                chip.className =
                    "status-chip";


                chip.textContent =
                    "REMOVED";


                nameRow.appendChild(
                    chip
                );
            }


            left.appendChild(
                nameRow
            );


            if (
                event.event_original
                !==
                event.event
            ) {

                const original =
                    document.createElement(
                        "div"
                    );


                original.className =
                    "timeline-meta";


                original.textContent =
                    `Original: ${event.event_original}`;


                left.appendChild(
                    original
                );
            }


            const meta =
                document.createElement(
                    "div"
                );


            meta.className =
                "timeline-meta";


            const referenceText =
                `Ref ${formatClock(
                    event.reference_datetime
                )}`;


            const eegDatetime =
                getEegDatetime(
                    event.reference_datetime
                );


            if (eegDatetime) {

                meta.textContent =
                    referenceText
                    +
                    ` · EEG ${formatClock(
                        eegDatetime
                    )}`;

            } else {

                meta.textContent =
                    referenceText;
            }


            left.appendChild(
                meta
            );


            if (event.note) {

                const note =
                    document.createElement(
                        "div"
                    );


                note.className =
                    "timeline-meta";


                note.textContent =
                    `Note: ${event.note}`;


                left.appendChild(
                    note
                );
            }


            if (
                event.correction_count
                >
                0
            ) {

                const correction =
                    document.createElement(
                        "div"
                    );


                correction.className =
                    "timeline-meta";


                correction.textContent =
                    `Corrections: ${event.correction_count}`;


                left.appendChild(
                    correction
                );
            }


            const time =
                document.createElement(
                    "div"
                );


            time.className =
                "timeline-time";


            time.textContent =
                formatElapsed(
                    event.elapsed_seconds
                    *
                    1000
                );


            mainRow.appendChild(
                left
            );


            mainRow.appendChild(
                time
            );


            item.appendChild(
                mainRow
            );


            if (
                allowCorrections
            ) {

                const actions =
                    document.createElement(
                        "div"
                    );


                actions.className =
                    "timeline-actions";


                const renameButton =
                    document.createElement(
                        "button"
                    );


                renameButton.type =
                    "button";


                renameButton.className =
                    "mini-button";


                renameButton.textContent =
                    "Rename";


                renameButton.addEventListener(
                    "click",
                    () => {

                        renameEventAtIndex(
                            index
                        );
                    }
                );


                const statusButton =
                    document.createElement(
                        "button"
                    );


                statusButton.type =
                    "button";


                statusButton.className =
                    "mini-button";


                statusButton.textContent =
                    event.status
                    ===
                    "removed"
                        ?
                        "Restore"
                        :
                        "Remove";


                statusButton.addEventListener(
                    "click",
                    () => {

                        toggleEventStatusAtIndex(
                            index
                        );
                    }
                );


                actions.appendChild(
                    renameButton
                );


                actions.appendChild(
                    statusButton
                );


                item.appendChild(
                    actions
                );
            }


            target.appendChild(
                item
            );
        }
    );
}


function renderComplete() {

    completeView.classList.remove(
        "hidden"
    );


    completeCaseId.textContent =
        caseState.case_id;


    const activeCount =
        caseState.events.filter(
            event =>
                event.status
                ===
                "active"
        ).length;


    const removedCount =
        caseState.events.length
        -
        activeCount;


    completeSummary.textContent =
        `${activeCount} active`
        +
        (
            removedCount > 0
                ?
                ` · ${removedCount} removed`
                :
                ""
        )
        +
        ` · ${caseState.events.length} total`
        +
        " · "
        +
        formatElapsed(
            caseState
                .elapsed_checkpoint_ms
        );


    renderCalibration(
        completeReferenceTime,
        completeEegTime,
        completeCalibrationStatus
    );


    renderTimeline(
        completeTimeline,
        true
    );
}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

startButton.addEventListener(
    "click",
    startExperiment
);


endButton.addEventListener(
    "click",
    endExperiment
);


newCaseButton.addEventListener(
    "click",
    newCase
);


exportCsvButton.addEventListener(
    "click",
    exportCsv
);


undoButton.addEventListener(
    "click",
    undoLastEvent
);


restoreButton.addEventListener(
    "click",
    restoreLastRemovedEvent
);


runningApplyCalibration
    .addEventListener(
        "click",
        () => {

            applyCalibration(
                runningReferenceTime,
                runningEegTime
            );
        }
    );


runningClearCalibration
    .addEventListener(
        "click",
        clearCalibration
    );


completeApplyCalibration
    .addEventListener(
        "click",
        () => {

            applyCalibration(
                completeReferenceTime,
                completeEegTime
            );
        }
    );


completeClearCalibration
    .addEventListener(
        "click",
        clearCalibration
    );


/* =========================================================
   INITIALIZE
   ========================================================= */

initializeRuntimeTimer();

render();