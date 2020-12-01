import {
  getVariableName,
  makeExpressionSummary,
  readableOperator,
} from '../../SceneCreatorUtilities';
import { makeCardPreviewTitle } from '../../../common/utilities';
import { SOUND_CATEGORIES } from './PlaySoundResponse';

const Empty = ({ order, isCondition }) => {
  let label;
  if (isCondition) {
    label = 'Select condition';
  } else {
    label = order === 0 ? 'Select response' : 'Add response';
  }
  return [
    {
      type: 'selectEntryPlaceholder',
      label,
    },
  ];
};

const Default = ({ response }) => {
  let paramsToRender = { ...response.params };
  delete paramsToRender.nextResponse;

  return [
    {
      type: 'showEntryOptions',
      label: response.name,
    },
    {
      type: 'text',
      label: `params: ${JSON.stringify(paramsToRender, null, 2)}`,
    },
  ];
};

const If = () => {
  return [
    {
      type: 'showEntryOptions',
      label: 'If',
    },
  ];
};

const ActOnOther = () => {
  return [
    {
      type: 'showEntryOptions',
      label: 'Tell',
    },
    {
      type: 'text',
      label: 'the colliding actor to perform',
    },
  ];
};

const ActOn = ({ response }) => {
  const hasTag = response.params.tag && response.params.tag.length;
  if (hasTag) {
    return [
      {
        type: 'showEntryOptions',
        label: 'Tell',
      },
      {
        type: 'text',
        label: 'actors with tag',
      },
      {
        type: 'selectParamSheet',
        label: '#' + response.params.tag,
        paramName: 'tag',
        paramValue: response.params.tag,
      },
      {
        type: 'text',
        label: 'to perform',
      },
    ];
  } else {
    return [
      {
        type: 'showEntryOptions',
        label: 'Tell',
      },
      {
        type: 'text',
        label: 'actors with tag',
      },
      {
        type: 'selectParamSheetPlaceholder',
        label: 'Select tag',
        paramName: 'tag',
        paramValue: '',
      },
      {
        type: 'text',
        label: 'to perform',
      },
    ];
  }
};

const Repeat = ({ response, context }) => {
  return [
    {
      type: 'showEntryOptions',
      label: 'Repeat',
    },
    {
      type: 'selectParamSheet',
      paramName: 'count',
      paramValue: response.params?.count,
      label: makeExpressionSummary(response.params?.count ?? 0, context),
    },
    {
      type: 'text',
      label: 'times',
    },
  ];
};

const InfiniteRepeat = ({ response, context }) => {
  return [
    {
      type: 'showEntryOptions',
      label: 'Repeat',
    },
    {
      type: 'text',
      label: 'every',
    },
    {
      type: 'selectParamSheet',
      paramName: 'interval',
      paramValue: response.params?.interval,
      label: makeExpressionSummary(response.params?.interval ?? 0, context),
    },
    {
      type: 'text',
      label: response.params?.interval === 1 ? 'second' : 'seconds',
    },
  ];
};

const StopRepeating = () => {
  return [
    {
      type: 'showEntryOptions',
      label: 'Stop repeating',
    },
  ];
};

const Wait = ({ response, context }) => {
  let singular =
    response.params?.duration === 1 ||
    (response.params?.duration?.expressionType === 'number' &&
      response.params.duration.params.value === 1);
  return [
    {
      type: 'showEntryOptions',
      label: 'Wait',
    },
    {
      type: 'text',
      label: 'for',
    },
    {
      type: 'selectParamSheet',
      paramName: 'duration',
      paramValue: response.params?.duration,
      label: makeExpressionSummary(response.params?.duration ?? 0, context),
    },
    {
      type: 'text',
      label: singular ? 'second' : 'seconds',
    },
  ];
};

const CoinFlip = ({ response, context }) => {
  return [
    {
      type: 'selectEntry',
      label: 'a coin flip',
    },
    {
      type: 'text',
      label: 'shows heads with probability',
    },
    {
      type: 'selectParamSheet',
      paramName: 'probability',
      paramValue: response.params.probability,
      label: makeExpressionSummary(response.params.probability, context),
    },
  ];
};

const IsColliding = ({ response }) => {
  const hasTag = response.params?.tag && response.params?.tag.length;
  return [
    {
      type: 'selectEntry',
      label: 'this is colliding',
    },
    {
      type: 'text',
      label: hasTag ? 'with tag' : 'with',
    },
    {
      type: 'selectParamSheet',
      label: hasTag ? response.params.tag : 'any tag',
      paramName: 'tag',
      paramValue: response.params?.tag,
    },
  ];
};

const VariableMeetsCondition = ({ response, context }) => {
  const changeAllParams = {
    paramNames: ['variableId', 'comparison', 'value'],
    paramValues: { ...response.params },
  };
  if (response.params) {
    return [
      {
        type: 'selectEntry',
        label: 'variable',
      },
      {
        type: 'selectParamSheet',
        label: getVariableName(response.params.variableId, context.variables),
        ...changeAllParams,
      },
      {
        type: 'selectParamSheet',
        label: readableOperator(response.params.comparison),
        ...changeAllParams,
      },
      {
        type: 'selectParamSheet',
        label: makeExpressionSummary(response.params.value, context),
        ...changeAllParams,
      },
    ];
  } else {
    return [
      {
        type: 'selectEntry',
        label: 'variable',
      },
      {
        type: 'selectParamSheet',
        label: '(choose variable)',
        ...changeAllParams,
      },
    ];
  }
};

const CounterMeetsCondition = ({ response, context }) => {
  return [
    {
      type: 'selectEntry',
      label: `the actor's counter`,
    },
    {
      type: 'selectParamSheet',
      paramName: 'comparison',
      paramValue: response.params?.comparison ?? 'equal',
      label: readableOperator(response.params?.comparison ?? 'equal'),
    },
    {
      type: 'selectParamSheet',
      paramName: 'value',
      paramValue: response.params?.value ?? 0,
      label: makeExpressionSummary(response.params?.value ?? 0, context),
    },
  ];
};

const Create = ({ response, context }) => {
  let blueprintName;
  if (context?.library && response.params?.entryId) {
    const blueprint = context.library[response.params.entryId];
    if (blueprint) {
      blueprintName = blueprint.title;
    }
  }
  let paramNames, paramValues, label;
  let coordinateSystem = response.params?.coordinateSystem ?? 'relative position';

  if (coordinateSystem === 'relative position') {
    paramNames = ['xOffset', 'yOffset'];
    paramValues = {
      xOffset: response.params?.xOffset ?? 0,
      yOffset: response.params?.yOffset ?? 0,
    };
    label = `x: ${makeExpressionSummary(
      response.params?.xOffset ?? 0,
      context
    )}, y: ${makeExpressionSummary(response.params?.yOffset ?? 0, context)}`;
  } else if (coordinateSystem === 'relative angle and distance') {
    paramNames = ['angle', 'distance'];
    paramValues = {
      angle: response.params?.angle ?? 0,
      distance: response.params?.distance ?? 0,
    };
    label = `a: ${makeExpressionSummary(
      response.params?.angle ?? 0,
      context
    )}, d: ${makeExpressionSummary(response.params?.distance ?? 0, context)}`;
  } else {
    paramNames = ['xAbsolute', 'yAbsolute'];
    paramValues = {
      xAbsolute: response.params?.xAbsolute ?? 0,
      yAbsolute: response.params?.yAbsolute ?? 0,
    };
    label = `x: ${makeExpressionSummary(
      response.params?.xAbsolute ?? 0,
      context
    )}, y: ${makeExpressionSummary(response.params?.yAbsolute ?? 0, context)}`;
  }

  return [
    {
      type: 'showEntryOptions',
      label: 'Create',
    },
    {
      type: blueprintName ? 'selectBlueprintSheet' : 'selectBlueprintSheetPlaceholder',
      label: blueprintName ?? '(choose blueprint)',
    },
    {
      type: 'selectParamSheet',
      paramName: 'depth',
      paramValue: response.params?.depth ?? 0,
      label: response.params?.depth ?? 'in front of all actors',
    },
    {
      type: 'selectParamSheet',
      paramName: 'coordinateSystem',
      paramValue: coordinateSystem,
      label: `at ${coordinateSystem}`,
    },
    {
      type: 'selectParamSheet',
      paramNames,
      paramValues,
      label,
    },
  ];
};

const Destroy = () => {
  return [
    {
      type: 'showEntryOptions',
      label: 'Destroy this actor',
    },
  ];
};

const Show = () => {
  return [
    {
      type: 'showEntryOptions',
      label: 'Show this text',
    },
  ];
};

const Hide = () => {
  return [
    {
      type: 'showEntryOptions',
      label: 'Hide this text',
    },
  ];
};

const RestartScene = () => {
  return [
    {
      type: 'showEntryOptions',
      label: 'Restart this card',
    },
  ];
};

const ResetAllVariables = () => {
  return [
    {
      type: 'showEntryOptions',
      label: 'Reset all variables',
    },
  ];
};

const FollowWithCamera = () => {
  return [
    {
      type: 'showEntryOptions',
      label: 'Follow this with the camera',
    },
  ];
};

const SetBehavior = ({ response, context }) => {
  let behaviorName, propertyName, valueLabel;
  if (response.params?.behaviorId) {
    const entry = Object.entries(context.behaviors).find(
      ([_, b]) => b.behaviorId === response.params.behaviorId
    );
    if (entry) {
      let behavior = entry[1];
      behaviorName = behavior.displayName;
      if (response.params?.propertyName) {
        let spec = behavior.propertySpecs[response.params.propertyName];
        propertyName = spec.label ?? response.params.propertyName;
      }
    }
  }
  valueLabel = response.params?.value !== undefined ? response.params.value : 0;
  if (response.params?.relative) {
    valueLabel = `${valueLabel} (relative)`;
  }
  return [
    {
      type: 'showEntryOptions',
      label: 'Set',
    },
    {
      type: 'selectBehaviorPropertySheet',
      label: behaviorName ?? 'behavior',
      isPropertyVisible: (spec) => spec?.rules?.set === true,
    },
    {
      type: 'text',
      label: 'property',
    },
    {
      type: 'emphasis',
      label: propertyName,
      isPreview: true,
    },
    {
      type: 'text',
      label: 'to',
      isPreview: true,
    },
    {
      type: 'emphasis',
      label: valueLabel,
    },
  ];
};

const EnableBehavior = ({ response, context }) => {
  let behaviorName;
  if (response.params?.behaviorId) {
    const entry = Object.entries(context.behaviors).find(
      ([_, b]) => b.behaviorId === response.params.behaviorId
    );
    if (entry) {
      behaviorName = entry[1].displayName;
    }
  }
  return [
    {
      type: 'showEntryOptions',
      label: 'Enable behavior',
    },
    {
      type: 'selectBehaviorSheet',
      label: behaviorName ?? '(choose behavior)',
      isBehaviorVisible: (behavior) => behavior.allowsDisableWithoutRemoval,
    },
  ];
};

const DisableBehavior = ({ response, context }) => {
  let behaviorName;
  if (response.params?.behaviorId) {
    const entry = Object.entries(context.behaviors).find(
      ([_, b]) => b.behaviorId === response.params.behaviorId
    );
    if (entry) {
      behaviorName = entry[1].displayName;
    }
  }
  return [
    {
      type: 'showEntryOptions',
      label: 'Disable behavior',
    },
    {
      type: 'selectBehaviorSheet',
      label: behaviorName ?? '(choose behavior)',
      isBehaviorVisible: (behavior) => behavior.allowsDisableWithoutRemoval,
    },
  ];
};

const ResetVariable = ({ response, context }) => {
  return [
    {
      type: 'showEntryOptions',
      label: 'Reset variable',
    },
    {
      type: 'selectParamSheet',
      label: getVariableName(response.params?.variableId, context.variables),
      paramName: 'variableId',
      paramValue: response.params?.variableId,
    },
  ];
};

const SetVariable = ({ response, context }) => {
  const changeAllParams = {
    paramNames: ['variableId', 'setToValue'],
    paramValues: {
      ...response.params,
    },
  };
  return [
    {
      type: 'showEntryOptions',
      label: 'Modify variable value',
    },
    {
      type: 'selectParamSheet',
      label: getVariableName(response.params?.variableId, context.variables),
      ...changeAllParams,
    },
    {
      type: 'text',
      label: 'to',
    },
    {
      type: 'selectParamSheet',
      label: makeExpressionSummary(response.params?.setToValue ?? 0, context),
      ...changeAllParams,
    },
  ];
};

const ChangeVariable = ({ response, context }) => {
  const changeAllParams = {
    paramNames: ['variableId', 'changeBy'],
    paramValues: {
      ...response.params,
    },
  };
  return [
    {
      type: 'showEntryOptions',
      label: 'Adjust variable',
    },
    {
      type: 'selectParamSheet',
      label: getVariableName(response.params?.variableId, context.variables),
      ...changeAllParams,
    },
    {
      type: 'text',
      label: 'by',
    },
    {
      type: 'selectParamSheet',
      label: makeExpressionSummary(response.params?.changeBy ?? 0, context),
      ...changeAllParams,
    },
  ];
};

const SetCounter = ({ response, context }) => {
  return [
    {
      type: 'showEntryOptions',
      label: `Modify the actor's counter`,
    },
    {
      type: 'text',
      label: 'to',
    },
    {
      type: 'selectParamSheet',
      label: makeExpressionSummary(response.params?.setToValue ?? 0, context),
      paramName: 'setToValue',
      paramValue: response.params?.setToValue ?? 0,
    },
  ];
};

const ChangeCounter = ({ response, context }) => {
  return [
    {
      type: 'showEntryOptions',
      label: `Adjust the actor's counter`,
    },
    {
      type: 'text',
      label: 'by',
    },
    {
      type: 'selectParamSheet',
      label: makeExpressionSummary(response.params?.changeBy ?? 0, context),
      paramName: 'changeBy',
      paramValue: response.params?.changeBy ?? 0,
    },
  ];
};

const SendPlayerToCard = ({ response, context }) => {
  let cardTitle;
  if (context && context.deck && response.params?.card?.cardId) {
    cardTitle = makeCardPreviewTitle(response.params.card, context.deck);
  } else {
    cardTitle = '(choose card)';
  }
  return [
    {
      type: 'showEntryOptions',
      label: 'Send player to card:',
    },
    {
      type: 'selectCardSheet',
      label: cardTitle,
    },
  ];
};

const AddTag = ({ response }) => {
  let plural = true,
    label = 'Select tag';
  if (response.params?.tag) {
    const tags = response.params.tag.split(' ');
    if (tags && tags.length) {
      plural = !(tags.length == 1);
      label = tags.join(', ');
    }
  }
  return [
    {
      type: 'showEntryOptions',
      label: plural ? 'Add tags' : 'Add tag',
    },
    {
      type: response.params?.tag ? 'selectParamSheet' : 'selectParamSheetPlaceholder',
      label,
      paramName: 'tag',
      paramValue: response.params?.tag ?? '',
    },
  ];
};

const RemoveTag = ({ response }) => {
  let plural = true,
    label = 'Select tag';
  if (response.params?.tag) {
    const tags = response.params.tag.split(' ');
    if (tags && tags.length) {
      plural = !(tags.length == 1);
      label = tags.join(', ');
    }
  }
  return [
    {
      type: 'showEntryOptions',
      label: plural ? 'Remove tags' : 'Remove tag',
    },
    {
      type: response.params?.tag ? 'selectParamSheet' : 'selectParamSheetPlaceholder',
      label,
      paramName: 'tag',
      paramValue: response.params?.tag ?? '',
    },
  ];
};

const MoveTowardOwnAngle = ({ response, context }) => {
  return [
    {
      type: 'showEntryOptions',
      label: 'Move toward my own angle',
    },
    {
      type: 'text',
      label: 'with speed',
    },
    {
      type: 'selectParamSheet',
      label: makeExpressionSummary(response.params?.speed ?? 0, context),
      paramName: 'speed',
      paramValue: response.params?.speed,
    },
  ];
};

const MoveTowardActor = ({ response, context }) => {
  const hasTag = response.params?.tag && response.params?.tag.length;
  return [
    {
      type: 'showEntryOptions',
      label: 'Move toward',
    },
    {
      type: 'text',
      label: hasTag ? 'the closest actor with tag' : 'the closest actor with',
    },
    {
      type: 'selectParamSheet',
      label: hasTag ? response.params.tag : 'any tag',
      paramName: 'tag',
      paramValue: response.params?.tag,
    },
    {
      type: 'text',
      label: 'at speed',
    },
    {
      type: 'selectParamSheet',
      label: makeExpressionSummary(response.params?.speed ?? 0, context),
      paramName: 'speed',
      paramValue: response.params?.speed,
    },
  ];
};

const FaceDirectionOfMotion = () => {
  return [
    {
      type: 'showEntryOptions',
      label: 'Face direction of motion',
    },
  ];
};

const PlaySound = ({ response }) => {
  const soundCategory = SOUND_CATEGORIES.find((c) => c.name === response.params.category);
  if (!soundCategory) {
    soundCategory = SOUND_CATEGORIES[SOUND_CATEGORIES.length - 1];
  }
  return [
    { type: 'showEntryOptions', label: 'Play sound effect' },
    {
      type: 'icon',
      isPreview: true,
      family: 'Feather',
      icon: soundCategory.icon,
    },
    {
      type: 'emphasis',
      isPreview: true,
      label: `${response.params.seed ?? 0}, ${response.params.mutationSeed ?? 0}`,
    },
  ];
};

const IsInCameraViewport = () => {
  return [
    {
      type: 'selectEntry',
      label: 'this is in the camera viewport',
    },
  ];
};

const makeCells = (props) => {
  const { response } = props;
  if (!response || response.name === 'none') {
    return Responses.empty(props);
  } else if (Responses[response.name]) {
    return Responses[response.name](props);
  } else {
    return Responses.default(props);
  }
};

export const Responses = {
  ['act on']: ActOn,
  ['act on other']: ActOnOther,
  if: If,
  repeat: Repeat,
  ['infinite repeat']: InfiniteRepeat,
  ['stop repeating']: StopRepeating,
  wait: Wait,
  ['coin flip']: CoinFlip,
  ['is colliding']: IsColliding,
  ['variable meets condition']: VariableMeetsCondition,
  ['counter meets condition']: CounterMeetsCondition,
  ['set behavior property']: SetBehavior,
  ['enable behavior']: EnableBehavior,
  ['disable behavior']: DisableBehavior,
  ['reset variable']: ResetVariable,
  ['set variable']: SetVariable,
  ['change variable']: ChangeVariable,
  ['set counter']: SetCounter,
  ['change counter']: ChangeCounter,
  ['send player to card']: SendPlayerToCard,
  ['restart scene']: RestartScene,
  ['reset all variables']: ResetAllVariables,
  ['add tag']: AddTag,
  ['remove tag']: RemoveTag,
  ['move toward own angle']: MoveTowardOwnAngle,
  ['move toward actor']: MoveTowardActor,
  ['face direction of motion']: FaceDirectionOfMotion,
  ['play sound']: PlaySound,
  ['follow with camera']: FollowWithCamera,
  ['is in camera viewport']: IsInCameraViewport,
  create: Create,
  destroy: Destroy,
  show: Show,
  hide: Hide,
  empty: Empty,
  default: Default,
  makeCells,
};
