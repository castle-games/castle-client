#include "scene.h"

#include "behaviors/all.h"


//
// Constructor, destructor
//

Scene::Scene()
    : behaviors(std::make_unique<AllBehaviors>(*this)) {
  // Create the background body (a static body useful to attach joints to)
  {
    b2BodyDef physicsBackgroundBodyDef;
    physicsBackgroundBody = physicsWorld.CreateBody(&physicsBackgroundBodyDef);
  }
}

Scene::~Scene() = default;

Scene::Scene(Scene &&) = default;


//
// Actor management
//

ActorId Scene::addActor() {
  auto newActorId = registry.create();
  registry.emplace<Actor>(newActorId, nextNewDrawOrder++);
  needDrawOrderSort = true;
  return newActorId;
}

void Scene::removeActor(ActorId actorId) {
  if (!hasActor(actorId)) {
    fmt::print("removeActor: no such actor\n");
    return;
  }
  getBehaviors().forEach([&](auto &behavior) {
    if constexpr (Handlers::hasDisableComponent<decltype(behavior)>) {
      if (auto component = behavior.maybeGetComponent(actorId)) {
        behavior.handleDisableComponent(actorId, *component, true);
      }
    }
  });
  registry.destroy(actorId);
  needDrawOrderSort = true;
}

void Scene::setActorDrawOrder(ActorId actorId, int newDrawOrder) {
  getActor(actorId).drawOrder = newDrawOrder;
  nextNewDrawOrder = std::max(nextNewDrawOrder, newDrawOrder + 1);
  needDrawOrderSort = true;
}

void Scene::ensureDrawOrderSort() const {
  if (needDrawOrderSort) {
    const_cast<entt::registry &>(registry).sort<Actor>([&](const Actor &a, const Actor &b) {
      return a.drawOrder < b.drawOrder;
    });
    needDrawOrderSort = false;
    auto nextCompactDrawOrder = 0;
    registry.view<const Actor>().each([&](const Actor &actor) {
      actor.drawOrder = nextCompactDrawOrder++;
    });
    nextNewDrawOrder = nextCompactDrawOrder;
  }
}


//
// Update
//

void Scene::update(double dt) {
  // Update gesture first so behaviors can read it
  gesture.update();

  // Step physics. Do this before behavior performance to allow behaviors to make changes after.
  // We're using a fixed timestep (see https://gafferongames.com/post/fix_your_timestep/).
  {
    constexpr auto maxSteps = 60;
    constexpr auto updateRate = 120.0, updatePeriod = 1 / updateRate;
    physicsUpdateTimeRemaining += dt;
    auto nSteps = 0;
    while (physicsUpdateTimeRemaining >= updatePeriod) {
      if (nSteps > maxSteps) {
        physicsUpdateTimeRemaining = 0;
        break;
      }
      physicsWorld.Step(updatePeriod, 6, 2);
      physicsUpdateTimeRemaining -= updatePeriod;
    }
  }

  // Perform behaviors
  getBehaviors().forEach([&](auto &behavior) {
    if constexpr (Handlers::hasPerform<decltype(behavior)>) {
      behavior.handlePerform(dt);
    }
  });
}


//
// Draw
//

void Scene::draw() const {
  lv.graphics.clear(props.backgroundColor(), {}, {});

  lv.graphics.push(love::Graphics::STACK_ALL);

  // Temporary view transform
  constexpr auto viewWidth = 10.0, viewHeight = 7.0 * viewWidth / 5.0;
  viewTransform.reset();
  viewTransform.scale(800.0 / viewWidth, 800.0 / viewWidth);
  viewTransform.translate(0.5 * viewWidth, 0.5 * viewHeight);
  lv.graphics.applyTransform(&viewTransform);

  // Scene
  forEachActorByDrawOrder([&](ActorId actorId, const Actor &actor) {
    getBehaviors().forEach([&](auto &behavior) {
      if constexpr (Handlers::hasDrawComponent<decltype(behavior)>) {
        if (auto component = behavior.maybeGetComponent(actorId)) {
          behavior.handleDrawComponent(actorId, *component);
        }
      }
    });
  });

  // Overlays
  getBehaviors().forEach([&](auto &behavior) {
    if constexpr (Handlers::hasDrawOverlay<decltype(behavior)>) {
      behavior.handleDrawOverlay();
    }
  });

  lv.graphics.pop();
}
