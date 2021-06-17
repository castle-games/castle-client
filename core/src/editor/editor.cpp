#include "editor.h"

Editor::Editor(Bridge &bridge_, Lv &lv_)
    : bridge(bridge_)
    , lv(lv_) {
  isEditorStateDirty = true;
}

void Editor::readScene(Reader &reader) {
  scene = std::make_unique<Scene>(bridge, variables, &reader);
  isEditorStateDirty = true;
  Debug::log("editor: read scene");
}

void Editor::readVariables(Reader &reader) {
  variables.read(reader);
  isEditorStateDirty = true;
};

void Editor::update(double dt) {
  if (scene) {
    // TODO: Update scene when performing
    /* if (scene->isRestartRequested()) {
      sceneArchive.read([&](Reader &reader) {
        reader.obj("snapshot", [&]() {
          scene = std::make_unique<Scene>(bridge, variables, &reader);
        });
      });
    }

    Debug::display("fps: {}", lv.timer.getFPS());
    Debug::display("actors: {}", scene->numActors());

    scene->update(dt); */

    maybeSendData();
  }
}

void Editor::draw() {
  if (scene) {
    scene->draw();
  }
}

//
// Events
//

struct EditorGlobalActionsEvent {
  PROP(bool, performing) = false;

  struct ActionsAvailable {
    PROP(bool, onPlay) = true;
    PROP(bool, onRewind) = false;
  };
  PROP(ActionsAvailable, actionsAvailable);
};

void Editor::maybeSendData() {
  if (isEditorStateDirty) {
    EditorGlobalActionsEvent ev;
    bridge.sendEvent("EDITOR_GLOBAL_ACTIONS", ev);
    isEditorStateDirty = false;
  }
}
