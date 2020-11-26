SCENE_CREATOR_API_VERSION = "dev"

local ffi = require "ffi"
local C = ffi.C
local cjson = require "cjson"
local copas = require "copas"

GRID_SHADER =
        love.graphics.newShader(
        [[
        uniform float gridSize;
        uniform float dotRadius;
        uniform vec2 offset;
        vec4 effect(vec4 color, Image tex, vec2 texCoords, vec2 screenCoords)
        {
            vec2 f = mod(screenCoords + offset + dotRadius, gridSize);
            float l = length(f - dotRadius);
            float s = 1.0 - smoothstep(dotRadius - 1.0, dotRadius + 1.0, l);
            return vec4(color.rgb, s * color.a);
        }
    ]],
        [[
        vec4 position(mat4 transformProjection, vec4 vertexPosition)
        {
            return transformProjection * vertexPosition;
        }
    ]]
    )


math.randomseed(10000 * require("socket").gettime())

GHOST_NETWORK_REQUEST_EVENT_ENABLED = false

local theOS = love.system.getOS()
local isMobile = theOS == "Android" or theOS == "iOS"

-- Make a directory for temporary files

CASTLE_TMP_DIR_NAME = "tmp"
love.filesystem.createDirectory(CASTLE_TMP_DIR_NAME)
for _, filename in pairs(love.filesystem.getDirectoryItems(CASTLE_TMP_DIR_NAME)) do
    love.filesystem.remove(CASTLE_TMP_DIR_NAME .. "/" .. filename)
end

-- We need to maintain modifier key state ourselves because if SDL is quit when a modifier is held down,
-- it keeps thinking the key is held down when SDL is next initialized even if the key was released in
-- between (seems maybe a Windows-only issue?)... :/

CASTLE_MODIFIER_KEYS = {
    rshift = false,
    lshift = false,
    rctrl = false,
    lctrl = false,
    ralt = false,
    lalt = false,
    rgui = false,
    lgui = false
}

local originalLoveKeyboardIsDown = love.keyboard.isDown

do
    function love.keyboard.isDown(key)
        if CASTLE_MODIFIER_KEYS[key] ~= nil then
            return CASTLE_MODIFIER_KEYS[key]
        else
            return originalLoveKeyboardIsDown(key)
        end
    end
end

-- Built-in libraries

network = require "__ghost__.network"
require = require "__ghost__.require"
castle = require "__ghost__.castle"
local root = require "__ghost__.portal"
local jsEvents = require "__ghost__.jsEvents"

-- Forward `print` and errors to JS, write them to '.log' files on desktop

local updateLogs
do
    local ERRORS_FILE_NAME, PRINTS_FILE_NAME = "castle_errors.log", "castle_prints.log"

    if castle.system.isDesktop() then
        love.filesystem.write(ERRORS_FILE_NAME, "")
        love.filesystem.write(PRINTS_FILE_NAME, "")
    end

    local collectedPrints = {} -- Stash prints and flush them to the '.log' file once in a while
    local oldPrint = print -- Save original print function to call later
    function print(...)
        oldPrint('LUA: ', ...)
        local array = {...}
        if castle.system.isRemoteServer() then
            love.thread.getChannel("PRINT"):push(cjson.encode(array))
        else
            jsEvents.send("GHOST_PRINT", array)
        end
        if castle.system.isDesktop() then
            collectedPrints[#collectedPrints + 1] = cjson.encode(array)
        end
    end

    local errors = {}
    function DEFAULT_ERROR_HANDLER(err, stack) -- Referenced in 'network.lua'
        for chunkName, filename in pairs(CHUNK_NAME_TO_FILE_NAME) do
            local pattern = '%[string "' .. chunkName .. '"%]'
            err = err:gsub(pattern, filename)
            stack = stack:gsub(pattern, filename)
        end
        oldPrint('LUA: ', stack)
        local obj = {error = err, stacktrace = stack}
        if castle.system.isRemoteServer() then
            love.thread.getChannel("ERROR"):push(cjson.encode(obj))
        else
            jsEvents.send("GHOST_ERROR", obj)
        end
        if castle.system.isDesktop() then
            love.filesystem.append(ERRORS_FILE_NAME, cjson.encode(obj) .. "\n")
        end
    end

    function root.onError(err, portal, stack)
        DEFAULT_ERROR_HANDLER(err, stack)
    end

    local lastPrintDumpTime
    function updateLogs(isQuitting)
        -- Flush stashed prints to '.log' file once in a while
        if castle.system.isDesktop() then
            local now = love.timer.getTime()
            if isQuitting or not lastPrintDumpTime or now - lastPrintDumpTime > 0.5 then
                lastPrintDumpTime = now
                if #collectedPrints > 0 then
                    love.filesystem.append(PRINTS_FILE_NAME, table.concat(collectedPrints, "\n") .. "\n")
                    collectedPrints = {}
                end
            end
        end
    end
end

-- Forward declarations...

local home  -- Portal to the home experience

-- Mobile keyboard event handling

local mobileKeyDownChannel = love.thread.getChannel("GHOST_KEY_DOWN")
local mobileKeyUpChannel = love.thread.getChannel("GHOST_KEY_UP")

local updateMobileKeyboardEvents
if isMobile then
    local keyDownCount = {} -- Number of touches on a key -- `nil` if zero

    mobileKeyDownChannel:clear()
    mobileKeyUpChannel:clear()

    function updateMobileKeyboardEvents()
        -- Handle presses before releases to prevent release + press events for the same key within the same frame
        while mobileKeyDownChannel:getCount() > 0 do
            local ks = mobileKeyDownChannel:pop()
            for k in ks:gmatch("[^_]+") do
                if keyDownCount[k] == nil then
                    -- First touch? Send pressed event.
                    keyDownCount[k] = 1
                    if home then
                        home:keypressed(k, k, false)
                    end
                else
                    keyDownCount[k] = keyDownCount[k] + 1
                end
            end
        end
        while mobileKeyUpChannel:getCount() > 0 do
            local ks = mobileKeyUpChannel:pop()
            for k in ks:gmatch("[^_]+") do
                if keyDownCount[k] == 1 then
                    -- Last release? Send released event.
                    keyDownCount[k] = nil
                    if home then
                        home:keyreleased(k, k, false)
                    end
                elseif keyDownCount[k] ~= nil then
                    keyDownCount[k] = keyDownCount[k] - 1
                end
            end
        end
    end

    function love.keyboard.isDown(k)
        return keyDownCount[k] ~= nil
    end
end

-- Top-level Love callbacks

local initialFileDropped  -- In case a `love.filedropped` occurred before home experience is loaded

local homeUrl = nil -- Populated later with the final home experience URL

local main = {}
RELOAD_SCENE_CREATOR = false
RELOAD_SCENE_CREATOR_ONCE = false

network.async(
    function()
        if GHOST_ROOT_URI and string.len(GHOST_ROOT_URI) > 0 then
            if string.sub(GHOST_ROOT_URI, 1, string.len("reload+")) == "reload+" then
                RELOAD_SCENE_CREATOR = true
                GHOST_ROOT_URI = string.sub(GHOST_ROOT_URI, string.len("reload+") + 1)
            else
                RELOAD_SCENE_CREATOR_ONCE = true
            end

            homeUrl = GHOST_ROOT_URI
        else
            local fileData = nil
            local localFilePath = "scene_creator_downloads/scene_creator_download_" .. SCENE_CREATOR_API_VERSION .. ".love"

            if love.filesystem.exists(localFilePath) then
                print("Using SceneCreatorDownloader file")
                fileData = love.filesystem.newFileData(localFilePath)
            end

            if fileData == nil then
                local sceneCreatorResponse =
                    network.fetch("https://api.castle.xyz/api/scene-creator?apiVersion=" .. SCENE_CREATOR_API_VERSION)
                fileData = love.filesystem.newFileData(sceneCreatorResponse, "scene_creator.love")
            end

            love.filesystem.mount(fileData, "zip_mount", true)
            homeUrl = "zip://Client.lua"
        end
    end
)

local pendingPostOpens = {} -- Keep track of post open requests
jsEvents.permanentListen(
    "CASTLE_POST_OPENED",
    function(postOpen)
        table.insert(pendingPostOpens, postOpen)
    end
)

local pendingJoystickAdds = {} -- Keep track of joystick opens before `home` is ready
function main.joystickadded(joystick)
    if not (home and home.loaded) then
        table.insert(pendingJoystickAdds, joystick)
    end
end

ffi.cdef "bool ghostGetBackgrounded();"

local isFirstLoad = true

jsEvents.permanentListen(
    "CLEAR_SCENE",
    function(params)
        print("CLEAR_SCENE")
        jsEvents.clearListeners()
        home = nil
        CLEAR_CHILD_ENVS()
        collectgarbage()
        collectgarbage()

        resetUI()
    end
)

jsEvents.permanentListen(
    "BASE_RELOAD",
    function(params)
        print("BASE_RELOAD")
        jsEvents.clearListeners()
        CLEAR_CHILD_ENVS()
        collectgarbage()
        collectgarbage()

        print("GCTEST: MEM: " .. math.floor(collectgarbage("count")) .. "kb")
        network.async(
            function()
                if isFirstLoad and love.graphics then
                    -- Sleep a little to let screen dimensions settings synchronize, then create the default
                    -- font, so that it has the updated DPI
                    copas.sleep(0.08)
                    love.graphics.setFont(love.graphics.newFont(14))

                    isFirstLoad = false
                end

                CASTLE_INITIAL_DATA = params
                decodedInitialParams = cjson.decode(params.initialParams)

                if home ~= nil then
                    home = nil
                end

                -- make sure to wait until scene creator is downloaded
                while homeUrl == nil do
                    copas.sleep(0.08)
                end

                home = root:newChild(homeUrl, {noConf = true})

                jsEvents.send("CASTLE_GAME_LOADED", {})
                io.flush()
                resetUI()
                network.onGameLoaded()
            end
        )
    end
)

function main.update(dt)
    if isMobile then
        updateMobileKeyboardEvents()
    end

    network.update(dt)

    jsEvents.update()

    castle.ui.update()

    updateLogs()

    if castle.system.isDesktop() and C.ghostGetBackgrounded() then
        for key in pairs(CASTLE_MODIFIER_KEYS) do
            CASTLE_MODIFIER_KEYS[key] = false
        end
    end

    if home then
        -- If has a `castle.postopened` handler, notify of post opens
        if home.loaded and home.globals.castle.postopened then
            for _, postOpen in ipairs(pendingPostOpens) do
                home:safeCall(home.globals.castle.postopened, castle.post._decodePost(postOpen))
            end
            pendingPostOpens = {}
        end

        -- Notify of joystick adds
        if home.loaded and #pendingJoystickAdds > 0 then
            if home.joystickadded then
                for _, joystick in ipairs(pendingJoystickAdds) do
                    home:joystickadded(joystick)
                end
            end
            pendingJoystickAdds = {}
        end

        if castle.system.isDesktop() and C.ghostGetBackgrounded() then
            if home.globals.castle.backgroundupdate then
                home:safeCall(home.globals.castle.backgroundupdate, dt)
            end
        else
            home:update(dt)
        end
    end
end

function main.draw(...)
    love.graphics.push("all")
    if home then
        home:draw(...)
    end
    love.graphics.pop()
end

ffi.cdef "bool ghostFocusChat();"

function main.keypressed(key, ...)
    if CASTLE_MODIFIER_KEYS[key] ~= nil then
        CASTLE_MODIFIER_KEYS[key] = true
    end
    local ctrl = CASTLE_MODIFIER_KEYS.lctrl or CASTLE_MODIFIER_KEYS.rctrl
    local gui = CASTLE_MODIFIER_KEYS.lgui or CASTLE_MODIFIER_KEYS.rgui
    local shift = CASTLE_MODIFIER_KEYS.lshift or CASTLE_MODIFIER_KEYS.rshift

    -- Intercept system hotkeys
    if castle.system.isDesktop() then
        if
            (key == "escape") or
                ((ctrl or gui or shift) and (key == "j" or key == "r" or key == "f" or key == "w" or key == "s"))
         then
            jsEvents.send(
                "CASTLE_SYSTEM_KEY_PRESSED",
                {
                    ctrlKey = ctrl,
                    altKey = false,
                    metaKey = gui,
                    shiftKey = shift,
                    key = key
                }
            )
            return
        end
    else
        if key == "escape" then
            jsEvents.send("CASTLE_SYSTEM_BACK_BUTTON")
            return
        end
    end

    -- Chat focus
    if ctrl and key == "g" then
        C.ghostFocusChat()
    end

    if home then
        if isMobile then -- Handle keyboard events through mobile system
            mobileKeyDownChannel:push(key)
            updateMobileKeyboardEvents()
        else
            home:keypressed(key, ...)
        end
    end
end

function main.keyreleased(key, ...)
    if CASTLE_MODIFIER_KEYS[key] ~= nil then
        CASTLE_MODIFIER_KEYS[key] = false
    end

    if home then
        if isMobile then -- Handle keyboard events through mobile system
            mobileKeyUpChannel:push(key)
            updateMobileKeyboardEvents()
        else
            home:keyreleased(key, ...)
        end
    end
end

function main.filedropped(file)
    if home then
        home:filedropped(file)
    else
        initialFileDropped = file
    end
end

function main.mousepressed(...)
    love.thread.getChannel("FOCUS_ME"):clear()
    love.thread.getChannel("FOCUS_ME"):push("PLEASE")
    if home then
        home:mousepressed(...)
    end
end

do
    -- Wrap this to account for our own dimensions stuff
    local oldW, oldH, oldDPIScale
    function main.resize()
        if home then
            local w, h = home.globals.love.graphics.getDimensions()
            local dpiScale = home.globals.love.graphics.getDPIScale()
            if w ~= oldW or h ~= oldH or dpiScale ~= oldDPIScale then
                home:resize(w, h)
            end
            oldW, oldH, oldDPIScale = w, h, dpiScale
        end
    end
end

function main.quit(...)
    love.mouse.setRelativeMode(false)
    love.mouse.setGrabbed(false)

    updateLogs(true)

    if home then
        home:quit(...)
    end
end

function castle.uiupdate()
    if home and home.globals.castle.uiupdate and home.globals.castle.uiupdate ~= castle.uiupdate then
        home:safeCall(home.globals.castle.uiupdate)
    end
end

for k in pairs(
    {
        load = true,
        quit = true,
        update = true,
        draw = true,
        keypressed = true,
        keyreleased = true,
        mousefocus = true,
        mousemoved = true,
        mousepressed = true,
        mousereleased = true,
        resize = true,
        textedited = true,
        textinput = true,
        touchmoved = true,
        touchpressed = true,
        touchreleased = true,
        wheelmoved = true,
        gamepadaxis = true,
        gamepadpressed = true,
        gamepadreleased = true,
        joystickadded = true,
        joystickaxis = true,
        joystickhat = true,
        joystickpressed = true,
        joystickreleased = true,
        joystickremoved = true,
        focus = true,
        filedropped = true,
        visible = true
    }
) do
    love[k] = function(...)
        if main[k] then
            main[k](...)
        else -- Default behavior if we didn't define it in `main`
            if home and home[k] then
                home[k](home, ...)
            end
        end
    end
end

-- Based on default in https://love2d.org/wiki/love.run with Ghost adjustments
function love.run()
    if love.load then
        love.load(love.arg.parseGameArguments(arg), arg)
    end

    -- We don't want the first frame's dt to include time taken by love.load.
    if love.timer then
        love.timer.step()
    end

    local dt = 0

    --- XXX(Ghost): For 60 Hz throttling when headless
    local lastLoopStartTime, lastSleepError

    -- Main loop time.
    return function()
        -- Process events.
        if love.event then
            love.event.pump()
            for name, a, b, c, d, e, f in love.event.poll() do
                if name == "quit" then
                    if not love.quit or not love.quit() then
                        return a or 0
                    end
                end
                love.handlers[name](a, b, c, d, e, f)
            end
        end

        -- Update dt, as we'll be passing it to update
        if love.timer then
            dt = love.timer.step()
        end

        --- XXX(Ghost): 60 Hz throttling when headless
        if not (love.graphics and love.graphics.isActive()) then
            if lastLoopStartTime then
                local sleepTarget = lastLoopStartTime + (1 / 60) - (lastSleepError or 0)
                local sleepDuration = sleepTarget - love.timer.getTime()
                if sleepDuration > 0.001 then
                    love.timer.sleep(sleepDuration)
                end
                local sleepError = love.timer.getTime() - sleepTarget
                if lastSleepError then
                    lastSleepError = 0.5 * lastSleepError + 0.5 * sleepError
                else
                    lastSleepError = sleepError
                end
            end
        end
        lastLoopStartTime = love.timer.getTime()

        -- Call update and draw
        if love.update then
            love.update(dt)
        end -- will pass 0 if love.timer is disabled

        if love.graphics and love.graphics.isActive() then
            love.graphics.origin()
            love.graphics.clear(love.graphics.getBackgroundColor())

            if love.draw then
                love.draw()
            end

            love.graphics.present()
        end

        if love.timer then
            love.timer.sleep(0.001)
        end
    end
end
