"use strict";
/*
 * In-page replacements for the dialogs the application normally hands to the
 * operating system.
 *
 * A native message box, file dialog or colour picker cannot be driven by the
 * application's own on-screen keyboard, so on a touch panel they are a dead
 * end. These are plain DOM, so the file browser's name field opens the entry
 * window like any other field in the application.
 *
 * Self-contained for the same reason as touch.js and osk.js: the modal popups
 * declare their own `const remote`, so the requires stay inside the IIFE and
 * only `touchDialogs` is exposed.
 */
(function (window) {

    const remote = require("@electron/remote");
    const fs = require("fs");
    const path = require("path");

    // Enough colours to tell a dozen pens apart, light and dark, without a
    // colour wheel that needs fine pointing.
    const SWATCHES = [
        "#ff0000", "#ff7f00", "#ffbf00", "#ffff00", "#bfff00", "#00ff00",
        "#00ff7f", "#00ffff", "#007fff", "#0000ff", "#7f00ff", "#ff00ff",
        "#a00000", "#a05000", "#a08000", "#808000", "#008000", "#008080",
        "#004f80", "#000080", "#4f0080", "#800080", "#ffffff", "#808080"
    ];

    //#region SHELL
    function el(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined && text !== null) node.innerText = text;
        return node;
    }

    function button(label, fn, className) {
        var btn = el("div", "tdBtn" + (className ? " " + className : ""), label);
        btn.addEventListener("click", fn);
        return btn;
    }

    /// Builds the overlay and returns {overlay, dialog, close}. Nothing outside
    /// the dialog can be touched while it is up.
    ///
    function openShell(title) {
        var overlay = el("div", "tdOverlay");
        var dialog = el("div", "tdDialog");
        dialog.appendChild(el("div", "tdTitle", title));
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // The windows these dialogs open in are fitted to their own content, so
        // there is no spare height for one laid over the top: the file browser
        // is taller than the whole of the Export window, and the dialog's
        // max-height crops its buttons off rather than squeezing them in. The
        // height is borrowed here and given back when the dialog closes. (The
        // keyboard needs none of this - it is a window of its own.)
        //
        // Measured on the next frame, because the caller is still filling the
        // dialog in when this returns.
        var giveHeightBack = null;
        window.requestAnimationFrame(function () {
            if (!window.touchUI || overlay.parentNode === null) return;

            var needed = 0;
            for (var i = 0; i < dialog.children.length; i++) {
                var part = dialog.children[i];
                // The file list is scrolled, so it only needs enough height to
                // be worth scrolling; everything else has to be shown whole.
                needed += part.classList.contains("tdList") ?
                    Math.min(part.scrollHeight, 180) : part.scrollHeight;
            }

            // The overlay's own padding, and the dialog's border.
            giveHeightBack = touchUI.borrowSpace(0, needed + 40);
        });

        return {
            overlay: overlay,
            dialog: dialog,
            close: function () {
                overlay.remove();
                if (giveHeightBack) {
                    giveHeightBack();
                    giveHeightBack = null;
                }
            }
        };
    }
    //#endregion SHELL

    //#region MESSAGES
    function showMessage(message, title, kind) {
        return new Promise(function (resolve) {
            var shell = openShell(title);
            shell.dialog.classList.add("tdMessage");
            if (kind === "warning") shell.dialog.classList.add("tdWarning");

            shell.dialog.appendChild(el("div", "tdBody", message));

            var footer = el("div", "tdFooter");
            footer.appendChild(el("div", "tdSpacer"));
            footer.appendChild(button("OK", function () {
                shell.close();
                resolve(true);
            }, "tdBtnPrimary"));
            shell.dialog.appendChild(footer);
        });
    }

    function showConfirm(message, title) {
        return new Promise(function (resolve) {
            var shell = openShell(title || "Confirm");
            shell.dialog.classList.add("tdMessage");
            shell.dialog.appendChild(el("div", "tdBody", message));

            var footer = el("div", "tdFooter");
            footer.appendChild(button("No", function () {
                shell.close();
                resolve(false);
            }));
            footer.appendChild(el("div", "tdSpacer"));
            footer.appendChild(button("Yes", function () {
                shell.close();
                resolve(true);
            }, "tdBtnPrimary"));
            shell.dialog.appendChild(footer);
        });
    }
    //#endregion MESSAGES

    //#region FILE PICKER
    function hasExtension(name, extensions) {
        if (!extensions || extensions.length === 0) return true;
        var lower = name.toLowerCase();
        for (var i = 0; i < extensions.length; i++) {
            if (extensions[i] === "*") return true;
            if (lower.endsWith("." + extensions[i].toLowerCase())) return true;
        }
        return false;
    }

    function readDir(dir, extensions) {
        var dirs = [];
        var files = [];
        try {
            var entries = fs.readdirSync(dir, { withFileTypes: true });
            for (var i = 0; i < entries.length; i++) {
                var entry = entries[i];
                if (entry.name.charAt(0) === ".") continue;
                if (entry.isDirectory()) dirs.push(entry.name);
                else if (hasExtension(entry.name, extensions)) files.push(entry.name);
            }
        }
        catch (err) {
            console.log(err);
        }
        dirs.sort();
        files.sort();
        return { dirs: dirs, files: files };
    }

    /// The touch stand-in for dialog.showOpenDialog / showSaveDialog.
    ///
    /// opts: {mode: "open"|"save", dir, extensions: ["trd"], defaultName, title}
    /// Resolves {canceled: true} or {canceled: false, filePath: "..."} so the
    /// call sites read the same way as the native dialogs they replace.
    function pickFile(opts) {
        var options = opts || {};
        var mode = (options.mode === "save") ? "save" : "open";
        var extensions = options.extensions || [];
        var dir = options.dir || remote.app.getPath("documents");
        var selected = null;

        return new Promise(function (resolve) {
            var shell = openShell(options.title ||
                (mode === "save" ? "Save As" : "Open"));
            shell.dialog.classList.add("tdFiles");

            var pathBar = el("div", "tdPath");
            var list = el("div", "tdList");
            var nameRow = null;
            var nameInput = null;

            if (mode === "save") {
                nameRow = el("div", "tdNameRow");
                nameRow.appendChild(el("div", "tdNameLabel", "Name"));
                nameInput = document.createElement("input");
                nameInput.className = "tdNameInput";
                nameInput.setAttribute("data-osk", "alpha");
                nameInput.value = options.defaultName || "";
                nameRow.appendChild(nameInput);
            }

            function accept() {
                var name = (mode === "save") ?
                    nameInput.value.trim() : (selected || "");
                if (name === "") return;
                shell.close();
                resolve({ canceled: false, filePath: path.join(dir, name) });
            }

            function render() {
                pathBar.innerText = dir;
                list.innerHTML = "";

                var parent = path.dirname(dir);
                if (parent !== dir) {
                    var up = el("div", "tdItem tdItemDir", "↑  ..");
                    up.addEventListener("click", function () {
                        dir = parent;
                        selected = null;
                        render();
                    });
                    list.appendChild(up);
                }

                var contents = readDir(dir, extensions);

                contents.dirs.forEach(function (name) {
                    var item = el("div", "tdItem tdItemDir", "▸  " + name);
                    item.addEventListener("click", function () {
                        dir = path.join(dir, name);
                        selected = null;
                        render();
                    });
                    list.appendChild(item);
                });

                contents.files.forEach(function (name) {
                    var item = el("div", "tdItem", name);
                    if (name === selected) item.classList.add("tdItemSelected");
                    item.addEventListener("click", function () {
                        selected = name;
                        if (nameInput) nameInput.value = name;
                        render();
                    });
                    list.appendChild(item);
                });

                if (contents.dirs.length === 0 && contents.files.length === 0) {
                    list.appendChild(el("div", "tdEmpty", "Nothing here."));
                }
            }

            shell.dialog.appendChild(pathBar);
            shell.dialog.appendChild(list);
            if (nameRow) shell.dialog.appendChild(nameRow);

            var footer = el("div", "tdFooter");
            footer.appendChild(button("Cancel", function () {
                shell.close();
                resolve({ canceled: true });
            }));
            footer.appendChild(el("div", "tdSpacer"));
            footer.appendChild(button(mode === "save" ? "Save" : "Open",
                accept, "tdBtnPrimary"));
            shell.dialog.appendChild(footer);

            render();
        });
    }
    //#endregion FILE PICKER

    //#region COLOUR
    /// Replaces an <input type="color"> with a grid of swatches writing the same
    /// value, so the code reading input.value does not change. The swatches are
    /// inserted after the input and the input itself is hidden.
    function colorSwatches(input) {
        var grid = el("div", "tdSwatches");

        function markSelected() {
            var current = (input.value || "").toLowerCase();
            var cells = grid.querySelectorAll(".tdSwatch");
            for (var i = 0; i < cells.length; i++) {
                cells[i].classList.toggle("tdSwatchSelected",
                    cells[i].getAttribute("data-color") === current);
            }
        }

        SWATCHES.forEach(function (color) {
            var cell = el("div", "tdSwatch");
            cell.setAttribute("data-color", color);
            cell.style.background = color;
            cell.addEventListener("click", function () {
                input.value = color;
                input.dispatchEvent(new Event("input", { bubbles: true }));
                input.dispatchEvent(new Event("change", { bubbles: true }));
                markSelected();
            });
            grid.appendChild(cell);
        });

        input.parentNode.insertBefore(grid, input.nextSibling);
        input.classList.add("tdHiddenColor");
        markSelected();

        return { refresh: markSelected };
    }
    //#endregion COLOUR

    window.touchDialogs = {
        message: function (message, title) {
            return showMessage(message, title || "Information", "info");
        },
        warning: function (message, title) {
            return showMessage(message, title || "Warning", "warning");
        },
        confirm: showConfirm,
        pickFile: pickFile,
        colorSwatches: colorSwatches,
        swatches: SWATCHES
    };

})(window);
