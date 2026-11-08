"use strict";
/*
 * Touchscreen support.
 *
 * This file is loaded by every window in the application, including the modal
 * popups that do not load globals.js. Two classic scripts in one window cannot
 * both declare `const remote` at the top level, so everything here lives inside
 * an IIFE with its own requires and the only name added to the window is
 * `touchUI`.
 *
 * What it provides:
 *   - the `touch` / `kiosk` classes on <body> that touch.css hangs off,
 *   - the persisted touchMode / kioskMode flags,
 *   - pointer-based replacements for the two mouse-only gestures the app uses:
 *     right-click (long press) and HTML5 drag and drop (pointer drag).
 */
(function (window) {

    const remote = require("@electron/remote");
    const fs = require("fs");
    const path = require("path");
    const libAppSettings = require("lib-app-settings");

    const touchSettingsFile = path.join(remote.app.getPath("userData"), ".settings");
    const touchAppSettings = new libAppSettings(touchSettingsFile);

    // How long a finger has to stay put to count as a right-click, and how far
    // it may wander before the press becomes a scroll instead.
    const LONG_PRESS_MS = 500;
    const MOVE_CANCEL_PX = 10;

    function readSettings() {
        try {
            var s = JSON.parse(fs.readFileSync(touchSettingsFile, "utf8"));
            return (s && typeof s === "object") ? s : {};
        }
        catch (err) {
            return {};
        }
    }

    function whenBodyReady(fn) {
        if (document.body) {
            fn();
        }
        else {
            document.addEventListener("DOMContentLoaded", fn);
        }
    }

    /// The popup windows are created with resizable: false, which blocks a
    /// programmatic resize just as it blocks a dragged one.
    function setBounds(win, bounds) {
        var resizable = win.isResizable();
        if (!resizable) win.setResizable(true);
        win.setContentBounds(bounds);
        if (!resizable) win.setResizable(false);
    }

    var changeCallbacks = [];

    var touchUI = {

        enabled: false,
        kiosk: false,

        //#region MODE STATE
        init: function () {
            var s = readSettings();
            this.enabled = s.touchMode === true;
            this.kiosk = s.kioskMode === true;
            whenBodyReady(this.applyClasses.bind(this));
        },

        applyClasses: function () {
            if (!document.body) return;
            document.body.classList.toggle("touch", this.enabled);
            document.body.classList.toggle("kiosk", this.enabled && this.kiosk);
            this.updateMetrics();
        },

        /// Fixes the touch target and font sizes in pixels on <body>, where they
        /// override the viewport-relative defaults in touch.css.
        ///
        /// They cannot be left in vh. A window is grown to hold a dialog that
        /// does not fit it - the file browser over the Export window - and
        /// every vh unit in the window grows with it, so the page underneath
        /// swells while the dialog is up and shrinks again when it closes.
        /// Measured once per window size and fixed in pixels instead.
        updateMetrics: function () {
            if (!document.body) return;

            if (!this.enabled) {
                document.body.style.removeProperty("--touch_target");
                document.body.style.removeProperty("--touch_font");
                return;
            }

            var h = window.innerHeight;
            var target = Math.round(Math.min(62, Math.max(44, h * 0.075)));
            var font = Math.round(Math.min(20, Math.max(15, h * 0.024)));
            document.body.style.setProperty("--touch_target", target + "px");
            document.body.style.setProperty("--touch_font", font + "px");
        },

        /// Turns touchscreen mode on or off in this window and persists it.
        /// setSettingInFile merges into the file, so the window bounds and the
        /// other windows' saved sizes survive.
        setEnabled: function (on) {
            this.enabled = (on === true);
            this.applyClasses();
            this.notify();
            return touchAppSettings.setSettingInFile("touchMode", this.enabled)
                .catch(function (err) { console.log(err); });
        },

        /// Kiosk mode only takes effect on the next start, since the window is
        /// created fullscreen and frameless in main.js.
        setKiosk: function (on) {
            this.kiosk = (on === true);
            this.applyClasses();
            this.notify();
            return touchAppSettings.setSettingInFile("kioskMode", this.kiosk)
                .catch(function (err) { console.log(err); });
        },

        /// The size a popup window should open at. Touch mode needs more room:
        /// the same controls, with finger-sized targets and a bigger font, do
        /// not fit a dialog laid out for a mouse. Never larger than the display
        /// the application is on.
        popupSize: function (width, height, touchWidth, touchHeight) {
            if (!this.enabled) {
                return { width: width, height: height };
            }

            var area;
            try {
                area = remote.screen.getDisplayMatching(
                    remote.getCurrentWindow().getBounds()).workAreaSize;
            }
            catch (err) {
                area = { width: 1024, height: 768 };
            }

            return {
                width: Math.min(Math.max(width, touchWidth), area.width - 40),
                height: Math.min(Math.max(height, touchHeight), area.height - 80)
            };
        },

        /// The lowest point this window's content reaches, measured from the top
        /// of the window.
        ///
        /// body.scrollHeight is not a safe reading here. These popups lay
        /// themselves out against the window height - a container pinned to
        /// 100% with flex rows inside it - so a row that appears after the fact
        /// (the "Apply to all with units of" checkbox, when the range is
        /// switched to Manual) pushes the buttons past the foot of the window
        /// without the document ever growing to say so. The elements themselves
        /// always know where they ended up.
        contentBottom: function () {
            var bottom = 0;
            var all = document.body.getElementsByTagName("*");

            for (var i = 0; i < all.length; i++) {
                var el = all[i];
                // The in-page dialogs are pinned to the window rather than
                // laid out in it, so neither they nor anything inside them is
                // content.
                if (el.closest(".tdOverlay")) continue;

                var r = el.getBoundingClientRect();
                if (r.width === 0 && r.height === 0) continue;
                if (r.bottom <= bottom) continue;

                // Anything in a scrolling list counts only as far as the list
                // itself. The tag list in the pickPen window lays its rows out
                // hundreds of pixels past the foot of the window, and they are
                // not height the window is expected to find.
                var visible = r.bottom;
                var parent = el.parentElement;
                while (parent && parent !== document.body) {
                    if (window.getComputedStyle(parent).overflowY !== "visible") {
                        visible = Math.min(visible, parent.getBoundingClientRect().bottom);
                    }
                    parent = parent.parentElement;
                }

                if (visible > bottom) bottom = visible;
            }

            return bottom;
        },

        /// Takes the slack out of a dialog's height once its content is on screen.
        ///
        /// The popups hold their buttons at the foot of the window with an empty
        /// flex spring. Touch mode has to open them taller, because the same
        /// controls need more room with finger-sized targets - but when the
        /// content turns out not to need all of it, the surplus collects in that
        /// spring as a band of dead space above the buttons. The spring's own
        /// height is the slack, so measuring it is simpler and more reliable than
        /// adding up content that is itself laid out against the window height.
        ///
        /// It gives height back as readily as it takes it, so it is also the
        /// right call after a row has been shown or hidden: a dialog fitted to
        /// its content has no slack left to absorb a new row with.
        fitHeight: function (keep, pass) {
            if (!this.enabled) return;
            if (!document.body) return;
            // A window grown for a dialog is not at its own size, so there is
            // nothing to measure.
            if (document.querySelector(".tdOverlay")) return;

            var margin = (keep === undefined) ? 14 : keep;
            var shrinkBy = 0;

            // Content that does not fit comes first: a window trimmed before its
            // layout had settled is too short, and the height has to go back.
            var overflow = Math.ceil(this.contentBottom()) - document.body.clientHeight;
            if (overflow > 0) {
                shrinkBy = -(overflow + margin);
            }
            else {
                var springs = document.querySelectorAll(".vboxFill:empty, .vboxSpacer:empty");
                var slack = 0;
                for (var i = 0; i < springs.length; i++) {
                    slack += springs[i].getBoundingClientRect().height;
                }
                // A little is left behind, so the buttons do not sit hard
                // against the content above them.
                slack = Math.floor(slack - margin);
                if (slack >= 20) shrinkBy = slack;
            }

            if (shrinkBy !== 0) {
                try {
                    var win = remote.getCurrentWindow();
                    var b = win.getContentBounds();
                    var area = remote.screen.getDisplayMatching(b).workArea;
                    var height = Math.min(b.height - shrinkBy, area.height - 60);

                    // A window that grows downwards off the foot of the screen
                    // has hidden the buttons just as effectively as the clipping
                    // this is meant to cure, so it moves up instead.
                    var y = b.y;
                    if (y + height > area.y + area.height) {
                        y = Math.max(area.y, area.y + area.height - height);
                    }

                    setBounds(win, { x: b.x, y: y, width: b.width, height: height });
                }
                catch (err) {
                    console.log(err);
                    return;
                }
            }

            // A second look, once the resize above has actually been laid out
            // and anything still settling - a grid reflowing into the new width,
            // a value arriving over IPC - has landed. rAF is too early for that:
            // the resize is a round trip through the window manager.
            //
            // Every pass that moves the height asks for another, because a
            // shorter window is also a window with smaller touch targets, and
            // the content it holds settles smaller again. The chain stops at
            // the first pass with nothing left to do, and in any case after a
            // few - the sizes are clamped, so this cannot run away.
            var next = (pass || 0) + 1;
            if (next <= 3 && (!pass || shrinkBy !== 0)) {
                var self = this;
                window.setTimeout(function () { self.fitHeight(keep, next); }, 180);
            }
        },

        /// Grows the window if a dialog needs more room than it has, and hands
        /// back the function that puts it back again.
        ///
        /// The popups are fitted to their own content, which leaves nothing
        /// spare for an in-page dialog laid out over them: the file browser is
        /// taller than the whole of the Export window, and the dialog's
        /// max-height would crop it rather than squeeze it. So the window is
        /// grown while the dialog is up and put straight back afterwards. The
        /// keyboard needs none of this - it is a window of its own.
        borrowSpace: function (width, height) {
            var noop = function () { };
            if (!this.enabled) return noop;

            try {
                var win = remote.getCurrentWindow();
                if (win.isMaximized() || win.isFullScreen()) return noop;

                var before = win.getContentBounds();
                var area = remote.screen.getDisplayMatching(before).workArea;
                var wide = Math.min(Math.max(width || 0, before.width), area.width - 40);
                var tall = Math.min(Math.max(height || 0, before.height), area.height - 60);

                if (wide <= before.width && tall <= before.height) return noop;

                // A window that grows off the edge of the screen has hidden the
                // dialog just as effectively as a window that was too small for
                // it, so it moves rather than only growing.
                var x = before.x;
                var y = before.y;
                if (x + wide > area.x + area.width) {
                    x = Math.max(area.x, area.x + area.width - wide);
                }
                if (y + tall > area.y + area.height) {
                    y = Math.max(area.y, area.y + area.height - tall);
                }

                setBounds(win, { x: x, y: y, width: wide, height: tall });

                return function () {
                    try {
                        setBounds(remote.getCurrentWindow(), before);
                    }
                    catch (err) {
                        console.log(err);
                    }
                };
            }
            catch (err) {
                console.log(err);
                return noop;
            }
        },

        onChange: function (callback) {
            changeCallbacks.push(callback);
        },

        notify: function () {
            for (var i = 0; i < changeCallbacks.length; i++) {
                try {
                    changeCallbacks[i](this.enabled);
                }
                catch (err) {
                    console.log(err);
                }
            }
        },
        //#endregion MODE STATE

        //#region GESTURES
        /// Calls handler(x, y, target) when a finger is held still on el, so a
        /// touch user can reach what a right-click opens. The mouse is left
        /// alone - it has a real right button and its own contextmenu handler.
        onLongPress: function (el, handler) {
            var self = this;
            var timer = null;
            var startX = 0;
            var startY = 0;
            var pressTarget = null;
            var fired = false;

            function cancel() {
                if (timer !== null) {
                    window.clearTimeout(timer);
                    timer = null;
                }
            }

            el.addEventListener("pointerdown", function (e) {
                if (e.pointerType === "mouse") return;
                if (!self.enabled) return;

                cancel();
                fired = false;
                startX = e.clientX;
                startY = e.clientY;
                pressTarget = e.target;

                timer = window.setTimeout(function () {
                    timer = null;
                    fired = true;
                    handler(startX, startY, pressTarget);
                }, LONG_PRESS_MS);
            });

            el.addEventListener("pointermove", function (e) {
                if (timer === null) return;
                if (Math.abs(e.clientX - startX) > MOVE_CANCEL_PX ||
                    Math.abs(e.clientY - startY) > MOVE_CANCEL_PX) {
                    cancel();
                }
            });

            el.addEventListener("pointerup", function (e) {
                cancel();
                if (fired) {
                    // The tap that ended the press must not also act as a click -
                    // on the chart that click is what hides the menu we just
                    // opened.
                    fired = false;
                    self.suppressNextClick(el);
                }
            });

            el.addEventListener("pointercancel", cancel);
            el.addEventListener("pointerleave", cancel);
        },

        /// Swallows the next click on el, for at most 700ms.
        suppressNextClick: function (el) {
            var timer = null;

            function swallow(e) {
                e.stopPropagation();
                e.preventDefault();
                done();
            }

            function done() {
                el.removeEventListener("click", swallow, true);
                if (timer !== null) window.clearTimeout(timer);
            }

            el.addEventListener("click", swallow, true);
            timer = window.setTimeout(done, 700);
        },

        /// The pointer-event version of the mousedown / mousemove / mouseup
        /// drag pattern. Pointer events cover mouse, pen and touch, so a handle
        /// wired up this way needs no separate mouse path.
        ///
        /// handlers: {onStart, onMove, onEnd} - each called with the event.
        pointerDrag: function (handle, handlers) {
            var dragging = false;

            // Without this the browser scrolls or pans instead of dragging.
            handle.style.touchAction = "none";

            handle.addEventListener("pointerdown", function (e) {
                if (e.button !== undefined && e.button !== 0) return;
                dragging = true;
                try {
                    handle.setPointerCapture(e.pointerId);
                }
                catch (err) { /* capture is a nicety, the drag still works */ }
                if (handlers.onStart) handlers.onStart(e);
                e.preventDefault();
            });

            handle.addEventListener("pointermove", function (e) {
                if (!dragging) return;
                if (handlers.onMove) handlers.onMove(e);
            });

            function finish(e) {
                if (!dragging) return;
                dragging = false;
                try {
                    handle.releasePointerCapture(e.pointerId);
                }
                catch (err) { /* already released */ }
                if (handlers.onEnd) handlers.onEnd(e);
            }

            handle.addEventListener("pointerup", finish);
            handle.addEventListener("pointercancel", finish);
        }
        //#endregion GESTURES
    };

    // A genuine resize (the user drags the window, or it is maximised) changes
    // what a comfortable target size is; the keyboard's own resize is ignored
    // inside updateMetrics.
    window.addEventListener("resize", function () {
        touchUI.updateMetrics();
    });

    touchUI.init();
    window.touchUI = touchUI;

})(window);
