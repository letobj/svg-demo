// import { rbox as RBox } from '@svgdotjs/svg.js/src/types/Box'
// import { extend, Element } from '@svgdotjs/svg.js'
;(function (svg_js) {
  'use strict'
  class Set {
    constructor(members) {
      if (members instanceof Set) {
        this.members = members.members.slice()
      } else {
        Array.isArray(members) ? (this.members = members) : this.clear()
      }
    }
    // Add element to set
    add() {
      var i,
        il,
        elements = [].slice.call(arguments)

      for (i = 0, il = elements.length; i < il; i++)
        this.members.push(elements[i])

      return this
    }
    // Remove element from set
    remove(element) {
      var i = this.index(element)

      // remove given child
      if (i > -1) this.members.splice(i, 1)

      return this
    }
    // Iterate over all members
    each(block) {
      for (var i = 0, il = this.members.length; i < il; i++)
        block.apply(this.members[i], [i, this.members])

      return this
    }
    // Restore to defaults
    clear() {
      // initialize store
      this.members = []

      return this
    }
    // Get the length of a set
    length() {
      return this.members.length
    }
    // Checks if a given element is present in set
    has(element) {
      return this.index(element) >= 0
    }
    // retuns index of given element in set
    index(element) {
      return this.members.indexOf(element)
    }
    // Get member at given index
    get(i) {
      return this.members[i]
    }
    // Get first member
    first() {
      return this.get(0)
    }
    // Get last member
    last() {
      return this.get(this.members.length - 1)
    }
    // Default value
    valueOf() {
      return this.members
    }
    // Get the bounding box of all members included or empty box if set has no items
    bbox() {
      console.log('svg_js.rbox() :>> ', svg_js.rbox())
      // return an empty box of there are no members
      if (this.members.length == 0) return svg_js.rbox()

      // get the first rbox and update the target bbox
      var rbox = this.members[0].rbox(this.members[0].doc())

      this.each(function () {
        // user rbox for correct position and visual representation
        console.log('this.doc() :>> ', this.doc());
        rbox = rbox.merge(this.rbox(this.doc()))
      })

      return rbox
    }
  }

  svg_js.extend(svg_js.Element, {
    set(members) {
      return new Set(members)
    },
  })
})(SVG)
