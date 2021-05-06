#pragma once

#include "precomp.h"

#include "behaviors/base.h"
#include "props.h"


struct CounterComponent : BaseComponent {
  struct Props {
    PROP(double, value) = 0;
    PROP(double, minValue) = 0;
    PROP(double, maxValue) = 100;
  } props;
};

class CounterBehavior : public BaseBehavior<CounterBehavior, CounterComponent> {
public:
  static constexpr auto name = "Counter";
  static constexpr auto behaviorId = 18;

  using BaseBehavior::BaseBehavior;


  void handleSetProperty(
      ActorId actorId, CounterComponent &component, PropId propId, const ExpressionValue &value);


  friend struct CounterValueExpression;
  friend struct SetCounterResponse;
};
