#include "ghost.h"
#include "ghost_constants.h"
#include "simple_handler.h"

#include <fstream>
#include <iostream>

#include <boost/asio.hpp>
#include <boost/process.hpp>
#include <boost/algorithm/string.hpp>

#ifdef _MSC_VER
#include <boost/process/windows.hpp>
#endif

using namespace boost;

const std::string kDefaultStarterTemplateCode =
    "function love.draw()\n    love.graphics.print('Edit main.lua to get started!', 400, 300)\n    "
    "love.graphics.print('Press Cmd/Ctrl + R to reload.', 400, 316)\nend";

GHOST_EXPORT void ghostSendJSEvent(const char *eventName, const char *serializedParams) {
  std::string validatedParams = (serializedParams) ? serializedParams : "{}";
  std::stringstream msg;
  msg << "{ let event = new Event('" << eventName << "'); "
      << "event.params = " << validatedParams << "; "
      << "window.dispatchEvent(event); }";

  CefRefPtr<CefBrowser> browser = SimpleHandler::GetInstance()->GetFirstBrowser();
  CefRefPtr<CefFrame> frame = browser->GetMainFrame();
  frame->ExecuteJavaScript(msg.str(), frame->GetURL(), 0);
}

void ghostDownloadFile(const char *fromUrl) {
  CefRefPtr<CefBrowser> browser = SimpleHandler::GetInstance()->GetFirstBrowser();
  browser->GetHost()->StartDownload(CefString(fromUrl));
}

bool ghostCancelDownload(unsigned int downloadId) {
  return SimpleHandler::GetInstance()->SetDownloadCanceled(downloadId);
}

inline bool fileExists(const char *path) {
  if (FILE *file = fopen(path, "r")) {
    fclose(file);
    return true;
  }
  return false;
}

bool _ghostCreateFileFromTemplateAtPath(const char *path, const char *filenameToRead,
                                        const char *filenameToWrite, const char **filePathCreated) {
  // read bundled file
  const char *pathToBundledFile;
  std::string fileContents;
  bool success = ghostGetPathToFileInAppBundle(filenameToRead, &pathToBundledFile);
  if (success) {
    std::ifstream fileContentsStream(pathToBundledFile);
    fileContents = std::string((std::istreambuf_iterator<char>(fileContentsStream)),
                               std::istreambuf_iterator<char>());
    std::free((void *)pathToBundledFile);
  }

  // construct path to output file
  std::string outputFilePath(path);
  std::stringstream outputFilePathStream;
  outputFilePathStream << outputFilePath;

#if defined(WIN32) || defined(_WIN32)
  if (outputFilePath.back() != '\\') {
    outputFilePathStream << "\\";
  }
#else
  if (outputFilePath.back() != '/') {
    outputFilePathStream << "/";
  }
#endif
  outputFilePathStream << filenameToWrite;
  outputFilePath = outputFilePathStream.str();

  // don't overwrite existing file
  if (fileExists(outputFilePath.c_str())) {
    return false;
  }

  // write output file
  std::ofstream outfile(outputFilePath);
  outfile << fileContents << std::endl;
  outfile.close();

  // check that we actually created the file
  bool didCreate = fileExists(outputFilePath.c_str());
  if (didCreate) {
    *filePathCreated = strdup(outputFilePath.c_str());
    return true;
  }
  return false;
}

bool ghostCreateProjectAtPath(const char *path, const char **entryPoint) {
  const char *mainFileCreated;
  bool result = _ghostCreateFileFromTemplateAtPath(path, "blank.lua", "main.lua", &mainFileCreated);
  if (!result) {
    return false;
  }
  std::free((void *)mainFileCreated);
  return _ghostCreateFileFromTemplateAtPath(path, "blank.castle", "project.castle", entryPoint);
}

static float ghostWidth = 800, ghostHeight = 450;

void ghostSetDimensions(float width, float height) {
  ghostWidth = width;
  ghostHeight = height;
}

void ghostGetDimensions(float *width, float *height) {
  *width = ghostWidth;
  *height = ghostHeight;
}

static int ghostUpScaling = GHOST_SCALING_ON, ghostDownScaling = GHOST_SCALING_ON;

void ghostSetScalingModes(int up, int down) {
  ghostUpScaling = up;
  ghostDownScaling = down;
}

void ghostGetScalingModes(int *up, int *down) {
  *up = ghostUpScaling;
  *down = ghostDownScaling;
}

GHOST_EXPORT double ghostGetGlobalScaling() {
  return ghostGlobalScaling;
}

GHOST_EXPORT double ghostGetScreenScaling() {
  return ghostScreenScaling;
}

static std::string execNodeInput;
static int execNodeExecId;
static std::string execNodeResult;
void ghostExecNode(const char *input, int execId) {
  execNodeInput = input;
  execNodeExecId = execId;

  std::thread t([&](){
    auto callback = [&](std::string result) {
      trim(result);
      std::stringstream params;
      params << "{"
      << " execId: " << execNodeExecId << ", "
      << " result: \"" << result << "\", "
      << "}";
      ghostSendJSEvent(kGhostExecNodeComplete, params.str().c_str());
    };

    const char *pathToBundledFile;
#if defined(WIN32) || defined(_WIN32)
    CHAR buffer[MAX_PATH];
    GetModuleFileNameA(NULL, buffer, MAX_PATH);
    std::string::size_type pos = std::string(buffer).find_last_of("\\/");
    std::string exeDir = std::string(buffer).substr(0, pos);

#ifdef _DEBUG
    std::string nodeExe = exeDir + "/../../../node/castle-desktop-node-win.exe";
#else
    std::string nodeExe = exeDir + "/castle-desktop-node-win.exe";
#endif
    pathToBundledFile = nodeExe.c_str();
#else
    if (!ghostGetPathToFileInAppBundle("castle-desktop-node-macos", &pathToBundledFile)) {
      callback("");
      return;
    }
#endif

    boost::asio::io_service ios;
    std::future<std::string> data;

#if defined(WIN32) || defined(_WIN32)
    process::child c(std::string(pathToBundledFile),
                     process::args({execNodeInput}),
                     process::std_out > data, process::std_err > process::null, ios, process::windows::hide);
#else
	process::child c(std::string(pathToBundledFile),
		process::args({ execNodeInput }),
		process::std_out > data, process::std_err > process::null, ios);
#endif

    ios.run();
    execNodeResult = data.get();
    callback(execNodeResult);
  });
  t.detach();
}
