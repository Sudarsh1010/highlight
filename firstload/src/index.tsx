import {
    DebugOptions,
    Highlight,
    HighlightClassOptions,
} from '../../client/src/index';

export type HighlightOptions = {
    // a 'true' value defaults to only loggin api interactions.
    debug?: boolean | DebugOptions;
    scriptUrl?: string;
    backendUrl?: string;
    manualStart?: boolean;
    disableNetworkRecording?: boolean;
    disableConsoleRecording?: boolean;
    enableSegmentIntegration?: boolean;
    /**
     * Enabling this will disable recording of text data on the page. This is useful if you do not want to record personally identifiable information and don't want to manually annotate your code with the class name "highlight-block".
     * @example
     * // Text will be randomized. Instead of seeing "Hello World" in a recording, you will see "1fds1 j59a0".
     * @see {@link https://docs.highlight.run/docs/privacy} for more information.
     */
    enableStrictPrivacy?: boolean;
};

const HighlightWarning = (context: string, msg: any) => {
    console.warn(`Highlight Warning: (${context}): `, msg);
};

type HighlightPublicInterface = {
    init: (orgID: number | string, debug?: HighlightOptions) => void;
    identify: (identify: string, obj: any) => void;
    track: (event: string, obj: any) => void;
    error: (message: string) => void;
    getSessionURL: () => Promise<string>;
    start: () => void;
    onHighlightReady: (func: () => void) => void;
    options: HighlightOptions | undefined;
};

interface HighlightWindow extends Window {
    Highlight: new (options?: HighlightClassOptions) => Highlight;
    H: HighlightPublicInterface;
    _h_script: string;
}

const HIGHLIGHT_URL = 'app.highlight.run';

declare var window: HighlightWindow;

var script: HTMLScriptElement;
var highlight_obj: Highlight;
export const H: HighlightPublicInterface = {
    options: undefined,
    init: (orgID: number | string, options?: HighlightOptions) => {
        try {
            H.options = options;
            script = document.createElement('script');
            var scriptSrc = options?.scriptUrl
                ? options.scriptUrl
                : 'https://static.highlight.run/index.js';
            script.setAttribute(
                'src',
                scriptSrc + '?' + new Date().getMilliseconds()
            );
            script.setAttribute('type', 'text/javascript');
            document.getElementsByTagName('head')[0].appendChild(script);
            script.addEventListener('load', () => {
                highlight_obj = new window.Highlight({
                    organizationID: orgID,
                    debug: options?.debug,
                    backendUrl: options?.backendUrl,
                    disableNetworkRecording: options?.disableNetworkRecording,
                    disableConsoleRecording: options?.disableConsoleRecording,
                    enableSegmentIntegration: options?.enableSegmentIntegration,
                    enableStrictPrivacy: options?.enableStrictPrivacy || false,
                });
                if (!options?.manualStart) {
                    highlight_obj.initialize(orgID);
                }
            });
        } catch (e) {
            HighlightWarning('init', e);
        }
    },
    error: (message: string) => {
        try {
            H.onHighlightReady(() => highlight_obj.pushCustomError(message));
        } catch (e) {
            HighlightWarning('error', e);
        }
    },
    track: (event: string, obj: any) => {
        try {
            H.onHighlightReady(() =>
                highlight_obj.addProperties({ ...obj, event: event })
            );
        } catch (e) {
            HighlightWarning('track', e);
        }
    },
    start: () => {
        try {
            if (H.options?.manualStart) {
                var interval = setInterval(function () {
                    if (highlight_obj) {
                        clearInterval(interval);
                        highlight_obj.initialize();
                    }
                }, 200);
            } else {
                console.warn(
                    "Highlight Error: Can't call `start()` without setting `manualStart` option in `H.init`"
                );
            }
        } catch (e) {
            HighlightWarning('start', e);
        }
    },
    identify: (identifier: string, obj: any) => {
        try {
            H.onHighlightReady(() => highlight_obj.identify(identifier, obj));
        } catch (e) {
            HighlightWarning('identify', e);
        }
    },
    getSessionURL: () => {
        return new Promise<string>((resolve, reject) => {
            H.onHighlightReady(() => {
                const orgID = highlight_obj.organizationID;
                const sessionID = highlight_obj.sessionID;
                if (orgID && sessionID) {
                    const res = `${HIGHLIGHT_URL}/${orgID}/sessions/${sessionID}`;
                    resolve(res);
                } else {
                    reject(new Error('org ID or session ID is empty'));
                }
            });
        });
    },
    onHighlightReady: (func: () => void) => {
        try {
            if (highlight_obj && highlight_obj.ready) {
                func();
            }
            var interval = setInterval(function () {
                if (highlight_obj && highlight_obj.ready) {
                    clearInterval(interval);
                    func();
                }
            }, 200);
        } catch (e) {
            HighlightWarning('onHighlightReady', e);
        }
    },
};

if (typeof window !== 'undefined') {
    window.H = H;
}
