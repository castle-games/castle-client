#include "engine.h"

#include "snapshot.h"
#include "js.h"


//
// JavaScript utilities (stubs in not-web)
//

JS_DEFINE(int, JS_getCanvasWidth, (),
    { return document.querySelector("#canvas").getBoundingClientRect().width; });
JS_DEFINE(int, JS_getCanvasHeight, (),
    { return document.querySelector("#canvas").getBoundingClientRect().height; });
JS_DEFINE(double, JS_getDevicePixelRatio, (), { return window.devicePixelRatio; });
JS_DEFINE(int, JS_documentHasFocus, (), { return document.hasFocus() ? 1 : 0; });
JS_DEFINE(int, JS_hasInitialDeck, (), { return Castle.hasInitialDeck ? 1 : 0; });
JS_DEFINE(char *, JS_getInitialDeckGraphQlJson, (), {
  if (Castle.initialDeckGraphQlJson) {
    const result = Castle.initialDeckGraphQlJson;
    delete Castle.initialDeckGraphQlJson; // Don't need to keep this data around in JS
    return allocate(intArrayFromString(result), ALLOC_NORMAL);
  } else {
    return 0;
  };
});
JS_DEFINE(char *, JS_getNextCardSceneData, (), {
  if (Castle.nextCardSceneData) {
    const result = Castle.nextCardSceneData;
    Castle.nextCardSceneData = null;
    return allocate(intArrayFromString(result), ALLOC_NORMAL);
  } else {
    return 0;
  };
});


//
// Utilities from Ghost (old term for Castle's extended version of Love)
//

extern "C" double ghostScreenScaling; // Globally scales rendering and touch coordinates
extern "C" bool ghostChildWindowCloseEventReceived; // Whether the OS tried to close the window


//
// Pre-init
//

Engine::PreInit::PreInit() {
  // SDL parameters. In pre-init so we can still eg. refresh the page using keyboard if tests fail.
  SDL_SetHint(SDL_HINT_TOUCH_MOUSE_EVENTS, "0"); // Don't doublecount touches as mouse events
#ifdef __EMSCRIPTEN__
  SDL_EventState(SDL_TEXTINPUT, SDL_DISABLE); // Prevent keyboard input capture in web
  SDL_EventState(SDL_KEYDOWN, SDL_DISABLE);
  SDL_EventState(SDL_KEYUP, SDL_DISABLE);
#endif
}


//
// Constructor, destructor
//

Engine::Engine() {
  // First timer step
  lv.timer.step();
}


//
// Deck / scene management
//

bool Engine::hasInitialDeck() const {
#ifdef __EMSCRIPTEN__
  return JS_hasInitialDeck();
#else
  return false;
#endif
}

void Engine::loadSceneFromFile(const char *path) {
  scene = Snapshot::fromFile(path).toScene();
}

void Engine::tryLoadInitialDeck() {
#ifdef __EMSCRIPTEN__
  if (auto graphQlJson = JS_getInitialDeckGraphQlJson()) {
    scene = Snapshot::fromJson(graphQlJson).toScene();
    free(graphQlJson);
  }
#endif
}

void Engine::tryLoadNextCard() {
#ifdef __EMSCRIPTEN__
  if (auto sceneDataJson = JS_getNextCardSceneData()) {
    scene = Snapshot::fromJson(sceneDataJson).toScene();
    free(sceneDataJson);
  }
#endif
}


//
// Frame
//

bool Engine::frame() {
  // Based on the main loop from 'boot.lua' in the Love codebase

  // In web, if the window is unfocused reduce loop frequency and pause to keep CPU usage low.
#ifdef __EMSCRIPTEN__
  {
    auto focused = JS_documentHasFocus();
    if (focused != prevWindowFocused) {
      prevWindowFocused = focused;
      if (focused) {
        emscripten_set_main_loop_timing(EM_TIMING_RAF, 0);
        lv.timer.step(); // Step timer and skip frame so we don't have a huge `dt`
        return true;
      } else {
        emscripten_set_main_loop_timing(EM_TIMING_SETTIMEOUT, 100);
      }
    }
    if (!focused) {
      return true;
    }
  }
#endif

#ifdef __EMSCRIPTEN__
  // Update window size and screen scaling based on canvas in web. This will generate an
  // `SDL_WINDOWEVENT_RESIZED`, so we do it before the event pump to let Love process that
  // immediately.
  if (auto w = JS_getCanvasWidth(), h = JS_getCanvasHeight();
      w != prevWindowWidth || h != prevWindowHeight) {
    Debug::log("canvas resized to {}, {}", w, h);
    SDL_SetWindowSize(lv.window.getSDLWindow(), w, h);
    ghostScreenScaling = double(w) / 800;
    prevWindowWidth = w;
    prevWindowHeight = h;
  }
#else
  // Just set screen scaling based on window size in desktop
  {
    int w = 0, h = 0;
    SDL_GetWindowSize(lv.window.getSDLWindow(), &w, &h);
    ghostScreenScaling = double(w) / 800;
  }
#endif

  // Process events. Quit if the window was closed.
  lv.event.pump();
  lv.event.clear();
  if (ghostChildWindowCloseEventReceived) {
    return false;
  }

  // Step timer and run update with the resulting `dt`
  update(lv.timer.step());

  // Draw
  lv.graphics.origin();
  lv.graphics.clear(love::Colorf(0, 0, 0, 1), {}, {});
  draw();
  lv.graphics.present(nullptr);

  return !shouldQuit;
}


//
// Update
//

void Engine::update(double dt) {
  // If no scene yet, try loading the initial deck
  if (!scene) {
    tryLoadInitialDeck();
  }

  tryLoadNextCard();

  // Update scene
  if (scene) {
    Debug::display("fps: {}", lv.timer.getFPS());
    Debug::display("scaling: {:.2f}, {:.2f}, {:.2f}, {:.2f}", JS_getDevicePixelRatio(),
        lv.window.getDPIScale(), lv.graphics.getCurrentDPIScale(), ghostScreenScaling);
    Debug::display("actors: {}", scene->getEntityRegistry().alive());

    scene->update(dt);
  }

#ifdef CASTLE_ENABLE_TESTS
  tests.update(dt);
#endif
}


//
// Draw
//

void Engine::draw() {
  if (scene) {
    scene->draw();
  }

#ifdef CASTLE_ENABLE_TESTS
  tests.draw();
#endif

  // Debug messages
  if (scene) {
    lv.graphics.setColor(love::Colorf(0, 0, 0, 1));
  } else {
    Debug::display("loading...");
    lv.graphics.setColor(love::Colorf(1, 1, 1, 1));
  }
  lv.graphics.print({ { Debug::getAndClearDisplay(), { 1, 1, 1, 1 } } }, debugFont.get(),
      love::Matrix4(20, 20, 0, 1, 1, 0, 0, 0, 0));
}
