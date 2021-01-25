// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END

import { remote, shell, WillNavigateEvent } from "electron";
import * as path from "path";
import {
    _DIST_RELATIVE_URL, _PACKAGING, _RENDERER_PDF_WEBVIEW_BASE_URL, IS_DEV,
} from "readium-desktop/preprocessor-directives";
import { keyDownEventHandler, keyUpEventHandler } from "readium-desktop/renderer/common/keyboard";

import {
    convertCustomSchemeToHttpUrl, READIUM2_ELECTRON_HTTP_PROTOCOL,
} from "@r2-navigator-js/electron/common/sessions";

import { eventBus } from "../../../common/pdf/common/eventBus";
import { IEventBusPdfPlayer } from "../../../common/pdf/common/pdfReader.type";

// bridge between webview tx-rx communication and reader.tsx

export async function pdfMountAndReturnBus(
    pdfPath: string,
    publicationViewport: HTMLDivElement,
): Promise<IEventBusPdfPlayer> {

    if (pdfPath.startsWith(READIUM2_ELECTRON_HTTP_PROTOCOL)) {
        pdfPath = convertCustomSchemeToHttpUrl(pdfPath);
    }

    console.log("pdfPath ADJUSTED", pdfPath);

    const webview = document.createElement("webview");
    webview.setAttribute("style",
        "display: flex; margin: 0; padding: 0; box-sizing: border-box; position: absolute; left: 0; right: 0; bottom: 0; top: 0;");

    // tslint:disable-next-line:max-line-length
    // https://github.com/electron/electron/blob/master/docs/tutorial/security.md#3-enable-context-isolation-for-remote-content
    // webview.setAttribute("webpreferences",
    //     "nodeIntegration=1, nodeIntegrationInWorker=0, sandbox=0, javascript=1, " +
    //     "contextIsolation=0, webSecurity=1, allowRunningInsecureContent=0, enableRemoteModule=0");
    // webview.setAttribute("nodeIntegration", "");
    // webview.setAttribute("disablewebsecurity", "");
    // webview.setAttribute("webpreferences",
    //     "sandbox=0, javascript=1, contextIsolation=0, webSecurity=0, allowRunningInsecureContent=1");

    // Redirect link to an external browser
    const handleRedirect = async (event: WillNavigateEvent) => {
        event.preventDefault(); // no effect
        event.stopPropagation();

        console.log("WillNavigate event:", event.type, event.url);
        if (event.url) {
            await shell.openExternal(event.url);
        }
    };
    webview.addEventListener("will-navigate", handleRedirect);

    webview.addEventListener("console-message", (e) => {
        console.log("pdf-webview", e.message);
    });

    webview.addEventListener("dom-ready", webviewDomReadyDebugger);

    const bus: IEventBusPdfPlayer = eventBus(
        (key, ...a) => {
            const data = {
                key: JSON.stringify(key),
                payload: JSON.stringify(a),
            };

            // tslint:disable-next-line: no-floating-promises
            webview.send("pdf-eventbus", data);
        },
        (ev) => {
            webview.addEventListener("ipc-message", (event) => {

                const channel = event.channel;
                if (channel === "pdf-eventbus") {

                    const message = event.args[0];
                    try {

                        const key = typeof message?.key !== "undefined" ? JSON.parse(message.key) : undefined;
                        const data = typeof message?.payload !== "undefined" ? JSON.parse(message.payload) : [];
                        console.log("ipc-message pdf-eventbus received", key, data);

                        if (Array.isArray(data)) {
                            ev(key, ...data);
                        }
                    } catch (e) {
                        console.log("ipc message pdf-eventbus received with parsing error", e);
                    }

                }
            });
        },
    );

    bus.subscribe("keydown", (payload) => {
        keyDownEventHandler(payload, payload.elementName, payload.elementAttributes);
    });
    bus.subscribe("keyup", (payload) => {
        keyUpEventHandler(payload, payload.elementName, payload.elementAttributes);
    });

    // DEBUG
    // DEBUG

    bus.subscribe("numberofpages", (nb) => {

        console.log("$$$$$$$$$$$$$$$$$$$$$44");
        console.log("$$$$$$$$$$$$$$$$$$$$$44");
        console.log("$$$$$$$$$$$$$$$$$$$$$44");
        console.log("$$$$$$$$$$$$$$$$$$$$$44");
        console.log("$$$$$$$$$$$$$$$$$$$$$44");

        console.log("nb");
        console.log(nb);

        console.log("$$$$$$$$$$$$$$$$$$$$$44");
        console.log("$$$$$$$$$$$$$$$$$$$$$44");
        console.log("$$$$$$$$$$$$$$$$$$$$$44");
        console.log("$$$$$$$$$$$$$$$$$$$$$44");
    })

    bus.subscribe("metadata", (m) => {

        console.log("$$$$$$$$$$$$$$$$$$$$$44");
        console.log("$$$$$$$$$$$$$$$$$$$$$44");
        console.log("$$$$$$$$$$$$$$$$$$$$$44");

        console.log("meta");

        console.log(m);

        console.log("$$$$$$$$$$$$$$$$$$$$$44");
        console.log("$$$$$$$$$$$$$$$$$$$$$44");
        console.log("$$$$$$$$$$$$$$$$$$$$$44");
    })


    bus.subscribe("cover", (dataUrl) => {

        console.log("$$$$$$$$$$$$$$$$$$$$$44");
        console.log("$$$$$$$$$$$$$$$$$$$$$44");
        console.log("$$$$$$$$$$$$$$$$$$$$$44");

        console.log("cover");

        console.log(dataUrl);


        console.log("$$$$$$$$$$$$$$$$$$$$$44");
        console.log("$$$$$$$$$$$$$$$$$$$$$44");
        console.log("$$$$$$$$$$$$$$$$$$$$$44");
        console.log("$$$$$$$$$$$$$$$$$$$$$44");
        console.log("$$$$$$$$$$$$$$$$$$$$$44");

    })

    // DEBUG
    // DEBUG
    // DEBUG

    webview.addEventListener("did-finish-load", () => {

        console.log("did-finish-load bus.dispatch start pdfPath", pdfPath);
        bus.dispatch("start", pdfPath);
    });

    let preloadPath = "index_pdf.js";
    if (_PACKAGING === "1") {
        preloadPath = "file://" + path.normalize(path.join((global as any).__dirname, preloadPath));
    } else {
        if (_RENDERER_PDF_WEBVIEW_BASE_URL === "file://") {
            // dist/prod mode (without WebPack HMR Hot Module Reload HTTP server)
            preloadPath = "file://" +
                path.normalize(path.join((global as any).__dirname, _DIST_RELATIVE_URL, preloadPath));
        } else {
            // dev/debug mode (with WebPack HMR Hot Module Reload HTTP server)
            preloadPath = "file://" + path.normalize(path.join(process.cwd(), "dist", preloadPath));
        }
    }
    preloadPath = preloadPath.replace(/\\/g, "/");
    // let htmlPath = "index_pdf.html";
    // if (_PACKAGING === "1") {
    //     htmlPath = "file://" + path.normalize(path.join((global as any).__dirname, htmlPath));
    // } else {
    //     if (_RENDERER_PDF_WEBVIEW_BASE_URL === "file://") {
    //         // dist/prod mode (without WebPack HMR Hot Module Reload HTTP server)
    //         htmlPath = "file://" +
    //             path.normalize(path.join((global as any).__dirname, _DIST_RELATIVE_URL, htmlPath));
    //     } else {
    //         // dev/debug mode (with WebPack HMR Hot Module Reload HTTP server)
    //         htmlPath = "file://" + path.normalize(path.join(process.cwd(), "dist", htmlPath));
    //     }
    // }
    // htmlPath = htmlPath.replace(/\\/g, "/");

    webview.setAttribute("preload", preloadPath);
    webview.setAttribute("style",
        "display: flex; margin: 0; padding: 0; box-sizing: border-box; position: absolute; left: 0; right: 0; bottom: 0; top: 0;");
    // webview.setAttribute("partition", "persist:pdfjsreader");
    webview.setAttribute("src", "pdfjs://local/web/viewer.html?file=" + encodeURIComponent(pdfPath));
    webview.setAttribute("worldSafeExecuteJavaScript", "");
    webview.setAttribute("webpreferences", "allowRunningInsecureContent");
    webview.setAttribute("disablewebsecurity", "");

    publicationViewport.append(webview);

    return bus;
}

const webviewDomReadyDebugger = (ev: Electron.Event) => {
    // https://github.com/electron/electron/blob/v3.0.0/docs/api/breaking-changes.md#webcontents

    const webview = ev.target as Electron.WebviewTag;

    webview.clearHistory();

    if (IS_DEV) {
        const wc = remote.webContents.fromId(webview.getWebContentsId());
        // const wc = wv.getWebContents();

        wc.on("context-menu", (_ev, params) => {
            const { x, y } = params;
            const openDevToolsAndInspect = () => {
                const devToolsOpened = () => {
                    wc.off("devtools-opened", devToolsOpened);
                    wc.inspectElement(x, y);

                    setTimeout(() => {
                        if (wc.devToolsWebContents && wc.isDevToolsOpened()) {
                            wc.devToolsWebContents.focus();
                        }
                    }, 500);
                };
                wc.on("devtools-opened", devToolsOpened);
                wc.openDevTools({ activate: true, mode: "detach" });
            };
            remote.Menu.buildFromTemplate([{
                click: () => {
                    const wasOpened = wc.isDevToolsOpened();
                    if (!wasOpened) {
                        openDevToolsAndInspect();
                    } else {
                        if (!wc.isDevToolsFocused()) {
                            // wc.toggleDevTools();
                            wc.closeDevTools();

                            setImmediate(() => {
                                openDevToolsAndInspect();
                            });
                        } else {
                            // right-click context menu normally occurs when focus
                            // is in BrowserWindow / WebView's WebContents,
                            // but some platforms (e.g. MacOS) allow mouse interaction
                            // when the window is in the background.
                            wc.inspectElement(x, y);
                        }
                    }
                },
                label: "Inspect element",
            }]).popup({ window: remote.getCurrentWindow() });
        });
    }
};
