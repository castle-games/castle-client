splash = {
    _shineTimer = 2,
    _shineX = 0,
    _shineVelocity = 800,
    _textY = 0,
    _textYTimer = 0,
}

local imgMaskText = love.graphics.newImage('assets/loading-mask-text.png')
imgMaskText:setFilter('nearest', 'nearest')
local imgSize = { width = 301, height = 78 }

function splash:draw()
    local width, height = love.graphics.getDimensions()
    love.graphics.push('all')
    love.graphics.translate(width * 0.5, height * 0.5)
    love.graphics.scale(0.5, 0.5)
    love.graphics.translate(-imgSize.width * 0.5, (-imgSize.height * 0.5) + self._textY)
    love.graphics.setColor(1, 1, 1, 0.7)
    love.graphics.rectangle('fill', 0, 0, imgSize.width, imgSize.height)
    if self._shineX > 18 and self._shineX < imgSize.width - 18 then
        love.graphics.push('all')
        love.graphics.setBlendMode('add')
        love.graphics.setColor(1, 1, 1, 0.3)
        love.graphics.rectangle('fill', self._shineX - 18, 0, 36, imgSize.height)
        love.graphics.rectangle('fill', self._shineX - 6, 0, 12, imgSize.height)
        love.graphics.pop()
    end
    love.graphics.setColor(1, 1, 1, 1)
    love.graphics.draw(
        imgMaskText,
        0, 0,
        0,
        1, 1,
        0, 0
    )
    love.graphics.pop()
end

function splash:update(dt)
    self._shineTimer = self._shineTimer - dt
    if self._shineTimer <= 0 then
        self._shineX = 0
        self._shineVelocity = 800
        self._shineTimer = 1.75
    end

    if self._shineX < imgSize.width then
        self._shineX = self._shineX + self._shineVelocity * dt
        self._shineVelocity = self._shineVelocity - 100 * dt
    end

    self._textYTimer = self._textYTimer + dt
    self._textY = math.sin(self._textYTimer * 4.0) * 7
end

return splash
