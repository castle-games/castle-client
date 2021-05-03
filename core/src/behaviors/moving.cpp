#include "moving.h"

#include "behaviors/all.h"


//
// Enable, disable
//

void MovingBehavior::handleEnableComponent(ActorId actorId, MovingComponent &component) {
  if (auto body = getBehaviors().byType<BodyBehavior>().maybeGetPhysicsBody(actorId)) {
    body->SetType(b2_dynamicBody); // Do this before setting velocities, otherwise they're ignored
    body->SetLinearVelocity({ component.props.vx(), component.props.vy() });
    body->SetAngularVelocity(float(component.props.angularVelocity() * M_PI / 180));
    handleUpdateComponentFixtures(actorId, component, body);
  }
}

void MovingBehavior::handleDisableComponent(
    ActorId actorId, MovingComponent &component, bool removeActor) {
  if (!removeActor) {
    if (auto body = getBehaviors().byType<BodyBehavior>().maybeGetPhysicsBody(actorId)) {
      handleUpdateComponentFixtures(actorId, component, body);
      body->SetType(b2_staticBody); // Internally sets velocities to zero
    }
  }
}


//
// Getters, setters
//

ExpressionValue MovingBehavior::handleGetProperty(
    ActorId actorId, const MovingComponent &component, PropId propId) const {
  auto body = getBehaviors().byType<BodyBehavior>().maybeGetPhysicsBody(actorId);
  if (!body) {
    return {};
  }
  auto &props = component.props;
  if (propId == props.vx.id) {
    return body->GetLinearVelocity().x;
  } else if (propId == props.vy.id) {
    return body->GetLinearVelocity().y;
  } else if (propId == props.angularVelocity.id) {
    return body->GetAngularVelocity() * 180 / M_PI;
  } else if (propId == props.density.id) {
    return props.density();
  } else {
    return BaseBehavior::handleGetProperty(actorId, component, propId);
  }
}

void MovingBehavior::handleSetProperty(
    ActorId actorId, MovingComponent &component, PropId propId, const ExpressionValue &value) {
  auto body = getBehaviors().byType<BodyBehavior>().maybeGetPhysicsBody(actorId);
  if (!body) {
    return;
  }
  auto &props = component.props;
  if (propId == props.vx.id) {
    body->SetLinearVelocity({ value.as<float>(), body->GetLinearVelocity().y });
  } else if (propId == props.vy.id) {
    body->SetLinearVelocity({ body->GetLinearVelocity().x, value.as<float>() });
  } else if (propId == props.angularVelocity.id) {
    body->SetAngularVelocity(float(value.as<double>() * M_PI / 180));
  } else if (propId == props.density.id) {
    props.density() = value.as<float>();
    handleUpdateComponentFixtures(actorId, component, body);
  } else {
    BaseBehavior::handleSetProperty(actorId, component, propId, value);
  }
}


//
// Fixtures
//

void MovingBehavior::handleUpdateComponentFixtures(
    ActorId actorId, MovingComponent &component, b2Body *body) {
  auto density = component.disabled ? 1 : component.props.density();
  for (auto fixture = body->GetFixtureList(); fixture; fixture = fixture->GetNext()) {
    fixture->SetDensity(density);
  }
  body->ResetMassData();
}
