import { Element, extend, on, off, Box } from '@svgdotjs/svg.js'

const getCoordsFromEvent = ev => {
  if (ev.changedTouches) {
    ev = ev.changedTouches[0]
  }
  return { x: ev.clientX, y: ev.clientY }
}

class ResizeHandler {
  constructor(el) {
    this.el = el
    this.lastCoordinates = null
    this.eventType = ''
    this.handleResize = this.handleResize.bind(this)
    this.resize = this.resize.bind(this)
    this.endResize = this.endResize.bind(this)
    this.rotate = this.rotate.bind(this)
    this.shear = this.shear.bind(this)
  }

  active(value) {
    // remove all resize events
    this.el.off('.resize')

    if (!value) return

    this.el.on(
      [
        'lt.resize',
        'rt.resize',
        'rb.resize',
        'lb.resize',
        't.resize',
        'r.resize',
        'b.resize',
        'l.resize',
        'rot.resize',
        'shear.resize'
      ],
      this.handleResize
    )
  }

  // This is called when a user clicks on one of the resize points
  handleResize(e) {
    this.eventType = e.type
    const { x: startX, y: startY, event } = e.detail

    const isMouse = !event.type.indexOf('mouse')

    // Check for left button
    if (isMouse && (event.which || event.buttons) !== 1) {
      return
    }

    // Fire beforedrag event
    if (
      this.el.dispatch('beforeresize', { event: e, handler: this })
        .defaultPrevented
    ) {
      return
    }

    const fromShapeToUiMatrix = this.el
      .root()
      .screenCTM()
      .inverseO()
      .multiplyO(this.el.screenCTM())

    this.box = this.el.bbox().transform(fromShapeToUiMatrix)

    this.startPoint = this.el.root().point(startX, startY)

    this.start2Point = this.el.point(startX, startY)

    this.SVGBox = this.getSVGBox()

    this.angle =
      this.el.type === 'svg'
        ? this.el.findOne('g').transform().rotate
        : this.el.transform().rotate

    const a = this.el.find('*[style]')
    this.a = []
    a.each(i => {
      this.a.push(i.css()['stroke-width'])
    })

    // We consider the resize done, when a touch is canceled, too
    const eventMove = (isMouse ? 'mousemove' : 'touchmove') + '.resize'
    const eventEnd =
      (isMouse ? 'mouseup' : 'touchcancel.resize touchend') + '.resize'

    // Bind resize and end events to window
    if (e.type === 'rot') {
      on(window, eventMove, this.rotate)
    } else if (e.type === 'shear') {
      on(window, eventMove, this.shear)
    } else {
      // resize
      on(window, eventMove, this.resize)
    }
    on(window, eventEnd, this.endResize)
  }

  resize(e) {
    const endPoint = this.el.root().point(getCoordsFromEvent(e))

    const dx = endPoint.x - this.startPoint.x
    const dy = endPoint.y - this.startPoint.y

    const boxs = [this.box, this.SVGBox].map(box => {
      const x = box.x + dx
      const y = box.y + dy
      const x2 = box.x2 + dx
      const y2 = box.y2 + dy

      const newBox = new Box(box)

      if (this.eventType.includes('l')) {
        newBox.x = Math.min(x, box.x2)
        newBox.x2 = Math.max(x, box.x2)
      }

      if (this.eventType.includes('r')) {
        newBox.x = Math.min(x2, box.x)
        newBox.x2 = Math.max(x2, box.x)
      }

      if (this.eventType.includes('t')) {
        newBox.y = Math.min(y, box.y2)
        newBox.y2 = Math.max(y, box.y2)
      }

      if (this.eventType.includes('b')) {
        newBox.y = Math.min(y2, box.y)
        newBox.y2 = Math.max(y2, box.y)
      }

      newBox.width = newBox.x2 - newBox.x
      newBox.height = newBox.y2 - newBox.y

      return newBox
    })

    if (
      this.el.dispatch('resize', {
        box: new Box(boxs[0]),
        angle: 0,
        shear: 0,
        eventType: this.eventType,
        event: e,
        handler: this
      }).defaultPrevented
    ) {
      return
    }

    if (this.el.type === 'svg') {
      // 选取较大的值，保证他是正方形
      const greater =
        (boxs[1].width > boxs[1].height ? boxs[1].width : boxs[1].height) / 3.78

      // svg 变大
      this.el.move(boxs[1].x, boxs[1].y).size(greater + 'mm', greater + 'mm')

      const oneG = this.el.findOne('g')

      const fromShapeToUiMatrix = this.el
        .screenCTM()
        .inverseO()
        .multiplyO(this.el.root().screenCTM())
        
      const gBox = boxs[0].transform(fromShapeToUiMatrix)

      // 里面的 g 变形
      this.el
        .move(boxs[1].x, boxs[1].y)
        .viewbox({ width: greater, height: greater })

      oneG.move(gBox.x, gBox.y).size(gBox.width, gBox.height)
    } else {
      this.el.move(boxs[0].x, boxs[0].y).size(boxs[0].width, boxs[0].height)
    }

    const z = this.box.height / boxs[0].height
    const x = this.box.width / boxs[0].width

    const w = z < x ? z : x

    const a = this.el.find('*[style]')

    a.each((i, index) => {
      const b = this.a[index] * w
      i.css({ 'stroke-width': b })
    })
  }

  rotate(e) {
    const endPoint = this.el.root().point(getCoordsFromEvent(e))

    const cx = this.box.cx
    const cy = this.box.cy

    const dx1 = this.start2Point.x - cx
    const dy1 = this.start2Point.y - cy

    const dx2 = endPoint.x - cx
    const dy2 = endPoint.y - cy

    const factor = 180 / Math.PI

    const sAngle = Math.atan2(dx1, dy1)
    const pAngle = Math.atan2(dx2, dy2)

    const angle = sAngle - pAngle

    if (
      this.el.dispatch('resize', {
        box: this.startBox,
        angle: angle,
        shear: 0,
        eventType: this.eventType,
        event: e,
        handler: this
      }).defaultPrevented
    ) {
      return
    }

    this.el.attr({ rotate: angle * factor })

    if (this.el.type === 'svg') {
      this.el.findOne('g').transform({ rotate: 0 })
      this.el.findOne('g').rotate(angle * factor)
    } else {
      this.el.rotate(angle * factor)
    }
  }

  shear(e) {
    const endPoint = this.el.point(getCoordsFromEvent(e))
    const cx = this.box.cx
    const cy = this.box.cy
    const dx1 = this.startPoint.x - cx
    const dy1 = this.startPoint.y - cy
    const dx2 = endPoint.x - cx
    const factor = 180 / Math.PI
    const sAngle = Math.atan2(dx1, dy1)
    const pAngle = Math.atan2(dx2, dy1)
    const angle = pAngle - sAngle

    if (
      this.el.dispatch('resize', {
        box: this.startBox,
        angle: 0,
        shear: angle,
        eventType: this.eventType,
        event: e,
        handler: this
      }).defaultPrevented
    ) {
      return
    }

    this.el.skew(factor * angle, 0)
  }

  endResize(ev) {
    // Unbind resize and end events to window
    if (this.eventType !== 'rot' && this.eventType !== 'shear') {
      this.resize(ev)
    }

    this.eventType = ''
    off(window, 'mousemove.resize touchmove.resize')
    off(window, 'mouseup.resize touchend.resize')
  }

  snapToGrid(box, xGrid, yGrid = xGrid) {
    // TODO: Snap helper function
  }

  getSVGBox() {
    let width = this.el.width()
    let height = this.el.height()
    const x = this.el.x()
    const y = this.el.y()

    // 如果是毫米 转换为像素
    if (width.includes && (width.includes('mm') || height.includes('mm'))) {
      width = parseInt(width) * 3.78
      height = parseInt(height) * 3.78
    }

    return {
      x,
      y,
      x2: x + width,
      y2: y + height,
      width,
      height
    }
  }

  checkAspectRatio(snap, isReverse) {
    if (!this.options.saveAspectRatio) {
      return snap
    }

    var updatedSnap = snap.slice()
    var aspectRatio = this.parameters.box.width / this.parameters.box.height
    var newW = this.parameters.box.width + snap[0]
    var newH = this.parameters.box.height - snap[1]
    var newAspectRatio = newW / newH

    if (newAspectRatio < aspectRatio) {
      // Height is too big. Adapt it
      updatedSnap[1] = newW / aspectRatio - this.parameters.box.height
      isReverse && (updatedSnap[1] = -updatedSnap[1])
    } else if (newAspectRatio > aspectRatio) {
      // Width is too big. Adapt it
      updatedSnap[0] = this.parameters.box.width - newH * aspectRatio
      isReverse && (updatedSnap[0] = -updatedSnap[0])
    }

    return updatedSnap
  }
}

extend(Element, {
  // Resize element with mouse
  resize: function(enabled = true) {
    var resizeHandler = this.remember('_resizeHandler')

    if (!resizeHandler) {
      if (enabled.prototype instanceof ResizeHandler) {
        /* eslint new-cap: ["error", { "newIsCap": false }] */
        resizeHandler = new enabled(this)
        enabled = true
      } else {
        resizeHandler = new ResizeHandler(this)
      }

      this.remember('_resizeHandler', resizeHandler)
    }

    resizeHandler.active(enabled)

    return this
  }
})

export default ResizeHandler
