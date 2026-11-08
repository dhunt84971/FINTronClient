"use strict";
/*
 * The data entry window.
 *
 * A window of its own rather than a keyboard docked into the window that owns
 * the field: the same size and the same layout wherever it is opened from, and
 * nothing the host window has to find room for.
 *
 * Two pages use this script - entryAlpha.html and entryNumeric.html - and the
 * data-layout attribute on <body> says which keyboard to build. Which page is
 * opened is osk.js's decision, taken from the field's data-osk attribute.
 *
 * Modelled on AppendHMIStudio (HmiDialogs.keyboard and HmiDialogs.keypad):
 * deliberately a plain QWERTY and a three column pad, because the job here is
 * a tag filter, a file name or a setpoint, not writing prose. Unlike the
 * original, keys insert at the caret rather than only appending to the end.
 *
 * The value is handed back to the window that asked for it over the channel it
 * named, and that window is the one that writes it into the field - so a field
 * is only ever changed by its own window.
 */

const electron = require("electron");
const remote = require("@electron/remote");

const ALPHA_ROWS = [
    "1234567890",
    "qwertyuiop",
    "asdfghjkl",
    "zxcvbnm"
];

var txtValue = document.getElementById("txtValue");
var keyBox = document.getElementById("keys");
var replyChannel = null;
var replied = false;
var shifted = false;
var charKeys = [];

//#region VALUE EDITING
function caret() {
    try {
        if (txtValue.selectionStart !== null && txtValue.selectionStart !== undefined) {
            return [txtValue.selectionStart, txtValue.selectionEnd];
        }
    }
    catch (err) {
        // selectionStart throws on some input types - fall through.
    }
    var len = txtValue.value.length;
    return [len, len];
}

function setCaret(pos) {
    try {
        txtValue.focus();
        txtValue.setSelectionRange(pos, pos);
    }
    catch (err) { /* not all input types carry a selection */ }
}

function insert(text) {
    var sel = caret();
    var value = txtValue.value;
    txtValue.value = value.substring(0, sel[0]) + text + value.substring(sel[1]);
    setCaret(sel[0] + text.length);
}

function backspace() {
    var sel = caret();
    var value = txtValue.value;
    if (sel[0] !== sel[1]) {
        txtValue.value = value.substring(0, sel[0]) + value.substring(sel[1]);
        setCaret(sel[0]);
    }
    else if (sel[0] > 0) {
        txtValue.value = value.substring(0, sel[0] - 1) + value.substring(sel[0]);
        setCaret(sel[0] - 1);
    }
}

function clear() {
    txtValue.value = "";
    setCaret(0);
}

/// Toggles the sign rather than inserting a stray minus, which is what the key
/// means on a numeric pad.
function sign() {
    txtValue.value = (txtValue.value.charAt(0) === "-") ?
        txtValue.value.substring(1) : "-" + txtValue.value;
    setCaret(txtValue.value.length);
}
//#endregion VALUE EDITING

//#region KEY BUILDING
function key(label, action, className) {
    var btn = document.createElement("div");
    btn.className = "entryKey" + (className ? " " + className : "");
    // A key labelled with a word needs more room than one holding a character:
    // "CLR" in a row of eleven is otherwise clipped to "CL".
    if (label.length > 1) btn.classList.add("entryKeyWord");
    btn.innerText = label;
    // pointerdown, not click, and the default is prevented so the value box
    // keeps both the focus and the caret position while keys are pressed.
    btn.addEventListener("pointerdown", function (e) {
        e.preventDefault();
        e.stopPropagation();
        action();
    });
    return btn;
}

function charKey(ch) {
    var btn = key(ch, function () {
        insert(shifted ? ch.toUpperCase() : ch);
    });
    btn.entryChar = ch;
    charKeys.push(btn);
    return btn;
}

function relabel() {
    for (var i = 0; i < charKeys.length; i++) {
        charKeys[i].innerText = shifted ?
            charKeys[i].entryChar.toUpperCase() : charKeys[i].entryChar;
    }
}

function row() {
    var el = document.createElement("div");
    el.className = "entryRow";
    return el;
}

function buildAlpha() {
    var r, c;

    r = row();
    for (c = 0; c < ALPHA_ROWS[0].length; c++) r.appendChild(charKey(ALPHA_ROWS[0].charAt(c)));
    r.appendChild(key("⌫", backspace));
    keyBox.appendChild(r);

    r = row();
    for (c = 0; c < ALPHA_ROWS[1].length; c++) r.appendChild(charKey(ALPHA_ROWS[1].charAt(c)));
    r.appendChild(key("CLR", clear));
    keyBox.appendChild(r);

    r = row();
    for (c = 0; c < ALPHA_ROWS[2].length; c++) r.appendChild(charKey(ALPHA_ROWS[2].charAt(c)));
    r.appendChild(charKey("-"));
    r.appendChild(charKey("_"));
    keyBox.appendChild(r);

    r = row();
    r.appendChild(key("⇧", function () {
        shifted = !shifted;
        relabel();
        keyBox.classList.toggle("entryShifted", shifted);
    }, "entryKeyShift"));
    for (c = 0; c < ALPHA_ROWS[3].length; c++) r.appendChild(charKey(ALPHA_ROWS[3].charAt(c)));
    r.appendChild(charKey(","));
    r.appendChild(charKey("."));
    r.appendChild(charKey("@"));
    keyBox.appendChild(r);

    r = row();
    r.appendChild(charKey(":"));
    r.appendChild(charKey("/"));
    r.appendChild(charKey("\\"));
    r.appendChild(key("space", function () { insert(" "); }, "entryKeySpace"));
    keyBox.appendChild(r);
}

function buildNumeric() {
    keyBox.classList.add("entryPad");

    var keys = [
        ["7"], ["8"], ["9"], ["⌫", backspace],
        ["4"], ["5"], ["6"], ["CLR", clear],
        ["1"], ["2"], ["3"], [":"],
        ["0"], ["."], ["-", sign], [null]
    ];

    for (var i = 0; i < keys.length; i++) {
        var label = keys[i][0];
        var action = keys[i][1];

        if (label === null) {
            // The sixteenth cell of a four by four pad. Nothing belongs in it,
            // but the grid still has to hold its shape.
            var blank = document.createElement("div");
            blank.className = "entryKey entryKeyBlank";
            keyBox.appendChild(blank);
        }
        else if (action) {
            keyBox.appendChild(key(label, action));
        }
        else {
            keyBox.appendChild(charKey(label));
        }
    }
}
//#endregion KEY BUILDING

//#region RESULT
/// Hands the value back to the window that opened this one, over the channel
/// it named. Sent exactly once: closing the window any other way - the frame's
/// close button, or the application shutting down - still has to answer, or
/// the opener would wait for a window that is no longer there.
function reply(accepted) {
    if (replied || replyChannel === null) return;
    replied = true;

    try {
        var parent = remote.getCurrentWindow().getParentWindow();
        if (parent && !parent.isDestroyed()) {
            parent.webContents.send(replyChannel, {
                accepted: accepted === true,
                value: txtValue.value
            });
        }
    }
    catch (err) {
        console.log(err);
    }
}

function accept() {
    reply(true);
    remote.getCurrentWindow().close();
}

function cancel() {
    reply(false);
    remote.getCurrentWindow().close();
}
//#endregion RESULT

//#region WIRING
electron.ipcRenderer.on("entryData", function (event, data) {
    if (!data) return;
    replyChannel = data.channel;
    // The title bar is where this window says which field it is for, so the
    // page's own title is only ever seen for the instant before this arrives.
    if (data.prompt) document.title = data.prompt;
    txtValue.value = (data.value === undefined || data.value === null) ? "" : data.value;
    txtValue.type = (data.masked === true) ? "password" : "text";
    txtValue.focus();
    txtValue.select();
});

document.getElementById("btnOK").addEventListener("click", accept);
document.getElementById("btnCancel").addEventListener("click", cancel);

document.addEventListener("keydown", function (e) {
    if (e.key === "Enter") accept();
    if (e.key === "Escape") cancel();
});

// The window may be closed by its own frame rather than by either button.
window.addEventListener("beforeunload", function () {
    reply(false);
});

if (document.body.getAttribute("data-layout") === "numeric") buildNumeric();
else buildAlpha();
//#endregion WIRING
