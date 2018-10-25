// Copyright (c) 2013 The Chromium Embedded Framework Authors. All rights
// reserved. Use of this source code is governed by a BSD-style license that
// can be found in the LICENSE file.

#include <windows.h>
#include <KnownFolders.h>
#include <ShlObj.h>

#include "include/cef_sandbox_win.h"
#include "simple_app.h"
#include "simple_handler.h"

#include "ghost.h"

extern "C" {
void ghostRunMessageLoop();
}

// When generating projects with CMake the CEF_USE_SANDBOX value will be defined
// automatically if using the required compiler version. Pass -DUSE_SANDBOX=OFF
// to the CMake command-line to disable use of the sandbox.
// Uncomment this line to manually enable sandbox support.
// #define CEF_USE_SANDBOX 1

class HelperApp : public CefApp, public CefRenderProcessHandler {
public:
  virtual CefRefPtr<CefRenderProcessHandler> GetRenderProcessHandler() OVERRIDE { return this; }

  // CefRenderProcessHandler methods:
  void OnWebKitInitialized() OVERRIDE {
    // Create the renderer-side router for query handling.
    CefMessageRouterConfig config;
    message_router_ = CefMessageRouterRendererSide::Create(config);
  }

  void OnContextCreated(CefRefPtr<CefBrowser> browser, CefRefPtr<CefFrame> frame,
                        CefRefPtr<CefV8Context> context) OVERRIDE {
    message_router_->OnContextCreated(browser, frame, context);
  }

  void OnContextReleased(CefRefPtr<CefBrowser> browser, CefRefPtr<CefFrame> frame,
                         CefRefPtr<CefV8Context> context) OVERRIDE {
    message_router_->OnContextReleased(browser, frame, context);
  }

  bool OnProcessMessageReceived(CefRefPtr<CefBrowser> browser, CefProcessId source_process,
                                CefRefPtr<CefProcessMessage> message) OVERRIDE {
    return message_router_->OnProcessMessageReceived(browser, source_process, message);
  }

  void OnRegisterCustomSchemes(CefRawPtr<CefSchemeRegistrar> registrar) OVERRIDE {
    registrar->AddCustomScheme("castle", true, false, false, false, false, false);
  }

private:
  CefRefPtr<CefMessageRouterRendererSide> message_router_;

  // Include the default reference counting implementation.
  IMPLEMENT_REFCOUNTING(HelperApp);
};

#if defined(CEF_USE_SANDBOX)
// The cef_sandbox.lib static library is currently built with VS2013. It may not
// link successfully with other VS versions.
// #pragma comment(lib, "cef_sandbox.lib")
#endif

// Entry point function for all processes.
int APIENTRY wWinMain(HINSTANCE hInstance,
                      HINSTANCE hPrevInstance,
                      LPTSTR lpCmdLine,
                      int nCmdShow) {
  UNREFERENCED_PARAMETER(hPrevInstance);

  // Enable High-DPI support on Windows 7 or newer.
  CefEnableHighDPISupport();

  void* sandbox_info = NULL;

#if defined(CEF_USE_SANDBOX)
  // Manage the life span of the sandbox information object. This is necessary
  // for sandbox support on Windows. See cef_sandbox_win.h for complete details.
  CefScopedSandboxInfo scoped_sandbox;
  sandbox_info = scoped_sandbox.sandbox_info();
#endif

  // Provide CEF with command-line arguments.
  CefMainArgs main_args(hInstance);

  // CEF applications have multiple sub-processes (render, plugin, GPU, etc)
  // that share the same executable. This function checks the command-line and,
  // if this is a sub-process, executes the appropriate logic.
  CefRefPtr<HelperApp> helperApp(new HelperApp());
  int exit_code = CefExecuteProcess(main_args, helperApp, sandbox_info);
  if (exit_code >= 0) {
    // The sub-process has completed so return here.
    return exit_code;
  }

  // Deep linking
  if (lpCmdLine) {
	  size_t size = wcstombs(NULL, lpCmdLine, 0);
	  if (size > 0) {
		  char* deepLink = new char[size + 1];
		  wcstombs(deepLink, lpCmdLine, size + 1);
		  ghostHandleOpenUri(deepLink);
	  }
  }
  //ghostHandleOpenUri("https://raw.githubusercontent.com/schazers/badboxart/master/main.lua");

  // Get appdata path for CEF
  PWSTR appDataPath = NULL;
  SHGetKnownFolderPath(FOLDERID_RoamingAppData, 0, NULL, &appDataPath);

  // Specify CEF global settings here.
  CefSettings settings;
  settings.multi_threaded_message_loop = true;

  std::wstringstream cacheDir;
  cacheDir << appDataPath << L"/Castle/CEFCache";

  CefString(&settings.cache_path) = cacheDir.str().c_str();

#if !defined(CEF_USE_SANDBOX)
  settings.no_sandbox = true;
#endif

  // Load local web page
  CHAR buffer[MAX_PATH];
  GetModuleFileNameA(NULL, buffer, MAX_PATH);
  std::string::size_type pos = std::string(buffer).find_last_of("\\/");
  std::string exeDir = std::string(buffer).substr(0, pos);

#ifdef _DEBUG
  std::string url = exeDir + "/../../../web/index.html";
#else
  std::string url = exeDir + "/web/index.html";
#endif

  //url = "http://localhost:8000/index.html";

  int screenSizeWidth = 1440;
  int screenSizeHeight = 877;

  // SimpleApp implements application-level callbacks for the browser process.
  // It will create the first browser instance in OnContextInitialized() after
  // CEF has initialized.
  CefRefPtr<SimpleApp> app(new SimpleApp(url, screenSizeWidth, screenSizeHeight));

  // Initialize CEF.
  CefInitialize(main_args, settings, app.get(), sandbox_info);

  // Run the Ghost message loop. This will block until ghostQuitMessageLoop() is
  // called.
  ghostRunMessageLoop();

  // Shut down CEF.
  CefShutdown();

  return 0;
}
