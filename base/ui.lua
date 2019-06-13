local ui = {}


local state = require 'state'
local cjson = (require 'cjson').new()
cjson.encode_sparse_array(true, 1, 0)
local jsEvents = require 'jsEvents'


local UI_UPDATE_FREQUENCY = 20


--
-- Top-level data structures
--

-- The diff'ing state store -- we collect a description of the current UI state here then
-- send diffs to JS
local root = state.new()
root:__autoSync(true)

-- Create a space for panes and create the default pane
root.panes = {}
root.panes.DEFAULT = {
    type = 'pane',
    props = {
        name = 'DEFAULT',
    },
}

-- A weak-keyed store for private (not sent to JS) data per UI element
local store = setmetatable({}, {
    __mode = 'k',
    __index = function(t, k)
        local v = {}
        t[k] = v
        return v
    end,
})


--
-- Events
--

-- Listen for and collect JS->Lua UI events per element
local pendingEvents = {}
jsEvents.listen('CASTLE_TOOL_EVENT', function(params)
    if not pendingEvents[params.pathId] then
        pendingEvents[params.pathId] = {}
    end
    table.insert(pendingEvents[params.pathId], params.event)
end)


--
-- Element construction and stack management
--

-- The hash function used to generate stable and unique keys per element
local function hash(s)
    if #s <= 22 then
        return s
    end
    return love.data.encode('string', 'base64', love.data.hash('md5', s))
end

-- Because we want the API to function by nesting UI calls for describing an element tree, we always
-- keep track of the stack of elements from root -> current parent. A 'path id' here is a unique id
-- per node in the tree, generated by accumulatively hashing ids on the root -> node path. Some (most?)
-- leaf nodes don't need a path id so it needs to be explicitly requested on construction.
local stack = {}

-- Push an element onto the stack to allow it to function as a parent
local function push(element, id)
    local top = stack[#stack]
    table.insert(stack, {
        element = element,
        newChildren = { lastId = nil, count = 0 },
        pathId = hash((top and top.pathId or '') .. id)
    })
end

-- Create a new element and add it as a child of the current element on the top of the stack
local function addChild(typ, id, props, needsPathId)
    assert(type(props) == 'table' or type(props) == 'nil', '`props` must be a table or `nil`')

    local top = stack[#stack]
    top.newChildren.count = top.newChildren.count + 1

    -- Canonicalize id, dedup'ing if exists in new
    id = (props and props.id) or id
    id = hash(typ .. (((type(id) == 'string' and id) or (type(id) == 'number' and tostring(id))) or ''))
    if top.newChildren[id] then
        id = hash(id .. top.newChildren.count)
    end

    -- Reuse old child if exists, add to new, return
    local oldChild
    if top.element.children and top.element.children[id] then
        oldChild = top.element.children[id]
    end
    local child = oldChild or {}
    top.newChildren[id] = child
    child.type = typ
    child.props = props

    -- Update 'linked list' of children
    child.prevId = top.newChildren.lastId
    top.newChildren.lastId = id

    -- Add path id if needed
    if needsPathId then
        child.pathId = hash(top.pathId .. id)
        if store[child].lastPendingEventId then
            child.lastReportedEventId = store[child].lastPendingEventId
        end
        local es = pendingEvents[child.pathId]
        if es then
            store[child].lastPendingEventId = es[#es].eventId
        end
    end

    return child, id
end

-- Pop the current element acting as a parent on the top of the stack, and return to its parent
-- being the top one
local function pop()
    local top = table.remove(stack)
    top.element.children = top.newChildren
end

-- Run `inner` 'inside' `element` by pushing `element` before and popping it after. This is
-- error-tolerant -- if `inner` throws an error, the pop still occurs then the error is resurfaced
-- after.
local function enter(element, id, inner)
    assert(type(inner) == 'function', '`inner` should be a function')
    push(element, id)
    local succeeded, err = pcall(inner)
    pop()
    if not succeeded then
        error(err, 0)
    end
end


--
-- Update cycle
--

-- Listen for JS asking us to send an exact diff next time
local needsSync = false
jsEvents.listen('CASTLE_TOOLS_NEEDS_SYNC', function()
    needsSync = true
end)

-- The top-level UI update -- call user's `castle.uiupdate` then send a diff of UI state to JS
local lastUpdateTime
function ui.update()
    local time = love.timer.getTime()
    if not lastUpdateTime or time - lastUpdateTime > 1 / UI_UPDATE_FREQUENCY then
        lastUpdateTime = time

        push(root.panes.DEFAULT, 'DEFAULT')
        if castle and castle.uiupdate then
            castle.uiupdate()
        end
        pop()
        pendingEvents = {}

        local diff = root:__diff(0, needsSync) -- Exact diff if `needsSync`
        if diff ~= nil then
            local diffJson = cjson.encode(diff)
            jsEvents.send('CASTLE_TOOLS_UPDATE', diffJson)
            -- print('update: ' .. diffJson)
            -- print('update size: ' .. #diffJson)
            -- io.flush()
        end
        root:__flush()
        needsSync = false
    end
end


--
-- Utilities
--

-- Return a table with the union of keys of the tables passed as arguments, with the values
-- being the associated value from the rightmost table that has it
local function merge(t, u, ...)
    if u == nil then
        return t
    end
    local r = {}
    for k, v in pairs(t) do
        r[k] = v
    end
    for k, v in pairs(u) do
        r[k] = v
    end
    return merge(r, ...)
end

-- Return the first argument without the rest of the arguments as keys
local function without(t, w, ...)
    if w == nil then
        return t
    end
    local r = {}
    for k, v in pairs(t) do
        if k ~= w then
            r[k] = v
        end
    end
    return without(r, ...)
end


--
-- Components
--

function ui.box(...)
    local id, props, inner
    local nArgs = select('#', ...)
    if nArgs == 2 then
        id, inner = ...
    elseif nArgs == 3 then
        id, props, inner = ...
    end
    assert(type(id) == 'string', '`ui.box` needs a string `id`')

    local c, newId = addChild('box', id, props or {}, true)
    enter(c, newId, inner)
end

function ui.button(label, props)
    assert(type(label) == 'string', '`ui.button` needs a string `label`')

    local c = addChild('button', label, without(merge({ label = label }, props), 'onClick'), true)

    local clicked = false
    local es = pendingEvents[c.pathId]
    if es then
        for _, e in ipairs(es) do
            if e.type == 'onClick' then
                if props and props.onClick then
                    props.onClick()
                end
                clicked = true
            end
        end
    end
    return clicked
end

function ui.checkbox(label, checked, props)
    assert(type(label) == 'string', '`ui.checkbox` needs a string `label`')
    assert(type(checked) == 'boolean', '`ui.checkbox` needs a boolean `checked`')

    local c = addChild('checkbox', label, without(merge({ label = label, checked = checked }, props), 'onChange'), true)

    local newChecked = checked
    local es = pendingEvents[c.pathId]
    if es then
        for _, e in ipairs(es) do
            if e.type == 'onChange' then
                if props and props.onChange then
                    local r = props.onChange(e.checked)
                    if r ~= nil then
                        newChecked = r
                    else
                        newChecked = e.checked
                    end
                else
                    newChecked = e.checked
                end
            end
        end
    end
    return newChecked
end

function ui.colorPicker(label, r, g, b, a, props)
    assert(type(label) == 'string', '`ui.colorPicker` needs a string `label`')
    assert(type(r) == 'number', '`ui.colorPicker` needs a number `r`')
    assert(type(g) == 'number', '`ui.colorPicker` needs a number `g`')
    assert(type(b) == 'number', '`ui.colorPicker` needs a number `b`')
    assert(type(a) == 'number', '`ui.colorPicker` needs a number `a`')

    local value = { r = r, g = g, b = b, a = a }

    local c = addChild('colorPicker', label, without(merge({ label = label, value = value }, props), 'onChange'), true)

    local newValue = value
    local es = pendingEvents[c.pathId]
    if es then
        for _, e in ipairs(es) do
            if e.type == 'onChange' then
                if props and props.onChange then
                    newValue = props.onChange(e.value) or e.value
                else
                    newValue = e.value
                end
            end
        end
    end
    return newValue.r, newValue.g, newValue.b, newValue.a
end

function ui.dropdown(label, value, items, props)
    assert(type(label) == 'string', '`ui.dropdown` needs a string `label`')
    assert(type(value) == 'string' or type(value) == 'nil', '`ui.dropdown` needs a string or nil `value`')
    assert(type(items) == 'table', '`ui.dropdown` needs a table `items`')

    local c = addChild('dropdown', label, without(merge({ label = label, value = value, items = items }, props), 'onChange'), true)

    local newValue = value
    local es = pendingEvents[c.pathId]
    if es then
        for _, e in ipairs(es) do
            if e.type == 'onChange' then
                if props and props.onChange then
                    newValue = props.onChange(e.value) or e.value
                else
                    newValue = e.value
                end
            end
        end
    end
    return newValue
end

function ui.image(path, props)
    assert(type(path) == 'string', '`ui.image` needs a string `path`')
    addChild('image', path, merge({ path = path }, props), false)
end

function ui.markdown(source, props)
    assert(type(source) == 'string', '`ui.markdown` needs a string `source`')
    addChild('markdown', source, merge({ source = source }, props), false)
end

function ui.numberInput(label, value, props)
    assert(type(label) == 'string', '`ui.numberInput` needs a string `label`')
    assert(type(value) == 'number', '`ui.numberInput` needs a number `value`')

    local c = addChild('numberInput', label, without(merge({ label = label, value = value }, props), 'onChange'), true)

    local newValue = value
    local es = pendingEvents[c.pathId]
    if es then
        for _, e in ipairs(es) do
            if e.type == 'onChange' then
                if props and props.onChange then
                    newValue = props.onChange(e.value) or e.value
                else
                    newValue = e.value
                end
            end
        end
    end
    return newValue
end

function ui.radioButtonGroup(label, value, items, props)
    assert(type(label) == 'string', '`ui.radioButtonGroup` needs a string `label`')
    assert(type(value) == 'string', '`ui.radioButtonGroup` needs a string `value`')
    assert(type(items) == 'table', '`ui.radioButtonGroup` needs a table `items`')

    local c = addChild('radioButtonGroup', label, without(merge({ label = label, value = value, items = items }, props), 'onChange'), true)

    local newValue = value
    local es = pendingEvents[c.pathId]
    if es then
        for _, e in ipairs(es) do
            if e.type == 'onChange' then
                if props and props.onChange then
                    newValue = props.onChange(e.value) or e.value
                else
                    newValue = e.value
                end
            end
        end
    end
    return newValue
end

function ui.section(...)
    local label, props, inner
    local nArgs = select('#', ...)
    if nArgs == 2 then
        label, inner = ...
    elseif nArgs == 3 then
        label, props, inner = ...
    end
    assert(type(label) == 'string', '`ui.section` needs a string `label`')

    local c, newId = addChild('section', label, merge({ label = label }, props), true)

    local open = store[c].open
    if c.props.open ~= nil then
        open = c.props.open
    else
        open = open
    end

    c.open = open
    if open then
        enter(c, newId, inner)
    end

    local es = pendingEvents[c.pathId]
    if es then
        for _, e in ipairs(es) do
            if e.type == 'onChange' then
                open = e.open
            end
        end
    end
    store[c].open = open
    return open
end

function ui.scrollBox(...)
    local id, props, inner
    local nArgs = select('#', ...)
    if nArgs == 2 then
        id, inner = ...
    elseif nArgs == 3 then
        id, props, inner = ...
    end
    assert(type(id) == 'string', '`ui.scrollBox` needs a string `id`')

    local c, newId = addChild('scrollBox', id, props or {}, true)
    enter(c, newId, inner)
end

function ui.slider(label, value, min, max, props)
    assert(type(label) == 'string', '`ui.slider` needs a string `label`')
    assert(type(value) == 'number', '`ui.slider` needs a number `value`')
    assert(type(min) == 'number', '`ui.slider` needs a number `min`')
    assert(type(max) == 'number', '`ui.slider` needs a number `max`')

    local c = addChild('slider', label, without(merge({ label = label, value = value, min = min, max = max }, props), 'onChange'), true)

    local newValue = value
    local es = pendingEvents[c.pathId]
    if es then
        for _, e in ipairs(es) do
            if e.type == 'onChange' then
                if props and props.onChange then
                    newValue = props.onChange(e.value) or e.value
                else
                    newValue = e.value
                end
            end
        end
    end
    return newValue
end

function ui.tab(...)
    local label, props, inner
    local nArgs = select('#', ...)
    if nArgs == 2 then
        label, inner = ...
    elseif nArgs == 3 then
        label, props, inner = ...
    end
    assert(type(label) == 'string', '`ui.tab` needs a string `label`')

    local c, newId = addChild('tab', label, merge({ label = label }, props), true)

    local active = store[c].active == true
    local es = pendingEvents[c.pathId]
    if es then
        for _, e in ipairs(es) do
            if e.type == 'onActive' then
                active = e.value
            end
        end
    end
    store[c].active = active

    enter(c, newId, inner)

    return active
end

function ui.tabs(...)
    local id, props, inner
    local nArgs = select('#', ...)
    if nArgs == 2 then
        id, inner = ...
    elseif nArgs == 3 then
        id, props, inner = ...
    end
    assert(type(id) == 'string', '`ui.tabs` needs a string `id`')

    local c, newId = addChild('tabs', id, props or {}, true)
    enter(c, newId, inner)
end

function ui.textArea(label, value, props)
    assert(type(label) == 'string', '`ui.textArea` needs a string `label`')
    assert(type(value) == 'string', '`ui.textArea` needs a string `value`')

    local c = addChild('textArea', label, without(merge({ label = label, value = value }, props), 'onChange'), true)

    local newValue = value
    local es = pendingEvents[c.pathId]
    if es then
        for _, e in ipairs(es) do
            if e.type == 'onChange' then
                if props and props.onChange then
                    newValue = props.onChange(e.value) or e.value
                else
                    newValue = e.value
                end
            end
        end
    end
    return newValue
end

function ui.textInput(label, value, props)
    assert(type(label) == 'string', '`ui.textInput` needs a string `label`')
    assert(type(value) == 'string', '`ui.textInput` needs a string `value`')

    local c = addChild('textInput', label, without(merge({ label = label, value = value }, props), 'onChange'), true)

    local newValue = value
    local es = pendingEvents[c.pathId]
    if es then
        for _, e in ipairs(es) do
            if e.type == 'onChange' then
                if props and props.onChange then
                    newValue = props.onChange(e.value) or e.value
                else
                    newValue = e.value
                end
            end
        end
    end
    return newValue
end

function ui.toggle(labelA, labelB, toggled, props)
    assert(type(labelA) == 'string', '`ui.toggle` needs a string `labelA`')
    assert(type(labelB) == 'string', '`ui.toggle` needs a string `labelB`')
    assert(type(toggled) == 'boolean', '`ui.toggle` needs a boolean `toggled`')

    local c = addChild('toggle', labelA .. labelB, without(merge({ labelA = labelA, labelB = labelB, toggled = toggled }, props), 'onToggle'), true)

    local newToggled = toggled
    local es = pendingEvents[c.pathId]
    if es then
        for _, e in ipairs(es) do
            if e.type == 'onToggle' then
                if props and props.onToggle then
                    local r = props.onToggle(e.toggled)
                    if r ~= nil then
                        newToggled = r
                    else
                        newToggled = e.toggled
                    end
                else
                    newToggled = e.toggled
                end
            end
        end
    end
    return newToggled
end


return ui