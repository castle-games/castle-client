#ifndef __GHOST_H__
#define __GHOST_H__

#ifdef __cplusplus
extern "C" {
#endif

// handler for when the user opened any ghost url from native code.
void ghostHandleOpenUri(const char *uri);

// boot a love instance with the given initial uri.
void ghostOpenLoveUri(const char *uri);

// tell the operating system to open a url in the user's browser.
void ghostOpenExternalUrl(const char *url);

// dispatch a JS Event with the given name and params.
void ghostSendJSEvent(const char *eventName, const char *serializedParams);

void ghostQuitMessageLoop();
void ghostClose();
void ghostUpdateChildWindowFrame();
void ghostResizeChildWindow(float dw, float dh);
void ghostSetChildWindowFrame(float left, float top, float width, float height);
void ghostSetBrowserReady();

bool ghostChooseDirectoryWithDialog(const char *title, const char *message, const char *action, const char **result);
bool ghostCreateProjectAtPath(const char *path, const char **entryPoint);

#ifdef __cplusplus
}
#endif

#endif
