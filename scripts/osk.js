"use strict";
/*
 * Touchscreen data entry: tapping a field opens the entry window.
 *
 * The keyboard is a window of its own (scripts/entryAlpha.html and
 * scripts/entryNumeric.html), not a panel docked into whichever window owns
 * the field. It is always the same size, always in the same place, and the
 * window it was opened from neither changes shape nor has to find room for it.
 *
 * This file is the half that lives in the window with the fields: it decides
 * which keyboard a field wants, opens the window, and writes the answer back.
 * Nothing is typed into the field until OK is pressed, and then the same
 * events a hardware keyboard would have produced are dispatched - the tag
 * filter in pickPen.js, the duration in pickTimeRange.js and the inline rename
 * in globals.js are all driven by those, and none of them knows the entry
 * window exists.
 *
 * Loaded by every window and self-contained for the same reason as touch.js:
 * the modal popups declare their own `const remote`, so the requires stay
 * inside the IIFE and the only name added is `osk`.
 */
(function (window) {

    const electron = require("electron");
    const remote = require("@electron/remote");

    // One size per keyboard, used wherever it is opened from. Both are the
    // same height, so the window does not jump about between a setpoint and a
    // file name.
    const WINDOWS = {
        alpha: { page: "entryAlpha.html", width: 880, height: 520 },
        numeric: { page: "entryNumeric.html", width: 540, height: 520 }
    };

    // The entry pages sit beside this file, which is not where the window that
    // loaded it lives - __dirname in a renderer is the page's own folder.
    const here = (function () {
        var src = (document.currentScript && document.currentScript.src) || "";
        return src.replace(/\/[^\/]*$/, "");
    })();

    var current = null;      // {win, field, channel} while the window is open.
    var closedField = null;  // See the focusin handler at the foot of the file.
    var closedAt = 0;
    var sequence = 0;

    //#region FIELD HELPERS
    function isTextField(el) {
        if (!el || !el.tagName) return false;
        var tag = el.tagName.toUpperCase();
        if (tag === "TEXTAREA") return !el.readOnly && !el.disabled;
        if (tag !== "INPUT") return false;
        var type = (el.getAttribute("type") || "text").toLowerCase();
        if (["text", "password", "number", "search", "tel", "url", "email"].indexOf(type) < 0) {
            return false;
        }
        return !el.readOnly && !el.disabled;
    }

    /// Which keyboard a field wants: data-osk wins, then the input type, then
    /// the alphanumeric default. "none" means the field has its own picker (the
    /// date fields have a calendar) and is not typed into at all.
    function fieldLayout(el) {
        var declared = el.getAttribute("data-osk");
        if (declared) return declared.toLowerCase();
        var type = (el.getAttribute("type") || "text").toLowerCase();
        if (type === "number" || type === "tel") return "numeric";
        return "alpha";
    }

    function labelish(el) {
        return !!el && /(label|lbl)/i.test(el.className || "");
    }

    /// The text an element has of its own, not counting its children.
    function ownText(el) {
        var text = "";
        for (var i = 0; i < el.childNodes.length; i++) {
            if (el.childNodes[i].nodeType === 3) text += el.childNodes[i].nodeValue;
        }
        return text.trim();
    }

    /// What to call the value being entered, which becomes the entry window's
    /// title. The windows caption their fields in four different ways and none
    /// of them uses a <label for>, so each is tried in turn.
    function promptFor(field) {
        var text = "";
        var i;

        if (field.id) {
            var label = document.querySelector('label[for="' + field.id + '"]');
            if (label) text = label.innerText;
        }

        // A caption beside the field - the pen properties and pickPen rows.
        var previous = field.previousElementSibling;
        for (i = 0; text === "" && previous && i < 2; i++) {
            if (labelish(previous)) text = previous.innerText;
            previous = previous.previousElementSibling;
        }

        // The caption is the text of the box holding the field - the settings
        // screen writes "SQL TcpIp Port" that way.
        if (text === "" && field.parentElement) {
            text = ownText(field.parentElement);
        }

        // A caption on the row above - the time range window.
        if (text === "" && field.parentElement &&
            labelish(field.parentElement.previousElementSibling)) {
            text = field.parentElement.previousElementSibling.innerText;
        }

        if (text === "") text = field.getAttribute("placeholder") || "";
        if (text === "") text = field.getAttribute("title") || "";
        if (text === "") return "Enter Value";

        return text.replace(/\s*[:\-]\s*$/, "").trim();
    }
    //#endregion FIELD HELPERS

    //#region THE WINDOW
    /// Centred on the window that asked for it, and never off the display.
    function placeOver(parentWin, size) {
        var area;
        var bounds;

        try {
            bounds = parentWin.getBounds();
            area = remote.screen.getDisplayMatching(bounds).workArea;
        }
        catch (err) {
            return { width: size.width, height: size.height };
        }

        var width = Math.min(size.width, area.width - 40);
        var height = Math.min(size.height, area.height - 60);
        var x = Math.round(bounds.x + (bounds.width / 2) - (width / 2));
        var y = Math.round(bounds.y + (bounds.height / 2) - (height / 2));

        return {
            width: width,
            height: height,
            x: Math.max(area.x, Math.min(x, area.x + area.width - width)),
            y: Math.max(area.y, Math.min(y, area.y + area.height - height))
        };
    }

    function forget(field) {
        closedField = field;
        closedAt = Date.now();
        current = null;
    }

    function destroy(win) {
        try {
            if (win && !win.isDestroyed()) win.destroy();
        }
        catch (err) {
            console.log(err);
        }
    }

    /// The entry window has answered. Writing the value back is this window's
    /// job rather than the entry window's, so a field is only ever changed
    /// from the window that owns it.
    function finish(result) {
        if (current === null) return;

        var field = current.field;
        var win = current.win;

        forget(field);
        destroy(win);

        if (!result || result.accepted !== true) return;

        field.value = result.value;
        field.dispatchEvent(new Event("input", { bubbles: true }));
        field.dispatchEvent(new Event("change", { bubbles: true }));

        var opts = { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true };
        field.dispatchEvent(new KeyboardEvent("keydown", opts));
        field.dispatchEvent(new KeyboardEvent("keyup", opts));
    }
    //#endregion THE WINDOW

    var osk = {

        isOpen: function () {
            return current !== null;
        },

        /// Opens the entry window for a field. Called from the focus handler,
        /// but safe to call directly.
        show: function (field, wanted) {
            if (!window.touchUI || !window.touchUI.enabled) return;
            if (!isTextField(field)) return;

            var layout = wanted || fieldLayout(field);
            if (layout === "none") return;
            if (current !== null) return;

            var spec = WINDOWS[layout === "numeric" ? "numeric" : "alpha"];
            var parentWin = remote.getCurrentWindow();
            var place = placeOver(parentWin, spec);
            var channel = "oskEntry" + (++sequence) + "_" + Date.now();
            var prompt = promptFor(field);
            var value = field.value;

            // The field must not be holding the focus while the entry window
            // is up: the focus coming back when it closes would open it again.
            field.blur();

            var win = new remote.BrowserWindow({
                parent: parentWin,
                modal: true,
                resizable: false,
                minimizable: false,
                maximizable: false,
                fullscreenable: false,
                width: place.width,
                height: place.height,
                x: place.x,
                y: place.y,
                show: false,
                useContentSize: true,
                title: prompt,
                backgroundColor: "#2a2d30",
                webPreferences: {
                    nodeIntegration: true,
                    contextIsolation: false
                }
            });

            win.setMenuBarVisibility(false);
            current = { win: win, field: field, channel: channel };

            electron.ipcRenderer.once(channel, function (event, result) {
                finish(result);
            });

            win.webContents.on("did-finish-load", function () {
                win.webContents.send("entryData", {
                    channel: channel,
                    prompt: prompt,
                    value: value,
                    masked: field.getAttribute("type") === "password"
                });
            });

            win.once("ready-to-show", function () {
                win.show();
            });

            win.loadURL(here + "/" + spec.page);
        },

        /// Closes the entry window without taking a value from it.
        hide: function () {
            if (current === null) return;

            var win = current.win;
            electron.ipcRenderer.removeAllListeners(current.channel);
            forget(current.field);
            destroy(win);
        },

        /// Called when touchscreen mode is switched off while the window is up.
        refresh: function () {
            if (!window.touchUI || !window.touchUI.enabled) this.hide();
        }
    };

    //#region WIRING
    document.addEventListener("focusin", function (e) {
        if (!window.touchUI || !window.touchUI.enabled) return;
        if (!isTextField(e.target)) return;
        // Belt and braces for the blur above: whatever hands the focus back to
        // the field the window was just closed for must not open it again.
        if (e.target === closedField && Date.now() - closedAt < 400) return;

        osk.show(e.target);
    });

    window.addEventListener("beforeunload", function () {
        osk.hide();
    });
    //#endregion WIRING

    window.osk = osk;

})(window);
